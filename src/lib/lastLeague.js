/**
 * lastLeague — remembers the last league a logged-in user visited.
 *
 * Read by useStartupRedirect as the fast path for the app-open redirect.
 * Keyed per user so account switches on a shared browser don't leak
 * another account's league.
 */
const key = userId => `arenix.lastLeague.${userId}`

export function rememberLastLeague(userId, leagueId) {
  if (!userId || !leagueId) return
  try { localStorage.setItem(key(userId), leagueId) } catch { /* storage unavailable */ }
}

export function getLastLeague(userId) {
  if (!userId) return null
  try { return localStorage.getItem(key(userId)) } catch { return null }
}

/** Clear only if the stored value is `leagueId` (e.g. the league was deleted). */
export function clearLastLeague(userId, leagueId) {
  if (!userId) return
  try {
    if (localStorage.getItem(key(userId)) === leagueId) localStorage.removeItem(key(userId))
  } catch { /* storage unavailable */ }
}
