/**
 * useStartupRedirect — app-open shortcut past the landing page.
 *
 * Runs once per browser session, and only when the page load itself entered
 * at "/". Logged-in users go to "their" league (last visited → last played
 * match → most recent membership); guests go to a live/open public
 * tournament, else the public league with the most recent tournament.
 * No valid target → the normal Landing renders.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getMyLeagues, getPublicLeagues, getLastPlayedLeagueId } from '../services/leagueService'
import { getLastLeague } from '../lib/lastLeague'
// entryPath is captured eagerly in main.jsx — SPA navigations back to "/"
// mid-session must never re-trigger the redirect.
import { entryPath } from '../lib/appEntry'

const FLAG = 'arenix.startupRedirect.done'

function redirectAlreadyDone() {
  try { return sessionStorage.getItem(FLAG) === '1' } catch { return true }
}

function markRedirectDone() {
  try { sessionStorage.setItem(FLAG, '1') } catch { /* storage unavailable */ }
}

// Mirrors tournamentDisplayStatus in Landing.jsx
function displayStatus(t) {
  if (t.status === 'completed') return 'completed'
  if (!t.phase || t.phase === 'setup') return 'open'
  return 'live'
}

function tournamentTime(t) {
  const ms = new Date(t.date || 0).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

/**
 * Guest target from getPublicLeagues() output: a live/open tournament
 * (live first, most recent first), else the home of the league with the
 * most recent tournament, else null.
 */
function pickGuestTarget(leagues) {
  const all = []
  for (const l of leagues || []) {
    for (const t of l.tournaments || []) {
      all.push({ ...t, leagueId: l.id, statusLabel: displayStatus(t), time: tournamentTime(t) })
    }
  }
  if (!all.length) return null

  const active = all.filter(t => t.statusLabel !== 'completed')
  if (active.length) {
    active.sort((a, b) =>
      a.statusLabel === b.statusLabel
        ? b.time - a.time
        : a.statusLabel === 'live' ? -1 : 1,
    )
    return `/league/${active[0].leagueId}/tournament/${active[0].id}`
  }

  all.sort((a, b) => b.time - a.time)
  return `/league/${all[0].leagueId}`
}

export function useStartupRedirect() {
  const navigate = useNavigate()
  const { session } = useAuth()

  // Synchronous initial value: in the common case (flag already set, or the
  // page load entered elsewhere) Landing paints on the first frame.
  const [deciding, setDeciding] = useState(() => entryPath === '/' && !redirectAlreadyDone())

  useEffect(() => {
    if (!deciding) return
    if (session === undefined) return // auth still restoring

    let cancelled = false
    // Consume the flag as soon as the decision starts — "stay on landing"
    // and failed queries also count; never retry within the session.
    markRedirectDone()

    ;(async () => {
      let target = null
      try {
        if (session) {
          const userId = session.user.id
          const leagueId =
            getLastLeague(userId) ||
            (await getLastPlayedLeagueId()) ||
            (await getMyLeagues()).at(-1)?.id // ordered granted_at asc → last = most recent
          if (leagueId) target = `/league/${leagueId}`
        } else {
          target = pickGuestTarget(await getPublicLeagues())
        }
      } catch {
        target = null // any failure = stay on landing
      }
      if (cancelled) return
      if (target) navigate(target, { replace: true })
      else setDeciding(false)
    })()

    return () => { cancelled = true }
  }, [deciding, session, navigate])

  return { deciding }
}
