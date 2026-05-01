import { Link2 } from 'lucide-react'
import { AppButton, SectionLabel } from '../ui-new'
import PlayerChip from './PlayerChip'

export default function PlayersTab({ session, isFinished, isAdmin, onOpenAdd, onRemovePlayer, onCopyLink, copied, removingId }) {
  return (
    <div className="px-4">
      <SectionLabel color="free">
        Players ({session.players.length})
      </SectionLabel>

      {session.players.length === 0 ? (
        <div className="text-[13px] text-dim mb-4">No players yet — add some below.</div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {session.players.map(p => (
            <PlayerChip
              key={p.id}
              player={p}
              readonly={!isAdmin || isFinished || removingId === p.id}
              onRemove={onRemovePlayer}
            />
          ))}
        </div>
      )}

      {isAdmin && !isFinished && (
        <>
          <AppButton
            variant="outline"
            onClick={onOpenAdd}
            className="border-free/40 text-free hover:bg-free/5"
          >
            + Add Player
          </AppButton>

          <button
            onClick={onCopyLink}
            className="mt-3 flex items-center gap-2 text-[13px] text-free font-semibold bg-transparent border-0 cursor-pointer active:opacity-70 transition-opacity"
          >
            <Link2 size={16} strokeWidth={2} />
            {copied ? 'Copied!' : 'Copy invite link'}
          </button>
        </>
      )}

      {!isAdmin && !isFinished && (
        <button
          onClick={onCopyLink}
          className="mt-1 flex items-center gap-2 text-[13px] text-free font-semibold bg-transparent border-0 cursor-pointer active:opacity-70 transition-opacity"
        >
          <Link2 size={16} strokeWidth={2} />
          {copied ? 'Copied!' : 'Copy invite link'}
        </button>
      )}
    </div>
  )
}
