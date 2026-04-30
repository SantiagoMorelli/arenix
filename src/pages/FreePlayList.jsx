import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFreePlays } from '../services/freePlayService'
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FreePlayList() {
  const navigate = useNavigate()

  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getFreePlays()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleNew = () => navigate('/free-play/new')

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
          onClick={handleNew}
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
              onClick={handleNew}
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
