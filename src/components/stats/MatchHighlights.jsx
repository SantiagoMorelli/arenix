import { useState } from "react";
import { Flame, ArrowUpDown, Repeat, ArrowRight } from "lucide-react";
import { AppCard, SectionLabel } from "../ui-new";
import { formatDuration } from "../../lib/utils";
import {
  calcLeadMoments, calcLeadChangeList, calcPlayerContribution, lastKContribution,
} from "../../lib/matchStats";

/**
 * Three-tile highlights card: MVP / Biggest Lead / Lead Changes.
 *
 * Tapping a tile selects it (ring + scale highlight) and reveals a shared
 * inline detail panel below the row. Tap again to collapse. This keeps the
 * compact 3-up summary intact on mobile while letting users drill in.
 *
 * Props:
 *   pointLog       array
 *   mvp            { pid, net } | null
 *   leadStats      { maxLead, maxLeadTeam, changes }
 *   t1Ids          string[]
 *   getPlayer      fn(id)
 *   getTeam        fn(id)
 *   team1Id        string
 *   team2Id        string
 *   teamPlayerStats { 1: stat, 2: stat }   — full stat blob per team for MVP detail
 */
export default function MatchHighlights({
  pointLog, mvp, leadStats, t1Ids, getPlayer, getTeam, team1Id, team2Id,
  teamPlayerStats,
}) {
  const [open, setOpen] = useState(null); // "mvp" | "lead" | "changes" | null
  const tName = id => getTeam(id)?.name || "?";
  const firstName = id => (getPlayer(id)?.name || "?").split(" ")[0];

  const startTs = pointLog[0]?.timestamp;
  const fmt = (ts) => (startTs && ts) ? formatDuration(ts - startTs) : null;

  const mvpIsTeam1 = mvp ? t1Ids.includes(mvp.pid) : false;
  const mvpAccent  = mvpIsTeam1 ? "text-accent" : "text-free";

  const toggle = (key) => setOpen(o => o === key ? null : key);

  return (
    <AppCard className="px-3.5 py-3 mb-3">
      <SectionLabel>Match highlights</SectionLabel>

      <div className="flex gap-2">
        <Tile
          selected={open === "mvp"}
          onClick={() => mvp && toggle("mvp")}
          disabled={!mvp}
          icon={<Flame size={14} className={mvp ? `${mvpAccent} mx-auto mb-1` : "text-dim mx-auto mb-1"} />}
          primary={mvp ? firstName(mvp.pid) : "—"}
          primaryClass="text-text"
          secondary={mvp ? `${mvp.net > 0 ? "+" : ""}${mvp.net} net pts` : null}
          label="MVP"
        />
        <Tile
          selected={open === "lead"}
          onClick={() => leadStats.maxLead > 0 && toggle("lead")}
          disabled={leadStats.maxLead === 0}
          icon={<ArrowUpDown size={14} className="text-dim mx-auto mb-1" />}
          primary={leadStats.maxLead > 0 ? `+${leadStats.maxLead}` : "—"}
          primaryClass={leadStats.maxLeadTeam === 1 ? "text-accent" : leadStats.maxLeadTeam === 2 ? "text-free" : "text-text"}
          secondary={leadStats.maxLeadTeam && leadStats.maxLead > 0
            ? tName(leadStats.maxLeadTeam === 1 ? team1Id : team2Id).split(" ")[0]
            : null}
          label="Biggest lead"
        />
        <Tile
          selected={open === "changes"}
          onClick={() => leadStats.changes > 0 && toggle("changes")}
          disabled={leadStats.changes === 0}
          icon={<Repeat size={14} className="text-dim mx-auto mb-1" />}
          primary={String(leadStats.changes)}
          primaryClass="text-text"
          secondary={leadStats.changes === 1 ? "time" : "times"}
          label="Lead changes"
        />
      </div>

      {/* Shared expansion panel */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pt-3">
            {open === "mvp" && mvp && (
              <MvpDetail
                pid={mvp.pid}
                isTeam1={mvpIsTeam1}
                pointLog={pointLog}
                teamStat={teamPlayerStats?.[mvpIsTeam1 ? 1 : 2]}
                firstName={firstName}
                tName={tName}
                team1Id={team1Id}
                team2Id={team2Id}
              />
            )}
            {open === "lead" && (
              <LeadMomentsDetail
                pointLog={pointLog}
                tName={tName}
                team1Id={team1Id}
                team2Id={team2Id}
                fmt={fmt}
              />
            )}
            {open === "changes" && (
              <LeadChangesDetail
                pointLog={pointLog}
                tName={tName}
                team1Id={team1Id}
                team2Id={team2Id}
                fmt={fmt}
              />
            )}
          </div>
        </div>
      </div>
    </AppCard>
  );
}

function Tile({ selected, onClick, disabled, icon, primary, primaryClass, secondary, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex-1 bg-alt rounded-[10px] px-2.5 py-2.5 text-center border-0 cursor-pointer transition-all duration-150 motion-reduce:transition-none focus-visible:outline-none ${selected ? "ring-2 ring-text" : ""} ${disabled ? "opacity-60 cursor-default" : ""}`}
    >
      {icon}
      <div className={`text-[12px] font-bold leading-tight ${primaryClass}`}>{primary}</div>
      {secondary && <div className="text-[10px] text-dim mt-0.5 truncate px-1">{secondary}</div>}
      <div className="text-[9px] text-dim uppercase mt-1">{label}</div>
    </button>
  );
}

// ── MVP detail ─────────────────────────────────────────────────────────────

function MvpDetail({ pid, isTeam1, pointLog, teamStat, firstName, tName, team1Id, team2Id }) {
  if (!teamStat) return null;
  const c = calcPlayerContribution(pid, pointLog, teamStat);
  const last = lastKContribution(pid, pointLog, 5);
  const accent = isTeam1 ? "text-accent" : "text-free";
  const teamName = tName(isTeam1 ? team1Id : team2Id).split(" ")[0];

  return (
    <div className="bg-bg/60 border border-line rounded-[10px] px-3 py-2.5">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className={`text-[14px] font-bold ${accent} leading-tight`}>{firstName(pid)}</div>
          <div className="text-[9px] text-dim uppercase tracking-wide">{teamName}</div>
        </div>
        <div className="text-right">
          <div className={`font-display text-[22px] leading-none ${accent}`}>{c.net > 0 ? "+" : ""}{c.net}</div>
          <div className="text-[9px] text-dim uppercase">net pts</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-2">
        <MiniStat label="PTS"  value={c.pts}      bold />
        <MiniStat label="ACE"  value={c.acePts} />
        <MiniStat label="SPK"  value={c.spikePts} />
        <MiniStat label="BLK"  value={c.blockPts} />
        <MiniStat label="TIP"  value={c.tipPts} />
        <MiniStat label="ERR"  value={c.errors}   error={c.errors > 0} />
        <MiniStat label="STRK" value={c.biggestStreak} />
        <MiniStat label="SHARE" value={`${c.contributionPct}%`} />
      </div>

      {last.of > 0 && last.scored > 0 && (
        <div className="text-[10px] text-dim italic">
          Scored <span className={`${accent} font-bold not-italic`}>{last.scored}</span> of last {last.of} points
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, bold, error }) {
  const valColor = error ? "text-error" : bold ? "text-text" : "text-text";
  return (
    <div className="bg-alt rounded-[6px] py-1 text-center">
      <div className={`text-[12px] ${bold ? "font-bold" : "font-semibold"} ${valColor} leading-none`}>{value}</div>
      <div className="text-[7px] text-dim uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

// ── Biggest Lead detail ────────────────────────────────────────────────────

function LeadMomentsDetail({ pointLog, tName, team1Id, team2Id, fmt }) {
  const moments = calcLeadMoments(pointLog);
  if (moments.length === 0) return null;

  return (
    <div>
      <div className="text-[9px] text-dim uppercase tracking-wide mb-1.5">
        {moments.length === 1 ? "Reached at" : `Reached ${moments.length} times`}
      </div>
      <ul className="space-y-1">
        {moments.map((m, i) => {
          const teamColor = m.team === 1 ? "text-accent" : "text-free";
          const teamName = tName(m.team === 1 ? team1Id : team2Id).split(" ")[0];
          return (
            <li
              key={m.pointId}
              className={`flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-[6px] ${i % 2 === 0 ? "bg-alt" : "bg-bg/40"}`}
            >
              <span className="text-dim font-mono text-[10px] w-10">{fmt(m.timestamp) || "—"}</span>
              <span className="font-display text-[14px] leading-none">
                <span className="text-accent">{m.t1}</span>
                <span className="text-dim text-[10px] mx-0.5">–</span>
                <span className="text-free">{m.t2}</span>
              </span>
              <span className={`${teamColor} font-bold text-[10px] uppercase tracking-wide`}>+{m.lead} {teamName}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Lead Changes detail ────────────────────────────────────────────────────

function LeadChangesDetail({ pointLog, tName, team1Id, team2Id, fmt }) {
  const changes = calcLeadChangeList(pointLog);
  if (changes.length === 0) return null;

  return (
    <div>
      <div className="text-[9px] text-dim uppercase tracking-wide mb-1.5">
        {changes.length} lead {changes.length === 1 ? "change" : "changes"}
      </div>
      <ul className="space-y-1">
        {changes.map((c, i) => {
          const fromColor = c.fromTeam === 1 ? "text-accent" : "text-free";
          const toColor   = c.toTeam   === 1 ? "text-accent" : "text-free";
          const fromName = tName(c.fromTeam === 1 ? team1Id : team2Id).split(" ")[0];
          const toName   = tName(c.toTeam   === 1 ? team1Id : team2Id).split(" ")[0];
          return (
            <li
              key={c.pointId}
              className={`flex items-center justify-between gap-2 text-[11px] px-2.5 py-1.5 rounded-[6px] ${i % 2 === 0 ? "bg-alt" : "bg-bg/40"}`}
            >
              <span className="text-dim font-mono text-[10px] w-10 flex-shrink-0">{fmt(c.timestamp) || "—"}</span>
              <span className="font-display text-[14px] leading-none flex-shrink-0">
                <span className="text-accent">{c.t1}</span>
                <span className="text-dim text-[10px] mx-0.5">–</span>
                <span className="text-free">{c.t2}</span>
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide truncate min-w-0 justify-end flex-1">
                <span className={`${fromColor} truncate`}>{fromName}</span>
                <ArrowRight size={10} className="text-dim flex-shrink-0" />
                <span className={`${toColor} truncate`}>{toName}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
