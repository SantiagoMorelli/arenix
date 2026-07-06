import { Flame, Target, X, Zap, Shield, Hand } from "lucide-react";
import { AppCard } from "../ui-new";
import { formatDuration } from "../../lib/utils";
import ExpandableStatCard from "./ExpandableStatCard";
import PlayerMoments from "./PlayerMoments";
import { SectionLabelWithHelp } from "./StatInfo";
import { EXPLANATIONS } from "./explanations";
import { ERROR_SUBTYPES, normalizeErrorType } from "./pointTypes";

/**
 * Top Performers card. Each player row is an ExpandableStatCard:
 *   collapsed = avatar + name + relative bar + secondary icons + PTS big + ERR
 *   expanded  = key-moments timeline (every point scored/errored, tappable →
 *               Match Flow highlight, with pressure badges) · error breakdown
 */

const STAT_TYPES = [
  { key: "ace",   label: "Ace",   Icon: Target, textCls: "text-success",  bgCls: "bg-success/80"  },
  { key: "spike", label: "Spike", Icon: Zap,    textCls: "text-accent",   bgCls: "bg-accent/80"   },
  { key: "block", label: "Block", Icon: Shield, textCls: "text-free",     bgCls: "bg-free/80"     },
  { key: "tip",   label: "Tip",   Icon: Hand,   textCls: "text-dim",      bgCls: "bg-dim/60"      },
];

export default function TopPerformers({
  pointLog, s1, s2, t1Ids, t2Ids, mvp, getPlayer, getTeam, team1Id, team2Id,
  selectedPointId, onPointSelect, pressureTags,
  helpMode = false,
}) {
  const tName = id => getTeam(id)?.name || "?";
  const firstName = id => (getPlayer(id)?.name || "?").split(" ")[0];

  const startTs = pointLog[0]?.timestamp;
  const fmt = (ts) => (startTs && ts) ? formatDuration(ts - startTs) : null;

  const renderTeamSection = (ids, stat, isTeam1) => {
    if (ids.length === 0) return null;
    const teamColor = isTeam1 ? "text-accent" : "text-free";
    const maxPts = Math.max(...ids.map(id => stat.playerPts[id] || 0), 1);

    return (
      <>
        <div className={`text-[9px] font-bold ${teamColor} uppercase tracking-wide mb-0.5 mt-2 first:mt-0 pl-[42px]`}>
          {tName(isTeam1 ? team1Id : team2Id)}
        </div>
        {ids.map(pid => (
          <ExpandableStatCard
            key={pid}
            ariaLabel={`Show stats for ${firstName(pid)}`}
            chevronColor={isTeam1 ? "text-accent/60" : "text-free/60"}
            className="border-b border-line last:border-b-0"
            header={renderRow(pid, stat, isTeam1, mvp?.pid === pid, firstName, maxPts)}
          >
            <PerformerDetail
              pid={pid}
              pointLog={pointLog}
              isTeam1={isTeam1}
              errors={stat.playerErrors[pid] || 0}
              fmt={fmt}
              selectedPointId={selectedPointId}
              onPointSelect={onPointSelect}
              pressureTags={pressureTags}
            />
          </ExpandableStatCard>
        ))}
      </>
    );
  };

  return (
    <AppCard className="px-3.5 py-3 mb-3">
      <SectionLabelWithHelp helpMode={helpMode} explanation={EXPLANATIONS.topPerformers}>
        Top performers
      </SectionLabelWithHelp>
      {renderTeamSection(t1Ids, s1, true)}
      {renderTeamSection(t2Ids, s2, false)}
    </AppCard>
  );
}

// ── Row ────────────────────────────────────────────────────────────────────

function renderRow(pid, stat, isTeam1, isMVP, firstName, maxPts) {
  const pts = stat.playerPts[pid] || 0;
  const bt  = stat.playerByType[pid] || {};
  const err = stat.playerErrors[pid] || 0;

  const barPct    = maxPts > 0 ? Math.round((pts / maxPts) * 100) : 0;
  const initials  = firstName(pid).slice(0, 2).toUpperCase();
  const avatarBg  = isTeam1 ? "bg-accent/20 text-accent" : "bg-free/20 text-free";
  const ringCls   = isTeam1 ? "ring-accent/30" : "ring-free/30";
  const teamColor = isTeam1 ? "text-accent" : "text-free";
  const barFill   = isTeam1 ? "bg-accent/50" : "bg-free/50";

  const secondary = STAT_TYPES
    .map(s => ({ ...s, value: bt[s.key] || 0 }))
    .filter(s => s.value > 0);

  return (
    <div className="flex items-center gap-2.5 py-2.5">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ring-1 ${ringCls} ${avatarBg}`}>
        {initials}
      </div>

      {/* Name + bar + secondary stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[12px] font-semibold text-text truncate">{firstName(pid)}</span>
          {isMVP && <Flame size={11} className={teamColor} />}
        </div>
        <div className="h-[3px] bg-alt rounded-full mb-1.5 overflow-hidden">
          <div className={`h-full rounded-full ${barFill}`} style={{ width: `${barPct}%` }} />
        </div>
        {secondary.length > 0 && (
          <div className="flex items-center gap-2">
            {secondary.map(s => (
              <span key={s.key} className={`flex items-center gap-0.5 ${s.textCls}`}>
                <s.Icon size={9} />
                <span className="text-[10px] font-semibold">{s.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* PTS — dominant */}
      <div className="flex-shrink-0 text-right min-w-[30px]">
        <div className={`font-display text-[22px] leading-none ${teamColor}`}>{pts}</div>
        <div className="text-[8px] text-dim uppercase tracking-wide">pts</div>
      </div>

      {/* ERR — only when non-zero */}
      {err > 0 && (
        <div className="flex-shrink-0 text-right min-w-[24px]">
          <div className="font-display text-[18px] leading-none text-error">{err}</div>
          <div className="text-[8px] text-dim uppercase tracking-wide">err</div>
        </div>
      )}
    </div>
  );
}

// ── Expanded detail ────────────────────────────────────────────────────────

function PerformerDetail({
  pid, pointLog, isTeam1, errors,
  fmt, selectedPointId, onPointSelect, pressureTags,
}) {
  const playerErrorLog = pointLog.filter(e => e.errorPlayerId === pid);
  const byErrorType = {};
  playerErrorLog.forEach(e => {
    const sub = normalizeErrorType(e.errorType);
    byErrorType[sub] = (byErrorType[sub] || 0) + 1;
  });

  const hasTypedErrors = ERROR_SUBTYPES.some(s => s.id !== "untyped" && byErrorType[s.id]);

  return (
    <div className="bg-bg/60 border border-line rounded-[10px] px-3 py-2.5 mb-2 space-y-2.5">

      {/* Key moments — same story view as the MVP detail */}
      <PlayerMoments
        pid={pid}
        pointLog={pointLog}
        isTeam1={isTeam1}
        fmt={fmt}
        selectedPointId={selectedPointId}
        onPointSelect={onPointSelect}
        pressureTags={pressureTags}
      />

      {/* Error breakdown — only when typed errors exist */}
      {errors > 0 && hasTypedErrors && (
        <div className="bg-alt rounded-[8px] px-2.5 py-2">
          <div className="flex items-center gap-1 mb-1.5">
            <X size={10} className="text-error flex-shrink-0" />
            <span className="text-[8px] font-bold text-dim uppercase tracking-wide flex-1">Error breakdown</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {ERROR_SUBTYPES
              .filter(sub => sub.id !== "untyped" && byErrorType[sub.id])
              .map(sub => {
                const Icon = sub.icon;
                return (
                  <span key={sub.id} className="flex items-center gap-1">
                    <Icon size={9} className="text-error/70 flex-shrink-0" />
                    <span className="text-[9px] text-dim">{sub.label}</span>
                    <span className="text-[10px] font-bold text-error">{byErrorType[sub.id]}</span>
                  </span>
                );
              })}
            {byErrorType.untyped > 0 && (
              <span className="text-[9px] text-dim">
                Untyped <span className="font-bold text-error">{byErrorType.untyped}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

