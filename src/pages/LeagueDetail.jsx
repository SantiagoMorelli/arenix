import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { useAuth } from '../contexts/AuthContext'
import { addPlayer, updatePlayer, deletePlayer } from '../services/playerService'
import { deleteLeague } from '../services/leagueService'
import { buildInviteLink, regenerateInviteCode } from '../services/inviteService'
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
function PlayersTab({ league, isAdmin, onAdd, onDelete }) {
  const [newName, setNewName]   = useState('')
  const [newLevel, setNewLevel] = useState('beginner')
  const [adding, setAdding]     = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await onAdd({ name: newName.trim(), level: newLevel })
      setNewName(''); setNewLevel('beginner'); setShowForm(false)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      {isAdmin && (
        <div className="flex justify-end mb-2.5">
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1 text-[11px] font-semibold text-accent cursor-pointer bg-transparent border-0"
          >
            <PlusIcon /> Add Player
          </button>
        </div>
      )}

      {showForm && isAdmin && (
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
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-[13px] text-text outline-none mb-3 focus:border-accent"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-lg bg-alt border border-line text-[12px] font-semibold text-dim"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="flex-1 py-2 rounded-lg bg-accent border-0 text-[12px] font-bold text-white disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
        {(league?.players || []).length === 0 ? (
          <div className="text-center text-[13px] text-dim py-6">No players yet</div>
        ) : (
          (league.players || []).map((p, i, arr) => (
            <div key={p.id} className={`flex items-center px-3.5 py-2.5 ${i < arr.length - 1 ? 'border-b border-line' : ''}`}>
              <div className="w-7 h-7 rounded-lg bg-alt flex items-center justify-center text-[12px] font-semibold text-text mr-2.5 flex-shrink-0">
                {p.name[0]}
              </div>
              <span className="flex-1 text-[13px] font-medium text-text truncate">{p.name}</span>
              <span className="text-[10px] text-dim capitalize mr-3">{p.level}</span>
              {isAdmin && (
                <button
                  onClick={() => onDelete(p.id)}
                  className="text-error text-[10px] font-bold bg-transparent border-0 cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ league, isAdmin, isSuperAdmin, refetch }) {
  const navigate               = useNavigate()
  const [copying, setCopying]  = useState(false)
  const [regen,   setRegen]    = useState(false)
  const [deleting, setDeleting] = useState(false)
  const inviteLink = buildInviteLink(league?.inviteCode || '')

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

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="text-[13px] text-dim text-center py-10">
        Only admins can view league settings.
      </div>
    )
  }

  return (
    <div>
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

      <SectionLabel color="dim">Members</SectionLabel>
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        {(league?.members || []).map((m, i, arr) => (
          <div key={m.userId} className={`flex items-center px-3.5 py-2.5 gap-3 ${i < arr.length - 1 ? 'border-b border-line' : ''}`}>
            <div className="w-7 h-7 rounded-lg bg-alt flex items-center justify-center text-[11px] font-bold text-text flex-shrink-0">
              {(m.fullName || '?')[0]}
            </div>
            <span className="flex-1 text-[13px] font-medium text-text truncate">
              {m.fullName || 'Unknown'}
            </span>
            <span className={`text-[9px] font-bold px-2 py-[3px] rounded-md capitalize ${ROLE_COLORS[m.role] || ROLE_COLORS.viewer}`}>
              {m.role}
            </span>
          </div>
        ))}
        {(league?.members || []).length === 0 && (
          <div className="text-center text-[13px] text-dim py-4">No members found</div>
        )}
      </div>

      <SectionLabel color="dim">Danger Zone</SectionLabel>
      <div className="bg-surface border border-error/30 rounded-xl p-4 mb-4">
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

  // ── Player mutations ──────────────────────────────────────────────────────
  async function handleAddPlayer(data) {
    await addPlayer(id, data)
    refetch()
  }

  async function handleDeletePlayer(playerId) {
    if (!window.confirm('Remove this player from the league?')) return
    await deletePlayer(playerId)
    refetch()
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
                  {rankedPlayers.slice(0, 5).map((player, i) => (
                    <div
                      key={player.id}
                      className={`flex items-center px-3.5 py-2.5 ${i < rankedPlayers.length - 1 ? 'border-b border-line' : ''}`}
                    >
                      <span className={`w-[22px] text-[13px] font-bold flex-shrink-0 ${i < 3 ? 'text-accent' : 'text-dim'}`}>
                        {i + 1}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-alt flex items-center justify-center text-[12px] font-semibold text-text mr-2.5 flex-shrink-0">
                        {player.name[0]}
                      </div>
                      <span className="flex-1 text-[13px] font-medium text-text truncate">{player.name}</span>
                      <span className="text-[12px] font-semibold text-dim ml-2">{player.points ?? 0}</span>
                    </div>
                  ))}
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
                  {tournaments.slice(0, 5).map(t => {
                    const { label, variant } = getTournamentStatus(t)
                    const pCount             = getTournamentPlayerCount(t)
                    return (
                      <div
                        key={t.id}
                        onClick={() => navigate(`/league/${id}/tournament/${t.id}`)}
                        className="bg-surface rounded-xl px-3.5 py-3 flex items-center gap-3 border border-line cursor-pointer active:opacity-80 transition-opacity"
                      >
                        <div className="w-9 h-9 rounded-[10px] bg-accent/15 flex items-center justify-center flex-shrink-0 text-accent">
                          <TrophyIcon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-text truncate">{t.name}</div>
                          <div className="text-[11px] text-dim">{pCount} players</div>
                        </div>
                        <AppBadge text={label} variant={variant} />
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
            <SettingsTab league={league} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} refetch={refetch} />
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
