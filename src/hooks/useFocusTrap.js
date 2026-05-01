import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Traps keyboard focus inside `containerRef` while active.
 *
 * @param {React.RefObject} containerRef  - The dialog / panel root element.
 * @param {object}          options
 * @param {boolean}         [options.active=true]          - Enable / disable trap.
 * @param {Function}        [options.onEscape]             - Called when Escape is pressed.
 * @param {React.RefObject} [options.initialFocusRef]      - Element to focus on open.
 *                                                            Falls back to first focusable child.
 */
export default function useFocusTrap(containerRef, { active = true, onEscape, initialFocusRef } = {}) {
  // Remember which element had focus before the modal opened so we can restore it.
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!active) return

    // Save current focus
    previousFocusRef.current = document.activeElement

    // Set initial focus
    const container = containerRef.current
    if (!container) return

    const setInitialFocus = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
      } else {
        const first = container.querySelectorAll(FOCUSABLE)[0]
        first?.focus()
      }
    }

    // Defer one tick so the element is fully painted before we focus it
    const raf = requestAnimationFrame(setInitialFocus)

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onEscape?.()
        return
      }

      if (e.key !== 'Tab') return

      const focusable = Array.from(container.querySelectorAll(FOCUSABLE)).filter(
        el => !el.closest('[hidden]') && el.offsetParent !== null
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', handleKeyDown)

      // Restore focus to the previously focused element if it's still in the DOM
      const prev = previousFocusRef.current
      if (prev && prev.isConnected) {
        prev.focus()
      }
    }
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps
}
