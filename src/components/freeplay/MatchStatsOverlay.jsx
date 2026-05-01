import { useMemo } from 'react'
import { ChevronLeft } from 'lucide-react'
import GameStats from '../GameStats'

const STATS_T = {
  winner: 'Winner',
  totalPoints: 'Total Points',
  totalLabel: 'pts',
  streaks: 'Streaks',
  maxStreak: 'Max streak',
  howWonTitle: 'How points were won',
  comparison: 'vs',
  serveEff: 'Serve Efficiency',
  whileServing: 'serving',
  whileReceiving: 'receiving',
  history: 'Match History',
  newMatch: 'New Match',
}

export default function MatchStatsOverlay({ match, session, onClose }) {
  const teams = useMemo(
    () => (session.teams || []).map(t => ({
      id:      t.id,
      name:    t.name,
      players: t.playerIds || [],
    })),
    [session.teams]
  )
  const players = session.players || []

  const teamName = (id) => teams.find(x => x.id === id)?.name || '?'
  const teamPlayerNames = (teamId) => {
    const t = teams.find(x => x.id === teamId)
    if (!t) return ''
    return t.players
      .map(pid => players.find(p => p.id === pid)?.name)
      .filter(Boolean)
      .join(' · ')
  }

  const t1Sets = (match.sets || []).filter(s => s.winner === 1).length
  const t2Sets = (match.sets || []).filter(s => s.winner === 2).length

  return (
    <div className="absolute inset-0 z-[100] bg-bg flex flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5 flex-shrink-0 bg-surface border-b border-line">
        <button
          onClick={onClose}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text flex-shrink-0"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold text-text leading-tight truncate">
            Match Details
          </div>
          <div className="text-[11px] text-free">{match.label || 'Result'}</div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 relative">
        {match.log && match.log.length > 0 ? (
          <GameStats
            winner={match.winner}
            team1Id={match.team1}
            team2Id={match.team2}
            sets={(match.sets && match.sets.length > 0)
              ? match.sets
              : [{ s1: match.score1, s2: match.score2, winner: match.winner }]}
            t1Sets={(match.sets && match.sets.length > 0)
              ? t1Sets
              : (match.winner === match.team1 ? 1 : 0)}
            t2Sets={(match.sets && match.sets.length > 0)
              ? t2Sets
              : (match.winner === match.team2 ? 1 : 0)}
            log={match.log}
            teams={teams}
            players={players}
            t={k => STATS_T[k] || k}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full gap-6">
            <div className="text-[48px]">📋</div>
            <div>
              <div className="text-[18px] font-bold text-text mb-1">Match Result</div>
              <div className="text-[13px] text-dim">No detailed stats were recorded for this match.</div>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-[280px]">
              {[
                { teamId: match.team1, score: match.score1 },
                { teamId: match.team2, score: match.score2 },
              ].map(({ teamId, score }, idx) => {
                const isWinner = match.winner === teamId
                const names = teamPlayerNames(teamId)
                return (
                  <div key={teamId} className={`flex justify-between items-start ${idx === 0 ? 'mb-4' : ''}`}>
                    <div className="flex-1 min-w-0 pr-3">
                      <div className={`text-[15px] ${isWinner ? 'font-bold text-free' : 'font-medium text-dim'}`}>
                        {teamName(teamId)}
                      </div>
                      {names && <div className="text-[10px] text-dim mt-0.5">{names}</div>}
                    </div>
                    <span className={`text-[24px] font-black flex-shrink-0 ${isWinner ? 'text-free' : 'text-text'}`}>
                      {score}
                    </span>
                  </div>
                )
              })}
            </div>

            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-alt text-[13px] font-bold text-text border-0 cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
