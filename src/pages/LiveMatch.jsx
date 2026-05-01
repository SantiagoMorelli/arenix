import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { useLiveGame, SAVE_KEY, loadSaved } from '../hooks/useLiveGame'
import { saveMatchResult as supabaseSaveMatchResult, advanceKnockoutAfterMatch, completeTournament, releaseMatchScorer } from '../services/tournamentService'
import { createNotification, createNotificationsForLeagueMembers } from '../services/notificationService'
import LiveScoreboard from '../components/LiveScoreboard'
const QRImportModal = lazy(() => import('../components/QRImportModal'))
import { useToast } from '../components/ToastContext'

function teamName(teams, id) {
  return teams.find(t => t.id === id)?.name || '?'
}

// ─── Inline icons ─────────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    {children}
  </svg>
)
const BackIcon = () => <Svg><polyline points="15 18 9 12 15 6" /></Svg>

const REMINDER_KEY = 'bv_battery_reminder_seen'

function LiveMatchSetup({ live, tournament, onBack, onScanQR }) {
  const [reminderSeen, setReminderSeen] = useState(
    () => !!localStorage.getItem(REMINDER_KEY)
  )

  const dismissReminder = () => {
    localStorage.setItem(REMINDER_KEY, '1')
    setReminderSeen(true)
  }
  const t1Name = teamName(tournament.teams, live.team1Id)
  const t2Name = teamName(tournament.teams, live.team2Id)

  const handleMoveUp1 = (idx) => live.setT1ServeOrder(o => {
    const n = [...o]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n
  })
  const handleMoveUp2 = (idx) => live.setT2ServeOrder(o => {
    const n = [...o]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n
  })

  const handleSetSide = (sideStr) => {
    live.setT1InitialSide(sideStr)
    live.setSide({ t1: sideStr, t2: sideStr === 'left' ? 'right' : 'left' })
  }

  const canStart = live.t1ServeOrder?.length > 0 && live.t2ServeOrder?.length > 0

  return (
    <div className="screen bg-bg text-text p-4">
      <div className="flex items-center justify-between mt-2 mb-6">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center bg-surface border border-line rounded-xl text-text"
        >
          <BackIcon />
        </button>
        <h1 className="text-[20px] font-black text-accent uppercase tracking-widest m-0">
          Match Setup
        </h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="screen__body flex flex-col gap-6 max-w-[400px] w-full mx-auto pb-8">
        {/* One-time battery reminder */}
        {!reminderSeen && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 flex gap-3 items-start">
            <span className="text-[22px] shrink-0">🔋</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-text mb-1">Check your battery</div>
              <div className="text-[12px] text-dim leading-relaxed">
                Make sure your phone is charged before scoring. If your battery dies, you can export the score via QR so someone else can take over.
              </div>
              <button
                onClick={dismissReminder}
                className="mt-3 text-[12px] font-bold text-accent bg-transparent border-0 cursor-pointer p-0"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* Serve Order */}
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-4 text-center">
            Serving Order
          </div>
          <div className="flex gap-4">
            {/* Team 1 */}
            <div className="flex-1">
              <div className="text-[12px] font-bold text-accent mb-2 text-center truncate">{t1Name}</div>
              <div className="flex flex-col gap-2">
                {live.t1ServeOrder.map((pid, idx) => (
                  <div key={pid} className={`flex items-center gap-2 p-2 rounded-lg border ${idx === 0 ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-bg border-line text-text'}`}>
                    <span className="text-[10px] font-bold w-4 h-4 rounded-full bg-current text-white flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[12px] font-bold truncate flex-1">{live.playerName(pid)}</span>
                    {idx > 0 && (
                      <button onClick={() => handleMoveUp1(idx)} className="text-[14px] text-dim bg-transparent border-0 cursor-pointer p-0 leading-none shrink-0">↑</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Team 2 */}
            <div className="flex-1">
              <div className="text-[12px] font-bold text-text mb-2 text-center truncate">{t2Name}</div>
              <div className="flex flex-col gap-2">
                {live.t2ServeOrder.map((pid, idx) => (
                  <div key={pid} className={`flex items-center gap-2 p-2 rounded-lg border ${idx === 0 ? 'bg-text/10 border-line text-text' : 'bg-bg border-line text-text'}`}>
                    <span className="text-[10px] font-bold w-4 h-4 rounded-full bg-current text-white flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[12px] font-bold truncate flex-1">{live.playerName(pid)}</span>
                    {idx > 0 && (
                      <button onClick={() => handleMoveUp2(idx)} className="text-[14px] text-dim bg-transparent border-0 cursor-pointer p-0 leading-none shrink-0">↑</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* First Serve */}
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-3 text-center">
            Who serves first?
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => live.setFirstServingTeam(1)}
              className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold truncate px-2 transition-all ${live.firstServingTeam === 1 ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-bg text-dim'}`}
            >
              🏐 {t1Name}
            </button>
            <button 
              onClick={() => live.setFirstServingTeam(2)}
              className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold truncate px-2 transition-all ${live.firstServingTeam === 2 ? 'border-text/40 bg-text/5 text-text' : 'border-line bg-bg text-dim'}`}
            >
              🏐 {t2Name}
            </button>
          </div>
        </div>

        {/* Sides */}
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-3 text-center">
            {t1Name} starts on the...
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleSetSide('left')}
              className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold transition-all ${live.t1InitialSide === 'left' ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-bg text-dim'}`}
            >
              Left Side
            </button>
            <button 
              onClick={() => handleSetSide('right')}
              className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold transition-all ${live.t1InitialSide === 'right' ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-bg text-dim'}`}
            >
              Right Side
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-w-[400px] w-full mx-auto shrink-0">
        <button
          onClick={() => { live.setPointsToWin(21); live.startGame() }}
          disabled={!canStart}
          className="w-full py-4 rounded-xl bg-accent text-white font-black text-[16px] uppercase tracking-widest active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Match
        </button>
        <button
          onClick={onScanQR}
          className="w-full py-3 text-[13px] font-bold text-dim bg-transparent border-0 cursor-pointer active:text-text"
        >
          📷 Resume from QR
        </button>
      </div>
    </div>
  )
}

export default function LiveMatch() {
  const navigate = useNavigate()
  const { id, tid, mid } = useParams()
  const location = useLocation()
  const { showError, showSuccess } = useToast()

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
    setsPerMatch: tournament?.setsPerMatch || 1
  })

  const [showQRImport, setShowQRImport] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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
  })

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
      log: [],
      history: [],
    }
  }

  const handleQRImport = (parsedState) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(parsedState))
      live.restoreGame()
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

    try {
      await supabaseSaveMatchResult(matchId, finalScore1, finalScore2, winnerTeamId, log, sets)

      // Notify players of match result
      const leaguePlayers = league?.players || []
      const team1 = tournament.teams?.find(t => t.id === live.team1Id)
      const team2 = tournament.teams?.find(t => t.id === live.team2Id)
      const t1Name = team1?.name || 'Team 1'
      const t2Name = team2?.name || 'Team 2'
      const allPlayerIds = [...(team1?.players || []), ...(team2?.players || [])]
      const uniqueUserIds = [...new Set(
        allPlayerIds.map(pid => leaguePlayers.find(p => p.id === pid)?.userId).filter(Boolean)
      )]
      await Promise.all(
        uniqueUserIds.map(userId => {
          const myPlayer = leaguePlayers.find(p => p.userId === userId)
          const myTeam = (team1?.players || []).includes(myPlayer?.id) ? team1 : team2
          const won = myTeam?.id === winnerTeamId
          return createNotification(
            userId,
            'match_result',
            won ? 'You won! 🎉' : 'Match result 📋',
            `${t1Name} ${finalScore1} – ${finalScore2} ${t2Name}`,
            { matchId, tournamentId: tid, leagueId: id },
          )
        })
      )

      if (tournament?.knockout) {
        await advanceKnockoutAfterMatch(matchId, winnerTeamId, tournament.knockout)

        // Check if this was the final match
        const isFinal = tournament.knockout.rounds.some(
          r => r.id === 'final' && r.matches.some(m => m.id === matchId)
        )
        if (isFinal) {
          const match = tournament.knockout.rounds.find(r => r.id === 'final').matches.find(m => m.id === matchId)
          const runnerUpId = match.team1 === winnerTeamId ? match.team2 : match.team1
          await completeTournament(tid, winnerTeamId, runnerUpId)
          await createNotificationsForLeagueMembers(
            id,
            'tournament_finished',
            '🏆 Tournament finished!',
            `${tournament.name} has ended`,
            { leagueId: id, tournamentId: tid },
          )
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
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
    return <LiveMatchSetup live={live} tournament={tournament} onBack={() => navigate(`/league/${id}/tournament/${tid}`, { state: { tab: 'matches', subTab: getReturnSubTab() } })} onScanQR={() => setShowQRImport(true)} />
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
    />
  )
}


