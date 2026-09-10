/**
 * SocialPlayerSheet — player detail sheet for the social league view.
 *
 * Mirrors the mechanics of ui-new's AppSheet (body portal, backdrop, drag
 * handle) but carries the social palette, so the experimental view never
 * borrows chrome from the handoff design. All data comes from the precomputed
 * insights object — no fetching.
 */
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Flame, Trophy, Percent, Target } from 'lucide-react'
import SocialAvatar from './SocialAvatar'
import { relativeTime } from '../../lib/socialFeed'

const RECENT_MATCHES = 5

function Stat(props) {
  // Destructured in the body, not the signature: the flat config has no
  // react plugin, so a component-valued *argument* reads as unused.
  const { Icon, value, label, accent = 'text-soc-text' } = props
  return (
    <div className="flex-1 rounded-[16px] bg-soc-alt/60 px-3 py-3 text-center">
      <Icon size={13} className={`${accent} mx-auto mb-1.5`} />
      <div className={`font-soc text-[22px] leading-none ${accent}`}>{value}</div>
      <div className="text-[10px] text-soc-dim mt-1 uppercase tracking-wide">{label}</div>
    </div>
  )
}

export default function SocialPlayerSheet({ open, onClose, player, league, insights, rank }) {
  const teamNames = useMemo(() => {
    const map = new Map()
    for (const t of league?.tournaments || []) {
      for (const team of t.teams || []) map.set(team.id, team.name)
    }
    return map
  }, [league])

  if (!open || !player) return null

  const streak  = insights?.streaks?.get(player.id) || null
  const titles  = insights?.champions?.titles?.find(t => t.playerId === player.id) || null
  const entries = (insights?.matchIndex?.get(player.id) || []).slice(-RECENT_MATCHES).reverse()

  const name = player.displayName || player.name

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end font-sans">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-[151] w-full bg-soc-surface text-soc-text rounded-t-[28px] px-4 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto shadow-2xl border-t border-soc-line">
        <div className="w-9 h-1 bg-soc-line rounded-full mx-auto mb-4" />

        <div className="flex items-center gap-3.5 mb-4">
          <SocialAvatar player={player} size="lg" ring={streak?.current >= 2 ? 'hot' : 'dim'} />
          <div className="flex-1 min-w-0">
            <div className="font-soc text-[22px] leading-tight truncate">{name}</div>
            <div className="text-[11px] text-soc-dim mt-0.5">
              {rank ? `#${rank} in the league · ` : ''}{player.elo ?? 1000} ELO
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-soc-alt flex items-center justify-center text-soc-dim cursor-pointer border-0 shrink-0"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <Stat
            Icon={Target}
            value={`${streak?.wins ?? 0}-${streak?.losses ?? 0}`}
            label="record"
          />
          <Stat
            Icon={Percent}
            value={`${Math.round((streak?.winPct ?? 0) * 100)}%`}
            label="win rate"
            accent="text-soc-cyan"
          />
          <Stat
            Icon={Flame}
            value={streak?.current ?? 0}
            label="streak"
            accent={streak?.current >= 2 ? 'text-soc-lime' : 'text-soc-text'}
          />
          <Stat
            Icon={Trophy}
            value={titles?.titles ?? 0}
            label="titles"
            accent="text-soc-violet"
          />
        </div>

        {entries.length > 0 && (
          <>
            <div className="text-[10px] font-bold uppercase tracking-[2px] text-soc-dim mb-2 px-1">
              Recent matches
            </div>
            <div className="flex flex-col gap-2">
              {entries.map((e, i) => {
                // Scores are stored team1-first; flip them so the sheet always
                // reads from this player's side.
                const isTeam1 = e.match.team1 === e.teamId
                const mine    = (isTeam1 ? e.match.score1 : e.match.score2) ?? 0
                const theirs  = (isTeam1 ? e.match.score2 : e.match.score1) ?? 0
                return (
                <div
                  key={`${e.match.id}-${i}`}
                  className="flex items-center gap-3 rounded-[16px] bg-soc-alt/50 px-3.5 py-2.5"
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      e.won ? 'bg-soc-lime/15 text-soc-lime' : 'bg-soc-pink/15 text-soc-pink'
                    }`}
                  >
                    {e.won ? 'W' : 'L'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-soc-text truncate">
                      vs {teamNames.get(e.opponentTeamId) || 'Unknown'}
                    </div>
                    <div className="text-[10px] text-soc-dim truncate">{e.tournamentName}</div>
                  </div>
                  <span className="text-[12px] font-semibold text-soc-dim tabular-nums shrink-0">
                    {mine}-{theirs}
                  </span>
                  <span className="text-[10px] text-soc-dim shrink-0 w-8 text-right">
                    {relativeTime(e.ts)}
                  </span>
                </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
