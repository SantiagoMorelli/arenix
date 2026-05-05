/**
 * Watches the evaluated achievement list and fires `onUnlock(achievement)` for
 * each newly-unlocked entry the user hasn't seen on this device yet.
 *
 * Persistence: Set<id> in localStorage under `arenix.profile.seenUnlocks`.
 * Falls back to an in-memory Set when localStorage is unavailable.
 *
 * Multiple unlocks are queued ~500ms apart so the celebration doesn't fire all
 * at once.
 */
import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'arenix.profile.seenUnlocks'
const QUEUE_GAP_MS = 500

function loadSeen() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function saveSeen(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)))
  } catch { /* ignore */ }
}

export function useAchievementUnlocks(evaluated, onUnlock) {
  const seenRef = useRef(null)
  const queueRef = useRef([])
  const flushingRef = useRef(false)

  if (seenRef.current === null) {
    seenRef.current = loadSeen()
  }

  useEffect(() => {
    if (!evaluated || evaluated.length === 0) return
    const seen = seenRef.current
    const newlyUnlocked = evaluated.filter(a => a.unlocked && !seen.has(a.id))
    if (newlyUnlocked.length === 0) return

    // First-time visitors: if this is the user's first ever evaluation and
    // they happen to have many existing unlocks (e.g. they were a long-time
    // player before this feature shipped), don't dump 15 toasts on them.
    // Treat first-load as a silent backfill.
    const firstLoad = seen.size === 0
    if (firstLoad) {
      for (const a of newlyUnlocked) seen.add(a.id)
      saveSeen(seen)
      return
    }

    // Enqueue unlocks one at a time.
    for (const a of newlyUnlocked) queueRef.current.push(a)

    if (flushingRef.current) return
    flushingRef.current = true

    let cancelled = false
    const tick = () => {
      if (cancelled) return
      const next = queueRef.current.shift()
      if (!next) {
        flushingRef.current = false
        return
      }
      seen.add(next.id)
      saveSeen(seen)
      try { onUnlock?.(next) } catch (e) { console.error('onUnlock failed', e) }
      setTimeout(tick, QUEUE_GAP_MS)
    }
    setTimeout(tick, 50)

    return () => { cancelled = true }
  }, [evaluated, onUnlock])
}

export function clearSeenUnlocks() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}
