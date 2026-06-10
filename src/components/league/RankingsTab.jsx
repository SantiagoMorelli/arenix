import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Flame, TrendingUp, Percent, Sigma, Trophy, Crown,
  ArrowUp, ArrowDown, ChevronRight,
} from 'lucide-react'
import { SectionLabel } from '../ui-new'
import { computeLeagueInsights, computeRankMovement } from '../../lib/leagueInsights'
import { playerAvatarStyle } from '../../lib/utils'
import EloSparkline from './EloSparkline'
import PlayerStatsSheet from './PlayerStatsSheet'

const HIGHLIGHT_ICONS = {
  onFire:       Flame,
  bestWinPct:   Percent,
  mostImproved: TrendingUp,
  pointDiff:    Sigma,
  mostTitles:   Trophy,
}

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Rankings tab — scrollable engagement feed: position hero with real ELO
 * trend, stat highlight strip, full leaderboard, hall of fame, and a recent
 * match activity feed. Tapping a player opens their stats sheet.
 */
export default function RankingsTab({ league, isGuest, currentUserId }) {
  const navigate = useNavigate()
  const [sheetPlayer, setSheetPlayer] = useState(null)

  const insights = useMemo(() => computeLeagueInsights(league), [league])

  const rankedPlayers = useMemo(() => {
    return [...(league.players || [])]
      .map(p => {
        const s = insights.streaks.get(p.id)
        return { ...p, wins: s?.wins ?? 0, losses: s?.losses ?? 0 }
      })
      .sort((a, b) => (b.elo ?? 1000) - (a.elo ?? 1000))
  }, [league, insights])

  const myPlayer = rankedPlayers.find(p => p.userId && p.userId === currentUserId)
  const myRank   = myPlayer ? rankedPlayers.indexOf(myPlayer) + 1 : null
  const myCurve  = myPlayer ? (insights.timelines.byPlayer.get(myPlayer.id) || []).map(pt => pt.elo) : []
  const myMove   = myPlayer ? computeRankMovement(insights.timelines, myPlayer.id) : null
  const myStreak = myPlayer ? insights.streaks.get(myPlayer.id) : null

  const { champions, highlights, feed } = insights

  return (
    <>
      {/* ════ Your position hero ════ */}
      {myRank && (
        <div className="bg-gradient-to-br from-surface to-alt rounded-[14px] border border-line mt-2 mb-4 p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex-1">
              <div className="text-[11px] font-bold text-accent tracking-[1.2px] uppercase mb-1">Your Position</div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[40px] leading-none text-accent">#{myRank}</span>
                <span className="text-[12px] text-dim">of {rankedPlayers.length} · {myPlayer.elo ?? 1000} ELO</span>
              </div>
              {myMove && myMove.delta !== 0 ? (
                <div className={`flex items-center gap-1 mt-1.5 text-[11px] font-semibold ${myMove.delta > 0 ? 'text-success' : 'text-error'}`}>
                  {myMove.delta > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {myMove.delta > 0 ? 'Up' : 'Down'} {Math.abs(myMove.delta)} since last tournament
                </div>
              ) : myStreak?.last5?.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {myStreak.last5.map((r, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${r === 'W' ? 'bg-success' : 'bg-error/60'}`}
                    />
                  ))}
                  <span className="text-[10px] text-dim ml-1">last {myStreak.last5.length}</span>
                </div>
              )}
            </div>
            {myCurve.length >= 2 && (
              <div className="w-20 h-[60px] flex-shrink-0">
                <EloSparkline points={myCurve} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ Stat highlights strip ════ */}
      {highlights.length > 0 && (
        <>
          <SectionLabel color="accent">Highlights</SectionLabel>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-4 [scrollbar-width:none]">
            {highlights.map(tile => {
              const Icon = HIGHLIGHT_ICONS[tile.id] || Trophy
              return (
                <button
                  key={tile.id}
                  onClick={() => {
                    const p = rankedPlayers.find(pl => pl.id === tile.playerId)
                    if (p) setSheetPlayer(p)
                  }}
                  className="min-w-[124px] bg-surface border border-line rounded-xl p-3 flex flex-col items-start gap-1 cursor-pointer active:opacity-80 transition-opacity text-left"
                >
                  <div className="flex items-center gap-1.5 text-accent">
                    <Icon size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">{tile.label}</span>
                  </div>
                  <div className="font-display text-[26px] leading-none text-text">{tile.primary}</div>
                  <div className="text-[11px] text-dim leading-tight">
                    <span className="text-text font-medium">{tile.playerName}</span>
                    <span> · {tile.secondary}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* ════ Leaderboard ════ */}
      <SectionLabel color="accent">Top Players</SectionLabel>

      {rankedPlayers.length > 0 ? (
        <div className="bg-surface rounded-[14px] overflow-hidden border border-line mb-4">
          {rankedPlayers.map((player, i, arr) => {
            const isMe   = player.userId && player.userId === currentUserId
            const label  = player.displayName || player.name
            const streak = insights.streaks.get(player.id)

            return (
              <button
                key={player.id}
                onClick={() => setSheetPlayer(player)}
                className={`w-full flex items-center px-3.5 py-[11px] cursor-pointer bg-transparent border-0 text-left active:opacity-80 transition-opacity ${i < arr.length - 1 ? 'border-b border-line' : ''} ${isMe ? 'bg-accent/10' : ''}`}
              >
                <span className={`font-display w-7 text-[18px] leading-none flex-shrink-0 ${i < 3 ? 'text-accent' : 'text-dim'}`}>
                  {i + 1}
                </span>
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[13px] font-semibold text-white flex-shrink-0"
                  style={playerAvatarStyle(player.id || player.name)}
                >
                  {label[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 ml-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[13px] truncate ${isMe ? 'font-bold text-text' : 'font-medium text-text'}`}>
                      {label}
                    </span>
                    {isMe && <span className="text-[10px] font-bold text-accent flex-shrink-0">YOU</span>}
                    {streak?.current >= 3 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-accent flex-shrink-0">
                        <Flame size={11} />{streak.current}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-dim mt-0.5">{player.wins}W - {player.losses}L</div>
                </div>
                <span className="font-display text-[18px] text-text leading-none ml-2">{player.elo ?? 1000}</span>
                <ChevronRight size={15} className="text-dim ml-1.5 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      ) : (
        <div className="text-[13px] text-dim text-center py-6 mb-4">No players yet</div>
      )}

      {/* ════ Hall of Fame ════ */}
      {champions.reigning && (
        <>
          <SectionLabel color="accent">Hall of Fame</SectionLabel>

          <div
            onClick={() => navigate(`/league/${league.id}/tournament/${champions.reigning.tournamentId}`)}
            className="bg-gradient-to-br from-surface to-alt rounded-[14px] border border-accent/30 p-3.5 mb-2 cursor-pointer active:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-accent/15 flex items-center justify-center flex-shrink-0 text-accent">
                <Crown size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-accent uppercase tracking-[1.2px] mb-0.5">Reigning Champions</div>
                <div className="text-[14px] font-bold text-text truncate">
                  {champions.reigning.playerNames || champions.reigning.teamName}
                </div>
                <div className="text-[11px] text-dim truncate">
                  {champions.reigning.tournamentName}
                  {formatDate(champions.reigning.date) && <> · {formatDate(champions.reigning.date)}</>}
                </div>
              </div>
              <ChevronRight size={16} className="text-dim flex-shrink-0" />
            </div>
          </div>

          {champions.titles.length > 0 && (
            <div className="bg-surface rounded-[14px] overflow-hidden border border-line mb-4">
              {champions.titles.slice(0, 6).map((row, i, arr) => {
                const p = rankedPlayers.find(pl => pl.id === row.playerId)
                return (
                  <button
                    key={row.playerId}
                    onClick={() => p && setSheetPlayer(p)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer bg-transparent border-0 text-left active:opacity-80 transition-opacity ${i < arr.length - 1 ? 'border-b border-line' : ''}`}
                  >
                    <div
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[13px] font-semibold text-white flex-shrink-0"
                      style={playerAvatarStyle(row.playerId)}
                    >
                      {row.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-text truncate">{row.name}</div>
                      <div className="text-[10px] text-dim">{row.podiums} podium{row.podiums === 1 ? '' : 's'}</div>
                    </div>
                    <span className="flex items-center gap-1 text-accent flex-shrink-0">
                      <Trophy size={14} />
                      <span className="font-display text-[18px] leading-none">×{row.titles}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ════ Recent matches feed ════ */}
      <SectionLabel color="accent">Recent Matches</SectionLabel>
      {feed.length > 0 ? (
        <div className="flex flex-col gap-2 mb-4">
          {feed.map(item => (
            <div
              key={item.matchId}
              onClick={() => navigate(`/league/${league.id}/tournament/${item.tournamentId}`)}
              className="bg-surface rounded-xl border border-line p-3 cursor-pointer active:opacity-80 transition-opacity"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-dim uppercase tracking-wide truncate">{item.tournamentName}</span>
                <span className="text-[10px] text-dim flex-shrink-0 ml-2">{formatDate(item.date)}</span>
              </div>
              {[1, 2].map(side => {
                const team = side === 1 ? item.team1 : item.team2
                const score = side === 1 ? item.score1 : item.score2
                const won = item.winnerSide === side
                return (
                  <div key={side} className={`flex items-center justify-between ${side === 1 ? 'mb-1' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[13px] truncate ${won ? 'font-bold text-text' : 'font-medium text-dim'}`}>
                        {team.playerNames || team.name}
                      </span>
                    </div>
                    <span className={`font-display text-[18px] leading-none ml-2 ${won ? 'text-accent' : 'text-dim'}`}>
                      {score ?? 0}
                    </span>
                  </div>
                )
              })}
              {item.sets && item.sets.length > 1 && (
                <div className="text-[10px] text-dim mt-1.5 pt-1.5 border-t border-line/50">
                  Sets: {item.sets.map(s => `${s.s1 ?? 0}-${s.s2 ?? 0}`).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[13px] text-dim text-center py-6 mb-4">No matches played yet</div>
      )}

      <PlayerStatsSheet
        open={!!sheetPlayer}
        onClose={() => setSheetPlayer(null)}
        player={sheetPlayer}
        league={league}
        insights={insights}
        isGuest={isGuest}
      />
    </>
  )
}
