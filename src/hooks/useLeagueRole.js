/**
 * useLeagueRole — returns the current user's roles and permissions within a league,
 * plus their platform-level superadmin status.
 *
 * Usage:
 *   const { role, roles, permissions, isAdmin, isSuperAdmin, canScore, canManage, can, loading }
 *     = useLeagueRole(leagueId)
 *
 * Backward-compatible: role, isAdmin, canScore, canManage all behave as before.
 * isSuperAdmin bypasses all per-league checks — superadmins can do everything.
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useLeagueRole(leagueId) {
  const [roles,        setRoles]        = useState([])
  const [permissions,  setPermissions]  = useState(new Set())
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (!leagueId) { setLoading(false); return }

    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) {
          setRoles([])
          setPermissions(new Set())
          setIsSuperAdmin(false)
          setLoading(false)
        }
        return
      }

      const [rolesRes, permsRes, profileRes] = await Promise.all([
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
        supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .single(),
      ])

      if (!cancelled) {
        const superAdmin = profileRes.data?.is_super_admin ?? false
        setRoles((rolesRes.data || []).map(r => r.role))
        setPermissions(new Set((permsRes.data || []).map(r => r.permission)))
        setIsSuperAdmin(superAdmin)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [leagueId])

  // Legacy compat: first role string (or null)
  const role     = roles[0] ?? null
  const isAdmin  = isSuperAdmin || roles.includes('admin')
  // canScore is null during loading so LiveMatch guards (canScore === false) don't fire prematurely
  const canScore  = loading ? null : (isSuperAdmin || permissions.has('score_match'))
  const canManage = isSuperAdmin || permissions.has('manage_league') || permissions.has('create_tournament')

  function can(permission) {
    return isSuperAdmin || permissions.has(permission)
  }

  return { role, roles, permissions, isAdmin, isSuperAdmin, canScore, canManage, can, loading }
}
