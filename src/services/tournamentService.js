/**
 * tournamentService — Supabase calls for tournaments, teams, and matches.
 */
import { supabase } from '../lib/supabase'

/**
 * Create a tournament with its teams and group/match structure.
 *
 * @param {string} leagueId
 * @param {object} payload - matches the legacy shape used in TournamentSetupWizard
 *   { name, date, teamSize, setsPerMatch, teams[], groups[], matches[] }
 */
export async function createTournament(leagueId, payload) {
  const { name, date, teamSize = 2, setsPerMatch = 1, teams = [], groups = [], matches = [] } = payload

  // 1. Insert tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      league_id:      leagueId,
      name,
      date,
      team_size:      teamSize,
      sets_per_match: setsPerMatch,
      phase:          groups.length ? 'group' : 'freeplay',
    })
    .select()
    .single()

  if (tErr) throw tErr
  const tid = tournament.id

  // 2. Insert teams
  const teamIdMap = {} // legacy id → supabase id
  for (const team of teams) {
    const { data: t, error } = await supabase
      .from('teams')
      .insert({ tournament_id: tid, name: team.name })
      .select()
      .single()
    if (error) throw error
    teamIdMap[team.id] = t.id

    // Insert team_players
    if (team.players?.length) {
      await supabase.from('team_players').insert(
        team.players.map(pid => ({ team_id: t.id, player_id: pid }))
      )
    }
  }

  // 3. Insert groups + group matches
  if (groups.length) {
    let gOrder = 0
    for (const group of groups) {
      const { data: g, error: gErr } = await supabase
        .from('groups')
        .insert({ tournament_id: tid, name: group.name, sort_order: gOrder++ })
        .select()
        .single()
      if (gErr) throw gErr

      // group_teams
      const mappedTeamIds = (group.teamIds || []).map(id => teamIdMap[id]).filter(Boolean)
      if (mappedTeamIds.length) {
        await supabase.from('group_teams').insert(
          mappedTeamIds.map(tid2 => ({ group_id: g.id, team_id: tid2 }))
        )
      }

      // group matches
      for (const m of (group.matches || [])) {
        await supabase.from('matches').insert({
          tournament_id: tid,
          source_type:   'group',
          group_id:      g.id,
          team1_id:      teamIdMap[m.team1] || null,
          team2_id:      teamIdMap[m.team2] || null,
          played:        false,
        })
      }
    }
  }

  // 4. Free-play matches (no groups)
  for (const m of matches) {
    await supabase.from('matches').insert({
      tournament_id: tid,
      source_type:   'freeplay',
      team1_id:      teamIdMap[m.team1] || null,
      team2_id:      teamIdMap[m.team2] || null,
      played:        false,
    })
  }

  return tournament
}

/**
 * Persist match result to Supabase.
 *
 * @param {string} matchId - Supabase match UUID
 * @param {number} score1
 * @param {number} score2
 * @param {string} winnerId - Supabase team UUID
 * @param {object[]} log - point log array
 * @param {object[]} sets - sets array
 */
export async function saveMatchResult(matchId, score1, score2, winnerId, log = null, sets = null) {
  const { error } = await supabase
    .from('matches')
    .update({
      score1,
      score2,
      winner_id: winnerId,
      played:    true,
      log:       log   || null,
      sets:      sets  || null,
    })
    .eq('id', matchId)

  if (error) throw error
}

/**
 * Update tournament phase (e.g. 'group' → 'knockout').
 */
export async function updateTournamentPhase(tournamentId, phase) {
  const { error } = await supabase
    .from('tournaments')
    .update({ phase })
    .eq('id', tournamentId)

  if (error) throw error
}

/**
 * Save full knockout structure (rounds + matches) to Supabase.
 * Called after "Generate Knockout" is triggered.
 */
export async function saveKnockoutRounds(tournamentId, rounds) {
  let order = 0
  for (const round of rounds) {
    const { data: r, error } = await supabase
      .from('knockout_rounds')
      .insert({
        tournament_id: tournamentId,
        round_key:     round.id,
        name:          round.name,
        sort_order:    order++,
      })
      .select()
      .single()

    if (error) throw error

    for (const m of (round.matches || [])) {
      await supabase.from('matches').insert({
        tournament_id:      tournamentId,
        source_type:        'knockout',
        knockout_round_id:  r.id,
        team1_id:           m.team1 || null,
        team2_id:           m.team2 || null,
        played:             false,
      })
    }
  }
}
