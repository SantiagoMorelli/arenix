import { useNavigate } from 'react-router-dom'
import { Trophy, Plus } from 'lucide-react'
import { AppBadge } from '../ui-new'
import { getTournamentPodium } from '../../lib/leagueInsights'

function getTournamentStatus(t) {
  if (t.status === 'completed') return { label: 'Completed', variant: 'dim' }
  if (['group', 'knockout', 'freeplay'].includes(t.phase)) return { label: 'In Progress', variant: 'success' }
  if (t.phase === 'setup') return { label: 'Setup', variant: 'accent' }
  return { label: 'Active', variant: 'success' }
}

function getTournamentPlayerCount(t) {
  return new Set((t.teams || []).flatMap(team => team.players || [])).size
}

/**
 * Tournaments tab — full reverse-chronological list of league tournaments
 * with status badges and podiums for completed ones.
 */
export default function TournamentsTab({ league, isAdmin, isGuest }) {
  const navigate    = useNavigate()
  const tournaments = [...(league.tournaments || [])].reverse()
  const canCreate   = isAdmin && !isGuest

  return (
    <>
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[12px] font-bold text-accent tracking-wide uppercase">Tournaments</span>
        {canCreate && (
          <button
            onClick={() => navigate(`/league/${league.id}/tournament/new`)}
            className="flex items-center gap-1 text-[11px] font-semibold text-accent cursor-pointer bg-transparent border-0"
          >
            <Plus size={14} /> New
          </button>
        )}
      </div>

      {tournaments.length > 0 ? (
        <div className="flex flex-col gap-2">
          {tournaments.map(t => {
            const { label, variant } = getTournamentStatus(t)
            const pCount             = getTournamentPlayerCount(t)
            const podium             = getTournamentPodium(t, league?.players || [])
            const modeLabel          = t.teamSize ? `${t.teamSize} vs ${t.teamSize}` : 'Custom'
            const teamsCount         = (t.teams || []).length

            return (
              <div
                key={t.id}
                onClick={() => navigate(`/league/${league.id}/tournament/${t.id}`)}
                className="bg-surface rounded-xl p-3.5 flex flex-col gap-2.5 border border-line cursor-pointer active:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-accent/15 flex items-center justify-center flex-shrink-0 text-accent">
                    <Trophy size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-text truncate">{t.name}</div>
                    <div className="text-[11px] text-dim">{modeLabel} • {teamsCount} teams • {pCount} players</div>
                  </div>
                  <AppBadge text={label} variant={variant} />
                </div>
                {podium && (
                  <div className="mt-1 pt-2.5 border-t border-line/50 flex flex-col gap-1.5 pl-12">
                    {podium.first && <div className="text-[12px] text-text font-medium truncate">🥇 {podium.first}</div>}
                    {podium.second && <div className="text-[12px] text-dim truncate">🥈 {podium.second}</div>}
                    {podium.third && <div className="text-[12px] text-dim truncate">🥉 {podium.third}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-[13px] text-dim text-center py-6">
          No tournaments yet{canCreate && ' — '}
          {canCreate && (
            <button
              onClick={() => navigate(`/league/${league.id}/tournament/new`)}
              className="text-accent font-semibold bg-transparent border-0 cursor-pointer p-0"
            >
              create one
            </button>
          )}
        </div>
      )}
    </>
  )
}
