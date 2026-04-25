/**
 * inviteService — league invite-code management and member role/permission helpers.
 */
import { supabase } from '../lib/supabase'
import {
  createNotification,
  createNotificationsForLeagueMembers,
} from './notificationService'

// Default permissions per role.
// score_match is NOT included for player — it must be granted explicitly.
const ROLE_PERMISSIONS = {
  admin:  ['manage_league', 'create_tournament', 'invite_players', 'score_match', 'edit_profile'],
  player: ['edit_profile'],
  viewer: ['edit_profile'],
}

/**
 * Look up a league by its invite code.
 * Returns { id, name, season } or null if not found.
 */
export async function getLeagueByInviteCode(code) {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, season')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (error) return null
  return data
}

/**
 * Join a league as 'player' (default role for invite links).
 * Safely handles the case where the user is already a member.
 */
/**
 * Join a league as 'player' (default role for invite links).
 * Superadmins can call this directly without an invite code — the platform
 * grants them access to all leagues regardless, but calling joinLeague
 * formally sets up their role and permission rows.
 */
export async function joinLeague(leagueId) {
  const { data: { user } } = await supabase.auth.getUser()

  // Check if already a member via new roles table
  const { data: existing } = await supabase
    .from('league_member_roles')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (existing) return { role: existing.role, alreadyMember: true }

  const { data: leagueRow } = await supabase
    .from('leagues')
    .select('name, season')
    .eq('id', leagueId)
    .single()

  await Promise.all([
    supabase.from('league_member_roles').insert({
      league_id: leagueId,
      user_id:   user.id,
      role:      'player',
    }),
    // player default: edit_profile only — score_match must be granted explicitly
    supabase.from('league_member_permissions').insert(
      ROLE_PERMISSIONS.player.map(permission => ({
        league_id: leagueId,
        user_id:   user.id,
        permission,
      }))
    ),
  ])

  // Notify league admins that a new player joined
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const joinerName = profile?.full_name || 'Someone'
  const leagueName = leagueRow?.name || 'the league'

  const { data: adminRows } = await supabase
    .from('league_member_permissions')
    .select('user_id')
    .eq('league_id', leagueId)
    .eq('permission', 'manage_league')
  const adminIds = (adminRows || []).map(r => r.user_id).filter(id => id !== user.id)

  await Promise.all(
    adminIds.map(adminId =>
      createNotification(
        adminId,
        'member_joined',
        'New player joined 👋',
        `${joinerName} joined ${leagueName}`,
        { leagueId },
      )
    )
  )

  return { role: 'player', alreadyMember: false }
}

/**
 * Regenerate the invite code for a league (admin only).
 * Returns the new code.
 */
export async function regenerateInviteCode(leagueId) {
  const newCode = Math.random().toString(36).substring(2, 10).toUpperCase()

  const { data, error } = await supabase
    .from('leagues')
    .update({ invite_code: newCode })
    .eq('id', leagueId)
    .select('invite_code')
    .single()

  if (error) throw error
  return data.invite_code
}

/**
 * Build the shareable invite link for a given invite code.
 */
export function buildInviteLink(code) {
  return `${window.location.origin}/join/${code}`
}

/**
 * Change a member's role (admin only). Legacy shim — calls addMemberRole internally.
 */
export async function changeMemberRole(leagueId, userId, newRole) {
  await addMemberRole(leagueId, userId, newRole)
}

/**
 * Grant a role to a member and upsert the default permissions for that role.
 */
export async function addMemberRole(leagueId, userId, role) {
  const permissions = ROLE_PERMISSIONS[role] || []

  const { error: roleError } = await supabase
    .from('league_member_roles')
    .upsert({ league_id: leagueId, user_id: userId, role })

  if (roleError) throw roleError

  if (permissions.length > 0) {
    const { error: permError } = await supabase
      .from('league_member_permissions')
      .upsert(permissions.map(permission => ({ league_id: leagueId, user_id: userId, permission })))

    if (permError) throw permError
  }

  if (role === 'admin') {
    const { data: leagueRow } = await supabase
      .from('leagues')
      .select('name')
      .eq('id', leagueId)
      .single()
    await createNotification(
      userId,
      'role_admin',
      "You're now an admin 🛡️",
      `Admin in ${leagueRow?.name || 'the league'}`,
      { leagueId },
    )
  }
}

/**
 * Remove a single role from a member. Does not touch permissions.
 */
export async function removeMemberRole(leagueId, userId, role) {
  const { error } = await supabase
    .from('league_member_roles')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('role', role)

  if (error) throw error
}

/**
 * Grant an ad-hoc permission to a member (without changing their roles).
 */
export async function grantMemberPermission(leagueId, userId, permission) {
  const { error } = await supabase
    .from('league_member_permissions')
    .upsert({ league_id: leagueId, user_id: userId, permission })

  if (error) throw error

  if (permission === 'score_match') {
    const { data: leagueRow } = await supabase
      .from('leagues')
      .select('name')
      .eq('id', leagueId)
      .single()
    await createNotification(
      userId,
      'scorer_assigned',
      "You're a scorer 📋",
      `You can now score matches in ${leagueRow?.name || 'the league'}`,
      { leagueId },
    )
  }
}

/**
 * Revoke a specific permission from a member.
 */
export async function revokeMemberPermission(leagueId, userId, permission) {
  const { error } = await supabase
    .from('league_member_permissions')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('permission', permission)

  if (error) throw error
}
