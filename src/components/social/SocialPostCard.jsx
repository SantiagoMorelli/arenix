/**
 * SocialPostCard — renders one post of the social league feed.
 *
 * Every post kind shares the same shell (header · body · optional action) so
 * the feed reads as one stream. Post shapes come from lib/socialFeed.js.
 */
import {
  Trophy, Flame, Zap, TrendingUp, Percent, Sigma, Crown,
  ChevronRight, Swords, Medal, Radio,
} from 'lucide-react'
import SocialAvatar from './SocialAvatar'
import { relativeTime } from '../../lib/socialFeed'

const SPOTLIGHT_ICONS = {
  hotHand:      Zap,
  onFire:       Flame,
  bestWinPct:   Percent,
  mostImproved: TrendingUp,
  pointDiff:    Sigma,
  mostTitles:   Trophy,
}

// Rotating accents keep consecutive spotlight cards from looking identical
const SPOTLIGHT_ACCENTS = {
  hotHand:      { text: 'text-soc-pink',   bg: 'bg-soc-pink/12',   glow: 'bg-soc-pink/25'   },
  onFire:       { text: 'text-soc-lime',   bg: 'bg-soc-lime/12',   glow: 'bg-soc-lime/25'   },
  bestWinPct:   { text: 'text-soc-cyan',   bg: 'bg-soc-cyan/12',   glow: 'bg-soc-cyan/25'   },
  mostImproved: { text: 'text-soc-lime',   bg: 'bg-soc-lime/12',   glow: 'bg-soc-lime/25'   },
  pointDiff:    { text: 'text-soc-violet', bg: 'bg-soc-violet/15', glow: 'bg-soc-violet/30' },
  mostTitles:   { text: 'text-soc-cyan',   bg: 'bg-soc-cyan/12',   glow: 'bg-soc-cyan/25'   },
}

const DEFAULT_ACCENT = { text: 'text-soc-lime', bg: 'bg-soc-lime/12', glow: 'bg-soc-lime/25' }

/** Overlapping avatar cluster for a team. */
function AvatarStack({ playerIds, playersById, size = 'sm', ring = 'none' }) {
  const ids = (playerIds || []).slice(0, 3)
  if (!ids.length) return null
  // Tighter faces overlap less, otherwise the initials of the first one vanish
  const overlap = size === 'xs' ? '-space-x-1.5' : '-space-x-2.5'
  return (
    <div className={`flex ${overlap} shrink-0`}>
      {ids.map(pid => (
        <div key={pid} className="rounded-full ring-2 ring-soc-surface">
          <SocialAvatar player={playersById.get(pid)} size={size} ring={ring} />
        </div>
      ))}
    </div>
  )
}

/** Shared card chrome. */
function PostShell({ children, onClick, className = '' }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`w-full text-left block rounded-[22px] border border-soc-line bg-soc-surface overflow-hidden mb-3.5 ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
    >
      {children}
    </Tag>
  )
}

function PostHeader({ avatar, title, subtitle, ts, badge }) {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
      {avatar}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-soc-text truncate">{title}</span>
          {badge}
        </div>
        {subtitle && <div className="text-[11px] text-soc-dim truncate">{subtitle}</div>}
      </div>
      {ts != null && (
        <span className="text-[11px] text-soc-dim shrink-0">{relativeTime(ts)}</span>
      )}
    </div>
  )
}

// ─── Post kinds ───────────────────────────────────────────────────────────────

function LivePost({ post, onOpenTournament }) {
  return (
    <PostShell
      onClick={() => onOpenTournament(post.tournamentId)}
      className="border-soc-lime/40"
    >
      <div className="relative px-4 py-4 bg-gradient-to-br from-soc-lime/15 via-soc-surface to-soc-surface">
        <div className="absolute -top-10 -right-6 w-36 h-36 rounded-full bg-soc-lime/20 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="dot-pulse w-1.5 h-1.5 rounded-full bg-soc-lime" />
            <span className="text-[10px] font-bold uppercase tracking-[2px] text-soc-lime">Live now</span>
          </div>
          <div className="font-soc text-[26px] leading-[1.05] text-soc-text mb-1.5 break-words">
            {post.tournamentName}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-soc-dim">
            <Radio size={12} className="text-soc-lime" />
            {post.teamCount} teams · {post.playerCount} players
            <ChevronRight size={13} className="text-soc-lime ml-auto" />
          </div>
        </div>
      </div>
    </PostShell>
  )
}

function ChampionPost({ post, playersById, onOpenTournament }) {
  return (
    <PostShell onClick={() => onOpenTournament(post.tournamentId)}>
      <PostHeader
        avatar={<AvatarStack playerIds={post.playerIds} playersById={playersById} size="sm" />}
        title={post.playerNames || post.teamName}
        subtitle={post.tournamentName}
        ts={post.ts}
      />
      <div className="relative mx-3 mb-3 rounded-[16px] overflow-hidden bg-gradient-to-br from-soc-violet/35 via-soc-alt to-soc-alt px-4 py-6">
        <div className="absolute -bottom-12 -right-8 w-40 h-40 rounded-full bg-soc-cyan/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center text-center gap-1">
          <Crown size={22} className="text-soc-lime" />
          <div className="text-[10px] font-bold uppercase tracking-[2.5px] text-soc-lime">Champions</div>
          <div className="font-soc text-[24px] leading-[1.1] text-soc-text break-words">
            {post.teamName}
          </div>
          <div className="text-[11px] text-soc-dim">
            won {post.tournamentName} · {post.teamCount} teams
          </div>
        </div>
      </div>
    </PostShell>
  )
}

function MatchPost({ post, playersById, onOpenTournament }) {
  const winner = post.winnerSide === 1 ? post.team1 : post.team2
  const loser  = post.winnerSide === 1 ? post.team2 : post.team1
  const wScore = post.winnerSide === 1 ? post.score1 : post.score2
  const lScore = post.winnerSide === 1 ? post.score2 : post.score1

  const rows = [
    { team: winner, score: wScore, won: true },
    { team: loser,  score: lScore, won: false },
  ]

  const sets = Array.isArray(post.sets) ? post.sets : null

  return (
    <PostShell onClick={() => onOpenTournament(post.tournamentId)}>
      <PostHeader
        avatar={<AvatarStack playerIds={winner.playerIds} playersById={playersById} size="sm" ring="lime" />}
        title={winner.playerNames || winner.name}
        subtitle={post.tournamentName}
        ts={post.ts}
        badge={
          <span className="shrink-0 px-1.5 py-px rounded-full bg-soc-lime/15 text-soc-lime text-[9px] font-bold uppercase tracking-wide">
            Win
          </span>
        }
      />

      {/* Scoreboard "image" — the visual payload of the post */}
      <div className="mx-3 mb-3 rounded-[16px] bg-soc-alt/70 border border-soc-line/60 px-4 py-3.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 ${i === 0 ? 'mb-2.5' : ''}`}
          >
            <AvatarStack playerIds={row.team.playerIds} playersById={playersById} size="xs" />
            <span className={`flex-1 min-w-0 truncate text-[13px] ${row.won ? 'font-bold text-soc-text' : 'text-soc-dim'}`}>
              {row.team.playerNames || row.team.name}
            </span>
            <span className={`font-soc text-[30px] leading-none tabular-nums ${row.won ? 'text-soc-lime' : 'text-soc-dim'}`}>
              {row.score ?? 0}
            </span>
          </div>
        ))}

        {sets?.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-soc-line/60 flex-wrap">
            <Swords size={11} className="text-soc-dim" />
            {sets.map((s, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded-md bg-soc-bg/60 text-[10px] font-semibold text-soc-dim tabular-nums"
              >
                {s.s1 ?? 0}-{s.s2 ?? 0}
              </span>
            ))}
          </div>
        )}
      </div>
    </PostShell>
  )
}

function SpotlightPost({ post, playersById, onOpenPlayer }) {
  const { tile } = post
  const Icon   = SPOTLIGHT_ICONS[tile.id] || Zap
  const accent = SPOTLIGHT_ACCENTS[tile.id] || DEFAULT_ACCENT
  const player = playersById.get(tile.playerId)

  return (
    <PostShell onClick={player ? () => onOpenPlayer(player) : undefined}>
      <div className="relative px-4 py-4 overflow-hidden">
        <div className={`absolute -top-12 -right-10 w-40 h-40 rounded-full ${accent.glow} blur-3xl pointer-events-none`} />
        <div className="relative flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[2px] ${accent.text} mb-1.5`}>
              <Icon size={12} />
              {tile.label}
            </div>
            <div className={`font-soc text-[40px] leading-[0.9] ${accent.text}`}>
              {tile.primary}
            </div>
            <div className="text-[11px] text-soc-dim mt-1.5">{tile.secondary}</div>
          </div>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <SocialAvatar player={player} size="lg" ring="dim" />
            <span className="text-[11px] font-semibold text-soc-text max-w-[76px] truncate text-center">
              {tile.playerName}
            </span>
          </div>
        </div>
      </div>
    </PostShell>
  )
}

function RecordPost({ post, playersById, onOpenPlayer, onOpenTournament }) {
  const player = post.playerId ? playersById.get(post.playerId) : null
  const onClick =
    player            ? () => onOpenPlayer(player) :
    post.tournamentId ? () => onOpenTournament(post.tournamentId) :
    undefined

  return (
    <PostShell onClick={onClick} className="bg-soc-bg border-dashed">
      <div className="px-4 py-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-[14px] bg-soc-alt flex items-center justify-center shrink-0">
          <Medal size={18} className="text-soc-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[2px] text-soc-cyan mb-1">
            {post.label}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-soc text-[26px] leading-none text-soc-text tabular-nums">
              {post.headline}
            </span>
            <span className="text-[12px] font-semibold text-soc-text truncate">
              {post.primaryLabel}
            </span>
          </div>
          <div className="text-[11px] text-soc-dim truncate mt-0.5">{post.detail}</div>
        </div>
      </div>
    </PostShell>
  )
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export default function SocialPostCard({ post, playersById, onOpenTournament, onOpenPlayer }) {
  switch (post.kind) {
    case 'live':
      return <LivePost post={post} onOpenTournament={onOpenTournament} />
    case 'champion':
      return <ChampionPost post={post} playersById={playersById} onOpenTournament={onOpenTournament} />
    case 'match':
      return <MatchPost post={post} playersById={playersById} onOpenTournament={onOpenTournament} />
    case 'spotlight':
      return <SpotlightPost post={post} playersById={playersById} onOpenPlayer={onOpenPlayer} />
    case 'record':
      return <RecordPost post={post} playersById={playersById} onOpenPlayer={onOpenPlayer} onOpenTournament={onOpenTournament} />
    default:
      return null
  }
}
