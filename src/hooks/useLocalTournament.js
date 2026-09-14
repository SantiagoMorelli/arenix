/**
 * useLocalTournament — loads one device-only tournament from IndexedDB.
 *
 * The local counterpart to useLeague, deliberately kept separate: a local
 * tournament is not a league and must never be reachable through league code
 * paths. It exposes the same { data, loading, error, refetch } contract so the
 * screens read the same either way.
 */
import { useState, useEffect, useCallback } from 'react'
import { getLocalTournament } from '../services/localTournamentService'

export function useLocalTournament(id) {
  const [tournament, setTournament] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const fetch = useCallback(async () => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      setTournament(await getLocalTournament(id))
    } catch (err) {
      setError(err.message || 'Could not open this tournament')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return {
    tournament,
    // Local players live inside the tournament rather than in a league roster,
    // but every shared component expects them as a separate list.
    players: tournament?.players || [],
    loading,
    error,
    refetch: fetch,
    /** Apply a service result without a second read. */
    apply: setTournament,
  }
}
