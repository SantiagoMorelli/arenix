import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLeague } from '../hooks/useLeague'
import { useLeagueRole } from '../hooks/useLeagueRole'

function avatarBg(seed) {
  let h = 0; const s = String(seed)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff
  return `oklch(0.38 0.13 ${h % 360})`
}

const GENDER_LABEL = { F: 'Female', M: 'Male', X: 'Other', male: 'Male', female: 'Female', other: 'Other' }
const levelCap = v => (v ? v[0].toUpperCase() + v.slice(1) : '—')

const Svg = ({ children, size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>{children}</svg>
)
const ArrowLeft  = () => <Svg size={18}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></Svg>
const CheckIcon  = ({ size = 11 }) => <Svg size={size} className="shrink-0"><polyline points="20 6 9 17 4 12"/></Svg>

function PlayerAvatar({ player }) {
  const label    = player.displayName || player.name || '?'
  const isLinked = !!player.userId
  return (
    <div className="relative mx-auto" style={{ width: 72, height: 72 }}>
      <div
        className="flex items-center justify-center font-bold text-white"
        style={{ width: 72, height: 72, fontSize: 28, borderRadius: 20, backgroundColor: avatarBg(player.id || player.name) }}
      >
        {label[0].toUpperCase()}
      </div>
      <span
        className="absolute rounded-full"
        style={{
          right: 0, bottom: 0,
          width: 18, height: 18,
          backgroundColor: isLinked ? '#2ECC71' : 'transparent',
          border: `3px solid #0F1923`,
          boxShadow: isLinked ? '0 0 0 1px #2ECC71' : '0 0 0 1px #7A8EA0',
        }}
      />
    </div>
  )
}

export default function PlayerProfile() {
  const { id, pid } = useParams()
  const navigate    = useNavigate()
  const { league, loading: leagueLoading } = useLeague(id)
  const { isAdmin, loading: roleLoading }  = useLeagueRole(id)

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate(`/league/${id}`, { replace: true })
    }
  }, [isAdmin, roleLoading, id, navigate])

  if (leagueLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-line border-t-accent animate-spin" />
      </div>
    )
  }

  const players = league?.players || []
  const player  = players.find(p => p.id === pid)

  if (!player) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3 p-6">
        <div className="text-[15px] font-semibold text-text">Player not found</div>
        <button
          onClick={() => navigate(-1)}
          className="text-[13px] text-accent font-semibold border-0 bg-transparent cursor-pointer"
        >
          Go back
        </button>
      </div>
    )
  }

  const ranked  = [...players].sort((a, b) => (b.points || 0) - (a.points || 0))
  const rank    = ranked.findIndex(p => p.id === pid) + 1
  const total   = player.wins + player.losses
  const winRate = total > 0 ? Math.round((player.wins / total) * 100) : null
  const isLinked = !!player.userId
  const gender   = (isLinked ? GENDER_LABEL[player.gender] : GENDER_LABEL[player.sex]) || '—'

  const stats = [
    { label: 'ELO',      value: player.points ?? 0 },
    { label: 'RANK',     value: `#${rank}` },
    { label: 'WINS',     value: player.wins ?? 0 },
    { label: 'WIN RATE', value: winRate !== null ? `${winRate}%` : '—' },
  ]

  const details = [
    { label: 'FULL NAME', value: player.fullName || player.name },
    { label: 'NICKNAME',  value: player.nickname || '—' },
    { label: 'GENDER',    value: gender },
    {
      label: 'LEVEL',
      value: (
        <span className="inline-block px-2.5 py-[3px] rounded-full bg-accent/15 text-accent text-[12px] font-bold">
          {levelCap(player.level)}
        </span>
      ),
    },
    { label: 'LOSSES', value: player.losses ?? 0, last: true },
  ]

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center text-dim cursor-pointer"
        >
          <ArrowLeft />
        </button>
        <span className="text-[14px] font-semibold text-dim">Player Profile</span>
      </div>

      <div className="px-4 pb-8 flex flex-col gap-4">
        {/* Hero */}
        <div className="flex flex-col items-center pt-4 pb-2 gap-2">
          <PlayerAvatar player={player} />
          <div className="font-display text-[28px] text-text tracking-wide text-center leading-tight mt-1">
            {player.displayName || player.name}
          </div>
          <div className="flex items-center gap-1.5">
            {isLinked ? (
              <>
                <span className="text-success"><CheckIcon size={11} /></span>
                <span className="text-[11px] text-success font-semibold">Linked</span>
                {player.email && <span className="text-[11px] text-dim">· {player.email}</span>}
              </>
            ) : (
              <span className="text-[11px] text-dim">Guest player · no account</span>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="bg-surface border border-line rounded-2xl grid grid-cols-4 divide-x divide-line">
          {stats.map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-4 gap-0.5">
              <span className="font-display text-[22px] text-text leading-none">{value}</span>
              <span className="text-[9px] font-bold text-dim uppercase tracking-[0.6px] mt-1">{label}</span>
            </div>
          ))}
        </div>

        {/* Details card */}
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          {details.map(({ label, value, last }) => (
            <div key={label} className={`flex items-center min-h-[44px] px-3.5 py-3 ${!last ? 'border-b border-line' : ''}`}>
              <span className="w-24 text-[11px] font-bold text-dim uppercase tracking-[0.6px] flex-shrink-0">{label}</span>
              <span className="flex-1 text-[13px] text-text text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
