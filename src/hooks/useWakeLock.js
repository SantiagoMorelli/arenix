import { useRef, useState, useEffect } from 'react'

/**
 * useWakeLock — keeps the screen awake while the component is mounted.
 *
 * Activates on mount, releases on unmount.
 * Re-acquires automatically when the tab returns to the foreground, because
 * browsers silently drop the WakeLockSentinel whenever the page is hidden.
 *
 * Returns { supported, active } for optional UI use (not consumed right now).
 *
 * Safe to call unconditionally:
 *   • Swallows all errors (unsupported browser, non-HTTPS, permission denied).
 *   • No crash in Strict Mode double-invoke — cleanup releases before re-acquire.
 */
export function useWakeLock() {
  const sentinelRef = useRef(null)
  const [supported] = useState(
    () => 'wakeLock' in navigator && typeof navigator.wakeLock?.request === 'function'
  )
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!supported) {
      if (import.meta.env.DEV) console.debug('[wakeLock] unsupported')
      return
    }

    const acquire = async (reason) => {
      try {
        const sentinel = await navigator.wakeLock.request('screen')

        sentinel.addEventListener('release', () => {
          sentinelRef.current = null
          setActive(false)
          if (import.meta.env.DEV) console.debug('[wakeLock] released (system)')
        })

        sentinelRef.current = sentinel
        setActive(true)
        if (import.meta.env.DEV) {
          console.debug(reason === 'visibility'
            ? '[wakeLock] re-acquired after visibility'
            : '[wakeLock] acquired')
        }
      } catch (err) {
        if (import.meta.env.DEV) console.debug('[wakeLock] request failed:', err)
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && sentinelRef.current == null) {
        acquire('visibility')
      }
    }

    acquire('mount')
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (sentinelRef.current) {
        sentinelRef.current.release().catch(() => {})
        sentinelRef.current = null
        setActive(false)
        if (import.meta.env.DEV) console.debug('[wakeLock] cleanup released')
      }
    }
  }, [supported])

  return { supported, active }
}
