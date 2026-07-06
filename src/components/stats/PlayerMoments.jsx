import { CheckCircle2, AlertTriangle, Trophy, Flag, Equal, Swords } from "lucide-react";
import { calcPlayerMoments } from "../../lib/matchStats";
import { POINT_TYPE_BY_ID, ERROR_SUBTYPE_BY_ID, normalizeErrorType } from "./pointTypes";

/**
 * "Key moments" timeline for one player: every point they scored or errored,
 * with timestamp, running score, point type (errors carry their action type,
 * e.g. "Spike error"), and a pressure badge for points played under pressure
 * (match/set point, tied score, clutch). Rows are tappable →
 * onPointSelect(pointId) highlights the point in Match Flow.
 *
 * Shared by MatchHighlights (MVP detail) and TopPerformers (expanded player).
 *
 * Props:
 *   pid             string
 *   pointLog        array
 *   isTeam1         bool         — accent color for scored moments
 *   fmt             fn(ts)       — elapsed-time formatter
 *   selectedPointId string|null
 *   onPointSelect   fn(id|null)
 *   pressureTags    { [pointId]: tag } from calcPressureTags
 */

const PRESSURE_BADGES = {
  match_point: { Icon: Trophy, label: "Match point", cls: "text-success" },
  set_point:   { Icon: Flag,   label: "Set point",   cls: "text-success" },
  tied:        { Icon: Equal,  label: "Tied score",  cls: "text-dim" },
  clutch:      { Icon: Swords, label: "Clutch",      cls: "text-dim" },
};

export default function PlayerMoments({
  pid, pointLog, isTeam1, fmt,
  selectedPointId, onPointSelect,
  pressureTags = {},
}) {
  const moments = calcPlayerMoments(pid, pointLog);
  const accent = isTeam1 ? "text-accent" : "text-free";

  if (moments.length === 0) {
    return <div className="text-[11px] text-dim italic text-center py-2">No moments to show.</div>;
  }

  return (
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
          const errSub = isError ? normalizeErrorType(m.errorType) : null;
          const ptLabel = isError
            ? (errSub === "untyped" ? "Error" : `${ERROR_SUBTYPE_BY_ID[errSub].label} error`)
            : (POINT_TYPE_BY_ID[m.pointType]?.label || "Point");
          const badge = PRESSURE_BADGES[pressureTags[m.id]];
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
                {/* Pressure badge — fixed slot so rows stay aligned */}
                <span
                  className="w-3.5 flex-shrink-0 flex items-center justify-center"
                  title={badge?.label}
                >
                  {badge && <badge.Icon size={10} className={badge.cls} aria-label={badge.label} />}
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
  );
}
