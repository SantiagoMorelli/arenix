import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import StatusBadge from './StatusBadge'

function TournamentMenu({ onDelete, deleting }) {
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

export default function TournamentHeader({ tournament, league, onBack, isAdmin, onDelete, deleting }) {
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
        <TournamentMenu onDelete={onDelete} deleting={deleting} />
      )}
    </div>
  )
}
