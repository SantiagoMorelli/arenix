import { useState, useMemo } from 'react'
import { PillTabs } from '../ui-new'
import { calcOverallStandings, calcPlayerStandings } from '../../lib/standings'
import TieBreakerControls from '../standings/TieBreakerControls'

// ─── Teams ranking table ───────────────────────────────────────────────────────
function TeamsRankingTable({ rows, tbOptions }) {
  return (
    <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
      <div className="flex items-center px-3.5 py-2 border-b border-line bg-alt justify-between">
        <div className="flex items-center gap-2">
          <span className="w-[20px] text-[10px] font-bold text-dim">#</span>
          <span className="text-[10px] font-bold text-dim">TEAM</span>
        </div>
        <div className="flex items-center">
          {tbOptions?.tieBreakerMode !== 'id' && (
            <span className="mr-3 text-[10px] font-bold text-dim uppercase">TB: {tbOptions?.tieBreakerMode}</span>
          )}
          <span className="w-6 text-center text-[10px] font-bold text-dim">W</span>
          <span className="w-6 text-center text-[10px] font-bold text-dim">L</span>
          <span className="w-7 text-center text-[10px] font-bold text-dim">PF</span>
          <span className="w-7 text-center text-[10px] font-bold text-dim">PA</span>
          <span className="w-7 text-center text-[10px] font-bold text-dim">PD</span>
          <span className="w-8 text-center text-[10px] font-bold text-dim">PTS</span>
        </div>
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

// ─── Players ranking table ────────────────────────────────────────────────────
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

// ─── Ranking tab (outer) ──────────────────────────────────────────────────────
export default function RankingTab({ session, canManage }) {
  const [subTab, setSubTab] = useState('teams')
  const [tbOptions, setTbOptions] = useState({ tieBreakerMode: 'id', seedMap: {}, drawMap: {} })

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
    () => calcOverallStandings(session.teams || [], matches, session.players || [], tbOptions),
    [session.teams, matches, session.players, tbOptions]
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
        <div className="flex flex-col gap-3">
          {canManage && (
            <TieBreakerControls teams={session.teams} value={tbOptions} onChange={setTbOptions} accent="free" />
          )}
          <TeamsRankingTable rows={teamRows} tbOptions={tbOptions} />
        </div>
      ) : (
        <PlayersRankingTable rows={playerRows} />
      )}
    </div>
  )
}
