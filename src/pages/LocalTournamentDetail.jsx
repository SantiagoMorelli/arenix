/**
 * LocalTournamentDetail — /local/:tid
 *
 * The orchestrator for a device-only tournament. Deliberately thinner than
 * TournamentDetail: there is no scorer lock to claim, no notifications to fan
 * out, no Elo to process and no league to navigate back to. What remains is the
 * tournament itself, rendered through the same StandingsTab / MatchesTab /
 * StatsTab the league flow uses.
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Download, WifiOff } from 'lucide-react'
import { useLocalTournament } from '../hooks/useLocalTournament'
import {
  saveLocalKnockout,
  updateLocalTieBreakerConfig,
  renameLocalTeam,
  completeLocalTournament,
  exportLocalTournament,
} from '../services/localTournamentService'
import { buildKnockout, buildFinalOnly } from '../lib/tournament'
import { resolveScoringLevel } from '../lib/scoring'
import { PillTabs, ConfirmModal, BallSpinner } from '../components/ui-new'
import StandingsTab from '../components/tournament/StandingsTab'
import MatchesTab from '../components/tournament/MatchesTab'
import StatsTab from '../components/tournament/StatsTab'
import TournamentStatsScreen from '../components/TournamentStatsScreen'
import StatusBadge from '../components/tournament/StatusBadge'
import { useToast } from '../contexts/ToastContext'

export default function LocalTournamentDetail() {
  const navigate = useNavigate()
  const { tid }  = useParams()
  const { showError, showSuccess } = useToast()

  const { tournament, players, loading, apply } = useLocalTournament(tid)

  const [activeTab, setActiveTab] = useState('standings')
  const [showStats, setShowStats] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [confirm, setConfirm] = useState(null)

  // null = untouched this session, so fall back to what was stored. Derived
  // rather than seeded from an effect, which would cascade a render.
  const [tbEdits, setTbEdits] = useState(null)
  const tbOptions = tbEdits ?? tournament?.tieBreakerConfig ?? null

  // Persist tie-breaker choices, debounced — the user drags seeds around and we
  // do not want a write per frame.
  const tbTimer = useRef(null)
  useEffect(() => {
    if (!tid || tbEdits === null) return
    clearTimeout(tbTimer.current)
    tbTimer.current = setTimeout(() => {
      updateLocalTieBreakerConfig(tid, tbEdits).catch(() => {})
    }, 500)
    return () => clearTimeout(tbTimer.current)
  }, [tbEdits, tid])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        <BallSpinner size={32} />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-2 px-6 text-center">
        <div className="text-[18px] font-bold">Tournament not found</div>
        <div className="text-[13px] text-dim">
          It is not stored on this device. Local tournaments do not follow you
          between phones or browsers.
        </div>
        <button
          onClick={() => navigate('/local')}
          className="mt-4 text-[13px] text-accent font-semibold bg-transparent border-0 cursor-pointer"
        >
          ← Local tournaments
        </button>
      </div>
    )
  }

  const scoringLevel = resolveScoringLevel(tournament, null)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleStartMatch = (match) => {
    navigate(`/local/${tid}/match/${match.id}`)
  }

  const handleRenameTeam = async (teamId, newName) => {
    try {
      apply(await renameLocalTeam(tid, teamId, newName))
    } catch (err) {
      showError(err, 'Could not rename the team')
    }
  }

  const handleGenerateKnockout = async (rowsOrEvent) => {
    if (generating) return
    setGenerating(true)
    try {
      // Flush the debounced tie-breaker write so the bracket is seeded from
      // what the user actually sees.
      clearTimeout(tbTimer.current)
      if (tbEdits) await updateLocalTieBreakerConfig(tid, tbEdits)

      const hasGroups = (tournament.groups || []).length > 0
      const knockout = hasGroups
        ? buildKnockout(tournament.groups, tbOptions)
        : buildFinalOnly(Array.isArray(rowsOrEvent) ? rowsOrEvent : [])

      apply(await saveLocalKnockout(tid, knockout.rounds))
    } catch (err) {
      showError(err, 'Could not generate the knockout')
    } finally {
      setGenerating(false)
    }
  }

  const handleFinish = () => setConfirm({
    title: 'Finish tournament?',
    message: 'Standings are locked in as final. You can still export the results afterwards.',
    confirmLabel: 'Finish',
    variant: 'accent',
    onConfirm: async () => {
      setConfirm(null)
      try {
        apply(await completeLocalTournament(tid))
      } catch (err) {
        showError(err, 'Could not finish the tournament')
      }
    },
  })

  const handleExport = async () => {
    try {
      const { filename, json } = await exportLocalTournament(tid)
      const blob = new Blob([json], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showSuccess('Backup saved')
    } catch (err) {
      showError(err, 'Could not export the tournament')
    }
  }

  const isCompleted = tournament.status === 'completed'

  return (
    <div className="screen bg-bg text-text">
      {/* ── Header ── */}
      <div className="screen__top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/local')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-line cursor-pointer text-text flex-shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-bold leading-tight truncate">{tournament.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge tournament={tournament} />
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-dim">
                <WifiOff size={11} /> This phone only
              </span>
            </div>
          </div>
          <button
            onClick={handleExport}
            aria-label="Export backup"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-line cursor-pointer text-dim flex-shrink-0"
          >
            <Download size={17} />
          </button>
        </div>

        <PillTabs
          items={[
            { id: 'standings', label: 'Standings' },
            { id: 'matches',   label: 'Matches'   },
            { id: 'stats',     label: 'Stats'     },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <main className="screen__body">
        {activeTab === 'standings' && (
          <StandingsTab
            tournament={tournament}
            players={players}
            canManage
            isAdmin
            tbOptions={tbOptions}
            onTbOptionsChange={setTbEdits}
            onGenerateKnockout={handleGenerateKnockout}
            isGeneratingKnockout={generating}
            onRenameTeam={handleRenameTeam}
            onMatchClick={handleStartMatch}
          />
        )}

        {activeTab === 'matches' && (
          <MatchesTab
            tournament={tournament}
            players={players}
            canScore
            onStartMatch={handleStartMatch}
            onMatchClick={handleStartMatch}
          />
        )}

        {activeTab === 'stats' && (
          <StatsTab
            tournament={tournament}
            players={players}
            scoringLevel={scoringLevel}
          />
        )}

        <div className="px-4 py-6 flex flex-col gap-2 max-w-[430px] mx-auto w-full">
          {isCompleted ? (
            <button
              onClick={() => setShowStats(true)}
              className="w-full py-3 rounded-xl bg-accent text-white text-[13px] font-bold border-0 cursor-pointer"
            >
              🏆 View results
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-xl bg-surface border border-line text-[13px] font-bold text-dim cursor-pointer"
            >
              Finish tournament
            </button>
          )}
          <div className="text-[11px] text-dim text-center leading-snug px-2">
            Stored in this browser only. Export a backup if you want to keep it.
          </div>
        </div>
      </main>

      {showStats && (
        <TournamentStatsScreen
          tournament={tournament}
          league={null}
          leaguePlayers={players}
          tbOptions={tbOptions}
          onTbOptionsChange={setTbEdits}
          isAdmin
          onClose={() => setShowStats(false)}
        />
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        confirmVariant={confirm?.variant || 'error'}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
