/**
 * localStore — IndexedDB persistence for device-only data.
 *
 * Why IndexedDB and not localStorage: a finished tournament with full point
 * logs runs ~350 KB, and localStorage caps the whole origin at ~5 MB — shared
 * with the live-match crash-recovery snapshot. Worse, `useLocalStorage`
 * swallows quota errors silently, so an overflow would lose a tournament
 * mid-beach with no warning. Here a failed write rejects loudly and the caller
 * can tell the user.
 *
 * What this does NOT buy is durability: IndexedDB lives in the same origin
 * storage bucket as localStorage and is cleared by the same things (clearing
 * site data, uninstalling the PWA, private browsing, eviction under disk
 * pressure). Device-only data is always one tap away from gone — which is why
 * callers must offer an export.
 */

const DB_NAME    = 'arenix'
const DB_VERSION = 1
const STORE      = 'local_tournaments'

let dbPromise = null

/** True when the browser exposes IndexedDB at all (it is absent in some
 *  locked-down/private modes). */
export function isLocalStoreAvailable() {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

function openDb() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (!isLocalStoreAvailable()) {
      reject(new Error('This browser has no local storage available.'))
      return
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error || new Error('Could not open local storage.'))
    req.onblocked = () => reject(new Error('Local storage is blocked by another open tab.'))
  })

  // Never cache a rejected promise: a transient failure would poison every
  // later call for the lifetime of the page.
  dbPromise = dbPromise.catch(err => { dbPromise = null; throw err })

  return dbPromise
}

/**
 * Run one request inside a transaction.
 *
 * Writes resolve on transaction *complete*, not on request success — only then
 * has the data actually landed on disk.
 */
async function run(mode, makeRequest) {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)

    let result
    const req = makeRequest(store)
    req.onsuccess = () => { result = req.result }

    tx.oncomplete = () => resolve(result)
    tx.onerror    = () => reject(tx.error || new Error('Local storage write failed.'))
    tx.onabort    = () => reject(tx.error || new Error('Local storage write was aborted.'))
  })
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/** Every stored record, newest first. */
export async function getAllRecords() {
  const rows = await run('readonly', store => store.getAll())
  return (rows || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

/** One record by id, or null. */
export async function getRecord(id) {
  if (!id) return null
  const row = await run('readonly', store => store.get(id))
  return row ?? null
}

/** Insert or replace a record. Stamps `updatedAt`. */
export async function putRecord(record) {
  const stamped = { ...record, updatedAt: Date.now() }
  await run('readwrite', store => store.put(stamped))
  return stamped
}

/** Delete a record by id. */
export async function deleteRecord(id) {
  await run('readwrite', store => store.delete(id))
}

// ── Durability ───────────────────────────────────────────────────────────────

/**
 * Ask the browser to mark this origin's storage as persistent, exempting it
 * from automatic eviction under disk pressure. Chrome/Firefox/Edge honour it;
 * Safari does not grant it the same way, so treat `false` as normal, not as an
 * error. Safe to call repeatedly — it resolves true immediately once granted.
 *
 * @returns {Promise<boolean>} whether storage is persistent after the call
 */
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

/**
 * Rough usage/quota for this origin, or null when the browser won't say.
 * Useful for warning before a long tournament fills the device.
 */
export async function getStorageEstimate() {
  try {
    if (!navigator.storage?.estimate) return null
    const { usage, quota } = await navigator.storage.estimate()
    return { usage: usage ?? 0, quota: quota ?? 0 }
  } catch {
    return null
  }
}
