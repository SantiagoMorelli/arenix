import { useState } from 'react'
import { SAVE_KEY } from '../hooks/useLiveGame'
import { reopenMatch, quickEditMatchScores } from '../services/tournamentService'

function teamName(teams, id) {
  return teams?.find(t => t.id === id)?.name || '?'
}

function reconstructGameState(match, tournament) {
  const log  = match.log  || []
  const sets = match.sets || []

  // Find last set-separator (entries without a 'team' field)
  let lastSepIdx = -1
  for (let i = log.length - 1; i >= 0; i--) {
    if (!log[i].team) { lastSepIdx = i; break }
  }

  const currentEntries = log.slice(lastSepIdx + 1).filter(e => e.team)
  let score1 = 0, score2 = 0, points = 0
  if (currentEntries.length > 0) {
    const last = currentEntries[currentEntries.length - 1]
    score1 = last.t1
    score2 = last.t2
    points = currentEntries.length
  }

  // All entries in match.sets are "completed" sets. Strip the last one so we
  // resume scoring within it — score1/score2 from the log are already that
  // last set's running totals, not a new set's scores.
  const completedSets  = sets.length > 0 ? sets.slice(0, -1) : []
  const setsPerMatch   = tournament?.setsPerMatch || 1
  // Use completedSets.length so the tiebreak threshold (15 pts) triggers correctly
  const pointsToWin    = completedSets.length === setsPerMatch - 1 ? 15 : 21
  const team1          = tournament?.teams?.find(t => t.id === match.team1)
  const team2          = tournament?.teams?.find(t => t.id === match.team2)
  const t1ServeOrder   = team1?.players || []
  const t2ServeOrder   = team2?.players || []

  return {
    team1Id: match.team1,
    team2Id: match.team2,
    gameStarted: true,
    score1,
    score2,
    sets: completedSets,
    log,
    winner: null,
    t1FirstServer: 0,
    t2FirstServer: 0,
    t1InitialSide: 'left',
    serveIndex: 0,
    side: { t1: 'left', t2: 'right' },
    points,
    pointsToWin,
    t1ServeOrder,
    t2ServeOrder,
    history: [],
  }
}

export default function EditMatchModal({ match, tournament, teams, leagueId, tournamentId, onSave, onClose, navigate }) {
  const hasSets = match.sets && match.sets.length > 0

  // Build editable sets array: [{ s1, s2 }]
  const initialSets = hasSets
    ? match.sets.map(s => ({ s1: s.s1, s2: s.s2 }))
    : [{ s1: match.score1, s2: match.score2 }]

  const [editSets, setEditSets]   = useState(initialSets)
  const [saving,   setSaving]     = useState(false)
  const [reopening, setReopening] = useState(false)
  const [error,    setError]      = useState(null)

  const adjust = (setIdx, team, delta) => {
    setEditSets(prev => prev.map((s, i) => {
      if (i !== setIdx) return s
      const val = team === 1 ? Math.max(0, s.s1 + delta) : Math.max(0, s.s2 + delta)
      return team === 1 ? { ...s, s1: val } : { ...s, s2: val }
    }))
  }

  // Compute derived winner info
  const computedSets = editSets.map(s => ({
    ...s,
    winner: s.s1 > s.s2 ? 1 : s.s2 > s.s1 ? 2 : null,
  }))

  const t1SetsWon  = computedSets.filter(s => s.winner === 1).length
  const t2SetsWon  = computedSets.filter(s => s.winner === 2).length
  const matchWinner = t1SetsWon > t2SetsWon
    ? match.team1
    : t2SetsWon > t1SetsWon
    ? match.team2
    : null
  const isTie      = computedSets.some(s => s.winner === null)
  const canSave    = !!matchWinner && !isTie && !saving

  const isSingleSet = (tournament?.setsPerMatch ?? 1) === 1
  const newScore1   = hasSets && !isSingleSet ? t1SetsWon : editSets[0]?.s1 ?? 0
  const newScore2   = hasSets && !isSingleSet ? t2SetsWon : editSets[0]?.s2 ?? 0

  const t1Name = teamName(teams, match.team1)
  const t2Name = teamName(teams, match.team2)

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const newSets = hasSets
        ? computedSets.map(s => ({ s1: s.s1, s2: s.s2, winner: s.winner }))
        : null
      await quickEditMatchScores(match.id, newSets, newScore1, newScore2, matchWinner, tournament)
      onSave()
    } catch (err) {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleReopen = async () => {
    setReopening(true)
    setError(null)
    try {
      await reopenMatch(match.id, tournament)
      const gameState = reconstructGameState(match, tournament)
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(gameState)) } catch {}
      navigate(`/league/${leagueId}/tournament/${tournamentId}/match/${match.id}`)
    } catch (err) {
      setError('Failed to reopen match. Please try again.')
      setReopening(false)
    }
  }

  return (
    <div className="absolute inset-0 z-[110] bg-bg/90 backdrop-blur-sm flex items-end justify-center p-4 pb-6">
      <div className="bg-surface rounded-[20px] w-full max-w-[380px] border border-line shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-alt">
          <div>
            <div className="text-[14px] font-bold text-text">Edit Match Result</div>
            <div className="text-[11px] text-dim mt-0.5">{t1Name} vs {t2Name}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-bg border border-line rounded-lg text-dim hover:text-text transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Set rows */}
          {editSets.map((s, i) => {
            const setWinner = s.s1 > s.s2 ? 1 : s.s2 > s.s1 ? 2 : null
            return (
              <div key={i}>
                {hasSets && editSets.length > 1 && (
                  <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-1.5">
                    Set {i + 1}
                    {setWinner && (
                      <span className="ml-2 text-accent">
                        → {setWinner === 1 ? t1Name : t2Name}
                      </span>
                    )}
                    {!setWinner && (
                      <span className="ml-2 text-error">Tied — adjust</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {/* Team 1 */}
                  <div className="flex-1 text-center">
                    <div className={`text-[11px] font-bold mb-1.5 truncate ${setWinner === 1 || (!hasSets && matchWinner === match.team1) ? 'text-accent' : 'text-dim'}`}>
                      {t1Name}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => adjust(i, 1, -1)}
                        className="w-9 h-9 flex items-center justify-center bg-bg border border-line rounded-xl text-[18px] font-bold text-dim active:bg-alt cursor-pointer"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-[22px] font-black text-text">{s.s1}</span>
                      <button
                        onClick={() => adjust(i, 1, +1)}
                        className="w-9 h-9 flex items-center justify-center bg-bg border border-line rounded-xl text-[18px] font-bold text-accent active:bg-accent/10 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-[12px] font-bold text-dim shrink-0">VS</div>

                  {/* Team 2 */}
                  <div className="flex-1 text-center">
                    <div className={`text-[11px] font-bold mb-1.5 truncate ${setWinner === 2 || (!hasSets && matchWinner === match.team2) ? 'text-accent' : 'text-dim'}`}>
                      {t2Name}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => adjust(i, 2, -1)}
                        className="w-9 h-9 flex items-center justify-center bg-bg border border-line rounded-xl text-[18px] font-bold text-dim active:bg-alt cursor-pointer"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-[22px] font-black text-text">{s.s2}</span>
                      <button
                        onClick={() => adjust(i, 2, +1)}
                        className="w-9 h-9 flex items-center justify-center bg-bg border border-line rounded-xl text-[18px] font-bold text-accent active:bg-accent/10 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Match winner summary */}
          <div className="text-center text-[12px] font-semibold mt-1">
            {matchWinner && !isTie ? (
              <span className="text-success">
                {matchWinner === match.team1 ? t1Name : t2Name} wins {newScore1}–{newScore2}
              </span>
            ) : (
              <span className="text-error">Scores tied — adjust to determine winner</span>
            )}
          </div>

          {error && (
            <div className="text-[12px] text-error font-medium text-center">{error}</div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2.5 mt-1">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="w-full min-h-[44px] rounded-xl bg-accent text-white font-bold text-[14px] border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : 'Save Changes'}
            </button>

            <button
              onClick={handleReopen}
              disabled={reopening}
              className="w-full min-h-[44px] rounded-xl bg-alt border border-line text-text font-semibold text-[13px] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {reopening ? (
                <>
                  <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  Opening…
                </>
              ) : (
                <>🏐 Reopen Live Scoreboard</>
              )}
            </button>
          </div>

          <div className="text-[10px] text-dim text-center leading-relaxed -mt-1">
            Reopen lets you continue scoring from the existing point history.
          </div>
        </div>
      </div>
    </div>
  )
}
