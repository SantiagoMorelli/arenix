import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { useAuth } from '../contexts/AuthContext'
import { addPlayer, updatePlayer, deletePlayer } from '../services/playerService'
import { deleteLeague, leaveLeague } from '../services/leagueService'
import { buildInviteLink, regenerateInviteCode, addMemberRole, removeMemberRole, grantMemberPermission, revokeMemberPermission } from '../services/inviteService'
import { BottomNav, SectionLabel, AppBadge } from '../components/ui-new'

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
function countryFlag(country) {
  if (!country) return ''
  return FLAG[country.toLowerCase()] || ''
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Players Tab ───────────────────────────────────────────────────────────────
function PlayersTab({ league, isAdmin, onAdd, onDelete, onUpdate, currentUserId }) {
  const [newName, setNewName]   = useState('')
  const [newLevel, setNewLevel] = useState('beginner')
  const [newSex, setNewSex]     = useState(null) // 'M' | 'F' | null
  const [adding, setAdding]     = useState(false)
  const [formMode, setFormMode] = useState(null) // 'join' or 'add'
  const [linkingPlayerId, setLinkingPlayerId] = useState(null)
  const [selectedUserId, setSelectedUserId]   = useState('')

  const myPlayer = (league?.players || []).find(p => p.userId === currentUserId)

  // Find members who are not yet linked to any player
  const unlinkedMembers = (league?.members || []).filter(m => 
    !league.players?.some(p => p.userId === m.userId)
  )

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const payload = { name: newName.trim(), level: newLevel, sex: newSex }
      if (formMode === 'join') payload.userId = currentUserId

      await onAdd(payload)
      setNewName(''); setNewLevel('beginner'); setNewSex(null); setFormMode(null)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[12px] font-bold text-accent tracking-wide uppercase">RANKINGS</span>
        <div className="flex gap-2">
          {!myPlayer && (
            <button
              onClick={() => setFormMode(formMode === 'join' ? null : 'join')}
              className="flex items-center gap-1 text-[11px] font-semibold text-free cursor-pointer bg-transparent border-0"
            >
              <PlusIcon /> Join
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setFormMode(formMode === 'add' ? null : 'add')}
              className="flex items-center gap-1 text-[11px] font-semibold text-accent cursor-pointer bg-transparent border-0"
            >
              <PlusIcon /> Add Player
            </button>
          )}
        </div>
      </div>

      {formMode && (
        <div className="bg-surface border border-line rounded-xl p-3.5 mb-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Player name"
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-[13px] text-text outline-none mb-2 focus:border-accent"
          />
          <select
            value={newLevel}
            onChange={e => setNewLevel(e.target.value)}
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-[13px] text-text outline-none mb-2 focus:border-accent"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <div className="mb-3">
            <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-1.5">Gender (optional)</div>
            <div className="flex gap-2">
              {[{ v: 'M', label: '♂ Male' }, { v: 'F', label: '♀ Female' }].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setNewSex(newSex === opt.v ? null : opt.v)}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-semibold border cursor-pointer transition-all ${
                    newSex === opt.v
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-line bg-bg text-dim'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFormMode(null)}
              className="flex-1 py-2 rounded-lg bg-alt border border-line text-[12px] font-semibold text-dim"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="flex-1 py-2 rounded-lg bg-accent border-0 text-[12px] font-bold text-white disabled:opacity-50"
            >
              {adding ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
        {(league?.players || []).length === 0 ? (
          <div className="text-center text-[13px] text-dim py-6">No players yet</div>
        ) : (
          [...(league.players || [])]
            .sort((a, b) => (b.points || 0) - (a.points || 0))
            .map((p, i, arr) => {
            const isMe = p.userId === currentUserId
            const isUnclaimed = !p.userId
            const isLinkingThis = linkingPlayerId === p.id
            const label = p.displayName || p.name
            const flag = countryFlag(p.country)

            return (
              <div key={p.id} className={`flex items-center px-3.5 py-2.5 flex-wrap gap-y-2 ${i < arr.length - 1 ? 'border-b border-line' : ''}`}>
                <span className={`w-[22px] text-[13px] font-bold flex-shrink-0 ${i < 3 ? 'text-accent' : 'text-dim'}`}>
                  {i + 1}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-semibold mr-2.5 flex-shrink-0 ${isMe ? 'bg-accent/20 text-accent' : 'bg-alt text-text'}`}>
                  {label[0]}
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className={`text-[13px] font-medium truncate ${isMe ? 'text-accent' : 'text-text'}`}>
                    {label}
                  </span>
                  {p.sex && (
                    <span className="text-[9px] font-bold text-dim bg-alt px-1.5 py-0.5 rounded flex-shrink-0">
                      {p.sex === 'M' ? '♂' : '♀'}
                    </span>
                  )}
                  {flag && <span className="text-[14px] leading-none flex-shrink-0">{flag}</span>}
                  {isMe && (
                    <span className="text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded flex-shrink-0">
                      YOU
                    </span>
                  )}
                  {p.userId && !isMe && (
                    <span className="text-[9px] font-bold bg-success/20 text-success px-1.5 py-0.5 rounded flex-shrink-0" title="Account linked">
                      ✓
                    </span>
                  )}
                </div>
                
                <span className="text-[12px] font-semibold text-dim ml-2 mr-3 min-w-[30px] text-right">{p.points ?? 0}</span>
                
                {/* Regular users claiming themselves (Optional: keeping this for regular users if you want them to be able to claim, but usually admins handle this)
                    Let's only show this if I am an admin OR if I don't have a player yet. */}
                {!myPlayer && isUnclaimed && !isAdmin && (
                  <button
                    onClick={() => onUpdate(p.id, { userId: currentUserId })}
                    className="text-free text-[10px] font-bold bg-free/15 px-2 py-1 rounded cursor-pointer mr-2 border-0"
                  >
                    Claim
                  </button>
                )}

                {/* Admin controls */}
                <div className="flex items-center gap-2 ml-auto">
                  {isAdmin && isUnclaimed && !isLinkingThis && (
                    <button
                      onClick={() => {
                        setLinkingPlayerId(p.id)
                        setSelectedUserId('')
                      }}
                      className="text-free text-[10px] font-bold bg-free/15 px-2 py-1 rounded cursor-pointer border-0"
                    >
                      Link
                    </button>
                  )}
                  
                  {isAdmin && p.userId && (
                     <button
                      onClick={() => onUpdate(p.id, { userId: null })}
                      className="text-dim text-[10px] font-bold bg-transparent border-0 cursor-pointer"
                    >
                      Unlink
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => onDelete(p.id)}
                      className="text-error text-[10px] font-bold bg-transparent border-0 cursor-pointer ml-1"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Linking UI dropdown for Admins */}
                {isLinkingThis && (
                  <div className="w-full flex items-center gap-2 mt-1 bg-bg p-2 rounded-lg border border-line">
                    <select
                      value={selectedUserId}
                      onChange={e => setSelectedUserId(e.target.value)}
                      className="flex-1 bg-surface border border-line rounded px-2 py-1 text-[11px] text-text outline-none focus:border-accent"
                    >
                      <option value="">Select member...</option>
                      {unlinkedMembers.map(m => (
                        <option key={m.userId} value={m.userId}>
                          {m.fullName || 'Unknown'} ({m.role})
                        </option>
                      ))}
                      {unlinkedMembers.length === 0 && (
                        <option disabled>No unlinked members</option>
                      )}
                    </select>
                    <button
                      onClick={() => setLinkingPlayerId(null)}
                      className="text-dim text-[11px] font-semibold bg-transparent border-0 cursor-pointer px-2"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (selectedUserId) {
                          onUpdate(p.id, { userId: selectedUserId })
                          setLinkingPlayerId(null)
                        }
                      }}
                      disabled={!selectedUserId}
                      className="text-white text-[11px] font-bold bg-accent px-3 py-1 rounded cursor-pointer border-0 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                )}

              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ league, isAdmin, isSuperAdmin, refetch, currentUserId }) {
  const navigate               = useNavigate()
  const [copying, setCopying]  = useState(false)
  const [regen,   setRegen]    = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [leaving, setLeaving]   = useState(false)
  const [saving,  setSaving]    = useState(null) // userId being saved
  const isOwner = league?.ownerId === currentUserId;
  const inviteLink = buildInviteLink(league?.inviteCode || '')

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
      alert(err.message || 'Failed to leave league.')
      setLeaving(false)
    }
  }



  return (
    <div>
      {(isAdmin || isSuperAdmin) && (
        <>
          <SectionLabel color="accent">Invite Players</SectionLabel>
          <div className="bg-surface border border-line rounded-xl p-4 mb-4">
            <div className="text-[11px] text-dim mb-2">Share this link to invite players:</div>
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
                className="text-[11px] text-dim font-semibold bg-transparent border-0 cursor-pointer disabled:opacity-50"
              >
                {regen ? 'Regenerating…' : '↻ Regenerate code'}
              </button>
            )}
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
  const [activeTab, setActiveTab] = useState('rankings')

  const { league, loading, error, refetch } = useLeague(id)
  const { isAdmin, isSuperAdmin }            = useLeagueRole(id)
  const { profile }                          = useAuth()

  // ── Player mutations ──────────────────────────────────────────────────────
  async function handleAddPlayer(data) {
    try {
      await addPlayer(id, data)
      refetch()
    } catch (err) {
      alert(err.message || 'Failed to add player.')
    }
  }

  async function handleUpdatePlayer(playerId, updates) {
    try {
      await updatePlayer(playerId, updates)
      refetch()
    } catch (err) {
      alert(err.message || 'Failed to update player.')
    }
  }

  async function handleDeletePlayer(playerId) {
    if (!window.confirm('Remove this player from the league?')) return
    try {
      await deletePlayer(playerId)
      refetch()
    } catch (err) {
      alert(err.message || 'Failed to delete player.')
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

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 pb-6">

          {/* ── Header ── */}
          <div className="flex items-center gap-2.5 pt-2.5 pb-4">
            <button
              onClick={() => navigate('/')}
              className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text"
            >
              <BackIcon />
            </button>
            <div>
              <div className="text-[18px] font-bold text-text leading-tight">{league.name}</div>
              <div className="text-[11px] text-dim">Season {league.season}</div>
            </div>
          </div>

          {/* ════ Rankings tab ════ */}
          {activeTab === 'rankings' && (
            <>
              <SectionLabel color="accent">Top Rankings</SectionLabel>
              {rankedPlayers.length > 0 ? (
                <div className="bg-surface rounded-[14px] overflow-hidden border border-line mb-[18px]">
                  {rankedPlayers.slice(0, 5).map((player, i) => {
                    const label = player.displayName || player.name
                    return (
                    <div
                      key={player.id}
                      className={`flex items-center px-3.5 py-2.5 ${i < rankedPlayers.length - 1 ? 'border-b border-line' : ''}`}
                    >
                      <span className={`w-[22px] text-[13px] font-bold flex-shrink-0 ${i < 3 ? 'text-accent' : 'text-dim'}`}>
                        {i + 1}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-alt flex items-center justify-center text-[12px] font-semibold text-text mr-2.5 flex-shrink-0">
                        {label[0]}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-text truncate">{label}</span>
                        {countryFlag(player.country) && <span className="text-[14px] leading-none flex-shrink-0">{countryFlag(player.country)}</span>}
                      </div>
                      <span className="text-[12px] font-semibold text-dim ml-2">{player.points ?? 0}</span>
                    </div>
                  )})}
                </div>
              ) : (
                <div className="text-[13px] text-dim text-center py-6 mb-4">No players yet</div>
              )}
            </>
          )}

          {/* ════ Players tab ════ */}
          {activeTab === 'players' && (
            <PlayersTab
              league={league}
              isAdmin={isAdmin}
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
                {isAdmin && (
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
                  No tournaments yet{isAdmin && ' — '}
                  {isAdmin && (
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
          {activeTab === 'settings' && (
            <SettingsTab league={league} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} refetch={refetch} currentUserId={profile?.id} />
          )}

        </div>
      </main>

      {/* ── Bottom navigation ── */}
      <BottomNav
        items={NAV_ITEMS}
        active={activeTab}
        onChange={setActiveTab}
      />

    </div>
  )
}
