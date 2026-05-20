import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { updateLeague, updateLeagueScoringConfig, deleteLeague, leaveLeague } from '../../services/leagueService'
import {
  buildInviteLink,
  buildViewLink,
  regenerateInviteCode,
  addMemberRole,
  removeMemberRole,
  grantMemberPermission,
  revokeMemberPermission,
} from '../../services/inviteService'
import { SectionLabel, ConfirmModal } from '../ui-new'
import ScoringLevelSelect from '../ScoringLevelSelect'

// ─── Inline SVG helpers ───────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    {children}
  </svg>
)

const CopyIcon = () => (
  <Svg size={16}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </Svg>
)

// ─── Role badge colours ───────────────────────────────────────────────────────
const ROLE_COLORS = {
  admin:  'text-free   bg-free/15',
  player: 'text-accent bg-accent/15',
  scorer: 'text-success bg-success/15',
  viewer: 'text-dim    bg-alt',
}

// ─── SettingsTab ──────────────────────────────────────────────────────────────
export default function SettingsTab({ league, isAdmin, isSuperAdmin, refetch, currentUserId }) {
  const navigate                   = useNavigate()
  const { showError }              = useToast()
  const [copying,     setCopying]  = useState(false)
  const [copyingView, setCopyingView] = useState(false)
  const [regen,       setRegen]    = useState(false)
  const [deleting,    setDeleting] = useState(false)
  const [leaving,     setLeaving]  = useState(false)
  const [saving,      setSaving]   = useState(null) // userId being saved
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: 'Confirm', confirmVariant: 'error', onConfirm: null })
  const isOwner    = league?.ownerId === currentUserId
  const inviteLink = buildInviteLink(league?.inviteCode || '')
  const viewLink   = buildViewLink(league?.inviteCode || '')

  const [editName,       setEditName]       = useState(league?.name       || '')
  const [editLocation,   setEditLocation]   = useState(league?.location   || '')
  const [editVisibility, setEditVisibility] = useState(league?.visibility || 'public')
  const [editingGeneral, setEditingGeneral] = useState(false)
  const [savingGeneral,  setSavingGeneral]  = useState(false)
  const [generalSaved,   setGeneralSaved]   = useState(false)

  const [scoringLevel,   setScoringLevel]   = useState(league?.scoringConfig?.level ?? 3)
  const [scoringSaving,  setScoringSaving]  = useState(false)
  const [scoringSaved,   setScoringSaved]   = useState(false)

  async function handleSaveGeneral(e) {
    e.preventDefault()
    if (!editName.trim()) return
    setSavingGeneral(true)
    try {
      await updateLeague(league.id, {
        name:       editName.trim(),
        location:   editLocation.trim(),
        visibility: editVisibility,
      })
      await refetch()
      setGeneralSaved(true)
      setEditingGeneral(false)
      setTimeout(() => setGeneralSaved(false), 2000)
    } finally {
      setSavingGeneral(false)
    }
  }

  function handleCancelGeneral() {
    setEditName(league?.name       || '')
    setEditLocation(league?.location   || '')
    setEditVisibility(league?.visibility || 'public')
    setEditingGeneral(false)
  }

  async function handleScoringLevelChange(level) {
    setScoringLevel(level)
    setScoringSaving(true)
    try {
      await updateLeagueScoringConfig(league.id, { level })
      await refetch()
      setScoringSaved(true)
      setTimeout(() => setScoringSaved(false), 2000)
    } finally {
      setScoringSaving(false)
    }
  }

  async function handleToggleAdmin(member) {
    setSaving(member.userId)
    try {
      if (member.roles.includes('admin')) {
        await removeMemberRole(league.id, member.userId, 'admin')
      } else {
        await addMemberRole(league.id, member.userId, 'admin')
      }
      await refetch()
    } finally {
      setSaving(null)
    }
  }

  async function handleToggleScore(member) {
    setSaving(member.userId)
    try {
      if (member.permissions.has('score_match')) {
        await revokeMemberPermission(league.id, member.userId, 'score_match')
      } else {
        await grantMemberPermission(league.id, member.userId, 'score_match')
      }
      await refetch()
    } finally {
      setSaving(null)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink)
    setCopying(true)
    setTimeout(() => setCopying(false), 1500)
  }

  async function handleCopyView() {
    await navigator.clipboard.writeText(viewLink)
    setCopyingView(true)
    setTimeout(() => setCopyingView(false), 1500)
  }

  function handleRegen() {
    setConfirmModal({
      open: true,
      title: 'Regenerate invite code?',
      message: 'The old link will stop working. Anyone with the previous link will not be able to join.',
      confirmLabel: 'Regenerate',
      confirmVariant: 'error',
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }))
        setRegen(true)
        try {
          await regenerateInviteCode(league.id)
          refetch()
        } finally {
          setRegen(false)
        }
      },
    })
  }

  function handleDelete() {
    setConfirmModal({
      open: true,
      title: `Delete "${league.name}"?`,
      message: 'This cannot be undone — all tournaments and match history will be permanently lost.',
      confirmLabel: 'Delete',
      confirmVariant: 'error',
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }))
        setDeleting(true)
        try {
          await deleteLeague(league.id)
          navigate('/')
        } finally {
          setDeleting(false)
        }
      },
    })
  }

  function handleLeave() {
    setConfirmModal({
      open: true,
      title: `Leave "${league.name}"?`,
      message: 'You will be unlinked from your player profile. Your match history will remain.',
      confirmLabel: 'Leave',
      confirmVariant: 'error',
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }))
        setLeaving(true)
        try {
          await leaveLeague(league.id)
          navigate('/')
        } catch (err) {
          showError(err, 'Failed to leave league.')
          setLeaving(false)
        }
      },
    })
  }

  return (
    <div>
      {(isAdmin || isSuperAdmin) && (
        <>
          <SectionLabel color="accent">General</SectionLabel>
          {!editingGeneral ? (
            <div className="bg-surface border border-line rounded-xl p-4 mb-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="text-[15px] font-bold text-text leading-snug">{league?.name}</div>
                <button
                  type="button"
                  onClick={() => setEditingGeneral(true)}
                  className="flex-shrink-0 text-[12px] font-bold text-accent bg-accent/10 border border-accent/30 px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-dim w-20">Location</span>
                  <span className="text-[13px] text-text">{league?.location || <span className="text-dim italic">Not set</span>}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-dim w-20">Visibility</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md capitalize ${
                    league?.visibility === 'private'
                      ? 'bg-error/10 text-error'
                      : 'bg-success/10 text-success'
                  }`}>
                    {league?.visibility || 'public'}
                  </span>
                </div>
              </div>
              {generalSaved && (
                <div className="mt-3 text-[12px] text-success font-semibold">Saved!</div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveGeneral} className="bg-surface border border-line rounded-xl p-4 mb-4 flex flex-col gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-dim mb-1.5">League Name</div>
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="League name"
                  className="w-full bg-bg border border-line rounded-xl px-3 py-2.5 text-[14px] text-text placeholder:text-dim outline-none focus:border-accent"
                />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-dim mb-1.5">Location</div>
                <input
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                  placeholder="City, Country (optional)"
                  className="w-full bg-bg border border-line rounded-xl px-3 py-2.5 text-[14px] text-text placeholder:text-dim outline-none focus:border-accent"
                />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-dim mb-1.5">Visibility</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditVisibility('public')}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-colors ${
                      editVisibility === 'public'
                        ? 'bg-accent text-white border-accent'
                        : 'bg-bg text-dim border-line'
                    }`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditVisibility('private')}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-colors ${
                      editVisibility === 'private'
                        ? 'bg-accent text-white border-accent'
                        : 'bg-bg text-dim border-line'
                    }`}
                  >
                    Private
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={!editName.trim() || savingGeneral}
                className="w-full py-3 rounded-xl bg-accent text-white font-bold text-[14px] disabled:opacity-50"
              >
                {savingGeneral ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancelGeneral}
                className="w-full py-2.5 rounded-xl text-dim font-semibold text-[13px] bg-transparent border-0 cursor-pointer"
              >
                Cancel
              </button>
            </form>
          )}

          <SectionLabel color="accent">Default Scoring Detail</SectionLabel>
          <div className="bg-surface border border-line rounded-xl p-4 mb-4">
            <ScoringLevelSelect
              value={scoringLevel}
              onChange={handleScoringLevelChange}
            />
            {scoringSaving && (
              <div className="mt-3 text-[12px] text-dim">Saving…</div>
            )}
            {scoringSaved && !scoringSaving && (
              <div className="mt-3 text-[12px] text-success font-semibold">Saved!</div>
            )}
          </div>

          <SectionLabel color="accent">Invite Players</SectionLabel>
          <div className="bg-surface border border-line rounded-xl p-4 mb-4">

            {/* ── Join link (admin only) ── */}
            {(isAdmin || isSuperAdmin) && (
              <>
                <div className="text-[11px] font-semibold text-text mb-1">Join link</div>
                <div className="text-[10px] text-dim mb-2">Recipients log in and join as a player.</div>
                <div className="flex items-center gap-2 bg-bg border border-line rounded-lg px-3 py-2 mb-3">
                  <span className="flex-1 text-[11px] text-text truncate">{inviteLink}</span>
                  <button
                    onClick={handleCopy}
                    className="text-accent flex items-center gap-1 text-[11px] font-bold bg-transparent border-0 cursor-pointer flex-shrink-0"
                  >
                    <CopyIcon /> {copying ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {isAdmin && (
                  <button
                    onClick={handleRegen}
                    disabled={regen}
                    className="text-[11px] text-dim font-semibold bg-transparent border-0 cursor-pointer disabled:opacity-50 mb-4 block"
                  >
                    {regen ? 'Regenerating…' : '↻ Regenerate code'}
                  </button>
                )}
                <div className="border-t border-line my-3" />
              </>
            )}

            {/* ── View link (all members) ── */}
            <div className="text-[11px] font-semibold text-text mb-1">View link</div>
            <div className="text-[10px] text-dim mb-2">
              Anyone with this link can browse rankings, matches, and results —
              {league?.visibility === 'public' ? ' no account needed.' : ' they must log in first (private league).'}
            </div>
            <div className="flex items-center gap-2 bg-bg border border-line rounded-lg px-3 py-2">
              <span className="flex-1 text-[11px] text-text truncate">{viewLink}</span>
              <button
                onClick={handleCopyView}
                className="text-accent flex items-center gap-1 text-[11px] font-bold bg-transparent border-0 cursor-pointer flex-shrink-0"
              >
                <CopyIcon /> {copyingView ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── View link for non-admin members ── */}
      {!(isAdmin || isSuperAdmin) && (
        <>
          <SectionLabel color="accent">Share League</SectionLabel>
          <div className="bg-surface border border-line rounded-xl p-4 mb-4">
            <div className="text-[11px] font-semibold text-text mb-1">View link</div>
            <div className="text-[10px] text-dim mb-2">
              Share this so anyone can browse rankings, matches, and results —
              {league?.visibility === 'public' ? ' no account needed.' : ' they must log in first (private league).'}
            </div>
            <div className="flex items-center gap-2 bg-bg border border-line rounded-lg px-3 py-2">
              <span className="flex-1 text-[11px] text-text truncate">{viewLink}</span>
              <button
                onClick={handleCopyView}
                className="text-accent flex items-center gap-1 text-[11px] font-bold bg-transparent border-0 cursor-pointer flex-shrink-0"
              >
                <CopyIcon /> {copyingView ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </>
      )}

      <SectionLabel color="dim">Members</SectionLabel>
      <div className="bg-surface border border-line rounded-xl overflow-hidden mb-4">
        {(league?.members || []).map((m, i, arr) => {
          const isSelf    = m.userId === currentUserId
          const isLoading = saving === m.userId
          const canEdit   = (isAdmin || isSuperAdmin) && !isSelf
          const memberIsAdmin = m.roles.includes('admin')
          const canScore  = m.permissions?.has('score_match') ?? false

          return (
            <div key={m.userId} className={`px-3.5 py-2.5 ${i < arr.length - 1 ? 'border-b border-line' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-alt flex items-center justify-center text-[11px] font-bold text-text flex-shrink-0">
                  {(m.fullName || '?')[0]}
                </div>
                <span className="flex-1 text-[13px] font-medium text-text truncate">
                  {m.fullName || 'Unknown'}
                  {isSelf && <span className="ml-1.5 text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded">YOU</span>}
                </span>
                <span className={`text-[9px] font-bold px-2 py-[3px] rounded-md capitalize ${ROLE_COLORS[memberIsAdmin ? 'admin' : m.role] || ROLE_COLORS.viewer}`}>
                  {memberIsAdmin ? 'admin' : m.role}
                </span>
              </div>

              {canEdit && (
                <div className="flex items-center gap-2 mt-2 pl-[38px]">
                  <button
                    onClick={() => handleToggleAdmin(m)}
                    disabled={isLoading}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer disabled:opacity-50 transition-colors ${
                      memberIsAdmin
                        ? 'border-error/40 text-error bg-error/10 hover:bg-error/20'
                        : 'border-free/40 text-free bg-free/10 hover:bg-free/20'
                    }`}
                  >
                    {isLoading ? '…' : memberIsAdmin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                  <button
                    onClick={() => handleToggleScore(m)}
                    disabled={isLoading}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer disabled:opacity-50 transition-colors ${
                      canScore
                        ? 'border-success/40 text-success bg-success/10 hover:bg-success/20'
                        : 'border-line text-dim bg-alt hover:bg-surface'
                    }`}
                  >
                    {isLoading ? '…' : canScore ? 'Can Score ✓' : 'Can Score'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {(league?.members || []).length === 0 && (
          <div className="text-center text-[13px] text-dim py-4">No members found</div>
        )}
      </div>

      <SectionLabel color="dim">Danger Zone</SectionLabel>
      <div className="bg-surface border border-error/30 rounded-xl p-4 mb-4">
        {isOwner ? (
          <>
            <div className="text-[13px] font-semibold text-text mb-1">Delete League</div>
            <div className="text-[11px] text-dim mb-3">
              Permanently deletes the league, all tournaments, and all match history.
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-3 rounded-xl bg-error/10 border border-error/30 text-error font-bold text-[13px] disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete League'}
            </button>
          </>
        ) : (
          <>
            <div className="text-[13px] font-semibold text-text mb-1">Leave League</div>
            <div className="text-[11px] text-dim mb-3">
              You will lose access to this league and its tournaments. Your match history will remain.
            </div>
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="w-full py-3 rounded-xl bg-error/10 border border-error/30 text-error font-bold text-[13px] disabled:opacity-50"
            >
              {leaving ? 'Leaving…' : 'Leave League'}
            </button>
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmVariant={confirmModal.confirmVariant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(m => ({ ...m, open: false }))}
      />
    </div>
  )
}
