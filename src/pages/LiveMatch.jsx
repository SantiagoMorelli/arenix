import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { useAuth } from '../contexts/AuthContext'
import { useLiveGame, SAVE_KEY } from '../hooks/useLiveGame'
import { saveMatchResult as supabaseSaveMatchResult, advanceKnockoutAfterMatch, completeTournament, fetchMatchScorer, claimMatchScorer } from '../services/tournamentService'
import GameStats from '../components/GameStats'

// Mock translation function for useLiveGame (since legacy app passes it down)
const t = (key) => {
  const dict = {
    ptAce: 'Ace', ptAceDesc: 'Direct point from serve',
    ptSpike: 'Spike', ptSpikeDesc: 'Point from attack',
    ptBlock: 'Block', ptBlockDesc: 'Point from block',
    ptTip: 'Tip/Drop', ptTipDesc: 'Point from soft play',
    ptError: 'Error', ptErrorDesc: 'Opponent error'
  }
  return dict[key] || key
}

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

function LiveMatchSetup({ live, tournament, mid, profileId, onBack }) {
  const t1Name = teamName(tournament.teams, live.team1Id)
  const t2Name = teamName(tournament.teams, live.team2Id)

  const [conflictScorer, setConflictScorer] = useState(null) // { name: string } | null
  const [checking, setChecking]             = useState(false)

  const handleSwap1 = () => live.setT1ServeOrder([...live.t1ServeOrder].reverse())
  const handleSwap2 = () => live.setT2ServeOrder([...live.t2ServeOrder].reverse())

  const handleSetSide = (sideStr) => {
    live.setT1InitialSide(sideStr)
    live.setSide({ t1: sideStr, t2: sideStr === 'left' ? 'right' : 'left' })
  }

  const doStartGame = () => {
    live.setPointsToWin(21)
    live.startGame()
  }

  const handleStartMatch = async () => {
    setChecking(true)
    const info = await fetchMatchScorer(mid)
    setChecking(false)
    if (info && !info.played && info.scorerUserId && info.scorerUserId !== profileId) {
      setConflictScorer({ name: info.scorerName || 'Someone' })
      return
    }
    claimMatchScorer(mid, profileId)
    doStartGame()
  }

  const canStart = live.t1ServeOrder?.length > 0 && live.t2ServeOrder?.length > 0

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden p-4">
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

      <div className="flex-1 overflow-y-auto flex flex-col gap-6 max-w-[400px] w-full mx-auto pb-8">
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
                    <span className="text-[12px] font-bold truncate">{live.playerName(pid)}</span>
                  </div>
                ))}
                <button onClick={handleSwap1} className="text-[11px] font-bold text-dim bg-alt py-1.5 rounded-lg mt-1 active:bg-line">
                  Swap Order
                </button>
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
                    <span className="text-[12px] font-bold truncate">{live.playerName(pid)}</span>
                  </div>
                ))}
                <button onClick={handleSwap2} className="text-[11px] font-bold text-dim bg-alt py-1.5 rounded-lg mt-1 active:bg-line">
                  Swap Order
                </button>
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

      <button
        onClick={handleStartMatch}
        disabled={!canStart || checking}
        className="w-full max-w-[400px] mx-auto py-4 rounded-xl bg-accent text-white font-black text-[16px] uppercase tracking-widest active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        {checking ? 'Checking...' : 'Start Match'}
      </button>

      {conflictScorer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="bg-surface border border-line p-6 rounded-2xl max-w-[320px] w-full text-center">
            <div className="text-[32px] mb-3">⚠️</div>
            <div className="text-[16px] font-bold mb-2 text-text">Already being scored</div>
            <div className="text-[13px] text-dim mb-6">
              <strong className="text-text">{conflictScorer.name}</strong> is already scoring this match.
              If you continue, only the first saved result will count.
            </div>
            <button
              onClick={onBack}
              className="w-full py-3 bg-bg border border-line text-text font-bold rounded-xl mb-3 cursor-pointer"
            >
              Go Back
            </button>
            <button
              onClick={() => {
                claimMatchScorer(mid, profileId)
                setConflictScorer(null)
                doStartGame()
              }}
              className="w-full py-3 bg-accent text-white font-bold rounded-xl border-0 cursor-pointer"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LiveMatch() {
  const navigate = useNavigate()
  const { id, tid, mid } = useParams()

  const { profile }                                  = useAuth()
  const { league, loading: leagueLoading, refetch } = useLeague(id)
  const { canScore, loading: roleLoading }          = useLeagueRole(id)
  const tournament = league?.tournaments?.find(t => t.id === tid) || null

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
    t,
    setsPerMatch: tournament?.setsPerMatch || 1
  })

  // Start game automatically if preloaded correctly
  // REMOVED AUTO START - We want the Setup Screen to show.
  // useEffect(() => {
  //   if (live.team1Id && live.team2Id && !live.gameStarted && !live.showRestore) {
  //     live.startGame()
  //   }
  // }, [live])

  // Handle Match Ending logic (now manual via GameStats)
  const handleSaveResult = async (matchId, s1_sets, s2_sets, winnerTeamId, log, sets) => {
    const isOneSet = tournament.setsPerMatch === 1

    const finalScore1 = isOneSet ? (live.sets[0]?.s1 ?? live.score1) : s1_sets
    const finalScore2 = isOneSet ? (live.sets[0]?.s2 ?? live.score2) : s2_sets

    try {
      await supabaseSaveMatchResult(matchId, finalScore1, finalScore2, winnerTeamId, log, sets)
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
        }
      }
    } catch (err) {
      console.error('Failed to save match result:', err)
    }

    try { localStorage.removeItem(SAVE_KEY) } catch { /* ignored */ }
    navigate(`/league/${id}/tournament/${tid}`)
  }

  // Show spinner while league or role data is loading
  if (leagueLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Redirect viewers away from the live match screen
  if (canScore === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-2">
        <div className="text-[18px] font-bold">Access Denied</div>
        <div className="text-[13px] text-dim">Only scorers and players can record match scores.</div>
        <button
          onClick={() => navigate(`/league/${id}/tournament/${tid}`)}
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

  const t1Name = teamName(tournament.teams, live.team1Id)
  const t2Name = teamName(tournament.teams, live.team2Id)

  // ── Modals / Overlays ──

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
          <button onClick={live.discardSaved} className="w-full py-3 bg-error/10 text-error font-bold rounded-xl border border-error/20">
            Discard & Start New
          </button>
        </div>
      </div>
    )
  }

  if (!live.gameStarted) {
    return <LiveMatchSetup live={live} tournament={tournament} mid={mid} profileId={profile?.id} onBack={() => navigate(`/league/${id}/tournament/${tid}`)} />
  }

  if (live.pendingEnd) {
    return (
      <div className="absolute inset-0 z-50 bg-bg/95 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
        <div className="text-[18px] font-bold mb-4">End Match Early?</div>
        <div className="text-[12px] text-dim text-center mb-8 max-w-[280px]">
          Are you sure you want to finish the match right now? The current score will be recorded as the final result.
        </div>
        <div className="flex gap-4 w-full max-w-[280px]">
          <button onClick={live.cancelEnd} className="flex-1 py-3.5 rounded-xl border border-line bg-surface text-[14px] font-semibold text-text">
            Cancel
          </button>
          <button onClick={live.confirmEnd} className="flex-1 py-3.5 rounded-xl bg-accent border-0 text-[14px] font-bold text-white shadow-lg">
            End Match
          </button>
        </div>
      </div>
    )
  }

  if (live.pendingPoint) {
    const ptTeamName = live.pendingPoint.teamNum === 1 ? t1Name : t2Name
    return (
      <div className="absolute inset-0 z-50 bg-bg flex flex-col pt-12 pb-6 px-4">
        <div className="text-center mb-8">
          <div className="text-[28px] font-black text-accent mb-2">Point for {ptTeamName}</div>
          <div className="text-[13px] text-dim font-medium uppercase tracking-widest">Select action</div>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {live.POINT_TYPES.map(pt => (
            <button
              key={pt.id}
              onClick={() => live.confirmPointType(pt.id)}
              className="w-full bg-surface border border-line/50 p-4 rounded-2xl flex items-center justify-between shadow-sm active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-4">
                <span className="text-[28px]">{pt.icon}</span>
                <div className="text-left">
                  <div className="text-[16px] font-bold text-text mb-1">{pt.label}</div>
                  <div className="text-[12px] text-dim">{pt.desc}</div>
                </div>
              </div>
              <span className="text-[18px] text-accent font-bold">→</span>
            </button>
          ))}
        </div>
        <button onClick={() => live.setPendingPoint(null)} className="w-full py-4 mt-4 rounded-xl text-dim font-bold tracking-widest uppercase border-0 bg-transparent active:bg-surface transition-colors">
          Cancel
        </button>
      </div>
    )
  }

  if (live.pendingPlayerSelect) {
    const isError = live.pendingPlayerSelect.ptId === 'error'
    const teamNum = isError ? (live.pendingPlayerSelect.teamNum === 1 ? 2 : 1) : live.pendingPlayerSelect.teamNum
    const roster = live.serveRotation().filter(r => r.team === teamNum)
    return (
      <div className="absolute inset-0 z-50 bg-bg flex flex-col pt-12 pb-6 px-4">
        <div className="text-center mb-10">
          <div className={`text-[24px] font-black mb-2 ${isError ? 'text-error' : 'text-accent'}`}>
            {isError ? 'Who made the error?' : 'Who scored the point?'}
          </div>
          <div className="text-[13px] text-dim">Tap a player or select "Team" if unknown</div>
        </div>
        <div className="flex flex-col gap-4 flex-1 justify-center">
          {roster.map(r => (
            <button
              key={r.playerId}
              onClick={() => live.confirmPlayer(r.playerId)}
              className={`w-full p-5 rounded-2xl border-2 flex items-center justify-center gap-3 text-[18px] font-bold shadow-md active:scale-95 transition-transform ${
                isError ? 'border-error/30 bg-error/10 text-error' : 'border-accent/30 bg-accent/10 text-accent'
              }`}
            >
              👤 {live.playerName(r.playerId)}
            </button>
          ))}
          <button
            onClick={() => live.confirmPlayer(null)}
            className="w-full p-5 rounded-2xl border border-line bg-surface text-text flex items-center justify-center gap-3 text-[16px] font-bold active:scale-95 transition-transform mt-4"
          >
            👥 Skip Player (Team Point)
          </button>
        </div>
      </div>
    )
  }

  if (live.pendingSideChange) {
    return (
      <div className="absolute inset-0 z-50 bg-accent flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="text-[64px] mb-4 drop-shadow-xl animate-bounce">🔄</div>
        <div className="text-[32px] font-black tracking-wider uppercase mb-3 text-shadow-sm">Switch Sides!</div>
        <div className="text-[16px] font-medium opacity-90 mb-10">Total points is a multiple of 7</div>
        <button onClick={live.confirmSideChange} className="w-full max-w-[280px] bg-white text-accent font-black text-[18px] py-4 rounded-2xl shadow-xl active:scale-95 transition-transform">
          Sides Switched ✓
        </button>
      </div>
    )
  }

  // ── Main UI ──
  const setWins1 = live.sets.filter(s => s.winner === 1).length
  const setWins2 = live.sets.filter(s => s.winner === 2).length

  if (live.winner) {
    return (
      <div className="flex flex-col h-screen bg-bg text-text overflow-hidden overflow-y-auto p-4">
        <GameStats
          winner={live.winner}
          team1Id={live.team1Id} team2Id={live.team2Id}
          sets={live.sets} t1Sets={setWins1} t2Sets={setWins2}
          log={live.log}
          teams={tournament.teams} players={league.players || []}
          onSaveResult={handleSaveResult} activeTourMatchId={mid}
          t={t}
        />
      </div>
    )
  }

  const currentSrv = live.currentServer()
  const rot = live.serveRotation()
  const nextSrv = rot[(live.serveIndex + 1) % rot.length]

  const isT1Left = live.side.t1 === 'left'
  
  // Helpers to render the server UI conditionally per side
  const renderServerInfo = (teamNum) => {
    const isServing = currentSrv.team === teamNum
    const isTeam1 = teamNum === 1
    const slotsForTeam = rot.filter(r => r.team === teamNum)
    
    if (isServing) {
      if (!currentSrv.playerId) return null
      return (
        <div className="absolute bottom-6 flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
            Serving
          </span>
          <span className="text-[13px] font-black text-text bg-bg/80 backdrop-blur px-4 py-1.5 rounded-full shadow-sm border border-line">
            🏐 {live.playerName(currentSrv.playerId)}
          </span>
        </div>
      )
    } else {
      const pId = nextSrv.team === teamNum ? nextSrv.playerId : slotsForTeam[0]?.playerId
      if (!pId) return null
      return (
        <div className="absolute bottom-6 flex flex-col items-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-dim mb-1">
            If {teamNum === 1 ? t1Name : t2Name} scores:
          </span>
          <span className="text-[11px] font-bold text-dim bg-bg px-3 py-1 rounded-full border border-line/50">
            {live.playerName(pId)}
          </span>
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-line shrink-0">
        <button onClick={live.requestEnd} className="text-[12px] font-bold text-error uppercase tracking-wider bg-transparent border-0">
          End
        </button>
        <div className="text-center">
          <div className="text-[14px] font-black uppercase text-accent tracking-widest">
            Set {live.sets.length + 1}
          </div>
          <div className="text-[10px] text-dim font-bold tracking-widest uppercase">
            First to {live.pointsToWin}
          </div>
        </div>
        <button 
          onClick={live.requestUndo} 
          disabled={live.history.length === 0}
          className={`text-[12px] font-bold uppercase tracking-wider bg-transparent border-0 ${live.history.length === 0 ? 'text-line' : 'text-dim'}`}
        >
          Undo
        </button>
      </div>

      {/* Undo confirmation strip */}
      {live.pendingUndo && (
        <div className="bg-error text-white px-4 py-2.5 flex items-center justify-between text-[13px] font-bold">
          <span>Confirm undo?</span>
          <div className="flex gap-4">
            <button onClick={live.cancelUndo} className="bg-transparent border-0 text-white/70">Cancel</button>
            <button onClick={live.confirmUndo} className="bg-white text-error px-3 py-1 rounded">Yes</button>
          </div>
        </div>
      )}

      {/* Main Scoreboard */}
      <div className="flex-1 flex flex-col px-4 pt-6 pb-4">
        {/* Sets Tracker */}
        {tournament.setsPerMatch > 1 && (
          <div className="flex justify-center gap-12 mb-6">
            <div className="flex gap-1.5">
              {Array.from({ length: Math.ceil(tournament.setsPerMatch / 2) }).map((_, i) => (
                <div key={`t1s${i}`} className={`w-3 h-3 rounded-full ${i < setWins1 ? 'bg-accent' : 'bg-line'}`} />
              ))}
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: Math.ceil(tournament.setsPerMatch / 2) }).map((_, i) => (
                <div key={`t2s${i}`} className={`w-3 h-3 rounded-full ${i < setWins2 ? 'bg-accent' : 'bg-line'}`} />
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 flex justify-between gap-4">
          {/* Team 1 Panel */}
          <button 
            onClick={() => live.addPoint(live.side.t1 === 'left' ? 1 : 2)}
            className="flex-1 flex flex-col items-center justify-center bg-surface border-2 border-line rounded-[32px] relative shadow-sm active:bg-alt active:scale-[0.98] transition-all overflow-hidden"
          >
            {/* Serve indicator dot */}
            {currentSrv.team === (live.side.t1 === 'left' ? 1 : 2) && (
              <div className="absolute top-4 w-4 h-4 bg-accent rounded-full shadow-[0_0_10px_rgba(var(--c-accent),0.8)] animate-pulse" />
            )}
            
            <div className="text-[16px] font-bold text-text uppercase tracking-widest text-center px-4 max-w-full truncate mb-2">
              {live.side.t1 === 'left' ? t1Name : t2Name}
            </div>
            <div className={`text-[80px] sm:text-[110px] font-black leading-none tracking-tighter drop-shadow-sm ${currentSrv.team === (live.side.t1 === 'left' ? 1 : 2) ? 'text-accent' : 'text-dim'}`}>
              {live.side.t1 === 'left' ? live.score1 : live.score2}
            </div>
            
            {renderServerInfo(live.side.t1 === 'left' ? 1 : 2)}
          </button>

          {/* VS Divider */}
          <div className="w-[1px] bg-line relative flex items-center justify-center shrink-0 mx-2">
            <div className="absolute flex flex-col items-center gap-4 py-6 px-4 bg-bg border border-line rounded-full z-10 shadow-sm">
              <div className="text-dim font-black text-[12px] uppercase tracking-widest">VS</div>
              {live.points > 0 && live.points % 7 !== 0 && (
                <div className="flex flex-col items-center px-2 py-1.5 bg-accent/10 border border-accent/20 rounded-lg">
                  <span className="text-[9px] font-bold text-accent uppercase whitespace-nowrap">Change</span>
                  <span className="text-[10px] font-black text-accent whitespace-nowrap">
                    in {7 - (live.points % 7)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Team 2 Panel */}
          <button 
            onClick={() => live.addPoint(live.side.t2 === 'right' ? 2 : 1)}
            className="flex-1 flex flex-col items-center justify-center bg-surface border-2 border-line rounded-[32px] relative shadow-sm active:bg-alt active:scale-[0.98] transition-all overflow-hidden"
          >
            {currentSrv.team === (live.side.t2 === 'right' ? 2 : 1) && (
              <div className="absolute top-4 w-4 h-4 bg-accent rounded-full shadow-[0_0_10px_rgba(var(--c-accent),0.8)] animate-pulse" />
            )}
            
            <div className="text-[16px] font-bold text-text uppercase tracking-widest text-center px-4 max-w-full truncate mb-2">
              {live.side.t2 === 'right' ? t2Name : t1Name}
            </div>
            <div className={`text-[80px] sm:text-[110px] font-black leading-none tracking-tighter drop-shadow-sm ${currentSrv.team === (live.side.t2 === 'right' ? 2 : 1) ? 'text-accent' : 'text-dim'}`}>
              {live.side.t2 === 'right' ? live.score2 : live.score1}
            </div>
            
            {renderServerInfo(live.side.t2 === 'right' ? 2 : 1)}
          </button>
        </div>
      </div>

      {/* Match Log */}
      <div className="h-[140px] bg-bg border-t border-line shrink-0 flex flex-col">
        <div className="px-4 py-2 border-b border-line bg-surface flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-dim">
          <span>Match Log</span>
          <span>{live.log?.length || 0} actions</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scroll-smooth">
          {(!live.log || live.log.length === 0) ? (
            <div className="h-full flex items-center justify-center text-[12px] text-dim italic">
              Awaiting first serve...
            </div>
          ) : (
            [...live.log].reverse().map((entry) => {
              if (!entry.team) return (
                <div key={entry.id} className="py-2 px-3.5 text-[12px] font-bold text-accent text-center border-b border-line">
                  {entry.msg}
                </div>
              )
              const isTeam1 = entry.team === 1
              const teamColor = isTeam1 ? "text-accent" : "text-text"
              const teamBg = isTeam1 ? "bg-accent/15" : "bg-text/10"
              
              return (
                <div key={entry.id} className="flex items-center px-3.5 py-2 gap-2 border-b border-line last:border-b-0">
                  <span className="text-[11px] font-bold text-accent w-9 shrink-0 text-right">
                    {entry.t1}–{entry.t2}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-text truncate">
                      {entry.pointTypeIcon || "🏐"} {entry.pointTypeLabel || "Point"}
                      {entry.scoringPlayerId ? ` · ${live.playerName(entry.scoringPlayerId)}` : ""}
                    </div>
                    <div className="text-[9px] text-dim truncate">
                      Served: {live.playerName(entry.serverPlayerId)}
                    </div>
                  </div>
                  <span className={`text-[9px] font-semibold ${teamColor} ${teamBg} px-1.5 py-0.5 rounded-[4px] shrink-0 max-w-[60px] truncate`}>
                    {(isTeam1 ? t1Name : t2Name).split(" ")[0]}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}