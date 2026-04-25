import { useMemo } from 'react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAllMatches(tournament) {
  return [
    ...(tournament.groups || []).flatMap(g => g.matches.map(m => ({ ...m, label: g.name }))),
    ...(tournament.knockout?.rounds || []).flatMap(r =>
      r.matches.map(m => ({ ...m, label: r.name }))
    ),
    ...(tournament.matches || []).map((m, i) => ({ ...m, label: `Match ${i + 1}` })),
  ]
}

function calcOverallStandings(teams, matches, players = []) {
  return teams.map(tm => {
    let wins = 0, losses = 0, pf = 0, pa = 0
    ;(matches || [])
      .filter(m => m.played && (m.team1 === tm.id || m.team2 === tm.id))
      .forEach(m => {
        const scored   = m.team1 === tm.id ? m.score1 : m.score2
        const conceded = m.team1 === tm.id ? m.score2 : m.score1
        pf += scored; pa += conceded
        if (scored > conceded) wins++; else losses++
      })
    const playerNames = (tm.players || []).map(pid => {
      const p = players.find(x => x.id === pid)
      return p ? (p.displayName || p.nickname || p.name) : 'Unknown'
    }).join(' · ')
    return { id: tm.id, name: tm.name, playerNames, wins, losses, pf, pa, pd: pf - pa, pts: wins }
  }).sort((a, b) => b.pts - a.pts || b.pd - a.pd || b.pf - a.pf || b.wins - a.wins)
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
        if ((entry.streak || 0) > streak) { streak = entry.streak; longestStreak = { match: m, streak: entry.streak, team: entry.team } }
      }

      // Biggest comeback: per set, track max deficit overcome by winner
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

  return { mostDominant, dominance, highestScoring, highScore, longestStreak, biggestComeback }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="text-[11px] font-bold text-dim uppercase tracking-widest mb-3">
      {children}
    </div>
  )
}

function Podium({ tournament, leaguePlayers }) {
  const { winnerTeamId, knockout, teams } = tournament

  const finalRound = knockout?.rounds?.find(r => r.id === 'final')
  const finalMatch = finalRound?.matches?.[0]

  const thirdRound = knockout?.rounds?.find(r => r.id === 'third_place')
  const thirdMatch = thirdRound?.matches?.[0]

  const runnerUpId = finalMatch?.played
    ? (finalMatch.team1 === winnerTeamId ? finalMatch.team2 : finalMatch.team1)
    : null

  const thirdId = thirdMatch?.played ? thirdMatch.winner : null

  const getTeam = id => teams.find(t => t.id === id)
  const getNames = id => {
    const t = getTeam(id)
    return (t?.players || []).map(pid => {
      const p = leaguePlayers.find(x => x.id === pid)
      return p ? (p.displayName || p.nickname || p.name) : '?'
    }).join(' & ')
  }

  const champion = getTeam(winnerTeamId)

  const slots = [
    runnerUpId ? { rank: 2, id: runnerUpId, medal: '🥈', height: 'h-16', label: 'Runner-up' } : null,
    { rank: 1, id: winnerTeamId, medal: '🥇', height: 'h-24', label: 'Champion' },
    thirdId ? { rank: 3, id: thirdId, medal: '🥉', height: 'h-10', label: '3rd Place' } : null,
  ].filter(Boolean)

  return (
    <div className="px-4">
      {/* Champion highlight */}
      <div className="bg-gradient-to-b from-accent/20 to-transparent rounded-2xl p-5 mb-4 text-center border border-accent/30">
        <div className="text-[40px] mb-1">🏆</div>
        <div className="text-[22px] font-black text-accent tracking-wide">{champion?.name || '?'}</div>
        <div className="text-[13px] text-dim mt-1">{getNames(winnerTeamId)}</div>
        <div className="text-[11px] font-bold text-accent/60 uppercase tracking-widest mt-2">Champion</div>
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
                slot.rank === 1 ? 'bg-accent/30 border-t-2 border-accent' :
                slot.rank === 2 ? 'bg-surface border-t border-line' :
                'bg-alt border-t border-line'
              }`}>
                <span className={`text-[14px] font-black ${slot.rank === 1 ? 'text-accent' : 'text-dim'}`}>
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

function AwardCard({ icon, title, playerName, value, valueLabel, funny = false }) {
  return (
    <div className={`rounded-2xl p-4 border flex flex-col gap-1.5 ${
      funny
        ? 'bg-error/10 border-error/30'
        : 'bg-surface border-line'
    }`}>
      <div className="text-[22px]">{icon}</div>
      <div className={`text-[10px] font-bold uppercase tracking-widest ${funny ? 'text-error' : 'text-accent'}`}>
        {title}
      </div>
      <div className="text-[14px] font-bold text-text leading-tight">{playerName}</div>
      <div className={`text-[12px] font-semibold ${funny ? 'text-error/70' : 'text-dim'}`}>
        {value} {valueLabel}
      </div>
    </div>
  )
}

function Awards({ playerStats, leaguePlayers }) {
  const playerName = pid => {
    const p = leaguePlayers.find(x => x.id === pid)
    return p ? (p.displayName || p.nickname || p.name) : 'Unknown'
  }

  const best = (key) => {
    const entries = Object.entries(playerStats)
    if (!entries.length) return null
    const [pid, val] = entries.reduce((best, cur) => cur[1][key] > best[1][key] ? cur : best)
    return val[key] > 0 ? { pid, value: val[key] } : null
  }

  const topScorer  = best('points')
  const aceKing    = best('aces')
  const spikeMach  = best('spikes')
  const blockMast  = best('blocks')
  const glassCan   = best('errors')

  const awards = [
    topScorer && { icon: '🏆', title: 'Top Scorer', pid: topScorer.pid, value: topScorer.value, label: 'pts', funny: false },
    aceKing   && { icon: '🎯', title: 'Ace King',   pid: aceKing.pid,   value: aceKing.value,   label: 'aces', funny: false },
    spikeMach && { icon: '💥', title: 'Spike Machine', pid: spikeMach.pid, value: spikeMach.value, label: 'spikes', funny: false },
    blockMast && { icon: '🛡️', title: 'Block Master',  pid: blockMast.pid, value: blockMast.value, label: 'blocks', funny: false },
    glassCan  && { icon: '💣', title: 'Glass Cannon',  pid: glassCan.pid,  value: glassCan.value,  label: 'errors', funny: true },
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

function StandingsSection({ tournament, leaguePlayers }) {
  const allMatches = getAllMatches(tournament)
  const rows = calcOverallStandings(tournament.teams, allMatches, leaguePlayers)

  return (
    <div className="px-4">
      <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
        <div className="flex items-center px-3.5 py-2 border-b border-line bg-alt">
          <span className="w-[20px] text-[10px] font-bold text-dim">#</span>
          <span className="flex-1  text-[10px] font-bold text-dim">TEAM</span>
          <span className="w-6 text-center text-[10px] font-bold text-dim">W</span>
          <span className="w-6 text-center text-[10px] font-bold text-dim">L</span>
          <span className="w-7 text-center text-[10px] font-bold text-dim">PF</span>
          <span className="w-7 text-center text-[10px] font-bold text-dim">PA</span>
          <span className="w-7 text-center text-[10px] font-bold text-dim">PD</span>
          <span className="w-8 text-center text-[10px] font-bold text-dim">PTS</span>
        </div>
        {rows.map((row, i) => (
          <div
            key={row.id}
            className={`flex items-center px-3.5 py-2.5 ${i < rows.length - 1 ? 'border-b border-line' : ''} ${i === 0 ? 'bg-accent/15' : ''}`}
          >
            <span className={`w-[20px] text-[13px] font-bold ${i === 0 ? 'text-accent' : 'text-dim'}`}>{i + 1}</span>
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
            <span className="w-8 text-center text-[13px] font-bold text-accent">{row.pts}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecordCard({ icon, title, line1, line2 }) {
  if (!line1) return null
  return (
    <div className="bg-surface rounded-2xl p-4 border border-line">
      <div className="text-[20px] mb-1.5">{icon}</div>
      <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">{title}</div>
      <div className="text-[13px] font-bold text-text leading-snug">{line1}</div>
      {line2 && <div className="text-[11px] text-dim mt-0.5">{line2}</div>}
    </div>
  )
}

function MatchRecords({ records, tournament }) {
  if (!records) return <div className="px-4 text-[13px] text-dim text-center py-4">No matches played yet</div>

  const tName = id => tournament.teams.find(t => t.id === id)?.name || '?'

  const { mostDominant, dominance, highestScoring, highScore, longestStreak, biggestComeback } = records

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
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TournamentStatsScreen({ tournament, leaguePlayers, onClose }) {
  const allMatches = useMemo(() => getAllMatches(tournament), [tournament])
  const playerStats = useMemo(() => computePlayerStats(allMatches), [allMatches])
  const records = useMemo(() => computeMatchRecords(allMatches), [allMatches])

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
            Tournament Complete
          </div>
          <div className="text-[11px] text-dim truncate">{tournament.name}</div>
        </div>
        <div className="text-[22px]">🏆</div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-8">

        {/* Podium */}
        <div className="pt-5 pb-4">
          <div className="px-4 mb-4">
            <SectionLabel>Podium</SectionLabel>
          </div>
          <Podium tournament={tournament} leaguePlayers={leaguePlayers} />
        </div>

        <div className="h-px bg-line mx-4 mb-5" />

        {/* Awards */}
        <div className="mb-5">
          <div className="px-4 mb-3">
            <SectionLabel>Player Awards</SectionLabel>
          </div>
          <Awards playerStats={playerStats} leaguePlayers={leaguePlayers} />
        </div>

        <div className="h-px bg-line mx-4 mb-5" />

        {/* Final Standings */}
        <div className="mb-5">
          <div className="px-4 mb-3">
            <SectionLabel>Final Standings</SectionLabel>
          </div>
          <StandingsSection tournament={tournament} leaguePlayers={leaguePlayers} />
        </div>

        <div className="h-px bg-line mx-4 mb-5" />

        {/* Match Records */}
        <div className="mb-2">
          <div className="px-4 mb-3">
            <SectionLabel>Match Records</SectionLabel>
          </div>
          <MatchRecords records={records} tournament={tournament} />
        </div>

      </div>
    </div>
  )
}
