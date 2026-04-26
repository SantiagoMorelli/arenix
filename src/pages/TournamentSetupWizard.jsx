import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { createTournament } from '../services/tournamentService'
import { createNotificationsForLeagueMembers } from '../services/notificationService'
import { uid, now, levelOf, generateRoundRobinSchedule } from '../lib/utils'

const STEPS = ['Players', 'Teams', 'Schedule']

const FORMAT_OPTIONS = [
  { id: 'group',    label: 'Group + Knockout', emoji: '🏆' },
  { id: 'freeplay', label: 'Free Play',         emoji: '🎮' },
]

// ── Team generation helpers ───────────────────────────────────────────────────
const LEVEL_SCORE = { beginner: 1, intermediate: 2, advanced: 3 }

function snakeDraft(sorted, numTeams, teamSize) {
  const slots = Array.from({ length: numTeams }, () => [])
  sorted.forEach((p, i) => {
    const row = Math.floor(i / numTeams)
    const col = row % 2 === 0 ? i % numTeams : numTeams - 1 - (i % numTeams)
    if (slots[col] && slots[col].length < teamSize) slots[col].push(p.id)
  })
  return slots.filter(s => s.length === teamSize)
}

function seqDraft(sorted, numTeams, teamSize) {
  const slots = Array.from({ length: numTeams }, () => [])
  sorted.forEach((p, i) => {
    const col = Math.floor(i / teamSize)
    if (col < numTeams && slots[col].length < teamSize) slots[col].push(p.id)
  })
  return slots.filter(s => s.length === teamSize)
}

function interleave(...arrs) {
  const pools = arrs.map(arr => ({ arr, idx: 0 })).filter(p => p.arr.length > 0)
  const result = []
  const total = arrs.reduce((s, a) => s + a.length, 0)
  for (let i = 0; i < total; i++) {
    let best = null, bestScore = Infinity
    for (const p of pools) {
      if (p.idx >= p.arr.length) continue
      const score = p.idx / p.arr.length
      if (score < bestScore) { bestScore = score; best = p }
    }
    if (best) result.push(best.arr[best.idx++])
  }
  return result
}

function buildTeamGroups(pool, params, teamSize) {
  const n = Math.floor(pool.length / teamSize)
  if (n < 1) return []
  const byLevel = arr => [...arr].sort((a, b) => (LEVEL_SCORE[b.level] || 1) - (LEVEL_SCORE[a.level] || 1))
  const rand    = arr => [...arr].sort(() => Math.random() - 0.5)
  const M = p => p.sex === 'M', F = p => p.sex === 'F', O = p => p.sex !== 'M' && p.sex !== 'F'
  let sorted
  if      (params.length === 0)                          sorted = rand(pool)
  else if (params[0] === 'sex'   && params.length === 1) sorted = interleave(rand(pool.filter(M)), rand(pool.filter(F)), rand(pool.filter(O)))
  else if (params[0] === 'level' && params.length === 1) sorted = byLevel(pool)
  else if (params[0] === 'sex')                          sorted = interleave(byLevel(pool.filter(M)), byLevel(pool.filter(F)), byLevel(pool.filter(O)))
  else                                                   sorted = [...pool].sort((a, b) => {
    const ld = (LEVEL_SCORE[b.level] || 1) - (LEVEL_SCORE[a.level] || 1)
    if (ld !== 0) return ld
    const s = x => x.sex === 'M' ? 0 : x.sex === 'F' ? 1 : 2
    return s(a) - s(b)
  })
  const useSexBalance = params[0] === 'sex'
  return useSexBalance ? seqDraft(sorted, n, teamSize) : snakeDraft(sorted, n, teamSize)
}

function paramDescription(params) {
  if (params.length === 0)                            return 'Teams generated randomly with no prioritization.'
  if (params[0] === 'sex'   && params.length === 1)   return 'Teams balanced by sex — males and females distributed evenly.'
  if (params[0] === 'level' && params.length === 1)   return 'Teams balanced by skill level using a snake draft.'
  if (params[0] === 'sex')   return 'Primary: balance sex across teams. Secondary: balance skill level within each sex group.'
  return 'Primary: balance skill level across teams. Secondary: alternate sex within the same level.'
}

function Stepper({ step }) {
  return (
    <div className="px-4 mb-4">
      <div className="flex items-center">
        {STEPS.map((label, idx) => {
          const done   = idx < step
          const active = idx === step
          return (
            <div key={label} className="flex items-center flex-1">
              <div className="flex items-center gap-1.5 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  done ? 'bg-success text-white' : active ? 'bg-accent text-white' : 'bg-alt text-dim'
                }`}>
                  {done ? '✓' : idx + 1}
                </div>
                <span className={`text-[11px] font-semibold ${active ? 'text-accent' : done ? 'text-success' : 'text-dim'}`}>
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-5 h-0.5 rounded ${done ? 'bg-success' : 'bg-line'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getValidGroupOptions(numTeams) {
  return [2, 4, 8].filter(g => Math.floor(numTeams / g) >= 3)
}

function buildPreviewGroups(teamList, numGroups) {
  const groups = Array.from({ length: numGroups }, (_, i) => ({
    id: `g${i}`,
    name: `Group ${String.fromCharCode(65 + i)}`,
    teamIds: [],
  }))
  teamList.forEach((tm, idx) => { groups[idx % numGroups].teamIds.push(tm.id) })
  return groups
}

export default function TournamentSetupWizard() {
  const navigate  = useNavigate()
  const { id }    = useParams()

  const { league } = useLeague(id)
  const { isAdmin } = useLeagueRole(id)

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 0 state
  const [playerSearch, setPlayerSearch] = useState('')
  const [name,         setName]         = useState('')
  const [date,         setDate]         = useState(now())
  const [teamSize,     setTeamSize]     = useState(2)
  const [setsPerMatch, setSetsPerMatch] = useState(1)
  const [pickedPlayers, setPickedPlayers] = useState([])

  // Step 1 state — teams live fully in local state
  const [teams,            setTeams]            = useState([])
  const [teamMode,         setTeamMode]         = useState('auto')
  const [params,           setParams]           = useState([])       // ordered: ['sex','level']
  const [proposedTeams,    setProposedTeams]    = useState([])
  const [addingTeam,       setAddingTeam]       = useState(false)
  const [addingTeamName,   setAddingTeamName]   = useState('')
  const [pickingForTeamId, setPickingForTeamId] = useState(null)    // teamId or null

  // Step 2 state
  const [formatMode,      setFormatMode]      = useState('group')
  const [numGroupsChoice, setNumGroupsChoice] = useState(null)
  const [previewGroups,   setPreviewGroups]   = useState([])
  const [selectedTeamId,  setSelectedTeamId]  = useState(null)

  // ── Derived ──────────────────────────────────────────────────────────────
  const invitedPlayers = useMemo(
    () => (league?.players || []).filter(p => pickedPlayers.includes(p.id)),
    [league?.players, pickedPlayers]
  )

  const availablePlayers = useMemo(
    () => invitedPlayers.filter(p => !teams.some(tm => tm.players.includes(p.id))),
    [invitedPlayers, teams]
  )

  const canContinueFromPlayers = name.trim() && pickedPlayers.length >= teamSize
  const canContinueFromTeams   = teams.length >= 2
  const validGroupOptions      = getValidGroupOptions(teams.length)
  const canGroupStage          = validGroupOptions.length > 0
  const effectiveFormat        = canGroupStage ? formatMode : 'freeplay'
  const selectedGroups         = numGroupsChoice || validGroupOptions[0] || 2

  // ── Group preview — regenerate when step/format/group-count changes ──────
  useEffect(() => {
    if (step === 2 && effectiveFormat === 'group') {
      setPreviewGroups(buildPreviewGroups(teams, selectedGroups))
      setSelectedTeamId(null)
    }
  }, [step, effectiveFormat, selectedGroups])

  // ── Redirect non-admins ───────────────────────────────────────────────────
  if (!isAdmin && league) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-text gap-2 px-6 text-center">
        <div className="text-[18px] font-bold">Admin only</div>
        <div className="text-[13px] text-dim">Only league admins can create tournaments.</div>
        <button onClick={() => navigate(`/league/${id}`)} className="mt-4 text-[13px] text-accent font-semibold bg-transparent border-0 cursor-pointer">
          ← Back to league
        </button>
      </div>
    )
  }

  // ── Player picking ────────────────────────────────────────────────────────
  const togglePickedPlayer = pid =>
    setPickedPlayers(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid])

  // ── Auto-generate teams ───────────────────────────────────────────────────
  const toggleParam = p => {
    setParams(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
    setProposedTeams([])
  }

  const propose = () => {
    const groups = buildTeamGroups(availablePlayers, params, teamSize)
    setProposedTeams(groups.map((pIds, i) => ({
      id: uid(), name: `Team ${teams.length + i + 1}`, players: pIds, wins: 0, losses: 0, points: 0,
    })))
  }

  const confirmProposed = () => {
    if (!proposedTeams.length) return
    setTeams(prev => [...prev, ...proposedTeams])
    setProposedTeams([])
  }

  // ── Manual team creation ──────────────────────────────────────────────────
  const addEmptyTeam = () => {
    if (!addingTeamName.trim()) return
    setTeams(prev => [...prev, { id: uid(), name: addingTeamName.trim(), players: [], wins: 0, losses: 0, points: 0 }])
    setAddingTeamName('')
    setAddingTeam(false)
  }

  const assignPlayer = (teamId, pid) => {
    setTeams(prev => prev.map(t =>
      t.id !== teamId ? t : t.players.length < teamSize ? { ...t, players: [...t.players, pid] } : t
    ))
    setPickingForTeamId(null)
  }

  const removePlayerFromTeam = (teamId, pid) =>
    setTeams(prev => prev.map(t =>
      t.id !== teamId ? t : { ...t, players: t.players.filter(id => id !== pid) }
    ))

  const removeTeam = teamId => setTeams(prev => prev.filter(t => t.id !== teamId))

  // ── Group editing ─────────────────────────────────────────────────────────
  const handleTeamTap = teamId =>
    setSelectedTeamId(prev => prev === teamId ? null : teamId)

  const handleGroupTap = groupId => {
    if (!selectedTeamId) return
    setPreviewGroups(prev => prev.map(g => ({
      ...g,
      teamIds: g.id === groupId
        ? g.teamIds.includes(selectedTeamId) ? g.teamIds : [...g.teamIds, selectedTeamId]
        : g.teamIds.filter(id => id !== selectedTeamId),
    })))
    setSelectedTeamId(null)
  }

  // ── Final submit — write everything to Supabase at once ───────────────────
  const handleStartTournament = async () => {
    if (!league || teams.length < 2) return
    setSaving(true)

    try {
      let groups  = []
      let matches = []

      if (effectiveFormat === 'group') {
        groups = previewGroups.map(g => ({
          ...g,
          matches: generateRoundRobinSchedule(g.teamIds, `gm_${g.id}_`),
        }))
      } else {
        matches = generateRoundRobinSchedule(teams.map(t => t.id), "fp_")
      }

      const tournament = await createTournament(id, { name: name.trim(), date, teamSize, setsPerMatch, teams, groups, matches })

      await createNotificationsForLeagueMembers(
        id,
        'tournament_started',
        '🏐 Tournament started!',
        `${name.trim()} is now live`,
        { leagueId: id, tournamentId: tournament.id },
      )

      navigate(`/league/${id}/tournament/${tournament.id}`)
    } catch (err) {
      console.error('Failed to create tournament:', err)
      setSaving(false)
    }
  }

  if (!league) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0">
        <button
          onClick={() => navigate(`/league/${id}`)}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text"
        >
          ←
        </button>
        <div>
          <div className="text-[18px] font-bold">Tournament Setup</div>
          <div className="text-[11px] text-dim">{league.name}</div>
        </div>
      </div>

      <Stepper step={step} />

      <main className="flex-1 overflow-y-auto px-4 pb-6">
        {/* ══ Step 0: Players ══════════════════════════════════════════════════ */}
        {step === 0 && (
          <div>
            <div className="text-[16px] font-bold mb-1">Invite Players</div>
            <div className="text-[12px] text-dim mb-3.5">Select from your league roster</div>

            <div className="bg-surface rounded-xl border border-line p-3.5 mb-3.5">
              <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">Tournament Info</div>
              <div className="flex flex-col gap-2.5">
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Tournament name"
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-[14px] text-text bg-bg outline-none focus:border-accent"
                />
                <input
                  value={date} onChange={e => setDate(e.target.value)}
                  placeholder="Date"
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-[14px] text-text bg-bg outline-none focus:border-accent"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-bg border border-line rounded-lg p-2.5">
                    <div className="text-[10px] text-dim uppercase font-bold mb-1">Players/Team</div>
                    <div className="flex gap-1.5">
                      {[2, 3].map(n => (
                        <button key={n} onClick={() => setTeamSize(n)}
                          className={`flex-1 py-1.5 text-[12px] rounded-md border cursor-pointer ${teamSize === n ? 'border-accent bg-accent/10 text-accent font-bold' : 'border-line bg-surface text-text'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-bg border border-line rounded-lg p-2.5">
                    <div className="text-[10px] text-dim uppercase font-bold mb-1">Sets/Match</div>
                    <div className="flex gap-1.5">
                      {[1, 3, 5].map(n => (
                        <button key={n} onClick={() => setSetsPerMatch(n)}
                          className={`flex-1 py-1.5 text-[12px] rounded-md border cursor-pointer ${setsPerMatch === n ? 'border-accent bg-accent/10 text-accent font-bold' : 'border-line bg-surface text-text'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search */}
            <input
              value={playerSearch}
              onChange={e => setPlayerSearch(e.target.value)}
              placeholder="🔍 Search players..."
              className="w-full bg-surface border border-line rounded-[10px] px-3.5 py-2.5 text-[13px] text-text outline-none focus:border-accent mb-3.5"
            />

            {/* Selected pills */}
            <div className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">
              Selected ({pickedPlayers.length})
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {pickedPlayers.map(pid => {
                const pl = league.players.find(p => p.id === pid)
                return pl ? (
                  <span key={pid} className="text-[11px] bg-accent/15 text-accent rounded-lg px-2.5 py-1.5 font-medium flex items-center gap-1">
                    {pl.name}
                    <button
                      onClick={() => togglePickedPlayer(pid)}
                      className="text-[9px] text-dim cursor-pointer bg-transparent border-0 p-0 leading-none"
                    >✕</button>
                  </span>
                ) : null
              })}
            </div>

            {/* Available league players */}
            <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">League Players</div>
            <div className="flex flex-col">
              {(league.players || [])
                .filter(p => !pickedPlayers.includes(p.id))
                .filter(p => p.name.toLowerCase().includes(playerSearch.toLowerCase()))
                .map(player => (
                  <div key={player.id} className="bg-surface rounded-[10px] border border-line px-3.5 py-2.5 mb-1.5 flex items-center gap-2.5">
                    <div className="w-[30px] h-[30px] rounded-lg bg-alt flex items-center justify-center text-[12px] font-semibold text-text flex-shrink-0">
                      {player.name[0]}
                    </div>
                    <span className="flex-1 text-[13px] font-medium text-text">{player.name}</span>
                    <button
                      onClick={() => togglePickedPlayer(player.id)}
                      className="w-6 h-6 rounded-[6px] border-2 border-line flex items-center justify-center cursor-pointer bg-transparent text-dim flex-shrink-0"
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                  </div>
                ))
              }
            </div>

            <button
              onClick={() => setStep(1)}
              disabled={!canContinueFromPlayers}
              className="w-full mt-3.5 min-h-[44px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              Next: Create Teams
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        )}

        {/* ══ Step 1: Teams ════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div>
            <div className="text-[16px] font-bold mb-1">Create Teams</div>
            <div className="text-[12px] text-dim mb-4">{invitedPlayers.length} players · {teamSize} per team</div>

            {/* Mode toggle */}
            <div className="flex bg-alt rounded-[10px] p-[3px] mb-4">
              {[{ id: 'auto', label: 'Auto Generate', emoji: '🔀' }, { id: 'manual', label: 'Manual', emoji: '✏️' }].map(opt => (
                <button key={opt.id} onClick={() => { setTeamMode(opt.id); setProposedTeams([]) }}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-semibold cursor-pointer border-0 transition-all ${teamMode === opt.id ? 'bg-surface text-accent shadow-sm' : 'bg-transparent text-dim'}`}>
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>

            {/* ── AUTO SECTION ── */}
            {teamMode === 'auto' && (
              <div className="flex flex-col gap-3 mb-4">

                {/* Parameter selector */}
                <div className="bg-surface border border-line rounded-xl px-3.5 py-3">
                  <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2.5">Balance by (tap to set priority)</div>
                  <div className="flex gap-2 mb-2.5">
                    {[{ id: 'sex', label: 'Sex', icon: '⚥' }, { id: 'level', label: 'Level', icon: '📊' }].map(({ id, label, icon }) => {
                      const idx    = params.indexOf(id)
                      const active = idx !== -1
                      return (
                        <button key={id} onClick={() => toggleParam(id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold border-2 cursor-pointer transition-all ${active ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-alt text-dim'}`}>
                          <span>{icon}</span>
                          {label}
                          {active && (
                            <span className="w-4 h-4 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center leading-none shrink-0">
                              {idx + 1}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {params.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-dim">Priority:</span>
                      {params.map((p, i) => {
                        const def = { sex: { icon: '⚥', label: 'Sex' }, level: { icon: '📊', label: 'Level' } }[p]
                        return (
                          <span key={p} className="flex items-center gap-1 text-[11px] font-semibold text-accent">
                            {i > 0 && <span className="text-dim">→</span>}
                            {def.icon} {def.label}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Tip */}
                <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-2.5 text-[12px] text-accent">
                  💡 {paramDescription(params)}
                </div>

                {/* Generate / Regenerate button */}
                <button onClick={propose} disabled={availablePlayers.length < teamSize}
                  className="w-full min-h-[42px] rounded-lg border border-dashed border-accent/50 text-accent font-semibold bg-transparent cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2">
                  🔀 {proposedTeams.length ? 'Regenerate' : 'Generate Teams'}
                </button>

                {/* Preview */}
                {proposedTeams.length > 0 && (
                  <>
                    <div className="text-[11px] font-bold text-dim uppercase tracking-wide">Preview ({proposedTeams.length} teams)</div>
                    <div className="flex flex-col gap-2">
                      {proposedTeams.map(tm => (
                        <div key={tm.id} className="bg-surface border border-line rounded-xl px-3.5 py-3">
                          <div className="text-[14px] font-bold text-text mb-1.5">{tm.name}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {tm.players.map(pid => {
                              const pl = invitedPlayers.find(p => p.id === pid)
                              return pl ? (
                                <span key={pid} className="flex items-center gap-1 bg-accent/10 text-accent text-[11px] font-medium px-2.5 py-1 rounded-lg">
                                  <span>{levelOf(pl.level).icon}</span>{pl.name}
                                  {pl.sex && <span className="text-[10px] text-accent/70">({pl.sex})</span>}
                                </span>
                              ) : null
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={propose}
                        className="min-h-[42px] rounded-lg text-[13px] font-semibold text-text border border-line bg-surface cursor-pointer">
                        🔄 Regenerate
                      </button>
                      <button onClick={confirmProposed}
                        className="min-h-[42px] rounded-lg text-[13px] font-bold text-white bg-accent border-0 cursor-pointer">
                        ✓ Confirm
                      </button>
                    </div>
                  </>
                )}

                {/* Confirmed teams */}
                {teams.length > 0 && (
                  <>
                    <div className="text-[11px] font-bold text-success uppercase tracking-wide">Confirmed ({teams.length} teams)</div>
                    <div className="flex flex-col gap-2">
                      {teams.map(tm => (
                        <div key={tm.id} className="bg-surface rounded-xl border border-success/40 px-3.5 py-3 flex items-center gap-2">
                          <div className="flex-1">
                            <div className="text-[13px] font-bold text-text mb-1">{tm.name}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {tm.players.map(pid => {
                                const pl = invitedPlayers.find(p => p.id === pid)
                                return pl ? (
                                  <span key={pid} className="flex items-center gap-1 bg-accent/10 text-accent text-[11px] font-medium px-2 py-0.5 rounded-lg">
                                    <span>{levelOf(pl.level).icon}</span>{pl.name}
                                  </span>
                                ) : null
                              })}
                            </div>
                          </div>
                          <button onClick={() => removeTeam(tm.id)} className="text-dim bg-transparent border-0 cursor-pointer text-[16px] leading-none shrink-0">✕</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {availablePlayers.length > 0 && availablePlayers.length < teamSize && (
                  <div className="text-[11px] text-dim text-center">
                    {availablePlayers.length} unassigned player{availablePlayers.length > 1 ? 's' : ''} — not enough for a full team
                  </div>
                )}
              </div>
            )}

            {/* ── MANUAL SECTION ── */}
            {teamMode === 'manual' && (
              <div className="flex flex-col gap-3 mb-4">

                {/* Team cards */}
                {teams.length === 0 && !addingTeam && (
                  <div className="bg-surface border border-line rounded-xl p-6 text-center text-dim text-[13px]">
                    Add your first team below
                  </div>
                )}
                {teams.map(tm => (
                  <div key={tm.id} className={`bg-surface rounded-xl border px-3.5 py-3 ${tm.players.length === teamSize ? 'border-success/40' : 'border-line'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px] font-bold text-text">{tm.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-dim">{tm.players.length}/{teamSize}</span>
                        <button onClick={() => removeTeam(tm.id)} className="bg-transparent border-0 cursor-pointer text-dim text-[16px] leading-none">✕</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tm.players.map(pid => {
                        const pl = invitedPlayers.find(p => p.id === pid)
                        return pl ? (
                          <span key={pid} className="flex items-center gap-1 bg-accent/10 text-accent text-[11px] font-medium px-2.5 py-1 rounded-lg">
                            <span>{levelOf(pl.level).icon}</span>{pl.name}
                            {pl.sex && <span className="text-[10px] text-accent/70">({pl.sex})</span>}
                            <button onClick={() => removePlayerFromTeam(tm.id, pid)} className="bg-transparent border-0 cursor-pointer text-dim leading-none ml-0.5">×</button>
                          </span>
                        ) : null
                      })}
                      {tm.players.length < teamSize && (
                        <button
                          onClick={() => setPickingForTeamId(pickingForTeamId === tm.id ? null : tm.id)}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border border-dashed cursor-pointer transition-all ${pickingForTeamId === tm.id ? 'border-accent text-accent bg-accent/10' : 'border-dim/40 text-dim bg-transparent'}`}>
                          + Add player
                        </button>
                      )}
                    </div>
                    {/* Inline picker */}
                    {pickingForTeamId === tm.id && (
                      <div className="mt-2.5 pt-2.5 border-t border-line flex flex-wrap gap-1.5">
                        {availablePlayers.filter(p => !tm.players.includes(p.id)).length === 0 ? (
                          <span className="text-[11px] text-dim">No unassigned players</span>
                        ) : (
                          availablePlayers
                            .filter(p => !tm.players.includes(p.id))
                            .map(p => (
                              <button key={p.id} onClick={() => assignPlayer(tm.id, p.id)}
                                className="flex items-center gap-1 bg-alt text-text text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-line cursor-pointer active:opacity-70 transition-opacity">
                                <span>{levelOf(p.level).icon}</span>{p.name}
                                {p.sex && <span className="text-[10px] text-dim">({p.sex})</span>}
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Team input */}
                {addingTeam ? (
                  <div className="bg-surface border border-accent/40 rounded-xl px-3.5 py-3 flex gap-2 items-center">
                    <input
                      value={addingTeamName}
                      onChange={e => setAddingTeamName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addEmptyTeam()}
                      placeholder="Team name…"
                      autoFocus
                      className="flex-1 bg-transparent text-[14px] font-bold text-text outline-none placeholder:text-dim"
                    />
                    <button onClick={addEmptyTeam} disabled={!addingTeamName.trim()}
                      className="text-accent font-bold text-[13px] bg-transparent border-0 cursor-pointer disabled:opacity-40">
                      Add
                    </button>
                    <button onClick={() => { setAddingTeam(false); setAddingTeamName('') }}
                      className="text-dim bg-transparent border-0 cursor-pointer text-[14px]">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingTeam(true)}
                    className="w-full min-h-[44px] border border-dashed border-accent/50 rounded-xl text-[13px] font-semibold text-accent bg-transparent cursor-pointer flex items-center justify-center gap-2">
                    + Add Team
                  </button>
                )}

                {/* Unassigned strip */}
                {availablePlayers.length > 0 && (
                  <div className="bg-alt rounded-xl px-3.5 py-3">
                    <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">
                      Unassigned ({availablePlayers.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availablePlayers.map(p => (
                        <span key={p.id} className="flex items-center gap-1 bg-surface text-text text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-line">
                          <span>{levelOf(p.level).icon}</span>{p.name}
                          {p.sex && <span className="text-[10px] text-dim">({p.sex})</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setStep(0)} className="min-h-[42px] rounded-lg text-[13px] font-semibold text-text border border-line bg-surface cursor-pointer">Back</button>
              <button onClick={() => setStep(2)} disabled={!canContinueFromTeams}
                className="min-h-[42px] rounded-lg text-[13px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50">
                Next: Schedule
              </button>
            </div>
          </div>
        )}

        {/* ══ Step 2: Schedule ═════════════════════════════════════════════════ */}
        {step === 2 && (
          <div>
            <div className="text-[16px] font-bold mb-1">Generate Schedule</div>
            <div className="text-[12px] text-dim mb-4">
              {teams.length} teams · {setsPerMatch === 1 ? '1 set' : `${setsPerMatch} sets`}
            </div>

            <div className="bg-surface rounded-xl border border-line p-3.5 mb-3.5">
              <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">Tournament format</div>
              <div className="grid grid-cols-2 gap-2">
                {FORMAT_OPTIONS.map(opt => {
                  const disabled = opt.id === 'group' && !canGroupStage
                  return (
                    <button key={opt.id} onClick={() => !disabled && setFormatMode(opt.id)} disabled={disabled}
                      className={`px-3 py-2.5 rounded-lg border-2 text-[12px] text-left cursor-pointer disabled:opacity-50 ${effectiveFormat === opt.id ? 'border-accent bg-accent/10 text-accent font-bold' : 'border-line bg-bg text-text'}`}>
                      <div>{opt.emoji} {opt.label}</div>
                    </button>
                  )
                })}
              </div>

              {!canGroupStage && (
                <div className="text-[11px] text-dim mt-2">
                  Need at least 6 teams for Group + Knockout. Free Play is selected automatically.
                </div>
              )}

              {effectiveFormat === 'group' && canGroupStage && (
                <div className="mt-3">
                  <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">Number of groups</div>
                  <div className="flex flex-wrap gap-1.5">
                    {validGroupOptions.map(n => (
                      <button key={n} onClick={() => setNumGroupsChoice(n)}
                        className={`px-2.5 py-1.5 rounded-md text-[12px] border cursor-pointer ${selectedGroups === n ? 'border-accent bg-accent/10 text-accent font-bold' : 'border-line bg-bg text-text'}`}>
                        {n} groups
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {effectiveFormat === 'group' && previewGroups.length > 0 && (
              <div className="mb-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-bold text-dim uppercase tracking-wide">Groups preview</div>
                  {selectedTeamId && (
                    <div className="text-[11px] text-accent font-semibold">Tap a group to move team</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {previewGroups.map(group => (
                    <div
                      key={group.id}
                      onClick={() => handleGroupTap(group.id)}
                      className={`rounded-xl border p-2.5 transition-colors ${
                        selectedTeamId
                          ? 'border-accent/60 bg-accent/5 cursor-pointer'
                          : 'border-line bg-surface'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">
                        {group.name}
                      </div>
                      {group.teamIds.map(teamId => {
                        const team = teams.find(t => t.id === teamId)
                        if (!team) return null
                        return (
                          <div
                            key={teamId}
                            onClick={e => { e.stopPropagation(); handleTeamTap(teamId) }}
                            className={`px-2 py-1.5 rounded-lg mb-1 cursor-pointer transition-colors ${
                              selectedTeamId === teamId
                                ? 'bg-accent text-white'
                                : 'bg-bg text-text border border-line'
                            }`}
                          >
                            <div className="text-[12px] font-medium">{team.name}</div>
                            {team.players.length > 0 && (
                              <div className={`text-[10px] mt-0.5 truncate ${selectedTeamId === teamId ? 'text-white/70' : 'text-dim'}`}>
                                {team.players.map(pid => {
                                  const p = invitedPlayers.find(x => x.id === pid)
                                  return p ? (p.displayName || p.nickname || p.name) : null
                                }).filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setStep(1)} className="min-h-[42px] rounded-lg text-[13px] font-semibold text-text border border-line bg-surface cursor-pointer">Back</button>
              <button onClick={handleStartTournament} disabled={saving}
                className="min-h-[42px] rounded-lg text-[13px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-60">
                {saving ? 'Creating…' : 'Start Tournament'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
