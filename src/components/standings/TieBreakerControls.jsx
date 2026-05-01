import { useState } from 'react'

export default function TieBreakerControls({ teams = [], value, onChange, accent = 'accent' }) {
  const [isOpen, setIsOpen] = useState(false)
  const { tieBreakerMode = 'id' } = value

  const bgClass = accent === 'free' ? 'bg-free' : 'bg-accent'

  const handleModeChange = (mode) => {
    onChange({ ...value, tieBreakerMode: mode })
  }

  const handleMapChange = (teamId, valStr, mapName) => {
    const num = parseInt(valStr, 10)
    const newMap = { ...value[mapName] }
    if (isNaN(num)) {
      delete newMap[teamId]
    } else {
      newMap[teamId] = num
    }
    onChange({ ...value, [mapName]: newMap })
  }

  return (
    <div className="mb-4 bg-surface rounded-[14px] border border-line overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-transparent border-0 cursor-pointer hover:bg-alt/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-text">Tie-Breaker Final Rule</span>
          {tieBreakerMode !== 'id' && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bgClass} text-white uppercase`}>
              {tieBreakerMode}
            </span>
          )}
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-dim transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-line">
          <div className="text-[11px] text-dim mb-3">
            Determines the winner of an exact tie after PTS, H2H, PD, PF, and Wins are all equal.
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {['id', 'seed', 'draw'].map((mode) => {
              const label = mode === 'id' ? 'Default' : mode === 'seed' ? 'Seed' : 'Draw'
              const active = tieBreakerMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={`
                    px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors cursor-pointer
                    ${active 
                      ? `${bgClass} text-white border-transparent` 
                      : 'bg-alt text-dim border-line hover:text-text'
                    }
                  `}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {(tieBreakerMode === 'seed' || tieBreakerMode === 'draw') && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-[11px] font-bold text-dim uppercase tracking-wide">
                Assign {tieBreakerMode} numbers (lower is better)
              </div>
              {teams.map(team => {
                const mapName = tieBreakerMode === 'seed' ? 'seedMap' : 'drawMap'
                const currentVal = value[mapName]?.[team.id] ?? ''
                return (
                  <div key={team.id} className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-text truncate flex-1">
                      {team.name}
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={currentVal}
                      onChange={(e) => handleMapChange(team.id, e.target.value, mapName)}
                      placeholder="-"
                      className="w-16 bg-bg border border-line rounded-lg px-2 py-1.5 text-[13px] text-center text-text focus:outline-none focus:border-accent"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
