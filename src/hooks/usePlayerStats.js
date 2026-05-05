/**
 * Fetches all leagues + tournaments + matches the user participated in,
 * annotates each match with the player's perspective, and runs the
 * aggregators. Returns a single bundle the Profile page consumes.
 */
import { useEffect, useState } from 'react'
import { getMyLeagues, getLeagueById } from '../services/leagueService'
import { computeAllPlayerStats } from '../lib/playerStats'
import { calcOverallStandings } from './../lib/standings'

function getAllMatches(tour) {
  return [
    ...((tour.groups || []).flatMap(g => g.matches || [])),
    ...((tour.knockout?.rounds || []).flatMap(r => r.matches || [])),
    ...(tour.matches || []),
  ]
}

function isPlayerInTeam(playerId, teamId, tournament) {
  const team = tournament.teams?.find(t => t.id === teamId)
  if (!team || !team.players) return false
  return team.players.includes(playerId)
}

function teamName(teamId, tournament) {
  const team = tournament.teams?.find(t => t.id === teamId)
  if (!team) return 'Unknown'
  return team.name || team.players?.map(pid => {
    const p = tournament.players?.find(pp => pp.id === pid)
    return p?.name?.split(' ')[0] || '?'
  }).join(' & ') || 'Team'
}

function tournamentDate(tour) {
  const raw = tour.date || tour.created_at || null
  if (!raw) return 0
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

function matchDate(match, fallback) {
  const ts = match.created_at || match.played_at || null
  if (!ts) return fallback
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? fallback : d.getTime()
}

function tournamentFinishRank(tour, myTeamId) {
  if (!myTeamId) return null
  const allMatches = getAllMatches(tour).filter(m => m.played)
  if (allMatches.length === 0) return null
  try {
    const standings = calcOverallStandings(tour.teams || [], allMatches)
    const idx = standings.findIndex(s => s.id === myTeamId)
    return idx >= 0 ? idx + 1 : null
  } catch {
    return null
  }
}

export function usePlayerStats(profile) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    bundle: null,
    rawLeagues: [],
  })

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!profile?.id) {
        setState(s => ({ ...s, loading: false }))
        return
      }
      try {
        const shallow = await getMyLeagues()
        const fullLeagues = await Promise.all(shallow.map(l => getLeagueById(l.id)))
        if (cancelled) return

        const annotated = []
        const tournamentWinsByPlayer = new Set()
        const partners = new Set()
        const opponents = new Set()
        const recentMatches = []

        for (const league of fullLeagues) {
          const myPlayer = league.players?.find(p => p.userId === profile.id)
          if (!myPlayer) continue

          for (const tour of league.tournaments || []) {
            // Find my team in this tournament
            const myTeam = tour.teams?.find(t => t.players?.includes(myPlayer.id))
            const myTeamId = myTeam?.id || null
            const finishRank = tournamentFinishRank(tour, myTeamId)
            if (finishRank === 1) tournamentWinsByPlayer.add(tour.id)

            const tDate = tournamentDate(tour)
            const allMatches = getAllMatches(tour).filter(m => m.played)

            for (const m of allMatches) {
              const inTeam1 = isPlayerInTeam(myPlayer.id, m.team1, tour)
              const inTeam2 = isPlayerInTeam(myPlayer.id, m.team2, tour)
              if (!inTeam1 && !inTeam2) continue
              const playerTeamNum = inTeam1 ? 1 : 2
              const playerTeamId = inTeam1 ? m.team1 : m.team2
              const opposingTeamId = inTeam1 ? m.team2 : m.team1
              const date = matchDate(m, tDate)

              // Track partners (other players on my team) + opponents.
              const myTeamObj = tour.teams?.find(t => t.id === playerTeamId)
              ;(myTeamObj?.players || []).forEach(pid => {
                if (pid !== myPlayer.id) partners.add(pid)
              })
              const oppTeamObj = tour.teams?.find(t => t.id === opposingTeamId)
              ;(oppTeamObj?.players || []).forEach(pid => opponents.add(pid))

              annotated.push({
                match: m,
                pid: myPlayer.id,            // league-specific player.id used in match logs
                playerTeamNum,
                playerTeamId,
                opposingTeamId,
                tournamentId: tour.id,
                tournamentName: tour.name,
                leagueId: league.id,
                leagueName: league.name,
                date,
                finishRank,
              })

              recentMatches.push({
                matchId: m.id,
                date,
                won: m.winner === playerTeamId,
                sets: m.sets || [],
                score1: m.score1,
                score2: m.score2,
                opponentName: teamName(opposingTeamId, tour),
                tournamentName: tour.name,
                leagueName: league.name,
                leagueId: league.id,
                tournamentId: tour.id,
              })
            }
          }
        }

        const stats = computeAllPlayerStats(annotated)

        // Add aggregate counters that span beyond the per-match scope.
        stats.leagueCount = fullLeagues.filter(l =>
          l.players?.some(p => p.userId === profile.id)
        ).length
        stats.tournamentWins = tournamentWinsByPlayer.size
        stats.uniquePartners = partners.size
        stats.uniqueOpponents = opponents.size

        // Best rank: lowest finishRank across tournaments where the player participated.
        let bestRankNum = Infinity
        for (const t of stats.byTournament) {
          if (t.finishRank && t.finishRank < bestRankNum) bestRankNum = t.finishRank
        }
        stats.bestRank = Number.isFinite(bestRankNum) ? bestRankNum : null

        // Per-match scoring tally — used by recent matches list.
        const matchScoring = new Map()
        for (const a of annotated) {
          let pts = 0
          let aces = 0
          for (const e of a.match.log || []) {
            if (e.scoringPlayerId === a.pid) {
              pts++
              if (e.pointType === 'ace') aces++
            }
          }
          matchScoring.set(a.match.id, { points: pts, aces })
        }
        for (const r of recentMatches) {
          const ms = matchScoring.get(r.matchId)
          if (ms) { r.points = ms.points; r.aces = ms.aces }
        }
        recentMatches.sort((a, b) => (b.date || 0) - (a.date || 0))
        stats.recentMatches = recentMatches

        setState({
          loading: false,
          error: null,
          bundle: stats,
          rawLeagues: fullLeagues,
        })
      } catch (err) {
        console.error('usePlayerStats failed', err)
        if (!cancelled) {
          setState({ loading: false, error: err, bundle: null, rawLeagues: [] })
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [profile?.id])

  return state
}
