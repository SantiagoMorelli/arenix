/**
 * LocalLiveMatch — /local/:tid/match/:mid
 *
 * Scoring a match in a device-only tournament. Much thinner than LiveMatch:
 * there is no scorer to claim or release, no notifications, no partial-log
 * merge, and no QR handoff — that feature round-trips the point log through
 * Supabase, which by definition is not there.
 *
 * The scoring engine itself is the same useLiveGame the league flow runs. It
 * was already offline-first (in-memory state, localStorage crash recovery);
 * the only thing that changes is the save key, so a local match in progress
 * can never overwrite the snapshot of a league match in progress.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocalTournament } from '../hooks/useLocalTournament'
import { useLiveGame } from '../hooks/useLiveGame'
import { saveLocalMatchResult, saveLocalTeamServeOrder } from '../services/localTournamentService'
import LiveMatchSetup from '../components/LiveMatchSetup'
import LiveScoreboard from '../components/LiveScoreboard'
import { BallSpinner } from '../components/ui-new'
import { useToast } from '../contexts/ToastContext'

/** Namespaced so it can never collide with the league match snapshot. */
export const LOCAL_SAVE_KEY = 'arenix_local_live_game'

export default function LocalLiveMatch() {
  const navigate = useNavigate()
  const { tid, mid } = useParams()
  const { showError } = useToast()

  const { tournament, players, loading } = useLocalTournament(tid)
  const [isSaving, setIsSaving] = useState(false)

  const allMatches = [
    ...(tournament?.groups || []).flatMap(g => g.matches),
    ...(tournament?.knockout?.rounds || []).flatMap(r => r.matches),
    ...(tournament?.matches || []),
  ]

  const live = useLiveGame({
    teams: tournament?.teams || [],
    players,
    informalMode: false,
    tournamentMatches: allMatches,
    // Hold the preload until the record has loaded, so the effect fires with a
    // populated match list (it only re-runs when preloadMatchId changes).
    preloadMatchId: tournament ? mid : null,
    setsPerMatch: tournament?.setsPerMatch || 1,
    saveKey: LOCAL_SAVE_KEY,
    tournament,
    league: null,
  })

  const backToTournament = () => navigate(`/local/${tid}`)

  const handleSaveResult = async (matchId, s1Sets, s2Sets, winnerTeamId, log, sets) => {
    if (isSaving) return
    setIsSaving(true)

    const isOneSet = tournament.setsPerMatch === 1
    const finalScore1 = isOneSet ? (live.sets[0]?.s1 ?? live.score1) : s1Sets
    const finalScore2 = isOneSet ? (live.sets[0]?.s2 ?? live.score2) : s2Sets

    try {
      // The service applies the result, advances the bracket and closes the
      // tournament when the final lands — all in one write.
      await saveLocalMatchResult(tid, matchId, finalScore1, finalScore2, winnerTeamId, log, sets)
    } catch (err) {
      showError(err, 'Could not save the result on this device')
      setIsSaving(false)
      return
    }

    try { localStorage.removeItem(LOCAL_SAVE_KEY) } catch { /* ignored */ }
    backToTournament()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <BallSpinner size={36} />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-2 px-6 text-center">
        <div className="text-[18px] font-bold">Match not found</div>
        <button
          onClick={() => navigate('/local')}
          className="mt-4 text-[13px] text-accent font-semibold bg-transparent border-0 cursor-pointer"
        >
          ← Local tournaments
        </button>
      </div>
    )
  }

  if (live.showRestore) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text p-6">
        <div className="bg-surface border border-accent p-6 rounded-2xl max-w-[320px] text-center">
          <div className="text-[32px] mb-3">🔄</div>
          <div className="text-[16px] font-bold mb-2">Resume match?</div>
          <div className="text-[12px] text-dim mb-6">You have an unfinished match saved on this device.</div>
          <button
            onClick={live.restoreGame}
            className="w-full py-3 bg-accent text-white font-bold rounded-xl mb-3 border-0"
          >
            Resume Match
          </button>
          <button
            onClick={live.discardSaved}
            className="w-full py-3 bg-error/10 text-error font-bold rounded-xl border border-error/20"
          >
            Discard &amp; Start New
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
        onBack={backToTournament}
        enableQR={false}
        onPersistServeOrder={(teamId, order) => {
          saveLocalTeamServeOrder(tid, teamId, order).catch(() => {})
        }}
      />
    )
  }

  return (
    <LiveScoreboard
      live={live}
      teams={tournament.teams || []}
      players={players}
      setsPerMatch={tournament.setsPerMatch || 1}
      activeMatchId={mid}
      accent="accent"
      onSaveResult={handleSaveResult}
      isSaving={isSaving}
      enableBattery
    />
  )
}
