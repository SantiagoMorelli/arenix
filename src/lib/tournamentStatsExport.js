/**
 * Builds a plain-text summary of tournament stats, suitable for pasting into
 * an LLM with a coaching prompt.
 */

const PCT_FMT = (n) => `${Math.round((n || 0) * 100)}%`

export function buildTournamentCoachExport(tournament, playerStatsMap, allMatches, leaguePlayers) {
  const lines = []
  const today = new Date().toISOString().slice(0, 10)

  lines.push('=== Arenix Tournament Stats — coaching export ===')
  lines.push(`Generated: ${today}`)
  lines.push(`Tournament: ${tournament.name}`)
  lines.push('')

  const nameOf = (pid) => {
    const p = leaguePlayers.find(x => x.id === pid)
    return p ? (p.displayName || p.nickname || p.name) : 'Unknown'
  }

  // Convert the object map to an array and attach names
  const playerStats = Object.entries(playerStatsMap).map(([pid, stats]) => ({
      pid,
      name: nameOf(pid),
      ...stats
  }))

  lines.push('--- AWARDS ---')
  const awards = [
    { title: 'Top Scorer', key: 'points', label: 'pts' },
    { title: 'Ace King', key: 'aces', label: 'aces' },
    { title: 'Spike Machine', key: 'spikes', label: 'spikes' },
    { title: 'Block Master', key: 'blocks', label: 'blocks' },
    { title: 'Tip Master', key: 'tips', label: 'tips' },
    { title: 'Most Efficient Server', key: 'serveWinPct', label: '%', format: PCT_FMT },
  ]

  for (const award of awards) {
      const sorted = [...playerStats].sort((a, b) => (b[award.key] || 0) - (a[award.key] || 0))
      const winner = sorted[0]
      if (winner && winner[award.key] > 0) {
          const val = award.format ? award.format(winner[award.key] / 100) : winner[award.key]
          lines.push(`  ${award.title}: ${winner.name} (${val} ${award.label})`)
      }
  }
  lines.push('')

  lines.push('--- PLAYER STATS ---')
  for (const p of playerStats.sort((a, b) => (b.points || 0) - (a.points || 0))) {
      if ((p.points || 0) === 0 && (p.errors || 0) === 0) continue;
      lines.push(`${p.name}:`)
      lines.push(`  Net Points: ${(p.points || 0) - (p.errors || 0)} (${p.points || 0} pts, ${p.errors || 0} errors)`)
      lines.push(`  Breakdown: ${p.aces || 0} aces, ${p.spikes || 0} spikes, ${p.blocks || 0} blocks, ${p.tips || 0} tips`)
      
      const totalAtt = (p.spikes || 0) + (p.errorsByType?.spike || 0)
      if (totalAtt > 0) {
          lines.push(`  Spike Efficiency: ${PCT_FMT(p.spikes / totalAtt)} (${p.spikes} kills, ${p.errorsByType?.spike || 0} errors)`)
      }

      if (p.serves > 0) {
          lines.push(`  Serving: ${p.serves} serves, ${p.serveWinPct}% win rate`)
          const inPlay = p.serves - (p.aces || 0) - (p.errorsByType?.serve || 0)
          const inPlayWon = (p.serveWins || 0) - (p.aces || 0)
          lines.push(`    In-Play: ${inPlayWon}/${inPlay} won (${inPlay > 0 ? PCT_FMT(inPlayWon/inPlay) : '0%'})`)
      }
      lines.push('')
  }

  lines.push('Suggested prompt:')
  lines.push('"You are an expert volleyball coach. Analyze this tournament data.');
  lines.push('Provide a short summary of the tournament, highlight the best performers, and suggest drills for the most common areas of improvement."');

  return lines.join('\n')
}
