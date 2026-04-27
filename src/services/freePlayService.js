/**
 * freePlayService — Supabase calls for free play sessions.
 */
import { supabase } from '../lib/supabase'

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getFreePlays(leagueId = null) {
  let q = supabase.from('free_plays').select('*').order('created_at', { ascending: false })
  if (leagueId) q = q.eq('league_id', leagueId)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createFreePlay(name, leagueId = null) {
  const { data, error } = await supabase
    .from('free_plays')
    .insert({ name, league_id: leagueId || null, date: new Date().toISOString().split('T')[0] })
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

export async function finishFreePlay(id) {
  const { error } = await supabase
    .from('free_plays')
    .update({ status: 'finished' })
    .eq('id', id)

  if (error) throw error
}

// ── Players ───────────────────────────────────────────────────────────────────

export async function addFreePlayPlayer(freePlayId, { name, leaguePlayerId = null }) {
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

export function generateFreePlayInviteLink(freePlayId) {
  return `${window.location.origin}/free-play/${freePlayId}/join`
}
