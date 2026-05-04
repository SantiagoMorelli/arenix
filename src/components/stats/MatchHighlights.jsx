import { useState } from "react";
import {
  Flame, ArrowUpDown, Repeat, ArrowRight, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { AppCard, SectionLabel } from "../ui-new";
import { formatDuration } from "../../lib/utils";
import {
  calcLeadMoments, calcLeadChangeList, calcMvpMoments, calcRunnerUp,
} from "../../lib/matchStats";
import { POINT_TYPE_BY_ID } from "./pointTypes";

/**
 * Three-tile highlights card: MVP / Biggest Lead / Lead Changes.
 *
 * Tapping a tile selects it (ring + scale highlight) and reveals a shared
 * inline detail panel below the row. Tap again to collapse.
 *
 * Detail rows in Biggest Lead, Lead Changes, and MVP scoring moments are
 * tappable: clicking one calls `onPointSelect(pointId)`, which the parent
 * uses to highlight that point in the Match Flow strip.
 *
 * Props:
 *   pointLog          array
 *   mvp               { pid, net } | null
 *   leadStats         { maxLead, maxLeadTeam, changes }
 *   t1Ids             string[]
 *   allPlayerIds      string[]   — for runner-up calculation
 *   getPlayer         fn(id)
 *   getTeam           fn(id)
 *   team1Id           string
 *   team2Id           string
 *   teamPlayerStats   { 1: stat, 2: stat }
 *   selectedPointId   string|null  — currently-highlighted point in Match Flow
 *   onPointSelect     fn(id|null)  — request a Match Flow highlight
 */
export default function MatchHighlights({
  pointLog, mvp, leadStats, t1Ids, allPlayerIds, getPlayer, getTeam, team1Id, team2Id,
  teamPlayerStats, selectedPointId, onPointSelect,
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
                net={mvp.net}
                isTeam1={mvpIsTeam1}
                pointLog={pointLog}
                teamPlayerStats={teamPlayerStats}
                allPlayerIds={allPlayerIds}
                t1Ids={t1Ids}
                firstName={firstName}
                tName={tName}
                team1Id={team1Id}
                team2Id={team2Id}
                fmt={fmt}
                selectedPointId={selectedPointId}
                onPointSelect={onPointSelect}
              />
            )}
            {open === "lead" && (
              <LeadMomentsDetail
                pointLog={pointLog}
                tName={tName}
                team1Id={team1Id}
                team2Id={team2Id}
                fmt={fmt}
                selectedPointId={selectedPointId}
                onPointSelect={onPointSelect}
              />
            )}
            {open === "changes" && (
              <LeadChangesDetail
                pointLog={pointLog}
                tName={tName}
                team1Id={team1Id}
                team2Id={team2Id}
                fmt={fmt}
                selectedPointId={selectedPointId}
                onPointSelect={onPointSelect}
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
// Differentiated from Top Performers (which shows aggregate stats): this view
// tells the STORY of the MVP — vs the runner-up, plus the actual list of
// scoring/error moments they had during the match.

function MvpDetail({
  pid, net, isTeam1, pointLog, teamPlayerStats, allPlayerIds, t1Ids,
  firstName, tName, team1Id, team2Id, fmt,
  selectedPointId, onPointSelect,
}) {
  const moments = calcMvpMoments(pid, pointLog);
  const runnerUp = calcRunnerUp(allPlayerIds, teamPlayerStats[1], teamPlayerStats[2], t1Ids, pid);
  const accent = isTeam1 ? "text-accent" : "text-free";
  const teamName = tName(isTeam1 ? team1Id : team2Id);

  const advantage = runnerUp ? net - runnerUp.net : null;
  const runnerIsTeam1 = runnerUp ? t1Ids.includes(runnerUp.pid) : false;
  const runnerAccent = runnerIsTeam1 ? "text-accent" : "text-free";

  return (
    <div className="space-y-2.5">
      {/* Why MVP — vs runner-up comparison */}
      {runnerUp && (
        <div className="bg-bg/60 border border-line rounded-[10px] px-3 py-2.5">
          <div className="text-[8px] font-bold text-dim uppercase tracking-wide mb-1.5">
            Why MVP
          </div>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 text-center">
              <div className={`font-display text-[24px] leading-none ${accent}`}>
                {net > 0 ? "+" : ""}{net}
              </div>
              <div className={`text-[11px] font-bold ${accent} truncate mt-0.5`}>{firstName(pid)}</div>
              <div className="text-[8px] text-dim uppercase mt-0.5 truncate">{teamName}</div>
            </div>
            <div className="flex flex-col items-center justify-center text-dim">
              <ArrowRight size={14} />
              {advantage != null && (
                <div className="text-[9px] font-bold text-text mt-0.5">
                  {advantage >= 0 ? "+" : ""}{advantage}
                </div>
              )}
            </div>
            <div className="flex-1 text-center opacity-80">
              <div className="font-display text-[24px] leading-none text-text">
                {runnerUp.net > 0 ? "+" : ""}{runnerUp.net}
              </div>
              <div className={`text-[11px] font-bold ${runnerAccent} truncate mt-0.5`}>{firstName(runnerUp.pid)}</div>
              <div className="text-[8px] text-dim uppercase mt-0.5">Runner-up</div>
            </div>
          </div>
          {advantage != null && advantage > 0 && (
            <div className="mt-1.5 text-center text-[10px] text-dim italic">
              Beat runner-up by <span className={`${accent} font-bold not-italic`}>+{advantage}</span> net pts
            </div>
          )}
        </div>
      )}

      {/* Key moments — list of scored/errored points (tappable → highlight in flow) */}
      {moments.length > 0 && (
        <div>
          <div className="text-[8px] font-bold text-dim uppercase tracking-wide mb-1.5 flex items-center justify-between">
            <span>Key moments</span>
            <span className="text-dim/60 font-normal normal-case">Tap to find</span>
          </div>
          <ul className="space-y-1">
            {moments.map((m, i) => {
              const isSelected = selectedPointId === m.id;
              const isError = m.kind === "error";
              const Icon = isError ? AlertTriangle : (POINT_TYPE_BY_ID[m.pointType]?.icon || CheckCircle2);
              const tone = isError ? "text-error" : accent;
              const ptLabel = isError ? "Error" : (POINT_TYPE_BY_ID[m.pointType]?.label || "Point");
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onPointSelect?.(isSelected ? null : m.id)}
                    aria-pressed={isSelected}
                    className={`w-full flex items-center justify-between gap-2 text-[11px] px-2.5 py-1.5 rounded-[6px] border-0 cursor-pointer text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text ${isSelected ? "bg-text/10 ring-1 ring-text/40" : (i % 2 === 0 ? "bg-alt" : "bg-bg/40")}`}
                  >
                    <span className="text-dim font-mono text-[10px] w-10 flex-shrink-0">{fmt(m.timestamp) || "—"}</span>
                    <span className="font-display text-[14px] leading-none flex-shrink-0">
                      <span className="text-accent">{m.t1}</span>
                      <span className="text-dim text-[10px] mx-0.5">–</span>
                      <span className="text-free">{m.t2}</span>
                    </span>
                    <span className={`flex items-center gap-1 ${tone} font-bold text-[10px] uppercase tracking-wide truncate min-w-0 justify-end flex-1`}>
                      <Icon size={10} className="flex-shrink-0" />
                      <span className="truncate">{ptLabel}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {moments.length === 0 && !runnerUp && (
        <div className="text-[11px] text-dim italic text-center py-2">No moments to show.</div>
      )}
    </div>
  );
}

// ── Biggest Lead detail ────────────────────────────────────────────────────

function LeadMomentsDetail({ pointLog, tName, team1Id, team2Id, fmt, selectedPointId, onPointSelect }) {
  const moments = calcLeadMoments(pointLog);
  if (moments.length === 0) return null;

  return (
    <div>
      <div className="text-[9px] text-dim uppercase tracking-wide mb-1.5 flex items-center justify-between">
        <span>{moments.length === 1 ? "Reached at" : `Reached ${moments.length} times`}</span>
        <span className="text-dim/60 font-normal normal-case text-[8px]">Tap to find</span>
      </div>
      <ul className="space-y-1">
        {moments.map((m, i) => {
          const teamColor = m.team === 1 ? "text-accent" : "text-free";
          const teamName = tName(m.team === 1 ? team1Id : team2Id).split(" ")[0];
          const isSelected = selectedPointId === m.pointId;
          return (
            <li key={m.pointId}>
              <button
                type="button"
                onClick={() => onPointSelect?.(isSelected ? null : m.pointId)}
                aria-pressed={isSelected}
                className={`w-full flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-[6px] border-0 cursor-pointer text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text ${isSelected ? "bg-text/10 ring-1 ring-text/40" : (i % 2 === 0 ? "bg-alt" : "bg-bg/40")}`}
              >
                <span className="text-dim font-mono text-[10px] w-10">{fmt(m.timestamp) || "—"}</span>
                <span className="font-display text-[14px] leading-none">
                  <span className="text-accent">{m.t1}</span>
                  <span className="text-dim text-[10px] mx-0.5">–</span>
                  <span className="text-free">{m.t2}</span>
                </span>
                <span className={`${teamColor} font-bold text-[10px] uppercase tracking-wide`}>+{m.lead} {teamName}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Lead Changes detail ────────────────────────────────────────────────────

function LeadChangesDetail({ pointLog, tName, team1Id, team2Id, fmt, selectedPointId, onPointSelect }) {
  const changes = calcLeadChangeList(pointLog);
  if (changes.length === 0) return null;

  return (
    <div>
      <div className="text-[9px] text-dim uppercase tracking-wide mb-1.5 flex items-center justify-between">
        <span>{changes.length} lead {changes.length === 1 ? "change" : "changes"}</span>
        <span className="text-dim/60 font-normal normal-case text-[8px]">Tap to find</span>
      </div>
      <ul className="space-y-1">
        {changes.map((c, i) => {
          const fromColor = c.fromTeam === 1 ? "text-accent" : "text-free";
          const toColor   = c.toTeam   === 1 ? "text-accent" : "text-free";
          const fromName = tName(c.fromTeam === 1 ? team1Id : team2Id).split(" ")[0];
          const toName   = tName(c.toTeam   === 1 ? team1Id : team2Id).split(" ")[0];
          const isSelected = selectedPointId === c.pointId;
          return (
            <li key={c.pointId}>
              <button
                type="button"
                onClick={() => onPointSelect?.(isSelected ? null : c.pointId)}
                aria-pressed={isSelected}
                className={`w-full flex items-center justify-between gap-2 text-[11px] px-2.5 py-1.5 rounded-[6px] border-0 cursor-pointer text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text ${isSelected ? "bg-text/10 ring-1 ring-text/40" : (i % 2 === 0 ? "bg-alt" : "bg-bg/40")}`}
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
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
