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
  // 1. Get the match to determine the loser team
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select('team1_id, team2_id')
    .eq('id', matchId)
    .single()
    
  if (matchError) throw matchError

  const loserId = matchData.team1_id === winnerId ? matchData.team2_id : matchData.team1_id

  // 2. Save the match result
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
  
  // 3. Update team stats (1 pt and 1 win for winner, 1 loss for loser)
  if (winnerId) {
    const { error: winErr } = await supabase.rpc('increment_team_stats', {
      p_team_id: winnerId,
      p_wins: 1,
      p_losses: 0,
      p_points: 1
    })
    
    // If RPC doesn't exist, fallback to direct update
    if (winErr) {
      const { data: wTeam } = await supabase.from('teams').select('wins, points').eq('id', winnerId).single()
      if (wTeam) {
        await supabase.from('teams').update({
          wins: wTeam.wins + 1,
          points: wTeam.points + 1
        }).eq('id', winnerId)
      }
    }
  }
  
  if (loserId) {
    const { error: lossErr } = await supabase.rpc('increment_team_stats', {
      p_team_id: loserId,
      p_wins: 0,
      p_losses: 1,
      p_points: 0
    })
    
    if (lossErr) {
      const { data: lTeam } = await supabase.from('teams').select('losses').eq('id', loserId).single()
      if (lTeam) {
        await supabase.from('teams').update({
          losses: lTeam.losses + 1
        }).eq('id', loserId)
      }
    }
  }

  // 4. Update player stats
  if (winnerId) {
    const { data: wPlayers } = await supabase.from('team_players').select('player_id').eq('team_id', winnerId)
    if (wPlayers) {
      for (const wp of wPlayers) {
        const { data: pData } = await supabase.from('players').select('wins, points').eq('id', wp.player_id).single()
        if (pData) {
          await supabase.from('players').update({
            wins: pData.wins + 1,
            points: pData.points + 1
          }).eq('id', wp.player_id)
        }
      }
    }
  }
  
  if (loserId) {
    const { data: lPlayers } = await supabase.from('team_players').select('player_id').eq('team_id', loserId)
    if (lPlayers) {
      for (const lp of lPlayers) {
        const { data: pData } = await supabase.from('players').select('losses').eq('id', lp.player_id).single()
        if (pData) {
          await supabase.from('players').update({
            losses: pData.losses + 1
          }).eq('id', lp.player_id)
        }
      }
    }
  }
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
