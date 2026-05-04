const SLICE_COLORS = {
  ace:   "#F5A623",
  spike: "#8B5CF6",
  block: "#00BCD4",
  tip:   "#2ECC71",
  error: "#E74C3C",
};

export const SLICE_LABELS = {
  ace:   "Ace",
  spike: "Spike",
  block: "Block",
  tip:   "Tip",
  error: "Error",
};

const SLICE_LABELS_PLURAL = {
  ace:   "Aces",
  spike: "Spikes",
  block: "Blocks",
  tip:   "Tips",
  error: "Errors",
};

function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function donutPath(cx, cy, ro, ri, start, end) {
  if (end - start >= 360) end = start + 359.99;
  const [sx, sy]   = polar(cx, cy, ro, start);
  const [ex, ey]   = polar(cx, cy, ro, end);
  const [six, siy] = polar(cx, cy, ri, end);
  const [eix, eiy] = polar(cx, cy, ri, start);
  const lg = end - start > 180 ? 1 : 0;
  return `M${sx},${sy} A${ro},${ro} 0 ${lg},1 ${ex},${ey} L${six},${siy} A${ri},${ri} 0 ${lg},0 ${eix},${eiy}Z`;
}

/**
 * SVG donut chart for per-player point-type breakdown.
 *
 * Props:
 *   byType      { ace, spike, block, tip }  — scored points per type
 *   errors      number                       — opponent errors caused by this player
 *   activeType  string|null                  — currently selected segment id
 *   onTypeSelect fn(id|null)                 — called when a segment is tapped
 */
export default function PlayerDonutChart({ byType, errors, activeType, onTypeSelect }) {
  const raw = [
    { id: "ace",   count: byType?.ace   || 0 },
    { id: "spike", count: byType?.spike || 0 },
    { id: "block", count: byType?.block || 0 },
    { id: "tip",   count: byType?.tip   || 0 },
    { id: "error", count: errors        || 0 },
  ].filter(s => s.count > 0);

  const total = raw.reduce((acc, s) => acc + s.count, 0);
  if (total === 0) return null;

  const GAP = raw.length > 1 ? 3 : 0;
  let angle = 0;
  const segs = raw.map(s => {
    const sweep = (s.count / total) * 360;
    const seg = { ...s, start: angle + GAP / 2, end: angle + sweep - GAP / 2 };
    angle += sweep;
    return seg;
  });

  const active = segs.find(s => s.id === activeType) || null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2.5">
        {/* Donut */}
        <div className="flex-shrink-0">
          <svg viewBox="0 0 100 100" width={92} height={92} aria-label="Point distribution">
            {segs.map(s => {
              const isActive = s.id === activeType;
              return (
                <path
                  key={s.id}
                  d={donutPath(50, 50, isActive ? 44 : 40, isActive ? 25 : 28, s.start, s.end)}
                  fill={SLICE_COLORS[s.id]}
                  opacity={activeType && !isActive ? 0.2 : 1}
                  onClick={() => onTypeSelect(isActive ? null : s.id)}
                  style={{ cursor: "pointer", transition: "opacity 0.12s" }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${SLICE_LABELS[s.id]}: ${s.count}`}
                  aria-pressed={isActive}
                  onKeyDown={e => e.key === "Enter" && onTypeSelect(isActive ? null : s.id)}
                />
              );
            })}
            {/* Center label */}
            <text
              x="50" y="46"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: active ? 15 : 19,
                fontFamily: "Bebas Neue, Impact, sans-serif",
                fill: active ? SLICE_COLORS[active.id] : "#E8ECF1",
              }}
            >
              {active ? active.count : total}
            </text>
            <text
              x="50" y="59"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: 6.5,
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 700,
                fill: "#7A8EA0",
                letterSpacing: 0.5,
              }}
            >
              {active ? SLICE_LABELS[active.id].toUpperCase() : "PTS"}
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-[5px] flex-1 min-w-0">
          {segs.map(s => {
            const isActive = s.id === activeType;
            const pct = Math.round((s.count / total) * 100);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onTypeSelect(isActive ? null : s.id)}
                className={`flex items-center gap-1.5 w-full text-left bg-transparent border-0 cursor-pointer rounded-[5px] py-[3px] px-1.5 -mx-1.5 transition-colors ${isActive ? "bg-line/50" : ""}`}
              >
                <span
                  className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: SLICE_COLORS[s.id],
                    opacity: activeType && !isActive ? 0.3 : 1,
                  }}
                />
                <span className={`text-[11px] font-semibold flex-1 truncate ${isActive ? "text-text" : "text-dim"}`}>
                  {SLICE_LABELS_PLURAL[s.id]}
                </span>
                <span className={`text-[11px] font-bold tabular-nums ${isActive ? "text-text" : "text-dim"}`}>
                  {s.count}
                </span>
                <span className={`text-[9px] w-7 text-right tabular-nums ${isActive ? "text-dim" : "text-dim/40"}`}>
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tap hint */}
      {!activeType && (
        <p className="text-[9px] text-dim/60 text-center mb-2.5">
          Tap a slice or row to see those moments
        </p>
      )}
    </div>
  );
}

export { SLICE_LABELS_PLURAL };
