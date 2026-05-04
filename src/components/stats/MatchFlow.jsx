import { useState } from "react";
import { Volleyball } from "lucide-react";
import { formatDuration } from "../../lib/utils";
import { cumulativeMargin } from "../../lib/matchStats";
import MiniSparkline from "./MiniSparkline";
import { POINT_TYPE_BY_ID } from "./pointTypes";

/**
 * Interactive Match Flow strip.
 *
 *   • Each point becomes a tappable dot. Selected dot rings + scales.
 *   • Below the dots, a margin sparkline (cumulative t1 - t2) plots momentum.
 *   • When a dot is selected, an inline PointDetailPanel appears beneath the
 *     sparkline with time-of-match, server, winner, score, point type, and
 *     "time since previous point" (rally-duration proxy — labeled honestly).
 *
 * Tapping the same dot again deselects.
 *
 * Props:
 *   pointLog   array  — log entries already filtered to e.team !== null
 *   getTeam    fn(id)
 *   getPlayer  fn(id)
 *   team1Id    string
 *   team2Id    string
 */
export default function MatchFlow({ pointLog, getTeam, getPlayer, team1Id, team2Id }) {
  const [selectedId, setSelectedId] = useState(null);

  if (pointLog.length === 0) return null;

  const tName     = id => getTeam(id)?.name || "?";
  const firstName = id => (getPlayer(id)?.name || "—").split(" ")[0];

  const startTs = pointLog[0]?.timestamp;
  const margin = cumulativeMargin(pointLog);

  const selectedIdx = selectedId
    ? pointLog.findIndex(e => e.id === selectedId)
    : -1;
  const selected = selectedIdx >= 0 ? pointLog[selectedIdx] : null;
  const prevPoint = selectedIdx > 0 ? pointLog[selectedIdx - 1] : null;

  return (
    <div className="mt-3 pt-3 border-t border-line/60">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] text-dim uppercase tracking-wide">Match flow</span>
        <span className="text-[9px] text-dim/70">Tap a point</span>
      </div>

      {/* Dot row — tappable */}
      <div className="flex flex-wrap gap-[2px] justify-center">
        {pointLog.map((e, i) => {
          const isSelected = e.id === selectedId;
          const baseColor = e.team === 1 ? "bg-accent" : "bg-free";
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelectedId(isSelected ? null : e.id)}
              aria-label={`Point ${i + 1}, ${e.t1}–${e.t2}`}
              aria-pressed={isSelected}
              className="p-1.5 -m-1.5 bg-transparent border-0 cursor-pointer flex items-center justify-center focus-visible:outline-none"
            >
              <span
                className={`w-[5px] h-[5px] rounded-[1px] block transition-transform duration-150 motion-reduce:transition-none ${baseColor} ${isSelected ? "ring-2 ring-text scale-[2.2] z-10 relative" : ""}`}
              />
            </button>
          );
        })}
      </div>

      {/* Margin sparkline — momentum visual */}
      {margin.length > 1 && (
        <div className="mt-2.5 flex items-center gap-2 text-dim">
          <span className="text-[8px] font-bold text-accent w-6 text-right">{tName(team1Id).slice(0, 3).toUpperCase()}</span>
          <MiniSparkline
            points={margin}
            width={180}
            height={28}
            stroke="currentColor"
            strokeWidth={1.25}
            baseline
            signed
            className="flex-1 text-text"
            ariaLabel="Score margin over time"
          />
          <span className="text-[8px] font-bold text-free w-6">{tName(team2Id).slice(0, 3).toUpperCase()}</span>
        </div>
      )}

      {/* Inline detail panel */}
      {selected && (
        <PointDetailPanel
          point={selected}
          prev={prevPoint}
          startTs={startTs}
          getTeam={getTeam}
          firstName={firstName}
          team1Id={team1Id}
          team2Id={team2Id}
        />
      )}
    </div>
  );
}

function PointDetailPanel({ point, prev, startTs, getTeam, firstName, team1Id, team2Id }) {
  const isTeam1Winner = point.team === 1;
  const winnerColor = isTeam1Winner ? "text-accent" : "text-free";
  const winnerName = getTeam(isTeam1Winner ? team1Id : team2Id)?.name || "?";

  const tOfMatch = startTs && point.timestamp
    ? formatDuration(point.timestamp - startTs)
    : null;
  const sincePrev = prev?.timestamp && point.timestamp
    ? formatDuration(point.timestamp - prev.timestamp)
    : null;

  const ptType = POINT_TYPE_BY_ID[point.pointType];
  const PtIcon = ptType?.icon || Volleyball;

  const serverIsTeam1 = point.serverTeam === 1;
  const serverDot = serverIsTeam1 ? "bg-accent" : "bg-free";

  return (
    <div className="mt-3 bg-bg/60 border border-line rounded-[10px] px-3 py-2.5 text-left">
      {/* Header line: time + score */}
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] font-bold text-dim uppercase tracking-wide">
          {tOfMatch ? `${tOfMatch} · ` : ""}Point {point.pointNum ?? ""}
          {point.setNum != null ? ` · Set ${point.setNum + 1}` : ""}
        </span>
        <span className="font-display text-[22px] leading-none">
          <span className="text-accent">{point.t1}</span>
          <span className="text-dim text-[14px] mx-1">–</span>
          <span className="text-free">{point.t2}</span>
        </span>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
        <DetailRow label="Server">
          {point.serverPlayerId ? (
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${serverDot}`} />
              <span className="text-text">{firstName(point.serverPlayerId)}</span>
            </span>
          ) : <span className="text-dim">—</span>}
        </DetailRow>

        <DetailRow label="Won by">
          <span className={`${winnerColor} font-bold`}>{winnerName.split(" ")[0]}</span>
        </DetailRow>

        <DetailRow label="Point type">
          <span className="flex items-center gap-1 text-text">
            <PtIcon size={11} />
            {ptType?.label || point.pointTypeLabel || "Punto"}
          </span>
        </DetailRow>

        <DetailRow label="Since previous">
          <span className="text-text">{sincePrev || "—"}</span>
        </DetailRow>
      </div>
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[8px] font-bold text-dim uppercase tracking-wide">{label}</span>
      <span className="text-[11px]">{children}</span>
    </div>
  );
}
