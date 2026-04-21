/**
 * useLeagueRole — returns the current user's roles and permissions within a league.
 *
 * Usage:
 *   const { role, roles, permissions, isAdmin, canScore, canManage, can, loading } = useLeagueRole(leagueId)
 *
 * Backward-compatible: role, isAdmin, canScore, canManage all behave as before.
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useLeagueRole(leagueId) {
  const [roles,       setRoles]       = useState([])
  const [permissions, setPermissions] = useState(new Set())
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!leagueId) { setLoading(false); return }

    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) { setRoles([]); setPermissions(new Set()); setLoading(false) }
        return
      }

      const [rolesRes, permsRes] = await Promise.all([
        supabase
          .from('league_member_roles')
          .select('role')
          .eq('league_id', leagueId)
          .eq('user_id', user.id),
        supabase
          .from('league_member_permissions')
          .select('permission')
          .eq('league_id', leagueId)
          .eq('user_id', user.id),
      ])

      if (!cancelled) {
        setRoles((rolesRes.data || []).map(r => r.role))
        setPermissions(new Set((permsRes.data || []).map(r => r.permission)))
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [leagueId])

  // Legacy compat: first role string (or null)
  const role     = roles[0] ?? null
  const isAdmin  = roles.includes('admin')
  // canScore is null during loading so LiveMatch guards (canScore === false) don't fire prematurely
  const canScore  = loading ? null : permissions.has('score_match')
  const canManage = permissions.has('manage_league') || permissions.has('create_tournament')

  function can(permission) {
    return permissions.has(permission)
  }

  return { role, roles, permissions, isAdmin, canScore, canManage, can, loading }
}
