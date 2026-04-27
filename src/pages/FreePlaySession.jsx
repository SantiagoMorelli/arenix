import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFreePlay } from '../hooks/useFreePlay'
import { getLeaguePlayers } from '../services/playerService'
import { AppBadge, AppButton, SectionLabel } from '../components/ui-new'

// ─── Icons ────────────────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const BackIcon   = () => <Svg><polyline points="15 18 9 12 15 6" /></Svg>
const LinkIcon   = () => <Svg size={16}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></Svg>
const SearchIcon = () => <Svg size={16}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>
const PencilIcon = () => <Svg size={16}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></Svg>
const TrashIcon  = () => <Svg size={16}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></Svg>

// ─── Add Player Modal ─────────────────────────────────────────────────────────
function AddPlayerModal({ session, onAdd, onClose }) {
  const hasLeague = !!session.league_id
  const [tab, setTab]               = useState(hasLeague ? 'league' : 'guest')
  const [leaguePlayers, setLeague]  = useState([])
  const [loadingLeague, setLoading] = useState(false)
  const [search, setSearch]         = useState('')
  const [guestName, setGuestName]   = useState('')
  const [adding, setAdding]         = useState(false)

  useEffect(() => {
    if (!hasLeague || tab !== 'league') return
    setLoading(true)
    getLeaguePlayers(session.league_id)
      .then(setLeague)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tab, hasLeague, session.league_id])

  // Filter out players already in the session roster
  const alreadyIn = new Set(session.players.map(p => p.leaguePlayerId).filter(Boolean))
  const filtered  = leaguePlayers
    .filter(p => !alreadyIn.has(p.id))
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  const handleAddLeague = async (player) => {
    setAdding(true)
    try { await onAdd(player.name, player.id) }
    finally { setAdding(false) }
    onClose()
  }

  const handleAddGuest = async () => {
    if (!guestName.trim()) return
    setAdding(true)
    try { await onAdd(guestName.trim(), null) }
    finally { setAdding(false) }
    setGuestName('')   // stay open so multiple guests can be added quickly
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[440px] bg-surface rounded-t-2xl flex flex-col max-h-[80vh]">
        {/* Handle + title */}
        <div className="px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[16px] font-black text-text uppercase tracking-widest">Add Player</div>
            <button onClick={onClose} className="text-dim text-[22px] leading-none bg-transparent border-0 cursor-pointer">×</button>
          </div>

          {/* Tabs — only show league tab if session has a league */}
          {hasLeague && (
            <div className="flex bg-bg rounded-xl p-1 gap-1 mb-4">
              {['league', 'guest'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all border-0 cursor-pointer capitalize
                    ${tab === t ? 'bg-free text-white' : 'bg-transparent text-dim'}`}
                >
                  {t === 'league' ? 'From League' : 'Guest'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {tab === 'league' ? (
            <div className="flex flex-col gap-3">
              {/* Search */}
              <div className="flex items-center gap-2 bg-bg border border-line rounded-xl px-3 py-2.5">
                <span className="text-dim shrink-0"><SearchIcon /></span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search players…"
                  autoFocus
                  className="flex-1 bg-transparent border-0 text-[14px] text-text placeholder:text-dim focus:outline-none"
                />
              </div>

              {loadingLeague ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-free border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-[13px] text-dim py-8">
                  {search ? 'No players match your search' : 'All league players are already added'}
                </div>
              ) : (
                filtered.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAddLeague(p)}
                    disabled={adding}
                    className="flex items-center justify-between w-full bg-bg border border-line rounded-xl px-4 py-3 text-left active:bg-alt transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <div className="text-[14px] font-semibold text-text">{p.name}</div>
                    <AppBadge text={p.level || 'beginner'} variant="dim" />
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Guest tab */
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-dim uppercase tracking-wide">Player name</label>
                <input
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddGuest()}
                  placeholder="e.g. Maria"
                  autoFocus
                  className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-free"
                />
              </div>
              <AppButton
                variant="free"
                onClick={handleAddGuest}
                disabled={!guestName.trim() || adding}
              >
                {adding ? 'Adding…' : 'Add Guest'}
              </AppButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Player chip ──────────────────────────────────────────────────────────────
function PlayerChip({ player, onRemove, readonly }) {
  return (
    <div className="flex items-center gap-1.5 bg-bg border border-line rounded-full pl-3 pr-1.5 py-1.5 shrink-0">
      <span className="text-[13px] font-semibold text-text leading-none">{player.name}</span>
      {player.isGuest && <AppBadge text="Guest" variant="dim" />}
      {!readonly && (
        <button
          onClick={() => onRemove(player.id)}
          className="w-5 h-5 flex items-center justify-center rounded-full text-dim hover:text-error hover:bg-error/10 transition-colors text-[14px] leading-none bg-transparent border-0 cursor-pointer shrink-0"
          aria-label={`Remove ${player.name}`}
        >
          ×
        </button>
      )}
    </div>
  )
}

// ─── Team modal (create + edit) ───────────────────────────────────────────────
function TeamModal({ session, team, onSave, onClose }) {
  const isEdit = !!team
  const [name,      setName]      = useState(team?.name || '')
  const [selected,  setSelected]  = useState(new Set(team?.playerIds || []))
  const [saving,    setSaving]    = useState(false)

  const toggle = (pid) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(pid) ? next.delete(pid) : next.add(pid)
      return next
    })

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try { await onSave(name.trim(), [...selected]) }
    finally { setSaving(false) }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[440px] bg-surface rounded-t-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[16px] font-black text-text uppercase tracking-widest">
              {isEdit ? 'Edit Team' : 'New Team'}
            </div>
            <button onClick={onClose} className="text-dim text-[22px] leading-none bg-transparent border-0 cursor-pointer">×</button>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-dim uppercase tracking-wide">Team name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Team Sunset"
              autoFocus
              className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-free"
            />
          </div>
        </div>

        {/* Player multi-select */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-3">
            Players ({selected.size} selected)
          </div>
          {session.players.length === 0 ? (
            <div className="text-[13px] text-dim py-4 text-center">Add players to the session first</div>
          ) : (
            <div className="flex flex-col gap-2">
              {session.players.map(p => {
                const on = selected.has(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 text-left transition-all cursor-pointer
                      ${on ? 'border-free bg-free/10 text-free' : 'border-line bg-bg text-text'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                      ${on ? 'border-free bg-free' : 'border-line bg-transparent'}`}>
                      {on && <span className="text-white text-[11px] font-black leading-none">✓</span>}
                    </div>
                    <span className="text-[14px] font-semibold flex-1">{p.name}</span>
                    {p.isGuest && <AppBadge text="Guest" variant="dim" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="px-6 py-4 shrink-0 border-t border-line">
          <AppButton variant="free" onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Team'}
          </AppButton>
        </div>
      </div>
    </div>
  )
}

// ─── Team card ────────────────────────────────────────────────────────────────
function TeamCard({ team, players, onEdit, onDelete, readonly }) {
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
              className="w-8 h-8 flex items-center justify-center rounded-lg text-dim hover:text-accent hover:bg-accent/10 transition-colors bg-transparent border-0 cursor-pointer"
            >
              <PencilIcon />
            </button>
            <button
              onClick={() => setConfirmDel(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-dim hover:text-error hover:bg-error/10 transition-colors bg-transparent border-0 cursor-pointer"
            >
              <TrashIcon />
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

      {/* Inline delete confirmation */}
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FreePlaySession() {
  const navigate = useNavigate()
  const { id }   = useParams()

  const {
    session, loading, error,
    addPlayer, removePlayer,
    createTeam, updateTeam, deleteTeam,
    finishSession, inviteLink,
  } = useFreePlay(id)

  const [showMenu,      setShowMenu]      = useState(false)
  const [showModal,     setShowModal]     = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam,   setEditingTeam]   = useState(null)
  const [confirmEnd,    setConfirmEnd]    = useState(false)
  const [copied,        setCopied]        = useState(false)
  const [removingId,    setRemovingId]    = useState(null)
  const [team1Id,       setTeam1Id]       = useState('')
  const [team2Id,       setTeam2Id]       = useState('')
  const [setsPerMatch,  setSetsPerMatch]  = useState(1)
  const [startingMatch, setStartingMatch] = useState(false)

  const isFinished = session?.status === 'finished'

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
    setShowMenu(false)
  }

  const handleFinish = async () => {
    await finishSession()
    navigate('/free-play')
  }

  const handleRemovePlayer = async (playerId) => {
    setRemovingId(playerId)
    try { await removePlayer(playerId) }
    finally { setRemovingId(null) }
  }

  const handleStartMatch = async () => {
    if (!team1Id || !team2Id || team1Id === team2Id) return
    setStartingMatch(true)
    try {
      const game = await startGame(team1Id, team2Id, setsPerMatch)
      navigate(`/free-play/${id}/match`, { state: { gameId: game.id } })
    } catch (err) {
      console.error(err)
      setStartingMatch(false)
    }
  }

  const teamName = (tid) => session?.teams.find(t => t.id === tid)?.name || '?'
  const playedGames   = session?.games.filter(g => g.played)  || []
  const pendingGame   = session?.games.find(g => !g.played)   || null

  function formatShort(val) {
    if (!val) return ''
    try { return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return '' }
  }

  // ── Loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="w-8 h-8 border-2 border-free border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-3">
        <div className="text-[15px] font-bold">Session not found</div>
        <button onClick={() => navigate('/free-play')} className="text-[13px] text-free font-semibold bg-transparent border-0 cursor-pointer">
          ← Back to Free Play
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 shrink-0">
        <button
          onClick={() => navigate('/free-play')}
          className="w-10 h-10 flex items-center justify-center bg-surface border border-line rounded-xl text-text"
        >
          <BackIcon />
        </button>

        <div className="flex-1 text-center px-3 min-w-0">
          <div className="text-[17px] font-black text-free uppercase tracking-widest truncate">
            {session.name || 'Free Play'}
          </div>
          <div className="flex items-center justify-center mt-0.5">
            <AppBadge text={isFinished ? 'Finished' : 'Active'} variant={isFinished ? 'dim' : 'free'} />
          </div>
        </div>

        {/* Overflow menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="w-10 h-10 flex items-center justify-center bg-surface border border-line rounded-xl text-dim text-[20px] font-black leading-none pb-1"
          >
            ···
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-12 z-50 bg-surface border border-line rounded-xl shadow-lg overflow-hidden min-w-[190px]">
                <button
                  onClick={handleCopyLink}
                  className="w-full px-4 py-3.5 text-left text-[13px] font-semibold text-text flex items-center gap-3 active:bg-alt border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-free"><LinkIcon /></span>
                  {copied ? 'Copied!' : 'Copy Invite Link'}
                </button>
                {!isFinished && (
                  <button
                    onClick={() => { setShowMenu(false); setConfirmEnd(true) }}
                    className="w-full px-4 py-3.5 text-left text-[13px] font-semibold text-error flex items-center gap-3 active:bg-alt border-0 bg-transparent cursor-pointer border-t border-line"
                  >
                    Finish Session
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Finish confirmation strip ────────────────────────────────────────── */}
      {confirmEnd && (
        <div className="bg-error/10 border-b border-error/20 px-4 py-3 flex items-center justify-between shrink-0">
          <span className="text-[13px] font-bold text-error">End this session?</span>
          <div className="flex gap-3">
            <button onClick={() => setConfirmEnd(false)} className="text-[13px] font-semibold text-dim bg-transparent border-0 cursor-pointer">
              Cancel
            </button>
            <button onClick={handleFinish} className="text-[13px] font-bold text-white bg-error px-3 py-1 rounded-lg border-0 cursor-pointer">
              Finish
            </button>
          </div>
        </div>
      )}

      {/* ── Copied toast ─────────────────────────────────────────────────────── */}
      {copied && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-free text-white text-[12px] font-bold px-4 py-2 rounded-full shadow-lg pointer-events-none">
          Link copied!
        </div>
      )}

      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-10">

        {/* ── Players section ────────────────────────────────────────────────── */}
        <div className="mt-4">
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
                  readonly={isFinished || removingId === p.id}
                  onRemove={handleRemovePlayer}
                />
              ))}
            </div>
          )}

          {!isFinished && (
            <>
              <AppButton
                variant="outline"
                onClick={() => setShowModal(true)}
                className="border-free/40 text-free hover:bg-free/5"
              >
                + Add Player
              </AppButton>

              {/* Invite link row */}
              <button
                onClick={handleCopyLink}
                className="mt-3 flex items-center gap-2 text-[13px] text-free font-semibold bg-transparent border-0 cursor-pointer active:opacity-70 transition-opacity"
              >
                <LinkIcon />
                {copied ? 'Copied!' : 'Copy invite link'}
              </button>
            </>
          )}
        </div>

        {/* ── Teams section ──────────────────────────────────────────────────── */}
        <div className="mt-8">
          <SectionLabel color="free">
            Teams ({session.teams.length})
          </SectionLabel>

          {session.teams.length === 0 ? (
            <div className="text-[13px] text-dim mb-4">No teams yet — create one below.</div>
          ) : (
            <div className="flex flex-col gap-3 mb-4">
              {session.teams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  players={session.players}
                  readonly={isFinished}
                  onEdit={() => { setEditingTeam(team); setShowTeamModal(true) }}
                  onDelete={() => deleteTeam(team.id)}
                />
              ))}
            </div>
          )}

          {!isFinished && (
            <AppButton
              variant="outline"
              onClick={() => { setEditingTeam(null); setShowTeamModal(true) }}
              className="border-free/40 text-free hover:bg-free/5"
            >
              + New Team
            </AppButton>
          )}
        </div>

        {/* ── Start Match section ────────────────────────────────────────────── */}
        {!isFinished && (
          <div className="mt-8">
            <SectionLabel color="free">Start a Match</SectionLabel>

            {/* Resume banner — unplayed game already exists */}
            {pendingGame ? (
              <div className="bg-free/10 border border-free/30 rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-bold text-free">Match in progress</div>
                  <div className="text-[11px] text-dim mt-0.5">
                    {teamName(pendingGame.team1Id)} vs {teamName(pendingGame.team2Id)}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/free-play/${id}/match`, { state: { gameId: pendingGame.id } })}
                  className="shrink-0 px-4 py-2 rounded-xl bg-free text-white text-[13px] font-bold border-0 cursor-pointer active:scale-[0.97] transition-transform"
                >
                  Resume →
                </button>
              </div>
            ) : session.teams.length < 2 ? (
              <div className="text-[13px] text-dim">Create at least 2 teams to start a match.</div>
            ) : (
              <div className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-4">
                {/* Team selectors */}
                <div className="flex gap-3">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-dim uppercase tracking-wide">Team A</label>
                    <select
                      value={team1Id}
                      onChange={e => setTeam1Id(e.target.value)}
                      className="w-full bg-bg border border-line rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-free appearance-none"
                    >
                      <option value="">Pick team…</option>
                      {session.teams.map(t => (
                        <option key={t.id} value={t.id} disabled={t.id === team2Id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end pb-2.5 text-[13px] font-black text-dim shrink-0">VS</div>
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-dim uppercase tracking-wide">Team B</label>
                    <select
                      value={team2Id}
                      onChange={e => setTeam2Id(e.target.value)}
                      className="w-full bg-bg border border-line rounded-xl px-3 py-2.5 text-[13px] text-text focus:outline-none focus:border-free appearance-none"
                    >
                      <option value="">Pick team…</option>
                      {session.teams.map(t => (
                        <option key={t.id} value={t.id} disabled={t.id === team1Id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sets per match */}
                <div>
                  <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-2">Sets per match</div>
                  <div className="flex gap-2">
                    {[1, 3].map(n => (
                      <button
                        key={n}
                        onClick={() => setSetsPerMatch(n)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-[13px] font-bold transition-all cursor-pointer
                          ${setsPerMatch === n ? 'border-free bg-free/10 text-free' : 'border-line bg-bg text-dim'}`}
                      >
                        {n === 1 ? '1 Set' : 'Best of 3'}
                      </button>
                    ))}
                  </div>
                </div>

                <AppButton
                  variant="free"
                  onClick={handleStartMatch}
                  disabled={!team1Id || !team2Id || team1Id === team2Id || startingMatch}
                >
                  {startingMatch ? 'Starting…' : '🏐 Start Match'}
                </AppButton>
              </div>
            )}
          </div>
        )}

        {/* ── Past Matches section ────────────────────────────────────────────── */}
        {playedGames.length > 0 && (
          <div className="mt-8">
            <SectionLabel color="free">
              Past Matches ({playedGames.length})
            </SectionLabel>
            <div className="flex flex-col gap-2">
              {[...playedGames].reverse().map(g => {
                const t1 = teamName(g.team1Id)
                const t2 = teamName(g.team2Id)
                const won1 = (g.sets || []).filter(s => s.winner === 1).length
                const won2 = (g.sets || []).filter(s => s.winner === 2).length
                const hasWinner = !!g.winnerId
                return (
                  <div key={g.id} className="bg-surface border border-line rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-bold truncate ${g.winnerId === g.team1Id ? 'text-text' : 'text-dim'}`}>{t1}</span>
                        <span className="text-[13px] font-black text-text shrink-0">
                          {g.setsPerMatch > 1 ? `${won1}–${won2}` : `${g.score1 ?? 0}–${g.score2 ?? 0}`}
                        </span>
                        <span className={`text-[13px] font-bold truncate ${g.winnerId === g.team2Id ? 'text-text' : 'text-dim'}`}>{t2}</span>
                      </div>
                      {g.setsPerMatch > 1 && (
                        <div className="text-[10px] text-dim mt-0.5">
                          {(g.sets || []).map((s, i) => `Set ${i + 1}: ${s.s1}–${s.s2}`).join(' · ')}
                        </div>
                      )}
                    </div>
                    {hasWinner && (
                      <AppBadge
                        text={g.winnerId === g.team1Id ? t1.split(' ')[0] : t2.split(' ')[0]}
                        variant="free"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Rankings — coming in next step */}
        <div className="mt-8 bg-surface border border-line rounded-xl p-4 text-center">
          <div className="text-[13px] text-dim">Rankings — coming next</div>
        </div>

      </div>

      {/* ── Add player modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <AddPlayerModal
          session={session}
          onAdd={addPlayer}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* ── Team create / edit modal ─────────────────────────────────────────── */}
      {showTeamModal && (
        <TeamModal
          session={session}
          team={editingTeam}
          onSave={editingTeam
            ? (name, playerIds) => updateTeam(editingTeam.id, { name, playerIds })
            : (name, playerIds) => createTeam(name, playerIds)
          }
          onClose={() => setShowTeamModal(false)}
        />
      )}

    </div>
  )
}
