import { useState, lazy, Suspense } from 'react'
import GameStats from './GameStats'
const QRExportModal = lazy(() => import('./QRExportModal'))
import { useBattery } from '../hooks/useBattery'
import { useWakeLock } from '../hooks/useWakeLock'

/**
 * LiveScoreboard — in-game scoreboard, overlays, and match log.
 *
 * Extracted from LiveMatch.jsx so Free Play can reuse the exact same UI.
 * All scoring logic lives in useLiveGame (unchanged).
 *
 * Props:
 *   live                 — useLiveGame return value
 *   teams                — [{ id, name, players: [playerId, ...] }]
 *   players              — [{ id, name }]
 *   setsPerMatch         — 1 or 3
 *   activeMatchId        — id of the match being scored (enables GameStats Save)
 *   accent               — 'accent' | 'free'  (palette switch)
 *   onSaveResult         — (matchId, s1_sets, s2_sets, winnerTeamId, log, sets) => Promise
 *   onRequestBack        — called when user taps End + reset (tournament navigates back)
 *   isSaving             — bool
 *   enableQR             — show QR export button + overflow menu
 *   getQRPayload         — () => payload for QRExportModal
 *   enableBattery        — show low-battery banner (tournament only)
 */
export default function LiveScoreboard({
  live,
  teams,
  players,
  setsPerMatch = 1,
  activeMatchId,
  accent = 'accent',
  onSaveResult,
  onRequestBack,
  isSaving = false,
  enableQR = false,
  getQRPayload = null,
  enableBattery = false,
}) {
  // ── Palette ──────────────────────────────────────────────────────────────
  // Tailwind tokens: text-accent/bg-accent/border-accent vs text-free/bg-free/border-free.
  // Both colors are first-class theme tokens (see src/index.css).
  const C = accent === 'free'
    ? {
        text:        'text-free',
        bg:          'bg-free',
        bg10:        'bg-free/10',
        bg15:        'bg-free/15',
        border:      'border-free',
        border30:    'border-free/30',
        border40:    'border-free/40',
        shadow:      'shadow-[0_0_10px_rgba(var(--c-free),0.8)]',
      }
    : {
        text:        'text-accent',
        bg:          'bg-accent',
        bg10:        'bg-accent/10',
        bg15:        'bg-accent/15',
        border:      'border-accent',
        border30:    'border-accent/30',
        border40:    'border-accent/40',
        shadow:      'shadow-[0_0_10px_rgba(var(--c-accent),0.8)]',
      }

  // ── Battery (only when enabled) ──────────────────────────────────────────
  const battery = useBattery()
  useWakeLock()
  const [batteryBannerDismissed, setBatteryBannerDismissed] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showQRExport, setShowQRExport] = useState(false)
  const isBatteryLow = enableBattery && battery.supported && !battery.charging && battery.level < 0.20

  const teamName = (id) => teams.find(t => t.id === id)?.name || '?'
  const t1Name = teamName(live.team1Id)
  const t2Name = teamName(live.team2Id)

  const getTeamPlayerNames = (teamId) => {
    const team = teams.find(tm => tm.id === teamId)
    if (!team) return ''
    const ids = team.players?.length > 0
      ? team.players
      : [team.player1, team.player2].filter(Boolean)
    return ids.map(pid => (players || []).find(p => p.id === pid)?.name || '?').join(', ')
  }

  // ── End-match confirm ────────────────────────────────────────────────────
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
          <button onClick={live.confirmEnd} className={`flex-1 py-3.5 rounded-xl ${C.bg} border-0 text-[14px] font-bold text-white shadow-lg`}>
            End Match
          </button>
        </div>
      </div>
    )
  }

  // ── Point type dialog ────────────────────────────────────────────────────
  if (live.pendingPoint) {
    const ptTeamName = live.pendingPoint.teamNum === 1 ? t1Name : t2Name
    return (
      <div className="absolute inset-0 z-50 bg-bg flex flex-col pt-12 pb-6 px-4">
        <div className="text-center mb-8">
          <div className={`text-[28px] font-black ${C.text} mb-2`}>Point for {ptTeamName}</div>
          <div className="text-[13px] text-dim font-medium uppercase tracking-widest">Select action</div>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {live.POINT_TYPES.filter(pt => pt.id !== 'ace' || live.pendingPoint?.teamNum === live.serverTeam).map(pt => (
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
              <span className={`text-[18px] ${C.text} font-bold`}>→</span>
            </button>
          ))}
        </div>
        <button onClick={() => live.setPendingPoint(null)} className="w-full py-4 mt-4 rounded-xl text-dim font-bold tracking-widest uppercase border-0 bg-transparent active:bg-surface transition-colors">
          Cancel
        </button>
      </div>
    )
  }

  // ── Player select dialog ─────────────────────────────────────────────────
  if (live.pendingPlayerSelect) {
    const isError = live.pendingPlayerSelect.ptId === 'error'
    const teamNum = isError ? (live.pendingPlayerSelect.teamNum === 1 ? 2 : 1) : live.pendingPlayerSelect.teamNum
    const roster = live.serveRotation.filter(r => r.team === teamNum)
    return (
      <div className="absolute inset-0 z-50 bg-bg flex flex-col pt-12 pb-6 px-4">
        <div className="text-center mb-10">
          <div className={`text-[24px] font-black mb-2 ${isError ? 'text-error' : C.text}`}>
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
                isError ? 'border-error/30 bg-error/10 text-error' : `${C.border30} ${C.bg10} ${C.text}`
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

  // ── Side-change overlay ──────────────────────────────────────────────────
  if (live.pendingSideChange) {
    return (
      <div className={`absolute inset-0 z-50 ${C.bg} flex flex-col items-center justify-center p-6 text-white text-center`}>
        <div className="text-[64px] mb-4 drop-shadow-xl animate-bounce">🔄</div>
        <div className="text-[32px] font-black tracking-wider uppercase mb-3 text-shadow-sm">Switch Sides!</div>
        <div className="text-[16px] font-medium opacity-90 mb-10">Total points is a multiple of 7</div>
        <button onClick={live.confirmSideChange} className={`w-full max-w-[280px] bg-white ${C.text} font-black text-[18px] py-4 rounded-2xl shadow-xl active:scale-95 transition-transform`}>
          Sides Switched ✓
        </button>
      </div>
    )
  }

  // ── Game over — show GameStats ───────────────────────────────────────────
  const setWins1 = live.sets.filter(s => s.winner === 1).length
  const setWins2 = live.sets.filter(s => s.winner === 2).length

  if (live.winner) {
    return (
      <div className="screen bg-bg text-text">
        <main className="screen__body p-4">
          <GameStats
            winner={live.winner}
            team1Id={live.team1Id}
            team2Id={live.team2Id}
            sets={live.sets}
            t1Sets={setWins1}
            t2Sets={setWins2}
            log={live.log}
            teams={teams}
            players={players}
            onSaveResult={onSaveResult}
            activeTourMatchId={activeMatchId}
            isSaving={isSaving}
            t={(k) => k}
            hasHistory={live.history.length > 0}
            onRequestUndo={live.requestUndo}
            pendingUndo={live.pendingUndo}
            onConfirmUndo={live.confirmUndo}
            onCancelUndo={live.cancelUndo}
          />
        </main>
      </div>
    )
  }

  // ── In-game scoreboard ───────────────────────────────────────────────────
  const currentSrv = live.currentServer
  const rot = live.serveRotation
  const nextSrv = rot[(live.serveIndex + 1) % rot.length]

  // Team 1 = always orange (accent), Team 2 = always blue (free), regardless of side.
  // The scoring team's color stays lit until the other team scores.
  const leftIsTeam1 = live.side.t1 === 'left'
  const leftScoreColor  = leftIsTeam1
    ? (live.lastScoringTeam === 1 ? 'text-accent' : 'text-dim')
    : (live.lastScoringTeam === 2 ? 'text-free'   : 'text-dim')
  const rightScoreColor = leftIsTeam1
    ? (live.lastScoringTeam === 2 ? 'text-free'   : 'text-dim')
    : (live.lastScoringTeam === 1 ? 'text-accent' : 'text-dim')

  const renderServerInfo = (teamNum) => {
    const isServing = currentSrv.team === teamNum
    const slotsForTeam = rot.filter(r => r.team === teamNum)

    if (isServing) {
      if (!currentSrv.playerId) return null
      return (
        <div className="absolute bottom-6 flex flex-col items-center gap-1">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${C.text} ${C.bg10} px-2 py-0.5 rounded-full border ${C.border}/20`}>
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
    <div className="screen bg-bg text-text select-none">
      {/* Header */}
      <div className="screen__top flex items-center justify-between px-4 py-3 bg-surface border-b border-line">
        <button onClick={live.requestEnd} className="text-[12px] font-bold text-error uppercase tracking-wider bg-transparent border-0">
          End
        </button>
        <div className="flex items-center gap-1.5">
          <div className="text-center">
            <div className={`text-[14px] font-black uppercase ${C.text} tracking-widest`}>
              Set {live.sets.length + 1}
            </div>
            <div className="text-[10px] text-dim font-bold tracking-widest uppercase">
              First to {live.pointsToWin}
            </div>
          </div>
          {enableQR && (
            <button
              onClick={() => setShowMenu(v => !v)}
              className="w-8 h-8 flex items-center justify-center text-dim text-[20px] font-black bg-transparent border-0 leading-none pb-1"
            >
              ···
            </button>
          )}
        </div>
        <button
          onClick={live.requestUndo}
          disabled={live.history.length === 0}
          className={`text-[12px] font-bold uppercase tracking-wider bg-transparent border-0 ${live.history.length === 0 ? 'text-line' : 'text-dim'}`}
        >
          Undo
        </button>
      </div>

      {/* ⋯ overflow menu (QR) */}
      {enableQR && showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="fixed top-[57px] left-1/2 -translate-x-1/2 z-50 bg-surface border border-line rounded-xl shadow-lg overflow-hidden min-w-[200px]">
            <button
              onClick={() => { setShowMenu(false); setShowQRExport(true) }}
              className="w-full px-4 py-3.5 text-left text-[13px] font-semibold text-text flex items-center gap-3 active:bg-alt border-0 bg-transparent cursor-pointer"
            >
              <span>📤</span> Export game (QR)
            </button>
          </div>
        </>
      )}

      {/* Battery warning banner */}
      {isBatteryLow && !batteryBannerDismissed && (
        <div className="bg-error/10 border-b border-error/20 px-4 py-2.5 flex items-center gap-3 shrink-0">
          <span className="text-[14px]">🔋</span>
          <span className="text-[11px] font-bold text-error flex-1">
            Battery {Math.round(battery.level * 100)}% — consider passing the phone
          </span>
          {enableQR && (
            <button
              onClick={() => setShowQRExport(true)}
              className="text-[11px] font-bold text-white bg-error px-2.5 py-1 rounded-lg shrink-0 border-0 cursor-pointer"
            >
              Export
            </button>
          )}
          <button
            onClick={() => setBatteryBannerDismissed(true)}
            className="text-[16px] text-error/60 bg-transparent border-0 cursor-pointer leading-none"
          >
            ×
          </button>
        </div>
      )}

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
      <div className="flex-1 min-h-0 flex flex-col px-4 pt-6 pb-4">
        {/* Sets Tracker */}
        {setsPerMatch > 1 && (
          <div className="flex justify-center gap-12 mb-6">
            <div className="flex gap-1.5">
              {Array.from({ length: Math.ceil(setsPerMatch / 2) }).map((_, i) => (
                <div key={`t1s${i}`} className={`w-3 h-3 rounded-full ${i < setWins1 ? C.bg : 'bg-line'}`} />
              ))}
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: Math.ceil(setsPerMatch / 2) }).map((_, i) => (
                <div key={`t2s${i}`} className={`w-3 h-3 rounded-full ${i < setWins2 ? C.bg : 'bg-line'}`} />
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 flex justify-between gap-4">
          {/* Team 1 panel */}
          <button
            onClick={() => live.addPoint(live.side.t1 === 'left' ? 1 : 2)}
            className="flex-1 flex flex-col items-center justify-center bg-surface border-2 border-line rounded-[32px] relative shadow-sm active:bg-alt active:scale-[0.98] transition-all overflow-hidden"
          >
            {currentSrv.team === (live.side.t1 === 'left' ? 1 : 2) && (
              <div className={`absolute top-4 w-4 h-4 ${C.bg} rounded-full ${C.shadow} animate-pulse`} />
            )}

            <div className="text-[16px] font-bold text-text uppercase tracking-widest text-center px-4 max-w-full truncate">
              {live.side.t1 === 'left' ? t1Name : t2Name}
            </div>
            <div className="text-[11px] text-dim text-center px-4 max-w-full mb-2 leading-tight">
              {getTeamPlayerNames(live.side.t1 === 'left' ? live.team1Id : live.team2Id)}
            </div>
            <div className={`text-[80px] sm:text-[110px] font-black leading-none tracking-tighter drop-shadow-sm ${leftScoreColor}`}>
              {live.side.t1 === 'left' ? live.score1 : live.score2}
            </div>

            {renderServerInfo(live.side.t1 === 'left' ? 1 : 2)}
          </button>

          {/* VS Divider */}
          <div className="w-[1px] bg-line relative flex items-center justify-center shrink-0 mx-2">
            <div className="absolute flex flex-col items-center gap-4 py-6 px-4 bg-bg border border-line rounded-full z-10 shadow-sm">
              <div className="text-dim font-black text-[12px] uppercase tracking-widest">VS</div>
              {live.points > 0 && live.points % 7 !== 0 && (
                <div className={`flex flex-col items-center px-2 py-1.5 ${C.bg10} border ${C.border}/20 rounded-lg`}>
                  <span className={`text-[9px] font-bold ${C.text} uppercase whitespace-nowrap`}>Change</span>
                  <span className={`text-[10px] font-black ${C.text} whitespace-nowrap`}>
                    in {7 - (live.points % 7)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Team 2 panel */}
          <button
            onClick={() => live.addPoint(live.side.t2 === 'right' ? 2 : 1)}
            className="flex-1 flex flex-col items-center justify-center bg-surface border-2 border-line rounded-[32px] relative shadow-sm active:bg-alt active:scale-[0.98] transition-all overflow-hidden"
          >
            {currentSrv.team === (live.side.t2 === 'right' ? 2 : 1) && (
              <div className={`absolute top-4 w-4 h-4 ${C.bg} rounded-full ${C.shadow} animate-pulse`} />
            )}

            <div className="text-[16px] font-bold text-text uppercase tracking-widest text-center px-4 max-w-full truncate">
              {live.side.t2 === 'right' ? t2Name : t1Name}
            </div>
            <div className="text-[11px] text-dim text-center px-4 max-w-full mb-2 leading-tight">
              {getTeamPlayerNames(live.side.t2 === 'right' ? live.team2Id : live.team1Id)}
            </div>
            <div className={`text-[80px] sm:text-[110px] font-black leading-none tracking-tighter drop-shadow-sm ${rightScoreColor}`}>
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
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-1 scroll-smooth">
          {(!live.log || live.log.length === 0) ? (
            <div className="h-full flex items-center justify-center text-[12px] text-dim italic">
              Awaiting first serve...
            </div>
          ) : (
            [...live.log].reverse().map((entry) => {
              if (!entry.team) return (
                <div key={entry.id} className={`py-2 px-3.5 text-[12px] font-bold ${C.text} text-center border-b border-line`}>
                  {entry.msg}
                </div>
              )
              const isTeam1 = entry.team === 1
              const teamColor = isTeam1 ? C.text : 'text-text'
              const teamBg = isTeam1 ? C.bg15 : 'bg-text/10'

              return (
                <div key={entry.id} className="flex items-center px-3.5 py-2 gap-2 border-b border-line last:border-b-0">
                  <span className={`text-[11px] font-bold ${C.text} w-9 shrink-0 text-right`}>
                    {entry.t1}–{entry.t2}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-text truncate">
                      {entry.pointTypeIcon || '🏐'} {entry.pointTypeLabel || 'Point'}
                      {entry.scoringPlayerId ? ` · ${live.playerName(entry.scoringPlayerId)}` : ''}
                    </div>
                    <div className="text-[9px] text-dim truncate">
                      Served: {live.playerName(entry.serverPlayerId)}
                    </div>
                  </div>
                  <span className={`text-[9px] font-semibold ${teamColor} ${teamBg} px-1.5 py-0.5 rounded-[4px] shrink-0 max-w-[60px] truncate`}>
                    {(isTeam1 ? t1Name : t2Name).split(' ')[0]}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* QR Export overlay */}
      {enableQR && showQRExport && getQRPayload && (
        <Suspense fallback={null}>
          <QRExportModal payload={getQRPayload()} onClose={() => setShowQRExport(false)} />
        </Suspense>
      )}

      {/* onRequestBack is currently unused by the scoreboard itself; tournament
          and Free Play handle their own "back" via live.requestEnd + their
          save/reset flow. Accepted as a prop for future use. */}
      {onRequestBack ? null : null}
    </div>
  )
}
