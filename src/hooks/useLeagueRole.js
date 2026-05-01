import { useState, useEffect } from 'react'
import { getLeagueMemberRoleData } from '../services/profileService'
import { useAuth } from '../contexts/AuthContext'

// Empty permissions object returned for guests (no session)
const GUEST_ROLE = {
  role: null, roles: [], permissions: new Set(),
  isAdmin: false, isSuperAdmin: false,
  canScore: false, canManage: false,
  can: () => false, loading: false,
}

export function useLeagueRole(leagueId) {
  const { session } = useAuth()

  // When there's no session or no leagueId, start as not-loading so callers
  // don't wait unnecessarily. The guard in the effect prevents any DB queries.
  const [roles,        setRoles]        = useState([])
  const [permissions,  setPermissions]  = useState(new Set())
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading,      setLoading]      = useState(!!(session && leagueId))

  useEffect(() => {
    // No session or no leagueId → nothing to fetch
    if (!session || !leagueId) return

    const userId = session.user.id
    let cancelled = false

    async function load() {
      const { roles: roleList, permissions: permList, isSuperAdmin: superAdmin } =
        await getLeagueMemberRoleData(leagueId, userId)

      if (!cancelled) {
        setRoles(roleList)
        setPermissions(new Set(permList))
        setIsSuperAdmin(superAdmin)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [leagueId, session])

  // Guest short-circuit: return stable empty object
  if (!session) return GUEST_ROLE

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
