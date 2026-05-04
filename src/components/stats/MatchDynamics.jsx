import { useState } from "react";
import { Flame, Equal, Activity, Volleyball } from "lucide-react";
import { AppCard, SectionLabel } from "../ui-new";
import { formatDuration } from "../../lib/utils";
import {
  calcBestStreakRun, calcTiedMoments, calcClutchMoments,
} from "../../lib/matchStats";
import { POINT_TYPE_BY_ID } from "./pointTypes";

/**
 * Match Dynamics card (Stats tab). Three tiles share a single inline
 * expansion below: Best Streak / Times Tied / Clutch Points.
 *
 * Each expansion lists the actual moments behind the headline number.
 *
 * Props:
 *   pointLog   array
 *   s1, s2     team stat blobs (used for the Best Streak headline + label)
 *   getTeam    fn(id)
 *   getPlayer  fn(id)
 *   team1Id    string
 *   team2Id    string
 *   dynStats   { timesTied, closePoints }
 */
export default function MatchDynamics({
  pointLog, s1, s2, getTeam, getPlayer, team1Id, team2Id, dynStats,
}) {
  const [open, setOpen] = useState(null); // "streak" | "tied" | "clutch" | null
  const tName = id => getTeam(id)?.name || "?";
  const firstName = id => (getPlayer(id)?.name || "—").split(" ")[0];

  const startTs = pointLog[0]?.timestamp;
  const fmt = (ts) => (startTs && ts) ? formatDuration(ts - startTs) : null;

  const bestStreak = Math.max(s1.bestStreak, s2.bestStreak);
  const streakIsTeam1 = s1.bestStreak >= s2.bestStreak;
  const streakTeamLabel = tName(streakIsTeam1 ? team1Id : team2Id).split(" ")[0];

  const tiedSubtitle = dynStats.timesTied > 5
    ? "Neck & neck"
    : dynStats.timesTied >= 2 ? "Some tension" : "Dominated";

  const toggle = (key) => setOpen(o => o === key ? null : key);

  return (
    <AppCard className="px-3.5 py-3 mb-3">
      <SectionLabel>Match dynamics</SectionLabel>

      <div className="flex gap-2">
        <Tile
          selected={open === "streak"}
          onClick={() => bestStreak > 0 && toggle("streak")}
          disabled={bestStreak === 0}
          icon={<Flame size={16} className="text-dim mx-auto mb-1.5" />}
          primary={String(bestStreak)}
          primaryClass="text-text"
          secondary={streakTeamLabel}
          label="Best streak"
        />
        <Tile
          selected={open === "tied"}
          onClick={() => dynStats.timesTied > 0 && toggle("tied")}
          disabled={dynStats.timesTied === 0}
          icon={<Equal size={16} className="text-dim mx-auto mb-1.5" />}
          primary={String(dynStats.timesTied)}
          primaryClass="text-text"
          secondary={tiedSubtitle}
          label="Times tied"
        />
        <Tile
          selected={open === "clutch"}
          onClick={() => dynStats.closePoints > 0 && toggle("clutch")}
          disabled={dynStats.closePoints === 0}
          icon={<Activity size={16} className="text-dim mx-auto mb-1.5" />}
          primary={String(dynStats.closePoints)}
          primaryClass="text-text"
          secondary="margin ≤ 2"
          label="Clutch points"
        />
      </div>

      {/* Shared expansion panel */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pt-3">
            {open === "streak" && (
              <BestStreakDetail
                pointLog={pointLog}
                tName={tName}
                team1Id={team1Id}
                team2Id={team2Id}
                firstName={firstName}
                fmt={fmt}
              />
            )}
            {open === "tied" && (
              <TiedDetail
                pointLog={pointLog}
                firstName={firstName}
                fmt={fmt}
              />
            )}
            {open === "clutch" && (
              <ClutchDetail
                pointLog={pointLog}
                tName={tName}
                team1Id={team1Id}
                team2Id={team2Id}
                firstName={firstName}
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
      <div className={`font-display text-[24px] leading-none mb-0.5 ${primaryClass}`}>{primary}</div>
      {secondary && <div className="text-[10px] text-dim truncate px-1">{secondary}</div>}
      <div className="text-[9px] text-dim uppercase mt-1">{label}</div>
    </button>
  );
}

// ── Best Streak detail ─────────────────────────────────────────────────────

function BestStreakDetail({ pointLog, tName, team1Id, team2Id, firstName, fmt }) {
  const run = calcBestStreakRun(pointLog);
  if (run.length === 0) return null;
  const accent = run.team === 1 ? "text-accent" : "text-free";
  const teamName = tName(run.team === 1 ? team1Id : team2Id);

  return (
    <div>
      <div className="text-[9px] text-dim uppercase tracking-wide mb-1.5">
        <span className={`${accent} font-bold`}>{teamName}</span> ran <span className={`${accent} font-bold`}>{run.length}</span> straight
      </div>
      <ul className="space-y-1">
        {run.points.map((p, i) => (
          <MomentRow
            key={p.id}
            t={fmt(p.timestamp)}
            t1={p.t1}
            t2={p.t2}
            rightSlot={
              <span className={`flex items-center gap-1 ${accent} font-bold text-[10px] uppercase tracking-wide truncate`}>
                <span className="truncate">{p.scoringPlayerId ? firstName(p.scoringPlayerId) : "—"}</span>
              </span>
            }
            stripe={i % 2 === 0}
          />
        ))}
      </ul>
    </div>
  );
}

// ── Tied detail ────────────────────────────────────────────────────────────

function TiedDetail({ pointLog, firstName, fmt }) {
  const moments = calcTiedMoments(pointLog);
  if (moments.length === 0) return null;

  return (
    <div>
      <div className="text-[9px] text-dim uppercase tracking-wide mb-1.5">
        Score was tied {moments.length} {moments.length === 1 ? "time" : "times"}
      </div>
      <ul className="space-y-1">
        {moments.map((m, i) => {
          const lastScorer = m.scoringPlayerId ? firstName(m.scoringPlayerId)
                          : m.errorPlayerId   ? firstName(m.errorPlayerId)
                          : null;
          return (
            <MomentRow
              key={m.id}
              t={fmt(m.timestamp)}
              t1={m.t1}
              t2={m.t2}
              rightSlot={
                <span className="text-text text-[10px] truncate">
                  {lastScorer ? `tied by ${lastScorer}` : "tied"}
                </span>
              }
              stripe={i % 2 === 0}
            />
          );
        })}
      </ul>
    </div>
  );
}

// ── Clutch detail ──────────────────────────────────────────────────────────

function ClutchDetail({ pointLog, tName, team1Id, team2Id, firstName, fmt }) {
  const moments = calcClutchMoments(pointLog);
  if (moments.length === 0) return null;

  return (
    <div>
      <div className="text-[9px] text-dim uppercase tracking-wide mb-1.5">
        {moments.length} close-margin {moments.length === 1 ? "point" : "points"} (≤ 2)
      </div>
      <ul className="space-y-1">
        {moments.map((m, i) => {
          const accent = m.team === 1 ? "text-accent" : "text-free";
          const teamLabel = tName(m.team === 1 ? team1Id : team2Id).split(" ")[0];
          const ptType = POINT_TYPE_BY_ID[m.pointType];
          const Icon = ptType?.icon || Volleyball;
          const scorer = m.scoringPlayerId ? firstName(m.scoringPlayerId) : null;
          return (
            <MomentRow
              key={m.id}
              t={fmt(m.timestamp)}
              t1={m.t1}
              t2={m.t2}
              rightSlot={
                <span className={`flex items-center gap-1 ${accent} font-bold text-[10px] uppercase tracking-wide truncate min-w-0`}>
                  <Icon size={10} className="flex-shrink-0" />
                  <span className="truncate">{scorer || teamLabel}</span>
                </span>
              }
              stripe={i % 2 === 0}
            />
          );
        })}
      </ul>
    </div>
  );
}

// ── Shared row layout ──────────────────────────────────────────────────────

function MomentRow({ t, t1, t2, rightSlot, stripe }) {
  return (
    <li
      className={`flex items-center justify-between gap-2 text-[11px] px-2.5 py-1.5 rounded-[6px] ${stripe ? "bg-alt" : "bg-bg/40"}`}
    >
      <span className="text-dim font-mono text-[10px] w-10 flex-shrink-0">{t || "—"}</span>
      <span className="font-display text-[14px] leading-none flex-shrink-0">
        <span className="text-accent">{t1}</span>
        <span className="text-dim text-[10px] mx-0.5">–</span>
        <span className="text-free">{t2}</span>
      </span>
      <span className="min-w-0 flex-1 flex items-center justify-end">{rightSlot}</span>
    </li>
  );
}
