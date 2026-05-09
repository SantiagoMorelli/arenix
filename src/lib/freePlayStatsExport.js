/**
 * Builds a plain-text summary of a free play session, suitable for pasting
 * into an LLM with a coaching prompt.
 */
export function buildFreePlaySessionExport(session, playerRanking, standings, allMatches) {
  const lines = []
  const today = new Date().toISOString().slice(0, 10)

  lines.push('=== Arenix Free Play Stats — coaching export ===')
  lines.push(`Generated: ${today}`)
  lines.push(`Session: ${session.name || 'Unnamed Session'}`)
  lines.push(`Matches played: ${allMatches.filter(m => m.played).length}`)
  lines.push('')

  lines.push('--- AWARDS ---')
  const award = (title, key, label) => {
    const best = [...playerRanking].sort((a, b) => (b[key] || 0) - (a[key] || 0))[0]
    if (best && (best[key] || 0) > 0) lines.push(`  ${title}: ${best.name} (${best[key]} ${label})`)
  }
  award('Top Scorer',    'points', 'pts')
  award('Ace King',      'aces',   'aces')
  award('Spike Machine', 'spikes', 'spikes')
  award('Block Master',  'blocks', 'blocks')
  award('Glass Cannon',  'errors', 'errors')
  lines.push('')

  lines.push('--- TEAM STANDINGS ---')
  for (const [i, row] of standings.entries()) {
    const pd = row.pd > 0 ? `+${row.pd}` : String(row.pd)
    lines.push(`  #${i + 1} ${row.name}: ${row.wins}W-${row.losses}L, PF ${row.pf}, PA ${row.pa}, PD ${pd}`)
  }
  lines.push('')

  lines.push('--- PLAYER STATS ---')
  for (const p of playerRanking) {
    if ((p.points || 0) === 0 && (p.errors || 0) === 0 && (p.wins || 0) === 0) continue
    const net = (p.points || 0) - (p.errors || 0)
    const winPct = Math.round((p.winPct || 0) * 100)
    lines.push(`${p.name} (${p.wins}W-${p.losses}L, ${winPct}% win rate):`)
    lines.push(`  Net Points: ${net} (${p.points || 0} pts, ${p.errors || 0} errors)`)
    lines.push(`  Breakdown: ${p.aces || 0} aces, ${p.spikes || 0} spikes, ${p.blocks || 0} blocks, ${p.tips || 0} tips`)
    lines.push('')
  }

  lines.push('Suggested prompt:')
  lines.push('"You are an expert volleyball coach. Analyze this free play session data.')
  lines.push('Highlight top performers, identify areas of improvement for each player, and suggest specific drills."')

  return lines.join('\n')
}
