import { useState } from 'react'
import { Pencil } from 'lucide-react'

export default function StandingsTable({ rows, teams, leaguePlayers, currentUserId, isAdmin, onRenameTeam }) {
  const [editingTeamId, setEditingTeamId] = useState(null)
  const [editName, setEditName]           = useState('')
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState(null)

  const canEditAny = typeof onRenameTeam === 'function'

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
    <div className="bg-surface rounded-[14px] overflow-hidden border border-line">
      {/* Column headers */}
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
        <div className="text-center text-[13px] text-dim py-4">No data yet</div>
      ) : rows.map((row, i) => {
        const team = teams?.find(t => t.id === row.id)
        const isMember = canEditAny && team && currentUserId && (team.players || []).some(pid => {
          const p = leaguePlayers?.find(pl => pl.id === pid)
          return p?.userId === currentUserId
        })
        const canEdit   = canEditAny && team && (isAdmin || isMember)
        const isEditing = editingTeamId === row.id

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
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(row.id); if (e.key === 'Escape') { setEditingTeamId(null); setSaveError(null) } }}
                      className="w-full min-w-0 bg-bg border border-accent rounded px-1.5 py-1 text-[13px] font-bold text-text outline-none"
                    />
                    <button
                      onClick={() => handleSave(row.id)}
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
                      onClick={() => { setEditingTeamId(row.id); setEditName(team.name); setSaveError(null) }}
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
            <span className="w-6 text-center text-[13px] font-semibold text-success">{row.wins}</span>
            <span className="w-6 text-center text-[13px] font-semibold text-error">{row.losses}</span>
            <span className="w-7 text-center text-[13px] font-semibold text-text">{row.pf}</span>
            <span className="w-7 text-center text-[13px] font-semibold text-text">{row.pa}</span>
            <span className={`w-7 text-center text-[13px] font-semibold ${row.pd > 0 ? 'text-success' : row.pd < 0 ? 'text-error' : 'text-text'}`}>
              {row.pd > 0 ? '+' + row.pd : row.pd}
            </span>
            <span className="w-8 text-center text-[13px] font-bold text-accent">{row.pts}</span>
          </div>
        )
      })}
    </div>
  )
}
