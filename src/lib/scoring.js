/**
 * Resolve the effective scoring level for a live match or stats screen.
 *
 * Tournament-level config takes precedence over the league default.
 * When both are absent the resolver returns 3 (Detailed) so all existing
 * leagues, tournaments, and matches behave exactly as before.
 *
 * @param {{ scoring_config?: { level?: number } | null } | null | undefined} tournament
 * @param {{ scoring_config?: { level?: number } | null } | null | undefined} league
 * @returns {1 | 2 | 3}
 *
 * @example
 * resolveScoringLevel({ scoring_config: { level: 2 } }, { scoring_config: { level: 3 } })
 * // → 2  (tournament overrides league)
 *
 * resolveScoringLevel(null, null)
 * // → 3  (legacy default — all pre-existing data is treated as Level 3)
 */
export function resolveScoringLevel(tournament, league) {
  const t = tournament?.scoring_config?.level
  const l = league?.scoring_config?.level
  const lvl = t ?? l ?? 3
  return [1, 2, 3].includes(lvl) ? lvl : 3
}
