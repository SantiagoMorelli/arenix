/**
 * Resolve the effective scoring level for a live match or stats screen.
 *
 * Tournament-level config takes precedence over the league default.
 * When both are absent the resolver returns 3 (Detailed) so all existing
 * leagues, tournaments, and matches behave exactly as before.
 *
 * Accepts normalized objects (camelCase `scoringConfig`) as produced by
 * `normalizeLeague` / `normalizeTournament` in `src/services/leagueService.js`.
 *
 * @param {{ scoringConfig?: { level?: number } | null } | null | undefined} tournament
 * @param {{ scoringConfig?: { level?: number } | null } | null | undefined} league
 * @returns {1 | 2 | 3}
 *
 * @example
 * resolveScoringLevel({ scoringConfig: { level: 2 } }, { scoringConfig: { level: 3 } })
 * // → 2  (tournament overrides league)
 *
 * resolveScoringLevel(null, null)
 * // → 3  (legacy default — all pre-existing data is treated as Level 3)
 */
export function resolveScoringLevel(tournament, league) {
  const t = tournament?.scoringConfig?.level
  const l = league?.scoringConfig?.level
  const lvl = t ?? l ?? 3
  return [1, 2, 3].includes(lvl) ? lvl : 3
}
