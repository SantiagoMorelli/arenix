import { Flame, Target, TrendingUp, Users } from "lucide-react";
import { AppCard, SectionLabel } from "../ui-new";
import ExpandableStatCard from "./ExpandableStatCard";
import MiniSparkline from "./MiniSparkline";
import {
  calcClutchPoints, calcPeakWindow, calcCumulativeSeries, calcHeadToHead,
} from "../../lib/matchStats";

/**
 * Top Performers card. Each player row is an ExpandableStatCard:
 *   collapsed = original row (avatar + name + chip stats)
 *   expanded  = clutch · peak window · head-to-head · cumulative sparkline
 *
 * Props:
 *   pointLog       array
 *   s1, s2         team stat blobs
 *   t1Ids, t2Ids   string[]
 *   mvp            { pid } | null
 *   getPlayer      fn(id)
 *   getTeam        fn(id)
 *   team1Id        string
 *   team2Id        string
 */
export default function TopPerformers({
  pointLog, s1, s2, t1Ids, t2Ids, mvp, getPlayer, getTeam, team1Id, team2Id,
}) {
  const tName = id => getTeam(id)?.name || "?";
  const firstName = id => (getPlayer(id)?.name || "?").split(" ")[0];

  // Top scorer per team — used as default "rival" for head-to-head.
  const topScorerOfTeam = (ids, stat) => {
    if (!ids.length) return null;
    return [...ids].sort((a, b) => (stat.playerPts[b] || 0) - (stat.playerPts[a] || 0))[0];
  };
  const t1Top = topScorerOfTeam(t1Ids, s1);
  const t2Top = topScorerOfTeam(t2Ids, s2);

  const renderTeamSection = (ids, stat, isTeam1) => {
    if (ids.length === 0) return null;
    const teamColor = isTeam1 ? "text-accent" : "text-free";
    const teammateOf = (pid) => ids.find(o => o !== pid) || null;
    const rivalOf = isTeam1 ? t2Top : t1Top;

    return (
      <>
        <div className={`text-[9px] font-bold ${teamColor} uppercase tracking-wide mb-0.5 mt-2 first:mt-0 pl-[37px]`}>
          {tName(isTeam1 ? team1Id : team2Id)}
        </div>
        {ids.map(pid => (
          <ExpandableStatCard
            key={pid}
            ariaLabel={`Show stats for ${firstName(pid)}`}
            chevronColor={isTeam1 ? "text-accent/60" : "text-free/60"}
            className="border-b border-line last:border-b-0"
            header={renderRow(pid, stat, isTeam1, mvp?.pid === pid, firstName)}
          >
            <PerformerDetail
              pid={pid}
              isTeam1={isTeam1}
              pointLog={pointLog}
              teammatePid={teammateOf(pid)}
              rivalPid={rivalOf}
              firstName={firstName}
            />
          </ExpandableStatCard>
        ))}
        {stat.unattributed > 0 && renderUnattributedRow(stat.unattributed)}
      </>
    );
  };

  return (
    <AppCard className="px-3.5 py-3 mb-3">
      <SectionLabel>Top performers</SectionLabel>

      <div className="flex items-center gap-2.5 pb-1.5 mb-0.5">
        <div className="w-7 flex-shrink-0" />
        <div className="w-[64px] flex-shrink-0" />
        <div className="flex items-center gap-[6px] flex-1 flex-wrap">
          {["PTS","ACE","SPK","BLK","TIP","ERR"].map(h => (
            <span key={h} className={`text-[8px] font-bold uppercase tracking-wide w-[26px] text-center ${h === "ERR" ? "text-error/60" : "text-dim/60"}`}>{h}</span>
          ))}
        </div>
      </div>

      {renderTeamSection(t1Ids, s1, true)}
      {renderTeamSection(t2Ids, s2, false)}
    </AppCard>
  );
}

function renderRow(pid, stat, isTeam1, isMVP, firstName) {
  const pts  = stat.playerPts[pid] || 0;
  const bt   = stat.playerByType[pid] || {};
  const err  = stat.playerErrors[pid] || 0;
  const initials = firstName(pid).slice(0, 2).toUpperCase();
  const avatarBg  = isTeam1 ? "bg-accent/20 text-accent" : "bg-free/20 text-free";
  const teamColor = isTeam1 ? "text-accent" : "text-free";

  return (
    <div className="flex items-center gap-2.5 py-2.5">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${avatarBg}`}>
        {initials}
      </div>
      <div className="flex items-center gap-1 min-w-0 w-[64px] flex-shrink-0">
        <span className="text-[12px] font-semibold text-text truncate">{firstName(pid)}</span>
        {isMVP && <Flame size={12} className={teamColor} />}
      </div>
      <div className="flex items-center gap-[6px] flex-1 min-w-0 flex-wrap">
        <StatChip value={pts} bold color="text-text" />
        <StatChip value={bt.ace   || 0} />
        <StatChip value={bt.spike || 0} />
        <StatChip value={bt.block || 0} />
        <StatChip value={bt.tip   || 0} />
        <StatChip value={err} color={err > 0 ? "text-error" : "text-dim"} />
      </div>
    </div>
  );
}

function renderUnattributedRow(count) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-line last:border-b-0 opacity-50">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold bg-line text-dim">—</div>
      <div className="w-[64px] flex-shrink-0 text-[11px] text-dim italic">Rival errors</div>
      <div className="flex items-center gap-[6px] flex-1 min-w-0">
        <span className="text-[12px] font-bold text-dim w-[26px] text-center">{count}</span>
        {["ace","spk","blk","tip","err"].map(k => (
          <span key={k} className="text-[11px] text-dim/40 w-[26px] text-center">—</span>
        ))}
      </div>
    </div>
  );
}

function StatChip({ value, bold, color = "text-dim" }) {
  return (
    <div className="flex flex-col items-center w-[26px]">
      <span className={`text-[11px] ${bold ? "font-bold text-text" : `font-semibold ${color}`}`}>{value}</span>
    </div>
  );
}

// ── Detail panel ───────────────────────────────────────────────────────────

function PerformerDetail({ pid, isTeam1, pointLog, teammatePid, rivalPid, firstName }) {
  const clutch = calcClutchPoints(pid, pointLog);
  const peak = calcPeakWindow(pid, pointLog, 5);
  const series = calcCumulativeSeries(pid, pointLog);
  const accent = isTeam1 ? "text-accent" : "text-free";
  const teamSparkColor = isTeam1 ? "var(--color-accent, #F5A623)" : "var(--color-free, #00BCD4)";

  const teammateH2H = teammatePid ? calcHeadToHead(pid, teammatePid, pointLog) : null;
  const rivalH2H    = rivalPid    ? calcHeadToHead(pid, rivalPid,    pointLog) : null;

  return (
    <div className="bg-bg/60 border border-line rounded-[10px] px-3 py-2.5 mb-2">
      {/* 2x2 stat grid */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <DetailStat
          icon={<Target size={11} />}
          label="Clutch points"
          value={clutch}
          hint="margin ≤ 2"
          accent={accent}
        />
        <DetailStat
          icon={<TrendingUp size={11} />}
          label="Peak window"
          value={peak.count > 0 ? peak.count : "—"}
          hint={peak.count > 0 ? `pts ${peak.start}–${peak.end}` : "no streak"}
          accent={accent}
        />
        {teammatePid && teammateH2H && (
          <DetailStat
            icon={<Users size={11} />}
            label={`vs ${firstName(teammatePid)}`}
            value={`${teammateH2H.ptsA}–${teammateH2H.ptsB}`}
            hint="teammate"
            accent={accent}
          />
        )}
        {rivalPid && rivalH2H && (
          <DetailStat
            icon={<Users size={11} />}
            label={`vs ${firstName(rivalPid)}`}
            value={`${rivalH2H.ptsA}–${rivalH2H.ptsB}`}
            hint="rival"
            accent={accent}
          />
        )}
      </div>

      {/* Cumulative pts trend */}
      {series.length > 1 && series[series.length - 1] > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-bold text-dim uppercase tracking-wide">Cumulative pts</span>
            <span className={`text-[10px] font-bold ${accent}`}>{series[series.length - 1]}</span>
          </div>
          <MiniSparkline
            points={series}
            width={260}
            height={26}
            stroke={teamSparkColor}
            strokeWidth={1.25}
            className="w-full"
            ariaLabel={`${firstName(pid)} cumulative points trend`}
          />
        </div>
      )}
    </div>
  );
}

function DetailStat({ icon, label, value, hint, accent }) {
  return (
    <div className="bg-alt rounded-[8px] px-2 py-1.5">
      <div className="flex items-center gap-1 text-dim mb-0.5">
        <span className="text-dim">{icon}</span>
        <span className="text-[8px] font-bold uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className={`font-display text-[20px] leading-none ${accent}`}>{value}</div>
      {hint && <div className="text-[9px] text-dim mt-0.5">{hint}</div>}
    </div>
  );
}
