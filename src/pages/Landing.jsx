import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, MapPin, Trophy, Play, Calendar,
  ChevronDown, Plus, Bell, Check,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getPublicLeagues, getMyLeagues, createLeague } from '../services/leagueService'
import { joinLeague } from '../services/inviteService'
import { getFreePlays } from '../services/freePlayService'
import {
  getMyNotifications,
  markAllRead,
  subscribeToNotifications,
  isNotifAllowed,
} from '../services/notificationService'
import NotificationPanel from '../components/NotificationPanel'
import NotificationToast from '../components/NotificationToast'

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
  const isLive      = displayStatus === 'live'
  const isCompleted = displayStatus === 'completed'
  const iconBg    = isLive ? 'bg-success/12' : isCompleted ? 'bg-alt'      : 'bg-accent/10'
  const iconColor = isLive ? 'text-success'  : isCompleted ? 'text-dim'    : 'text-accent'

  function handleClick() {
    if (leagueId) navigate(`/league/${leagueId}/tournament/${tournament.id}`)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left flex items-center gap-2.5 px-2 py-2.5 rounded-[10px] active:bg-alt/50 transition-colors"
    >
      <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
        {isLive ? <Play size={16} /> : isCompleted ? <Check size={16} /> : <Calendar size={16} />}
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
      ) : isCompleted ? (
        <span className="text-[10px] font-bold text-dim bg-alt px-[9px] py-[5px] rounded-md tracking-[0.4px]">
          DONE
        </span>
      ) : (
        <span className="text-[10px] font-bold text-accent bg-accent/10 px-[9px] py-[5px] rounded-md tracking-[0.4px]">
          OPEN
        </span>
      )}
    </button>
  )
}

// ── Public league card ────────────────────────────────────────────────────────

function PublicLeagueCard({ league, navigate, isJoined, canJoin, onJoin }) {
  const [open, setOpen] = useState(true)
  const hasLive = league.tournaments.some(t => tournamentDisplayStatus(t) === 'live')
  const hue = hueFromString(league.id || league.name)

  return (
    <div className={`bg-surface border rounded-[14px] mb-2.5 overflow-hidden ${isJoined ? 'border-success/30' : 'border-line'}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}
        className="w-full text-left flex items-center gap-3 px-[14px] py-3 active:bg-alt/40 transition-colors cursor-pointer"
      >
        <div
          className="w-11 h-11 rounded-[12px] flex items-center justify-center text-white shrink-0"
          style={{ background: `oklch(0.55 0.15 ${hue})` }}
        >
          <Trophy size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[14px] font-bold text-text truncate">{league.name}</span>
            <VerifiedBadge />
            {isJoined ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-success bg-success/15 px-[6px] py-[3px] rounded-md tracking-[0.4px]">
                <Check size={8} />
                JOINED
              </span>
            ) : canJoin ? (
              <button
                onClick={e => { e.stopPropagation(); onJoin() }}
                className="inline-flex items-center gap-[3px] text-[9px] font-bold text-accent bg-accent/12 border border-accent/25 px-[6px] py-[3px] rounded-md tracking-[0.4px] active:opacity-70 transition-opacity"
              >
                <span className="text-[11px] leading-none">+</span> JOIN
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-dim">
            <MapPin size={11} className="shrink-0" />
            <span>{league.city}</span>
            <span>·</span>
            <span>{league.playerCount} players</span>
          </div>
        </div>

        {hasLive ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/15 px-[9px] py-[5px] rounded-md tracking-[0.4px] shrink-0">
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
      </div>

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

// ── My League row ─────────────────────────────────────────────────────────────

function MyLeagueRow({ league, isSuperAdmin, navigate }) {
  const hue = hueFromString(league.id || league.name)
  const isAdmin = isSuperAdmin || league.myRoles?.includes('admin') || league.myRole === 'admin'

  function handleTournamentCreate(e) {
    e.stopPropagation()
    navigate(`/league/${league.id}/tournament/new`)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/league/${league.id}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/league/${league.id}`)}
      className="flex items-center gap-3 px-[14px] py-[11px] cursor-pointer active:bg-alt/40 transition-colors border-b border-line last:border-b-0"
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white shrink-0"
        style={{ background: `oklch(0.55 0.15 ${hue})` }}
      >
        <Trophy size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-text truncate">{league.name}</div>
        <div className="text-[11px] text-dim mt-0.5 capitalize">{league.myRole || 'member'}</div>
      </div>
      {isAdmin && (
        <button
          onClick={handleTournamentCreate}
          aria-label={`New tournament in ${league.name}`}
          className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 text-accent bg-accent/10 border border-accent/20 active:opacity-70 transition-opacity"
        >
          <Plus size={15} />
        </button>
      )}
    </div>
  )
}

// ── My Leagues section (logged-in only) ───────────────────────────────────────

function MyLeaguesSection({ leagues, loading, isSuperAdmin, canCreateLeague, navigate, onCreateLeague }) {
  const [expanded, setExpanded] = useState(true)
  const canCreate = isSuperAdmin || canCreateLeague

  function handleCreateLeague(e) {
    e.stopPropagation()
    onCreateLeague()
  }

  let hint
  if (loading) hint = 'Loading…'
  else if (expanded) hint = canCreate ? 'Tap + to create a new league' : 'Your active leagues'
  else hint = leagues.length > 0 ? `Tap to see ${leagues.length} · ${canCreate ? '+ to create' : ''}`.trim().replace(/ ·\s*$/, '') : (canCreate ? 'Tap + to create a new league' : 'No leagues yet')

  return (
    <div className="px-4 pb-[18px]">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-accent">My Leagues</span>
        <span className="text-[10px] text-dim">{leagues.length} leagues</span>
      </div>

      <div className="bg-surface border border-line rounded-[14px] overflow-hidden">
        {/* Collapsible header row */}
        <div
          role="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-3 px-[14px] py-3 cursor-pointer active:bg-alt/40 transition-colors border-b border-line"
          style={{ background: 'color-mix(in srgb, var(--c-accent) 6%, transparent)' }}
        >
          {canCreate ? (
            <button
              onClick={handleCreateLeague}
              aria-label="Create League"
              className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 text-accent border border-accent/30 active:opacity-70 transition-opacity"
              style={{ background: 'color-mix(in srgb, var(--c-accent) 18%, transparent)' }}
            >
              <Plus size={20} />
            </button>
          ) : (
            <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 text-accent bg-accent/10">
              <Trophy size={20} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-text">My leagues</div>
            <div className="text-[11px] text-dim mt-0.5">{hint}</div>
          </div>
          <span
            className="inline-flex items-center justify-center w-6 h-6 text-dim transition-transform duration-150"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <ChevronDown size={16} />
          </span>
        </div>

        {expanded && (
          leagues.length === 0 ? (
            <div className="text-center text-[11px] text-dim py-5 px-4">
              {loading ? 'Loading your leagues…' : "You haven't joined any leagues yet."}
            </div>
          ) : (
            leagues.map(l => (
              <MyLeagueRow key={l.id} league={l} isSuperAdmin={isSuperAdmin} navigate={navigate} />
            ))
          )
        )}
      </div>
    </div>
  )
}

// ── Create League modal ────────────────────────────────────────────────────────

function CreateLeagueModal({ onClose, onCreated }) {
  const [name,       setName]       = useState('')
  const [location,   setLocation]   = useState('')
  const [visibility, setVisibility] = useState('public')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const league = await createLeague({
        name:       name.trim(),
        location:   location.trim(),
        visibility,
        season:     String(new Date().getFullYear()),
      })
      onCreated(league)
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[440px] bg-surface rounded-t-2xl p-6 pb-8 flex flex-col gap-5">

        <div className="flex items-center justify-between">
          <span className="font-display text-[20px] text-text leading-none tracking-wide">NEW LEAGUE</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-alt text-dim active:opacity-70 transition-opacity"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-dim uppercase tracking-wide">
              League name <span className="text-error">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Miami Beach League"
              autoFocus
              className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-dim uppercase tracking-wide">
              Location <span className="text-[10px] font-normal normal-case text-dim">(optional)</span>
            </label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="City, Country"
              className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-[14px] text-text placeholder:text-dim focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-dim uppercase tracking-wide">Visibility</label>
            <div className="flex gap-2">
              {['public', 'private'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-colors capitalize ${
                    visibility === v
                      ? 'bg-accent text-white border-accent'
                      : 'bg-bg text-dim border-line'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-[12px] text-error bg-error/10 border border-error/20 rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="w-full py-3 rounded-xl bg-accent text-white font-bold text-[14px] disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Creating…' : 'Create League'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Join League confirmation modal ────────────────────────────────────────────

function JoinConfirmModal({ league, onClose, onConfirm, joining }) {
  const hue = hueFromString(league.id || league.name)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[440px] bg-surface rounded-t-2xl p-6 pb-8 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-[20px] text-text leading-none tracking-wide">JOIN LEAGUE</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-alt text-dim active:opacity-70 transition-opacity"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 bg-alt rounded-[12px] px-4 py-3">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white shrink-0"
            style={{ background: `oklch(0.55 0.15 ${hue})` }}
          >
            <Trophy size={18} />
          </div>
          <div>
            <div className="text-[14px] font-bold text-text">{league.name}</div>
            {league.city && <div className="text-[11px] text-dim mt-0.5">{league.city}</div>}
          </div>
        </div>

        <div className="text-[12.5px] text-dim leading-relaxed">
          You'll be added as a member and will be able to participate in tournaments.
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-[13px] font-bold text-dim bg-alt border border-line active:opacity-70 transition-opacity"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={joining}
            className="flex-1 py-3 rounded-xl bg-accent text-white font-bold text-[14px] disabled:opacity-50 transition-opacity"
          >
            {joining ? 'Joining…' : 'Join League'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Landing page ──────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()
  const { session, profile, loading: authLoading, isSuperAdmin, canCreateLeague } = useAuth()
  const isLoggedIn = !!session

  const [publicLeagues,    setPublicLeagues]    = useState([])
  const [freePlays,        setFreePlays]        = useState([])
  const [myLeagues,        setMyLeagues]        = useState([])
  const [myLeaguesLoading, setMyLeaguesLoading] = useState(false)
  const [showCreateLeague, setShowCreateLeague] = useState(false)
  const [query,            setQuery]            = useState('')
  const [filter,           setFilter]           = useState('all')
  const [showNotifs,       setShowNotifs]       = useState(false)
  const [notifications,    setNotifications]    = useState([])
  const [toastNotif,       setToastNotif]       = useState(null)
  const [joinPending,      setJoinPending]      = useState(null)
  const [joining,          setJoining]          = useState(false)

  useEffect(() => {
    getPublicLeagues().then(setPublicLeagues).catch(console.error)
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    getFreePlays().then(setFreePlays).catch(console.error)
    getMyNotifications().then(setNotifications).catch(console.error)
    setMyLeaguesLoading(true)
    getMyLeagues()
      .then(setMyLeagues)
      .catch(console.error)
      .finally(() => setMyLeaguesLoading(false))
  }, [isLoggedIn])

  useEffect(() => {
    if (!profile?.id) return
    const unsubscribe = subscribeToNotifications(profile.id, newNotif => {
      setNotifications(prev => [newNotif, ...prev])
      if (isNotifAllowed(newNotif.type, profile?.notification_prefs)) {
        setToastNotif(newNotif)
      }
    })
    return () => unsubscribe?.()
  }, [profile?.id, profile?.notification_prefs])

  const joinedLeagueIds = useMemo(() => new Set(myLeagues.map(l => l.id)), [myLeagues])

  // Only show My Leagues section for admins / league creators
  const showMyLeagues = isLoggedIn && (
    isSuperAdmin || canCreateLeague || myLeagues.some(l => l.myRole === 'admin')
  )

  // Flatten tournaments for chip counts (unfiltered)
  const allTourneys = useMemo(
    () => publicLeagues.flatMap(l => l.tournaments),
    [publicLeagues]
  )
  const liveCount = allTourneys.filter(t => tournamentDisplayStatus(t) === 'live').length
  const openCount = allTourneys.filter(t => tournamentDisplayStatus(t) === 'open').length

  // Apply search + status filter, pin joined leagues to top
  const visibleLeagues = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = publicLeagues.map(l => {
      let trs = l.tournaments
      if (filter === 'live') trs = trs.filter(t => tournamentDisplayStatus(t) === 'live')
      if (filter === 'open') trs = trs.filter(t => tournamentDisplayStatus(t) === 'open')
      if (q) {
        const leagueMatch = l.name.toLowerCase().includes(q) || l.city.toLowerCase().includes(q)
        if (!leagueMatch) trs = trs.filter(t => t.name.toLowerCase().includes(q))
      }
      return { ...l, tournaments: trs }
    }).filter(l => l.tournaments.length || (filter === 'all' && !q))
    filtered.sort((a, b) => (joinedLeagueIds.has(b.id) ? 1 : 0) - (joinedLeagueIds.has(a.id) ? 1 : 0))
    return filtered.slice(0, 1)
  }, [publicLeagues, query, filter, joinedLeagueIds])

  const displayName   = profile?.full_name?.split(' ')[0] || 'Player'
  const visibleNotifs = notifications.filter(n => isNotifAllowed(n.type, profile?.notification_prefs))
  const unreadCount   = visibleNotifs.filter(n => !n.read).length

  async function handleMarkAllRead() {
    await markAllRead()
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function handleRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function handleLeagueCreated(newLeague) {
    setMyLeagues(prev => [{ ...newLeague, myRole: 'admin', myRoles: ['admin'] }, ...prev])
    setShowCreateLeague(false)
    navigate(`/league/${newLeague.id}`)
  }

  async function handleJoinConfirm() {
    if (!joinPending) return
    setJoining(true)
    try {
      await joinLeague(joinPending.id)
      setMyLeagues(prev => [...prev, { ...joinPending, myRole: 'player', myRoles: ['player'] }])
      setJoinPending(null)
    } catch (err) {
      console.error(err)
    } finally {
      setJoining(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-screen bg-bg items-center justify-center">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
    <NotificationToast notification={toastNotif} onDismiss={() => setToastNotif(null)} />
    <NotificationPanel
      isOpen={showNotifs}
      onClose={() => setShowNotifs(false)}
      notifications={visibleNotifs}
      onMarkAllRead={handleMarkAllRead}
      onRead={handleRead}
    />
    {showCreateLeague && (
      <CreateLeagueModal
        onClose={() => setShowCreateLeague(false)}
        onCreated={handleLeagueCreated}
      />
    )}
    {joinPending && (
      <JoinConfirmModal
        league={joinPending}
        onClose={() => setJoinPending(null)}
        onConfirm={handleJoinConfirm}
        joining={joining}
      />
    )}

    <div className="screen bg-bg text-text">
      <div className="screen__top bg-bg">

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
                  onClick={() => setShowNotifs(v => !v)}
                  className="relative w-[38px] h-[38px] flex items-center justify-center rounded-[12px] bg-alt text-text active:opacity-70 transition-opacity"
                  aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-error text-white text-[9px] font-bold px-0.5 leading-none">
                      {unreadCount}
                    </span>
                  )}
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
      </div>

      <main className="screen__body">

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

        {/* ── My Leagues section (admins / league creators only) ── */}
        {showMyLeagues && (
          <MyLeaguesSection
            leagues={myLeagues}
            loading={myLeaguesLoading}
            isSuperAdmin={isSuperAdmin}
            canCreateLeague={canCreateLeague}
            navigate={navigate}
            onCreateLeague={() => setShowCreateLeague(true)}
          />
        )}

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
              <PublicLeagueCard
                key={l.id}
                league={l}
                navigate={navigate}
                isJoined={joinedLeagueIds.has(l.id)}
                canJoin={isLoggedIn && !joinedLeagueIds.has(l.id)}
                onJoin={() => setJoinPending(l)}
              />
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
      </main>
    </div>
    </>
  )
}
