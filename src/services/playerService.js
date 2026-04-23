/**
 * playerService — Supabase calls for league players.
 */
import { supabase } from '../lib/supabase'

export async function getLeaguePlayers(leagueId) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data.map(normalizePlayer)
}

export async function addPlayer(leagueId, { name, level = 'beginner', sex = null, userId = null }) {
  const { data, error } = await supabase
    .from('players')
    .insert({ league_id: leagueId, name, level, sex, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return normalizePlayer(data)
}

export async function updatePlayer(playerId, updates) {
  const dbUpdates = {}
  if (updates.name  !== undefined) dbUpdates.name  = updates.name
  if (updates.level !== undefined) dbUpdates.level = updates.level
  if (updates.sex   !== undefined) dbUpdates.sex   = updates.sex
  if (updates.wins  !== undefined) dbUpdates.wins  = updates.wins
  if (updates.losses !== undefined) dbUpdates.losses = updates.losses
  if (updates.points !== undefined) dbUpdates.points = updates.points
  if (updates.userId !== undefined) dbUpdates.user_id = updates.userId

  const { data, error } = await supabase
    .from('players')
    .update(dbUpdates)
    .eq('id', playerId)
    .select()
    .single()

  if (error) throw error
  return normalizePlayer(data)
}

export async function deletePlayer(playerId) {
  const { error } = await supabase.from('players').delete().eq('id', playerId)
  if (error) throw error
}

function normalizePlayer(row) {
  return {
    id:       row.id,
    name:     row.name,
    level:    row.level,
    sex:      row.sex ?? null,
    wins:     row.wins,
    losses:   row.losses,
    points:   row.points,
    userId:   row.user_id,
    leagueId: row.league_id,
  }
}
