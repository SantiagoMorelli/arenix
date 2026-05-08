/**
 * Builds a plain-text summary of a player's stats, suitable for pasting into
 * an LLM with a coaching prompt. Pure function — no side effects.
 */

const PCT_FMT = (n) => `${Math.round((n || 0) * 100)}%`
const ROUND = (n, digits = 1) => Number.isFinite(n) ? n.toFixed(digits) : '-'
const V = (x) => (x && typeof x === 'object' && 'value' in x ? x.value : x)

function shotName(key) {
  if (!key) return '-'
  const map = { ace: 'Ace', spike: 'Spike', block: 'Block', tip: 'Tip' }
  return map[key] || key
}

function errorTypeName(key) {
  if (!key) return '-'
  const map = { net: 'Net', out: 'Out', serve: 'Serve', other: 'Other' }
  return map[key] || key
}

function formatDate(d) {
  if (!d) return ''
  try {
    const date = new Date(d)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
  } catch { return '' }
}

export function buildCoachExport(profile, stats, recentMatches = []) {
  const lines = []
  const today = new Date().toISOString().slice(0, 10)

  lines.push('=== Arenix Player Profile — coaching export ===')
  lines.push(`Generated: ${today}`)
  lines.push('')

  const handle = profile?.nickname ? ` (@${profile.nickname})` : ''
  const country = profile?.country ? `  Country: ${profile.country}` : ''
  const gender = profile?.gender ? `  Gender: ${profile.gender}` : ''
  lines.push(`Player: ${profile?.full_name || 'Unknown'}${handle}${country}${gender}`)
  lines.push(
      `Active leagues: ${stats.leagueCount || 0}   ` +
      `Tournaments played: ${stats.byTournament?.length || 0}   ` +
      `Matches played: ${stats.totalMatches || 0}`
  )
  lines.push('')

  // Overall
  lines.push('OVERALL')
  lines.push(
    `  Wins / Losses: ${V(stats.wins) || 0} / ${V(stats.losses) || 0}  ` +
    `(${PCT_FMT(V(stats.winRate))} win rate)`
  )
  if (stats.bestRank) {
    lines.push(`  Best tournament finish: ${stats.bestRank}`)
  }
  lines.push(`  Best win streak: ${V(stats.bestWinStreak) || 0}`)
  lines.push('')

  // Serving
  const sv = V(stats.serving) || {}
  lines.push('SERVING')
  lines.push(`  Total serves: ${sv.totalServes || 0}`)
  lines.push(`  Serve-in-play %: ${PCT_FMT(sv.serveInPlayPct)}`)
  lines.push(`  Serve win %: ${PCT_FMT(sv.serveWinPct)}`)
  lines.push(`  Aces: ${sv.aces || 0}  (${PCT_FMT(sv.aceRate)} of serves)`)
  lines.push(`  Serve errors: ${sv.serveErrors || 0}  (${PCT_FMT(sv.errorRate)} of serves)`)
  lines.push(`  Longest serving run: ${sv.longestServingRun || 0} points`)
  if (sv.bestSet) {
    lines.push(
      `  Best serving set: Set ${sv.bestSet.setNum} ` +
      `(${sv.bestSet.serves - sv.bestSet.errors}/${sv.bestSet.serves} in play, ` +
      `${sv.bestSet.wins} wins)`
    )
  }
  lines.push('')

  // Pressure
  const p = V(stats.pressure) || {}
  lines.push('PRESSURE')
  lines.push(
    `  Clutch points (last 4 of a set or deciding sets): ` +
    `${p.clutchWon || 0}W / ${p.clutchLost || 0}L (${PCT_FMT(p.clutchWinPct)})`
  )
  lines.push(`  Side-out conversion (won rallies on receive): ${PCT_FMT(p.sideOutPct)}`)
  lines.push(`  Comeback contribution: ${p.comebackPoints || 0} points scored while trailing 2+`)
  lines.push(
    `  Deciding-set record: ${p.decidingSetWins || 0}W / ${p.decidingSetLosses || 0}L`
  )
  lines.push('')

  // Strengths
  const st = V(stats.strengths) || {}
  lines.push('STRENGTHS')
  if (st.topShot) {
    lines.push(
      `  Top shot: ${shotName(st.topShot)}  (${PCT_FMT(st.topShotShare)} of scoring points)`
    )
  } else {
    lines.push('  Top shot: not enough data yet')
  }
  if (st.weakestShot) {
    const share = st.totalScoring > 0
      ? (st.byType[st.weakestShot] || 0) / st.totalScoring : 0
    lines.push(`  Weakest scoring shot: ${shotName(st.weakestShot)}  (${PCT_FMT(share)})`)
  }
  if (st.topErrorType) {
    const totalErr = st.totalErrors || 0
    const errCount = st.errorsByType?.[st.topErrorType] || 0
    const errShare = totalErr > 0 ? errCount / totalErr : 0
    lines.push(
      `  Most common error: ${errorTypeName(st.topErrorType)} ` +
      `(${PCT_FMT(errShare)} of errors)`
    )
  }
  lines.push('')

  // Playstyle
  const ps = V(stats.playstyle) || {}
  lines.push('PLAYSTYLE')
  if (ps.label) lines.push(`  Profile: ${ps.label}`)
  lines.push(`  Risk: errors are ${PCT_FMT(ps.riskProfile)} of total attempts`)
  if (Number.isFinite(ps.consistency)) {
    lines.push(
      `  Set-by-set consistency: ${ROUND(ps.consistency, 2)} ` +
      '(1.0 = identical share each match)'
    )
  }
  lines.push('')

  // Recent matches
  if (recentMatches.length > 0) {
    lines.push(`RECENT MATCHES (last ${Math.min(recentMatches.length, 5)})`)
    for (const m of recentMatches.slice(0, 5)) {
      const date = formatDate(m.date)
      const wl = m.won ? 'W' : 'L'
      const setsStr = (m.sets || []).map(s => `${s.s1}-${s.s2}`).join(' / ')
      const pts = m.points != null ? `  — ${m.points} pts` : ''
      const aces = m.aces != null ? `, ${m.aces} aces` : ''
      lines.push(`  ${date}  ${wl} ${setsStr}   vs ${m.opponentName || 'Opponent'}${pts}${aces}`)
    }
    lines.push('')
  }

  lines.push('Suggested prompt:')
  lines.push('"You are my beach volleyball coach. Read the stats above and tell me my')
  lines.push('biggest strengths, my biggest weaknesses, and three concrete drills I can')
  lines.push('do this week to improve. Be specific."')

  return lines.join('\n')
}
