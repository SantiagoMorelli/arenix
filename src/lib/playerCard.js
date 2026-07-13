/**
 * playerCard — pure model for the FIFA-style league player card.
 * Everything derives from data already computed by computeLeagueInsights;
 * no fetching, no React.
 */
import { styleFromShares } from './playerStats'

// Stat bars shown on the card, in order. `pct` is normalized against the
// league's best value for that stat so bars read as "vs the league".
const BAR_DEFS = [
  { key: 'spikes', label: 'SPK', color: 'accent' },
  { key: 'blocks', label: 'BLK', color: 'free' },
  { key: 'aces',   label: 'ACE', color: 'success' },
  { key: 'serveWinPct', label: 'SRV', color: 'dim', suffix: '%' },
]

/**
 * @param {object} player        league player (id, elo, ...)
 * @param {object} insights      result of computeLeagueInsights
 * @param {Array}  rankedPlayers league players sorted by elo desc
 * @returns {{
 *   rank: number|null, tier: 'gold'|'silver'|'standard',
 *   elo: number, wins: number, losses: number, winPct: number, titles: number,
 *   style: string|null,
 *   bars: Array<{ key, label, color, value, pct, suffix? }>,
 * }}
 */
export function computePlayerCard(player, insights, rankedPlayers) {
  const idx  = rankedPlayers.findIndex(p => p.id === player.id)
  const rank = idx >= 0 ? idx + 1 : null
  const tier = rank === 1 ? 'gold' : rank != null && rank <= 3 ? 'silver' : 'standard'

  const streak = insights.streaks.get(player.id) || { wins: 0, losses: 0, winPct: 0 }
  const titles = insights.champions.titles.find(t => t.playerId === player.id)?.titles || 0

  const stats = insights.leaderStats[player.id] || {}
  const style = styleFromShares({
    ace:   stats.aces   || 0,
    spike: stats.spikes || 0,
    block: stats.blocks || 0,
    tip:   stats.tips   || 0,
  })

  // League max per stat, from players actually in the ranking
  const maxOf = (key) => {
    let max = 0
    for (const p of rankedPlayers) {
      const v = insights.leaderStats[p.id]?.[key] || 0
      if (v > max) max = v
    }
    return max
  }

  const bars = []
  for (const def of BAR_DEFS) {
    const max = maxOf(def.key)
    if (max <= 0) continue
    const value = stats[def.key] || 0
    bars.push({ ...def, value, pct: Math.round((value / max) * 100) })
  }
  // Win % always has a natural 0-100 scale
  if (streak.wins + streak.losses > 0) {
    bars.push({ key: 'winPct', label: 'WIN', color: 'dim', suffix: '%', value: Math.round(streak.winPct * 100), pct: Math.round(streak.winPct * 100) })
  }

  return {
    rank,
    tier,
    elo:    player.elo ?? 1000,
    wins:   streak.wins,
    losses: streak.losses,
    winPct: Math.round((streak.winPct || 0) * 100),
    titles,
    style,
    bars,
  }
}
