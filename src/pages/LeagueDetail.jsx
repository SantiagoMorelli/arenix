import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { useAuth } from '../contexts/AuthContext'
import { addPlayer, updatePlayer, deletePlayer } from '../services/playerService'
import { deleteLeague, leaveLeague, updateLeague } from '../services/leagueService'
import { buildInviteLink, buildViewLink, regenerateInviteCode, addMemberRole, removeMemberRole, grantMemberPermission, revokeMemberPermission } from '../services/inviteService'
import { BottomNav, SectionLabel, AppBadge } from '../components/ui-new'
import LeaguePlayersTab from '../components/LeaguePlayersTab'
import { createNotification } from '../services/notificationService'
import { useToast } from '../components/ToastContext'

// ─── Inline SVG icons ────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    {children}
  </svg>
)

const BackIcon  = () => <Svg><polyline points="15 18 9 12 15 6" /></Svg>
const ChartIcon = () => <Svg><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Svg>
const UsersIcon = () => <Svg><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></Svg>
const TrophyIcon = ({ size = 20 }) => <Svg size={size}><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></Svg>
const GearIcon  = () => <Svg><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></Svg>
const PlusIcon  = ({ size = 14 }) => <Svg size={size}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Svg>
const CopyIcon  = () => <Svg size={16}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></Svg>

// ─── Country → flag emoji ──────────────────────────────────────────────────────
const FLAG = {
  argentina: '🇦🇷', 'united states': '🇺🇸', brazil: '🇧🇷', spain: '🇪🇸',
  colombia: '🇨🇴', mexico: '🇲🇽', chile: '🇨🇱', uruguay: '🇺🇾',
  france: '🇫🇷', germany: '🇩🇪', italy: '🇮🇹', australia: '🇦🇺',
  portugal: '🇵🇹', japan: '🇯🇵', canada: '🇨🇦', uk: '🇬🇧',
  'united kingdom': '🇬🇧', netherlands: '🇳🇱', sweden: '🇸🇪', norway: '🇳🇴',
}
// eslint-disable-next-line no-unused-vars
function countryFlag(country) {
  if (!country) return ''
  return FLAG[country.toLowerCase()] || ''
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function playerAvatarStyle(seed) {
  let h = 0
  const str = String(seed)
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return { backgroundColor: `oklch(0.38 0.13 ${h % 360})` }
}

function getTournamentStatus(t) {
  if (t.status === 'completed') return { label: 'Completed', variant: 'dim' }
  if (['group', 'knockout', 'freeplay'].includes(t.phase)) return { label: 'In Progress', variant: 'success' }
  if (t.phase === 'setup') return { label: 'Setup', variant: 'accent' }
  return { label: 'Active', variant: 'success' }
}

function getTournamentPlayerCount(t) {
  return new Set((t.teams || []).flatMap(team => team.players || [])).size
}

function getTournamentPodium(t, leaguePlayers = []) {
  if (t.status !== 'completed') return null
  
  let firstTeamId = null
  let secondTeamId = null
  let thirdTeamId = null
  const teams = t.teams || []

  // 1. Try Knockout final and third place matches
  const ko = t.knockout?.rounds
  if (ko) {
    const finalRound = ko.find(r => r.id === 'final')
    if (finalRound?.matches?.length) {
      const match = finalRound.matches[0]
      if (match.played && match.winner) {
        firstTeamId = match.winner
        secondTeamId = match.winner === match.team1 ? match.team2 : match.team1
      }
    }
    const thirdRound = ko.find(r => r.id === 'third_place')
    if (thirdRound?.matches?.length) {
      const match = thirdRound.matches[0]
      if (match.played && match.winner) {
        thirdTeamId = match.winner
      }
    }
  }

  // 2. Fallback to winnerTeamId if not found from KO
  if (!firstTeamId && t.winnerTeamId) {
    firstTeamId = t.winnerTeamId
  }

  // 3. Fallback to points/wins if not fully decided by KO
  if (!firstTeamId && teams.length > 0) {
    const sorted = [...teams].sort((a, b) => {
      if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0)
      return (b.wins || 0) - (a.wins || 0)
    })
    firstTeamId = sorted[0]?.id
    secondTeamId = sorted[1]?.id
    thirdTeamId = sorted[2]?.id
  } else if (firstTeamId && (!secondTeamId || !thirdTeamId) && teams.length > 1) {
    const remaining = teams.filter(tm => tm.id !== firstTeamId && tm.id !== secondTeamId).sort((a, b) => {
      if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0)
      return (b.wins || 0) - (a.wins || 0)
    })
    if (!secondTeamId) secondTeamId = remaining[0]?.id
    if (!thirdTeamId && remaining.length > (secondTeamId ? 1 : 0)) {
      thirdTeamId = remaining[secondTeamId ? 1 : 0]?.id
    }
  }

  const formatTeam = (teamId) => {
    if (!teamId) return null
    const team = teams.find(tm => tm.id === teamId)
    if (!team) return null
    const pNames = (team.players || []).map(pid => {
      const p = leaguePlayers.find(lp => lp.id === pid)
      return p ? (p.displayName || p.name) : 'Unknown'
    }).join(', ')
    return pNames ? `${team.name} (${pNames})` : team.name
  }

  const result = {
    first: formatTeam(firstTeamId),
    second: formatTeam(secondTeamId),
    third: formatTeam(thirdTeamId)
  }
  
  if (!result.first && !result.second && !result.third) return null
  return result
}

const ROLE_COLORS = {
  admin:  'text-free   bg-free/15',
  player: 'text-accent bg-accent/15',
  scorer: 'text-success bg-success/15',
  viewer: 'text-dim    bg-alt',
}

const NAV_ITEMS = [
  { id: 'rankings',    icon: <ChartIcon />,  label: 'Rankings'    },
  { id: 'players',     icon: <UsersIcon />,  label: 'Players'     },
  { id: 'tournaments', icon: <TrophyIcon />, label: 'Tournaments' },
  { id: 'settings',    icon: <GearIcon />,   label: 'Settings'    },
]

// Nav items shown to guests (no settings tab)
const GUEST_NAV_ITEMS = [
  { id: 'rankings',    icon: <ChartIcon />,  label: 'Rankings'    },
  { id: 'players',     icon: <UsersIcon />,  label: 'Players'     },
  { id: 'tournaments', icon: <TrophyIcon />, label: 'Tournaments' },
]

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ league, isAdmin, isSuperAdmin, refetch, currentUserId }) {
  const navigate                   = useNavigate()
  const { showError }              = useToast()
  const [copying,     setCopying]  = useState(false)
  const [copyingView, setCopyingView] = useState(false)
  const [regen,       setRegen]    = useState(false)
  const [deleting,    setDeleting] = useState(false)
  const [leaving,     setLeaving]  = useState(false)
  const [saving,      setSaving]   = useState(null) // userId being saved
  const isOwner    = league?.ownerId === currentUserId
  const inviteLink = buildInviteLink(league?.inviteCode || '')
  const viewLink   = buildViewLink(league?.inviteCode || '')

  const [editName,       setEditName]       = useState(league?.name       || '')
  const [editLocation,   setEditLocation]   = useState(league?.location   || '')
  const [editVisibility, setEditVisibility] = useState(league?.visibility || 'public')
  const [editingGeneral, setEditingGeneral] = useState(false)
  const [savingGeneral,  setSavingGeneral]  = useState(false)
  const [generalSaved,   setGeneralSaved]   = useState(false)

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
  async function handleRegen() {
    if (!window.confirm('Regenerate invite code? The old link will stop working.')) return
    setRegen(true)
    try {
      await regenerateInviteCode(league.id)
      refetch()
    } finally {
      setRegen(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${league.name}"? This cannot be undone — all tournaments and match history will be lost.`)) return
    setDeleting(true)
    try {
      await deleteLeague(league.id)
      navigate('/')
    } finally {
      setDeleting(false)
    }
  }

  async function handleLeave() {
    if (!window.confirm(`Leave "${league.name}"? You will be unlinked from your player profile.`)) return
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
    </div>
  )
}

// ─── LeagueDetail page ────────────────────────────────────────────────────────
export default function LeagueDetail() {
  const navigate             = useNavigate()
  const { id }               = useParams()
  const location             = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'rankings')
  const { showError }        = useToast()

  const { league, loading, error, refetch } = useLeague(id)
  const { isAdmin, isSuperAdmin }            = useLeagueRole(id)
  const { session, profile }                 = useAuth()

  const isGuest = !session

  // Redirect guests who land on a private league to login with ?next=
  useEffect(() => {
    if (!loading && !error && league && isGuest && league.visibility !== 'public') {
      navigate(`/login?next=/league/${id}`, { replace: true })
    }
  }, [loading, error, league, isGuest, id, navigate])

  // ── Player mutations ──────────────────────────────────────────────────────
  async function handleAddPlayer(data) {
    try {
      await addPlayer(id, data)
      refetch()
    } catch (err) {
      showError(err, 'Failed to add player.')
    }
  }

  async function handleUpdatePlayer(playerId, updates) {
    const leagueName = league?.name || 'a league'
    const leagueId   = league?.id
    // Capture current userId before the update (needed for unlink notification)
    const currentUserId = (league?.players || []).find(p => p.id === playerId)?.userId ?? null

    try {
      await updatePlayer(playerId, updates)

      if (updates.userId) {
        await createNotification(
          updates.userId,
          'profile_linked',
          'You were added to a league 🤝',
          `Your profile was linked in ${leagueName}`,
          { leagueId },
        )
      } else if ('userId' in updates && updates.userId === null && currentUserId) {
        await createNotification(
          currentUserId,
          'profile_unlinked',
          'Profile unlinked 🔓',
          `Your profile was unlinked from ${leagueName}`,
          { leagueId },
        )
      }

      refetch()
    } catch (err) {
      showError(err, 'Failed to update player.')
    }
  }

  async function handleDeletePlayer(playerId) {
    try {
      await deletePlayer(playerId)
      refetch()
    } catch (err) {
      showError(err, 'Failed to delete player.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !league) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-2">
        <div className="text-[18px] font-bold">League not found</div>
        <button onClick={() => navigate('/')} className="text-[13px] text-accent font-semibold bg-transparent border-0 cursor-pointer">
          ← Back to home
        </button>
      </div>
    )
  }

  const rankedPlayers = [...(league.players || [])].sort((a, b) => (b.points || 0) - (a.points || 0))
  const tournaments   = [...(league.tournaments || [])].reverse()
  const myPlayer      = rankedPlayers.find(p => p.userId === profile?.id)
  const myRank        = myPlayer ? rankedPlayers.indexOf(myPlayer) + 1 : null

  return (
    <div className="screen bg-bg text-text">

      {/* ── Fixed top header ── */}
      <div className="screen__top flex items-center gap-2.5 px-4 pt-2.5 pb-4">
        <button
          onClick={() => navigate('/')}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text"
        >
          <BackIcon />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-bold text-text leading-tight">{league.name}</div>
          <div className="text-[11px] text-dim">
            Season {new Date().getFullYear()}
            {league.location && <> · {league.location}</>}
          </div>
        </div>
        {/* Guest: show Log in button in header */}
        {isGuest && (
          <button
            onClick={() => navigate(`/login?next=/league/${id}`)}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-bold border-0 cursor-pointer shrink-0"
          >
            Log in
          </button>
        )}
      </div>

      {/* ── Guest join banner (public leagues only) ── */}
      {isGuest && (
        <div className="mx-4 mb-3 flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-[14px] px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-accent leading-snug">Viewing as guest</div>
            <div className="text-[11px] text-dim mt-0.5">Log in or sign up to join this league.</div>
          </div>
          <button
            onClick={() => navigate(`/login?next=/league/${id}`)}
            className="shrink-0 px-3 py-2 rounded-xl bg-accent text-white text-[12px] font-bold border-0 cursor-pointer"
          >
            Join
          </button>
        </div>
      )}

      {/* ── Scrollable content ── */}
      <main className="screen__body">
        <div className="px-4 pb-6">

          {/* ════ Rankings tab ════ */}
          {activeTab === 'rankings' && (
            <>
              {/* YOUR POSITION hero card — only shown if current user has a linked player */}
              {myRank && (
                <div className="bg-gradient-to-br from-surface to-alt rounded-[14px] border border-line mt-2 mb-4 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1">
                      <div className="text-[11px] font-bold text-accent tracking-[1.2px] uppercase mb-1">Your Position</div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-[40px] leading-none text-accent">#{myRank}</span>
                        <span className="text-[12px] text-dim">of {rankedPlayers.length} · {myPlayer.points ?? 0} ELO</span>
                      </div>
                    </div>
                    <div className="w-20 h-[60px] flex-shrink-0">
                      <svg width="100%" height="100%" viewBox="0 0 80 60">
                        <polyline
                          points="0,50 15,42 30,44 45,30 60,28 80,18"
                          stroke="#F5A623" strokeWidth="2" fill="none" strokeLinecap="round"
                        />
                        <polyline
                          points="0,50 15,42 30,44 45,30 60,28 80,18 80,60 0,60"
                          fill="rgba(245,166,35,0.15)" stroke="none"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              <SectionLabel color="accent">Top Players</SectionLabel>

              {rankedPlayers.length > 0 ? (
                <div className="bg-surface rounded-[14px] overflow-hidden border border-line mb-4">
                  {rankedPlayers.slice(0, 8).map((player, i, arr) => {
                    const isMe  = player.userId === profile?.id
                    const label = player.displayName || player.name
                    const wl    = (player.wins != null || player.losses != null)
                      ? `${player.wins ?? 0}W - ${player.losses ?? 0}L`
                      : null
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center px-3.5 py-[11px] ${i < arr.length - 1 ? 'border-b border-line' : ''} ${isMe ? 'bg-accent/10' : ''}`}
                      >
                        <span className={`font-display w-7 text-[18px] leading-none flex-shrink-0 ${i < 3 ? 'text-accent' : 'text-dim'}`}>
                          {i + 1}
                        </span>
                        <div
                          className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[13px] font-semibold text-white flex-shrink-0"
                          style={playerAvatarStyle(player.id || player.name)}
                        >
                          {label[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 ml-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[13px] truncate ${isMe ? 'font-bold text-text' : 'font-medium text-text'}`}>
                              {label}
                            </span>
                            {isMe && <span className="text-[10px] font-bold text-accent flex-shrink-0">YOU</span>}
                          </div>
                          {wl && <div className="text-[10px] text-dim mt-0.5">{wl}</div>}
                        </div>
                        <span className="font-display text-[18px] text-text leading-none ml-2">{player.points ?? 0}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-[13px] text-dim text-center py-6 mb-4">No players yet</div>
              )}
            </>
          )}

          {/* ════ Players tab ════ */}
          {activeTab === 'players' && (
            <LeaguePlayersTab
              league={league}
              isAdmin={isGuest ? false : isAdmin}
              onAdd={handleAddPlayer}
              onDelete={handleDeletePlayer}
              onUpdate={handleUpdatePlayer}
              currentUserId={profile?.id}
            />
          )}

          {/* ════ Tournaments section (Rankings + Tournaments tabs) ════ */}
          {(activeTab === 'rankings' || activeTab === 'tournaments') && (
            <>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[12px] font-bold text-accent tracking-wide uppercase">Tournaments</span>
                {isAdmin && !isGuest && (
                  <button
                    onClick={() => navigate(`/league/${id}/tournament/new`)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-accent cursor-pointer bg-transparent border-0"
                  >
                    <PlusIcon /> New
                  </button>
                )}
              </div>

              {tournaments.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {(activeTab === 'tournaments' ? tournaments : tournaments.slice(0, 5)).map(t => {
                    const { label, variant } = getTournamentStatus(t)
                    const pCount             = getTournamentPlayerCount(t)
                    const podium             = getTournamentPodium(t, league?.players || [])
                    const modeLabel          = t.teamSize ? `${t.teamSize} vs ${t.teamSize}` : 'Custom'
                    const teamsCount         = (t.teams || []).length

                    return (
                      <div
                        key={t.id}
                        onClick={() => navigate(`/league/${id}/tournament/${t.id}`)}
                        className="bg-surface rounded-xl p-3.5 flex flex-col gap-2.5 border border-line cursor-pointer active:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[10px] bg-accent/15 flex items-center justify-center flex-shrink-0 text-accent">
                            <TrophyIcon size={18} />
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
                  No tournaments yet{isAdmin && !isGuest && ' — '}
                  {isAdmin && !isGuest && (
                    <button
                      onClick={() => navigate(`/league/${id}/tournament/new`)}
                      className="text-accent font-semibold bg-transparent border-0 cursor-pointer p-0"
                    >
                      create one
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ════ Settings tab ════ */}
          {activeTab === 'settings' && !isGuest && (
            <SettingsTab league={league} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} refetch={refetch} currentUserId={profile?.id} />
          )}
          {activeTab === 'settings' && isGuest && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <div className="text-[32px]">🔒</div>
              <div className="text-[15px] font-bold text-text">Log in to manage this league</div>
              <div className="text-[13px] text-dim">Settings are only available to league members.</div>
              <button
                onClick={() => navigate(`/login?next=/league/${id}`)}
                className="mt-2 px-6 py-2.5 rounded-xl bg-accent text-white font-bold text-[13px] border-0 cursor-pointer"
              >
                Log in
              </button>
            </div>
          )}

        </div>
      </main>

      {/* ── Bottom navigation ── */}
      {!isGuest && (
        <BottomNav
          items={NAV_ITEMS}
          active={activeTab}
          onChange={setActiveTab}
        />
      )}
      {isGuest && (
        <BottomNav
          items={GUEST_NAV_ITEMS}
          active={activeTab}
          onChange={setActiveTab}
        />
      )}

    </div>
  )
}
