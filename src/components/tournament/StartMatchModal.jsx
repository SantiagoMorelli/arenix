import { X } from 'lucide-react'
import { teamName } from '../../lib/tournament'

export default function StartMatchModal({
  match,
  tournament,
  leaguePlayers,
  showScoreForm,
  manualScore1,
  manualScore2,
  checkingScorer,
  savingScore,
  onPlayLive,
  onShowScoreForm,
  onScore1Change,
  onScore2Change,
  onSaveScore,
  onClose,
}) {
  const getNames = id => {
    const t = tournament.teams.find(x => x.id === id)
    return (t?.players || []).map(pid => {
      const p = leaguePlayers.find(x => x.id === pid)
      return p ? (p.displayName || p.nickname || p.name) : 'Unknown'
    }).join(' · ')
  }

  const n1 = getNames(match.team1)
  const n2 = getNames(match.team2)
  const t1 = teamName(tournament.teams, match.team1)
  const t2 = teamName(tournament.teams, match.team2)

  return (
    <div className="absolute inset-0 z-50 bg-bg/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-[20px] w-full max-w-[320px] border border-line shadow-2xl overflow-hidden relative">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-line bg-alt">
          <span className="text-[13px] font-bold text-dim uppercase tracking-wide">
            {showScoreForm ? 'Enter Final Score' : 'Start Match'}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-bg flex items-center justify-center border-0 cursor-pointer text-text hover:text-error transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5">
          {!showScoreForm ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 text-center pr-1">
                  <div className="text-[14px] font-bold text-text">{t1}</div>
                  {n1 && <div className="text-[10px] text-dim mt-0.5">{n1}</div>}
                </div>
                <span className="text-[11px] font-bold text-dim px-3 pt-0.5 flex-shrink-0">VS</span>
                <div className="flex-1 text-center pl-1">
                  <div className="text-[14px] font-bold text-text">{t2}</div>
                  {n2 && <div className="text-[10px] text-dim mt-0.5">{n2}</div>}
                </div>
              </div>
              <button
                onClick={onPlayLive}
                disabled={checkingScorer}
                className="w-full py-3.5 rounded-xl bg-accent text-white font-bold text-[14px] flex items-center justify-center gap-2 border-0 cursor-pointer shadow-[0_4px_12px_rgba(var(--c-accent),0.25)] hover:opacity-90 transition-all disabled:opacity-60"
              >
                <span className="text-[18px]">🏐</span> {checkingScorer ? 'Checking...' : 'Play Live'}
              </button>

              <button
                onClick={onShowScoreForm}
                className="w-full py-3.5 rounded-xl bg-alt text-text font-semibold text-[14px] flex items-center justify-center gap-2 border border-line cursor-pointer hover:bg-bg transition-colors"
              >
                <span className="text-[18px]">✏️</span> Enter Score
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <div className="text-[12px] font-semibold text-dim text-center truncate">{t1}</div>
                  {n1 && <div className="text-[10px] text-dim text-center mb-1">{n1}</div>}
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={manualScore1}
                    onChange={e => onScore1Change(e.target.value)}
                    placeholder="0"
                    className="w-full text-center text-[24px] font-bold bg-bg border border-line rounded-xl py-3 focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="font-display text-[28px] text-dim pt-[30px] flex-shrink-0">—</div>
                <div className="flex-1">
                  <div className="text-[12px] font-semibold text-dim text-center truncate">{t2}</div>
                  {n2 && <div className="text-[10px] text-dim text-center mb-1">{n2}</div>}
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={manualScore2}
                    onChange={e => onScore2Change(e.target.value)}
                    placeholder="0"
                    className="w-full text-center text-[24px] font-bold bg-bg border border-line rounded-xl py-3 focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
              <div className="text-[11px] text-center text-dim mt-1">
                {(manualScore1 !== '' && manualScore1 === manualScore2)
                  ? <span className="text-error font-bold">Matches cannot end in a tie.</span>
                  : 'Enter the final score.'}
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onShowScoreForm(false)}
                  className="flex-1 py-3 rounded-xl bg-alt text-text font-semibold text-[13px] border border-line cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={onSaveScore}
                  disabled={savingScore || !manualScore1 || !manualScore2 || parseInt(manualScore1) === parseInt(manualScore2)}
                  className="flex-1 py-3 rounded-xl bg-accent text-white font-bold text-[13px] border-0 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingScore ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      Saving…
                    </>
                  ) : 'Save Result'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
