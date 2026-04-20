/**
 * freePlayService — Supabase calls for free play sessions.
 */
import { supabase } from '../lib/supabase'

export async function getFreePlays(leagueId = null) {
  let q = supabase.from('free_plays').select('*').order('created_at', { ascending: false })
  if (leagueId) q = q.eq('league_id', leagueId)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function saveFreePlayGame(freePlayId, game) {
  const { data, error } = await supabase
    .from('free_play_games')
    .upsert({
      id:          game.id,
      free_play_id: freePlayId,
      team1_id:    game.team1 || null,
      team2_id:    game.team2 || null,
      score1:      game.score1,
      score2:      game.score2,
      winner_id:   game.winner || null,
      played:      game.played,
      log:         game.log   || null,
      sets:        game.sets  || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
