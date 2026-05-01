import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { getLeaguePlayers } from '../../services/playerService'
import { AppBadge, AppButton } from '../ui-new'

export default function AddPlayerModal({ session, onAdd, onClose }) {
  const hasLeague = !!session.league_id
  const [tab, setTab]               = useState(hasLeague ? 'league' : 'guest')
  const [leaguePlayers, setLeague]  = useState([])
  const [loadingLeague, setLoading] = useState(false)
  const [search, setSearch]         = useState('')
  const [guestName, setGuestName]   = useState('')
  const [adding, setAdding]         = useState(false)

  useEffect(() => {
    if (!hasLeague || tab !== 'league') return
    setLoading(true)
    getLeaguePlayers(session.league_id)
      .then(setLeague)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tab, hasLeague, session.league_id])

  const alreadyIn = new Set(session.players.map(p => p.leaguePlayerId).filter(Boolean))
  const filtered  = leaguePlayers
    .filter(p => !alreadyIn.has(p.id))
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  const handleAddLeague = async (player) => {
    setAdding(true)
    try { await onAdd(player.name, player.id) }
    finally { setAdding(false) }
    onClose()
  }

  const handleAddGuest = async () => {
    if (!guestName.trim()) return
    setAdding(true)
    try { await onAdd(guestName.trim(), null) }
    finally { setAdding(false) }
    setGuestName('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[440px] bg-surface rounded-t-2xl flex flex-col max-h-[80vh]">
        <div className="px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[16px] font-black text-text uppercase tracking-widest">Add Player</div>
            <button onClick={onClose} className="text-dim text-[22px] leading-none bg-transparent border-0 cursor-pointer">×</button>
          </div>

          {hasLeague && (
            <div className="flex bg-bg rounded-xl p-1 gap-1 mb-4">
              {['league', 'guest'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all border-0 cursor-pointer capitalize
                    ${tab === t ? 'bg-free text-white' : 'bg-transparent text-dim'}`}
                >
                  {t === 'league' ? 'From League' : 'Guest'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
          {tab === 'league' ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 bg-bg border border-line rounded-xl px-3 py-2.5">
                <span className="text-dim shrink-0"><Search size={16} strokeWidth={2} /></span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search players…"
                  autoFocus
                  className="flex-1 bg-transparent border-0 text-[14px] text-text placeholder:text-dim focus:outline-none"
                />
              </div>

              {loadingLeague ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-free border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-[13px] text-dim py-8">
                  {search ? 'No players match your search' : 'All league players are already added'}
                </div>
              ) : (
                filtered.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAddLeague(p)}
                    disabled={adding}
                    className="flex items-center justify-between w-full bg-bg border border-line rounded-xl px-4 py-3 text-left active:bg-alt transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <div className="text-[14px] font-semibold text-text">{p.name}</div>
                    <AppBadge text={p.level || 'beginner'} variant="dim" />
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-dim uppercase tracking-wide">Player name</label>
                <input
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddGuest()}
                  placeholder="e.g. Maria"
                  autoFocus
                  className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-free"
                />
              </div>
              <AppButton
                variant="free"
                onClick={handleAddGuest}
                disabled={!guestName.trim() || adding}
              >
                {adding ? 'Adding…' : 'Add Guest'}
              </AppButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
