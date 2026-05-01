import { supabase } from '../lib/supabase'

/**
 * Fetch every profile row, ordered by full_name.
 * Returns { data, error } (raw Supabase shape).
 */
export function listAllProfiles() {
  return supabase.from('profiles').select('*').order('full_name')
}

/**
 * Patch a single profile row (e.g. toggle can_create_league).
 * @param {string} userId
 * @param {object} patch  – fields to update, e.g. { can_create_league: true }
 * Returns { data, error }.
 */
export function updateProfilePermission(userId, patch) {
  return supabase.from('profiles').update(patch).eq('id', userId)
}

/**
 * Call the delete_own_account RPC which removes the caller's data server-side.
 * Returns { data, error }.
 */
export function deleteOwnAccount() {
  return supabase.rpc('delete_own_account')
}

/**
 * Upload a new avatar image and return its public URL.
 * @param {string} userId
 * @param {File}   file
 * Returns { publicUrl, error }.
 */
export async function uploadAvatar(userId, file) {
  const ext  = file.name.split('.').pop()
  const path = `${userId}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (uploadErr) return { publicUrl: null, error: uploadErr }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
  return { publicUrl: urlData.publicUrl, error: null }
}

/**
 * Fetch the combined role/permission/superAdmin data for a user in a league.
 * Used by useLeagueRole.
 *
 * @param {string} leagueId
 * @param {string} userId
 * Returns { roles: string[], permissions: string[], isSuperAdmin: boolean, error: Error|null }
 */
export async function getLeagueMemberRoleData(leagueId, userId) {
  const [rolesRes, permsRes, profileRes] = await Promise.all([
    supabase
      .from('league_member_roles')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', userId),
    supabase
      .from('league_member_permissions')
      .select('permission')
      .eq('league_id', leagueId)
      .eq('user_id', userId),
    supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', userId)
      .single(),
  ])

  const error = rolesRes.error || permsRes.error || profileRes.error || null

  return {
    roles:        (rolesRes.data  || []).map(r => r.role),
    permissions:  (permsRes.data  || []).map(r => r.permission),
    isSuperAdmin: profileRes.data?.is_super_admin ?? false,
    error,
  }
}
