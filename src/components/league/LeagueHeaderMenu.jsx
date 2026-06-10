import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Copy, Check, LogOut } from 'lucide-react'
import { AppSheet, AppBadge, ConfirmModal, IconButton } from '../ui-new'
import { buildViewLink } from '../../services/inviteService'
import { leaveLeague } from '../../services/leagueService'
import { useToast } from '../../contexts/ToastContext'

/**
 * Overflow menu shown in the league header for logged-in non-admin members
 * (who no longer see the Settings tab): basic league info, share link, and
 * the "Leave league" action.
 */
export default function LeagueHeaderMenu({ league }) {
  const navigate      = useNavigate()
  const { showError } = useToast()
  const [open,    setOpen]    = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const viewLink = buildViewLink(league?.inviteCode || '')

  async function handleCopyView() {
    await navigator.clipboard.writeText(viewLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleLeave() {
    setConfirm(false)
    setLeaving(true)
    try {
      await leaveLeague(league.id)
      navigate('/')
    } catch (err) {
      showError(err, 'Failed to leave league.')
      setLeaving(false)
    }
  }

  return (
    <>
      <IconButton onClick={() => setOpen(true)} ariaLabel="League options">
        <MoreVertical size={18} className="text-text" />
      </IconButton>

      <AppSheet open={open} onClose={() => setOpen(false)} title="League info">
        {/* ── Details ── */}
        <div className="bg-bg border border-line rounded-xl overflow-hidden mb-3">
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-line">
            <span className="text-[11px] font-bold uppercase tracking-wide text-dim">Season</span>
            <span className="text-[13px] text-text">{league?.season || new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-line">
            <span className="text-[11px] font-bold uppercase tracking-wide text-dim">Location</span>
            <span className="text-[13px] text-text">{league?.location || <span className="text-dim italic">Not set</span>}</span>
          </div>
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-line">
            <span className="text-[11px] font-bold uppercase tracking-wide text-dim">Visibility</span>
            <AppBadge
              text={league?.visibility || 'public'}
              variant={league?.visibility === 'private' ? 'error' : 'success'}
            />
          </div>
          <div className="flex items-center justify-between px-3.5 py-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-dim">Members</span>
            <span className="text-[13px] text-text">{(league?.members || []).length}</span>
          </div>
        </div>

        {/* ── Share view link ── */}
        <button
          onClick={handleCopyView}
          className="w-full flex items-center gap-2.5 bg-bg border border-line rounded-xl px-3.5 py-3 mb-3 cursor-pointer active:opacity-80 transition-opacity text-left"
        >
          {copied ? <Check size={16} className="text-success flex-shrink-0" /> : <Copy size={16} className="text-accent flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-text">{copied ? 'Copied!' : 'Copy view link'}</div>
            <div className="text-[10px] text-dim truncate">{viewLink}</div>
          </div>
        </button>

        {/* ── Leave league ── */}
        <button
          onClick={() => setConfirm(true)}
          disabled={leaving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-error/10 border border-error/30 text-error font-bold text-[13px] cursor-pointer disabled:opacity-50"
        >
          <LogOut size={15} /> {leaving ? 'Leaving…' : 'Leave League'}
        </button>
      </AppSheet>

      <ConfirmModal
        open={confirm}
        title={`Leave "${league?.name}"?`}
        message="You will be unlinked from your player profile. Your match history will remain."
        confirmLabel="Leave"
        confirmVariant="error"
        onConfirm={handleLeave}
        onCancel={() => setConfirm(false)}
      />
    </>
  )
}
