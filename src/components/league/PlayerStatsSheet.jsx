import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Flame } from 'lucide-react'
import { AppSheet } from '../ui-new'
import { playerAvatarStyle, playerInitials } from '../../lib/utils'
import { computePlayerCard } from '../../lib/playerCard'
import EloSparkline from './EloSparkline'
import PlayerCard from './PlayerCard'

/**
 * Bottom sheet with a player's league stats: card, ELO trend and streaks.
 * All data comes from the precomputed insights object — no fetching.
 */
export default function PlayerStatsSheet({ open, onClose, player, league, insights, isGuest = false }) {
  const navigate = useNavigate()

  // Same ranking rule as RankingsTab (elo desc) — for the card's rank/tier
  const rankedPlayers = useMemo(
    () => [...(league?.players || [])].sort((a, b) => (b.elo ?? 1000) - (a.elo ?? 1000)),
    [league]
  )

  if (!player) return null

  const streak  = insights.streaks.get(player.id) || { wins: 0, losses: 0, winPct: 0, current: 0, best: 0, last5: [] }
  const card    = computePlayerCard(player, insights, rankedPlayers)
  const label   = player.displayName || player.name
  const curve   = (insights.timelines.byPlayer.get(player.id) || []).map(pt => pt.elo)

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={label}
      icon={
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[14px] font-semibold text-white"
          style={playerAvatarStyle(player.id || player.name)}
        >
          {playerInitials(label)}
        </div>
      }
    >
      {/* ── Player card ── */}
      <div className="mb-3">
        <PlayerCard player={player} card={card} />
      </div>

      {/* ── Form: ELO trend + streaks ── */}
      {(curve.length >= 2 || streak.current >= 2 || streak.best >= 2) && (
        <div className="bg-bg border border-line rounded-xl px-3 py-2.5 mb-3 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1 text-[11px] text-dim min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wide">Form</span>
            {streak.current >= 2 && (
              <span className="flex items-center gap-1 text-success font-semibold">
                <Flame size={12} /> {streak.current} win streak
              </span>
            )}
            {streak.best >= 2 && <span>Best: {streak.best} in a row</span>}
          </div>
          {curve.length >= 2 && (
            <div className="w-24 h-12 flex-shrink-0">
              <EloSparkline points={curve} />
            </div>
          )}
        </div>
      )}

      {/* ── Full profile link ── */}
      {!isGuest && (
        <button
          onClick={() => navigate(`/league/${league.id}/player/${player.id}`)}
          className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl bg-alt text-accent text-[13px] font-bold cursor-pointer border-0"
        >
          View full profile <ChevronRight size={15} />
        </button>
      )}
    </AppSheet>
  )
}
