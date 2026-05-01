import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLeagueByInviteCode, joinLeague } from '../services/inviteService'
import { createNotification } from '../services/notificationService'
import { useAuth } from '../contexts/AuthContext'

const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const BackIcon = () => <Svg><polyline points="15 18 9 12 15 6" /></Svg>

export default function JoinLeague() {
  const navigate     = useNavigate()
  const { code }     = useParams()
  const { session }  = useAuth()

  const [league, setLeague]   = useState(null)
  const [status, setStatus]   = useState('loading') // loading | found | not_found | joining | done | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!code) { setStatus('not_found'); return }

    getLeagueByInviteCode(code).then(data => {
      if (data) { setLeague(data); setStatus('found') }
      else        setStatus('not_found')
    })
  }, [code])

  async function handleJoin() {
    setStatus('joining')
    try {
      const { alreadyMember } = await joinLeague(league.id)
      if (alreadyMember) {
        setMessage("You're already a member of this league!")
      } else {
        setMessage('You joined successfully!')
        const userId = session?.user?.id
        if (userId) {
          await createNotification(
            userId,
            'league_welcome',
            'Welcome to the league! 🏐',
            `You joined ${league.name} · Season ${league.season}`,
            { leagueId: league.id },
          )
        }
      }
      setStatus('done')
    } catch (err) {
      setMessage(err.message || 'Failed to join. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-text">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'not_found') {
    return (
      <div className="flex flex-col h-screen bg-bg text-text items-center justify-center px-6 text-center">
        <div className="text-[48px] mb-4">🔗</div>
        <div className="text-[20px] font-bold mb-2">Invalid invite link</div>
        <div className="text-[13px] text-dim mb-8 max-w-[280px]">
          This invite code doesn't exist or has expired. Ask the league admin for a new link.
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-xl bg-accent text-white font-bold text-[14px] border-0 cursor-pointer"
        >
          Go Home
        </button>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="flex flex-col h-screen bg-bg text-text items-center justify-center px-6 text-center">
        <div className="text-[48px] mb-4">🏐</div>
        <div className="text-[20px] font-bold mb-2">{message}</div>
        <div className="text-[13px] text-dim mb-8">{league?.name}</div>
        <button
          onClick={() => navigate(`/league/${league.id}`)}
          className="px-6 py-3 rounded-xl bg-accent text-white font-bold text-[14px] border-0 cursor-pointer"
        >
          Go to League
        </button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col h-screen bg-bg text-text items-center justify-center px-6 text-center">
        <div className="text-[48px] mb-4">❌</div>
        <div className="text-[20px] font-bold mb-2">Something went wrong</div>
        <div className="text-[13px] text-dim mb-8 max-w-[280px]">{message}</div>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-xl bg-alt border border-line text-text font-bold text-[14px] cursor-pointer"
        >
          Go Home
        </button>
      </div>
    )
  }

  // status === 'found'
  return (
    <div className="flex flex-col h-screen bg-bg text-text">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <button
          onClick={() => navigate('/')}
          className="cursor-pointer bg-transparent border-0 p-1 -ml-1 text-text"
        >
          <BackIcon />
        </button>
        <span className="text-[18px] font-bold">Join League</span>
      </div>

      {/* Card */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-[360px] bg-surface border border-line rounded-2xl p-6 text-center">

          <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
            <span className="text-[32px]">🏆</span>
          </div>

          <div className="text-[11px] font-bold text-accent uppercase tracking-widest mb-1">
            You're invited
          </div>
          <div className="text-[22px] font-black text-text mb-1">{league?.name}</div>
          <div className="text-[13px] text-dim mb-6">Season {league?.season}</div>

          <button
            onClick={handleJoin}
            disabled={status === 'joining'}
            className="w-full min-h-[46px] rounded-xl bg-accent text-white font-bold text-[14px] border-0 cursor-pointer disabled:opacity-60"
          >
            {status === 'joining' ? 'Joining…' : 'Join as Player'}
          </button>

          <button
            onClick={() => navigate('/')}
            className="mt-3 w-full min-h-[44px] rounded-xl bg-alt text-text font-semibold text-[14px] border border-line cursor-pointer"
          >
            Not now
          </button>

        </div>
      </main>

    </div>
  )
}
