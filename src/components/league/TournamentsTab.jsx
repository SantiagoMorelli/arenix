import { useNavigate } from 'react-router-dom'
import { Trophy, Plus, ChevronRight, Crown } from 'lucide-react'
import { SectionLabel } from '../ui-new'
import { getTournamentPodium } from '../../lib/leagueInsights'

function formatDate(val) {
  if (!val) return ''
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-')
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const d = new Date(val)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isLive(t) {
  return t.status !== 'completed' && ['group', 'knockout', 'freeplay'].includes(t.phase)
}

function getTournamentPlayerCount(t) {
  return new Set((t.teams || []).flatMap(team => team.players || [])).size
}

function tournamentMeta(t) {
  const modeLabel  = t.teamSize ? `${t.teamSize} vs ${t.teamSize}` : 'Custom'
  const teamsCount = (t.teams || []).length
  return `${modeLabel} • ${teamsCount} teams • ${getTournamentPlayerCount(t)} players`
}

/**
 * Tournaments tab — status-grouped sections: live tournaments first in green,
 * then upcoming (setup phase), then completed with a champion strip.
 */
export default function TournamentsTab({ league, isAdmin, isGuest }) {
  const navigate    = useNavigate()
  const tournaments = [...(league.tournaments || [])].reverse()
  const canCreate   = isAdmin && !isGuest

  const live      = tournaments.filter(isLive)
  const upcoming  = tournaments.filter(t => t.status !== 'completed' && !isLive(t))
  const completed = tournaments.filter(t => t.status === 'completed')

  const goTo = (t) => navigate(`/league/${league.id}/tournament/${t.id}`)

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

      {tournaments.length === 0 && (
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

      {/* ════ Live now ════ */}
      {live.length > 0 && (
        <>
          <SectionLabel color="success">Live now</SectionLabel>
          <div className="flex flex-col gap-2 mb-4">
            {live.map(t => (
              <div
                key={t.id}
                onClick={() => goTo(t)}
                className="bg-success/5 rounded-xl p-3.5 flex items-center gap-3 border border-success/40 cursor-pointer active:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-[10px] bg-success/15 flex items-center justify-center flex-shrink-0 text-success">
                  <Trophy size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-text truncate">{t.name}</div>
                  <div className="text-[11px] text-dim">{tournamentMeta(t)}</div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/15 px-[9px] py-[5px] rounded-md tracking-[0.4px] flex-shrink-0">
                  <span className="dot-pulse w-[5px] h-[5px] rounded-full bg-success" />
                  LIVE
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ════ Upcoming ════ */}
      {upcoming.length > 0 && (
        <>
          <SectionLabel color="accent">Upcoming</SectionLabel>
          <div className="flex flex-col gap-2 mb-4">
            {upcoming.map(t => (
              <div
                key={t.id}
                onClick={() => goTo(t)}
                className="bg-surface rounded-xl p-3.5 flex items-center gap-3 border border-line cursor-pointer active:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-[10px] bg-accent/15 flex items-center justify-center flex-shrink-0 text-accent">
                  <Trophy size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-text truncate">{t.name}</div>
                  <div className="text-[11px] text-dim">{tournamentMeta(t)}</div>
                </div>
                <span className="text-[10px] font-bold text-accent bg-accent/10 px-[9px] py-[5px] rounded-md tracking-[0.4px] flex-shrink-0">
                  SETUP
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ════ Completed ════ */}
      {completed.length > 0 && (
        <>
          <SectionLabel>Completed</SectionLabel>
          <div className="flex flex-col gap-2 mb-4">
            {completed.map(t => {
              const podium    = getTournamentPodium(t, league?.players || [])
              const dateLabel = formatDate(t.date)
              return (
                <div
                  key={t.id}
                  onClick={() => goTo(t)}
                  className="bg-surface rounded-xl p-3.5 flex flex-col gap-2.5 border border-line cursor-pointer active:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-alt flex items-center justify-center flex-shrink-0 text-dim">
                      <Trophy size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-text truncate">{t.name}</div>
                      <div className="text-[11px] text-dim">{tournamentMeta(t)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {dateLabel && <span className="text-[10px] text-dim">{dateLabel}</span>}
                      <ChevronRight size={16} className="text-dim" />
                    </div>
                  </div>
                  {podium?.first && (
                    <div className="pt-2.5 border-t border-line/50 flex items-center gap-2 min-w-0">
                      <span className="w-[22px] h-[22px] rounded-full bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
                        <Crown size={12} />
                      </span>
                      <span className="text-[10px] font-bold text-accent tracking-[0.4px] uppercase flex-shrink-0">
                        Champion
                      </span>
                      <span className="text-[12px] font-semibold text-text truncate">
                        {podium.first}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
