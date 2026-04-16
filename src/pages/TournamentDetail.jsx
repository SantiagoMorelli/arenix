import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocalStorage } from '../hooks/useLocalStorage'

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
function KnockoutResults({ tournament }) {
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
                  className={`flex items-center px-3.5 py-2.5 rounded-xl mb-1.5 border ${
                    m.played
                      ? 'bg-surface border-line'
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
function StandingsTab({ tournament }) {
  const { phase, groups, teams, matches } = tournament
  const hasGroups = (groups || []).length > 0

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
        <KnockoutResults tournament={tournament} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: MATCHES
// ═══════════════════════════════════════════════════════════════════════════════
function MatchesTab({ tournament, onStartMatch }) {
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
              <button
                onClick={onStartMatch}
                className="w-full py-2.5 rounded-lg text-[12px] font-bold text-white bg-accent border-0 cursor-pointer"
              >
                Start Match
              </button>
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
              <div key={m.id} className="bg-surface rounded-xl px-3.5 py-3 border border-line">
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
// TAB: PLAYERS
// ═══════════════════════════════════════════════════════════════════════════════
function PlayersTab({ tournament, leaguePlayers }) {
  const playedMatches = getAllMatches(tournament).filter(m => m.played)

  // Aggregate wins/losses per player id from match results
  const statsMap = {}
  playedMatches.forEach(m => {
    const process = (teamId, won) => {
      const team = tournament.teams.find(t => t.id === teamId)
      ;(team?.players || []).forEach(pid => {
        if (!statsMap[pid]) statsMap[pid] = { wins: 0, losses: 0 }
        if (won) statsMap[pid].wins++; else statsMap[pid].losses++
      })
    }
    process(m.team1, m.winner === m.team1)
    process(m.team2, m.winner === m.team2)
  })

  const rows = Object.entries(statsMap)
    .map(([pid, s]) => ({
      pid,
      name: leaguePlayers.find(p => p.id === pid)?.name || pid,
      wins: s.wins,
      losses: s.losses,
      pts: s.wins,
    }))
    .sort((a, b) => b.pts - a.pts || b.wins - a.wins)

  if (!rows.length) {
    return <div className="px-4 text-[13px] text-dim text-center py-10">No match data yet</div>
  }

  return (
    <div className="px-4">
      <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
        {/* Header */}
        <div className="flex items-center px-3.5 py-2 border-b border-line bg-alt">
          <span className="flex-1 text-[10px] font-bold text-dim">PLAYER</span>
          <span className="w-7 text-center text-[10px] font-bold text-dim">W</span>
          <span className="w-7 text-center text-[10px] font-bold text-dim">L</span>
          <span className="w-9 text-center text-[10px] font-bold text-dim">PTS</span>
        </div>

        {rows.map((row, i) => (
          <div
            key={row.pid}
            className={`flex items-center px-3.5 py-2.5 ${i < rows.length - 1 ? 'border-b border-line' : ''}`}
          >
            <span className="flex-1 text-[13px] font-medium text-text truncate">{row.name}</span>
            <span className="w-7 text-center text-[13px] font-semibold text-success">{row.wins}</span>
            <span className="w-7 text-center text-[13px] font-semibold text-error">{row.losses}</span>
            <span className="w-9 text-center text-[13px] font-bold text-accent">{row.pts}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-dim text-center leading-relaxed">
        Player stats feed back to league rankings when the tournament ends.
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

  const [leagues] = useLocalStorage('arenix_leagues', [])
  const league        = leagues.find(l => l.id === id) || leagues[0] || null
  const tournament    = league?.tournaments?.find(t => t.id === tid) || null
  const leaguePlayers = league?.players || []

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

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">

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
          { id: 'players',   label: 'Players'   },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* ── Tab content ── */}
      <main className="flex-1 overflow-y-auto pb-6">
        {activeTab === 'standings' && (
          <StandingsTab tournament={tournament} />
        )}
        {activeTab === 'matches' && (
          <MatchesTab
            tournament={tournament}
            onStartMatch={() => navigate('/legacy')}
          />
        )}
        {activeTab === 'players' && (
          <PlayersTab tournament={tournament} leaguePlayers={leaguePlayers} />
        )}
      </main>

    </div>
  )
}
