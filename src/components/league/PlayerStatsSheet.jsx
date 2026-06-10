import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Flame } from 'lucide-react'
import { AppSheet, AppBadge } from '../ui-new'
import { playerAvatarStyle } from '../../lib/utils'
import EloSparkline from './EloSparkline'

const RECENT_MATCHES = 6

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function setsLine(match) {
  if (Array.isArray(match.sets) && match.sets.length > 0) {
    return match.sets.map(s => `${s.s1 ?? 0}-${s.s2 ?? 0}`).join(' · ')
  }
  return `${match.score1 ?? 0}-${match.score2 ?? 0}`
}

/**
 * Bottom sheet with a player's league stats: record, ELO trend, titles,
 * streaks, and recent matches. All data comes from the precomputed insights
 * object — no fetching.
 */
export default function PlayerStatsSheet({ open, onClose, player, league, insights, isGuest = false }) {
  const navigate = useNavigate()

  // teamId → team name, across every tournament (for opponent labels)
  const teamNames = useMemo(() => {
    const map = new Map()
    for (const t of league?.tournaments || []) {
      for (const team of t.teams || []) map.set(team.id, team.name)
    }
    return map
  }, [league])

  if (!player) return null

  const label   = player.displayName || player.name
  const streak  = insights.streaks.get(player.id) || { wins: 0, losses: 0, winPct: 0, current: 0, best: 0, last5: [] }
  const titles  = insights.champions.titles.find(t => t.playerId === player.id)
  const curve   = (insights.timelines.byPlayer.get(player.id) || []).map(pt => pt.elo)
  const entries = insights.matchIndex.get(player.id) || []
  const recent  = entries.slice(-RECENT_MATCHES).reverse()

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
          {label[0]?.toUpperCase()}
        </div>
      }
    >
      {/* ── Headline stats ── */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 bg-bg border border-line rounded-xl py-2.5 text-center">
          <div className="font-display text-[22px] leading-none text-text">{streak.wins}-{streak.losses}</div>
          <div className="text-[10px] text-dim mt-1 uppercase tracking-wide">Record</div>
        </div>
        <div className="flex-1 bg-bg border border-line rounded-xl py-2.5 text-center">
          <div className="font-display text-[22px] leading-none text-text">
            {streak.wins + streak.losses > 0 ? `${Math.round(streak.winPct * 100)}%` : '—'}
          </div>
          <div className="text-[10px] text-dim mt-1 uppercase tracking-wide">Win rate</div>
        </div>
        <div className="flex-1 bg-bg border border-line rounded-xl py-2.5 text-center">
          <div className="font-display text-[22px] leading-none text-accent">{titles?.titles || 0}</div>
          <div className="text-[10px] text-dim mt-1 uppercase tracking-wide">Titles</div>
        </div>
      </div>

      {/* ── ELO trend ── */}
      <div className="bg-bg border border-line rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-dim uppercase tracking-wide mb-0.5">ELO Rating</div>
            <div className="font-display text-[28px] leading-none text-text">{player.elo ?? 1000}</div>
          </div>
          {curve.length >= 2 && (
            <div className="w-24 h-12">
              <EloSparkline points={curve} />
            </div>
          )}
        </div>
        {(streak.current >= 2 || streak.best >= 2) && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-dim">
            {streak.current >= 2 && (
              <span className="flex items-center gap-1 text-success font-semibold">
                <Flame size={12} /> {streak.current} win streak
              </span>
            )}
            {streak.best >= 2 && <span>Best: {streak.best} in a row</span>}
          </div>
        )}
      </div>

      {/* ── Recent matches ── */}
      <div className="text-[11px] font-bold text-dim tracking-wide uppercase mb-2">Recent Matches</div>
      {recent.length > 0 ? (
        <div className="bg-bg border border-line rounded-xl overflow-hidden mb-3">
          {recent.map((e, i, arr) => (
            <div
              key={e.match.id}
              className={`flex items-center gap-2.5 px-3 py-2.5 ${i < arr.length - 1 ? 'border-b border-line' : ''}`}
            >
              <AppBadge text={e.won ? 'W' : 'L'} variant={e.won ? 'success' : 'error'} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-text truncate">
                  vs {teamNames.get(e.opponentTeamId) || 'Unknown'}
                </div>
                <div className="text-[10px] text-dim truncate">
                  {e.tournamentName}{formatDate(e.date) && <> · {formatDate(e.date)}</>}
                </div>
              </div>
              <span className="text-[12px] font-semibold text-dim flex-shrink-0">{setsLine(e.match)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[12px] text-dim text-center py-5 mb-3">No matches yet</div>
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
