import { useState } from 'react'
import { uid, levelOf, LEVELS } from '../lib/utils'
import { AppButton, SectionLabel } from './ui-new'

// Inline icons
const Svg = ({ children, size = 16, className = '' }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
)

const EditIcon = () => (
  <Svg>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Svg>
)

const TrashIcon = () => (
  <Svg className="text-error">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Svg>
)

export default function LeaguePlayersTab({ league, updateLeague }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingPlayerId, setEditingPlayerId] = useState(null)
  
  const [name, setName] = useState('')
  const [level, setLevel] = useState('beginner')

  const players = league.players || []

  const handleOpenForm = (player = null) => {
    if (player) {
      setEditingPlayerId(player.id)
      setName(player.name)
      setLevel(player.level || 'beginner')
    } else {
      setEditingPlayerId(null)
      setName('')
      setLevel('beginner')
    }
    setIsEditing(true)
  }

  const handleCloseForm = () => {
    setIsEditing(false)
    setEditingPlayerId(null)
    setName('')
    setLevel('beginner')
  }

  const handleSave = () => {
    if (!name.trim()) return

    if (editingPlayerId) {
      // Update
      const updatedPlayers = players.map(p => 
        p.id === editingPlayerId 
          ? { ...p, name: name.trim(), level } 
          : p
      )
      updateLeague({ players: updatedPlayers })
    } else {
      // Create
      const newPlayer = {
        id: uid(),
        name: name.trim(),
        level,
        wins: 0,
        losses: 0,
        points: 0
      }
      updateLeague({ players: [...players, newPlayer] })
    }
    
    handleCloseForm()
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this player?')) {
      const updatedPlayers = players.filter(p => p.id !== id)
      updateLeague({ players: updatedPlayers })
    }
  }

  if (isEditing) {
    return (
      <div className="bg-surface rounded-xl border border-line p-4 mb-4">
        <div className="text-[14px] font-bold text-text mb-4">
          {editingPlayerId ? 'Edit Player' : 'Add New Player'}
        </div>
        
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <label className="block text-[11px] font-bold text-dim uppercase tracking-wide mb-1.5">
              Player Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full border border-line rounded-lg px-3 py-2.5 text-[14px] text-text bg-bg outline-none focus:border-accent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-dim uppercase tracking-wide mb-1.5">
              Level
            </label>
            <div className="flex gap-2">
              {LEVELS.map(l => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className={`
                    flex-1 py-2 text-[12px] font-semibold rounded-lg border cursor-pointer transition-colors
                    ${level === l.id 
                      ? 'border-accent bg-accent/10 text-accent' 
                      : 'border-line bg-bg text-text'}
                  `}
                >
                  {l.icon} {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5">
          <AppButton variant="outline" onClick={handleCloseForm} className="flex-1">
            Cancel
          </AppButton>
          <AppButton variant="accent" onClick={handleSave} disabled={!name.trim()} className="flex-1">
            Save
          </AppButton>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2.5">
        <SectionLabel color="accent">Roster ({players.length})</SectionLabel>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-1 text-[11px] font-semibold text-accent cursor-pointer bg-transparent border-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add
        </button>
      </div>

      {players.length > 0 ? (
        <div className="bg-surface rounded-xl border border-line overflow-hidden mb-4">
          {players.map((player, i) => (
            <div
              key={player.id}
              className={`
                flex items-center p-3
                ${i < players.length - 1 ? 'border-b border-line' : ''}
              `}
            >
              {/* Avatar initial */}
              <div className="w-8 h-8 rounded-lg bg-alt flex items-center justify-center text-[13px] font-bold text-text mr-3 flex-shrink-0">
                {player.name[0]}
              </div>

              {/* Name & Level */}
              <div className="flex-1 min-w-0 mr-2">
                <div className="text-[13px] font-semibold text-text truncate">
                  {player.name}
                </div>
                <div className="text-[11px] text-dim flex items-center gap-1 mt-0.5">
                  <span className="text-[10px]">{levelOf(player.level).icon}</span>
                  {levelOf(player.level).label}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleOpenForm(player)}
                  className="w-8 h-8 rounded-lg bg-alt flex items-center justify-center cursor-pointer border-0 text-dim hover:text-text transition-colors"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => handleDelete(player.id)}
                  className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center cursor-pointer border-0 transition-colors"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[13px] text-dim text-center py-8 bg-surface rounded-xl border border-line mb-4">
          No players in this league yet.<br/>
          <button
            onClick={() => handleOpenForm()}
            className="text-accent font-semibold bg-transparent border-0 cursor-pointer mt-2 p-0 underline"
          >
            Add your first player
          </button>
        </div>
      )}
    </div>
  )
}
