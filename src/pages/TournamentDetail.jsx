import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { saveMatchResult as supabaseSaveMatchResult, saveKnockoutRounds, updateTournamentPhase, advanceKnockoutAfterMatch } from '../services/tournamentService'
import { uid } from '../lib/utils'
import GameStats from '../components/GameStats'

// ─── Inline icons ─────────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    {children}
  </svg>
)
const BackIcon = () => <Svg><polyline points="15 18 9 12 15 6" /></Svg>
const CloseIcon = () => <Svg><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>

// ─── Pill tab switcher (matches wireframe 02) ─────────────────────────────────
function PillTabs({ items, active, onChange }) {
  return (
    <div className="flex bg-alt rounded-[10px] p-[3px] mx-4 mb-3.5 flex-shrink-0">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`
            flex-1 py-2 rounded-lg text-[11px] font-semibold cursor-pointer border-0
            transition-all
            ${active === item.id ? 'bg-surface text-accent shadow-sm' : 'bg-transparent text-dim'}
          `}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

// ─── Header status badge ──────────────────────────────────────────────────────
function StatusBadge({ tournament }) {
  const { phase, status } = tournament
  if (status === 'completed')
    return <span className="text-[10px] font-bold text-dim bg-alt px-2.5 py-1 rounded-lg shrink-0">Done</span>
  if (['group', 'knockout', 'freeplay'].includes(phase))
    return <span className="text-[10px] font-bold text-success bg-success/20 px-2.5 py-1 rounded-lg shrink-0">LIVE</span>
  return <span className="text-[10px] font-bold text-accent bg-accent/15 px-2.5 py-1 rounded-lg shrink-0">SETUP</span>
}

// ─── Data helpers ─────────────────────────────────────────────────────────────
function teamName(teams, id) {
  return teams.find(t => t.id === id)?.name || '?'
}

// ─── Head-to-head stats between two teams ─────────────────────────────────────
function h2hStats(idA, idB, matches) {
  const s = { [idA]: { pts: 0, gd: 0 }, [idB]: { pts: 0, gd: 0 } }
  ;(matches || [])
    .filter(m => m.played &&
      ((m.team1 === idA && m.team2 === idB) || (m.team1 === idB && m.team2 === idA)))
    .forEach(m => {
      const [s1, s2] = [m.score1, m.score2]
      s[m.team1].gd += s1 - s2; s[m.team2].gd += s2 - s1
      if (s1 > s2) s[m.team1].pts += 1; else s[m.team2].pts += 1 // W=1, L=0
    })
  return s
}

// ─── Standings calculator (Legacy compatible) ─────────────────────────────────
function calcStandings(group) {
  return group.teamIds.map(teamId => {
    let mp = 0, pf = 0, pa = 0, played = 0, wins = 0, losses = 0
    ;(group.matches || [])
      .filter(m => m.played && (m.team1 === teamId || m.team2 === teamId))
      .forEach(m => {
        played++
        const isT1 = m.team1 === teamId
        const scored   = isT1 ? m.score1 : m.score2
        const conceded = isT1 ? m.score2 : m.score1
        pf += scored; pa += conceded
        if (scored > conceded) { mp += 1; wins++   }
        else                   {          losses++ }
      })
    return { teamId, played, wins, losses, pf, pa, pd: pf - pa, mp }
  }).sort((a, b) => {
    if (b.mp !== a.mp) return b.mp - a.mp   // Match Points (W=1)
    if (b.pd !== a.pd) return b.pd - a.pd   // Point Difference
    if (b.pf !== a.pf) return b.pf - a.pf   // Points For
    // Head-to-head tiebreaker
    const h = h2hStats(a.teamId, b.teamId, group.matches || [])
    if (h[b.teamId].pts !== h[a.teamId].pts) return h[b.teamId].pts - h[a.teamId].pts
    return h[b.teamId].gd - h[a.teamId].gd
  })
}

// ─── Knockout bracket builder ─────────────────────────────────────────────────
function buildKnockout(groups) {
  // top2[i] = [{ teamId, position: 1|2, groupIdx }, ...]
  const qualifiers = groups.flatMap((g, gi) => {
    const standings = calcStandings(g)
    return standings.slice(0, 2).map((s, pos) => ({ teamId: s.teamId, position: pos, groupIdx: gi }))
  })

  // Cross-seed: 1st of group i vs 2nd of group i+1 (wrap)
  const n = groups.length
  const firstPlace  = qualifiers.filter(q => q.position === 0)
  const secondPlace = qualifiers.filter(q => q.position === 1)

  // First round matches: 1st[i] vs 2nd[(i+1) % n]
  const firstRoundMatches = firstPlace.map((fp, i) => ({
    id: uid(),
    team1: fp.teamId,
    team2: secondPlace[(i + 1) % n].teamId,
    played: false, winner: null, score1: 0, score2: 0,
  }))

  const totalQualifiers = firstRoundMatches.length * 2 // == qualifiers.length

  // Build round structure
  const rounds = []

  // First round name
  const firstRoundName =
    totalQualifiers >= 16 ? "Round of 16" :
    totalQualifiers >= 8  ? "Quarter-finals" :
    "Semi-finals"

  let currentMatches = firstRoundMatches
  let currentId = totalQualifiers >= 16 ? "r16" : totalQualifiers >= 8 ? "qf" : "semi"
  let currentName = firstRoundName

  while (currentMatches.length > 1) {
    rounds.push({ id: currentId, name: currentName, matches: currentMatches })

    // Next round: TBD slots
    const nextCount = Math.ceil(currentMatches.length / 2)
    const nextMatches = Array.from({ length: nextCount }, () => ({
      id: uid(), team1: null, team2: null, played: false, winner: null, score1: 0, score2: 0,
    }))

    currentMatches = nextMatches
    if (currentId === "r16")   { currentId = "qf";    currentName = "Quarter-finals" }
    else if (currentId === "qf"){ currentId = "semi";  currentName = "Semi-finals" }
    else                        { currentId = "final"; currentName = "Final"; break }
  }

  // Always add Final as the last round
  const finalMatch = {
    id: uid(), team1: null, team2: null, played: false, winner: null, score1: 0, score2: 0,
  }
  rounds.push({ id: "final", name: "Final", matches: [finalMatch] })

  // 3rd place match (between semi-final losers)
  const thirdMatch = {
    id: uid(), team1: null, team2: null, played: false, winner: null, score1: 0, score2: 0,
  }
  rounds.push({ id: "third_place", name: "3rd Place", matches: [thirdMatch] })

  // If only 2 groups (4 qualifiers → 2 semi matches), fill the final directly from semis
  // (handled by advanceKnockout in App.jsx)

  // Special case: if the first round IS the semi-final, fill the final slots now
  if (rounds[0].id === "semi") {
    const semis = rounds[0].matches
    if (semis.length === 2) {
      // Final and 3rd place are TBD — will be filled by advanceKnockout
    }
  }

  return { rounds }
}

function calcGroupStandings(group, teams) {
  return group.teamIds.map(teamId => {
    let wins = 0, losses = 0
    group.matches
      .filter(m => m.played && (m.team1 === teamId || m.team2 === teamId))
      .forEach(m => {
        const scored   = m.team1 === teamId ? m.score1 : m.score2
        const conceded = m.team1 === teamId ? m.score2 : m.score1
        if (scored > conceded) wins++; else losses++
      })
    return { id: teamId, name: teamName(teams, teamId), wins, losses, pts: wins * 3 }
  }).sort((a, b) => b.pts - a.pts || b.wins - a.wins)
}

function calcOverallStandings(teams, matches) {
  return teams.map(tm => {
    let wins = 0, losses = 0
    ;(matches || [])
      .filter(m => m.played && (m.team1 === tm.id || m.team2 === tm.id))
      .forEach(m => {
        const scored   = m.team1 === tm.id ? m.score1 : m.score2
        const conceded = m.team1 === tm.id ? m.score2 : m.score1
        if (scored > conceded) wins++; else losses++
      })
    return { id: tm.id, name: tm.name, wins, losses, pts: wins * 3 }
  }).sort((a, b) => b.pts - a.pts || b.wins - a.wins)
}

function getAllMatches(tournament) {
  return [
    ...(tournament.groups || []).flatMap(g =>
      g.matches.map(m => ({ ...m, label: g.name }))
    ),
    ...(tournament.knockout?.rounds || []).flatMap(r =>
      r.matches.map(m => ({ ...m, label: roundLabel(r.id) }))
    ),
    ...(tournament.matches || []).map((m, i) => ({ ...m, label: `Match ${i + 1}` })),
  ]
}

function roundLabel(id) {
  return (
    { final: 'Final', semi: 'Semi-final', quarter: 'Quarter-final',
      third_place: '3rd Place', r16: 'Round of 16' }[id] || id
  )
}

// ─── Reusable standings table (W / L / PTS) ───────────────────────────────────
function StandingsTable({ rows }) {
  return (
    <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
      {/* Column headers */}
      <div className="flex items-center px-3.5 py-2 border-b border-line bg-alt">
        <span className="w-[22px] text-[10px] font-bold text-dim">#</span>
        <span className="flex-1  text-[10px] font-bold text-dim">TEAM</span>
        <span className="w-7 text-center text-[10px] font-bold text-dim">W</span>
        <span className="w-7 text-center text-[10px] font-bold text-dim">L</span>
        <span className="w-9 text-center text-[10px] font-bold text-dim">PTS</span>
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-[13px] text-dim py-4">No data yet</div>
      ) : rows.map((row, i) => (
        <div
          key={row.id}
          className={`
            flex items-center px-3.5 py-2.5
            ${i < rows.length - 1 ? 'border-b border-line' : ''}
            ${i === 0 ? 'bg-accent/15' : ''}
          `}
        >
          <span className={`w-[22px] text-[13px] font-bold ${i === 0 ? 'text-accent' : 'text-dim'}`}>
            {i + 1}
          </span>
          <span className="flex-1 text-[13px] font-semibold text-text truncate">{row.name}</span>
          <span className="w-7 text-center text-[13px] font-semibold text-success">{row.wins}</span>
          <span className="w-7 text-center text-[13px] font-semibold text-error">{row.losses}</span>
          <span className="w-9 text-center text-[13px] font-bold text-accent">{row.pts}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Knockout results (simple list per round) ─────────────────────────────────
function KnockoutResults({ tournament, onMatchClick }) {
  const rounds = (tournament.knockout?.rounds || [])
    .filter(r => r.matches.some(m => m.team1 && m.team2))

  if (!rounds.length) return null

  return (
    <div className="mt-5">
      <div className="text-[12px] font-bold text-accent tracking-wide uppercase mb-2.5">
        Knockout Stage
      </div>

      {rounds.map(round => (
        <div key={round.id} className="mb-3">
          <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-1.5">
            {roundLabel(round.id)}
          </div>

          {round.matches
            .filter(m => m.team1 && m.team2)
            .map(m => {
              const t1 = teamName(tournament.teams, m.team1)
              const t2 = teamName(tournament.teams, m.team2)
              return (
                <div
                  key={m.id}
                  onClick={() => m.played && onMatchClick && onMatchClick(m)}
                  className={`flex items-center px-3.5 py-2.5 rounded-xl mb-1.5 border ${
                    m.played
                      ? 'bg-surface border-line cursor-pointer hover:bg-alt transition-colors'
                      : 'bg-gradient-to-r from-surface to-alt border-accent/40'
                  }`}
                >
                  <span className={`flex-1 text-[13px] ${m.played && m.winner === m.team1 ? 'font-bold text-accent' : 'font-medium text-text'}`}>
                    {t1}
                  </span>
                  <span className="px-3 text-[14px] font-bold text-text">
                    {m.played ? `${m.score1} – ${m.score2}` : 'VS'}
                  </span>
                  <span className={`flex-1 text-right text-[13px] ${m.played && m.winner === m.team2 ? 'font-bold text-accent' : 'font-medium text-text'}`}>
                    {t2}
                  </span>
                </div>
              )
            })}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: STANDINGS
// — Groups first, then knockout (user's requested modification)
// ═══════════════════════════════════════════════════════════════════════════════
function StandingsTab({ tournament, onGenerateKnockout, onMatchClick, canManage }) {
  const { phase, groups, teams, matches } = tournament
  const hasGroups = (groups || []).length > 0

  const allGroupMatchesPlayed = hasGroups && groups.every(g =>
    g.matches.every(m => m.played)
  )

  if (phase === 'setup' && !hasGroups && !(matches || []).length) {
    return (
      <div className="px-4 text-[13px] text-dim text-center py-10">
        Tournament hasn't started yet
      </div>
    )
  }

  // Free-play / round-robin (no groups)
  if (!hasGroups) {
    const rows = calcOverallStandings(teams, matches)
    return (
      <div className="px-4">
        <StandingsTable rows={rows} />
      </div>
    )
  }

  // ── Group stage → show each group, then knockout below ────────────────────
  return (
    <div className="px-4">
      {groups.map(group => (
        <div key={group.id} className="mb-4">
          <div className="text-[12px] font-bold text-accent tracking-wide uppercase mb-2.5">
            {group.name}
          </div>
          <StandingsTable rows={calcGroupStandings(group, teams)} />
        </div>
      ))}

      {/* Knockout results appear once the group stage is over */}
      {(phase === 'knockout' || phase === 'completed') && (
        <KnockoutResults tournament={tournament} onMatchClick={onMatchClick} />
      )}

      {/* Advance button — only for admins */}
      {phase === 'group' && canManage && (
        <div className="mt-2 mb-6">
          <button
            onClick={onGenerateKnockout}
            disabled={!allGroupMatchesPlayed}
            className={`w-full min-h-[44px] rounded-xl text-[14px] font-bold text-white border-0 transition-all ${
              allGroupMatchesPlayed ? 'bg-free cursor-pointer hover:opacity-90' : 'bg-surface border border-line text-dim cursor-not-allowed'
            }`}
          >
            {allGroupMatchesPlayed ? "⚡ Generate Knockout" : "⏳ Complete all group matches first"}
          </button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: MATCHES
// ═══════════════════════════════════════════════════════════════════════════════
function MatchesTab({ tournament, onStartMatch, onMatchClick, canScore }) {
  const all       = getAllMatches(tournament)
  const pending   = all.filter(m => !m.played && m.team1 && m.team2)
  const completed = all.filter(m => m.played)
  const tName     = id => teamName(tournament.teams, id)

  return (
    <div className="px-4">
      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">
            Pending ({pending.length})
          </div>
          {pending.map(m => (
            <div
              key={m.id}
              className="bg-gradient-to-r from-surface to-alt rounded-xl p-3.5 mb-2.5 border border-accent/40"
            >
              <div className="text-[10px] font-bold text-accent uppercase tracking-wide mb-2.5">
                {m.label} · UP NEXT
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 text-center">
                  <div className="text-[13px] font-bold text-text">{tName(m.team1)}</div>
                </div>
                <div className="text-[12px] font-bold text-dim px-3 py-1 bg-bg rounded-lg">VS</div>
                <div className="flex-1 text-center">
                  <div className="text-[13px] font-bold text-text">{tName(m.team2)}</div>
                </div>
              </div>
              {canScore && (
                <button
                  onClick={() => onStartMatch(m)}
                  className="w-full py-2.5 rounded-lg text-[12px] font-bold text-white bg-accent border-0 cursor-pointer"
                >
                  Start Match
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <div className="text-[11px] font-bold text-success uppercase tracking-wide mb-2">
            Completed ({completed.length})
          </div>
          <div className="flex flex-col gap-2">
            {completed.map(m => (
              <div 
                key={m.id} 
                onClick={() => onMatchClick && onMatchClick(m)}
                className="bg-surface rounded-xl px-3.5 py-3 border border-line cursor-pointer hover:bg-alt transition-colors"
              >
                <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-1.5">
                  {m.label}
                </div>
                <div className="flex items-center">
                  <span className={`flex-1 text-[13px] ${m.winner === m.team1 ? 'font-bold text-accent' : 'font-medium text-dim'}`}>
                    {tName(m.team1)}
                  </span>
                  <div className="flex items-center gap-1 px-3">
                    <span className={`text-[16px] font-bold ${m.winner === m.team1 ? 'text-accent' : 'text-text'}`}>{m.score1}</span>
                    <span className="text-[10px] text-dim">–</span>
                    <span className={`text-[16px] font-bold ${m.winner === m.team2 ? 'text-accent' : 'text-text'}`}>{m.score2}</span>
                  </div>
                  <span className={`flex-1 text-right text-[13px] ${m.winner === m.team2 ? 'font-bold text-accent' : 'font-medium text-dim'}`}>
                    {tName(m.team2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!pending.length && !completed.length && (
        <div className="text-[13px] text-dim text-center py-10">No matches yet</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: TEAMS
// ═══════════════════════════════════════════════════════════════════════════════
function TeamsTab({ tournament, leaguePlayers }) {
  const { teams } = tournament

  if (!teams || teams.length === 0) {
    return <div className="px-4 text-[13px] text-dim text-center py-10">No teams yet</div>
  }

  return (
    <div className="px-4">
      <div className="flex flex-col gap-3">
        {teams.map(team => (
          <div key={team.id} className="bg-surface rounded-xl p-3.5 border border-line">
            <div className="text-[13px] font-bold text-text mb-2.5">{team.name}</div>
            <div className="flex flex-wrap gap-2">
              {(team.players || []).map(pid => {
                const player = leaguePlayers.find(p => p.id === pid)
                return player ? (
                  <div key={pid} className="flex items-center gap-1.5 text-[11px] bg-alt text-text rounded-md px-2.5 py-1.5 font-medium border border-line/50">
                    <div className="w-4 h-4 rounded-sm bg-bg flex items-center justify-center text-[9px] font-bold text-dim">
                      {player.name[0]}
                    </div>
                    {player.name}
                  </div>
                ) : null
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function TournamentDetail() {
  const navigate     = useNavigate()
  const { id, tid }  = useParams()
  const [activeTab, setActiveTab] = useState('standings')

  const { league, loading, refetch } = useLeague(id)
  const { canScore, canManage }      = useLeagueRole(id)
  const tournament    = league?.tournaments?.find(t => t.id === tid) || null
  const leaguePlayers = league?.players || []

  // ── Match Start Modal State ──
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [showScoreForm, setShowScoreForm] = useState(false)
  const [manualScore1, setManualScore1]   = useState('')
  const [manualScore2, setManualScore2]   = useState('')

  // ── Match Stats Overlay State ──
  const [selectedStatsMatch, setSelectedStatsMatch] = useState(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-2">
        <div className="text-[18px] font-bold">Tournament not found</div>
        <button
          onClick={() => navigate(`/league/${id}`)}
          className="text-[13px] text-accent font-semibold bg-transparent border-0 cursor-pointer"
        >
          ← Back to league
        </button>
      </div>
    )
  }

  // ── Handlers ──
  const handleStartMatchClick = (match) => {
    setSelectedMatch(match)
    setShowScoreForm(false)
    setManualScore1('')
    setManualScore2('')
  }

  const handleCloseModal = () => {
    setSelectedMatch(null)
    setShowScoreForm(false)
  }

  const handlePlayLive = () => {
    navigate(`/league/${id}/tournament/${tid}/match/${selectedMatch.id}`)
  }

  const handleSaveManualScore = async () => {
    const s1 = parseInt(manualScore1, 10)
    const s2 = parseInt(manualScore2, 10)

    if (isNaN(s1) || isNaN(s2) || s1 === s2) return

    const winnerId = s1 > s2 ? selectedMatch.team1 : selectedMatch.team2

    try {
      await supabaseSaveMatchResult(selectedMatch.id, s1, s2, winnerId)
      if (tournament.knockout) {
        await advanceKnockoutAfterMatch(selectedMatch.id, winnerId, tournament.knockout)
      }
      handleCloseModal()
      refetch()
    } catch (err) {
      console.error('Failed to save match result:', err)
    }
  }

  const handleGenerateKnockout = async () => {
    const knockout = buildKnockout(tournament.groups)

    try {
      await saveKnockoutRounds(tid, knockout.rounds)
      await updateTournamentPhase(tid, 'knockout')
      refetch()
    } catch (err) {
      console.error('Failed to generate knockout:', err)
    }
  }

  const handleMatchClick = (match) => {
    setSelectedStatsMatch(match)
  }

  // Mock translation function for GameStats
  const t = (key) => {
    const dict = {
      winner: 'Winner',
      totalPoints: 'Total Points',
      totalLabel: 'pts',
      streaks: 'Streaks',
      maxStreak: 'Max streak',
      howWonTitle: 'How points were won',
      comparison: 'vs',
      serveEff: 'Serve Efficiency',
      whileServing: 'serving',
      whileReceiving: 'receiving',
      history: 'Match History',
      newMatch: 'New Match'
    }
    return dict[key] || key
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">

      {/* ── Match Stats Full-screen Overlay ── */}
      {selectedStatsMatch && (
        <div className="absolute inset-0 z-[100] bg-bg flex flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5 flex-shrink-0 bg-surface border-b border-line">
            <button
              onClick={() => setSelectedStatsMatch(null)}
              className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text flex-shrink-0"
            >
              <BackIcon />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-bold text-text leading-tight truncate">
                Match Details
              </div>
              <div className="text-[11px] text-dim">{selectedStatsMatch.label || 'Result'}</div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 relative">
            {selectedStatsMatch.log && selectedStatsMatch.log.length > 0 ? (
              <GameStats
                winner={selectedStatsMatch.winner}
                team1Id={selectedStatsMatch.team1}
                team2Id={selectedStatsMatch.team2}
                sets={selectedStatsMatch.sets || [{ s1: selectedStatsMatch.score1, s2: selectedStatsMatch.score2, winner: selectedStatsMatch.winner }]}
                t1Sets={selectedStatsMatch.sets ? selectedStatsMatch.sets.filter(s => s.winner === 1).length : (selectedStatsMatch.winner === selectedStatsMatch.team1 ? 1 : 0)}
                t2Sets={selectedStatsMatch.sets ? selectedStatsMatch.sets.filter(s => s.winner === 2).length : (selectedStatsMatch.winner === selectedStatsMatch.team2 ? 1 : 0)}
                log={selectedStatsMatch.log}
                teams={tournament.teams}
                players={leaguePlayers}
                t={t}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full gap-6">
                <div className="text-[48px]">📋</div>
                <div>
                  <div className="text-[18px] font-bold text-text mb-1">Manual Score Result</div>
                  <div className="text-[13px] text-dim">No detailed stats were recorded for this match.</div>
                </div>
                
                <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-[280px]">
                  <div className="flex justify-between items-center mb-4">
                    <span className={`text-[15px] ${selectedStatsMatch.winner === selectedStatsMatch.team1 ? 'font-bold text-accent' : 'font-medium text-dim'}`}>
                      {teamName(tournament.teams, selectedStatsMatch.team1)}
                    </span>
                    <span className={`text-[24px] font-black ${selectedStatsMatch.winner === selectedStatsMatch.team1 ? 'text-accent' : 'text-text'}`}>
                      {selectedStatsMatch.score1}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[15px] ${selectedStatsMatch.winner === selectedStatsMatch.team2 ? 'font-bold text-accent' : 'font-medium text-dim'}`}>
                      {teamName(tournament.teams, selectedStatsMatch.team2)}
                    </span>
                    <span className={`text-[24px] font-black ${selectedStatsMatch.winner === selectedStatsMatch.team2 ? 'text-accent' : 'text-text'}`}>
                      {selectedStatsMatch.score2}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedStatsMatch(null)}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-alt text-[13px] font-bold text-text border-0 cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5 flex-shrink-0">
        <button
          onClick={() => navigate(`/league/${id}`)}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text flex-shrink-0"
        >
          <BackIcon />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-bold text-text leading-tight truncate">
            {tournament.name}
          </div>
          <div className="text-[11px] text-dim">{league?.name}</div>
        </div>
        <StatusBadge tournament={tournament} />
      </div>

      {/* ── Pill tabs ── */}
      <PillTabs
        items={[
          { id: 'standings', label: 'Standings' },
          { id: 'matches',   label: 'Matches'   },
          { id: 'teams',     label: 'Teams'     },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* ── Tab content ── */}
      <main className="flex-1 overflow-y-auto pb-6 relative">
        {activeTab === 'standings' && (
          <StandingsTab
            tournament={tournament}
            onGenerateKnockout={handleGenerateKnockout}
            onMatchClick={handleMatchClick}
            canManage={canManage}
          />
        )}
        {activeTab === 'matches' && (
          <MatchesTab
            tournament={tournament}
            onStartMatch={handleStartMatchClick}
            onMatchClick={handleMatchClick}
            canScore={canScore}
          />
        )}
        {activeTab === 'teams' && (
          <TeamsTab tournament={tournament} leaguePlayers={leaguePlayers} />
        )}
      </main>

      {/* ── Start Match Modal Overlay ── */}
      {selectedMatch && (
        <div className="absolute inset-0 z-50 bg-bg/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-[20px] w-full max-w-[320px] border border-line shadow-2xl overflow-hidden relative">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-line bg-alt">
              <span className="text-[13px] font-bold text-dim uppercase tracking-wide">
                {showScoreForm ? 'Enter Final Score' : 'Start Match'}
              </span>
              <button 
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg bg-bg flex items-center justify-center border-0 cursor-pointer text-text hover:text-error transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5">
              <div className="flex justify-between items-center mb-6">
                <span className="flex-1 text-center text-[14px] font-bold text-text truncate">
                  {teamName(tournament.teams, selectedMatch.team1)}
                </span>
                <span className="text-[11px] font-bold text-dim px-3">VS</span>
                <span className="flex-1 text-center text-[14px] font-bold text-text truncate">
                  {teamName(tournament.teams, selectedMatch.team2)}
                </span>
              </div>

              {!showScoreForm ? (
                // Option Selection
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handlePlayLive}
                    className="w-full py-3.5 rounded-xl bg-accent text-white font-bold text-[14px] flex items-center justify-center gap-2 border-0 cursor-pointer shadow-[0_4px_12px_rgba(var(--c-accent),0.25)] hover:opacity-90 transition-all"
                  >
                    <span className="text-[18px]">🏐</span> Play Live
                  </button>
                  
                  <button 
                    onClick={() => setShowScoreForm(true)}
                    className="w-full py-3.5 rounded-xl bg-alt text-text font-semibold text-[14px] flex items-center justify-center gap-2 border border-line cursor-pointer hover:bg-bg transition-colors"
                  >
                    <span className="text-[18px]">✏️</span> Enter Score
                  </button>
                </div>
              ) : (
                // Score Entry Form
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      value={manualScore1}
                      onChange={e => setManualScore1(e.target.value)}
                      placeholder="0"
                      className="flex-1 text-center text-[24px] font-bold bg-bg border border-line rounded-xl py-3 focus:border-accent focus:outline-none"
                    />
                    <span className="text-[24px] font-bold text-dim">-</span>
                    <input 
                      type="number"
                      value={manualScore2}
                      onChange={e => setManualScore2(e.target.value)}
                      placeholder="0"
                      className="flex-1 text-center text-[24px] font-bold bg-bg border border-line rounded-xl py-3 focus:border-accent focus:outline-none"
                    />
                  </div>
                  
                  <div className="text-[11px] text-center text-dim mt-1">
                    {(manualScore1 !== '' && manualScore1 === manualScore2) 
                      ? <span className="text-error font-bold">Matches cannot end in a tie.</span>
                      : 'Enter the final score.'}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => setShowScoreForm(false)}
                      className="flex-1 py-3 rounded-xl bg-alt text-text font-semibold text-[13px] border border-line cursor-pointer"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleSaveManualScore}
                      disabled={!manualScore1 || !manualScore2 || parseInt(manualScore1) === parseInt(manualScore2)}
                      className="flex-1 py-3 rounded-xl bg-accent text-white font-bold text-[13px] border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Result
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
