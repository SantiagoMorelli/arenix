import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useFreePlay } from '../hooks/useFreePlay'
import { useLiveGame, FP_SAVE_KEY, loadSavedFrom } from '../hooks/useLiveGame'

const t = (key) => {
  const dict = {
    ptAce: 'Ace', ptAceDesc: 'Direct point from serve',
    ptSpike: 'Spike', ptSpikeDesc: 'Point from attack',
    ptBlock: 'Block', ptBlockDesc: 'Point from block',
    ptTip: 'Tip/Drop', ptTipDesc: 'Point from soft play',
    ptError: 'Error', ptErrorDesc: 'Opponent error',
  }
  return dict[key] || key
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const BackIcon = () => <Svg><polyline points="15 18 9 12 15 6" /></Svg>

// ─── Setup screen ─────────────────────────────────────────────────────────────
function MatchSetup({ live, teams, team1Id, team2Id, routeState, onBack }) {
  const tName = (tid) => teams.find(t => t.id === tid)?.name || '?'
  const t1Name = tName(team1Id)
  const t2Name = tName(team2Id)

  const handleMoveUp1 = (idx) => live.setT1ServeOrder(o => {
    const n = [...o]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n
  })
  const handleMoveUp2 = (idx) => live.setT2ServeOrder(o => {
    const n = [...o]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n
  })
  const handleSwap1 = () => live.setT1ServeOrder(o => [...o.slice(1), o[0]])
  const handleSwap2 = () => live.setT2ServeOrder(o => [...o.slice(1), o[0]])

  const handleSetSide = (sideStr) => {
    live.setT1InitialSide(sideStr)
    live.setSide({ t1: sideStr, t2: sideStr === 'left' ? 'right' : 'left' })
  }

  const canStart = live.t1ServeOrder?.length > 0 && live.t2ServeOrder?.length > 0

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden p-4">
      {/* Header */}
      <div className="flex items-center justify-between mt-2 mb-6">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center bg-surface border border-line rounded-xl text-text"
        >
          <BackIcon />
        </button>
        <h1 className="text-[20px] font-black text-free uppercase tracking-widest m-0">
          Match Setup
        </h1>
        <div className="w-10" />
      </div>

      {/* ── DEBUG PANEL (remove once fixed) ── */}
      <div className="bg-error/10 border border-error/30 rounded-xl p-3 mb-2 text-[11px] font-mono break-all max-w-[400px] w-full mx-auto text-error">
        <pre className="whitespace-pre-wrap">{JSON.stringify({
          t1Id: team1Id || '(empty)',
          t2Id: team2Id || '(empty)',
          routeState: routeState,
          teamsCount: teams.length,
          teams: teams.map(t => ({ id: t.id?.slice(0,8), name: t.name, players: t.players })),
          t1Order: live.t1ServeOrder,
          t2Order: live.t2ServeOrder,
        }, null, 2)}</pre>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-6 max-w-[400px] w-full mx-auto pb-8">

        {/* Teams preview */}
        <div className="bg-surface rounded-xl border border-line p-4 flex items-center justify-center gap-4">
          <div className="flex-1 text-center">
            <div className="text-[13px] font-black text-free uppercase tracking-widest truncate">{t1Name}</div>
          </div>
          <div className="text-[11px] font-black text-dim">VS</div>
          <div className="flex-1 text-center">
            <div className="text-[13px] font-black text-text uppercase tracking-widest truncate">{t2Name}</div>
          </div>
        </div>

        {/* Serving order */}
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-4 text-center">
            Serving Order
          </div>
          <div className="flex gap-4">
            {/* Team 1 */}
            <div className="flex-1">
              <div className="text-[12px] font-bold text-free mb-2 text-center truncate">{t1Name}</div>
              <div className="flex flex-col gap-2">
                {live.t1ServeOrder.map((pid, idx) => (
                  <div
                    key={pid}
                    className={`flex items-center gap-2 p-2 rounded-lg border
                      ${idx === 0 ? 'bg-free/10 border-free/40 text-free' : 'bg-bg border-line text-text'}`}
                  >
                    <span className="text-[10px] font-bold w-4 h-4 rounded-full bg-current text-white flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[12px] font-bold truncate flex-1">{live.playerName(pid)}</span>
                    {idx > 0 && (
                      <button onClick={() => handleMoveUp1(idx)} className="text-[14px] text-dim bg-transparent border-0 cursor-pointer p-0 leading-none shrink-0">↑</button>
                    )}
                  </div>
                ))}
                {live.t1ServeOrder.length > 1 && (
                  <button onClick={handleSwap1} className="text-[11px] font-bold text-dim bg-alt py-1.5 rounded-lg mt-1 active:bg-line border-0 cursor-pointer">
                    Swap Order
                  </button>
                )}
              </div>
            </div>

            {/* Team 2 */}
            <div className="flex-1">
              <div className="text-[12px] font-bold text-text mb-2 text-center truncate">{t2Name}</div>
              <div className="flex flex-col gap-2">
                {live.t2ServeOrder.map((pid, idx) => (
                  <div
                    key={pid}
                    className={`flex items-center gap-2 p-2 rounded-lg border
                      ${idx === 0 ? 'bg-text/10 border-line text-text' : 'bg-bg border-line text-text'}`}
                  >
                    <span className="text-[10px] font-bold w-4 h-4 rounded-full bg-current text-white flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[12px] font-bold truncate flex-1">{live.playerName(pid)}</span>
                    {idx > 0 && (
                      <button onClick={() => handleMoveUp2(idx)} className="text-[14px] text-dim bg-transparent border-0 cursor-pointer p-0 leading-none shrink-0">↑</button>
                    )}
                  </div>
                ))}
                {live.t2ServeOrder.length > 1 && (
                  <button onClick={handleSwap2} className="text-[11px] font-bold text-dim bg-alt py-1.5 rounded-lg mt-1 active:bg-line border-0 cursor-pointer">
                    Swap Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Who serves first */}
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-3 text-center">
            Who serves first?
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => live.setFirstServingTeam(1)}
              className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold truncate px-2 transition-all cursor-pointer
                ${live.firstServingTeam === 1 ? 'border-free bg-free/10 text-free' : 'border-line bg-bg text-dim'}`}
            >
              🏐 {t1Name}
            </button>
            <button
              onClick={() => live.setFirstServingTeam(2)}
              className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold truncate px-2 transition-all cursor-pointer
                ${live.firstServingTeam === 2 ? 'border-text/40 bg-text/5 text-text' : 'border-line bg-bg text-dim'}`}
            >
              🏐 {t2Name}
            </button>
          </div>
        </div>

        {/* Starting side */}
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-3 text-center">
            {t1Name} starts on the…
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSetSide('left')}
              className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold transition-all cursor-pointer
                ${live.t1InitialSide === 'left' ? 'border-free bg-free/10 text-free' : 'border-line bg-bg text-dim'}`}
            >
              ← Left Side
            </button>
            <button
              onClick={() => handleSetSide('right')}
              className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold transition-all cursor-pointer
                ${live.t1InitialSide === 'right' ? 'border-free bg-free/10 text-free' : 'border-line bg-bg text-dim'}`}
            >
              Right Side →
            </button>
          </div>
        </div>
      </div>

      {/* Start button */}
      <div className="max-w-[400px] w-full mx-auto shrink-0">
        <button
          onClick={() => { live.setPointsToWin(21); live.startGame() }}
          disabled={!canStart}
          className="w-full py-4 rounded-xl bg-free text-white font-black text-[16px] uppercase tracking-widest active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed border-0 cursor-pointer"
        >
          Start Match
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FreePlayLiveMatch() {
  const navigate      = useNavigate()
  const { id }        = useParams()
  const location      = useLocation()
  const gameId        = location.state?.gameId

  const setsPerMatch  = location.state?.setsPerMatch  ?? 1
  const stateTeam1Id  = location.state?.team1Id  || ''
  const stateTeam2Id  = location.state?.team2Id  || ''

  const { session, loading } = useFreePlay(id)

  // Shape data for useLiveGame
  const teams   = (session?.teams   || []).map(t => ({ id: t.id, name: t.name, players: t.playerIds }))
  const players = session?.players  || []

  const live = useLiveGame({
    teams,
    players,
    informalMode:      false,
    tournamentMatches: [],
    preloadMatchId:    null,
    t,
    setsPerMatch,
    saveKey:           FP_SAVE_KEY,
  })

  // Set team IDs immediately from route state (no DB round-trip needed)
  const teamIdsSet = useRef(false)
  useEffect(() => {
    if (teamIdsSet.current || !stateTeam1Id || !stateTeam2Id) return
    teamIdsSet.current = true
    live.setTeam1Id(stateTeam1Id)
    live.setTeam2Id(stateTeam2Id)
    if (gameId) live.setActiveTourMatchId(gameId)
  }, [stateTeam1Id, stateTeam2Id])

  // Load serve orders once session (and therefore team rosters) arrives
  const serveOrderSet = useRef(false)
  useEffect(() => {
    if (!session || serveOrderSet.current) return
    serveOrderSet.current = true
    const t1 = session.teams.find(t => t.id === stateTeam1Id)
    const t2 = session.teams.find(t => t.id === stateTeam2Id)
    if (t1?.playerIds?.length) live.setT1ServeOrder(t1.playerIds)
    if (t2?.playerIds?.length) live.setT2ServeOrder(t2.playerIds)
  }, [session])

  // ── Guards ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-free border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }


  if (!gameId || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-3">
        <div className="text-[15px] font-bold">Match not found</div>
        <button onClick={() => navigate(`/free-play/${id}`)} className="text-[13px] text-free font-semibold bg-transparent border-0 cursor-pointer">
          ← Back to session
        </button>
      </div>
    )
  }

  // ── Setup screen (not yet started) ───────────────────────────────────────
  if (!live.gameStarted) {
    return (
      <MatchSetup
        live={live}
        teams={teams}
        team1Id={stateTeam1Id}
        team2Id={stateTeam2Id}
        routeState={location.state}
        onBack={() => navigate(`/free-play/${id}`)}
      />
    )
  }

  // ── Live scoring + result (steps 5b / 5c / 5d — coming next) ────────────
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-3 p-6">
      <div className="text-[32px]">🏐</div>
      <div className="text-[18px] font-black text-free uppercase tracking-widest">Match Started!</div>
      <div className="text-[13px] text-dim text-center">
        Live scoring coming in steps 5b–5d
      </div>
      <button
        onClick={() => { live.reset(); navigate(`/free-play/${id}`) }}
        className="mt-4 text-[13px] text-error font-semibold bg-transparent border-0 cursor-pointer"
      >
        Abandon match
      </button>
    </div>
  )
}
