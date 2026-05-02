import { useMemo, useState } from 'react'
import { formatDuration, getMatchDuration, getLongestRally } from '../lib/utils'
import { calcOverallStandings, calcPlayerStandings } from '../lib/standings'
import { PillTabs } from './ui-new'
import TieBreakerControls from './standings/TieBreakerControls'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map free-play games → generic match shape used by stats helpers */
function getAllSessionMatches(session) {
  return (session.games || [])
    .filter(g => g.played)
    .map((g, i) => {
      const useSets = (g.setsPerMatch || 1) > 1
      const won1 = (g.sets || []).filter(s => s.winner === 1).length
      const won2 = (g.sets || []).filter(s => s.winner === 2).length
      return {
        id:     g.id,
        team1:  g.team1Id,
        team2:  g.team2Id,
        score1: useSets ? won1 : (g.score1 ?? 0),
        score2: useSets ? won2 : (g.score2 ?? 0),
        winner: g.winnerId,
        played: true,
        log:    g.log  || [],
        sets:   g.sets || [],
        label:  `Match ${i + 1}`,
      }
    })
}

function computePlayerStats(allMatches) {
  const stats = {}
  for (const m of allMatches) {
    if (!m.played || !m.log?.length) continue
    for (const entry of m.log) {
      if (entry.scoringPlayerId) {
        const pid = entry.scoringPlayerId
        if (!stats[pid]) stats[pid] = { points: 0, aces: 0, spikes: 0, blocks: 0, tips: 0, errors: 0 }
        stats[pid].points++
        if (entry.pointType === 'ace')   stats[pid].aces++
        if (entry.pointType === 'spike') stats[pid].spikes++
        if (entry.pointType === 'block') stats[pid].blocks++
        if (entry.pointType === 'tip')   stats[pid].tips++
      }
      if (entry.errorPlayerId) {
        const pid = entry.errorPlayerId
        if (!stats[pid]) stats[pid] = { points: 0, aces: 0, spikes: 0, blocks: 0, tips: 0, errors: 0 }
        stats[pid].errors++
      }
    }
  }
  return stats
}

function computeMatchRecords(allMatches) {
  const played = allMatches.filter(m => m.played && m.team1 && m.team2)
  if (!played.length) return null

  let mostDominant = null, dominance = -1
  let highestScoring = null, highScore = -1
  let longestStreak = null, streak = 0
  let biggestComeback = null, maxComeback = 0

  for (const m of played) {
    const diff  = Math.abs(m.score1 - m.score2)
    const total = m.score1 + m.score2

    if (diff > dominance) { dominance = diff; mostDominant = m }
    if (total > highScore) { highScore = total; highestScoring = m }

    if (m.log?.length) {
      for (const entry of m.log) {
        if ((entry.streak || 0) > streak) {
          streak = entry.streak
          longestStreak = { match: m, streak: entry.streak, team: entry.team }
        }
      }

      const setNums = [...new Set(m.log.map(e => e.setNum))]
      for (const sn of setNums) {
        const entries = m.log.filter(e => e.setNum === sn).sort((a, b) => a.pointNum - b.pointNum)
        if (!entries.length) continue
        const last = entries[entries.length - 1]
        const setWinner = last.t1 > last.t2 ? 1 : 2

        let maxDeficit = 0
        for (const e of entries) {
          const deficit = setWinner === 1 ? e.t2 - e.t1 : e.t1 - e.t2
          if (deficit > maxDeficit) maxDeficit = deficit
        }
        if (maxDeficit > maxComeback) {
          maxComeback = maxDeficit
          biggestComeback = { match: m, team: setWinner === 1 ? m.team1 : m.team2, deficit: maxDeficit }
        }
      }
    }
  }

  let longestGame = null, longestGameDuration = 0
  let longestRallyRecord = null, longestRallyDuration = 0

  for (const m of played) {
    if (!m.log?.length) continue
    const dur = getMatchDuration(m.log)
    if (dur != null && dur > longestGameDuration) {
      longestGameDuration = dur
      longestGame = { match: m, duration: dur }
    }
    const rally = getLongestRally(m.log)
    if (rally != null && rally > longestRallyDuration) {
      longestRallyDuration = rally
      longestRallyRecord = { match: m, duration: rally }
    }
  }

  return { mostDominant, dominance, highestScoring, highScore, longestStreak, biggestComeback, longestGame, longestRally: longestRallyRecord }
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div className="text-[11px] font-bold text-dim uppercase tracking-widest mb-3">
      {children}
    </div>
  )
}

// ─── Podium (derived from standings, no bracket) ──────────────────────────────
function Podium({ rows, session }) {
  const getTeam = id => session.teams.find(t => t.id === id)
  const getNames = id => {
    const t = getTeam(id)
    return (t?.playerIds || [])
      .map(pid => session.players.find(p => p.id === pid)?.name)
      .filter(Boolean)
      .join(' & ')
  }

  if (!rows.length) {
    return (
      <div className="px-4 text-[13px] text-dim text-center py-4">
        No teams to display
      </div>
    )
  }

  const champion = rows[0]

  const slots = [
    rows[1] ? { rank: 2, id: rows[1].id, medal: '🥈', height: 'h-16', label: 'Runner-up' } : null,
    { rank: 1, id: rows[0].id, medal: '🥇', height: 'h-24', label: 'Champion' },
    rows[2] ? { rank: 3, id: rows[2].id, medal: '🥉', height: 'h-10', label: '3rd Place' } : null,
  ].filter(Boolean)

  return (
    <div className="px-4">
      {/* Champion highlight */}
      <div className="bg-gradient-to-b from-free/20 to-transparent rounded-2xl p-5 mb-4 text-center border border-free/30">
        <div className="text-[40px] mb-1">🏆</div>
        <div className="text-[22px] font-black text-free tracking-wide">{champion.name || '?'}</div>
        <div className="text-[13px] text-dim mt-1">{getNames(champion.id)}</div>
        <div className="text-[11px] font-bold text-free/60 uppercase tracking-widest mt-2">Champion</div>
      </div>

      {/* Podium visual */}
      {slots.length > 1 && (
        <div className="flex items-end justify-center gap-3 mb-2">
          {slots.map(slot => (
            <div key={slot.id} className="flex flex-col items-center flex-1 max-w-[110px]">
              <div className="text-[22px] mb-1">{slot.medal}</div>
              <div className="text-[12px] font-bold text-text text-center leading-tight mb-1.5 px-1">
                {getTeam(slot.id)?.name || '?'}
              </div>
              <div className="text-[10px] text-dim text-center mb-1.5 px-1 leading-tight">
                {getNames(slot.id)}
              </div>
              <div className={`w-full ${slot.height} rounded-t-lg flex items-center justify-center ${
                slot.rank === 1 ? 'bg-free/30 border-t-2 border-free' :
                slot.rank === 2 ? 'bg-surface border-t border-line' :
                'bg-alt border-t border-line'
              }`}>
                <span className={`text-[14px] font-black ${slot.rank === 1 ? 'text-free' : 'text-dim'}`}>
                  #{slot.rank}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Award card ───────────────────────────────────────────────────────────────
function AwardCard({ icon, title, playerName, value, valueLabel, funny = false }) {
  return (
    <div className={`rounded-2xl p-4 border flex flex-col gap-1.5 ${
      funny ? 'bg-error/10 border-error/30' : 'bg-surface border-line'
    }`}>
      <div className="text-[22px]">{icon}</div>
      <div className={`text-[10px] font-bold uppercase tracking-widest ${funny ? 'text-error' : 'text-free'}`}>
        {title}
      </div>
      <div className="text-[14px] font-bold text-text leading-tight">{playerName}</div>
      <div className={`text-[12px] font-semibold ${funny ? 'text-error/70' : 'text-dim'}`}>
        {value} {valueLabel}
      </div>
    </div>
  )
}

// ─── Awards section ───────────────────────────────────────────────────────────
function Awards({ playerStats, session }) {
  const playerName = pid => session.players.find(p => p.id === pid)?.name || 'Unknown'

  const best = (key) => {
    const entries = Object.entries(playerStats)
    if (!entries.length) return null
    const [pid, val] = entries.reduce((b, cur) => cur[1][key] > b[1][key] ? cur : b)
    return val[key] > 0 ? { pid, value: val[key] } : null
  }

  const topScorer = best('points')
  const aceKing   = best('aces')
  const spikeMach = best('spikes')
  const blockMast = best('blocks')
  const glassCan  = best('errors')

  const awards = [
    topScorer && { icon: '🏆', title: 'Top Scorer',     pid: topScorer.pid, value: topScorer.value, label: 'pts',    funny: false },
    aceKing   && { icon: '🎯', title: 'Ace King',       pid: aceKing.pid,   value: aceKing.value,   label: 'aces',   funny: false },
    spikeMach && { icon: '💥', title: 'Spike Machine',  pid: spikeMach.pid, value: spikeMach.value, label: 'spikes', funny: false },
    blockMast && { icon: '🛡️', title: 'Block Master',   pid: blockMast.pid, value: blockMast.value, label: 'blocks', funny: false },
    glassCan  && { icon: '💣', title: 'Glass Cannon',   pid: glassCan.pid,  value: glassCan.value,  label: 'errors', funny: true  },
  ].filter(Boolean)

  if (!awards.length) {
    return (
      <div className="px-4 text-[13px] text-dim text-center py-4">
        No live match stats recorded
      </div>
    )
  }

  return (
    <div className="px-4">
      <div className="grid grid-cols-2 gap-3">
        {awards.map(a => (
          <AwardCard
            key={a.title}
            icon={a.icon}
            title={a.title}
            playerName={playerName(a.pid)}
            value={a.value}
            valueLabel={a.label}
            funny={a.funny}
          />
        ))}
      </div>
      <div className="text-[11px] text-dim text-center mt-3">
        Awards based on live matches only
      </div>
    </div>
  )
}

// ─── Final standings table ─────────────────────────────────────────────────────
function StandingsSection({ rows, tbOptions }) {
  if (!rows.length) {
    return (
      <div className="px-4 text-[13px] text-dim text-center py-4">
        No matches played yet
      </div>
    )
  }

  return (
    <div className="px-4">
      <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
        <div className="flex items-center px-3.5 py-2 border-b border-line bg-alt justify-between">
          <div className="flex items-center gap-2">
            <span className="w-[20px] text-[10px] font-bold text-dim">#</span>
            <span className="text-[10px] font-bold text-dim">TEAM</span>
          </div>
          <div className="flex items-center">
            {tbOptions?.tieBreakerMode !== 'id' && (
              <span className="mr-3 text-[10px] font-bold text-dim uppercase">TB: {tbOptions?.tieBreakerMode}</span>
            )}
            <span className="w-6 text-center text-[10px] font-bold text-dim">W</span>
            <span className="w-6 text-center text-[10px] font-bold text-dim">L</span>
            <span className="w-7 text-center text-[10px] font-bold text-dim">PF</span>
            <span className="w-7 text-center text-[10px] font-bold text-dim">PA</span>
            <span className="w-7 text-center text-[10px] font-bold text-dim">PD</span>
            <span className="w-8 text-center text-[10px] font-bold text-dim">PTS</span>
          </div>
        </div>
        {rows.map((row, i) => (
          <div
            key={row.id}
            className={`flex items-center px-3.5 py-2.5 ${i < rows.length - 1 ? 'border-b border-line' : ''} ${i === 0 ? 'bg-free/15' : ''}`}
          >
            <span className={`w-[20px] text-[13px] font-bold ${i === 0 ? 'text-free' : 'text-dim'}`}>{i + 1}</span>
            <div className="flex-1 overflow-hidden">
              <div className="text-[13px] font-semibold text-text truncate">{row.name}</div>
              {row.playerNames && <div className="text-[10px] text-dim mt-0.5 truncate">{row.playerNames}</div>}
            </div>
            <span className="w-6 text-center text-[13px] font-semibold text-success">{row.wins}</span>
            <span className="w-6 text-center text-[13px] font-semibold text-error">{row.losses}</span>
            <span className="w-7 text-center text-[13px] font-semibold text-text">{row.pf}</span>
            <span className="w-7 text-center text-[13px] font-semibold text-text">{row.pa}</span>
            <span className={`w-7 text-center text-[13px] font-semibold ${row.pd > 0 ? 'text-success' : row.pd < 0 ? 'text-error' : 'text-text'}`}>
              {row.pd > 0 ? '+' + row.pd : row.pd}
            </span>
            <span className="w-8 text-center text-[13px] font-bold text-free">{row.pts}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Record card ──────────────────────────────────────────────────────────────
function RecordCard({ icon, title, line1, line2 }) {
  if (!line1) return null
  return (
    <div className="bg-surface rounded-2xl p-4 border border-line">
      <div className="text-[20px] mb-1.5">{icon}</div>
      <div className="text-[10px] font-bold text-free uppercase tracking-widest mb-1">{title}</div>
      <div className="text-[13px] font-bold text-text leading-snug">{line1}</div>
      {line2 && <div className="text-[11px] text-dim mt-0.5">{line2}</div>}
    </div>
  )
}

// ─── Match records section ─────────────────────────────────────────────────────
function MatchRecords({ records, session }) {
  if (!records) {
    return (
      <div className="px-4 text-[13px] text-dim text-center py-4">
        No matches played yet
      </div>
    )
  }

  const tName = id => session.teams.find(t => t.id === id)?.name || '?'
  const { mostDominant, dominance, highestScoring, highScore, longestStreak, biggestComeback, longestGame, longestRally } = records

  return (
    <div className="px-4 grid grid-cols-2 gap-3">
      <RecordCard
        icon="💪"
        title="Most Dominant"
        line1={mostDominant ? `${tName(mostDominant.winner)} wins` : null}
        line2={mostDominant ? `${mostDominant.score1}–${mostDominant.score2} (${dominance} pt gap)` : null}
      />
      <RecordCard
        icon="🔥"
        title="Highest Scoring"
        line1={highestScoring ? `${tName(highestScoring.team1)} vs ${tName(highestScoring.team2)}` : null}
        line2={highestScoring ? `${highestScoring.score1}–${highestScoring.score2} (${highScore} total pts)` : null}
      />
      {longestStreak && (
        <RecordCard
          icon="⚡"
          title="Longest Streak"
          line1={`${longestStreak.streak} in a row`}
          line2={`${tName(longestStreak.team === 1 ? longestStreak.match.team1 : longestStreak.match.team2)} · ${longestStreak.match.label}`}
        />
      )}
      {biggestComeback && (
        <RecordCard
          icon="🔄"
          title="Best Comeback"
          line1={`${tName(biggestComeback.team)} came back`}
          line2={`Down ${biggestComeback.deficit} pts · ${biggestComeback.match.label}`}
        />
      )}
      {longestGame && (
        <RecordCard
          icon="⏱️"
          title="Longest Game"
          line1={`${tName(longestGame.match.team1)} vs ${tName(longestGame.match.team2)}`}
          line2={`${formatDuration(longestGame.duration)} · ${longestGame.match.label}`}
        />
      )}
      {longestRally && (
        <RecordCard
          icon="🏐"
          title="Longest Rally"
          line1={formatDuration(longestRally.duration)}
          line2={`${tName(longestRally.match.team1)} vs ${tName(longestRally.match.team2)} · ${longestRally.match.label}`}
        />
      )}
    </div>
  )
}

// ─── Player Podium ────────────────────────────────────────────────────────────
function PlayerPodium({ ranking }) {
  if (!ranking.length) {
    return (
      <div className="px-4 text-[13px] text-dim text-center py-4">
        No players to display
      </div>
    )
  }

  const champion = ranking[0]
  const fmtWL = r => `${r.wins}W – ${r.losses}L · ${Math.round(r.winPct * 100)}%`

  const slots = [
    ranking[1] ? { rank: 2, r: ranking[1], medal: '🥈', height: 'h-16', label: 'Runner-up' } : null,
    { rank: 1, r: ranking[0], medal: '🥇', height: 'h-24', label: 'Champion' },
    ranking[2] ? { rank: 3, r: ranking[2], medal: '🥉', height: 'h-10', label: '3rd Place' } : null,
  ].filter(Boolean)

  return (
    <div className="px-4">
      {/* Champion highlight */}
      <div className="bg-gradient-to-b from-free/20 to-transparent rounded-2xl p-5 mb-4 text-center border border-free/30">
        <div className="text-[40px] mb-1">🏆</div>
        <div className="text-[22px] font-black text-free tracking-wide">{champion.name}</div>
        <div className="text-[13px] text-dim mt-1">{fmtWL(champion)}</div>
        {champion.points > 0 && (
          <div className="text-[11px] text-dim mt-0.5">{champion.points} pts scored</div>
        )}
        <div className="text-[11px] font-bold text-free/60 uppercase tracking-widest mt-2">Player of the Session</div>
      </div>

      {/* Podium steps */}
      {slots.length > 1 && (
        <div className="flex items-end justify-center gap-3 mb-2">
          {slots.map(slot => (
            <div key={slot.r.id} className="flex flex-col items-center flex-1 max-w-[110px]">
              <div className="text-[22px] mb-1">{slot.medal}</div>
              <div className="text-[12px] font-bold text-text text-center leading-tight mb-1.5 px-1">
                {slot.r.name}
              </div>
              <div className="text-[10px] text-dim text-center mb-1.5 px-1 leading-tight">
                {fmtWL(slot.r)}
              </div>
              <div className={`w-full ${slot.height} rounded-t-lg flex items-center justify-center ${
                slot.rank === 1 ? 'bg-free/30 border-t-2 border-free' :
                slot.rank === 2 ? 'bg-surface border-t border-line' :
                'bg-alt border-t border-line'
              }`}>
                <span className={`text-[14px] font-black ${slot.rank === 1 ? 'text-free' : 'text-dim'}`}>
                  #{slot.rank}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Player Rankings table ────────────────────────────────────────────────────
function PlayerRankingsSection({ ranking }) {
  if (!ranking.length) {
    return (
      <div className="px-4 text-[13px] text-dim text-center py-4">
        No player data
      </div>
    )
  }

  return (
    <div className="px-4">
      <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
        {/* Header */}
        <div className="flex items-center border-b border-line bg-alt">
          {/* Fixed left */}
          <div className="flex items-center shrink-0 pl-3.5 pr-2 py-2">
            <span className="w-[20px] text-[10px] font-bold text-dim">#</span>
            <span className="w-[110px] text-[10px] font-bold text-dim">PLAYER</span>
          </div>
          {/* Scrollable right */}
          <div className="overflow-x-auto flex-1">
            <div className="flex items-center py-2 pr-3.5 min-w-max">
              <span className="w-6 text-center text-[10px] font-bold text-dim">W</span>
              <span className="w-6 text-center text-[10px] font-bold text-dim">L</span>
              <span className="w-10 text-center text-[10px] font-bold text-dim">WIN%</span>
              <span className="w-7 text-center text-[10px] font-bold text-dim">Pts</span>
              <span className="w-6 text-center text-[10px] font-bold text-dim">A</span>
              <span className="w-6 text-center text-[10px] font-bold text-dim">S</span>
              <span className="w-6 text-center text-[10px] font-bold text-dim">B</span>
              <span className="w-6 text-center text-[10px] font-bold text-error">E</span>
            </div>
          </div>
        </div>

        {/* Rows */}
        {ranking.map((row, i) => (
          <div
            key={row.id}
            className={`flex items-center ${i < ranking.length - 1 ? 'border-b border-line' : ''} ${i === 0 ? 'bg-free/15' : ''}`}
          >
            {/* Fixed left */}
            <div className="flex items-center shrink-0 pl-3.5 pr-2 py-2.5">
              <span className={`w-[20px] text-[13px] font-bold ${i === 0 ? 'text-free' : 'text-dim'}`}>{i + 1}</span>
              <div className="w-[110px] overflow-hidden">
                <div className="text-[13px] font-semibold text-text truncate">{row.name}</div>
              </div>
            </div>
            {/* Scrollable right */}
            <div className="overflow-x-auto flex-1">
              <div className="flex items-center py-2.5 pr-3.5 min-w-max">
                <span className="w-6 text-center text-[13px] font-semibold text-success">{row.wins}</span>
                <span className="w-6 text-center text-[13px] font-semibold text-error">{row.losses}</span>
                <span className="w-10 text-center text-[13px] font-semibold text-text">{Math.round(row.winPct * 100)}%</span>
                <span className="w-7 text-center text-[13px] font-semibold text-text">{row.points}</span>
                <span className="w-6 text-center text-[13px] font-semibold text-text">{row.aces}</span>
                <span className="w-6 text-center text-[13px] font-semibold text-text">{row.spikes}</span>
                <span className="w-6 text-center text-[13px] font-semibold text-text">{row.blocks}</span>
                <span className="w-6 text-center text-[13px] font-semibold text-error">{row.errors}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-dim text-center mt-3">
        A=Aces · S=Spikes · B=Blocks · E=Errors · Pts=Points scored
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function FreePlayStatsScreen({ session, onClose }) {
  const [tab, setTab] = useState('teams')
  const [tbOptions] = useState({ tieBreakerMode: 'id', seedMap: {}, drawMap: {} })

  const allMatches = useMemo(() => getAllSessionMatches(session), [session])

  // Adapt teams: add `players` alias expected by calcOverallStandings
  const teamsForStandings = useMemo(
    () => (session.teams || []).map(t => ({ ...t, players: t.playerIds || [] })),
    [session.teams]
  )

  const standings   = useMemo(
    () => calcOverallStandings(teamsForStandings, allMatches, session.players || [], tbOptions),
    [teamsForStandings, allMatches, session.players, tbOptions]
  )
  const playerStats = useMemo(() => computePlayerStats(allMatches), [allMatches])
  const records     = useMemo(() => computeMatchRecords(allMatches), [allMatches])

  // Player ranking: merge W/L from calcPlayerStandings with live stats, sort by wins → win% → points → name
  const playerRanking = useMemo(() => {
    const base = calcPlayerStandings(teamsForStandings, allMatches, session.players || [])
    return base.map(p => {
      const live = playerStats[p.id] || { points: 0, aces: 0, spikes: 0, blocks: 0, tips: 0, errors: 0 }
      const games = p.wins + p.losses
      const winPct = games > 0 ? p.wins / games : 0
      return { ...p, winPct, points: live.points, aces: live.aces, spikes: live.spikes, blocks: live.blocks, tips: live.tips, errors: live.errors }
    }).sort((a, b) =>
      b.wins - a.wins ||
      b.winPct - a.winPct ||
      b.points - a.points ||
      a.name.localeCompare(b.name)
    )
  }, [teamsForStandings, allMatches, session.players, playerStats])

  return (
    <div className="absolute inset-0 z-[110] bg-bg flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5 flex-shrink-0 bg-surface border-b border-line">
        <button
          onClick={onClose}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text flex-shrink-0"
        >
          <BackIcon />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold text-text leading-tight truncate">
            Session Complete
          </div>
          <div className="text-[11px] text-dim truncate">{session.name}</div>
        </div>
        <div className="text-[22px]">🏆</div>
      </div>

      {/* Tab switcher */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 bg-bg border-b border-line">
        <PillTabs
          items={[{ id: 'teams', label: 'Teams' }, { id: 'players', label: 'Players' }]}
          active={tab}
          onChange={setTab}
          accent="free"
        />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-8">

        {/* ── Teams tab ── */}
        {tab === 'teams' && (
          <>
            {/* Podium */}
            <div className="pt-5 pb-4">
              <div className="px-4 mb-4">
                <SectionLabel>Podium</SectionLabel>
              </div>
              <Podium rows={standings} session={session} />
            </div>

            <div className="h-px bg-line mx-4 mb-5" />

            {/* Final Standings */}
            <div className="mb-5">
              <div className="px-4 mb-3 flex items-center justify-between">
                <SectionLabel>Final Standings</SectionLabel>
              </div>
              <StandingsSection rows={standings} tbOptions={tbOptions} />
            </div>

            <div className="h-px bg-line mx-4 mb-5" />

            {/* Match Records */}
            <div className="mb-2">
              <div className="px-4 mb-3">
                <SectionLabel>Match Records</SectionLabel>
              </div>
              <MatchRecords records={records} session={session} />
            </div>
          </>
        )}

        {/* ── Players tab ── */}
        {tab === 'players' && (
          <>
            {/* Player Podium */}
            <div className="pt-5 pb-4">
              <div className="px-4 mb-4">
                <SectionLabel>Podium</SectionLabel>
              </div>
              <PlayerPodium ranking={playerRanking} />
            </div>

            <div className="h-px bg-line mx-4 mb-5" />

            {/* Player Awards */}
            <div className="mb-5">
              <div className="px-4 mb-3">
                <SectionLabel>Player Awards</SectionLabel>
              </div>
              <Awards playerStats={playerStats} session={session} />
            </div>

            <div className="h-px bg-line mx-4 mb-5" />

            {/* Player Rankings */}
            <div className="mb-2">
              <div className="px-4 mb-3">
                <SectionLabel>Player Rankings</SectionLabel>
              </div>
              <PlayerRankingsSection ranking={playerRanking} />
            </div>
          </>
        )}

      </div>
    </div>
  )
}
