import { useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Wraps any route that requires authentication.
 * - session === undefined → still loading (show skeleton)
 * - session === null      → not logged in → redirect to /login?next=<path>
 * - session = object      → render children
 */
export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px] text-dim font-medium">Loading…</span>
        </div>
      </div>
    )
  }

  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return children
}
