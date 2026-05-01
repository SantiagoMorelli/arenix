import { useState } from 'react'
import { teamName, roundLabel } from '../../lib/tournament'

export default function MatchesTab({ tournament, onStartMatch, onMatchClick, canScore, players = [], initialSubTab }) {
  const { groups = [], knockout = null, phase } = tournament
  const hasGroups = groups.length > 0
  const isFreePlay = !hasGroups

  const groupTabs = hasGroups ? groups.map(g => ({ id: `g_${g.id}`, label: g.name })) : []
  const koTab = knockout ? [{ id: 'knockout', label: 'Knockout' }] : []
  const allTabs = [...groupTabs, ...koTab]

  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (isFreePlay) return 'all'
    if (initialSubTab && allTabs.some(t => t.id === initialSubTab)) return initialSubTab
    if ((phase === 'knockout' || phase === 'completed') && knockout) return 'knockout'
    return allTabs[0]?.id || 'all'
  })

  const tName = id => teamName(tournament.teams, id)
  const playerNames = id => {
    const t = tournament.teams.find(x => x.id === id)
    return (t?.players || []).map(pid => {
      const p = players.find(x => x.id === pid)
      return p ? (p.displayName || p.nickname || p.name) : 'Unknown'
    }).join(' · ')
  }

  let matchesToDisplay = []
  let displayTitle = ''

  if (isFreePlay) {
    matchesToDisplay = (tournament.matches || []).map((m, i) => ({ ...m, label: `Match ${i + 1}` }))
    displayTitle = 'Free Play Matches'
  } else if (activeSubTab === 'knockout') {
    matchesToDisplay = (knockout?.rounds || []).flatMap(r =>
      r.matches.map(m => ({ ...m, label: roundLabel(r.id) }))
    )
    displayTitle = 'Knockout Matches'
  } else {
    const groupId = activeSubTab.replace('g_', '')
    const group = groups.find(g => g.id === groupId)
    matchesToDisplay = group ? group.matches.map(m => ({ ...m, label: group.name })) : []
    displayTitle = group ? `${group.name} (Matches)` : ''
  }

  const pending   = matchesToDisplay.filter(m => !m.played && m.team1 && m.team2)
  const completed = matchesToDisplay.filter(m => m.played)

  return (
    <div className="px-4">
      {hasGroups && allTabs.length > 1 && (
        <div className="mb-4 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex gap-2 min-w-max">
            {allTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`
                  px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer transition-all border-2
                  ${activeSubTab === tab.id
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-surface border-line text-dim'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {displayTitle && (
        <div className="font-display text-[22px] text-accent tracking-[2px] mb-4">
          {displayTitle}
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">
            Pending ({pending.length})
          </div>
          {pending.map(m => (
            <div
              key={m.id}
              className="bg-gradient-to-r from-surface to-alt rounded-xl p-3.5 mb-2.5 border border-accent/40"
            >
              <div className="text-[10px] font-bold text-accent uppercase tracking-wide mb-2.5">
                {m.label} · UP NEXT
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 text-center">
                  <div className="text-[13px] font-bold text-text">{tName(m.team1)}</div>
                  {playerNames(m.team1) && <div className="text-[10px] text-dim mt-0.5">{playerNames(m.team1)}</div>}
                </div>
                <div className="text-[12px] font-bold text-dim px-3 py-1 bg-bg rounded-lg">VS</div>
                <div className="flex-1 text-center">
                  <div className="text-[13px] font-bold text-text">{tName(m.team2)}</div>
                  {playerNames(m.team2) && <div className="text-[10px] text-dim mt-0.5">{playerNames(m.team2)}</div>}
                </div>
              </div>
              {canScore && (
                <button
                  onClick={() => onStartMatch(m)}
                  className="w-full py-2.5 rounded-lg text-[12px] font-bold text-white bg-accent border-0 cursor-pointer"
                >
                  Start Match
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <div className="text-[11px] font-bold text-success uppercase tracking-wide mb-2">
            Completed ({completed.length})
          </div>
          <div className="flex flex-col gap-2">
            {completed.map(m => (
              <div
                key={m.id}
                onClick={() => onMatchClick && onMatchClick(m)}
                className="bg-surface rounded-xl px-3.5 py-3 border border-line cursor-pointer hover:bg-alt transition-colors"
              >
                <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-1.5">
                  {m.label}
                </div>
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className={`text-[13px] ${m.winner === m.team1 ? 'font-bold text-accent' : 'font-medium text-dim'}`}>
                      {tName(m.team1)}
                    </div>
                    {playerNames(m.team1) && <div className="text-[10px] text-dim mt-0.5">{playerNames(m.team1)}</div>}
                  </div>
                  <div className="flex items-center gap-1 px-3">
                    <span className={`text-[16px] font-bold ${m.winner === m.team1 ? 'text-accent' : 'text-text'}`}>{m.score1}</span>
                    <span className="text-[10px] text-dim">–</span>
                    <span className={`text-[16px] font-bold ${m.winner === m.team2 ? 'text-accent' : 'text-text'}`}>{m.score2}</span>
                  </div>
                  <div className="flex-1 text-right">
                    <div className={`text-[13px] ${m.winner === m.team2 ? 'font-bold text-accent' : 'font-medium text-dim'}`}>
                      {tName(m.team2)}
                    </div>
                    {playerNames(m.team2) && <div className="text-[10px] text-dim mt-0.5">{playerNames(m.team2)}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!pending.length && !completed.length && (
        <div className="text-[13px] text-dim text-center py-10">No matches yet</div>
      )}
    </div>
  )
}
