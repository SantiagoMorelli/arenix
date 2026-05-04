import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import { AppSheet, SectionLabel } from '../ui-new'
import { computeMatchBreakdown } from '../../lib/tournamentStats'
import { POINT_TYPES } from './pointTypes'
import { calcLeadStats } from '../../lib/matchStats'

/**
 * MatchBreakdownSheet — bottom sheet showing one match's per-team breakdown.
 *
 * Props:
 *   open     boolean
 *   onClose  fn
 *   match    in-memory match (team1, team2, score1, score2, winner, log, sets, label)
 *   tournament — needed for team lookup (tournament.teams)
 *   leaguePlayers — full league roster
 *   recordTitle? string — e.g. "Most Dominant" — surfaces context when opened
 *                          via a Match Record card
 */
export default function MatchBreakdownSheet({
  open, onClose, match, tournament, leaguePlayers, recordTitle,
}) {
  const breakdown = useMemo(
    () => match ? computeMatchBreakdown(match, leaguePlayers, tournament?.teams || []) : null,
    [match, leaguePlayers, tournament],
  )

  const lead = useMemo(
    () => match?.log?.length ? calcLeadStats(match.log) : null,
    [match],
  )

  if (!match || !breakdown) {
    return <AppSheet open={open} onClose={onClose} />
  }

  const { team1, team2 } = breakdown
  const winnerSide = match.winner === match.team1 ? 1 : match.winner === match.team2 ? 2 : null

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={recordTitle || match.label || 'Match Breakdown'}
      icon={
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent/15">
          <Trophy size={18} className="text-accent" />
        </div>
      }
    >
      {/* Final score row */}
      <div className="bg-gradient-to-br from-accent/10 to-surface border border-accent/30 rounded-[14px] p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className={`flex-1 text-center ${winnerSide === 1 ? 'text-accent' : 'text-dim'}`}>
            <div className="text-[11px] font-bold uppercase tracking-[0.5px] truncate">{team1.teamName}</div>
            <div className="font-display text-[40px] leading-none mt-1">{match.score1 || 0}</div>
          </div>
          <div className="text-[12px] font-bold text-dim px-3">vs</div>
          <div className={`flex-1 text-center ${winnerSide === 2 ? 'text-accent' : 'text-dim'}`}>
            <div className="text-[11px] font-bold uppercase tracking-[0.5px] truncate">{team2.teamName}</div>
            <div className="font-display text-[40px] leading-none mt-1">{match.score2 || 0}</div>
          </div>
        </div>
        {match.sets?.length > 0 && (
          <div className="text-[11px] text-dim text-center mt-3">
            {match.sets.map((s, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1.5">·</span>}
                {s.s1}–{s.s2}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Points by type — one row per type, side-by-side counts */}
      <SectionLabel>Points by type</SectionLabel>
      <div className="flex flex-col gap-2 mb-4">
        {POINT_TYPES.filter(pt => pt.id !== 'error').map(pt => {
          const v1 = team1.byType[pt.id] || 0
          const v2 = team2.byType[pt.id] || 0
          const total = Math.max(1, v1 + v2)
          const Icon = pt.icon
          return (
            <div key={pt.id} className="bg-bg border border-line rounded-[12px] px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={14} className="text-dim" />
                <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-dim flex-1">{pt.label}</span>
                <span className="font-display text-[14px] text-text">{v1}</span>
                <span className="text-[11px] text-dim mx-1">·</span>
                <span className="font-display text-[14px] text-free">{v2}</span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-alt">
                <div className="bg-accent" style={{ width: `${(v1 / total) * 100}%` }} />
                <div className="bg-free"   style={{ width: `${(v2 / total) * 100}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Errors row */}
      <SectionLabel>Errors</SectionLabel>
      <div className="bg-bg border border-line rounded-[12px] px-3 py-2.5 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-dim flex-1">Errors committed</span>
          <span className="font-display text-[16px] text-error">{team1.byType.error || 0}</span>
          <span className="text-[11px] text-dim mx-1">·</span>
          <span className="font-display text-[16px] text-error">{team2.byType.error || 0}</span>
        </div>
      </div>

      {/* Per-team player rows */}
      <SectionLabel>Top performers</SectionLabel>
      <div className="grid grid-cols-1 gap-3 mb-1">
        {[team1, team2].map(team => (
          <div key={team.teamId} className="bg-bg border border-line rounded-[12px] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-text truncate">{team.teamName}</span>
              <span className="text-[10px] text-dim uppercase tracking-[0.5px]">{team.total} pts</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {team.perPlayer
                .slice()
                .sort((a, b) => (b.points - b.errors) - (a.points - a.errors))
                .map(p => (
                  <div key={p.pid} className="flex items-center text-[12px]">
                    <span className="flex-1 truncate text-text">{p.name}</span>
                    <span className="text-success font-semibold w-12 text-right">+{p.points}</span>
                    <span className="text-error font-semibold w-12 text-right">−{p.errors}</span>
                    <span className="text-dim font-display text-[14px] w-12 text-right leading-none">
                      {p.points - p.errors >= 0 ? `+${p.points - p.errors}` : (p.points - p.errors)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {lead && lead.maxLead > 0 && (
        <div className="text-[11px] text-dim text-center mt-3">
          Biggest lead: {lead.maxLead} pts · Lead changes: {lead.changes}
        </div>
      )}
    </AppSheet>
  )
}
