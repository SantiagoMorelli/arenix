/**
 * useLeague — fetches a league + all nested data from Supabase.
 *
 * Usage:
 *   const { league, loading, error, refetch } = useLeague(leagueId)
 */
import { useState, useEffect, useCallback } from 'react'
import { getLeagueById } from '../services/leagueService'

export function useLeague(leagueId) {
  const [league,  setLeague]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    if (!leagueId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const data = await getLeagueById(leagueId)
      setLeague(data)
    } catch (err) {
      setError(err.message || 'Failed to load league')
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => { fetch() }, [fetch])

  return { league, loading, error, refetch: fetch }
}
