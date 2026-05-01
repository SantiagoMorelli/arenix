import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, MapPin, Trophy, Play, Calendar,
  ChevronDown, Plus, Bell, Check,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getPublicLeagues } from '../services/leagueService'
import { getFreePlays } from '../services/freePlayService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function hueFromString(str) {
  if (!str) return 200
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return h % 360
}

function formatShortDate(val) {
  if (!val) return ''
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-')
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const d = new Date(val)
  return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatWhen(val) {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  const today = new Date()
  const diff = Math.floor((today - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// 'live' if actively running (has a phase beyond setup), 'open' if in setup, 'completed' if done
function tournamentDisplayStatus(t) {
  if (t.status === 'completed') return 'completed'
  if (!t.phase || t.phase === 'setup') return 'open'
  return 'live'
}

// ── Brand mark ────────────────────────────────────────────────────────────────

function LandingMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" fill="color-mix(in srgb, var(--c-accent) 18%, transparent)" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="var(--c-accent)" strokeWidth="1.6" />
      <path d="M7 16 Q 16 6 25 16" stroke="var(--c-accent)" strokeWidth="1.6" fill="none" />
      <path d="M7 16 Q 16 26 25 16" stroke="var(--c-accent)" strokeWidth="1.6" fill="none" />
      <line x1="16" y1="7" x2="16" y2="25" stroke="var(--c-accent)" strokeWidth="1.6" />
    </svg>
  )
}

// ── User avatar ───────────────────────────────────────────────────────────────

function UserAvatar({ name, userId, size = 38 }) {
  const initials = (name || '?')
    .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
  const hue = hueFromString(userId || name || '')
  return (
    <div
      className="flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.32),
        background: `oklch(0.55 0.15 ${hue})`,
        fontSize: Math.round(size * 0.38), letterSpacing: '-0.5px',
      }}
    >
      {initials}
    </div>
  )
}

// ── Filter chip ───────────────────────────────────────────────────────────────

function FilterChip({ children, active, dot, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[11.5px] font-bold border transition-colors ${
        active
          ? 'bg-accent text-white border-accent'
          : 'bg-surface text-text border-line'
      }`}
    >
      {dot && !active && (
        <span
          className="dot-pulse w-1.5 h-1.5 rounded-full bg-success shrink-0"
        />
      )}
      {children}
    </button>
  )
}

// ── Verified badge ────────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <span
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-accent shrink-0"
      title="Verified league"
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  )
}

// ── Tournament row inside league card ─────────────────────────────────────────

function TournamentRow({ tournament, leagueId, navigate }) {
  const displayStatus = tournamentDisplayStatus(tournament)
  const isLive = displayStatus === 'live'
  const iconBg  = isLive ? 'bg-success/12' : 'bg-accent/10'
  const iconColor = isLive ? 'text-success' : 'text-accent'

  function handleClick() {
    if (leagueId) navigate(`/league/${leagueId}/tournament/${tournament.id}`)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left flex items-center gap-2.5 px-2 py-2.5 rounded-[10px] active:bg-alt/50 transition-colors"
    >
      <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
        {isLive ? <Play size={16} /> : <Calendar size={16} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-text truncate">
            {tournament.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10.5px] text-dim">{formatShortDate(tournament.date)}</span>
          {tournament.teams > 0 && (
            <>
              <span className="text-[10.5px] text-dim">·</span>
              <span className="text-[10.5px] text-dim">{tournament.teams} teams</span>
            </>
          )}
        </div>
      </div>

      {isLive ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/15 px-[9px] py-[5px] rounded-md tracking-[0.4px]">
          <span className="dot-pulse w-[5px] h-[5px] rounded-full bg-success" />
          LIVE
        </span>
      ) : (
        <span className="text-[10px] font-bold text-accent bg-accent/10 px-[9px] py-[5px] rounded-md tracking-[0.4px]">
          JOIN
        </span>
      )}
    </button>
  )
}

// ── Public league card ────────────────────────────────────────────────────────

function PublicLeagueCard({ league, navigate }) {
  const [open, setOpen] = useState(true)
  const hasLive = league.tournaments.some(t => tournamentDisplayStatus(t) === 'live')
  const hue = hueFromString(league.id || league.name)

  return (
    <div className="bg-surface border border-line rounded-[14px] mb-2.5 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-center gap-3 px-[14px] py-3 active:bg-alt/40 transition-colors"
      >
        <div
          className="w-11 h-11 rounded-[12px] flex items-center justify-center text-white shrink-0"
          style={{ background: `oklch(0.55 0.15 ${hue})` }}
        >
          <Trophy size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-bold text-text truncate">{league.name}</span>
            <VerifiedBadge />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-dim">
            <MapPin size={11} className="shrink-0" />
            <span>{league.city}</span>
            <span>·</span>
            <span>{league.playerCount} players</span>
          </div>
        </div>

        {hasLive ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/15 px-[9px] py-[5px] rounded-md tracking-[0.4px]">
            <span className="dot-pulse w-[5px] h-[5px] rounded-full bg-success" />
            LIVE
          </span>
        ) : (
          <ChevronDown
            size={16}
            className="text-dim shrink-0 transition-transform duration-150"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        )}
      </button>

      {open && (
        <div className="border-t border-line px-2.5 py-2">
          {league.tournaments.length === 0 ? (
            <div className="text-center text-[11px] text-dim py-3">
              No tournaments matching this filter
            </div>
          ) : (
            league.tournaments.map(t => (
              <TournamentRow
                key={t.id}
                tournament={t}
                leagueId={league.id}
                navigate={navigate}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ query }) {
  return (
    <div className="flex flex-col items-center py-9 px-5 bg-surface border border-dashed border-line rounded-[14px] text-center">
      <div className="w-12 h-12 rounded-full bg-alt flex items-center justify-center mb-2.5">
        <Search size={22} className="text-dim" />
      </div>
      <div className="text-[14px] font-bold text-text mb-1">
        Nothing found{query ? ` for "${query}"` : ''}
      </div>
      <div className="text-[11.5px] text-dim leading-relaxed">
        Try another city, league name, or clear the filter.
      </div>
    </div>
  )
}

// ── Free Play row ─────────────────────────────────────────────────────────────

function FreePlayRow({ session, isLast, onClick }) {
  // Map DB status to display status
  const status = session.status === 'finished' ? 'completed' : 'upcoming'

  const meta = {
    live:      { colorClass: 'text-success', bgClass: 'bg-success/14', label: 'LIVE',      Icon: Play     },
    upcoming:  { colorClass: 'text-free',    bgClass: 'bg-free/14',    label: 'UPCOMING',  Icon: Calendar },
    completed: { colorClass: 'text-dim',     bgClass: 'bg-alt',        label: 'COMPLETED', Icon: Check    },
  }[status]

  const { Icon } = meta

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-[14px] py-[11px] active:bg-alt/40 transition-colors ${isLast ? '' : 'border-b border-line'}`}
    >
      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${meta.bgClass} ${meta.colorClass}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-text truncate">{session.name || 'Free Play'}</div>
        <div className="text-[11px] text-dim mt-0.5">{formatWhen(session.created_at)}</div>
      </div>
      <span
        className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.5px] px-[7px] py-1 rounded-[5px] ${meta.bgClass} ${meta.colorClass}`}
      >
        {status === 'live' && <span className="dot-pulse w-[5px] h-[5px] rounded-full bg-success" />}
        {meta.label}
      </span>
    </button>
  )
}

// ── Free Play section (logged-in only) ────────────────────────────────────────

function FreePlaySection({ sessions, navigate }) {
  const [expanded, setExpanded] = useState(false)

  const ordered = [
    ...sessions.filter(s => s.status === 'live'),
    ...sessions.filter(s => s.status !== 'live' && s.status !== 'finished'),
    ...sessions.filter(s => s.status === 'finished'),
  ]
  const visible = expanded ? ordered : ordered.slice(0, 1)
  const hiddenCount = ordered.length - 1

  function handleCreate(e) {
    e.stopPropagation()
    navigate('/free-play/new')
  }

  return (
    <div className="px-4 pb-[18px]">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-free">Free Play</span>
        <span className="text-[10px] text-dim">{ordered.length} sessions</span>
      </div>

      <div className="bg-surface border border-line rounded-[14px] overflow-hidden">
        {/* Expandable header row */}
        <div
          role="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-3 px-[14px] py-3 cursor-pointer active:bg-alt/40 transition-colors border-b border-line"
          style={{ background: 'color-mix(in srgb, var(--c-free) 6%, transparent)' }}
        >
          <button
            onClick={handleCreate}
            aria-label="Create Free Play"
            className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 text-free border border-free/32 active:opacity-70 transition-opacity"
            style={{ background: 'color-mix(in srgb, var(--c-free) 18%, transparent)' }}
          >
            <Plus size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-text">Free Play sessions</div>
            <div className="text-[11px] text-dim mt-0.5">
              {expanded
                ? 'Tap the + to start a new one'
                : hiddenCount > 0
                  ? `Tap to see ${hiddenCount} more · + to create`
                  : 'Tap + to create'}
            </div>
          </div>
          <span
            className="inline-flex items-center justify-center w-6 h-6 text-dim transition-transform duration-150"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <ChevronDown size={16} />
          </span>
        </div>

        {visible.map((s, i) => (
          <FreePlayRow
            key={s.id}
            session={s}
            isLast={i === visible.length - 1}
            onClick={() => navigate(`/free-play/${s.id}`)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Landing page ──────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()
  const { session, profile } = useAuth()
  const isLoggedIn = !!session

  const [publicLeagues, setPublicLeagues] = useState([])
  const [freePlays,     setFreePlays]     = useState([])
  const [query,         setQuery]         = useState('')
  const [filter,        setFilter]        = useState('all')

  useEffect(() => {
    getPublicLeagues().then(setPublicLeagues).catch(console.error)
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      getFreePlays().then(setFreePlays).catch(console.error)
    }
  }, [isLoggedIn])

  // Flatten tournaments for chip counts (unfiltered)
  const allTourneys = useMemo(
    () => publicLeagues.flatMap(l => l.tournaments),
    [publicLeagues]
  )
  const liveCount = allTourneys.filter(t => tournamentDisplayStatus(t) === 'live').length
  const openCount = allTourneys.filter(t => tournamentDisplayStatus(t) === 'open').length

  // Apply search + status filter
  const visibleLeagues = useMemo(() => {
    const q = query.trim().toLowerCase()
    return publicLeagues.map(l => {
      let trs = l.tournaments
      if (filter === 'live') trs = trs.filter(t => tournamentDisplayStatus(t) === 'live')
      if (filter === 'open') trs = trs.filter(t => tournamentDisplayStatus(t) === 'open')
      if (q) {
        const leagueMatch = l.name.toLowerCase().includes(q) || l.city.toLowerCase().includes(q)
        if (!leagueMatch) trs = trs.filter(t => t.name.toLowerCase().includes(q))
      }
      return { ...l, tournaments: trs }
    }).filter(l => l.tournaments.length || (filter === 'all' && !q))
      .slice(0, 1)
  }, [publicLeagues, query, filter])

  const displayName = profile?.full_name?.split(' ')[0] || 'Player'

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <div className="flex-1 overflow-y-auto">

        {/* ── Brand bar ── */}
        <div className="flex items-center justify-between px-4 pt-[14px] pb-[6px]">
          <div className="flex items-center gap-2">
            <LandingMark size={26} />
            <span className="font-display text-[22px] text-text leading-none" style={{ letterSpacing: 1.5 }}>
              ARENIX
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => navigate('/settings')}
                  className="relative w-[38px] h-[38px] flex items-center justify-center rounded-[12px] bg-alt text-text active:opacity-70 transition-opacity"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="active:opacity-70 transition-opacity"
                  aria-label="Profile"
                >
                  <UserAvatar name={profile?.full_name} userId={profile?.id} size={38} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-3 py-2 rounded-[10px] text-[12px] font-bold text-text bg-transparent active:opacity-70 transition-opacity"
                >
                  Log in
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="px-[14px] py-2 rounded-[10px] text-[12px] font-bold text-white bg-accent active:opacity-80 transition-opacity"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Hero ── */}
        <div className="px-4 pt-1 pb-4">
          <div className="font-display text-[32px] leading-[1.05] text-text mb-2" style={{ letterSpacing: 0.5 }}>
            {isLoggedIn ? (
              <>
                WELCOME BACK,<br />
                <span className="text-accent">{displayName.toUpperCase()}.</span>
              </>
            ) : (
              <>
                BEACH VOLLEY,<br />
                <span className="text-accent">SCORED LIVE.</span>
              </>
            )}
          </div>
          <div className="text-[12.5px] text-dim leading-relaxed">
            {isLoggedIn
              ? 'Jump back in, or browse open tournaments near you.'
              : 'Browse public leagues and open tournaments — no account needed.'}
          </div>
        </div>

        {/* ── Search + filter chips ── */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 bg-surface border border-line rounded-[12px] px-3 py-[10px] mb-2.5">
            <Search size={15} className="text-dim shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search leagues, cities, tournaments…"
              className="flex-1 bg-transparent border-0 text-[13px] text-text placeholder:text-dim outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-dim p-0.5 active:opacity-70">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-1.5">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              All <span className="text-[10px] font-bold opacity-85">{allTourneys.length}</span>
            </FilterChip>
            <FilterChip active={filter === 'live'} dot onClick={() => setFilter('live')}>
              Live <span className="text-[10px] font-bold opacity-85">{liveCount}</span>
            </FilterChip>
            <FilterChip active={filter === 'open'} onClick={() => setFilter('open')}>
              Open <span className="text-[10px] font-bold opacity-85">{openCount}</span>
            </FilterChip>
          </div>
        </div>

        {/* ── Featured league section ── */}
        <div className="flex items-baseline justify-between px-4 pt-2 pb-0">
          <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-accent">
            Featured league
          </span>
          <span className="text-[10px] text-dim tracking-[0.4px]">
            {publicLeagues.length} total · worldwide
          </span>
        </div>

        <div className="px-4 pt-2 pb-[18px]">
          {visibleLeagues.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            visibleLeagues.map(l => (
              <PublicLeagueCard key={l.id} league={l} navigate={navigate} />
            ))
          )}
        </div>

        {/* ── Free Play section (logged-in only) ── */}
        {isLoggedIn && freePlays.length > 0 && (
          <FreePlaySection sessions={freePlays} navigate={navigate} />
        )}

        {/* ── Auth nudge footer (logged-out only) ── */}
        {!isLoggedIn && (
          <div className="px-4 pb-6">
            <div
              className="rounded-[14px] border p-4 text-center"
              style={{
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--c-accent) 10%, transparent), var(--c-surface))',
                borderColor: 'color-mix(in srgb, var(--c-accent) 25%, transparent)',
              }}
            >
              <div className="font-display text-[18px] text-text leading-tight mb-1">
                READY TO PLAY?
              </div>
              <div className="text-[11.5px] text-dim mb-3 leading-relaxed">
                Create an account to join tournaments, track your ELO and follow your league.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/login')}
                  className="flex-1 py-2.5 rounded-[12px] text-[12px] font-bold text-accent border border-line bg-surface active:opacity-80 transition-opacity"
                >
                  Log in
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="flex-1 py-2.5 rounded-[12px] text-[12px] font-bold text-white bg-accent active:opacity-80 transition-opacity"
                >
                  Create account
                </button>
              </div>
            </div>
            <div className="text-center text-[10px] text-dim mt-3.5 tracking-[0.5px]">
              Arenix · Beach volley, anywhere
            </div>
          </div>
        )}

        {/* Breathing room when logged in */}
        {isLoggedIn && <div className="h-6" />}
      </div>
    </div>
  )
}
