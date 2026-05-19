/**
 * tournamentService — Supabase calls for tournaments, teams, and matches.
 */
import { supabase } from '../lib/supabase'
import { simulateTournamentElo } from '../lib/elo'

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
  // Single round-trip: persist the match result.
  // Team and player win/loss/points counters are no longer maintained here —
  // they are computed on the fly from match logs wherever they are displayed
  // (LeagueDetail leaderboard, Profile leagues tab). Tournament-winner bonus
  // points (+2/+1) are still written by completeTournament().
  const { error } = await supabase
    .from('matches')
    .update({
      score1,
      score2,
      winner_id: winnerId,
      played:    true,
      log:       log  || null,
      sets:      sets || null,
    })
    .eq('id', matchId)

  if (error) throw error
}

/**
 * Save the current point log to a match row without marking it as played.
 * Used when the exporter taps "Done" on the QR export modal so the partial
 * log is safely persisted in Supabase before the phone is handed over.
 *
 * @param {string} matchId - Supabase match UUID
 * @param {object[]} log   - point log array (first half of the match)
 */
export async function savePartialMatchLog(matchId, log) {
  const { error } = await supabase
    .from('matches')
    .update({ log: log || null })
    .eq('id', matchId)
  if (error) throw error
}

/**
 * Fetch only the log column for a match.
 * Used by the importer device to retrieve the first-half log recorded by
 * the exporter before merging it with the second-half log on save.
 *
 * @param {string} matchId - Supabase match UUID
 * @returns {object[]|null} the saved log array, or null if none
 */
export async function fetchMatchLog(matchId) {
  const { data, error } = await supabase
    .from('matches')
    .select('log')
    .eq('id', matchId)
    .single()
  if (error) throw error
  return data?.log ?? null
}

/**
 * Persist tie-breaker config on the tournament row.
 * config shape: { tieBreakerMode: 'id'|'seed'|'draw', seedMap: {}, drawMap: {} }
 */
export async function updateTieBreakerConfig(tournamentId, config) {
  const { error } = await supabase
    .from('tournaments')
    .update({ tie_breaker_config: config })
    .eq('id', tournamentId)
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
 * After a knockout match result is saved, propagate the winner (and loser
 * for semi-finals) into the next round's match slots in Supabase.
 */
export async function advanceKnockoutAfterMatch(playedMatchId, winnerId, knockout) {
  const rounds = knockout?.rounds || []

  let foundRound = null, foundRoundIdx = -1, foundMatchIdx = -1
  for (let ri = 0; ri < rounds.length; ri++) {
    const mi = rounds[ri].matches.findIndex(m => m.id === playedMatchId)
    if (mi !== -1) { foundRound = rounds[ri]; foundRoundIdx = ri; foundMatchIdx = mi; break }
  }
  if (!foundRound) return

  const loserId = foundRound.matches[foundMatchIdx].team1 === winnerId
    ? foundRound.matches[foundMatchIdx].team2
    : foundRound.matches[foundMatchIdx].team1

  const updates = []

  if (foundRound.id === 'semi') {
    const finalRound = rounds.find(r => r.id === 'final')
    const thirdRound = rounds.find(r => r.id === 'third_place')
    const isFirst    = foundMatchIdx === 0

    if (finalRound?.matches[0]) {
      updates.push({ matchId: finalRound.matches[0].id, field: isFirst ? 'team1_id' : 'team2_id', value: winnerId })
    }
    if (thirdRound?.matches[0]) {
      updates.push({ matchId: thirdRound.matches[0].id, field: isFirst ? 'team1_id' : 'team2_id', value: loserId })
    }
  } else {
    const nextRound = rounds[foundRoundIdx + 1]
    if (nextRound && nextRound.id !== 'final' && nextRound.id !== 'third_place') {
      const nextMatchIdx = Math.floor(foundMatchIdx / 2)
      const isFirst      = foundMatchIdx % 2 === 0
      if (nextRound.matches[nextMatchIdx]) {
        updates.push({ matchId: nextRound.matches[nextMatchIdx].id, field: isFirst ? 'team1_id' : 'team2_id', value: winnerId })
      }
    }
  }

  for (const u of updates) {
    const { error } = await supabase.from('matches').update({ [u.field]: u.value }).eq('id', u.matchId)
    if (error) throw error
  }
}

/**
 * Marks a tournament as completed and sets the winner.
 */
export async function completeTournament(tournamentId, winnerTeamId, runnerUpTeamId) {
  const { error } = await supabase
    .from('tournaments')
    .update({ 
      phase: 'completed',
      status: 'completed',
      winner_team_id: winnerTeamId
    })
    .eq('id', tournamentId)

  if (error) throw error
  
  // Apply tournament completion bonus points
  if (winnerTeamId) {
    const { data: wTeam } = await supabase.from('teams').select('points').eq('id', winnerTeamId).single()
    if (wTeam) {
      await supabase.from('teams').update({ points: wTeam.points + 2 }).eq('id', winnerTeamId)
      
      const { data: wPlayers } = await supabase.from('team_players').select('player_id').eq('team_id', winnerTeamId)
      if (wPlayers) {
        for (const wp of wPlayers) {
          const { data: pData } = await supabase.from('players').select('points').eq('id', wp.player_id).single()
          if (pData) {
            await supabase.from('players').update({ points: pData.points + 2 }).eq('id', wp.player_id)
          }
        }
      }
    }
  }
  
  if (runnerUpTeamId) {
    const { data: rTeam } = await supabase.from('teams').select('points').eq('id', runnerUpTeamId).single()
    if (rTeam) {
      await supabase.from('teams').update({ points: rTeam.points + 1 }).eq('id', runnerUpTeamId)
      
      const { data: rPlayers } = await supabase.from('team_players').select('player_id').eq('team_id', runnerUpTeamId)
      if (rPlayers) {
        for (const rp of rPlayers) {
          const { data: pData } = await supabase.from('players').select('points').eq('id', rp.player_id).single()
          if (pData) {
            await supabase.from('players').update({ points: pData.points + 1 }).eq('id', rp.player_id)
          }
        }
      }
    }
  }
}

/**
 * Save full knockout structure (rounds + matches) to Supabase.
 * Called after "Generate Knockout" is triggered.
 */
export async function saveKnockoutRounds(tournamentId, rounds) {
  const { data: existingRounds, error: existingRoundsError } = await supabase
    .from('knockout_rounds')
    .select('id')
    .eq('tournament_id', tournamentId)
    .limit(1)

  if (existingRoundsError) throw existingRoundsError
  if ((existingRounds || []).length > 0) return

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

export async function renameTeam(teamId, newName) {
  const { error } = await supabase
    .from('teams')
    .update({ name: newName })
    .eq('id', teamId)
  if (error) throw error
}

/**
 * Persist the default serve order for a tournament team.
 * Called silently when a match starts so the same order is pre-loaded next time.
 */
export async function saveTeamServeOrder(teamId, serveOrder) {
  if (!teamId || !Array.isArray(serveOrder) || serveOrder.length === 0) return
  const { error } = await supabase
    .from('teams')
    .update({ serve_order: serveOrder })
    .eq('id', teamId)
  if (error) throw error
}

/**
 * Fetch who is currently scoring a match (if anyone).
 * Returns null on error so callers can fail silently.
 */
export async function fetchMatchScorer(matchId) {
  const { data, error } = await supabase
    .from('matches')
    .select('scorer_user_id, scorer_started_at, played, profiles!matches_scorer_user_id_fkey(full_name)')
    .eq('id', matchId)
    .single()
  if (error) return null
  return {
    scorerUserId:      data.scorer_user_id,
    scorerName:        data.profiles?.full_name || null,
    scorerStartedAt:   data.scorer_started_at,
    played:            data.played,
  }
}

/**
 * Claim scorer slot on a match. Overwrites any existing claim so the
 * latest scorer is always the one recorded.
 */
export async function claimMatchScorer(matchId, userId) {
  if (!matchId || !userId) return
  await supabase
    .from('matches')
    .update({ scorer_user_id: userId, scorer_started_at: new Date().toISOString() })
    .eq('id', matchId)
}

/**
 * Release the scorer claim on a match (e.g. when a match is aborted at 0-0
 * before any points are recorded). Makes the match immediately available for
 * another scorer to pick up.
 */
export async function releaseMatchScorer(matchId) {
  if (!matchId) return
  await supabase
    .from('matches')
    .update({ scorer_user_id: null, scorer_started_at: null })
    .eq('id', matchId)
}

// ─── Admin edit helpers ───────────────────────────────────────────────────────

async function reverseMatchStats(matchId) {
  const { data: match } = await supabase
    .from('matches')
    .select('team1_id, team2_id, winner_id')
    .eq('id', matchId)
    .single()
  if (!match?.winner_id) return

  const winnerId = match.winner_id
  const loserId  = match.team1_id === winnerId ? match.team2_id : match.team1_id

  const { data: wTeam } = await supabase.from('teams').select('wins, points').eq('id', winnerId).single()
  if (wTeam) {
    await supabase.from('teams').update({
      wins:   Math.max(0, wTeam.wins   - 1),
      points: Math.max(0, wTeam.points - 1),
    }).eq('id', winnerId)
  }

  if (loserId) {
    const { data: lTeam } = await supabase.from('teams').select('losses').eq('id', loserId).single()
    if (lTeam) {
      await supabase.from('teams').update({ losses: Math.max(0, lTeam.losses - 1) }).eq('id', loserId)
    }
  }

  const { data: wPlayers } = await supabase.from('team_players').select('player_id').eq('team_id', winnerId)
  if (wPlayers) {
    for (const wp of wPlayers) {
      const { data: p } = await supabase.from('players').select('wins, points').eq('id', wp.player_id).single()
      if (p) {
        await supabase.from('players').update({
          wins:   Math.max(0, p.wins   - 1),
          points: Math.max(0, p.points - 1),
        }).eq('id', wp.player_id)
      }
    }
  }

  if (loserId) {
    const { data: lPlayers } = await supabase.from('team_players').select('player_id').eq('team_id', loserId)
    if (lPlayers) {
      for (const lp of lPlayers) {
        const { data: p } = await supabase.from('players').select('losses').eq('id', lp.player_id).single()
        if (p) {
          await supabase.from('players').update({ losses: Math.max(0, p.losses - 1) }).eq('id', lp.player_id)
        }
      }
    }
  }
}

async function reverseTournamentCompletion(tournamentId, winnerTeamId, runnerUpTeamId) {
  await supabase.from('tournaments').update({
    phase: 'knockout',
    status: null,
    winner_team_id: null,
  }).eq('id', tournamentId)

  if (winnerTeamId) {
    const { data: wTeam } = await supabase.from('teams').select('points').eq('id', winnerTeamId).single()
    if (wTeam) {
      await supabase.from('teams').update({ points: Math.max(0, wTeam.points - 2) }).eq('id', winnerTeamId)
      const { data: wPlayers } = await supabase.from('team_players').select('player_id').eq('team_id', winnerTeamId)
      if (wPlayers) {
        for (const wp of wPlayers) {
          const { data: p } = await supabase.from('players').select('points').eq('id', wp.player_id).single()
          if (p) await supabase.from('players').update({ points: Math.max(0, p.points - 2) }).eq('id', wp.player_id)
        }
      }
    }
  }

  if (runnerUpTeamId) {
    const { data: rTeam } = await supabase.from('teams').select('points').eq('id', runnerUpTeamId).single()
    if (rTeam) {
      await supabase.from('teams').update({ points: Math.max(0, rTeam.points - 1) }).eq('id', runnerUpTeamId)
      const { data: rPlayers } = await supabase.from('team_players').select('player_id').eq('team_id', runnerUpTeamId)
      if (rPlayers) {
        for (const rp of rPlayers) {
          const { data: p } = await supabase.from('players').select('points').eq('id', rp.player_id).single()
          if (p) await supabase.from('players').update({ points: Math.max(0, p.points - 1) }).eq('id', rp.player_id)
        }
      }
    }
  }
}

/**
 * Clears the knockout bracket advancement for matchId and cascades backward
 * through any downstream played matches, reversing their stats and unsetting them.
 */
export async function reverseKnockoutAdvancement(matchId, tournament) {
  const rounds = tournament.knockout?.rounds || []

  // If this is the final and tournament is completed, undo completion
  const isFinal = rounds.some(r => r.id === 'final' && r.matches.some(m => m.id === matchId))
  if (isFinal && tournament.status === 'completed') {
    const finalMatch = rounds.find(r => r.id === 'final')?.matches.find(m => m.id === matchId)
    if (finalMatch?.winner) {
      const runnerUpId = finalMatch.team1 === finalMatch.winner ? finalMatch.team2 : finalMatch.team1
      await reverseTournamentCompletion(tournament.id, finalMatch.winner, runnerUpId)
    }
  }

  // Find this match in rounds
  let foundRound = null, foundRoundIdx = -1, foundMatchIdx = -1, foundMatch = null
  for (let ri = 0; ri < rounds.length; ri++) {
    const mi = rounds[ri].matches.findIndex(m => m.id === matchId)
    if (mi !== -1) {
      foundRound = rounds[ri]; foundRoundIdx = ri; foundMatchIdx = mi
      foundMatch = rounds[ri].matches[mi]
      break
    }
  }
  if (!foundRound || !foundMatch) return

  // Determine which next-round slots this match filled
  const slotsToReverse = []

  if (foundRound.id === 'semi') {
    const isFirst  = foundMatchIdx === 0
    const loserId  = foundMatch.team1 === foundMatch.winner ? foundMatch.team2 : foundMatch.team1
    const finalRound = rounds.find(r => r.id === 'final')
    const thirdRound = rounds.find(r => r.id === 'third_place')
    if (finalRound?.matches[0]) {
      slotsToReverse.push({ match: finalRound.matches[0], field: isFirst ? 'team1_id' : 'team2_id' })
    }
    if (thirdRound?.matches[0] && loserId) {
      slotsToReverse.push({ match: thirdRound.matches[0], field: isFirst ? 'team1_id' : 'team2_id' })
    }
  } else {
    const nextRound = rounds[foundRoundIdx + 1]
    if (nextRound) {
      const nextMatchIdx = Math.floor(foundMatchIdx / 2)
      const isFirst      = foundMatchIdx % 2 === 0
      if (nextRound.matches[nextMatchIdx]) {
        slotsToReverse.push({ match: nextRound.matches[nextMatchIdx], field: isFirst ? 'team1_id' : 'team2_id' })
      }
    }
  }

  for (const slot of slotsToReverse) {
    // If downstream match was played, cascade first
    if (slot.match.played) {
      await reverseMatchStats(slot.match.id)
      await reverseKnockoutAdvancement(slot.match.id, tournament)
      await supabase.from('matches').update({ played: false, winner_id: null }).eq('id', slot.match.id)
    }
    // Clear the slot
    await supabase.from('matches').update({ [slot.field]: null }).eq('id', slot.match.id)
  }
}

/**
 * Reopen a finished match: reverse all stats, fix bracket, set played=false.
 * Keeps the existing log and sets in the DB for scoreboard history.
 */
export async function reopenMatch(matchId, tournament) {
  const { data: match } = await supabase
    .from('matches')
    .select('team1_id, team2_id, winner_id, source_type, played')
    .eq('id', matchId)
    .single()
  if (!match?.played) return

  await reverseMatchStats(matchId)

  if (match.source_type === 'knockout' && tournament?.knockout) {
    await reverseKnockoutAdvancement(matchId, tournament)
  }

  await supabase.from('matches').update({ played: false, winner_id: null }).eq('id', matchId)
}

/**
 * Quick-edit a finished match's scores: reverse old stats, update scores, apply new stats.
 */
export async function quickEditMatchScores(matchId, newSets, newScore1, newScore2, newWinnerId, tournament) {
  const { data: match } = await supabase
    .from('matches')
    .select('team1_id, team2_id, winner_id, source_type')
    .eq('id', matchId)
    .single()
  if (!match) return

  const oldWinnerId  = match.winner_id
  const winnerChanged = oldWinnerId !== newWinnerId

  await reverseMatchStats(matchId)

  if (match.source_type === 'knockout' && tournament?.knockout && winnerChanged) {
    await reverseKnockoutAdvancement(matchId, tournament)
    await advanceKnockoutAfterMatch(matchId, newWinnerId, tournament.knockout)
  }

  // If final and winner changed: re-complete tournament with new winner
  if (match.source_type === 'knockout' && winnerChanged && tournament?.status === 'completed') {
    const isFinal = tournament.knockout?.rounds?.some(
      r => r.id === 'final' && r.matches.some(m => m.id === matchId)
    )
    if (isFinal) {
      const finalMatch = tournament.knockout.rounds
        .find(r => r.id === 'final')?.matches.find(m => m.id === matchId)
      const newRunnerUpId = finalMatch?.team1 === newWinnerId ? finalMatch?.team2 : finalMatch?.team1
      await completeTournament(tournament.id, newWinnerId, newRunnerUpId)
    }
  }

  await supabase.from('matches').update({
    score1:    newScore1,
    score2:    newScore2,
    winner_id: newWinnerId,
    sets:      newSets,
    log:       null,  // old point log no longer matches edited scores
  }).eq('id', matchId)

  // Apply new stats
  const newLoserId = match.team1_id === newWinnerId ? match.team2_id : match.team1_id

  const { data: wTeam } = await supabase.from('teams').select('wins, points').eq('id', newWinnerId).single()
  if (wTeam) {
    await supabase.from('teams').update({ wins: wTeam.wins + 1, points: wTeam.points + 1 }).eq('id', newWinnerId)
  }
  const { data: wPlayers } = await supabase.from('team_players').select('player_id').eq('team_id', newWinnerId)
  if (wPlayers) {
    for (const wp of wPlayers) {
      const { data: p } = await supabase.from('players').select('wins, points').eq('id', wp.player_id).single()
      if (p) await supabase.from('players').update({ wins: p.wins + 1, points: p.points + 1 }).eq('id', wp.player_id)
    }
  }

  if (newLoserId) {
    const { data: lTeam } = await supabase.from('teams').select('losses').eq('id', newLoserId).single()
    if (lTeam) {
      await supabase.from('teams').update({ losses: lTeam.losses + 1 }).eq('id', newLoserId)
    }
    const { data: lPlayers } = await supabase.from('team_players').select('player_id').eq('team_id', newLoserId)
    if (lPlayers) {
      for (const lp of lPlayers) {
        const { data: p } = await supabase.from('players').select('losses').eq('id', lp.player_id).single()
        if (p) await supabase.from('players').update({ losses: p.losses + 1 }).eq('id', lp.player_id)
      }
    }
  }
}

export async function deleteTournament(tournamentId) {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournamentId)
  if (error) throw error
}

/**
 * Persist the scoring level for a tournament.
 * level must be 1, 2, or 3; throws for any other value.
 * null means "inherit from league" — use updateLeagueScoringConfig to clear it there.
 */
export async function updateTournamentScoringConfig(tournamentId, { level }) {
  if (![1, 2, 3].includes(level)) {
    throw new Error(`Invalid scoring level "${level}". Must be 1, 2, or 3.`)
  }
  const { error } = await supabase
    .from('tournaments')
    .update({ scoring_config: { level } })
    .eq('id', tournamentId)
  if (error) throw error
}

/**
 * Calculates and updates Elo ratings for all players in a tournament sequentially.
 * @param {string} tournamentId
 */
export async function processTournamentElo(tournamentId) {
  // 1. Fetch tournament to check if already processed
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('elo_processed')
    .eq('id', tournamentId)
    .single()
  
  if (tErr) throw tErr
  if (tournament.elo_processed) {
    throw new Error('Tournament Elo already processed')
  }

  // 2. Fetch all teams in tournament
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId)
  if (teamsErr) throw teamsErr
  
  const teamIds = teams.map(t => t.id)
  
  // 3. Fetch team_players to map players to teams
  let teamPlayers = []
  if (teamIds.length > 0) {
    const { data: tp, error: tpErr } = await supabase
      .from('team_players')
      .select('team_id, player_id')
      .in('team_id', teamIds)
    if (tpErr) throw tpErr
    teamPlayers = tp
  }

  // 4. Fetch all player ratings
  const playerIds = [...new Set(teamPlayers.map(tp => tp.player_id))]
  let playersMap = {}
  if (playerIds.length > 0) {
    const { data: players, error: pErr } = await supabase
      .from('players')
      .select('id, elo, name, profiles(nickname, full_name)')
      .in('id', playerIds)
    if (pErr) throw pErr
    
    players.forEach(p => {
      
      // Derive a reliable display name just like normalizePlayer
      const linked = p.profiles
      p.displayName = (linked?.nickname || linked?.full_name) || p.name || 'Unknown'
      playersMap[p.id] = p

    })
  }

  // 5. Fetch matches chronologically
  // Groups first (by id, implicitly created first), then knockouts ordered by round
  const { data: matches, error: mErr } = await supabase
    .from('matches')
    .select('id, source_type, team1_id, team2_id, winner_id, played, knockout_rounds(sort_order, round_key)')
    .eq('tournament_id', tournamentId)
    // Supabase JS doesn't perfectly sort by a nested table's column easily using just .order
    // We fetch them and sort locally to be absolutely certain
  if (mErr) throw mErr

  const sortedMatches = matches.sort((a, b) => {
    if (a.source_type === 'group' && b.source_type !== 'group') return -1
    if (a.source_type !== 'group' && b.source_type === 'group') return 1
    if (a.source_type === 'knockout' && b.source_type === 'knockout') {
      const orderA = a.knockout_rounds?.sort_order ?? 999
      const orderB = b.knockout_rounds?.sort_order ?? 999
      return orderA - orderB
    }
    // Fallback: stable string comparison of IDs
    return a.id.localeCompare(b.id)
  })

  // 6. Simulate the Elo updates
  const { finalRatings: newElos, auditLog } = simulateTournamentElo(sortedMatches, teamPlayers, playersMap)

  // 7. Batch Update Players
  const updates = Object.entries(newElos).map(([playerId, newElo]) => 
    supabase.from('players').update({ elo: newElo }).eq('id', playerId)
  )
  await Promise.all(updates)

  // 8. Mark tournament as processed
  const { error: updateTErr } = await supabase
    .from('tournaments')
    .update({ elo_processed: true, elo_log: auditLog })
    .eq('id', tournamentId)
  if (updateTErr) throw updateTErr
}
