/**
 * ToastContext — app-wide imperative toast channel.
 *
 * Usage:
 *   const { showError, showSuccess, showToast, dismiss } = useToast()
 *
 *   showError(err, 'Failed to save match result')
 *   showSuccess('Match saved')
 *   showToast({ variant: 'info', title: 'Heads up', body: 'Tournament starts soon' })
 */
import { createContext, useCallback, useContext, useState } from 'react'
import { AppToast } from './ui-new'

const ToastContext = createContext(null)

let _counter = 0

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const dismiss = useCallback(() => setToast(null), [])

  const showToast = useCallback((opts) => {
    setToast({ id: `${Date.now()}-${++_counter}`, ...opts })
  }, [])

  const showError = useCallback((err, fallback = 'Something went wrong') => {
    const title = (typeof err === 'string' ? err : err?.message) || fallback
    showToast({ variant: 'error', title })
  }, [showToast])

  const showSuccess = useCallback((title, body) => {
    showToast({ variant: 'success', title, body })
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, dismiss }}>
      {children}
      <AppToast toast={toast} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
