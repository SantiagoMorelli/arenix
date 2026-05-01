import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { PillTabs } from '../ui-new'
import { calcOverallStandings, getAllMatches } from '../../lib/tournament'
import TieBreakerControls from '../standings/TieBreakerControls'

// ─── Teams positions table (with inline rename) ───────────────────────────────
function TeamsPositionsTable({ tournament, leaguePlayers, currentUserId, isAdmin, onRenameTeam, tbOptions, onTbOptionsChange }) {
  const { teams } = tournament
  const allMatches = getAllMatches(tournament)
  const [editingTeamId, setEditingTeamId] = useState(null)
  const [editName, setEditName]           = useState('')
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState(null)

  const rows = calcOverallStandings(teams, allMatches, leaguePlayers, tbOptions)

  async function handleSave(teamId) {
    const trimmed = editName.trim()
    if (!trimmed) return
    setSaving(true)
    setSaveError(null)
    try {
      await onRenameTeam(teamId, trimmed)
      setEditingTeamId(null)
    } catch (err) {
      setSaveError(err?.message || 'Failed to save. Check your permissions.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {isAdmin && (
        <TieBreakerControls teams={teams} value={tbOptions} onChange={onTbOptionsChange} accent="accent" />
      )}
      <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
        <div className="flex items-center px-3.5 py-2 border-b border-line bg-alt justify-between">
          <div className="flex items-center gap-2">
            <span className="w-[20px] text-[10px] font-bold text-dim">#</span>
            <span className="text-[10px] font-bold text-dim">TEAM</span>
          </div>
          <div className="flex items-center">
            {tbOptions.tieBreakerMode !== 'id' && (
              <span className="mr-3 text-[10px] font-bold text-dim uppercase">TB: {tbOptions.tieBreakerMode}</span>
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
        ) : rows.map((row, i) => {
          const team = teams.find(t => t.id === row.id)
          if (!team) return null

          const isMember = currentUserId && (team.players || []).some(pid => {
            const p = leaguePlayers.find(pl => pl.id === pid)
            return p?.userId === currentUserId
          })
          const canEdit   = isAdmin || isMember
          const isEditing = editingTeamId === team.id

          return (
            <div
              key={row.id}
              className={`
                flex items-center px-3.5 py-2.5
                ${i < rows.length - 1 ? 'border-b border-line' : ''}
                ${i === 0 ? 'bg-accent/15' : ''}
              `}
            >
              <span className={`w-[20px] text-[13px] font-bold ${i === 0 ? 'text-accent' : 'text-dim'}`}>
                {i + 1}
              </span>

              <div className="flex-1 overflow-hidden pr-2">
                {isEditing ? (
                  <div className="flex flex-col gap-1.5 mb-1">
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => { setEditName(e.target.value); setSaveError(null) }}
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(team.id); if (e.key === 'Escape') { setEditingTeamId(null); setSaveError(null) } }}
                        className="w-full min-w-0 bg-bg border border-accent rounded px-1.5 py-1 text-[13px] font-bold text-text outline-none"
                      />
                      <button
                        onClick={() => handleSave(team.id)}
                        disabled={saving || !editName.trim()}
                        className="text-[10px] font-bold text-white bg-accent px-2 py-1 rounded border-0 cursor-pointer disabled:opacity-50"
                      >
                        {saving ? '…' : '✔'}
                      </button>
                      <button
                        onClick={() => { setEditingTeamId(null); setSaveError(null) }}
                        className="text-[10px] font-semibold text-dim bg-transparent border-0 cursor-pointer px-1"
                      >
                        ✕
                      </button>
                    </div>
                    {saveError && (
                      <div className="text-[10px] text-error font-medium px-0.5">{saveError}</div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="text-[13px] font-semibold text-text truncate">{row.name}</div>
                    {canEdit && (
                      <button
                        onClick={() => { setEditingTeamId(team.id); setEditName(team.name); setSaveError(null) }}
                        className="text-dim hover:text-accent transition-colors bg-transparent border-0 cursor-pointer p-0 flex-shrink-0"
                        title="Rename team"
                      >
                        <Pencil size={11} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                )}
                {row.playerNames && (
                  <div className="text-[10px] text-dim mt-0.5 truncate">{row.playerNames}</div>
                )}
              </div>

              <span className="w-6 text-center text-[13px] font-semibold text-success flex-shrink-0">{row.wins}</span>
              <span className="w-6 text-center text-[13px] font-semibold text-error flex-shrink-0">{row.losses}</span>
              <span className="w-7 text-center text-[13px] font-semibold text-text flex-shrink-0">{row.pf}</span>
              <span className="w-7 text-center text-[13px] font-semibold text-text flex-shrink-0">{row.pa}</span>
              <span className={`w-7 text-center text-[13px] font-semibold flex-shrink-0 ${row.pd > 0 ? 'text-success' : row.pd < 0 ? 'text-error' : 'text-text'}`}>
                {row.pd > 0 ? '+' + row.pd : row.pd}
              </span>
              <span className="w-8 text-center text-[13px] font-bold text-accent flex-shrink-0">{row.pts}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Players positions table ──────────────────────────────────────────────────
function PlayersPositionsTable({ tournament, leaguePlayers }) {
  const { teams } = tournament
  const allMatches = getAllMatches(tournament)

  const playerStats = {}

  teams.forEach(team => {
    let wins = 0, losses = 0
    allMatches
      .filter(m => m.played && (m.team1 === team.id || m.team2 === team.id))
      .forEach(m => {
        const scored   = m.team1 === team.id ? m.score1 : m.score2
        const conceded = m.team1 === team.id ? m.score2 : m.score1
        if (scored > conceded) wins++; else losses++
      })

    ;(team.players || []).forEach(pid => {
      if (!playerStats[pid]) {
        const p = leaguePlayers.find(pl => pl.id === pid)
        playerStats[pid] = {
          id: pid,
          name: p ? (p.displayName || p.nickname || p.name) : 'Unknown',
          wins: 0,
          losses: 0,
          pts: 0
        }
      }
      playerStats[pid].wins += wins
      playerStats[pid].losses += losses
      playerStats[pid].pts += wins
    })
  })

  const rows = Object.values(playerStats).sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name))

  return (
    <>
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
              ${i === 0 ? 'bg-accent/15' : ''}
            `}
          >
            <span className={`w-[30px] text-[13px] font-bold text-center ${i === 0 ? 'text-accent' : 'text-dim'}`}>
              {i + 1}
            </span>
            <div className="flex-1 overflow-hidden pr-2">
              <div className="text-[13px] font-semibold text-text truncate">{row.name}</div>
            </div>
            <span className="w-10 text-center text-[13px] font-semibold text-success flex-shrink-0">{row.wins}</span>
            <span className="w-10 text-center text-[13px] font-semibold text-error flex-shrink-0">{row.losses}</span>
            <span className="w-12 text-center text-[13px] font-bold text-accent flex-shrink-0">{row.pts}</span>
          </div>
        ))}
      </div>
      <div className="mt-3.5 text-[12px] text-dim text-center leading-relaxed">
        Player rankings will update the league standings when the tournament ends.
      </div>
    </>
  )
}

// ─── Positions tab (outer) ────────────────────────────────────────────────────
export default function PositionsTab({ tournament, leaguePlayers, currentUserId, isAdmin, onRenameTeam, tbOptions, onTbOptionsChange }) {
  const { teams } = tournament
  const [subTab, setSubTab] = useState('teams')

  if (!teams || teams.length === 0) {
    return <div className="px-4 text-[13px] text-dim text-center py-10">No teams yet</div>
  }

  return (
    <div className="px-4">
      <PillTabs
        items={[
          { id: 'teams', label: 'Teams' },
          { id: 'players', label: 'Players' }
        ]}
        active={subTab}
        onChange={setSubTab}
      />

      {subTab === 'teams' ? (
        <TeamsPositionsTable
          tournament={tournament}
          leaguePlayers={leaguePlayers}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onRenameTeam={onRenameTeam}
          tbOptions={tbOptions}
          onTbOptionsChange={onTbOptionsChange}
        />
      ) : (
        <PlayersPositionsTable tournament={tournament} leaguePlayers={leaguePlayers} />
      )}
    </div>
  )
}
