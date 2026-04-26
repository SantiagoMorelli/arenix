import { supabase } from '../lib/supabase'

export const NOTIF_META = {
  league_welcome:      { emoji: '🏐', iconBg: 'bg-accent/15 border border-accent/25' },
  profile_linked:      { emoji: '🤝', iconBg: 'bg-free/15 border border-free/25' },
  profile_unlinked:    { emoji: '🔓', iconBg: 'bg-alt border border-line' },
  role_admin:          { emoji: '🛡️', iconBg: 'bg-accent/15 border border-accent/25' },
  scorer_assigned:     { emoji: '📋', iconBg: 'bg-alt border border-line' },
  tournament_started:  { emoji: '🏐', iconBg: 'bg-success/15 border border-success/25' },
  tournament_finished: { emoji: '🏆', iconBg: 'bg-success/15 border border-success/25' },
  match_result:        { emoji: '⚡', iconBg: 'bg-accent/15 border border-accent/25' },
  member_joined:       { emoji: '👋', iconBg: 'bg-free/15 border border-free/25' },
}

export function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export async function getMyNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) { console.error('getMyNotifications:', error); return [] }
  return data
}

export async function markRead(id) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
}

export async function markAllRead() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)
}

export async function createNotification(userId, type, title, body, data = null) {
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, title, body, data })

  if (error) console.error('createNotification:', error)
}

/**
 * Broadcast a notification to every member of a league.
 * Pass filterFn to restrict to a subset (e.g. only admins).
 */
export async function createNotificationsForLeagueMembers(
  leagueId,
  type,
  title,
  body,
  data = null,
  filterFn = null,
) {
  const { data: rows, error } = await supabase
    .from('league_member_roles')
    .select('user_id')
    .eq('league_id', leagueId)

  if (error) { console.error('createNotificationsForLeagueMembers fetch:', error); return }

  let userIds = [...new Set(rows.map(r => r.user_id))]
  if (filterFn) userIds = userIds.filter(filterFn)
  if (userIds.length === 0) return

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(userIds.map(user_id => ({ user_id, type, title, body, data })))

  if (insertError) console.error('createNotificationsForLeagueMembers insert:', insertError)
}

/**
 * Subscribe to new notifications for a user via Supabase Realtime.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(userId, onNew) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      },
      payload => onNew(payload.new),
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
