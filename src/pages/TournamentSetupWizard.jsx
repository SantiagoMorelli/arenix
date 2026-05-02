import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'
import { createTournament } from '../services/tournamentService'
import { createNotificationsForLeagueMembers } from '../services/notificationService'
import { uid, levelOf, generateRoundRobinSchedule } from '../lib/utils'
import { useToast } from '../components/ToastContext'

const FORMAT_OPTIONS = [
  { id: 'group',    label: 'Group + Knockout' },
  { id: 'freeplay', label: 'Round-robin'       },
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

  const rand = arr => [...arr].sort(() => Math.random() - 0.5)

  // Map linked-profile gender strings to the canonical sex codes used in player rows
  const PROFILE_TO_SEX = { male: 'M', female: 'F', other: 'X' }
  const sexOf = p => p.sex || PROFILE_TO_SEX[p.gender] || null

  // Sex predicates — fall back to linked profile gender so linked users are never
  // silently bucketed as "Other" just because their players.sex column is null.
  const M = p => sexOf(p) === 'M'
  const F = p => sexOf(p) === 'F'
  const O = p => sexOf(p) !== 'M' && sexOf(p) !== 'F'

  // Sort descending by level but shuffle within each tier so every Regenerate
  // call produces a different valid arrangement (fixes deterministic output).
  const byLevel = arr => {
    const tiers = { advanced: [], intermediate: [], beginner: [], unknown: [] }
    for (const p of arr) {
      const key = Object.prototype.hasOwnProperty.call(LEVEL_SCORE, p.level) ? p.level : 'unknown'
      tiers[key].push(p)
    }
    return [
      ...rand(tiers.advanced),
      ...rand(tiers.intermediate),
      ...rand(tiers.beginner),
      ...rand(tiers.unknown),
    ]
  }

  let sorted
  if      (params.length === 0)                          sorted = rand(pool)
  else if (params[0] === 'sex'   && params.length === 1) sorted = interleave(rand(pool.filter(M)), rand(pool.filter(F)), rand(pool.filter(O)))
  else if (params[0] === 'level' && params.length === 1) sorted = byLevel(pool)
  else if (params[0] === 'sex')                          sorted = interleave(byLevel(pool.filter(M)), byLevel(pool.filter(F)), byLevel(pool.filter(O)))
  else {
    // Level-primary, sex-secondary: sort by tier desc, then randomise within each
    // (level, sex) sub-bucket so Regenerate produces genuinely different teams.
    const TIERS = ['advanced', 'intermediate', 'beginner', 'unknown']
    const SEXES = ['M', 'F', 'X']
    sorted = []
    for (const tier of TIERS) {
      for (const sx of SEXES) {
        sorted.push(...rand(pool.filter(p => {
          const key = Object.prototype.hasOwnProperty.call(LEVEL_SCORE, p.level) ? p.level : 'unknown'
          return key === tier && sexOf(p) === sx
        })))
      }
      // Include players of this tier whose sex is null / unrecognised
      sorted.push(...rand(pool.filter(p => {
        const key = Object.prototype.hasOwnProperty.call(LEVEL_SCORE, p.level) ? p.level : 'unknown'
        return key === tier && sexOf(p) !== 'M' && sexOf(p) !== 'F' && sexOf(p) !== 'X'
      })))
    }
  }

  return snakeDraft(sorted, n, teamSize)
}

function paramDescription(params) {
  if (params.length === 0)                            return 'Teams generated randomly with no prioritization.'
  if (params[0] === 'sex'   && params.length === 1)   return 'Teams balanced by sex — males and females distributed evenly.'
  if (params[0] === 'level' && params.length === 1)   return 'Teams balanced by skill level using a snake draft.'
  if (params[0] === 'sex')   return 'Primary: balance sex across teams. Secondary: balance skill level within each sex group.'
  return 'Primary: balance skill level across teams. Secondary: alternate sex within the same level.'
}

function playerColor(name) {
  const palette = ['#C0392B','#8E44AD','#2980B9','#16A085','#27AE60','#E67E22','#9B59B6','#1ABC9C','#D35400','#2C3E50']
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) | 0
  return palette[Math.abs(hash) % palette.length]
}

function playerInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function formatDateDisplay(iso) {
  if (!iso) return 'Select date'
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const parts = iso.split('-')
  if (parts.length === 3) return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}`
  return iso
}

function shortName(name) {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length < 2) return parts[0] || name
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

const NATO = ['Alpha','Bravo','Charlie','Delta','Echo','Foxtrot','Golf','Hotel','India','Juliet']

function genderLabel(sex) {
  if (sex === 'M') return 'Male'
  if (sex === 'F') return 'Female'
  return sex ? 'Other' : null
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
  const { showError } = useToast()

  const { league } = useLeague(id)
  const { isAdmin } = useLeagueRole(id)

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 0 state
  const [name,         setName]         = useState('')
  const [date,         setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [teamSize,     setTeamSize]     = useState(2)
  const [setsPerMatch, setSetsPerMatch] = useState(1)
  const [pickedPlayers, setPickedPlayers] = useState([])

  // Step 1 state — teams live fully in local state
  const [teams,            setTeams]            = useState([])
  const [teamMode,         setTeamMode]         = useState('auto')
  const [params,           setParams]           = useState([])       // ordered: ['sex','level']
  const [proposedTeams,    setProposedTeams]    = useState([])
  const [pickingForTeamId, setPickingForTeamId] = useState(null)
  const [confirmedAuto,    setConfirmedAuto]    = useState(false)

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

  const canContinueFromTeams = teams.length >= 2
  const validGroupOptions      = getValidGroupOptions(teams.length)
  const canGroupStage          = validGroupOptions.length > 0
  const effectiveFormat        = canGroupStage ? formatMode : 'freeplay'
  const selectedGroups         = numGroupsChoice || validGroupOptions[0] || 2

  // ── Group preview — regenerate when step/format/group-count changes ──────
  useEffect(() => {
    if (step === 3 && effectiveFormat === 'group') {
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
    setConfirmedAuto(false)
  }

  const propose = () => {
    const groups = buildTeamGroups(invitedPlayers, params, teamSize)
    setProposedTeams(groups.map((pIds, i) => ({
      id: uid(), name: `Team ${NATO[i] || i + 1}`, players: pIds, wins: 0, losses: 0, points: 0,
    })))
    setTeams([])
    setConfirmedAuto(false)
  }

  const confirmProposed = () => {
    if (!proposedTeams.length) return
    setTeams([...proposedTeams])
    setProposedTeams([])
    setConfirmedAuto(true)
  }

  // ── Manual team creation ──────────────────────────────────────────────────
  const addManualTeam = () =>
    setTeams(prev => [...prev, { id: uid(), name: `Team ${prev.length + 1}`, players: [], wins: 0, losses: 0, points: 0 }])

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
      showError(err, 'Failed to create tournament')
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

  const totalSteps = 4

  return (
    <div className="screen bg-bg text-text">
      <div className="screen__top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate(`/league/${id}`)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface border border-line cursor-pointer text-text flex-shrink-0"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <div className="text-[18px] font-bold leading-tight">New Tournament</div>
            <div className="text-[11px] text-dim">Step {step + 1} of {totalSteps}</div>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="h-1 bg-alt rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-[width] duration-300 ease-in-out"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <main className="screen__body px-4 pb-6">
        {/* ══ Step 0: Settings ═════════════════════════════════════════════════ */}
        {step === 0 && (
          <div className="flex flex-col gap-5 pt-1">
            {/* Name */}
            <div>
              <div className="text-[11px] font-bold text-accent uppercase tracking-widest mb-2">Name</div>
              <div className="bg-surface border border-line rounded-xl px-4 py-3.5">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Spring Cup 2026"
                  className="w-full bg-transparent border-0 outline-none text-[15px] font-semibold text-text placeholder:text-dim"
                />
              </div>
            </div>

            {/* Start date */}
            <div>
              <div className="text-[11px] font-bold text-accent uppercase tracking-widest mb-2">Start date</div>
              <div className="relative">
                <div className="w-full bg-surface border border-line rounded-xl px-4 py-3.5 flex items-center gap-3 pointer-events-none">
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dim flex-shrink-0">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span className="text-[14px] font-semibold text-text">{formatDateDisplay(date)}</span>
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Team size */}
            <div>
              <div className="text-[11px] font-bold text-accent uppercase tracking-widest mb-2">Team size</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 2, title: '2 players', sub: 'Doubles' },
                  { v: 3, title: '3 players', sub: 'Triples' },
                ].map(o => (
                  <button
                    key={o.v}
                    onClick={() => setTeamSize(o.v)}
                    className={`rounded-xl border-2 py-3.5 text-center cursor-pointer transition-colors ${
                      teamSize === o.v
                        ? 'border-accent bg-surface'
                        : 'border-line bg-surface'
                    }`}
                  >
                    <div className={`text-[18px] font-extrabold leading-tight ${teamSize === o.v ? 'text-accent' : 'text-text'}`}>{o.title}</div>
                    <div className="text-[11px] text-dim mt-1">{o.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Match length */}
            <div>
              <div className="text-[11px] font-bold text-accent uppercase tracking-widest mb-2">Match length</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 1, title: '1 set',     sub: 'Quick play' },
                  { v: 3, title: 'Best of 3', sub: 'Standard'   },
                ].map(o => (
                  <button
                    key={o.v}
                    onClick={() => setSetsPerMatch(o.v)}
                    className={`rounded-xl border-2 py-3.5 text-center cursor-pointer transition-colors ${
                      setsPerMatch === o.v
                        ? 'border-accent bg-surface'
                        : 'border-line bg-surface'
                    }`}
                  >
                    <div className={`text-[18px] font-extrabold leading-tight ${setsPerMatch === o.v ? 'text-accent' : 'text-text'}`}>{o.title}</div>
                    <div className="text-[11px] text-dim mt-1">{o.sub}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ══ Step 1: Players ══════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="pt-1">
            {(() => {
              const allPlayerIds = (league.players || []).map(p => p.id)
              const allSelected  = allPlayerIds.length > 0 && pickedPlayers.length === allPlayerIds.length
              return (
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-bold text-accent uppercase tracking-widest">
                    Players ({pickedPlayers.length} selected)
                  </div>
                  <button
                    onClick={() => setPickedPlayers(allSelected ? [] : allPlayerIds)}
                    className="text-[11px] font-semibold text-accent bg-transparent border-0 cursor-pointer"
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
              )
            })()}
            <div className="flex flex-col gap-1.5 mb-4">
              {(league.players || [])
                .slice()
                .sort((a, b) => (a.displayName || a.name || '').localeCompare(b.displayName || b.name || ''))
                .map(player => {
                  const on = pickedPlayers.includes(player.id)
                  return (
                    <button
                      key={player.id}
                      onClick={() => togglePickedPlayer(player.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-[1.5px] bg-surface cursor-pointer text-left transition-colors ${
                        on ? 'border-accent' : 'border-line'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: playerColor(player.name) }}
                      >
                        {playerInitials(player.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-text leading-tight">{player.name}</div>
                        {player.level && (
                          <div className="text-[10px] text-dim mt-0.5">
                            {levelOf(player.level).label}{genderLabel(player.sex || player.gender) ? ` · ${genderLabel(player.sex || player.gender)}` : ''}
                          </div>
                        )}
                      </div>
                      <div className={`w-[22px] h-[22px] rounded-[6px] flex items-center justify-center flex-shrink-0 ${
                        on ? 'bg-accent border-0' : 'bg-transparent border-[1.5px] border-line'
                      }`}>
                        {on && (
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
            </div>
          </div>
        )}

        {/* ══ Step 2: Teams ════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div>
            <div className="text-[16px] font-bold mb-1">Create Teams</div>
            <div className="text-[12px] text-dim mb-4">{invitedPlayers.length} players · {teamSize} per team</div>

            {/* Mode toggle */}
            <div className="flex bg-alt border border-line rounded-xl p-1 mb-4 gap-1">
              {[{ id: 'auto', label: 'Auto generate' }, { id: 'manual', label: 'Manual' }].map(opt => (
                <button key={opt.id} onClick={() => { setTeamMode(opt.id); setProposedTeams([]); setConfirmedAuto(false) }}
                  className={`flex-1 py-2.5 rounded-[10px] text-[13px] font-bold cursor-pointer border-0 transition-all ${
                    teamMode === opt.id
                      ? 'bg-surface text-text shadow-sm'
                      : 'bg-transparent text-dim'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* ── AUTO SECTION ── */}
            {teamMode === 'auto' && (
              <div className="flex flex-col gap-3 mb-4">

                {/* Balance by label */}
                <div className="text-[11px] font-bold text-accent uppercase tracking-widest">
                  Balance by · tap to set priority
                </div>

                {/* Balance buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {[{ id: 'sex', label: 'Sex' }, { id: 'level', label: 'Level' }].map(({ id, label }) => {
                    const idx    = params.indexOf(id)
                    const active = idx !== -1
                    return (
                      <button key={id} onClick={() => toggleParam(id)}
                        className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-[15px] font-bold cursor-pointer transition-all ${
                          active ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface text-text'
                        }`}>
                        {active && (
                          <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center leading-none shrink-0">
                            {idx + 1}
                          </span>
                        )}
                        {label}
                      </button>
                    )
                  })}
                </div>

                {/* Info text */}
                <div className="bg-alt rounded-xl px-3.5 py-3 text-[12px] text-dim leading-relaxed">
                  {paramDescription(params)}
                </div>

                {/* Generate / Regenerate button */}
                {(() => {
                  const leftover     = invitedPlayers.length % teamSize
                  const notEnough    = invitedPlayers.length < teamSize * 2
                  const canGenerate  = !notEnough && leftover === 0
                  return (
                    <>
                      {notEnough && (
                        <div className="text-[12px] text-dim bg-alt rounded-xl px-3.5 py-2.5 leading-relaxed">
                          Need at least <strong>{teamSize * 2}</strong> players for team size <strong>{teamSize}</strong>. Currently invited: <strong>{invitedPlayers.length}</strong>.
                        </div>
                      )}
                      {!notEnough && leftover > 0 && (
                        <div className="text-[12px] bg-error/10 border border-error/40 text-error rounded-xl px-3.5 py-2.5 leading-relaxed">
                          <strong>{invitedPlayers.length} players</strong> don&apos;t divide evenly into teams of <strong>{teamSize}</strong> — <strong>{leftover}</strong> player{leftover > 1 ? 's' : ''} would be left out. Go back and invite <strong>{teamSize - leftover}</strong> more, or remove <strong>{leftover}</strong>.
                        </div>
                      )}
                      {proposedTeams.length === 0 && !confirmedAuto ? (
                        <button onClick={propose} disabled={!canGenerate}
                          className="w-full min-h-[50px] rounded-xl bg-accent text-white font-bold text-[14px] border-0 cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2">
                          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          Generate teams
                        </button>
                      ) : (
                        <button onClick={propose} disabled={!canGenerate}
                          className="w-full min-h-[50px] rounded-xl bg-surface border border-line text-accent font-bold text-[14px] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2">
                          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          Regenerate teams
                        </button>
                      )}
                    </>
                  )
                })()}

                {/* Preview */}
                {(proposedTeams.length > 0 || confirmedAuto) && (() => {
                  const displayTeams = proposedTeams.length > 0 ? proposedTeams : teams
                  return (
                    <>
                      <div className="text-[11px] font-bold text-accent uppercase tracking-widest">
                        Preview · {displayTeams.length} teams
                      </div>
                      <div className="flex flex-col gap-2">
                        {displayTeams.map(tm => (
                          <div key={tm.id} className="bg-accent/10 border border-accent/20 rounded-xl px-3.5 py-3 flex items-center gap-3">
                            <div className="text-[13px] font-bold text-accent leading-snug w-16 flex-shrink-0">
                              {tm.name}
                            </div>
                            <div className="flex flex-wrap gap-1.5 flex-1">
                              {tm.players.map(pid => {
                                const pl = invitedPlayers.find(p => p.id === pid)
                                return pl ? (
                                  <span key={pid} className="flex items-center gap-1.5 bg-surface border border-line rounded-full px-2.5 py-1 text-[11px] font-medium text-text">
                                    <span
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: playerColor(pl.name) }}
                                    />
                                    {shortName(pl.name)}
                                  </span>
                                ) : null
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Confirm / Confirmed button */}
                      {proposedTeams.length > 0 ? (
                        <button onClick={confirmProposed}
                          className="w-full min-h-[50px] rounded-xl bg-accent text-white font-bold text-[14px] border-0 cursor-pointer flex items-center justify-center gap-2">
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Confirm teams
                        </button>
                      ) : (
                        <div className="w-full min-h-[50px] rounded-xl bg-success/10 border border-success/40 text-success font-bold text-[14px] flex items-center justify-center gap-2">
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Teams confirmed
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            {/* ── MANUAL SECTION ── */}
            {teamMode === 'manual' && (
              <div className="flex flex-col gap-3 mb-4">

                {/* Empty state */}
                {teams.length === 0 && (
                  <div className="border border-dashed border-line rounded-xl p-6 text-center text-[13px] text-dim">
                    No teams yet. Tap <strong className="text-text font-bold">Add team</strong> to start building.
                  </div>
                )}

                {/* Team cards */}
                {teams.map((tm, ti) => {
                  const pickerOpen = pickingForTeamId === tm.id
                  return (
                    <div key={tm.id} className="bg-surface border border-line rounded-xl overflow-hidden">

                      {/* Header */}
                      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                        <input
                          value={tm.name}
                          onChange={e => setTeams(prev => prev.map(t => t.id === tm.id ? { ...t, name: e.target.value } : t))}
                          placeholder={`Team ${ti + 1}`}
                          className="flex-1 bg-transparent outline-none text-[15px] font-semibold text-dim border-0 border-b border-dashed border-line pb-0.5"
                        />
                        <span className="text-[12px] font-semibold text-dim flex-shrink-0">{tm.players.length}/{teamSize}</span>
                        <button
                          onClick={() => removeTeam(tm.id)}
                          className="bg-transparent border-0 cursor-pointer text-dim flex-shrink-0 p-0.5"
                        >
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>

                      {/* Player chips */}
                      {tm.players.length > 0 && (
                        <div className="px-4 pb-3 flex flex-wrap gap-2">
                          {tm.players.map(pid => {
                            const pl = invitedPlayers.find(p => p.id === pid)
                            return pl ? (
                              <span key={pid} className="flex items-center gap-1.5 bg-accent/10 rounded-full pl-1 pr-2.5 py-1">
                                <div
                                  className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                  style={{ backgroundColor: playerColor(pl.name) }}
                                >
                                  {playerInitials(pl.name)}
                                </div>
                                <span className="text-[12px] font-medium text-text">{shortName(pl.name)}</span>
                                <button
                                  onClick={() => removePlayerFromTeam(tm.id, pid)}
                                  className="bg-transparent border-0 cursor-pointer text-dim p-0 leading-none"
                                >
                                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                  </svg>
                                </button>
                              </span>
                            ) : null
                          })}
                        </div>
                      )}

                      {/* Add player dashed button */}
                      {tm.players.length < teamSize && !pickerOpen && (
                        <div className="px-4 pb-4">
                          <button
                            onClick={() => setPickingForTeamId(tm.id)}
                            className="w-full border border-dashed border-line rounded-xl py-3 text-[13px] text-dim font-medium flex items-center justify-center gap-1.5 cursor-pointer bg-transparent"
                          >
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Add player
                          </button>
                        </div>
                      )}

                      {/* Inline picker */}
                      {pickerOpen && (
                        <div className="border-t border-line px-4 pt-3.5 pb-2">
                          <div className="text-[10px] font-bold text-dim uppercase tracking-widest mb-3">Select player</div>
                          {(() => {
                            const pool = availablePlayers
                              .filter(p => !tm.players.includes(p.id))
                              .slice()
                              .sort((a, b) => (a.displayName || a.name || '').localeCompare(b.displayName || b.name || ''))
                            if (pool.length === 0) return (
                              <div className="text-[12px] text-dim py-2">All invited players are assigned.</div>
                            )
                            return pool.map(p => (
                              <button
                                key={p.id}
                                onClick={() => assignPlayer(tm.id, p.id)}
                                className="w-full flex items-center gap-3 py-2.5 cursor-pointer bg-transparent border-0 text-left"
                              >
                                <div
                                  className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                                  style={{ backgroundColor: playerColor(p.name) }}
                                >
                                  {playerInitials(p.name)}
                                </div>
                                <div>
                                  <div className="text-[13px] font-semibold text-text">{p.name}</div>
                                  <div className="text-[10px] text-dim">
                                    {levelOf(p.level).label}{genderLabel(p.sex || p.gender) ? ` · ${genderLabel(p.sex || p.gender)}` : ''}
                                  </div>
                                </div>
                              </button>
                            ))
                          })()}
                          <button
                            onClick={() => setPickingForTeamId(null)}
                            className="w-full py-3 text-[12px] text-dim font-semibold text-center cursor-pointer bg-transparent border-0"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Add team button */}
                <button
                  onClick={addManualTeam}
                  className="w-full min-h-[50px] bg-surface border border-line rounded-xl text-[13px] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-text font-medium">+</span>
                  <span className="text-accent font-semibold">Add team</span>
                </button>
              </div>
            )}

          </div>
        )}

        {/* ══ Step 3: Schedule ═════════════════════════════════════════════════ */}
        {step === 3 && (
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
                      <div>{opt.label}</div>
                    </button>
                  )
                })}
              </div>

              {!canGroupStage && (
                <div className="text-[11px] text-dim mt-2">
                  Need at least 6 teams for Group + Knockout. Round-robin is selected automatically.
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

          </div>
        )}
      </main>

      <div className="screen__bottom px-4 py-3.5 border-t border-line bg-surface">
        {step === 0 && (
          <button
            onClick={() => setStep(1)}
            disabled={!name.trim()}
            className="w-full min-h-[50px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50"
          >
            Continue
          </button>
        )}
        {step === 1 && (
          <button
            onClick={() => setStep(2)}
            disabled={pickedPlayers.length < teamSize}
            className="w-full min-h-[50px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50"
          >
            Continue
          </button>
        )}
        {step === 2 && (
          <button
            onClick={() => setStep(3)}
            disabled={!canContinueFromTeams}
            className="w-full min-h-[50px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50"
          >
            Continue
          </button>
        )}
        {step === 3 && (
          <button
            onClick={handleStartTournament}
            disabled={saving}
            className="w-full min-h-[50px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Start Tournament'}
          </button>
        )}
      </div>
    </div>
  )
}
