import { useState } from 'react'
import { Link2, Pencil } from 'lucide-react'
import { AppBadge } from '../ui-new'

function SessionMenu({ isAdmin, isFinished, onCopyLink, copied, onConfirmEnd, onConfirmDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-10 h-10 flex items-center justify-center bg-surface border border-line rounded-xl text-dim text-[20px] font-black leading-none pb-1"
      >
        ···
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 bg-surface border border-line rounded-xl shadow-lg overflow-hidden min-w-[190px]">
            <button
              onClick={() => { setOpen(false); onCopyLink() }}
              className="w-full px-4 py-3.5 text-left text-[13px] font-semibold text-text flex items-center gap-3 active:bg-alt border-0 bg-transparent cursor-pointer"
            >
              <span className="text-free"><Link2 size={16} strokeWidth={2} /></span>
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </button>
            {isAdmin && !isFinished && (
              <button
                onClick={() => { setOpen(false); onConfirmEnd() }}
                className="w-full px-4 py-3.5 text-left text-[13px] font-semibold text-error flex items-center gap-3 active:bg-alt border-0 bg-transparent cursor-pointer border-t border-line"
              >
                Finish Session
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => { setOpen(false); onConfirmDelete() }}
                className="w-full px-4 py-3.5 text-left text-[13px] font-semibold text-error flex items-center gap-3 active:bg-alt border-0 bg-transparent cursor-pointer border-t border-line"
              >
                Delete Session
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function SessionHeader({
  session, isAdmin, isFinished,
  onBack, onEditSession,
  onCopyLink, copied,
  onConfirmEnd, onConfirmDelete,
}) {
  return (
    <div className="screen__top flex items-center justify-between px-4 pt-5 pb-4">
      <button
        onClick={onBack}
        className="w-10 h-10 flex items-center justify-center bg-surface border border-line rounded-xl text-text"
      >
        {/* ChevronLeft kept as the back icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="flex-1 text-center px-3 min-w-0">
        <div className="flex items-center justify-center gap-2">
          <div className="text-[17px] font-black text-free uppercase tracking-widest truncate">
            {session.name || 'Free Play'}
          </div>
          {isAdmin && !isFinished && (
            <button
              onClick={onEditSession}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-dim hover:text-free hover:bg-free/10 transition-colors bg-transparent border-0 cursor-pointer shrink-0"
              aria-label="Edit session"
            >
              <Pencil size={16} strokeWidth={2} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-center mt-0.5">
          <AppBadge text={isFinished ? 'Finished' : 'Active'} variant={isFinished ? 'dim' : 'free'} />
        </div>
      </div>

      <SessionMenu
        isAdmin={isAdmin}
        isFinished={isFinished}
        onCopyLink={onCopyLink}
        copied={copied}
        onConfirmEnd={onConfirmEnd}
        onConfirmDelete={onConfirmDelete}
      />
    </div>
  )
}
