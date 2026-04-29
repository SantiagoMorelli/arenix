import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFreePlays, createFreePlay } from '../services/freePlayService'
import { getMyLeagues } from '../services/leagueService'
import { AppCard, AppBadge } from '../components/ui-new'

// ─── Icons ────────────────────────────────────────────────────────────────────
const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const BackIcon  = () => <Svg><polyline points="15 18 9 12 15 6" /></Svg>
const PlusIcon  = () => <Svg><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Svg>
const PlayIcon  = () => <Svg><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" /></Svg>
const UsersIcon = () => <Svg size={16}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></Svg>

function formatDate(val) {
  if (!val) return ''
  try { return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return val }
}

// ─── Create modal ─────────────────────────────────────────────────────────────
function CreateModal({ leagues, onConfirm, onClose, loading }) {
  const [name, setName]         = useState('')
  const [leagueId, setLeagueId] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[440px] bg-surface rounded-t-2xl p-6 pb-10 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-black text-text uppercase tracking-widest">New Session</div>
          <button onClick={onClose} className="text-dim text-[22px] leading-none bg-transparent border-0 cursor-pointer">×</button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-dim uppercase tracking-wide">Session name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Sunday at the beach"
            autoFocus
            className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-free"
          />
        </div>

        {leagues.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-dim uppercase tracking-wide">Link to league <span className="normal-case font-normal">(optional)</span></label>
            <select
              value={leagueId}
              onChange={e => setLeagueId(e.target.value)}
              className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text focus:outline-none focus:border-free appearance-none"
            >
              <option value="">No league — standalone</option>
              {leagues.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={() => onConfirm(name.trim(), leagueId || null)}
          disabled={!name.trim() || loading}
          className="w-full py-4 rounded-xl bg-free text-white font-black text-[14px] uppercase tracking-widest active:scale-[0.98] transition-transform disabled:opacity-50 border-0 cursor-pointer"
        >
          {loading ? 'Creating…' : 'Create Session'}
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FreePlayList() {
  const navigate = useNavigate()

  const [sessions, setSessions] = useState([])
  const [leagues,  setLeagues]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    Promise.all([getFreePlays(), getMyLeagues()])
      .then(([fp, lg]) => { setSessions(fp); setLeagues(lg) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (name, leagueId) => {
    setCreating(true)
    try {
      const session = await createFreePlay(name, leagueId)
      navigate(`/free-play/${session.id}`)
    } catch (err) {
      console.error(err)
      setCreating(false)
    }
  }

  const activeSessions   = sessions.filter(s => s.status !== 'finished')
  const finishedSessions = sessions.filter(s => s.status === 'finished')

  return (
    <div className="screen bg-bg text-text">
      {/* Header */}
      <div className="screen__top flex items-center justify-between px-4 pt-5 pb-4">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center bg-surface border border-line rounded-xl text-text"
        >
          <BackIcon />
        </button>
        <div className="text-center">
          <div className="text-[18px] font-black text-free uppercase tracking-widest">Free Play</div>
          <div className="text-[11px] text-dim">Quick match · Any players</div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-10 h-10 flex items-center justify-center bg-free/15 border border-free/30 rounded-xl text-free"
        >
          <PlusIcon />
        </button>
      </div>

      {/* Content */}
      <div className="screen__body px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-2 border-free border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-60 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-free/10 flex items-center justify-center text-free">
              <PlayIcon />
            </div>
            <div>
              <div className="text-[15px] font-bold text-text mb-1">No sessions yet</div>
              <div className="text-[12px] text-dim">Create one to start playing</div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 px-6 py-3 rounded-xl bg-free text-white font-bold text-[14px] border-0 cursor-pointer active:scale-[0.98] transition-transform"
            >
              Start New Session
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-1">
            {/* Active sessions */}
            {activeSessions.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2">Active</div>
                <div className="flex flex-col gap-2">
                  {activeSessions.map(s => (
                    <SessionCard key={s.id} session={s} onClick={() => navigate(`/free-play/${s.id}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* Finished sessions */}
            {finishedSessions.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-dim uppercase tracking-wide mb-2 mt-2">Finished</div>
                <div className="flex flex-col gap-2">
                  {finishedSessions.map(s => (
                    <SessionCard key={s.id} session={s} onClick={() => navigate(`/free-play/${s.id}`)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <CreateModal
          leagues={leagues}
          loading={creating}
          onConfirm={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function SessionCard({ session, onClick }) {
  const isFinished = session.status === 'finished'
  return (
    <AppCard onClick={onClick} className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${isFinished ? 'bg-alt text-dim' : 'bg-free/15 text-free'}`}>
        <PlayIcon />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-text truncate">{session.name || 'Free Play'}</div>
        <div className="text-[11px] text-dim flex items-center gap-1.5 mt-0.5">
          <span>{formatDate(session.created_at)}</span>
          {session.league_id && (
            <span className="flex items-center gap-0.5 text-dim"><UsersIcon /> League</span>
          )}
        </div>
      </div>
      <AppBadge text={isFinished ? 'Finished' : 'Active'} variant={isFinished ? 'dim' : 'free'} />
    </AppCard>
  )
}
