import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useFreePlay } from '../hooks/useFreePlay'
import { getLeaguePlayers } from '../services/playerService'
import { getMyLeagues } from '../services/leagueService'
import { AppBadge, AppButton, SectionLabel, PillTabs } from '../components/ui-new'
import { calcOverallStandings, calcPlayerStandings } from '../lib/standings'
import GameStats from '../components/GameStats'
import FreePlayStatsScreen from '../components/FreePlayStatsScreen'

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

// ═════════════════════════════════════════════════════════════════════════════
// ADD PLAYER MODAL
// ═════════════════════════════════════════════════════════════════════════════
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
    setGuestName('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[440px] bg-surface rounded-t-2xl flex flex-col max-h-[80vh]">
        <div className="px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[16px] font-black text-text uppercase tracking-widest">Add Player</div>
            <button onClick={onClose} className="text-dim text-[22px] leading-none bg-transparent border-0 cursor-pointer">×</button>
          </div>

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

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
          {tab === 'league' ? (
            <div className="flex flex-col gap-3">
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

// ═════════════════════════════════════════════════════════════════════════════
// PLAYER CHIP
// ═════════════════════════════════════════════════════════════════════════════
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

// ═════════════════════════════════════════════════════════════════════════════
// TEAM MODAL (create + edit)
// ═════════════════════════════════════════════════════════════════════════════
function TeamModal({ session, team, onSave, onClose }) {
  const isEdit = !!team
  const [name, setName]         = useState(team?.name || '')
  const [selected, setSelected] = useState(new Set(team?.playerIds || []))
  const [saving, setSaving]     = useState(false)

  const toggle = (pid) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid); else next.add(pid)
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

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2">
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

        <div className="px-6 py-4 shrink-0 border-t border-line">
          <AppButton variant="free" onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Team'}
          </AppButton>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TEAM CARD
// ═════════════════════════════════════════════════════════════════════════════
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
              className="w-8 h-8 flex items-center justify-center rounded-lg text-dim hover:text-free hover:bg-free/10 transition-colors bg-transparent border-0 cursor-pointer"
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

// ═════════════════════════════════════════════════════════════════════════════
// EDIT SESSION MODAL
// ═════════════════════════════════════════════════════════════════════════════
function EditSessionModal({ session, leagues, onSave, onClose }) {
  const [name, setName]         = useState(session.name || '')
  const [leagueId, setLeagueId] = useState(session.league_id || '')
  const [saving, setSaving]     = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try { await onSave({ name: name.trim(), leagueId: leagueId || null }) }
    finally { setSaving(false) }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[440px] bg-surface rounded-t-2xl p-6 pb-8 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-black text-text uppercase tracking-widest">Edit Session</div>
          <button onClick={onClose} className="text-dim text-[22px] leading-none bg-transparent border-0 cursor-pointer">×</button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-dim uppercase tracking-wide">Session name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-free"
          />
        </div>

        {leagues.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-dim uppercase tracking-wide">
              Link to league <span className="normal-case font-normal">(optional)</span>
            </label>
            <select
              value={leagueId}
              onChange={e => setLeagueId(e.target.value)}
              className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text focus:outline-none focus:border-free appearance-none"
            >
              <option value="">No league — standalone</option>
              {leagues.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}

        <AppButton variant="free" onClick={handleSave} disabled={!name.trim() || saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </AppButton>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB: PLAYERS
// ═════════════════════════════════════════════════════════════════════════════
function PlayersTab({ session, isFinished, isAdmin, onOpenAdd, onRemovePlayer, onCopyLink, copied, removingId }) {
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
            <LinkIcon />
            {copied ? 'Copied!' : 'Copy invite link'}
          </button>
        </>
      )}

      {/* Non-admin: show invite link copy (they can share what they can view) */}
      {!isAdmin && !isFinished && (
        <button
          onClick={onCopyLink}
          className="mt-1 flex items-center gap-2 text-[13px] text-free font-semibold bg-transparent border-0 cursor-pointer active:opacity-70 transition-opacity"
        >
          <LinkIcon />
          {copied ? 'Copied!' : 'Copy invite link'}
        </button>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB: TEAMS
// ═════════════════════════════════════════════════════════════════════════════
function TeamsTab({ session, isFinished, isAdmin, onNewTeam, onEditTeam, onDeleteTeam }) {
  return (
    <div className="px-4">
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
              readonly={!isAdmin || isFinished}
              onEdit={() => onEditTeam(team)}
              onDelete={() => onDeleteTeam(team.id)}
            />
          ))}
        </div>
      )}

      {isAdmin && !isFinished && (
        <AppButton
          variant="outline"
          onClick={onNewTeam}
          className="border-free/40 text-free hover:bg-free/5"
        >
          + New Team
        </AppButton>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB: MATCHES
// ═════════════════════════════════════════════════════════════════════════════
function MatchesTab({
  session, isFinished, isAdmin, sessionId, pendingGame,
  team1Id, setTeam1Id, team2Id, setTeam2Id,
  setsPerMatch, setSetsPerMatch,
  startingMatch, startError, onStartMatch, onResumeMatch,
  onMatchClick,
}) {
  const teamName = (tid) => session.teams.find(t => t.id === tid)?.name || '?'
  const playerNames = (teamId) => {
    const t = session.teams.find(x => x.id === teamId)
    if (!t) return ''
    return (t.playerIds || [])
      .map(pid => session.players.find(p => p.id === pid)?.name)
      .filter(Boolean)
      .join(' · ')
  }
  const playedGames = session.games.filter(g => g.played)

  // Build numbered match list (oldest → newest for labels, then reversed for display)
  const labeledPlayed = useMemo(() => {
    return session.games
      .filter(g => g.played)
      .map((g, i) => {
        const won1 = (g.sets || []).filter(s => s.winner === 1).length
        const won2 = (g.sets || []).filter(s => s.winner === 2).length
        const useSets = (g.setsPerMatch || 1) > 1
        return {
          game: g,
          label: `Match ${i + 1}`,
          // Map to tournament-match shape consumed by the card + GameStats overlay
          match: {
            id:     g.id,
            team1:  g.team1Id,
            team2:  g.team2Id,
            score1: useSets ? won1 : (g.score1 ?? 0),
            score2: useSets ? won2 : (g.score2 ?? 0),
            winner: g.winnerId,
            played: true,
            log:    g.log  || [],
            sets:   g.sets || [],
            label:  `Match ${i + 1}`,
          },
        }
      })
      .reverse()
  }, [session.games])

  return (
    <div className="px-4">
      {/* Start Match at top */}
      {isAdmin && !isFinished && (
        <div className="mb-6">
          <SectionLabel color="free">Start a Match</SectionLabel>

          {pendingGame ? (
            <div className="bg-free/10 border border-free/30 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-bold text-free">Match in progress</div>
                <div className="text-[11px] text-dim mt-0.5">
                  {teamName(pendingGame.team1Id)} vs {teamName(pendingGame.team2Id)}
                </div>
              </div>
              <button
                onClick={() => onResumeMatch(pendingGame)}
                className="shrink-0 px-4 py-2 rounded-xl bg-free text-white text-[13px] font-bold border-0 cursor-pointer active:scale-[0.97] transition-transform"
              >
                Resume →
              </button>
            </div>
          ) : session.teams.length < 2 ? (
            <div className="text-[13px] text-dim">Create at least 2 teams to start a match.</div>
          ) : (
            <div className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-4">
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
                onClick={onStartMatch}
                disabled={!team1Id || !team2Id || team1Id === team2Id || startingMatch}
              >
                {startingMatch ? 'Starting…' : '🏐 Start Match'}
              </AppButton>
              {startError && (
                <div className="mt-2 p-3 rounded-xl bg-error/10 border border-error/30 text-error text-[12px] font-mono break-all">
                  {startError}
                </div>
              )}
              {/* keep sessionId to avoid unused warning; informational */}
              <input type="hidden" value={sessionId} readOnly />
            </div>
          )}
        </div>
      )}

      {/* Past Matches — tournament-style cards with team + player names. Tap to view stats. */}
      <SectionLabel color="free">
        Past Matches ({playedGames.length})
      </SectionLabel>

      {labeledPlayed.length === 0 ? (
        <div className="text-[13px] text-dim">No matches played yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {labeledPlayed.map(({ game: g, match: m, label }) => {
            const t1 = teamName(m.team1)
            const t2 = teamName(m.team2)
            const n1 = playerNames(m.team1)
            const n2 = playerNames(m.team2)
            return (
              <div
                key={g.id}
                onClick={() => onMatchClick && onMatchClick(m)}
                className="bg-surface rounded-xl px-3.5 py-3 border border-line cursor-pointer hover:bg-alt transition-colors"
              >
                <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-1.5">
                  {label}
                </div>
                <div className="flex items-center">
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] truncate ${m.winner === m.team1 ? 'font-bold text-free' : 'font-medium text-dim'}`}>
                      {t1}
                    </div>
                    {n1 && <div className="text-[10px] text-dim mt-0.5 truncate">{n1}</div>}
                  </div>
                  <div className="flex items-center gap-1 px-3 shrink-0">
                    <span className={`text-[16px] font-bold ${m.winner === m.team1 ? 'text-free' : 'text-text'}`}>{m.score1}</span>
                    <span className="text-[10px] text-dim">–</span>
                    <span className={`text-[16px] font-bold ${m.winner === m.team2 ? 'text-free' : 'text-text'}`}>{m.score2}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className={`text-[13px] truncate ${m.winner === m.team2 ? 'font-bold text-free' : 'font-medium text-dim'}`}>
                      {t2}
                    </div>
                    {n2 && <div className="text-[10px] text-dim mt-0.5 truncate">{n2}</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB: RANKING (Teams / Players inner subtabs)
// ═════════════════════════════════════════════════════════════════════════════
function RankingTab({ session }) {
  const [subTab, setSubTab] = useState('teams')

  // Normalize free-play games into generic match shape for standings math
  const matches = useMemo(() => (session.games || [])
    .filter(g => g.played)
    .map(g => ({
      team1:  g.team1Id,
      team2:  g.team2Id,
      score1: g.setsPerMatch > 1
        ? (g.sets || []).filter(s => s.winner === 1).length
        : (g.score1 ?? 0),
      score2: g.setsPerMatch > 1
        ? (g.sets || []).filter(s => s.winner === 2).length
        : (g.score2 ?? 0),
      played: true,
    })),
  [session.games])

  const teamRows   = useMemo(
    () => calcOverallStandings(session.teams || [], matches, session.players || []),
    [session.teams, matches, session.players]
  )
  const playerRows = useMemo(
    () => calcPlayerStandings(session.teams || [], matches, session.players || []),
    [session.teams, matches, session.players]
  )

  if ((session.teams || []).length === 0) {
    return (
      <div className="px-4 text-[13px] text-dim text-center py-10">
        Create teams and play a match to see rankings.
      </div>
    )
  }

  return (
    <div className="px-4">
      <PillTabs
        items={[
          { id: 'teams',   label: 'Teams' },
          { id: 'players', label: 'Players' },
        ]}
        active={subTab}
        onChange={setSubTab}
        accent="free"
        className="mb-3.5"
      />

      {subTab === 'teams' ? (
        <TeamsRankingTable rows={teamRows} />
      ) : (
        <PlayersRankingTable rows={playerRows} />
      )}
    </div>
  )
}

function TeamsRankingTable({ rows }) {
  return (
    <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
      <div className="flex items-center px-3.5 py-2 border-b border-line bg-alt">
        <span className="w-[20px] text-[10px] font-bold text-dim">#</span>
        <span className="flex-1  text-[10px] font-bold text-dim">TEAM</span>
        <span className="w-6 text-center text-[10px] font-bold text-dim">W</span>
        <span className="w-6 text-center text-[10px] font-bold text-dim">L</span>
        <span className="w-7 text-center text-[10px] font-bold text-dim">PF</span>
        <span className="w-7 text-center text-[10px] font-bold text-dim">PA</span>
        <span className="w-7 text-center text-[10px] font-bold text-dim">PD</span>
        <span className="w-8 text-center text-[10px] font-bold text-dim">PTS</span>
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-[13px] text-dim py-4">No teams yet</div>
      ) : rows.map((row, i) => (
        <div
          key={row.id}
          className={`
            flex items-center px-3.5 py-2.5
            ${i < rows.length - 1 ? 'border-b border-line' : ''}
            ${i === 0 ? 'bg-free/15' : ''}
          `}
        >
          <span className={`w-[20px] text-[13px] font-bold ${i === 0 ? 'text-free' : 'text-dim'}`}>
            {i + 1}
          </span>
          <div className="flex-1 overflow-hidden pr-2">
            <div className="text-[13px] font-semibold text-text truncate">{row.name}</div>
            {row.playerNames && (
              <div className="text-[10px] text-dim truncate">{row.playerNames}</div>
            )}
          </div>
          <span className="w-6 text-center text-[13px] font-semibold text-success flex-shrink-0">{row.wins}</span>
          <span className="w-6 text-center text-[13px] font-semibold text-error flex-shrink-0">{row.losses}</span>
          <span className="w-7 text-center text-[12px] font-semibold text-dim flex-shrink-0">{row.pf}</span>
          <span className="w-7 text-center text-[12px] font-semibold text-dim flex-shrink-0">{row.pa}</span>
          <span className={`w-7 text-center text-[12px] font-semibold flex-shrink-0 ${row.pd > 0 ? 'text-success' : row.pd < 0 ? 'text-error' : 'text-dim'}`}>
            {row.pd > 0 ? `+${row.pd}` : row.pd}
          </span>
          <span className="w-8 text-center text-[13px] font-bold text-free flex-shrink-0">{row.pts}</span>
        </div>
      ))}
    </div>
  )
}

function PlayersRankingTable({ rows }) {
  return (
    <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
      <div className="flex items-center px-3.5 py-2 border-b border-line bg-alt">
        <span className="w-[30px] text-[10px] font-bold text-dim text-center">#</span>
        <span className="flex-1  text-[10px] font-bold text-dim">PLAYER</span>
        <span className="w-10 text-center text-[10px] font-bold text-dim">W</span>
        <span className="w-10 text-center text-[10px] font-bold text-dim">L</span>
        <span className="w-12 text-center text-[10px] font-bold text-dim">PTS</span>
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-[13px] text-dim py-4">No players yet</div>
      ) : rows.map((row, i) => (
        <div
          key={row.id}
          className={`
            flex items-center px-3.5 py-2.5
            ${i < rows.length - 1 ? 'border-b border-line' : ''}
            ${i === 0 ? 'bg-free/15' : ''}
          `}
        >
          <span className={`w-[30px] text-[13px] font-bold text-center ${i === 0 ? 'text-free' : 'text-dim'}`}>
            {i + 1}
          </span>
          <div className="flex-1 overflow-hidden pr-2">
            <div className="text-[13px] font-semibold text-text truncate">{row.name}</div>
          </div>
          <span className="w-10 text-center text-[13px] font-semibold text-success flex-shrink-0">{row.wins}</span>
          <span className="w-10 text-center text-[13px] font-semibold text-error flex-shrink-0">{row.losses}</span>
          <span className="w-12 text-center text-[13px] font-bold text-free flex-shrink-0">{row.pts}</span>
        </div>
      ))}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function FreePlaySession() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id }   = useParams()

  const {
    session, loading, error, isAdmin,
    addPlayer, removePlayer,
    createTeam, updateTeam, deleteTeam,
    startGame, finishSession, updateSession, inviteLink,
  } = useFreePlay(id)

  // Tabs
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'players')

  // Global chrome state
  const [showMenu,      setShowMenu]      = useState(false)
  const [confirmEnd,    setConfirmEnd]    = useState(false)
  const [copied,        setCopied]        = useState(false)
  const [showSessionStats, setShowSessionStats] = useState(false)

  // Modals
  const [showAddPlayer,  setShowAddPlayer]  = useState(false)
  const [showTeamModal,  setShowTeamModal]  = useState(false)
  const [editingTeam,    setEditingTeam]    = useState(null)
  const [showEditSession, setShowEditSession] = useState(false)
  const [leagues,         setLeagues]         = useState([])

  // Match stats overlay
  const [selectedStatsMatch, setSelectedStatsMatch] = useState(null)

  // Player removal
  const [removingId,    setRemovingId]    = useState(null)

  // Match start state
  const [team1Id,       setTeam1Id]       = useState('')
  const [team2Id,       setTeam2Id]       = useState('')
  const [setsPerMatch,  setSetsPerMatch]  = useState(1)
  const [startingMatch, setStartingMatch] = useState(false)
  const [startError,    setStartError]    = useState('')
  const [confirmingResume, setConfirmingResume] = useState(null)

  const isFinished = session?.status === 'finished'

  // Load leagues lazily when opening edit modal
  useEffect(() => {
    if (!showEditSession) return
    if (leagues.length > 0) return
    getMyLeagues().then(setLeagues).catch(console.error)
  }, [showEditSession, leagues.length])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
    setShowMenu(false)
  }

  const handleFinishSession = async () => {
    setConfirmEnd(false)
    try {
      await finishSession()
      setShowSessionStats(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemovePlayer = async (playerId) => {
    setRemovingId(playerId)
    try { await removePlayer(playerId) }
    finally { setRemovingId(null) }
  }

  const handleStartMatch = async () => {
    if (!team1Id || !team2Id || team1Id === team2Id) return
    setStartingMatch(true)
    setStartError('')
    try {
      const game = await startGame(team1Id, team2Id, setsPerMatch)
      navigate(`/free-play/${id}/match`, { state: { gameId: game.id, setsPerMatch, team1Id, team2Id } })
    } catch (err) {
      console.error(err)
      setStartError(err?.message || JSON.stringify(err) || 'Unknown error')
      setStartingMatch(false)
    }
  }

  const handleResumeMatch = (pendingGame) => {
    setConfirmingResume(pendingGame)
  }

  const handleConfirmResume = () => {
    const game = confirmingResume
    setConfirmingResume(null)
    navigate(`/free-play/${id}/match`, {
      state: {
        gameId:      game.id,
        team1Id:     game.team1Id,
        team2Id:     game.team2Id,
        setsPerMatch: game.setsPerMatch ?? 1,
      },
    })
  }

  // ── Loading / error ─────────────────────────────────────────────────────
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

  const pendingGame = session.games.find(g => !g.played) || null

  return (
    <div className="screen bg-bg text-text">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="screen__top flex items-center justify-between px-4 pt-5 pb-4">
        <button
          onClick={() => navigate('/free-play')}
          className="w-10 h-10 flex items-center justify-center bg-surface border border-line rounded-xl text-text"
        >
          <BackIcon />
        </button>

        <div className="flex-1 text-center px-3 min-w-0">
          <div className="flex items-center justify-center gap-2">
            <div className="text-[17px] font-black text-free uppercase tracking-widest truncate">
              {session.name || 'Free Play'}
            </div>
            {isAdmin && !isFinished && (
              <button
                onClick={() => setShowEditSession(true)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-dim hover:text-free hover:bg-free/10 transition-colors bg-transparent border-0 cursor-pointer shrink-0"
                aria-label="Edit session"
              >
                <PencilIcon />
              </button>
            )}
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
                {isAdmin && !isFinished && (
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

      {/* End confirm */}
      {confirmEnd && (
        <div className="bg-error/10 border-b border-error/20 px-4 py-3 flex items-center justify-between shrink-0">
          <span className="text-[13px] font-bold text-error">End this session?</span>
          <div className="flex gap-3">
            <button onClick={() => setConfirmEnd(false)} className="text-[13px] font-semibold text-dim bg-transparent border-0 cursor-pointer">
              Cancel
            </button>
            <button onClick={handleFinishSession} className="text-[13px] font-bold text-white bg-error px-3 py-1 rounded-lg border-0 cursor-pointer">
              Finish
            </button>
          </div>
        </div>
      )}

      {/* Copied toast */}
      {copied && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-free text-white text-[12px] font-bold px-4 py-2 rounded-full shadow-lg pointer-events-none">
          Link copied!
        </div>
      )}

      {/* ── Session Complete Banner ───────────────────────────────────────── */}
      {isFinished && (
        <button
          onClick={() => setShowSessionStats(true)}
          className="mx-4 mb-3 w-[calc(100%-2rem)] min-h-[44px] rounded-xl bg-free/15 border border-free/40 flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-free/20 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[20px]">🏆</span>
            <div className="text-left">
              <div className="text-[13px] font-bold text-free leading-tight">Session Complete</div>
              <div className="text-[11px] text-dim">See full stats &amp; awards</div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-free flex-shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* ── Tabs nav ─────────────────────────────────────────────────────── */}
      <PillTabs
        items={[
          { id: 'players',  label: 'Players' },
          { id: 'teams',    label: 'Teams' },
          { id: 'matches',  label: 'Matches' },
          { id: 'ranking',  label: 'Ranking' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
        accent="free"
      />

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="screen__body pb-10">
        {activeTab === 'players' && (
          <PlayersTab
            session={session}
            isFinished={isFinished}
            isAdmin={isAdmin}
            removingId={removingId}
            copied={copied}
            onOpenAdd={() => setShowAddPlayer(true)}
            onRemovePlayer={handleRemovePlayer}
            onCopyLink={handleCopyLink}
          />
        )}
        {activeTab === 'teams' && (
          <TeamsTab
            session={session}
            isFinished={isFinished}
            isAdmin={isAdmin}
            onNewTeam={() => { setEditingTeam(null); setShowTeamModal(true) }}
            onEditTeam={(team) => { setEditingTeam(team); setShowTeamModal(true) }}
            onDeleteTeam={deleteTeam}
          />
        )}
        {activeTab === 'matches' && (
          <MatchesTab
            session={session}
            isFinished={isFinished}
            isAdmin={isAdmin}
            sessionId={id}
            pendingGame={pendingGame}
            team1Id={team1Id}
            setTeam1Id={setTeam1Id}
            team2Id={team2Id}
            setTeam2Id={setTeam2Id}
            setsPerMatch={setsPerMatch}
            setSetsPerMatch={setSetsPerMatch}
            startingMatch={startingMatch}
            startError={startError}
            onStartMatch={handleStartMatch}
            onResumeMatch={handleResumeMatch}
            onMatchClick={setSelectedStatsMatch}
          />
        )}
        {activeTab === 'ranking' && (
          <RankingTab session={session} />
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showAddPlayer && (
        <AddPlayerModal
          session={session}
          onAdd={addPlayer}
          onClose={() => setShowAddPlayer(false)}
        />
      )}

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

      {showEditSession && (
        <EditSessionModal
          session={session}
          leagues={leagues}
          onSave={updateSession}
          onClose={() => setShowEditSession(false)}
        />
      )}

      {/* ── Resume confirmation modal ────────────────────────────────────── */}
      {confirmingResume && (() => {
        const tName = (tid) => session.teams.find(t => t.id === tid)?.name || '?'
        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
            <div className="bg-surface border border-free rounded-2xl max-w-[320px] w-full p-6 text-center shadow-[0_0_24px_rgba(0,188,212,0.2)]">
              <div className="text-[30px] mb-3">🔄</div>
              <div className="text-[16px] font-bold text-text mb-1">Resume match?</div>
              <div className="text-[12px] text-dim mb-1">
                {tName(confirmingResume.team1Id)} vs {tName(confirmingResume.team2Id)}
              </div>
              <div className="text-[11px] text-dim mb-6">You'll be taken to the match setup screen.</div>
              <button
                onClick={handleConfirmResume}
                className="w-full py-3 bg-free text-white font-bold rounded-xl mb-3 border-0 cursor-pointer active:scale-[0.98] transition-transform"
              >
                Resume Match
              </button>
              <button
                onClick={() => setConfirmingResume(null)}
                className="w-full py-3 bg-bg text-dim font-bold rounded-xl border border-line cursor-pointer active:opacity-70 transition-opacity"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Match Stats Full-screen Overlay ───────────────────────────────── */}
      {selectedStatsMatch && (
        <MatchStatsOverlay
          match={selectedStatsMatch}
          session={session}
          onClose={() => setSelectedStatsMatch(null)}
        />
      )}

      {/* ── Session Stats Full-screen Overlay ─────────────────────────────── */}
      {showSessionStats && (
        <FreePlayStatsScreen
          session={session}
          onClose={() => setShowSessionStats(false)}
        />
      )}

    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MATCH STATS OVERLAY — mirrors TournamentDetail match detail overlay
// ═════════════════════════════════════════════════════════════════════════════
function MatchStatsOverlay({ match, session, onClose }) {
  // Adapt free-play team shape (playerIds) → GameStats shape (players)
  const teams = useMemo(
    () => (session.teams || []).map(t => ({
      id:      t.id,
      name:    t.name,
      players: t.playerIds || [],
    })),
    [session.teams]
  )
  const players = session.players || []

  const teamName = (id) => teams.find(x => x.id === id)?.name || '?'
  const teamPlayerNames = (teamId) => {
    const t = teams.find(x => x.id === teamId)
    if (!t) return ''
    return t.players
      .map(pid => players.find(p => p.id === pid)?.name)
      .filter(Boolean)
      .join(' · ')
  }

  // Minimal translation dictionary (matches TournamentDetail:1001-1018)
  const tr = (key) => {
    const dict = {
      winner: 'Winner',
      totalPoints: 'Total Points',
      totalLabel: 'pts',
      streaks: 'Streaks',
      maxStreak: 'Max streak',
      howWonTitle: 'How points were won',
      comparison: 'vs',
      serveEff: 'Serve Efficiency',
      whileServing: 'serving',
      whileReceiving: 'receiving',
      history: 'Match History',
      newMatch: 'New Match',
    }
    return dict[key] || key
  }

  const t1Sets = (match.sets || []).filter(s => s.winner === 1).length
  const t2Sets = (match.sets || []).filter(s => s.winner === 2).length

  return (
    <div className="absolute inset-0 z-[100] bg-bg flex flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5 flex-shrink-0 bg-surface border-b border-line">
        <button
          onClick={onClose}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text flex-shrink-0"
        >
          <BackIcon />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold text-text leading-tight truncate">
            Match Details
          </div>
          <div className="text-[11px] text-free">{match.label || 'Result'}</div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 relative">
        {match.log && match.log.length > 0 ? (
          <GameStats
            winner={match.winner}
            team1Id={match.team1}
            team2Id={match.team2}
            sets={(match.sets && match.sets.length > 0)
              ? match.sets
              : [{ s1: match.score1, s2: match.score2, winner: match.winner }]}
            t1Sets={(match.sets && match.sets.length > 0)
              ? t1Sets
              : (match.winner === match.team1 ? 1 : 0)}
            t2Sets={(match.sets && match.sets.length > 0)
              ? t2Sets
              : (match.winner === match.team2 ? 1 : 0)}
            log={match.log}
            teams={teams}
            players={players}
            t={tr}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full gap-6">
            <div className="text-[48px]">📋</div>
            <div>
              <div className="text-[18px] font-bold text-text mb-1">Match Result</div>
              <div className="text-[13px] text-dim">No detailed stats were recorded for this match.</div>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-6 w-full max-w-[280px]">
              {[
                { teamId: match.team1, score: match.score1 },
                { teamId: match.team2, score: match.score2 },
              ].map(({ teamId, score }, idx) => {
                const isWinner = match.winner === teamId
                const names = teamPlayerNames(teamId)
                return (
                  <div key={teamId} className={`flex justify-between items-start ${idx === 0 ? 'mb-4' : ''}`}>
                    <div className="flex-1 min-w-0 pr-3">
                      <div className={`text-[15px] ${isWinner ? 'font-bold text-free' : 'font-medium text-dim'}`}>
                        {teamName(teamId)}
                      </div>
                      {names && <div className="text-[10px] text-dim mt-0.5">{names}</div>}
                    </div>
                    <span className={`text-[24px] font-black flex-shrink-0 ${isWinner ? 'text-free' : 'text-text'}`}>
                      {score}
                    </span>
                  </div>
                )
              })}
            </div>

            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl bg-alt text-[13px] font-bold text-text border-0 cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
