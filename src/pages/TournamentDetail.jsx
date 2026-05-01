import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { useAuth } from '../contexts/AuthContext'
import {
  saveMatchResult as supabaseSaveMatchResult,
  saveKnockoutRounds,
  updateTournamentPhase,
  advanceKnockoutAfterMatch,
  completeTournament,
  renameTeam,
  fetchMatchScorer,
  claimMatchScorer,
  deleteTournament,
  updateTieBreakerConfig,
} from '../services/tournamentService'
import { createNotification, createNotificationsForLeagueMembers } from '../services/notificationService'
import { buildKnockout } from '../lib/tournament'
import TournamentStatsScreen from '../components/TournamentStatsScreen'
import { PillTabs } from '../components/ui-new'
import { useToast } from '../components/ToastContext'
import TournamentHeader from '../components/tournament/TournamentHeader'
import StandingsTab from '../components/tournament/StandingsTab'
import MatchesTab from '../components/tournament/MatchesTab'
import PositionsTab from '../components/tournament/PositionsTab'
import MatchStatsOverlay from '../components/tournament/MatchStatsOverlay'
import StartMatchModal from '../components/tournament/StartMatchModal'
import ScorerConflictModal from '../components/tournament/ScorerConflictModal'

export default function TournamentDetail() {
  const navigate    = useNavigate()
  const { id, tid } = useParams()
  const location    = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'standings')
  const { showError } = useToast()

  const { league, loading, refetch } = useLeague(id)
  const { canScore, canManage, isAdmin } = useLeagueRole(id)
  const { session, profile } = useAuth()
  const tournament    = league?.tournaments?.find(t => t.id === tid) || null
  const leaguePlayers = league?.players || []

  const isGuest = !session

  // ── Overlay state ──────────────────────────────────────────────────────────
  const [showTournamentStats, setShowTournamentStats] = useState(false)
  const [selectedStatsMatch,  setSelectedStatsMatch]  = useState(null)

  // ── Header / delete state ──────────────────────────────────────────────────
  const [deleting, setDeleting] = useState(false)

  // ── Start-match modal state ────────────────────────────────────────────────
  const [selectedMatch,   setSelectedMatch]   = useState(null)
  const [showScoreForm,   setShowScoreForm]   = useState(false)
  const [manualScore1,    setManualScore1]    = useState('0')
  const [manualScore2,    setManualScore2]    = useState('0')
  const [conflictScorer,  setConflictScorer]  = useState(null)
  const [checkingScorer,  setCheckingScorer]  = useState(false)
  const [savingScore,     setSavingScore]     = useState(false)

  // ── Tie-breaker state (shared across all tournament tabs, persisted to DB) ──
  const DEFAULT_TB = { tieBreakerMode: 'id', seedMap: {}, drawMap: {} }
  const [tbOptions, setTbOptions] = useState(
    () => tournament?.tieBreakerConfig ?? DEFAULT_TB
  )
  // Keep a ref so the debounce effect always has the latest tid without re-running
  const tbDebounceRef = useRef(null)
  useEffect(() => {
    if (!tid) return
    clearTimeout(tbDebounceRef.current)
    tbDebounceRef.current = setTimeout(() => {
      updateTieBreakerConfig(tid, tbOptions).catch(err =>
        console.error('Failed to save tie-breaker config:', err)
      )
    }, 500)
    return () => clearTimeout(tbDebounceRef.current)
  }, [tbOptions, tid])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-2">
        <div className="text-[18px] font-bold">Tournament not found</div>
        <button
          onClick={() => navigate(`/league/${id}`)}
          className="text-[13px] text-accent font-semibold bg-transparent border-0 cursor-pointer"
        >
          ← Back to league
        </button>
      </div>
    )
  }

  // ── Derive the MatchesTab sub-tab id for a given match ────────────────────
  const subTabForMatch = (match) => {
    if (!match || !tournament) return undefined
    const g = tournament.groups?.find(gr => gr.matches?.some(m => m.id === match.id))
    if (g) return `g_${g.id}`
    const inKnockout = tournament.knockout?.rounds?.some(r => r.matches?.some(m => m.id === match.id))
    return inKnockout ? 'knockout' : undefined
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRenameTeam = async (teamId, newName) => {
    await renameTeam(teamId, newName)
    refetch()
  }

  const handleStartMatchClick = (match) => {
    setSelectedMatch(match)
    setShowScoreForm(false)
    setManualScore1('0')
    setManualScore2('0')
  }

  const handleCloseModal = () => {
    setSelectedMatch(null)
    setShowScoreForm(false)
  }

  const handlePlayLive = async () => {
    setCheckingScorer(true)
    const info = await fetchMatchScorer(selectedMatch.id)
    setCheckingScorer(false)
    if (info && !info.played && info.scorerUserId && info.scorerUserId !== profile?.id) {
      setConflictScorer({ name: info.scorerName || 'Someone' })
      return
    }
    claimMatchScorer(selectedMatch.id, profile?.id)
    navigate(`/league/${id}/tournament/${tid}/match/${selectedMatch.id}`, {
      state: { tab: 'matches', subTab: subTabForMatch(selectedMatch) },
    })
  }

  const handleSaveManualScore = async () => {
    if (savingScore) return
    const s1 = parseInt(manualScore1, 10)
    const s2 = parseInt(manualScore2, 10)
    if (isNaN(s1) || isNaN(s2) || s1 === s2) return

    const winnerId = s1 > s2 ? selectedMatch.team1 : selectedMatch.team2
    setSavingScore(true)

    try {
      await supabaseSaveMatchResult(selectedMatch.id, s1, s2, winnerId)

      const team1 = tournament.teams?.find(t => t.id === selectedMatch.team1)
      const team2 = tournament.teams?.find(t => t.id === selectedMatch.team2)
      const t1Name = team1?.name || 'Team 1'
      const t2Name = team2?.name || 'Team 2'
      const playerUserIds = [
        ...(team1?.players || []),
        ...(team2?.players || []),
      ]
        .map(pid => leaguePlayers.find(p => p.id === pid)?.userId)
        .filter(Boolean)
      const uniqueUserIds = [...new Set(playerUserIds)]
      await Promise.all(
        uniqueUserIds.map(userId => {
          const myTeam = (team1?.players || []).includes(
            leaguePlayers.find(p => p.userId === userId)?.id
          ) ? team1 : team2
          const won = myTeam?.id === winnerId
          return createNotification(
            userId,
            'match_result',
            won ? 'You won! 🎉' : 'Match result 📋',
            `${t1Name} ${s1} – ${s2} ${t2Name}`,
            { matchId: selectedMatch.id, tournamentId: tid, leagueId: id },
          )
        })
      )

      if (tournament.knockout) {
        await advanceKnockoutAfterMatch(selectedMatch.id, winnerId, tournament.knockout)
        const isFinal = tournament.knockout.rounds.some(
          r => r.id === 'final' && r.matches.some(m => m.id === selectedMatch.id)
        )
        if (isFinal) {
          const runnerUpId = selectedMatch.team1 === winnerId ? selectedMatch.team2 : selectedMatch.team1
          await completeTournament(tid, winnerId, runnerUpId)
          await createNotificationsForLeagueMembers(
            id,
            'tournament_finished',
            '🏆 Tournament finished!',
            `${tournament.name} has ended`,
            { leagueId: id, tournamentId: tid },
          )
        }
      }
      handleCloseModal()
      refetch()
    } catch (err) {
      console.error('Failed to save match result:', err)
      showError(err, 'Failed to save match result')
    } finally {
      setSavingScore(false)
    }
  }

  const handleGenerateKnockout = async () => {
    // Flush any pending debounced save so the DB is up-to-date before we read it back
    clearTimeout(tbDebounceRef.current)
    try {
      await updateTieBreakerConfig(tid, tbOptions)
      const knockout = buildKnockout(tournament.groups, tbOptions)
      await saveKnockoutRounds(tid, knockout.rounds)
      await updateTournamentPhase(tid, 'knockout')
      refetch()
    } catch (err) {
      console.error('Failed to generate knockout:', err)
      showError(err, 'Failed to generate knockout')
    }
  }

  const handleDeleteTournament = async () => {
    if (!window.confirm(`Delete "${tournament.name}"? This cannot be undone — all matches and team data will be lost.`)) return
    setDeleting(true)
    try {
      await deleteTournament(tid)
      navigate(`/league/${id}`)
    } catch (err) {
      showError(err, 'Failed to delete tournament')
      setDeleting(false)
    }
  }

  return (
    <div className="screen bg-bg text-text">

      {/* ── Tournament Stats Full-screen Overlay ── */}
      {showTournamentStats && (
        <TournamentStatsScreen
          tournament={tournament}
          leaguePlayers={leaguePlayers}
          onClose={() => setShowTournamentStats(false)}
          tbOptions={tbOptions}
          onTbOptionsChange={setTbOptions}
        />
      )}

      {/* ── Match Stats Full-screen Overlay ── */}
      {selectedStatsMatch && (
        <MatchStatsOverlay
          match={selectedStatsMatch}
          tournament={tournament}
          leaguePlayers={leaguePlayers}
          isAdmin={isAdmin && !isGuest}
          leagueId={id}
          tournamentId={tid}
          navigate={navigate}
          onClose={() => setSelectedStatsMatch(null)}
          onSaved={refetch}
        />
      )}

      {/* ── Header ── */}
      <TournamentHeader
        tournament={tournament}
        league={league}
        onBack={() => navigate(`/league/${id}`)}
        isAdmin={isAdmin && !isGuest}
        onDelete={handleDeleteTournament}
        deleting={deleting}
      />

      {/* ── Tournament Complete Banner ── */}
      {tournament.status === 'completed' && (
        <button
          onClick={() => setShowTournamentStats(true)}
          className="mx-4 mb-3 w-[calc(100%-2rem)] min-h-[44px] rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-accent/20 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[20px]">🏆</span>
            <div className="text-left">
              <div className="text-[13px] font-bold text-accent leading-tight">Tournament Complete</div>
              <div className="text-[11px] text-dim">See full stats &amp; awards</div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* ── Pill tabs ── */}
      <PillTabs
        items={[
          { id: 'standings', label: 'Standings' },
          { id: 'matches',   label: 'Matches'   },
          { id: 'positions', label: 'Positions' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* ── Tab content ── */}
      <main className="screen__body pb-6 relative">
        {activeTab === 'standings' && (
          <StandingsTab
            tournament={tournament}
            onGenerateKnockout={handleGenerateKnockout}
            onMatchClick={m => setSelectedStatsMatch(m)}
            canManage={canManage}
            players={leaguePlayers}
            tbOptions={tbOptions}
            onTbOptionsChange={setTbOptions}
          />
        )}
        {activeTab === 'matches' && (
          <MatchesTab
            tournament={tournament}
            onStartMatch={handleStartMatchClick}
            onMatchClick={m => setSelectedStatsMatch(m)}
            canScore={canScore}
            players={leaguePlayers}
            initialSubTab={location.state?.subTab}
          />
        )}
        {activeTab === 'positions' && (
          <PositionsTab
            tournament={tournament}
            leaguePlayers={leaguePlayers}
            currentUserId={profile?.id}
            isAdmin={isGuest ? false : isAdmin}
            onRenameTeam={handleRenameTeam}
            tbOptions={tbOptions}
            onTbOptionsChange={setTbOptions}
          />
        )}
      </main>

      {/* ── Start Match Modal ── */}
      {selectedMatch && (
        <StartMatchModal
          match={selectedMatch}
          tournament={tournament}
          leaguePlayers={leaguePlayers}
          showScoreForm={showScoreForm}
          manualScore1={manualScore1}
          manualScore2={manualScore2}
          checkingScorer={checkingScorer}
          savingScore={savingScore}
          onPlayLive={handlePlayLive}
          onShowScoreForm={() => setShowScoreForm(true)}
          onScore1Change={setManualScore1}
          onScore2Change={setManualScore2}
          onSaveScore={handleSaveManualScore}
          onClose={handleCloseModal}
        />
      )}

      {/* ── Scorer Conflict Modal ── */}
      {conflictScorer && (
        <ScorerConflictModal
          scorerName={conflictScorer.name}
          onGoBack={() => setConflictScorer(null)}
          onContinue={() => {
            claimMatchScorer(selectedMatch.id, profile?.id)
            setConflictScorer(null)
            navigate(`/league/${id}/tournament/${tid}/match/${selectedMatch.id}`, {
              state: { tab: 'matches', subTab: subTabForMatch(selectedMatch) },
            })
          }}
        />
      )}

    </div>
  )
}
