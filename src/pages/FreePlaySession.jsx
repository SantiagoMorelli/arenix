import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useFreePlay } from '../hooks/useFreePlay'
import { getMyLeagues } from '../services/leagueService'
import { PillTabs } from '../components/ui-new'
import { useToast } from '../components/ToastContext'
import FreePlayStatsScreen from '../components/FreePlayStatsScreen'
import SessionHeader from '../components/freeplay/SessionHeader'
import PlayersTab from '../components/freeplay/PlayersTab'
import TeamsTab from '../components/freeplay/TeamsTab'
import MatchesTab from '../components/freeplay/MatchesTab'
import RankingTab from '../components/freeplay/RankingTab'
import AddPlayerModal from '../components/freeplay/AddPlayerModal'
import TeamModal from '../components/freeplay/TeamModal'
import EditSessionModal from '../components/freeplay/EditSessionModal'
import MatchStatsOverlay from '../components/freeplay/MatchStatsOverlay'
import ResumeMatchModal from '../components/freeplay/ResumeMatchModal'

export default function FreePlaySession() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id }   = useParams()
  const { showError } = useToast()

  const {
    session, loading, error, isAdmin,
    addPlayer, removePlayer,
    createTeam, updateTeam, deleteTeam,
    startGame, finishSession, deleteSession, updateSession, inviteLink,
  } = useFreePlay(id)

  // Tabs
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'players')

  // Chrome state
  const [confirmEnd,    setConfirmEnd]    = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied,        setCopied]        = useState(false)
  const [showSessionStats, setShowSessionStats] = useState(false)

  // Modals
  const [showAddPlayer,   setShowAddPlayer]   = useState(false)
  const [showTeamModal,   setShowTeamModal]   = useState(false)
  const [editingTeam,     setEditingTeam]     = useState(null)
  const [showEditSession, setShowEditSession] = useState(false)
  const [leagues,         setLeagues]         = useState([])

  // Match stats overlay
  const [selectedStatsMatch, setSelectedStatsMatch] = useState(null)

  // Player removal
  const [removingId, setRemovingId] = useState(null)

  // Match start state
  const [team1Id,          setTeam1Id]          = useState('')
  const [team2Id,          setTeam2Id]          = useState('')
  const [setsPerMatch,     setSetsPerMatch]      = useState(1)
  const [startingMatch,    setStartingMatch]     = useState(false)
  const [startError,       setStartError]        = useState('')
  const [confirmingResume, setConfirmingResume]  = useState(null)

  const isFinished = session?.status === 'finished'

  // Load leagues lazily when edit session modal opens
  useEffect(() => {
    if (!showEditSession) return
    if (leagues.length > 0) return
    getMyLeagues().then(setLeagues).catch(console.error)
  }, [showEditSession, leagues.length])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleFinishSession = async () => {
    setConfirmEnd(false)
    try {
      await finishSession()
      setShowSessionStats(true)
    } catch (err) {
      console.error(err)
      showError(err, 'Failed to finish session')
    }
  }

  const handleDeleteSession = async () => {
    setConfirmDelete(false)
    try {
      await deleteSession()
      navigate('/free-play')
    } catch (err) {
      console.error(err)
      showError(err, 'Failed to delete session')
    }
  }

  const handleRemovePlayer = async (playerId) => {
    setRemovingId(playerId)
    try { await removePlayer(playerId) }
    finally { setRemovingId(null) }
  }

  const handleStartMatch = async () => {
    if (!team1Id || !team2Id || team1Id === team2Id) return
    setStartingMatch(true)
    setStartError('')
    try {
      const game = await startGame(team1Id, team2Id, setsPerMatch)
      navigate(`/free-play/${id}/match`, { state: { gameId: game.id, setsPerMatch, team1Id, team2Id } })
    } catch (err) {
      console.error(err)
      showError(err, 'Failed to start match')
      setStartError(err?.message || JSON.stringify(err) || 'Unknown error')
      setStartingMatch(false)
    }
  }

  const handleResumeMatch = (pendingGame) => {
    setConfirmingResume(pendingGame)
  }

  const handleConfirmResume = () => {
    const game = confirmingResume
    setConfirmingResume(null)
    navigate(`/free-play/${id}/match`, {
      state: {
        gameId:       game.id,
        team1Id:      game.team1Id,
        team2Id:      game.team2Id,
        setsPerMatch: game.setsPerMatch ?? 1,
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-free border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-3">
        <div className="text-[15px] font-bold">Session not found</div>
        <button onClick={() => navigate('/free-play')} className="text-[13px] text-free font-semibold bg-transparent border-0 cursor-pointer">
          ← Back to Free Play
        </button>
      </div>
    )
  }

  const pendingGame = session.games.find(g => !g.played) || null

  return (
    <div className="screen bg-bg text-text">

      {/* ── Header ── */}
      <SessionHeader
        session={session}
        isAdmin={isAdmin}
        isFinished={isFinished}
        onBack={() => navigate('/free-play')}
        onEditSession={() => setShowEditSession(true)}
        onCopyLink={handleCopyLink}
        copied={copied}
        onConfirmEnd={() => setConfirmEnd(true)}
        onConfirmDelete={() => setConfirmDelete(true)}
      />

      {/* ── End confirm banner ── */}
      {confirmEnd && (
        <div className="bg-error/10 border-b border-error/20 px-4 py-3 flex items-center justify-between shrink-0">
          <span className="text-[13px] font-bold text-error">End this session?</span>
          <div className="flex gap-3">
            <button onClick={() => setConfirmEnd(false)} className="text-[13px] font-semibold text-dim bg-transparent border-0 cursor-pointer">
              Cancel
            </button>
            <button onClick={handleFinishSession} className="text-[13px] font-bold text-white bg-error px-3 py-1 rounded-lg border-0 cursor-pointer">
              Finish
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirm banner ── */}
      {confirmDelete && (
        <div className="bg-error/10 border-b border-error/20 px-4 py-3 flex items-center justify-between shrink-0">
          <span className="text-[13px] font-bold text-error">Delete this session?</span>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(false)} className="text-[13px] font-semibold text-dim bg-transparent border-0 cursor-pointer">
              Cancel
            </button>
            <button onClick={handleDeleteSession} className="text-[13px] font-bold text-white bg-error px-3 py-1 rounded-lg border-0 cursor-pointer">
              Delete
            </button>
          </div>
        </div>
      )}

      {/* ── Copied toast ── */}
      {copied && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-free text-white text-[12px] font-bold px-4 py-2 rounded-full shadow-lg pointer-events-none">
          Link copied!
        </div>
      )}

      {/* ── Session Complete Banner ── */}
      {isFinished && (
        <button
          onClick={() => setShowSessionStats(true)}
          className="mx-4 mb-3 w-[calc(100%-2rem)] min-h-[44px] rounded-xl bg-free/15 border border-free/40 flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-free/20 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[20px]">🏆</span>
            <div className="text-left">
              <div className="text-[13px] font-bold text-free leading-tight">Session Complete</div>
              <div className="text-[11px] text-dim">See full stats &amp; awards</div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-free flex-shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* ── Tabs nav ── */}
      <PillTabs
        items={[
          { id: 'players',  label: 'Players' },
          { id: 'teams',    label: 'Teams' },
          { id: 'matches',  label: 'Matches' },
          { id: 'ranking',  label: 'Ranking' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
        accent="free"
      />

      {/* ── Body ── */}
      <div className="screen__body pb-10">
        {activeTab === 'players' && (
          <PlayersTab
            session={session}
            isFinished={isFinished}
            isAdmin={isAdmin}
            removingId={removingId}
            copied={copied}
            onOpenAdd={() => setShowAddPlayer(true)}
            onRemovePlayer={handleRemovePlayer}
            onCopyLink={handleCopyLink}
          />
        )}
        {activeTab === 'teams' && (
          <TeamsTab
            session={session}
            isFinished={isFinished}
            isAdmin={isAdmin}
            onNewTeam={() => { setEditingTeam(null); setShowTeamModal(true) }}
            onEditTeam={(team) => { setEditingTeam(team); setShowTeamModal(true) }}
            onDeleteTeam={deleteTeam}
          />
        )}
        {activeTab === 'matches' && (
          <MatchesTab
            session={session}
            isAdmin={isAdmin}
            startingMatch={startingMatch}
            startError={startError}
            onStartMatch={handleStartMatch}
            team1Id={team1Id}
            team2Id={team2Id}
            setTeam1Id={setTeam1Id}
            setTeam2Id={setTeam2Id}
            setsPerMatch={setsPerMatch}
            setSetsPerMatch={setSetsPerMatch}
            onMatchClick={g => setSelectedStatsMatch(g)}
            pendingGame={pendingGame}
            onResumeMatch={() => handleResumeMatch(pendingGame)}
          />
        )}
        {activeTab === 'ranking' && (
          <RankingTab session={session} canManage={isAdmin} />
        )}
        {activeTab === 'ranking' && (
          <RankingTab session={session} />
        )}
      </div>

      {/* ── Modals ── */}
      {showAddPlayer && (
        <AddPlayerModal
          session={session}
          onAdd={addPlayer}
          onClose={() => setShowAddPlayer(false)}
        />
      )}

      {showTeamModal && (
        <TeamModal
          session={session}
          team={editingTeam}
          onSave={editingTeam
            ? (name, playerIds) => updateTeam(editingTeam.id, { name, playerIds })
            : (name, playerIds) => createTeam(name, playerIds)
          }
          onClose={() => setShowTeamModal(false)}
        />
      )}

      {showEditSession && (
        <EditSessionModal
          session={session}
          leagues={leagues}
          onSave={updateSession}
          onClose={() => setShowEditSession(false)}
        />
      )}

      {/* ── Resume Match Modal ── */}
      {confirmingResume && (
        <ResumeMatchModal
          game={confirmingResume}
          session={session}
          onConfirm={handleConfirmResume}
          onCancel={() => setConfirmingResume(null)}
        />
      )}

      {/* ── Match Stats Full-screen Overlay ── */}
      {selectedStatsMatch && (
        <MatchStatsOverlay
          match={selectedStatsMatch}
          session={session}
          onClose={() => setSelectedStatsMatch(null)}
        />
      )}

      {/* ── Session Stats Full-screen Overlay ── */}
      {showSessionStats && (
        <FreePlayStatsScreen
          session={session}
          onClose={() => setShowSessionStats(false)}
        />
      )}

    </div>
  )
}
