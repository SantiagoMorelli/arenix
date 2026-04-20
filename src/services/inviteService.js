/**
 * inviteService — league invite-code management.
 */
import { supabase } from '../lib/supabase'

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
export async function joinLeague(leagueId) {
  const { data: { user } } = await supabase.auth.getUser()

  // Check if already a member
  const { data: existing } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (existing) return { role: existing.role, alreadyMember: true }

  const { error } = await supabase.from('league_members').insert({
    league_id: leagueId,
    user_id:   user.id,
    role:      'player',
  })

  if (error) throw error
  return { role: 'player', alreadyMember: false }
}

/**
 * Regenerate the invite code for a league (admin only).
 * Returns the new code.
 */
export async function regenerateInviteCode(leagueId) {
  // Generate new 8-char code in JS (fallback if SQL default not accessible)
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
 * Change a member's role (admin only).
 */
export async function changeMemberRole(leagueId, userId, newRole) {
  const { error } = await supabase
    .from('league_members')
    .update({ role: newRole })
    .eq('league_id', leagueId)
    .eq('user_id', userId)

  if (error) throw error
}
