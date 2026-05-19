import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import StatusBadge from './StatusBadge'

function TournamentMenu({ tournament, onDelete, deleting, onCloseTournament, isEloProcessed, closingTournament }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-dim text-[20px] font-black leading-none cursor-pointer bg-transparent border-0"
      >
        ···
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 bg-surface border border-line rounded-xl shadow-lg overflow-hidden min-w-[180px]">
            <button
              onClick={() => { setOpen(false); onCloseTournament() }}
              disabled={isEloProcessed || closingTournament}
              className={`w-full px-4 py-3 text-left text-[13px] font-semibold hover:bg-alt cursor-pointer border-0 bg-transparent flex items-center gap-2 ${
                isEloProcessed ? 'text-dim opacity-50 cursor-not-allowed' : 'text-accent'
              }`}
            >
              🔒 {closingTournament ? 'Closing…' : (isEloProcessed ? 'Elo Processed' : 'Close tournament')}
            </button>
            
            {isEloProcessed && tournament?.elo_log && (
              <button
                onClick={() => {
                  setOpen(false)
                  const blob = new Blob([tournament.elo_log], { type: 'text/markdown' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${tournament.name.replace(/\s+/g, '_')}_Elo_Audit.md`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="w-full px-4 py-3 text-left text-[13px] font-semibold hover:bg-alt cursor-pointer border-0 bg-transparent flex items-center gap-2 text-text"
              >
                📄 Download Elo Audit
              </button>
            )}
            <div className="h-px bg-line w-full" />
            <button
              onClick={() => { setOpen(false); onDelete() }}
              disabled={deleting}
              className="w-full px-4 py-3 text-left text-[13px] font-semibold text-error hover:bg-alt cursor-pointer border-0 bg-transparent flex items-center gap-2"
            >
              🗑️ {deleting ? 'Deleting…' : 'Delete tournament'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function TournamentHeader({ tournament, league, onBack, isAdmin, onDelete, deleting, onCloseTournament, closingTournament }) {
  return (
    <div className="screen__top flex items-center gap-2.5 px-4 pt-3 pb-2.5">
      <button
        onClick={onBack}
        className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text flex-shrink-0"
      >
        <ChevronLeft size={20} strokeWidth={2} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-[18px] font-bold text-text leading-tight truncate">
          {tournament.name}
        </div>
        <div className="text-[11px] text-dim">{league?.name}</div>
      </div>
      <StatusBadge tournament={tournament} />
      {isAdmin && (
        <TournamentMenu 
          tournament={tournament}
          onDelete={onDelete} 
          deleting={deleting} 
          onCloseTournament={onCloseTournament}
          isEloProcessed={tournament.elo_processed}
          closingTournament={closingTournament}
        />
      )}
    </div>
  )
}
