/**
 * leagueViewPref — remembers which league home design the user last chose,
 * so the toggle sticks between visits.
 *
 * 'classic' → LeagueDetail (the handoff design)
 * 'social'  → LeagueSocial (the experimental feed)
 *
 * Stored globally rather than per league: it's a preference about the design,
 * not about one league.
 */
const KEY = 'arenix.leagueView'

export const CLASSIC = 'classic'
export const SOCIAL  = 'social'

export function getLeagueView() {
  try {
    const v = localStorage.getItem(KEY)
    return v === SOCIAL ? SOCIAL : CLASSIC
  } catch {
    return CLASSIC
  }
}

export function setLeagueView(view) {
  try { localStorage.setItem(KEY, view === SOCIAL ? SOCIAL : CLASSIC) } catch { /* storage unavailable */ }
}
