/**
 * freePlayService — Supabase calls for free play sessions.
 */
import { supabase } from '../lib/supabase'
import { createNotification } from './notificationService'

// ── Permission helpers ────────────────────────────────────────────────────────

/**
 * Returns true if the given userId is the admin of the free play session.
 * Legacy rows (created_by === null) are treated as admin-less — any authed
 * user can edit them (preserves existing behaviour).
 */
export function isFreePlayAdmin(session, userId) {
  if (!session || !userId) return false
  return session.created_by === userId
}

/**
 * Returns true if the given user may edit/manage the free play session.
 * Admin OR legacy (created_by is null).
 */
export function canEditFreePlay(session, userId) {
  if (!session) return false
  if (session.created_by === null || session.created_by === undefined) return true // legacy
  return session.created_by === userId
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getFreePlays(leagueId = null) {
  let q = supabase.from('free_plays').select('*').order('created_at', { ascending: false })
  if (leagueId) q = q.eq('league_id', leagueId)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createFreePlay(name, leagueId = null) {
  const { data: { user } } = await supabase.auth.getUser()
  const createdBy = user?.id ?? null

  const { data, error } = await supabase
    .from('free_plays')
    .insert({
      name,
      league_id:  leagueId || null,
      date:       new Date().toISOString().split('T')[0],
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getFreePlay(id) {
  const [fpRes, playersRes, teamsRes, gamesRes] = await Promise.all([
    supabase.from('free_plays').select('*').eq('id', id).single(),
    supabase.from('free_play_players').select('*').eq('free_play_id', id).order('created_at', { ascending: true }),
    supabase.from('free_play_teams').select('*').eq('free_play_id', id).order('created_at', { ascending: true }),
    supabase.from('free_play_games').select('*').eq('free_play_id', id).order('created_at', { ascending: true }),
  ])

  if (fpRes.error) throw fpRes.error

  return {
    ...fpRes.data,
    _queryErrors: {
      players: playersRes.error?.message || null,
      teams:   teamsRes.error?.message   || null,
      games:   gamesRes.error?.message   || null,
    },
    players: (playersRes.data || []).map(p => ({
      id:               p.id,
      name:             p.name,
      leaguePlayerId:   p.league_player_id,
      isGuest:          p.is_guest,
      createdAt:        p.created_at,
    })),
    teams: (teamsRes.data || []).map(t => ({
      id:         t.id,
      name:       t.name,
      playerIds:  Array.isArray(t.player_ids) ? t.player_ids : (t.player_ids ? JSON.parse(t.player_ids) : []),
    })),
    games: (gamesRes.data || []).map(g => ({
      id:           g.id,
      team1Id:      g.team1_id,
      team2Id:      g.team2_id,
      score1:       g.score1,
      score2:       g.score2,
      winnerId:     g.winner_id,
      played:       g.played,
      log:          g.log || [],
      sets:         g.sets || [],
      setsPerMatch: g.sets_per_match ?? 1,
      createdAt:    g.created_at,
    })),
  }
}

/**
 * Fetch a free play session by its short invite_code.
 * Works for unauthenticated (anonymous) callers — the SELECT policy is public.
 */
export async function getFreePlayByInviteCode(code) {
  if (!code) return null

  const { data: fp, error: fpErr } = await supabase
    .from('free_plays')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (fpErr) throw fpErr
  if (!fp) return null

  // Fetch child data (reads are public per RLS)
  const [playersRes, teamsRes, gamesRes] = await Promise.all([
    supabase.from('free_play_players').select('*').eq('free_play_id', fp.id).order('created_at', { ascending: true }),
    supabase.from('free_play_teams').select('*').eq('free_play_id', fp.id).order('created_at', { ascending: true }),
    supabase.from('free_play_games').select('*').eq('free_play_id', fp.id).order('created_at', { ascending: true }),
  ])

  return {
    ...fp,
    players: (playersRes.data || []).map(p => ({
      id:             p.id,
      name:           p.name,
      leaguePlayerId: p.league_player_id,
      isGuest:        p.is_guest,
      createdAt:      p.created_at,
    })),
    teams: (teamsRes.data || []).map(t => ({
      id:        t.id,
      name:      t.name,
      playerIds: Array.isArray(t.player_ids) ? t.player_ids : (t.player_ids ? JSON.parse(t.player_ids) : []),
    })),
    games: (gamesRes.data || []).map(g => ({
      id:           g.id,
      team1Id:      g.team1_id,
      team2Id:      g.team2_id,
      score1:       g.score1,
      score2:       g.score2,
      winnerId:     g.winner_id,
      played:       g.played,
      log:          g.log || [],
      sets:         g.sets || [],
      setsPerMatch: g.sets_per_match ?? 1,
      createdAt:    g.created_at,
    })),
  }
}

export async function finishFreePlay(id) {
  const { error } = await supabase
    .from('free_plays')
    .update({ status: 'finished' })
    .eq('id', id)

  if (error) throw error
}

export async function updateFreePlay(id, { name, leagueId } = {}) {
  const updates = {}
  if (name !== undefined) updates.name = name
  if (leagueId !== undefined) updates.league_id = leagueId || null

  const { data, error } = await supabase
    .from('free_plays')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteFreePlay(id) {
  const { error } = await supabase
    .from('free_plays')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ── Players ───────────────────────────────────────────────────────────────────

export async function addFreePlayPlayer(freePlayId, { name, leaguePlayerId = null, freePlayName, suppressNotify = false }) {
  const { data, error } = await supabase
    .from('free_play_players')
    .insert({
      free_play_id:     freePlayId,
      name,
      league_player_id: leaguePlayerId || null,
      is_guest:         !leaguePlayerId,
    })
    .select()
    .single()

  if (error) throw error

  // Notify the added league player (non-blocking) unless caller suppresses it
  if (!suppressNotify && leaguePlayerId) {
    notifyOneLeaguePlayerAdded(freePlayId, freePlayName, leaguePlayerId).catch(console.error)
  }

  return {
    id:             data.id,
    name:           data.name,
    leaguePlayerId: data.league_player_id,
    isGuest:        data.is_guest,
    createdAt:      data.created_at,
  }
}

export async function removeFreePlayPlayer(playerId) {
  const { error } = await supabase
    .from('free_play_players')
    .delete()
    .eq('id', playerId)

  if (error) throw error
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function createFreePlayTeam(freePlayId, name, playerIds = []) {
  const { data, error } = await supabase
    .from('free_play_teams')
    .insert({ free_play_id: freePlayId, name, player_ids: playerIds })
    .select()
    .single()

  if (error) throw error
  return {
    id:        data.id,
    name:      data.name,
    playerIds: Array.isArray(data.player_ids) ? data.player_ids : [],
  }
}

export async function updateFreePlayTeam(teamId, { name, playerIds } = {}) {
  const updates = {}
  if (name      !== undefined) updates.name       = name
  if (playerIds !== undefined) updates.player_ids = playerIds

  const { data, error } = await supabase
    .from('free_play_teams')
    .update(updates)
    .eq('id', teamId)
    .select()
    .single()

  if (error) throw error
  return {
    id:        data.id,
    name:      data.name,
    playerIds: Array.isArray(data.player_ids) ? data.player_ids : [],
  }
}

export async function deleteFreePlayTeam(teamId) {
  const { error } = await supabase.from('free_play_teams').delete().eq('id', teamId)
  if (error) throw error
}

// ── Games ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
export async function createFreePlayGame(freePlayId, team1Id, team2Id, setsPerMatch = 1) {
  const { data, error } = await supabase
    .from('free_play_games')
    .insert({
      free_play_id:  freePlayId,
      team1_id:      team1Id,
      team2_id:      team2Id,
      score1:        0,
      score2:        0,
      played:        false,
    })
    .select()
    .single()

  if (error) throw error
  return {
    id:           data.id,
    team1Id:      data.team1_id,
    team2Id:      data.team2_id,
    score1:       data.score1,
    score2:       data.score2,
    winnerId:     data.winner_id,
    played:       data.played,
    log:          [],
    sets:         [],
    setsPerMatch: data.sets_per_match ?? 1,
  }
}

export async function deleteUnplayedGame(gameId) {
  const { error } = await supabase
    .from('free_play_games')
    .delete()
    .eq('id', gameId)
    .eq('played', false)

  if (error) throw error
}

export async function saveFreePlayGame(freePlayId, game) {
  const { data, error } = await supabase
    .from('free_play_games')
    .upsert({
      id:           game.id,
      free_play_id: freePlayId,
      team1_id:     game.team1 || null,
      team2_id:     game.team2 || null,
      score1:       game.score1,
      score2:       game.score2,
      winner_id:    game.winner || null,
      played:       game.played,
      log:          game.log   || null,
      sets:         game.sets  || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Invite ────────────────────────────────────────────────────────────────────

/**
 * Generate the invite link for a free play session.
 * Uses the short invite_code if available; falls back to id-based URL.
 */
export function generateFreePlayInviteLink(freePlayIdOrSession) {
  if (freePlayIdOrSession && typeof freePlayIdOrSession === 'object') {
    const code = freePlayIdOrSession.invite_code
    if (code) return `${window.location.origin}/free-play/join/${code}`
    return `${window.location.origin}/free-play/${freePlayIdOrSession.id}/join`
  }
  // Legacy: called with just an id string (invite_code not known)
  return `${window.location.origin}/free-play/${freePlayIdOrSession}/join`
}

// ── Notifications ─────────────────────────────────────────────────────────────

/**
 * Notify a single league player that they were added to a Free Play session.
 * Used when adding one player at a time from the session page.
 * Resolves the player's user_id from the players table.
 */
async function notifyOneLeaguePlayerAdded(freePlayId, freePlayName, leaguePlayerId) {
  // Resolve session name if not supplied
  let sessionName = freePlayName
  if (!sessionName) {
    const { data } = await supabase
      .from('free_plays')
      .select('name')
      .eq('id', freePlayId)
      .single()
    sessionName = data?.name || 'a session'
  }

  // Get the user_id linked to this league player
  const { data: player } = await supabase
    .from('players')
    .select('user_id')
    .eq('id', leaguePlayerId)
    .single()

  if (!player?.user_id) return

  // Don't notify the person who triggered the add (the current auth user)
  const { data: { user } } = await supabase.auth.getUser()
  if (player.user_id === user?.id) return

  await createNotification(
    player.user_id,
    'free_play_added',
    'Added to a Free Play session',
    `You were added to "${sessionName}". Tap to view.`,
    { freePlayId },
  )
}

/**
 * Batch-notify multiple league players that they were added to a Free Play session.
 * Used at the end of the creation wizard, after all players have been inserted.
 *
 * @param {{ id: string, name: string }} freePlay - the created session
 * @param {string[]} leaguePlayerIds - array of league player IDs (players.id) to notify
 * @param {string|null} excludeUserId - creator's user_id; will be excluded
 */
export async function notifyPlayersAddedToFreePlay(freePlay, leaguePlayerIds, excludeUserId) {
  if (!leaguePlayerIds?.length) return

  // Fetch user_ids for each league player
  const { data: rows, error } = await supabase
    .from('players')
    .select('user_id')
    .in('id', leaguePlayerIds)

  if (error) { console.error('notifyPlayersAddedToFreePlay fetch:', error); return }

  // Deduplicate, drop nulls, drop creator
  const userIds = [...new Set(
    (rows || [])
      .map(r => r.user_id)
      .filter(uid => uid && uid !== excludeUserId),
  )]

  if (userIds.length === 0) return

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(userIds.map(user_id => ({
      user_id,
      type:  'free_play_added',
      title: 'Added to a Free Play session',
      body:  `You were added to "${freePlay.name}". Tap to view.`,
      data:  { freePlayId: freePlay.id },
    })))

  if (insertError) console.error('notifyPlayersAddedToFreePlay insert:', insertError)
}
