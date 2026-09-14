/**
 * LocalTournamentWizard — /local/new
 *
 * Same four steps as the league wizard, with one difference that shapes the
 * whole screen: there is no roster to pick from. Players are typed in here and
 * live inside the tournament, so the flow works with no account and no signal.
 *
 * The draft algorithm is not reimplemented — it is the shared one in
 * lib/teamBuilder, the same code the league wizard runs.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronLeft, X } from 'lucide-react'
import { uid, levelOf, generateRoundRobinSchedule } from '../lib/utils'
import {
  buildTeamGroups, paramDescription, playerColor, playerInitials,
  shortName, genderLabel, getValidGroupOptions, buildPreviewGroups,
} from '../lib/teamBuilder'
import { createLocalTournament } from '../services/localTournamentService'
import { isLocalStoreAvailable } from '../lib/localStore'
import AddPlayerSheet from '../components/AddPlayerSheet'
import ScoringLevelSelect from '../components/ScoringLevelSelect'
import { useToast } from '../contexts/ToastContext'

const FORMAT_OPTIONS = [
  { id: 'group',    label: 'Group + Knockout' },
  { id: 'freeplay', label: 'Round-robin'      },
]

const TOTAL_STEPS = 4

export default function LocalTournamentWizard() {
  const navigate = useNavigate()
  const { showError } = useToast()

  const [step,   setStep]   = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 0
  const [name,         setName]         = useState('')
  const [date,         setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [teamSize,     setTeamSize]     = useState(2)
  const [setsPerMatch, setSetsPerMatch] = useState(1)
  const [scoringLevel, setScoringLevel] = useState(3)
  const [players,      setPlayers]      = useState([])
  const [showAddPlayer, setShowAddPlayer] = useState(false)

  // Step 1
  const [teams,         setTeams]         = useState([])
  const [teamMode,      setTeamMode]      = useState('auto')
  const [params,        setParams]        = useState([])
  const [proposedTeams, setProposedTeams] = useState([])
  const [pickingForTeamId, setPickingForTeamId] = useState(null)

  // Step 2/3
  const [formatMode,      setFormatMode]      = useState('group')
  const [numGroupsChoice, setNumGroupsChoice] = useState(null)
  const [previewGroups,   setPreviewGroups]   = useState([])
  const [selectedTeamId,  setSelectedTeamId]  = useState(null)

  const availablePlayers = useMemo(
    () => players.filter(p => !teams.some(tm => tm.players.includes(p.id))),
    [players, teams]
  )

  const validGroupOptions = getValidGroupOptions(teams.length)
  const canGroupStage     = validGroupOptions.length > 0
  const effectiveFormat   = canGroupStage ? formatMode : 'freeplay'
  const selectedGroups    = numGroupsChoice || validGroupOptions[0] || 2

  const playerName = pid => players.find(p => p.id === pid)?.name || '?'

  // ── Players ──────────────────────────────────────────────────────────────
  const addPlayer = ({ name: pName, level, sex }) => {
    setPlayers(prev => [...prev, { id: uid(), name: pName, level, sex }])
  }

  const removePlayer = (pid) => {
    setPlayers(prev => prev.filter(p => p.id !== pid))
    setTeams(prev => prev.map(t => ({ ...t, players: t.players.filter(x => x !== pid) })))
    setProposedTeams([])
  }

  // ── Teams ────────────────────────────────────────────────────────────────
  const toggleParam = p => {
    setParams(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
    setProposedTeams([])
  }

  const propose = () => {
    const groups = buildTeamGroups(players, params, teamSize)
    setProposedTeams(groups.map((pIds, i) => ({
      id: uid(), name: `Team ${i + 1}`, players: pIds,
    })))
    setTeams([])
  }

  const confirmProposed = () => {
    if (!proposedTeams.length) return
    setTeams([...proposedTeams])
    setProposedTeams([])
  }

  const addManualTeam = () =>
    setTeams(prev => [...prev, { id: uid(), name: `Team ${prev.length + 1}`, players: [] }])

  const assignPlayer = (teamId, pid) => {
    setTeams(prev => prev.map(t =>
      t.id !== teamId ? t : t.players.length < teamSize ? { ...t, players: [...t.players, pid] } : t
    ))
    setPickingForTeamId(null)
  }

  const removePlayerFromTeam = (teamId, pid) =>
    setTeams(prev => prev.map(t =>
      t.id !== teamId ? t : { ...t, players: t.players.filter(x => x !== pid) }
    ))

  const removeTeam = teamId => setTeams(prev => prev.filter(t => t.id !== teamId))

  // ── Groups ───────────────────────────────────────────────────────────────
  const goToGroups = () => {
    if (effectiveFormat === 'group') {
      setPreviewGroups(buildPreviewGroups(teams, selectedGroups))
      setSelectedTeamId(null)
    }
    setStep(3)
  }

  const handleGroupCountChange = (n) => {
    setNumGroupsChoice(n)
    setPreviewGroups(buildPreviewGroups(teams, n))
    setSelectedTeamId(null)
  }

  const handleGroupTap = groupId => {
    if (!selectedTeamId) return
    setPreviewGroups(prev => prev.map(g => ({
      ...g,
      teamIds: g.id === groupId
        ? g.teamIds.includes(selectedTeamId) ? g.teamIds : [...g.teamIds, selectedTeamId]
        : g.teamIds.filter(x => x !== selectedTeamId),
    })))
    setSelectedTeamId(null)
  }

  // ── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (teams.length < 2 || saving) return
    setSaving(true)
    try {
      let groups = []
      let matches = []

      if (effectiveFormat === 'group') {
        groups = previewGroups.map(g => ({
          ...g,
          matches: generateRoundRobinSchedule(g.teamIds, `gm_${g.id}_`),
        }))
      } else {
        matches = generateRoundRobinSchedule(teams.map(t => t.id), 'fp_')
      }

      const tournament = await createLocalTournament({
        name: name.trim() || 'Local tournament',
        date, teamSize, setsPerMatch, scoringLevel,
        players, teams, groups, matches,
      })

      navigate(`/local/${tournament.id}`, { replace: true })
    } catch (err) {
      showError(err, 'Could not save the tournament on this device')
      setSaving(false)
    }
  }

  if (!isLocalStoreAvailable()) {
    return (
      <div className="screen bg-bg text-text flex flex-col items-center justify-center p-6 text-center gap-2">
        <div className="text-[18px] font-bold">Not available here</div>
        <div className="text-[13px] text-dim max-w-[300px]">
          This browser has no local storage, so the tournament could not be saved.
        </div>
      </div>
    )
  }

  const canContinue =
    step === 0 ? players.length >= 4 && !!name.trim() :
    step === 1 ? teams.length >= 2 :
    true

  return (
    <div className="screen bg-bg text-text">
      {/* ── Header ── */}
      <div className="screen__top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate('/local')}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface border border-line cursor-pointer text-text flex-shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold leading-tight">New local tournament</div>
            <div className="text-[11px] text-dim">Step {step + 1} of {TOTAL_STEPS}</div>
          </div>
        </div>
        <div className="h-1 bg-alt mx-4 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <main className="screen__body">
        <div className="px-4 py-5 max-w-[430px] mx-auto w-full flex flex-col gap-5">

          {/* ── Step 0 — basics + players ── */}
          {step === 0 && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="lt-name" className="text-[11px] font-bold text-dim uppercase tracking-wide">Name</label>
                <input
                  id="lt-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Saturday at the beach"
                  className="w-full px-4 py-3 bg-surface border border-line rounded-xl text-[14px] text-text outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="lt-date" className="text-[11px] font-bold text-dim uppercase tracking-wide">Date</label>
                <input
                  id="lt-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-line rounded-xl text-[14px] text-text outline-none focus:border-accent"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-dim uppercase tracking-wide">Team size</span>
                  <div className="flex gap-2">
                    {[2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => { setTeamSize(n); setTeams([]); setProposedTeams([]) }}
                        className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold ${teamSize === n ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface text-dim'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-dim uppercase tracking-wide">Sets</span>
                  <div className="flex gap-2">
                    {[1, 3].map(n => (
                      <button
                        key={n}
                        onClick={() => setSetsPerMatch(n)}
                        className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold ${setsPerMatch === n ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface text-dim'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-dim uppercase tracking-wide">Scoring detail</span>
                <ScoringLevelSelect value={scoringLevel} onChange={setScoringLevel} />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-dim uppercase tracking-wide">
                    Players ({players.length})
                  </span>
                  <button
                    onClick={() => setShowAddPlayer(true)}
                    className="inline-flex items-center gap-1 text-[12px] font-bold text-accent bg-transparent border-0 cursor-pointer p-0"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {players.length === 0 ? (
                  <div className="text-[12px] text-dim text-center py-6 bg-surface border border-line rounded-xl">
                    Add at least 4 players to build teams.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {players.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface border border-line rounded-xl">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                          style={{ backgroundColor: playerColor(p.name) }}
                        >
                          {playerInitials(p.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold text-text truncate">{p.name}</div>
                          <div className="text-[11px] text-dim">
                            {levelOf(p.level).label}{genderLabel(p.sex) ? ` · ${genderLabel(p.sex)}` : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => removePlayer(p.id)}
                          aria-label={`Remove ${p.name}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent border-0 text-dim cursor-pointer shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Step 1 — teams ── */}
          {step === 1 && (
            <>
              <div className="flex gap-2">
                {['auto', 'manual'].map(m => (
                  <button
                    key={m}
                    onClick={() => { setTeamMode(m); setTeams([]); setProposedTeams([]) }}
                    className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold capitalize ${teamMode === m ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface text-dim'}`}
                  >
                    {m === 'auto' ? 'Auto-generate' : 'Manual'}
                  </button>
                ))}
              </div>

              {teamMode === 'auto' && (
                <>
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-dim uppercase tracking-wide">Balance by</span>
                    <div className="flex gap-2">
                      {[{ k: 'sex', l: 'Sex' }, { k: 'level', l: 'Level' }].map(({ k, l }) => (
                        <button
                          key={k}
                          onClick={() => toggleParam(k)}
                          className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold ${params.includes(k) ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface text-dim'}`}
                        >
                          {l}{params.indexOf(k) === 0 && params.length > 1 ? ' (1st)' : ''}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-dim leading-snug">{paramDescription(params)}</div>
                  </div>

                  <button
                    onClick={propose}
                    className="w-full py-3 rounded-xl bg-alt border border-line text-[13px] font-bold text-text cursor-pointer"
                  >
                    {proposedTeams.length ? 'Regenerate' : 'Generate teams'}
                  </button>

                  {proposedTeams.length > 0 && (
                    <>
                      <div className="flex flex-col gap-2">
                        {proposedTeams.map(t => (
                          <div key={t.id} className="px-3 py-2.5 bg-surface border border-line rounded-xl">
                            <div className="text-[13px] font-bold text-text">{t.name}</div>
                            <div className="text-[11px] text-dim mt-0.5">
                              {t.players.map(pid => shortName(playerName(pid))).join(' · ')}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={confirmProposed}
                        className="w-full py-3 rounded-xl bg-accent text-white text-[13px] font-bold border-0 cursor-pointer"
                      >
                        Use these teams
                      </button>
                    </>
                  )}
                </>
              )}

              {teamMode === 'manual' && (
                <button
                  onClick={addManualTeam}
                  className="w-full py-3 rounded-xl bg-alt border border-line text-[13px] font-bold text-text cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add team
                </button>
              )}

              {teams.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-dim uppercase tracking-wide">
                    Teams ({teams.length})
                  </span>
                  {teams.map(t => (
                    <div key={t.id} className="px-3 py-2.5 bg-surface border border-line rounded-xl">
                      <div className="flex items-center gap-2">
                        <input
                          value={t.name}
                          onChange={e => setTeams(prev => prev.map(x => x.id === t.id ? { ...x, name: e.target.value } : x))}
                          aria-label="Team name"
                          className="flex-1 min-w-0 bg-transparent border-0 text-[13px] font-bold text-text outline-none p-0"
                        />
                        <button
                          onClick={() => removeTeam(t.id)}
                          aria-label={`Remove ${t.name}`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent border-0 text-dim cursor-pointer shrink-0"
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {t.players.map(pid => (
                          <button
                            key={pid}
                            onClick={() => removePlayerFromTeam(t.id, pid)}
                            className="px-2 py-1 rounded-lg bg-alt border border-line text-[11px] font-semibold text-text cursor-pointer"
                          >
                            {shortName(playerName(pid))} ×
                          </button>
                        ))}
                        {t.players.length < teamSize && (
                          <button
                            onClick={() => setPickingForTeamId(pickingForTeamId === t.id ? null : t.id)}
                            className="px-2 py-1 rounded-lg border border-dashed border-line text-[11px] font-semibold text-dim bg-transparent cursor-pointer"
                          >
                            + Player
                          </button>
                        )}
                      </div>
                      {pickingForTeamId === t.id && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-line">
                          {availablePlayers.length === 0 ? (
                            <span className="text-[11px] text-dim">No players left</span>
                          ) : availablePlayers.map(p => (
                            <button
                              key={p.id}
                              onClick={() => assignPlayer(t.id, p.id)}
                              className="px-2 py-1 rounded-lg bg-accent/10 border border-accent/30 text-[11px] font-semibold text-accent cursor-pointer"
                            >
                              {shortName(p.name)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Step 2 — format ── */}
          {step === 2 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-dim uppercase tracking-wide">Format</span>
              {FORMAT_OPTIONS.map(f => {
                const disabled = f.id === 'group' && !canGroupStage
                return (
                  <button
                    key={f.id}
                    disabled={disabled}
                    onClick={() => setFormatMode(f.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 ${
                      effectiveFormat === f.id ? 'border-accent bg-accent/10' : 'border-line bg-surface'
                    } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className={`text-[13px] font-bold ${effectiveFormat === f.id ? 'text-accent' : 'text-text'}`}>
                      {f.label}
                    </div>
                    {disabled && (
                      <div className="text-[11px] text-dim mt-0.5">
                        Needs at least 6 teams for groups of 3
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Step 3 — groups / review ── */}
          {step === 3 && (
            <>
              {effectiveFormat === 'group' ? (
                <>
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-dim uppercase tracking-wide">Number of groups</span>
                    <div className="flex gap-2">
                      {validGroupOptions.map(n => (
                        <button
                          key={n}
                          onClick={() => handleGroupCountChange(n)}
                          className={`flex-1 py-3 rounded-xl border-2 text-[13px] font-bold ${selectedGroups === n ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface text-dim'}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-dim">
                      Tap a team, then tap a group to move it.
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {previewGroups.map(g => (
                      <button
                        key={g.id}
                        onClick={() => handleGroupTap(g.id)}
                        className="w-full text-left px-3 py-3 bg-surface border border-line rounded-xl cursor-pointer"
                      >
                        <div className="text-[12px] font-bold text-accent mb-2">{g.name}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {g.teamIds.map(tid2 => {
                            const t = teams.find(x => x.id === tid2)
                            if (!t) return null
                            return (
                              <span
                                key={tid2}
                                onClick={e => { e.stopPropagation(); setSelectedTeamId(selectedTeamId === tid2 ? null : tid2) }}
                                className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                                  selectedTeamId === tid2
                                    ? 'bg-accent text-white'
                                    : 'bg-alt border border-line text-text'
                                }`}
                              >
                                {t.name}
                              </span>
                            )
                          })}
                          {g.teamIds.length === 0 && (
                            <span className="text-[11px] text-dim">Empty</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="px-4 py-3 bg-surface border border-line rounded-xl text-[12px] text-dim leading-snug">
                  Every team plays every other team once. Final standings decide
                  the winner.
                </div>
              )}

              <div className="px-4 py-3 bg-accent/10 border border-accent/30 rounded-xl text-[11px] text-dim leading-snug">
                This tournament is saved on this phone only. It will not sync,
                count towards Elo, or appear in any league.
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <div className="px-4 py-3 border-t border-line bg-bg">
        <div className="max-w-[430px] mx-auto w-full">
          {step < 3 ? (
            <button
              onClick={() => step === 2 ? goToGroups() : setStep(step + 1)}
              disabled={!canContinue}
              className="w-full py-4 rounded-xl bg-accent text-white font-black text-[15px] uppercase tracking-widest border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={saving || teams.length < 2}
              className="w-full py-4 rounded-xl bg-accent text-white font-black text-[15px] uppercase tracking-widest border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating…' : 'Create tournament'}
            </button>
          )}
        </div>
      </div>

      <AddPlayerSheet
        open={showAddPlayer}
        onClose={() => setShowAddPlayer(false)}
        onAdd={addPlayer}
      />
    </div>
  )
}
