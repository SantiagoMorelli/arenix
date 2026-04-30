import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createFreePlay,
  addFreePlayPlayer,
  createFreePlayTeam,
  notifyPlayersAddedToFreePlay,
} from '../services/freePlayService'
import { supabase } from '../lib/supabase'
import { getMyLeagues } from '../services/leagueService'
import { getLeaguePlayers } from '../services/playerService'
import { AppBadge, AppButton } from '../components/ui-new'

// ─── Icons ────────────────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const BackIcon   = () => <Svg size={16}><polyline points="15 18 9 12 15 6" /></Svg>
const SearchIcon = () => <Svg size={16}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>
const PencilIcon = () => <Svg size={16}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></Svg>
const TrashIcon  = () => <Svg size={16}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></Svg>

// ─── Small helper: generate a temp local key ──────────────────────────────────
let _keyCounter = 1
function tempKey(prefix = 'k') {
  return `${prefix}_${Date.now().toString(36)}_${_keyCounter++}`
}

// ═════════════════════════════════════════════════════════════════════════════
// TEAM MODAL — staged in local wizard state (no DB)
// ═════════════════════════════════════════════════════════════════════════════
function TeamModal({ players, team, onSave, onClose }) {
  const isEdit = !!team
  const [name, setName]         = useState(team?.name || '')
  const [selected, setSelected] = useState(new Set(team?.playerKeys || []))

  const toggle = (pid) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid); else next.add(pid)
      return next
    })

  const handleSave = () => {
    if (!name.trim()) return
    onSave(name.trim(), [...selected])
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
          {players.length === 0 ? (
            <div className="text-[13px] text-dim py-4 text-center">Go back to step 2 and add players first</div>
          ) : (
            <div className="flex flex-col gap-2">
              {players.map(p => {
                const on = selected.has(p.key)
                return (
                  <button
                    key={p.key}
                    onClick={() => toggle(p.key)}
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
          <AppButton variant="free" onClick={handleSave} disabled={!name.trim()}>
            {isEdit ? 'Save Changes' : 'Create Team'}
          </AppButton>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN WIZARD
// ═════════════════════════════════════════════════════════════════════════════
export default function FreePlayWizard() {
  const navigate = useNavigate()
  const totalSteps = 3

  // Global wizard state
  const [step, setStep]         = useState(0)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveErr] = useState('')
  const [showDiscard, setShowDiscard] = useState(false)

  // Step 1 — session
  const [name, setName]         = useState('')
  const [leagueId, setLeagueId] = useState('')
  const [leagues, setLeagues]   = useState([])
  const [leaguesLoading, setLeaguesLoading] = useState(true)

  // Step 2 — players (staged locally; each has a temp key)
  // { key, name, leaguePlayerId|null, isGuest }
  const [players, setPlayers]   = useState([])

  // Step 3 — teams (staged locally)
  // { key, name, playerKeys: [...] }
  const [teams, setTeams]       = useState([])

  // Step 2 inner tab + data
  // tab is derived: if no league, force 'guest'; else use user's selection (default 'league')
  const [userPlayerTab, setUserPlayerTab] = useState('league') // user's explicit choice
  const [leaguePlayers, setLPlayers] = useState([])
  const [lpLoading, setLPLoading]    = useState(false)
  const [search, setSearch]          = useState('')
  const [guestName, setGuestName]    = useState('')

  // Team modal state
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam, setEditingTeam]     = useState(null)

  // Load leagues on mount
  useEffect(() => {
    getMyLeagues()
      .then(setLeagues)
      .catch(console.error)
      .finally(() => setLeaguesLoading(false))
  }, [])

  // Load league players whenever the league changes
  useEffect(() => {
    if (!leagueId) return
    let cancelled = false
    const run = async () => {
      setLPLoading(true)
      try {
        const list = await getLeaguePlayers(leagueId)
        if (!cancelled) setLPlayers(list)
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLPLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [leagueId])

  // ── Derived ──────────────────────────────────────────────────────────────
  const hasLeague = !!leagueId
  const hasProgress = name.trim() || players.length > 0 || teams.length > 0
  const canContinueStep0 = name.trim().length > 0
  const canFinish = !saving
  // If no league is linked, force guest tab; otherwise use user's choice.
  const playerTab = hasLeague ? userPlayerTab : 'guest'
  const setPlayerTab = setUserPlayerTab

  const alreadyAddedLeagueIds = useMemo(
    () => new Set(players.map(p => p.leaguePlayerId).filter(Boolean)),
    [players]
  )

  const filteredLeaguePlayers = useMemo(() => {
    const s = search.toLowerCase()
    return leaguePlayers
      .filter(p => !alreadyAddedLeagueIds.has(p.id))
      .filter(p => p.name.toLowerCase().includes(s))
  }, [leaguePlayers, alreadyAddedLeagueIds, search])

  // ── Player mutations (local) ─────────────────────────────────────────────
  const addLeaguePlayer = (p) => {
    setPlayers(prev => [
      ...prev,
      { key: tempKey('p'), name: p.name, leaguePlayerId: p.id, isGuest: false },
    ])
  }
  const addGuest = () => {
    const n = guestName.trim()
    if (!n) return
    setPlayers(prev => [
      ...prev,
      { key: tempKey('p'), name: n, leaguePlayerId: null, isGuest: true },
    ])
    setGuestName('')
  }
  const removePlayer = (key) => {
    setPlayers(prev => prev.filter(p => p.key !== key))
    // Also clean up team rosters
    setTeams(prev => prev.map(t => ({
      ...t,
      playerKeys: t.playerKeys.filter(k => k !== key),
    })))
  }

  // ── Team mutations (local) ───────────────────────────────────────────────
  const createTeamLocal = (teamName, playerKeys) => {
    setTeams(prev => [
      ...prev,
      { key: tempKey('t'), name: teamName, playerKeys },
    ])
  }
  const updateTeamLocal = (teamKey, teamName, playerKeys) => {
    setTeams(prev => prev.map(t =>
      t.key === teamKey ? { ...t, name: teamName, playerKeys } : t
    ))
  }
  const deleteTeamLocal = (teamKey) => {
    setTeams(prev => prev.filter(t => t.key !== teamKey))
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  const goBack = () => {
    if (step > 0) {
      setStep(step - 1)
      return
    }
    if (hasProgress) setShowDiscard(true)
    else navigate('/free-play')
  }

  const handleDiscard = () => navigate('/free-play')

  // ── Final submit ─────────────────────────────────────────────────────────
  const handleFinish = async () => {
    if (saving) return
    setSaving(true)
    setSaveErr('')
    try {
      // 1) Create the session
      const session = await createFreePlay(name.trim(), leagueId || null)

      // 2) Add players sequentially, mapping temp keys → real IDs
      //    suppressNotify = true here; we'll batch-notify once at the end
      const keyToId = new Map()
      for (const p of players) {
        const saved = await addFreePlayPlayer(session.id, {
          name:           p.name,
          leaguePlayerId: p.leaguePlayerId,
          freePlayName:   session.name,
          suppressNotify: true,
        })
        keyToId.set(p.key, saved.id)
      }

      // 3) Create teams using real player IDs
      for (const t of teams) {
        const realIds = t.playerKeys.map(k => keyToId.get(k)).filter(Boolean)
        await createFreePlayTeam(session.id, t.name, realIds)
      }

      // 4) Batch-notify all league-linked players that were added
      //    (non-blocking — don't fail the wizard if this errors)
      const leaguePlayerIds = players
        .map(p => p.leaguePlayerId)
        .filter(Boolean)
      if (leaguePlayerIds.length > 0) {
        const { data: { user } } = await supabase.auth.getUser()
        notifyPlayersAddedToFreePlay(session, leaguePlayerIds, user?.id).catch(console.error)
      }

      // 5) Go to Matches tab
      navigate(`/free-play/${session.id}`, { state: { tab: 'matches' } })
    } catch (err) {
      console.error(err)
      setSaveErr(err?.message || 'Failed to create session')
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="screen bg-bg text-text">

      {/* Header */}
      <div className="screen__top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={goBack}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface border border-line cursor-pointer text-text flex-shrink-0"
          >
            <BackIcon />
          </button>
          <div>
            <div className="text-[18px] font-bold leading-tight">New Session</div>
            <div className="text-[11px] text-dim">Step {step + 1} of {totalSteps}</div>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="h-1 bg-alt rounded-full overflow-hidden">
            <div
              className="h-full bg-free rounded-full transition-[width] duration-300 ease-in-out"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <main className="screen__body px-4 pb-6">

        {/* ══ Step 0: Session ══════════════════════════════════════════════ */}
        {step === 0 && (
          <div className="flex flex-col gap-5 pt-1">
            <div>
              <div className="text-[11px] font-bold text-free uppercase tracking-widest mb-2">Session name</div>
              <div className="bg-surface border border-line rounded-xl px-4 py-3.5">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sunday at the beach"
                  autoFocus
                  className="w-full bg-transparent border-0 text-[15px] text-text placeholder:text-dim focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-free uppercase tracking-widest mb-2">
                Link to league <span className="normal-case font-normal text-dim">(optional)</span>
              </div>
              {leaguesLoading ? (
                <div className="bg-surface border border-line rounded-xl px-4 py-3.5 text-[13px] text-dim">
                  Loading…
                </div>
              ) : leagues.length === 0 ? (
                <div className="bg-surface border border-line rounded-xl px-4 py-3.5 text-[13px] text-dim">
                  No leagues yet — you can still play a standalone session.
                </div>
              ) : (
                <div className="bg-surface border border-line rounded-xl px-4 py-3.5">
                  <select
                    value={leagueId}
                    onChange={e => setLeagueId(e.target.value)}
                    className="w-full bg-transparent border-0 text-[15px] text-text focus:outline-none appearance-none"
                  >
                    <option value="">No league — standalone</option>
                    {leagues.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="text-[12px] text-dim leading-relaxed">
              A session groups the players, teams and matches you play today.
              Linking a league lets you pull in league players for this session.
            </div>

            {leagueId && (
              <div className="flex items-start gap-2.5 bg-free/10 border border-free/25 rounded-xl px-3.5 py-3">
                <span className="text-[16px] shrink-0 mt-0.5">🔔</span>
                <div className="text-[12px] text-free leading-relaxed">
                  League players you add to this session will be notified when you finish.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ Step 1: Players ══════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="flex flex-col gap-4 pt-1">

            {/* Current roster */}
            <div>
              <div className="text-[11px] font-bold text-free uppercase tracking-widest mb-2">
                Players ({players.length})
              </div>
              {players.length === 0 ? (
                <div className="text-[13px] text-dim">No players yet. Add some below.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {players.map(p => (
                    <div key={p.key} className="flex items-center gap-1.5 bg-surface border border-line rounded-full pl-3 pr-1.5 py-1.5 shrink-0">
                      <span className="text-[13px] font-semibold text-text leading-none">{p.name}</span>
                      {p.isGuest && <AppBadge text="Guest" variant="dim" />}
                      <button
                        onClick={() => removePlayer(p.key)}
                        className="w-5 h-5 flex items-center justify-center rounded-full text-dim hover:text-error hover:bg-error/10 transition-colors text-[14px] leading-none bg-transparent border-0 cursor-pointer shrink-0"
                        aria-label={`Remove ${p.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Picker tabs */}
            {hasLeague && (
              <div className="flex bg-alt rounded-xl p-1 gap-1">
                {[
                  { id: 'league', label: 'From League' },
                  { id: 'guest',  label: 'Guest' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPlayerTab(t.id)}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all border-0 cursor-pointer
                      ${playerTab === t.id ? 'bg-free text-white' : 'bg-transparent text-dim'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* League tab */}
            {hasLeague && playerTab === 'league' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 bg-surface border border-line rounded-xl px-3 py-2.5">
                  <span className="text-dim shrink-0"><SearchIcon /></span>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search players…"
                    className="flex-1 bg-transparent border-0 text-[14px] text-text placeholder:text-dim focus:outline-none"
                  />
                </div>
                {lpLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-free border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredLeaguePlayers.length === 0 ? (
                  <div className="text-center text-[13px] text-dim py-8">
                    {search ? 'No players match your search' : 'All league players added'}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredLeaguePlayers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addLeaguePlayer(p)}
                        className="flex items-center justify-between w-full bg-surface border border-line rounded-xl px-4 py-3 text-left active:bg-alt transition-colors cursor-pointer"
                      >
                        <div className="text-[14px] font-semibold text-text">{p.name}</div>
                        <AppBadge text={p.level || 'beginner'} variant="dim" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Guest tab */}
            {(playerTab === 'guest' || !hasLeague) && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-dim uppercase tracking-wide">Guest name</label>
                  <input
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addGuest()}
                    placeholder="e.g. Maria"
                    className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-free"
                  />
                </div>
                <AppButton variant="free" onClick={addGuest} disabled={!guestName.trim()}>
                  Add Guest
                </AppButton>
                {!hasLeague && (
                  <div className="text-[12px] text-dim">
                    No league linked — only guest players can be added.
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ══ Step 2: Teams (optional) ═════════════════════════════════════ */}
        {step === 2 && (
          <div className="flex flex-col gap-4 pt-1">
            <div>
              <div className="text-[11px] font-bold text-free uppercase tracking-widest mb-2">
                Teams ({teams.length})
              </div>
              <div className="text-[12px] text-dim leading-relaxed mb-3">
                Create teams now or skip and create them later inside the session.
              </div>
            </div>

            {teams.length > 0 && (
              <div className="flex flex-col gap-3">
                {teams.map(t => {
                  const teamPlayers = t.playerKeys
                    .map(k => players.find(p => p.key === k))
                    .filter(Boolean)
                  return (
                    <div key={t.key} className="bg-surface border border-line rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="text-[14px] font-bold text-text flex-1 min-w-0 truncate">{t.name}</div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingTeam(t); setShowTeamModal(true) }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-dim hover:text-free hover:bg-free/10 transition-colors bg-transparent border-0 cursor-pointer"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            onClick={() => deleteTeamLocal(t.key)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-dim hover:text-error hover:bg-error/10 transition-colors bg-transparent border-0 cursor-pointer"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                      {teamPlayers.length === 0 ? (
                        <div className="text-[12px] text-dim">No players assigned</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {teamPlayers.map(p => (
                            <span key={p.key} className="text-[11px] font-semibold bg-bg border border-line rounded-full px-2.5 py-1 text-dim">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <AppButton
              variant="outline"
              onClick={() => { setEditingTeam(null); setShowTeamModal(true) }}
              className="border-free/40 text-free hover:bg-free/5"
            >
              + New Team
            </AppButton>

            {players.length === 0 && (
              <div className="text-[12px] text-error/80">
                You have no players in this session. You can still finish and add players later.
              </div>
            )}

            {saveError && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-[12px]">
                {saveError}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer button */}
      <div className="screen__bottom px-4 py-3.5 border-t border-line bg-surface">
        {step === 0 && (
          <button
            onClick={() => setStep(1)}
            disabled={!canContinueStep0}
            className="w-full min-h-[50px] rounded-xl text-[14px] font-bold bg-free text-white border-0 cursor-pointer disabled:opacity-50"
          >
            Continue
          </button>
        )}
        {step === 1 && (
          <button
            onClick={() => setStep(2)}
            className="w-full min-h-[50px] rounded-xl text-[14px] font-bold bg-free text-white border-0 cursor-pointer"
          >
            Continue
          </button>
        )}
        {step === 2 && (
          <button
            onClick={handleFinish}
            disabled={!canFinish}
            className="w-full min-h-[50px] rounded-xl text-[14px] font-bold bg-free text-white border-0 cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Creating…' : teams.length === 0 ? 'Skip & Finish' : 'Finish'}
          </button>
        )}
      </div>

      {/* Discard confirm */}
      {showDiscard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="w-full max-w-[360px] bg-surface rounded-2xl p-5 flex flex-col gap-4 border border-line">
            <div className="text-[15px] font-black text-text">Discard session setup?</div>
            <div className="text-[13px] text-dim">
              You'll lose everything you've added in the wizard so far.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDiscard(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-alt text-text text-[13px] font-bold border-0 cursor-pointer"
              >
                Keep editing
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 min-h-[44px] rounded-xl bg-error text-white text-[13px] font-bold border-0 cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team modal */}
      {showTeamModal && (
        <TeamModal
          players={players}
          team={editingTeam}
          onSave={(teamName, playerKeys) => {
            if (editingTeam) updateTeamLocal(editingTeam.key, teamName, playerKeys)
            else createTeamLocal(teamName, playerKeys)
          }}
          onClose={() => setShowTeamModal(false)}
        />
      )}

    </div>
  )
}
