import { useMemo, useState } from 'react'
import { ListOrdered } from 'lucide-react'
import { AppSheet, PillTabs } from '../../ui-new'
import { getMatchDuration, getLongestRally, formatDuration } from '../../../lib/utils'

const POINT_LABEL = {
  ace: 'Ace', spike: 'Spike', block: 'Block', tip: 'Tip', error: 'Error',
}

const POINT_COLOR = {
  ace:   'text-accent  bg-accent/15',
  spike: 'text-success bg-success/15',
  block: 'text-free    bg-free/15',
  tip:   'text-text    bg-alt',
  error: 'text-error   bg-error/15',
}

const FILTERS = [
  { id: 'all',     label: 'All'        },
  { id: 'mine',    label: 'My points'  },
  { id: 'serves',  label: 'My serves'  },
  { id: 'errors',  label: 'My errors'  },
]

function nameFor(pid, leaguePlayers) {
  if (!pid) return ''
  const p = leaguePlayers?.find(pp => pp.id === pid)
  if (!p) return '?'
  return p.nickname || p.name?.split(' ')[0] || '?'
}

export default function PointDrillSheet({
  open,
  onClose,
  annotated,
  rawTournament,
  leaguePlayers,
}) {
  const [filter, setFilter] = useState('all')

  const match = annotated?.match
  const playerId = annotated?.pid
  const log = useMemo(() => match?.log || [], [match])
  const duration = match ? formatDuration(getMatchDuration(log) || 0) : null
  const rally = match ? formatDuration(getLongestRally(log) || 0) : null

  const filtered = useMemo(() => {
    return log.filter(e => {
      if (!e.team) return false
      if (filter === 'mine')   return e.scoringPlayerId === playerId
      if (filter === 'serves') return e.serverPlayerId === playerId
      if (filter === 'errors') return e.errorPlayerId === playerId
      return true
    })
  }, [log, filter, playerId])

  const opp = annotated ? rawTournament?.teams?.find(t => t.id === annotated.opposingTeamId) : null
  const oppName = opp?.name || 'Opponent'

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={`vs ${oppName}`}
      icon={<div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center"><ListOrdered size={14} className="text-accent" /></div>}
    >
      {match ? (
        <>
          {/* Match header */}
          <div className="bg-bg rounded-xl p-3 mb-3 grid grid-cols-3 gap-2 text-center">
            <Cell label="Score" value={`${match.score1} – ${match.score2}`} />
            <Cell label="Sets" value={(match.sets || []).map(s => `${s.s1}-${s.s2}`).join(' / ') || '-'} />
            <Cell label="Duration" value={duration || '-'} />
          </div>

          <div className="flex items-center gap-2 mb-3 text-[10px] text-dim">
            <span className="uppercase tracking-wide">Longest rally</span>
            <span className="font-bold text-text">{rally || '-'}</span>
          </div>

          {/* Filter pills */}
          <PillTabs
            items={FILTERS}
            active={filter}
            onChange={setFilter}
            accent="accent"
            className="mb-3"
          />

          {filtered.length === 0 ? (
            <div className="text-center text-[12px] text-dim py-6">
              No points match this filter.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {[...filtered].reverse().map((e, i) => {
                const playerActed = e.scoringPlayerId === playerId
                  || e.errorPlayerId === playerId
                  || e.serverPlayerId === playerId
                const ptColor = POINT_COLOR[e.pointType] || POINT_COLOR.tip
                const teamLabel = e.team === annotated.playerTeamNum ? 'My team' : 'Opp.'
                const actorPid = e.pointType === 'error' ? e.errorPlayerId : e.scoringPlayerId
                return (
                  <div
                    key={i}
                    className={`
                      flex items-center gap-2 px-2 py-1.5 rounded-lg
                      ${playerActed ? 'border border-accent/50 bg-accent/5' : 'border border-line'}
                    `}
                  >
                    <span className="text-[10px] text-dim font-mono w-9 flex-shrink-0">
                      {e.t1}-{e.t2}
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-[1px] rounded ${ptColor}`}>
                      {POINT_LABEL[e.pointType] || e.pointType}
                    </span>
                    <span className="text-[11px] text-text flex-1 min-w-0 truncate">
                      {nameFor(actorPid, leaguePlayers) || teamLabel}
                      {e.serverPlayerId && (
                        <span className="text-dim ml-1.5 text-[9px]">
                          serve · {nameFor(e.serverPlayerId, leaguePlayers)}
                        </span>
                      )}
                    </span>
                    <span className="text-[9px] text-dim flex-shrink-0">
                      S{e.setNum || 1}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-[12px] text-dim py-8">No match selected.</div>
      )}
    </AppSheet>
  )
}

function Cell({ label, value }) {
  return (
    <div>
      <div className="text-[9px] text-dim uppercase tracking-wide">{label}</div>
      <div className="font-display text-[16px] text-text leading-none mt-1">{value}</div>
    </div>
  )
}
