/**
 * LiveMatchSetup — the pre-match phase of a live match.
 *
 * Serving order, who serves first, sides, and the 3v3 rotation toggle. Pure UI
 * over the `live` game state: it holds no data source of its own, so the same
 * screen serves both league matches and device-only local tournaments.
 *
 * `onPersistServeOrder` is how the two differ. League matches save the chosen
 * order back to Supabase as a team default; local tournaments write it to
 * IndexedDB. It is fire-and-forget either way — a failure must never block the
 * start of a match — and defaults to a no-op so the caller can opt out.
 */
import { useState } from 'react'
import { ChevronLeft, Check } from 'lucide-react'
import { teamName } from '../lib/tournament'

const REMINDER_KEY = 'bv_battery_reminder_seen'

export default function LiveMatchSetup({
  live,
  tournament,
  onBack,
  onScanQR,
  onPersistServeOrder = () => {},
  enableQR = true,
}) {
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
    // The serving team's side is what the user picks.
    // t1InitialSide always tracks Team 1's side for the scoring engine.
    if (live.firstServingTeam === 2) {
      const t1Side = sideStr === 'left' ? 'right' : 'left'
      live.setT1InitialSide(t1Side)
      live.setSide({ t1: t1Side, t2: sideStr })
    } else {
      live.setT1InitialSide(sideStr)
      live.setSide({ t1: sideStr, t2: sideStr === 'left' ? 'right' : 'left' })
    }
  }

  // Derive which side the serving team is on (for button highlight)
  const servingTeamSide = live.firstServingTeam === 2
    ? (live.t1InitialSide === 'left' ? 'right' : live.t1InitialSide === 'right' ? 'left' : null)
    : live.t1InitialSide

  // Active color for side buttons — follows the serving team's identity color
  const sideActiveClass = live.firstServingTeam === 2
    ? 'border-free bg-free/10 text-free'
    : 'border-accent bg-accent/10 text-accent'

  const canStart = live.t1ServeOrder?.length > 0 && live.t2ServeOrder?.length > 0
    && live.firstServingTeam != null && live.t1InitialSide != null

  return (
    <div className="screen bg-bg text-text p-4">
      <div className="flex items-center justify-between mt-2 mb-6">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center bg-surface border border-line rounded-xl text-text"
        >
          <ChevronLeft size={20} />
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
              <div className="text-[12px] font-bold text-free mb-2 text-center truncate">{t2Name}</div>
              <div className="flex flex-col gap-2">
                {live.t2ServeOrder.map((pid, idx) => (
                  <div key={pid} className={`flex items-center gap-2 p-2 rounded-lg border ${idx === 0 ? 'bg-free/10 border-free/40 text-free' : 'bg-bg border-line text-text'}`}>
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
              onClick={() => { live.setFirstServingTeam(1); live.setT1InitialSide(null) }}
              className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold truncate px-2 transition-all ${live.firstServingTeam === 1 ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-bg text-dim'}`}
            >
              🏐 {t1Name}
            </button>
            <button 
              onClick={() => { live.setFirstServingTeam(2); live.setT1InitialSide(null) }}
              className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold truncate px-2 transition-all ${live.firstServingTeam === 2 ? 'border-free bg-free/10 text-free' : 'border-line bg-bg text-dim'}`}
            >
              🏐 {t2Name}
            </button>
          </div>
        </div>

        {/* Sides — only shown after a serving team is chosen */}
        {live.firstServingTeam != null && (
          <div className="bg-surface rounded-xl border border-line p-4">
            <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-3 text-center">
              {live.firstServingTeam === 1 ? t1Name : t2Name} starts on the…
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleSetSide('left')}
                className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold transition-all ${servingTeamSide === 'left' ? sideActiveClass : 'border-line bg-bg text-dim'}`}
              >
                Left Side
              </button>
              <button 
                onClick={() => handleSetSide('right')}
                className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold transition-all ${servingTeamSide === 'right' ? sideActiveClass : 'border-line bg-bg text-dim'}`}
              >
                Right Side
              </button>
            </div>
          </div>
        )}

        {/* Rotate on first point (3v3 only) */}
        {(live.t1ServeOrder?.length === 3 || live.t2ServeOrder?.length === 3) && (
          <label className="bg-surface rounded-xl border border-line p-4 flex items-center justify-between gap-4 cursor-pointer m-0">
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-text">Rotate on first point</span>
              <span className="text-[11px] text-dim">Receiving team rotates before their first serve.</span>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
              <input
                type="checkbox"
                checked={live.rotateOnFirstPoint}
                onChange={(e) => live.setRotateOnFirstPoint(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${live.rotateOnFirstPoint ? 'bg-accent border-accent text-bg' : 'border-line bg-transparent'}`}>
                {live.rotateOnFirstPoint && <Check size={14} strokeWidth={3} />}
              </div>
            </div>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-2 max-w-[400px] w-full mx-auto shrink-0">
        <button
          onClick={() => {
            live.setPointsToWin(21)
            live.startGame()
            // Silently persist serve orders as team defaults for next time
            onPersistServeOrder(live.team1Id, live.t1ServeOrder)
            onPersistServeOrder(live.team2Id, live.t2ServeOrder)
          }}
          disabled={!canStart}
          className="w-full py-4 rounded-xl bg-accent text-white font-black text-[16px] uppercase tracking-widest active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Match
        </button>
        {enableQR && (
          <button
            onClick={onScanQR}
            className="w-full py-3 text-[13px] font-bold text-dim bg-transparent border-0 cursor-pointer active:text-text"
          >
            📷 Resume from QR
          </button>
        )}
      </div>
    </div>
  )
}
