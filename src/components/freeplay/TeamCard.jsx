import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

export default function TeamCard({ team, players, onEdit, onDelete, readonly }) {
  const [confirmDel, setConfirmDel] = useState(false)

  const teamPlayers = team.playerIds
    .map(pid => players.find(p => p.id === pid))
    .filter(Boolean)

  return (
    <div className="bg-surface border border-line rounded-xl p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-[14px] font-bold text-text flex-1 min-w-0 truncate">{team.name}</div>
        {!readonly && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-dim hover:text-free hover:bg-free/10 transition-colors bg-transparent border-0 cursor-pointer"
            >
              <Pencil size={16} strokeWidth={2} />
            </button>
            <button
              onClick={() => setConfirmDel(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-dim hover:text-error hover:bg-error/10 transition-colors bg-transparent border-0 cursor-pointer"
            >
              <Trash2 size={16} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {teamPlayers.length === 0 ? (
        <div className="text-[12px] text-dim">No players assigned</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {teamPlayers.map(p => (
            <span key={p.id} className="text-[11px] font-semibold bg-bg border border-line rounded-full px-2.5 py-1 text-dim">
              {p.name}
            </span>
          ))}
        </div>
      )}

      {confirmDel && (
        <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
          <span className="text-[12px] text-error font-semibold">Delete this team?</span>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDel(false)} className="text-[12px] text-dim font-semibold bg-transparent border-0 cursor-pointer">
              Cancel
            </button>
            <button onClick={onDelete} className="text-[12px] text-white bg-error font-bold px-3 py-1 rounded-lg border-0 cursor-pointer">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
