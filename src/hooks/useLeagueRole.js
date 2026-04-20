/**
 * useLeagueRole — returns the current user's role within a specific league.
 *
 * Usage:
 *   const { role, isAdmin, canScore, canManage, loading } = useLeagueRole(leagueId)
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useLeagueRole(leagueId) {
  const [role,    setRole]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leagueId) { setLoading(false); return }

    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) { setRole(null); setLoading(false) }; return }

      const { data } = await supabase
        .from('league_members')
        .select('role')
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .single()

      if (!cancelled) {
        setRole(data?.role || null)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [leagueId])

  const isAdmin    = role === 'admin'
  const canScore   = role === 'admin' || role === 'scorer' || role === 'player'
  const canManage  = role === 'admin'

  return { role, isAdmin, canScore, canManage, loading }
}
