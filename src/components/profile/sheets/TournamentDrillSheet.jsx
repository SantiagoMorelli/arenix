import { Trophy, ChevronRight } from 'lucide-react'
import { AppSheet } from '../../ui-new'

const PCT = (n) => `${Math.round((n || 0) * 100)}%`

function formatDate(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TournamentDrillSheet({ open, onClose, tournaments, onSelect }) {
  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title="My tournaments"
      icon={<div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center"><Trophy size={14} className="text-accent" /></div>}
    >
      {(tournaments || []).length === 0 ? (
        <div className="text-center text-[12px] text-dim py-8">
          No tournaments to show.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(tournaments || []).map(t => (
            <button
              key={t.tournamentId}
              onClick={() => onSelect(t)}
              className="
                bg-bg rounded-xl px-3 py-2.5 border-0 cursor-pointer
                flex items-center gap-3 text-left
                active:opacity-80 transition-opacity
              "
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-text truncate">
                  {t.tournamentName}
                </div>
                <div className="text-[10px] text-dim truncate">
                  {t.leagueName} · {formatDate(t.date)}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[9px] font-bold text-text bg-alt px-1.5 py-[2px] rounded">
                    {t.matches.length} match{t.matches.length === 1 ? '' : 'es'}
                  </span>
                  <span className="text-[9px] font-bold text-success bg-success/15 px-1.5 py-[2px] rounded">
                    {t.wins}W
                  </span>
                  <span className="text-[9px] font-bold text-error bg-error/15 px-1.5 py-[2px] rounded">
                    {t.losses}L
                  </span>
                  {t.finishRank && (
                    <span className="text-[9px] font-bold text-accent bg-accent/15 px-1.5 py-[2px] rounded">
                      #{t.finishRank}
                    </span>
                  )}
                  {t.serves > 0 && (
                    <span className="text-[9px] font-bold text-free bg-free/15 px-1.5 py-[2px] rounded">
                      {PCT(t.serveWinPct)} serve
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-dim flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </AppSheet>
  )
}
