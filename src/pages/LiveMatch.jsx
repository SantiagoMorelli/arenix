import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { useLiveGame, SAVE_KEY, loadSaved } from '../hooks/useLiveGame'
import { saveMatchResult as supabaseSaveMatchResult, advanceKnockoutAfterMatch, completeTournament, releaseMatchScorer, saveTeamServeOrder, savePartialMatchLog, fetchMatchLog } from '../services/tournamentService'
import { createNotificationsForLeagueMembers } from '../services/notificationService'
import LiveScoreboard from '../components/LiveScoreboard'
import { BallSpinner } from '../components/ui-new'
const QRImportModal = lazy(() => import('../components/QRImportModal'))
import { useToast } from '../contexts/ToastContext'
import LiveMatchSetup from '../components/LiveMatchSetup'

export default function LiveMatch() {
  const navigate = useNavigate()
  const { id, tid, mid } = useParams()
  const location = useLocation()
  const { showError, showSuccess } = useToast()

  // eslint-disable-next-line no-unused-vars
  const { league, loading: leagueLoading, refetch } = useLeague(id)
  const { canScore, isAdmin, loading: roleLoading }  = useLeagueRole(id)
  const tournament = league?.tournaments?.find(t => t.id === tid) || null

  // ── Derive the sub-tab to return to (group or knockout) ───────────────────
  // Prefer what was passed in via location.state; fall back to scanning the
  // tournament data (handles page-refresh / direct deep-link cases).
  const getReturnSubTab = () => {
    if (location.state?.subTab) return location.state.subTab
    if (!tournament) return undefined
    const g = tournament.groups?.find(gr => gr.matches?.some(m => m.id === mid))
    if (g) return `g_${g.id}`
    const inKnockout = tournament.knockout?.rounds?.some(r => r.matches?.some(m => m.id === mid))
    return inKnockout ? 'knockout' : undefined
  }

  // Get all matches flat to pass to the hook
  const allMatches = [
    ...(tournament?.groups || []).flatMap(g => g.matches),
    ...(tournament?.knockout?.rounds || []).flatMap(r => r.matches),
    ...(tournament?.matches || [])
  ]

  const live = useLiveGame({
    teams: tournament?.teams || [],
    players: league?.players || [],
    informalMode: false,
    tournamentMatches: allMatches,
    // Delay preload until tournament data is available so the useLiveGame
    // effect fires with a populated tournamentMatches array (it only re-runs
    // when preloadMatchId changes, so null → mid triggers correct population).
    preloadMatchId: tournament ? mid : null,
    setsPerMatch: tournament?.setsPerMatch || 1,
    tournament,
    league,
  })

  const [showQRImport, setShowQRImport] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // Stores a Promise<log[]> that starts fetching the exporter's partial log
  // in the background the moment the QR is scanned. By the time the importer
  // finishes the match and taps Save it is almost always already resolved,
  // so the save flow incurs zero extra latency. In the rare edge case where
  // Save is tapped before the fetch completes we simply await the same
  // in-flight Promise — no second network request is made.
  const importedLogPromise = useRef(null)

  // ── Abort detection: End Match pressed with no points scored ──────────────
  // When pendingEnd transitions true → false while the game is still running
  // (gameStarted=true, no winner, no score), confirmEnd took the zero-score
  // early-return path. We need to navigate away ourselves.
  const prevPendingEnd = useRef(false)
  useEffect(() => {
    const wasEnding = prevPendingEnd.current
    prevPendingEnd.current = live.pendingEnd
    if (
      wasEnding &&
      !live.pendingEnd &&
      live.gameStarted &&
      live.winner == null &&
      live.score1 === 0 &&
      live.score2 === 0 &&
      live.sets.length === 0
    ) {
      // Full reset: clears gameStarted, scores, and the localStorage snapshot.
      live.reset()
      // Release the scorer claim so another user can pick up the match.
      releaseMatchScorer(mid).catch(() => {/* fire-and-forget */})
      showSuccess('Match cancelled')
      navigate(`/league/${id}/tournament/${tid}`, {
        state: { tab: 'matches', subTab: getReturnSubTab() },
      })
    }
  }, [live.pendingEnd])

  const getQRPayload = () => {
    const s = loadSaved()
    return {
      team1Id: live.team1Id,
      team2Id: live.team2Id,
      gameStarted: true,
      score1: live.score1,
      score2: live.score2,
      serveIndex: live.serveIndex,
      side: live.side,
      points: live.points,
      sets: live.sets,
      winner: live.winner,
      pointsToWin: live.pointsToWin,
      t1FirstServer: s?.t1FirstServer ?? 0,
      t2FirstServer: s?.t2FirstServer ?? 0,
      t1InitialSide: s?.t1InitialSide ?? live.t1InitialSide,
      t1ServeOrder: live.t1ServeOrder,
      t2ServeOrder: live.t2ServeOrder,
      // matchId lets the importer device fetch the exporter's partial log
      // from Supabase after the match ends and merge it into the full log.
      matchId: mid,
      log: [],
      history: [],
    }
  }

  // Called when the exporter taps "Done" on the QR modal.
  // Saves the current point log to Supabase (without marking the match as
  // played) so it can be retrieved and merged by the importer on save.
  const handleQRExportDone = (onClose) => {
    savePartialMatchLog(mid, live.log).catch((err) => {
      console.error('Failed to save partial match log:', err)
      showError(err, 'Could not save point log. Stats may be incomplete.')
    })
    onClose()
  }

  const handleQRImport = (parsedState) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(parsedState))
      live.restoreGame()
      // Kick off the exporter log fetch immediately in the background.
      // The match will play for at least a few minutes, so by Save time
      // this Promise will almost certainly already be resolved.
      if (parsedState.matchId) {
        importedLogPromise.current = fetchMatchLog(parsedState.matchId)
          .then(log => (Array.isArray(log) ? log : []))
          .catch(() => [])
      }
    // eslint-disable-next-line no-empty
    } catch {}
    setShowQRImport(false)
  }

  // Start game automatically if preloaded correctly
  // REMOVED AUTO START - We want the Setup Screen to show.
  // useEffect(() => {
  //   if (live.team1Id && live.team2Id && !live.gameStarted && !live.showRestore) {
  //     live.startGame()
  //   }
  // }, [live])

  // Handle Match Ending logic (now manual via GameStats)
  const handleSaveResult = async (matchId, s1_sets, s2_sets, winnerTeamId, log, sets) => {
    if (isSaving) return
    setIsSaving(true)

    const isOneSet = tournament.setsPerMatch === 1

    const finalScore1 = isOneSet ? (live.sets[0]?.s1 ?? live.score1) : s1_sets
    const finalScore2 = isOneSet ? (live.sets[0]?.s2 ?? live.score2) : s2_sets

    // If this device took over via QR import, await the exporter's partial log
    // (already fetched in the background at scan time — normally resolves in
    // milliseconds here) and prepend it to produce the full match log.
    let mergedLog = log
    if (importedLogPromise.current) {
      try {
        const exporterLog = await importedLogPromise.current
        if (exporterLog.length > 0) {
          mergedLog = [...exporterLog, ...(log || [])]
        }
      } catch {
        // Non-fatal: save with the importer's log only.
      }
    }

    try {
      await supabaseSaveMatchResult(matchId, finalScore1, finalScore2, winnerTeamId, mergedLog, sets)

      if (tournament?.knockout) {
        const isFinal = tournament.knockout.rounds.some(
          r => r.id === 'final' && r.matches.some(m => m.id === matchId)
        )

        if (isFinal) {
          // Bracket advancement and tournament completion must be awaited for the
          // final so the status is committed before we navigate back to the podium.
          await advanceKnockoutAfterMatch(matchId, winnerTeamId, tournament.knockout)
          const match = tournament.knockout.rounds.find(r => r.id === 'final').matches.find(m => m.id === matchId)
          const runnerUpId = match.team1 === winnerTeamId ? match.team2 : match.team1
          await completeTournament(tid, winnerTeamId, runnerUpId)
          createNotificationsForLeagueMembers(
            id,
            'tournament_finished',
            '🏆 Tournament finished!',
            `${tournament.name} has ended`,
            { leagueId: id, tournamentId: tid },
          ).catch(err => console.error('Failed to send tournament-finished notifications:', err))
        } else {
          // For non-final matches, bracket advancement is fire-and-forget.
          advanceKnockoutAfterMatch(matchId, winnerTeamId, tournament.knockout)
            .catch(err => console.error('Background bracket advancement failed:', err))
        }
      }
    } catch (err) {
      console.error('Failed to save match result:', err)
      showError(err, 'Failed to save match result')
      setIsSaving(false)
      return
    }

    try { localStorage.removeItem(SAVE_KEY) } catch { /* ignored */ }
    navigate(`/league/${id}/tournament/${tid}`, {
      state: { tab: 'matches', subTab: getReturnSubTab() },
    })
  }

  // Show spinner while league or role data is loading
  if (leagueLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <BallSpinner size={36} />
      </div>
    )
  }

  // Redirect viewers away from the live match screen (admins are always allowed)
  if (canScore === false && isAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-2">
        <div className="text-[18px] font-bold">Access Denied</div>
        <div className="text-[13px] text-dim">Only scorers and admins can record match scores.</div>
        <button
          onClick={() => navigate(`/league/${id}/tournament/${tid}`, {
            state: { tab: 'matches', subTab: getReturnSubTab() },
          })}
          className="mt-4 text-[13px] text-accent font-semibold bg-transparent border-0 cursor-pointer"
        >
          ← Back to tournament
        </button>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        Match not found
      </div>
    )
  }

  // ── Modals / Overlays ──

  if (showQRImport) {
    return (
      <Suspense fallback={null}>
        <QRImportModal onImport={handleQRImport} onClose={() => setShowQRImport(false)} />
      </Suspense>
    )
  }

  if (live.showRestore) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text p-6">
        <div className="bg-surface border border-accent p-6 rounded-2xl max-w-[320px] text-center shadow-[0_0_20px_rgba(var(--c-accent),0.3)]">
          <div className="text-[32px] mb-3">🔄</div>
          <div className="text-[16px] font-bold mb-2">Resume match?</div>
          <div className="text-[12px] text-dim mb-6">You have an unfinished live match saved.</div>
          <button onClick={live.restoreGame} className="w-full py-3 bg-accent text-white font-bold rounded-xl mb-3 border-0">
            Resume Match
          </button>
          <button onClick={() => setShowQRImport(true)} className="w-full py-3 bg-surface text-dim font-bold rounded-xl border border-line mb-3">
            📷 Scan QR instead
          </button>
          <button onClick={live.discardSaved} className="w-full py-3 bg-error/10 text-error font-bold rounded-xl border border-error/20">
            Discard & Start New
          </button>
        </div>
      </div>
    )
  }

  if (!live.gameStarted) {
    return (
      <LiveMatchSetup
        live={live}
        tournament={tournament}
        onBack={() => navigate(`/league/${id}/tournament/${tid}`, { state: { tab: 'matches', subTab: getReturnSubTab() } })}
        onScanQR={() => setShowQRImport(true)}
        onPersistServeOrder={(teamId, order) => { saveTeamServeOrder(teamId, order).catch(() => {}) }}
      />
    )
  }

  // ── In-game (delegates to shared LiveScoreboard) ──────────────────────────
  return (
    <LiveScoreboard
      live={live}
      teams={tournament.teams || []}
      players={league.players || []}
      setsPerMatch={tournament.setsPerMatch || 1}
      activeMatchId={mid}
      accent="accent"
      onSaveResult={handleSaveResult}
      isSaving={isSaving}
      enableQR
      enableBattery
      getQRPayload={getQRPayload}
      onQRExportDone={handleQRExportDone}
    />
  )
}


