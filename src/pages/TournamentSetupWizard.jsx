import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { uid, now, levelOf } from '../lib/utils'

const STEPS = ['Players', 'Teams', 'Schedule']

const AUTO_OPTIONS = [
  { id: 'random', title: 'Random', subtitle: 'Random distribution', emoji: '🎲' },
  { id: 'balanced', title: 'By level', subtitle: 'Balanced teams', emoji: '⚖️' },
]

const FORMAT_OPTIONS = [
  { id: 'group', label: 'Group + Knockout', emoji: '🏆' },
  { id: 'freeplay', label: 'Free Play', emoji: '🎮' },
]

const levelScore = { beginner: 1, intermediate: 2, advanced: 3 }

function Stepper({ step }) {
  return (
    <div className="px-4 mb-4">
      <div className="flex items-center">
        {STEPS.map((label, idx) => {
          const done = idx < step
          const active = idx === step
          return (
            <div key={label} className="flex items-center flex-1">
              <div className="flex items-center gap-1.5 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    done
                      ? 'bg-success text-white'
                      : active
                      ? 'bg-accent text-white'
                      : 'bg-alt text-dim'
                  }`}
                >
                  {done ? '✓' : idx + 1}
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    active ? 'text-accent' : done ? 'text-success' : 'text-dim'
                  }`}
                >
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

function makeRoundRobinMatches(teamIds) {
  const matches = []
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({
        id: uid(),
        team1: teamIds[i],
        team2: teamIds[j],
        played: false,
        winner: null,
        score1: 0,
        score2: 0,
      })
    }
  }
  return matches
}

export default function TournamentSetupWizard() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [leagues, setLeagues] = useLocalStorage('arenix_leagues', [])
  const league = leagues.find(l => l.id === id) || leagues[0] || null

  const [step, setStep] = useState(0)
  const [tournamentId, setTournamentId] = useState(null)

  const [name, setName] = useState('')
  const [date, setDate] = useState(now())
  const [teamSize, setTeamSize] = useState(2)
  const [setsPerMatch, setSetsPerMatch] = useState(1)

  const [pickedPlayers, setPickedPlayers] = useState([])

  const [teamMode, setTeamMode] = useState('auto')
  const [autoMethod, setAutoMethod] = useState('random')
  const [proposedTeams, setProposedTeams] = useState([])

  const [manualTeamName, setManualTeamName] = useState('')
  const [manualPicked, setManualPicked] = useState([])

  const [formatMode, setFormatMode] = useState('group')
  const [numGroupsChoice, setNumGroupsChoice] = useState(null)

  const tournament = useMemo(() => {
    if (!league || !tournamentId) return null
    return league.tournaments?.find(t => t.id === tournamentId) || null
  }, [league, tournamentId])

  const invitedPlayers = useMemo(() => {
    const ids = tournament?.invitedPlayers || pickedPlayers
    return (league?.players || []).filter(p => ids.includes(p.id))
  }, [league?.players, pickedPlayers, tournament?.invitedPlayers])

  const teams = useMemo(() => tournament?.teams || [], [tournament?.teams])

  const availablePlayers = useMemo(
    () => invitedPlayers.filter(p => !teams.some(tm => tm.players.includes(p.id))),
    [invitedPlayers, teams]
  )

  const canContinueFromPlayers = name.trim() && pickedPlayers.length >= teamSize
  const canContinueFromTeams = teams.length >= 2
  const validGroupOptions = getValidGroupOptions(teams.length)
  const canGroupStage = validGroupOptions.length > 0
  const effectiveFormat = canGroupStage ? formatMode : 'freeplay'
  const selectedGroups = numGroupsChoice || validGroupOptions[0] || 2

  const updateTournament = updater => {
    if (!league || !tournamentId) return
    setLeagues(prev =>
      prev.map(l => {
        if (l.id !== league.id) return l
        return {
          ...l,
          tournaments: (l.tournaments || []).map(t =>
            t.id !== tournamentId ? t : updater(t)
          ),
        }
      })
    )
  }

  const createTournament = () => {
    if (!league || !canContinueFromPlayers) return
    const newId = uid()
    const newTournament = {
      id: newId,
      name: name.trim(),
      date,
      teamSize,
      setsPerMatch,
      phase: 'setup',
      status: 'active',
      invitedPlayers: pickedPlayers,
      teams: [],
      groups: [],
      knockout: null,
      matches: [],
      winner: null,
    }

    setLeagues(prev =>
      prev.map(l =>
        l.id !== league.id
          ? l
          : { ...l, tournaments: [...(l.tournaments || []), newTournament] }
      )
    )

    setTournamentId(newId)
    setStep(1)
  }

  const togglePickedPlayer = pid => {
    setPickedPlayers(prev =>
      prev.includes(pid) ? prev.filter(idv => idv !== pid) : [...prev, pid]
    )
  }

  const generateRandom = () => {
    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5)
    const next = []
    for (let i = 0; i < shuffled.length; i += teamSize) {
      const chunk = shuffled.slice(i, i + teamSize)
      if (chunk.length === teamSize) {
        next.push({
          id: uid(),
          name: `Team ${teams.length + next.length + 1}`,
          players: chunk.map(p => p.id),
          wins: 0,
          losses: 0,
          points: 0,
        })
      }
    }
    setProposedTeams(next)
  }

  const generateBalanced = () => {
    const sorted = [...availablePlayers].sort(
      (a, b) => (levelScore[b.level] || 1) - (levelScore[a.level] || 1)
    )
    const numberOfTeams = Math.floor(sorted.length / teamSize)
    const slots = Array.from({ length: numberOfTeams }, () => [])
    sorted.forEach((player, idx) => {
      if (!slots.length) return
      const row = Math.floor(idx / numberOfTeams)
      const col = row % 2 === 0 ? idx % numberOfTeams : numberOfTeams - 1 - (idx % numberOfTeams)
      if (slots[col] && slots[col].length < teamSize) slots[col].push(player.id)
    })

    const next = slots
      .filter(group => group.length === teamSize)
      .map((playerIds, idx) => ({
        id: uid(),
        name: `Team ${teams.length + idx + 1}`,
        players: playerIds,
        wins: 0,
        losses: 0,
        points: 0,
      }))
    setProposedTeams(next)
  }

  const generateAutoTeams = () => {
    if (autoMethod === 'balanced') generateBalanced()
    else generateRandom()
  }

  const confirmProposedTeams = () => {
    if (!proposedTeams.length) return
    updateTournament(t => ({
      ...t,
      teams: [...t.teams, ...proposedTeams],
    }))
    setProposedTeams([])
  }

  const toggleManualPicked = pid => {
    setManualPicked(prev =>
      prev.includes(pid)
        ? prev.filter(x => x !== pid)
        : prev.length < teamSize
        ? [...prev, pid]
        : prev
    )
  }

  const addManualTeam = () => {
    if (!manualTeamName.trim() || manualPicked.length !== teamSize) return
    updateTournament(t => ({
      ...t,
      teams: [
        ...t.teams,
        {
          id: uid(),
          name: manualTeamName.trim(),
          players: manualPicked,
          wins: 0,
          losses: 0,
          points: 0,
        },
      ],
    }))
    setManualTeamName('')
    setManualPicked([])
  }

  const removeTeam = teamId => {
    updateTournament(t => ({
      ...t,
      teams: t.teams.filter(tm => tm.id !== teamId),
    }))
  }

  const generateScheduleAndStart = () => {
    if (!tournament || teams.length < 2) return

    if (effectiveFormat === 'group') {
      const groups = Array.from({ length: selectedGroups }, (_, i) => ({
        id: `g${i}`,
        name: `Group ${String.fromCharCode(65 + i)}`,
        teamIds: [],
        matches: [],
      }))

      teams.forEach((tm, idx) => {
        groups[idx % selectedGroups].teamIds.push(tm.id)
      })

      groups.forEach(group => {
        const ids = group.teamIds
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            group.matches.push({
              id: `gm_${group.id}_${i}_${j}`,
              team1: ids[i],
              team2: ids[j],
              played: false,
              winner: null,
              score1: 0,
              score2: 0,
            })
          }
        }
      })

      updateTournament(t => ({
        ...t,
        groups,
        knockout: null,
        matches: [],
        phase: 'group',
      }))
    } else {
      const matches = makeRoundRobinMatches(teams.map(t => t.id))
      updateTournament(t => ({
        ...t,
        groups: [],
        knockout: null,
        matches,
        phase: 'freeplay',
      }))
    }

    navigate(`/league/${league.id}/tournament/${tournament.id}`)
  }

  if (!league) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        League not found
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0">
        <button
          onClick={() => navigate(`/league/${league.id}`)}
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
        {step === 0 && (
          <div>
            <div className="text-[16px] font-bold mb-1">Invite Players</div>
            <div className="text-[12px] text-dim mb-4">Select players and tournament setup</div>

            <div className="bg-surface rounded-xl border border-line p-3.5 mb-3.5">
              <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">Tournament Info</div>
              <div className="flex flex-col gap-2.5">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tournament name"
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-[14px] text-text bg-bg outline-none focus:border-accent"
                />
                <input
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  placeholder="Date"
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-[14px] text-text bg-bg outline-none focus:border-accent"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-bg border border-line rounded-lg p-2.5">
                    <div className="text-[10px] text-dim uppercase font-bold mb-1">Players/Team</div>
                    <div className="flex gap-1.5">
                      {[2, 3].map(n => (
                        <button
                          key={n}
                          onClick={() => setTeamSize(n)}
                          className={`flex-1 py-1.5 text-[12px] rounded-md border cursor-pointer ${
                            teamSize === n
                              ? 'border-accent bg-accent/10 text-accent font-bold'
                              : 'border-line bg-surface text-text'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-bg border border-line rounded-lg p-2.5">
                    <div className="text-[10px] text-dim uppercase font-bold mb-1">Sets/Match</div>
                    <div className="flex gap-1.5">
                      {[1, 3, 5].map(n => (
                        <button
                          key={n}
                          onClick={() => setSetsPerMatch(n)}
                          className={`flex-1 py-1.5 text-[12px] rounded-md border cursor-pointer ${
                            setsPerMatch === n
                              ? 'border-accent bg-accent/10 text-accent font-bold'
                              : 'border-line bg-surface text-text'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">
              Selected ({pickedPlayers.length})
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3.5">
              {pickedPlayers.map(pid => {
                const pl = league.players.find(p => p.id === pid)
                if (!pl) return null
                return (
                  <button
                    key={pid}
                    onClick={() => togglePickedPlayer(pid)}
                    className="text-[11px] bg-accent/15 text-accent rounded-md px-2 py-1 border-0 cursor-pointer"
                  >
                    {pl.name} ✕
                  </button>
                )
              })}
            </div>

            <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">League Players</div>
            <div className="flex flex-col gap-2">
              {league.players.map(player => {
                const active = pickedPlayers.includes(player.id)
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePickedPlayer(player.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-accent/10 border-accent/40'
                        : 'bg-surface border-line'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-text">{player.name}</span>
                      <span className="text-[11px] text-dim">{levelOf(player.level).label}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={createTournament}
              disabled={!canContinueFromPlayers}
              className="w-full mt-4 min-h-[44px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50"
            >
              Next: Create Teams
            </button>
          </div>
        )}

        {step === 1 && tournament && (
          <div>
            <div className="text-[16px] font-bold mb-1">Create Teams</div>
            <div className="text-[12px] text-dim mb-4">{invitedPlayers.length} players invited</div>

            <div className="flex bg-alt rounded-[10px] p-[3px] mb-3.5">
              {[
                { id: 'auto', label: 'Auto Generate', emoji: '🔀' },
                { id: 'manual', label: 'Manual', emoji: '✏️' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTeamMode(opt.id)
                    setProposedTeams([])
                  }}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-semibold cursor-pointer border-0 ${
                    teamMode === opt.id
                      ? 'bg-surface text-accent shadow-sm'
                      : 'bg-transparent text-dim'
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>

            {teamMode === 'auto' && (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3.5">
                  {AUTO_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setAutoMethod(option.id)}
                      className={`p-3 rounded-xl border-2 text-left cursor-pointer ${
                        autoMethod === option.id
                          ? 'border-accent bg-accent/10'
                          : 'border-line bg-surface'
                      }`}
                    >
                      <div className="text-[22px] mb-1">{option.emoji}</div>
                      <div className={`text-[13px] font-bold ${autoMethod === option.id ? 'text-accent' : 'text-text'}`}>
                        {option.title}
                      </div>
                      <div className="text-[11px] text-dim">{option.subtitle}</div>
                    </button>
                  ))}
                </div>

                <div className="bg-accent/10 border border-accent/30 rounded-lg px-3 py-2.5 text-[12px] text-accent mb-3.5">
                  {autoMethod === 'random'
                    ? 'Teams are generated randomly. Use regenerate to shuffle.'
                    : 'Teams are generated by player level balance.'}
                </div>

                <button
                  onClick={generateAutoTeams}
                  disabled={availablePlayers.length < teamSize}
                  className="w-full min-h-[42px] rounded-lg border border-accent/40 text-accent font-semibold bg-transparent cursor-pointer disabled:opacity-50 mb-3.5"
                >
                  🔄 {proposedTeams.length ? 'Regenerate' : autoMethod === 'random' ? 'Generate Random Teams' : 'Generate by Level'}
                </button>

                {proposedTeams.length > 0 && (
                  <div className="mb-3.5">
                    <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">Generated teams</div>
                    <div className="flex flex-col gap-2">
                      {proposedTeams.map(tm => (
                        <div key={tm.id} className="bg-surface border border-line rounded-xl p-3">
                          <div className="text-[13px] font-bold text-text mb-1">{tm.name}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {tm.players.map(pid => {
                              const pl = invitedPlayers.find(p => p.id === pid)
                              return pl ? (
                                <span key={pid} className="text-[11px] bg-accent/15 text-accent rounded-md px-2 py-1">
                                  {pl.name}
                                </span>
                              ) : null
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={confirmProposedTeams}
                      className="w-full mt-3 min-h-[42px] rounded-lg text-[13px] font-bold bg-accent text-white border-0 cursor-pointer"
                    >
                      ✓ Confirm Generated Teams
                    </button>
                  </div>
                )}
              </>
            )}

            {teamMode === 'manual' && (
              <div className="mb-3.5">
                <div className="bg-surface border border-line rounded-xl p-3 mb-3">
                  <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">Create team manually</div>
                  <input
                    value={manualTeamName}
                    onChange={e => setManualTeamName(e.target.value)}
                    placeholder="Team name"
                    className="w-full border border-line rounded-lg px-3 py-2 text-[13px] bg-bg text-text outline-none focus:border-accent mb-2"
                  />
                  <div className="text-[11px] text-dim mb-2">Pick {teamSize} players ({manualPicked.length}/{teamSize})</div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {availablePlayers.map(player => {
                      const active = manualPicked.includes(player.id)
                      return (
                        <button
                          key={player.id}
                          onClick={() => toggleManualPicked(player.id)}
                          className={`text-[11px] rounded-md px-2 py-1 cursor-pointer border ${
                            active
                              ? 'bg-accent/15 text-accent border-accent/40'
                              : 'bg-alt text-text border-line'
                          }`}
                        >
                          {player.name}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={addManualTeam}
                    disabled={!manualTeamName.trim() || manualPicked.length !== teamSize}
                    className="w-full min-h-[42px] rounded-lg text-[13px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50"
                  >
                    + Add Team
                  </button>
                </div>
              </div>
            )}

            <div className="mb-3.5">
              <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">Current teams ({teams.length})</div>
              {teams.length === 0 ? (
                <div className="text-[12px] text-dim bg-surface border border-line rounded-xl p-3 text-center">
                  No teams yet
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {teams.map(team => (
                    <div key={team.id} className="bg-surface border border-line rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="text-[13px] font-bold text-text">{team.name}</div>
                        <button
                          onClick={() => removeTeam(team.id)}
                          className="text-[11px] text-error bg-transparent border-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {team.players.map(pid => {
                          const pl = invitedPlayers.find(p => p.id === pid)
                          return pl ? (
                            <span key={pid} className="text-[11px] bg-alt text-text rounded-md px-2 py-1">
                              {pl.name}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStep(0)}
                className="min-h-[42px] rounded-lg text-[13px] font-semibold text-text border border-line bg-surface cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canContinueFromTeams}
                className="min-h-[42px] rounded-lg text-[13px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50"
              >
                Next: Schedule
              </button>
            </div>
          </div>
        )}

        {step === 2 && tournament && (
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
                    <button
                      key={opt.id}
                      onClick={() => !disabled && setFormatMode(opt.id)}
                      disabled={disabled}
                      className={`px-3 py-2.5 rounded-lg border-2 text-[12px] text-left cursor-pointer disabled:opacity-50 ${
                        effectiveFormat === opt.id
                          ? 'border-accent bg-accent/10 text-accent font-bold'
                          : 'border-line bg-bg text-text'
                      }`}
                    >
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
                      <button
                        key={n}
                        onClick={() => setNumGroupsChoice(n)}
                        className={`px-2.5 py-1.5 rounded-md text-[12px] border cursor-pointer ${
                          selectedGroups === n
                            ? 'border-accent bg-accent/10 text-accent font-bold'
                            : 'border-line bg-bg text-text'
                        }`}
                      >
                        {n} groups
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStep(1)}
                className="min-h-[42px] rounded-lg text-[13px] font-semibold text-text border border-line bg-surface cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={generateScheduleAndStart}
                className="min-h-[42px] rounded-lg text-[13px] font-bold bg-accent text-white border-0 cursor-pointer"
              >
                Start Tournament
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
