import { useState } from "react";
import { Volleyball, AlertTriangle, CheckCircle2 } from "lucide-react";
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
 *     sparkline with time-of-match, server, scorer/error player, winner,
 *     score, point type, and time-since-previous-point (rally proxy).
 *
 * Tapping the same dot again deselects.
 *
 * Selection can be controlled by a parent (so other cards — Biggest Lead,
 * Lead Changes, Match Dynamics — can highlight their moment in the strip):
 *   selectedId    string|null   — when provided + setSelectedId provided,
 *                                 the component runs in controlled mode.
 *   setSelectedId fn(id|null)
 *
 * If only one of those is provided, internal state is used.
 *
 * Other props:
 *   pointLog   array  — log entries already filtered to e.team !== null
 *   getTeam    fn(id)
 *   getPlayer  fn(id)
 *   team1Id    string
 *   team2Id    string
 *   setsCount  number — total sets played (hides "Set X" when 1)
 */
export default function MatchFlow({
  pointLog, getTeam, getPlayer, team1Id, team2Id, setsCount = 1,
  selectedId: selectedIdProp, setSelectedId: setSelectedIdProp,
}) {
  const [internalId, setInternalId] = useState(null);
  const isControlled = selectedIdProp !== undefined && typeof setSelectedIdProp === "function";
  const selectedId = isControlled ? selectedIdProp : internalId;
  const setSelectedId = isControlled ? setSelectedIdProp : setInternalId;

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
          setsCount={setsCount}
        />
      )}
    </div>
  );
}

function PointDetailPanel({ point, prev, startTs, getTeam, firstName, team1Id, team2Id, setsCount }) {
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

  // For a "rival error" point, scoringPlayerId is null and errorPlayerId carries
  // the opposing player who made the mistake. Otherwise scoringPlayerId is set.
  const isError = point.pointType === "error";
  const attributedId = isError ? point.errorPlayerId : point.scoringPlayerId;
  const attributedLabel = isError ? "Error by" : "Scored by";
  const AttributedIcon = isError ? AlertTriangle : CheckCircle2;
  const attributedTone = isError ? "text-error" : "text-text";

  return (
    <div className="mt-3 bg-bg/60 border border-line rounded-[10px] px-3 py-2.5 text-left">
      {/* Header line: time + point + (set if multi-set) + score */}
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] font-bold text-dim uppercase tracking-wide">
          {tOfMatch ? `${tOfMatch} · ` : ""}Point {point.pointNum ?? ""}
          {setsCount > 1 && point.setNum != null ? ` · Set ${point.setNum + 1}` : ""}
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
          <span className={`${winnerColor} font-bold truncate inline-block max-w-full`}>{winnerName}</span>
        </DetailRow>

        <DetailRow label={attributedLabel}>
          {attributedId ? (
            <span className={`flex items-center gap-1 ${attributedTone}`}>
              <AttributedIcon size={11} />
              <span className="truncate">{firstName(attributedId)}</span>
            </span>
          ) : <span className="text-dim">—</span>}
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
