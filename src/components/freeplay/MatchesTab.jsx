import { useMemo } from 'react'
import { AppButton, SectionLabel } from '../ui-new'

export default function MatchesTab({
  session, isFinished, isAdmin, sessionId, pendingGame,
  team1Id, setTeam1Id, team2Id, setTeam2Id,
  setsPerMatch, setSetsPerMatch,
  startingMatch, startError, onStartMatch, onResumeMatch,
  onMatchClick,
}) {
  const teamName = (tid) => session.teams.find(t => t.id === tid)?.name || '?'
  const playerNames = (teamId) => {
    const t = session.teams.find(x => x.id === teamId)
    if (!t) return ''
    return (t.playerIds || [])
      .map(pid => session.players.find(p => p.id === pid)?.name)
      .filter(Boolean)
      .join(' · ')
  }
  const playedGames = session.games.filter(g => g.played)

  const labeledPlayed = useMemo(() => {
    return session.games
      .filter(g => g.played)
      .map((g, i) => {
        const won1 = (g.sets || []).filter(s => s.winner === 1).length
        const won2 = (g.sets || []).filter(s => s.winner === 2).length
        const useSets = (g.setsPerMatch || 1) > 1
        return {
          game: g,
          label: `Match ${i + 1}`,
          match: {
            id:     g.id,
            team1:  g.team1Id,
            team2:  g.team2Id,
            score1: useSets ? won1 : (g.score1 ?? 0),
            score2: useSets ? won2 : (g.score2 ?? 0),
            winner: g.winnerId,
            played: true,
            log:    g.log  || [],
            sets:   g.sets || [],
            label:  `Match ${i + 1}`,
          },
        }
      })
      .reverse()
  }, [session.games])

  return (
    <div className="px-4">
      {/* Start Match at top */}
      {isAdmin && !isFinished && (
        <div className="mb-6">
          <SectionLabel color="free">Start a Match</SectionLabel>

          {pendingGame ? (
            <div className="bg-free/10 border border-free/30 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-bold text-free">Match in progress</div>
                <div className="text-[11px] text-dim mt-0.5">
                  {teamName(pendingGame.team1Id)} vs {teamName(pendingGame.team2Id)}
                </div>
              </div>
              <button
                onClick={() => onResumeMatch(pendingGame)}
                className="shrink-0 px-4 py-2 rounded-xl bg-free text-white text-[13px] font-bold border-0 cursor-pointer active:scale-[0.97] transition-transform"
              >
                Resume →
              </button>
            </div>
          ) : session.teams.length < 2 ? (
            <div className="text-[13px] text-dim">Create at least 2 teams to start a match.</div>
          ) : (
            <div className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-dim uppercase tracking-wide">Team A</label>
                  <select
                    value={team1Id}
                    onChange={e => setTeam1Id(e.target.value)}
                    className="w-full bg-bg border border-line rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-free appearance-none"
                  >
                    <option value="">Pick team…</option>
                    {session.teams.map(t => (
                      <option key={t.id} value={t.id} disabled={t.id === team2Id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-2.5 text-[13px] font-black text-dim shrink-0">VS</div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-dim uppercase tracking-wide">Team B</label>
                  <select
                    value={team2Id}
                    onChange={e => setTeam2Id(e.target.value)}
                    className="w-full bg-bg border border-line rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-free appearance-none"
                  >
                    <option value="">Pick team…</option>
                    {session.teams.map(t => (
                      <option key={t.id} value={t.id} disabled={t.id === team1Id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-2">Sets per match</div>
                <div className="flex gap-2">
                  {[1, 3].map(n => (
                    <button
                      key={n}
                      onClick={() => setSetsPerMatch(n)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-[13px] font-bold transition-all cursor-pointer
                        ${setsPerMatch === n ? 'border-free bg-free/10 text-free' : 'border-line bg-bg text-dim'}`}
                    >
                      {n === 1 ? '1 Set' : 'Best of 3'}
                    </button>
                  ))}
                </div>
              </div>

              <AppButton
                variant="free"
                onClick={onStartMatch}
                disabled={!team1Id || !team2Id || team1Id === team2Id || startingMatch}
              >
                {startingMatch ? 'Starting…' : '🏐 Start Match'}
              </AppButton>
              {startError && (
                <div className="mt-2 p-3 rounded-xl bg-error/10 border border-error/30 text-error text-[12px] font-mono break-all">
                  {startError}
                </div>
              )}
              {/* sessionId available if needed for navigation context */}
              <input type="hidden" value={sessionId} readOnly />
            </div>
          )}
        </div>
      )}

      {/* Past Matches */}
      <SectionLabel color="free">
        Past Matches ({playedGames.length})
      </SectionLabel>

      {labeledPlayed.length === 0 ? (
        <div className="text-[13px] text-dim">No matches played yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {labeledPlayed.map(({ game: g, match: m, label }) => {
            const t1 = teamName(m.team1)
            const t2 = teamName(m.team2)
            const n1 = playerNames(m.team1)
            const n2 = playerNames(m.team2)
            return (
              <div
                key={g.id}
                onClick={() => onMatchClick && onMatchClick(m)}
                className="bg-surface rounded-xl px-3.5 py-3 border border-line cursor-pointer hover:bg-alt transition-colors"
              >
                <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-1.5">
                  {label}
                </div>
                <div className="flex items-center">
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] truncate ${m.winner === m.team1 ? 'font-bold text-free' : 'font-medium text-dim'}`}>
                      {t1}
                    </div>
                    {n1 && <div className="text-[10px] text-dim mt-0.5 truncate">{n1}</div>}
                  </div>
                  <div className="flex items-center gap-1 px-3 shrink-0">
                    <span className={`text-[16px] font-bold ${m.winner === m.team1 ? 'text-free' : 'text-text'}`}>{m.score1}</span>
                    <span className="text-[10px] text-dim">–</span>
                    <span className={`text-[16px] font-bold ${m.winner === m.team2 ? 'text-free' : 'text-text'}`}>{m.score2}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className={`text-[13px] truncate ${m.winner === m.team2 ? 'font-bold text-free' : 'font-medium text-dim'}`}>
                      {t2}
                    </div>
                    {n2 && <div className="text-[10px] text-dim mt-0.5 truncate">{n2}</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
