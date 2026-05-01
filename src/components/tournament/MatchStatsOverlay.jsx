import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { teamName } from '../../lib/tournament'
import GameStats from '../GameStats'
import EditMatchModal from '../EditMatchModal'

// Static translation dict for GameStats
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

export default function MatchStatsOverlay({ match, tournament, leaguePlayers, isAdmin, leagueId, tournamentId, navigate, onClose, onSaved }) {
  const [showMenu, setShowMenu] = useState(false)
  const [editingMatch, setEditingMatch] = useState(null)

  return (
    <div className="absolute inset-0 z-[100] bg-bg flex flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5 flex-shrink-0 bg-surface border-b border-line">
        <button
          onClick={() => { onClose(); setShowMenu(false) }}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text flex-shrink-0"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold text-text leading-tight truncate">
            Match Details
          </div>
          <div className="text-[11px] text-dim">{match.label || 'Result'}</div>
        </div>
        {isAdmin && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(v => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-dim text-[20px] font-black leading-none cursor-pointer bg-transparent border-0"
            >
              ···
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 z-50 bg-surface border border-line rounded-xl shadow-lg overflow-hidden min-w-[150px]">
                  <button
                    onClick={() => { setShowMenu(false); setEditingMatch(match) }}
                    className="w-full px-4 py-3 text-left text-[13px] font-semibold text-text hover:bg-alt cursor-pointer border-0 bg-transparent flex items-center gap-2"
                  >
                    ✏️ Edit
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 relative">
        {match.log && match.log.length > 0 ? (
          <GameStats
            winner={match.winner}
            team1Id={match.team1}
            team2Id={match.team2}
            sets={match.sets || [{ s1: match.score1, s2: match.score2, winner: match.winner }]}
            t1Sets={match.sets ? match.sets.filter(s => s.winner === 1).length : (match.winner === match.team1 ? 1 : 0)}
            t2Sets={match.sets ? match.sets.filter(s => s.winner === 2).length : (match.winner === match.team2 ? 1 : 0)}
            log={match.log}
            teams={tournament.teams}
            players={leaguePlayers}
            t={k => STATS_T[k] || k}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full gap-6">
            <div className="text-[48px]">📋</div>
            <div>
              <div className="text-[18px] font-bold text-text mb-1">Manual Score Result</div>
              <div className="text-[13px] text-dim">No detailed stats were recorded for this match.</div>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-[280px]">
              {[
                { teamId: match.team1, score: match.score1 },
                { teamId: match.team2, score: match.score2 },
              ].map(({ teamId, score }, idx) => {
                const isWinner = match.winner === teamId
                const t = tournament.teams.find(x => x.id === teamId)
                const names = (t?.players || []).map(pid => {
                  const p = leaguePlayers.find(x => x.id === pid)
                  return p ? (p.displayName || p.nickname || p.name) : 'Unknown'
                }).join(' · ')
                return (
                  <div key={teamId} className={`flex justify-between items-start ${idx === 0 ? 'mb-4' : ''}`}>
                    <div className="flex-1 min-w-0 pr-3">
                      <div className={`text-[15px] ${isWinner ? 'font-bold text-accent' : 'font-medium text-dim'}`}>
                        {teamName(tournament.teams, teamId)}
                      </div>
                      {names && <div className="text-[10px] text-dim mt-0.5">{names}</div>}
                    </div>
                    <span className={`text-[24px] font-black flex-shrink-0 ${isWinner ? 'text-accent' : 'text-text'}`}>
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

      {editingMatch && (
        <EditMatchModal
          match={editingMatch}
          tournament={tournament}
          teams={tournament.teams}
          leagueId={leagueId}
          tournamentId={tournamentId}
          navigate={navigate}
          onSave={() => {
            setEditingMatch(null)
            onSaved?.()
            onClose()
          }}
          onClose={() => setEditingMatch(null)}
        />
      )}
    </div>
  )
}
