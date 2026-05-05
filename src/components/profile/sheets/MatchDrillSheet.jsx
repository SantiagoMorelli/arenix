import { Swords, ChevronRight } from 'lucide-react'
import { AppSheet } from '../../ui-new'

function formatDate(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function teamName(teamId, tournament) {
  const team = tournament?.teams?.find(t => t.id === teamId)
  if (!team) return 'Opponent'
  return team.name || team.players?.map(pid => {
    const p = tournament.players?.find(pp => pp.id === pid)
    return p?.name?.split(' ')[0] || '?'
  }).join(' & ') || 'Team'
}

function pointsForPlayer(match, pid) {
  let pts = 0
  for (const e of match.log || []) {
    if (e.scoringPlayerId === pid) pts++
  }
  return pts
}

export default function MatchDrillSheet({
  open,
  onClose,
  tournament,
  rawTournament,
  onSelect,
}) {
  const matches = tournament?.matches || []
  const wins = tournament?.wins || 0
  const losses = tournament?.losses || 0

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={tournament?.tournamentName || 'Tournament'}
      icon={<div className="w-7 h-7 rounded-lg bg-free/15 flex items-center justify-center"><Swords size={14} className="text-free" /></div>}
    >
      {/* Summary */}
      <div className="bg-bg rounded-xl p-3 mb-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wide text-dim">Record</div>
          <div className="font-display text-[22px] text-text leading-none">
            {wins}-{losses}
          </div>
        </div>
        {tournament?.points != null && (
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wide text-dim">My points</div>
            <div className="font-display text-[22px] text-accent leading-none">
              {tournament.points}
            </div>
          </div>
        )}
        {tournament?.aces != null && (
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wide text-dim">Aces</div>
            <div className="font-display text-[22px] text-success leading-none">
              {tournament.aces}
            </div>
          </div>
        )}
      </div>

      {/* Match list */}
      {matches.length === 0 ? (
        <div className="text-center text-[12px] text-dim py-6">No matches</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {matches.map(a => {
            const m = a.match
            const won = m.winner === a.playerTeamId
            const myPts = pointsForPlayer(m, a.pid)
            const opp = teamName(a.opposingTeamId, rawTournament)
            const setsStr = (m.sets || []).map(s => `${s.s1}-${s.s2}`).join(' / ')
            return (
              <button
                key={m.id}
                onClick={() => onSelect(a)}
                className="
                  bg-surface border border-line rounded-xl px-3 py-2 cursor-pointer
                  flex items-center gap-3 text-left
                  active:opacity-80 transition-opacity
                "
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] text-dim">{formatDate(a.date)}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-[1px] rounded ${won ? 'text-success bg-success/15' : 'text-error bg-error/15'}`}>
                      {won ? 'WIN' : 'LOSS'}
                    </span>
                  </div>
                  <div className="text-[12px] font-semibold text-text truncate">
                    vs {opp}
                  </div>
                  <div className="text-[10px] text-dim">{setsStr || `${m.score1}-${m.score2}`}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display text-[18px] text-accent leading-none">{myPts}</div>
                  <div className="text-[9px] text-dim mt-0.5 uppercase tracking-wide">Pts</div>
                </div>
                <ChevronRight size={14} className="text-dim flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </AppSheet>
  )
}
