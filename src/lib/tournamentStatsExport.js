/**
 * Builds a plain-text summary of tournament stats, suitable for pasting into
 * an LLM with a coaching prompt.
 */

const PCT_FMT = (n) => `${Math.round((n || 0) * 100)}%`

export function buildTournamentCoachExport(tournament, playerStats, allMatches) {
  const lines = []
  const today = new Date().toISOString().slice(0, 10)

  lines.push('=== Arenix Tournament Stats — coaching export ===')
  lines.push(`Generated: ${today}`)
  lines.push(`Tournament: ${tournament.name}`)
  lines.push('')

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
  for (const p of playerStats.sort((a, b) => b.points - a.points)) {
      if (p.points === 0 && p.errors === 0) continue;
      lines.push(`${p.name}:`)
      lines.push(`  Net Points: ${p.points - p.errors} (${p.points} pts, ${p.errors} errors)`)
      lines.push(`  Breakdown: ${p.aces} aces, ${p.spikes} spikes, ${p.blocks} blocks, ${p.tips} tips`)
      
      const totalAtt = p.spikes + p.errorsByType?.spike
      if (totalAtt > 0) {
          lines.push(`  Spike Efficiency: ${PCT_FMT(p.spikes / totalAtt)} (${p.spikes} kills, ${p.errorsByType?.spike || 0} errors)`)
      }

      if (p.serves > 0) {
          lines.push(`  Serving: ${p.serves} serves, ${p.serveWinPct}% win rate`)
          const inPlay = p.serves - p.aces - (p.errorsByType?.serve || 0)
          const inPlayWon = p.serveWins - p.aces
          lines.push(`    In-Play: ${inPlayWon}/${inPlay} won (${inPlay > 0 ? PCT_FMT(inPlayWon/inPlay) : '0%'})`)
      }
      lines.push('')
  }

  lines.push('Suggested prompt:')
  lines.push('"You are an expert volleyball coach. Analyze this tournament data.');
  lines.push('Provide a short summary of the tournament, highlight the best performers, and suggest drills for the most common areas of improvement."');

  return lines.join('\n')
}
