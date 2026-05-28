import { useState } from "react";
import { Volleyball, Target } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import ExpandableStatCard from "./ExpandableStatCard";
import SegmentStrip from "./SegmentStrip";
import { formatDuration } from "../../lib/utils";
import { calcServeStats, calcServeTimeline } from "../../lib/matchStats";
import { POINT_TYPE_BY_ID } from "./pointTypes";
import { SectionLabelWithHelp } from "./StatInfo";
import { EXPLANATIONS } from "./explanations";

// Hex values for Recharts fills — must match design token colors
const OUTCOME = {
  ace:  { fill: "#16a34a", dimFill: "#16a34a", label: "ACE",  textCls: "text-success"    },
  won:  { fill: "#86efac", label: "Won rally",  textCls: "text-success/70"  },
  lost: { fill: "#fca5a5", label: "Lost rally", textCls: "text-error/70"    },
  err:  { fill: "#dc2626", label: "ERR",        textCls: "text-error"       },
};

/**
 * Serve breakdown — each player row shows WIN% (dominant) + SRV/ACE/ERR chips.
 * Expanded panel: stacked bar of serve outcomes + chronological serve strip.
 */
export default function ServeBreakdown({ pointLog, allIds, t1Ids, getPlayer, helpMode = false }) {
  if (allIds.length === 0) return null;
  const firstName = id => (getPlayer(id)?.name || "?").split(" ")[0];
  const startTs = pointLog[0]?.timestamp;

  return (
    <div className="mt-3 pt-3 border-t border-line">
      <SectionLabelWithHelp helpMode={helpMode} explanation={EXPLANATIONS.serveBreakdown}>
        Serve breakdown
      </SectionLabelWithHelp>
      <div className="rounded-[10px] overflow-hidden border border-line">
        {allIds.map(pid => {
          const isTeam1 = t1Ids.includes(pid);
          const sv = calcServeStats(pointLog, pid);
          return (
            <div key={pid} className="border-b border-line last:border-b-0">
              <ExpandableStatCard
                ariaLabel={`Show serve detail for ${firstName(pid)}`}
                chevronColor="text-dim/60"
                header={<PlayerServeRow sv={sv} isTeam1={isTeam1} name={firstName(pid)} />}
              >
                {sv.count > 0 ? (
                  <ServeDetail
                    pid={pid}
                    pointLog={pointLog}
                    isTeam1={isTeam1}
                    firstName={firstName}
                    startTs={startTs}
                    stats={sv}
                  />
                ) : (
                  <div className="px-3 pb-3 text-[11px] text-dim italic">No serves recorded.</div>
                )}
              </ExpandableStatCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Collapsed row ──────────────────────────────────────────────────────────

function PlayerServeRow({ sv, isTeam1, name }) {
  const avatarBg  = isTeam1 ? "bg-accent/20 text-accent" : "bg-free/20 text-free";
  const ringCls   = isTeam1 ? "ring-accent/30" : "ring-free/30";
  const pctColor  = sv.pct >= 60 ? "text-success" : sv.pct >= 40 ? "text-text" : "text-error";
  const initials  = name.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2.5">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ring-1 ${ringCls} ${avatarBg}`}>
        {initials}
      </div>

      {/* Name + chips */}
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-semibold text-text truncate block mb-1">{name}</span>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-dim">{sv.count} srv</span>
          {sv.aces > 0 && (
            <span className="flex items-center gap-0.5 text-success text-[10px] font-semibold">
              <Target size={9} />{sv.aces}
            </span>
          )}
          {sv.errors > 0 && (
            <span className="text-[10px] text-error font-semibold">{sv.errors} err</span>
          )}
        </div>
      </div>

      {/* WIN% — dominant */}
      <div className="flex-shrink-0 text-right min-w-[44px]">
        {sv.count > 0 ? (
          <>
            <div className={`font-display text-[22px] leading-none ${pctColor}`}>{sv.pct}%</div>
            <div className="text-[8px] text-dim uppercase tracking-wide">win</div>
          </>
        ) : (
          <>
            <div className="font-display text-[22px] leading-none text-dim">—</div>
            <div className="text-[8px] text-dim uppercase tracking-wide">win</div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Expanded detail ────────────────────────────────────────────────────────

function ServeDetail({ pid, pointLog, isTeam1, firstName, startTs, stats }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const timeline = calcServeTimeline(pid, pointLog);
  const accent   = isTeam1 ? "text-accent" : "text-free";

  const stripItems = timeline.map((s, i) => ({
    key: s.id,
    colorClass: s.won ? "bg-success" : "bg-error/70",
    ariaLabel: `Serve ${i + 1}, ${s.won ? "won" : "lost"} at ${s.t1}-${s.t2}`,
  }));

  const selected = timeline.find(s => s.id === selectedKey) || null;

  // Stacked bar data — one row, four segments
  const chartData = [{
    ace:  stats.aces,
    won:  stats.inPlayWon,
    lost: stats.inPlayLost,
    err:  stats.errors,
  }];

  const legendItems = [
    stats.aces       > 0 && { key: "ace",  ...OUTCOME.ace,  value: stats.aces       },
    stats.inPlayWon  > 0 && { key: "won",  ...OUTCOME.won,  value: stats.inPlayWon  },
    stats.inPlayLost > 0 && { key: "lost", ...OUTCOME.lost, value: stats.inPlayLost },
    stats.errors     > 0 && { key: "err",  ...OUTCOME.err,  value: stats.errors     },
  ].filter(Boolean);

  return (
    <div className="bg-bg/60 border border-line rounded-[10px] px-3 py-2.5 mx-2.5 mb-2.5 space-y-3">

      {/* Serve outcomes stacked bar */}
      <div>
        <div className="text-[8px] font-bold text-dim uppercase tracking-wide mb-2">Serve outcomes</div>
        <div className="rounded-full overflow-hidden">
          <ResponsiveContainer width="100%" height={20}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              barSize={20}
            >
              <XAxis type="number" hide domain={[0, stats.count]} />
              <YAxis type="category" hide />
              <Bar dataKey="ace"  stackId="s" fill={OUTCOME.ace.fill}  isAnimationActive={false} />
              <Bar dataKey="won"  stackId="s" fill={OUTCOME.won.fill}  isAnimationActive={false} />
              <Bar dataKey="lost" stackId="s" fill={OUTCOME.lost.fill} isAnimationActive={false} />
              <Bar dataKey="err"  stackId="s" fill={OUTCOME.err.fill}  isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {legendItems.map(item => (
            <span key={item.key} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
              <span className={`text-[9px] ${item.textCls}`}>{item.label}</span>
              <span className={`text-[10px] font-bold ${item.textCls}`}>{item.value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Serve strip */}
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[8px] font-bold text-dim uppercase tracking-wide">Serves over time</span>
          <span className={`text-[10px] font-bold ${accent}`}>{firstName(pid)}</span>
        </div>
        <SegmentStrip
          items={stripItems}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          size="md"
        />
      </div>

      {/* Inline tile detail on tap */}
      {selected && (
        <div className="px-2.5 py-1.5 rounded-[6px] bg-alt flex items-center gap-2 text-[11px]">
          <span className="text-dim font-mono text-[10px]">
            {startTs && selected.timestamp ? formatDuration(selected.timestamp - startTs) : "—"}
          </span>
          <span className="font-display text-[13px] leading-none">
            <span className="text-accent">{selected.t1}</span>
            <span className="text-dim text-[10px] mx-0.5">–</span>
            <span className="text-free">{selected.t2}</span>
          </span>
          <span className={`font-bold uppercase text-[10px] tracking-wide ${selected.won ? "text-success" : "text-error"}`}>
            {selected.won ? "Won" : "Lost"}
          </span>
          <span className="flex items-center gap-1 text-text ml-auto">
            {(() => {
              const pt = POINT_TYPE_BY_ID[selected.pointType];
              const Icon = pt?.icon || Volleyball;
              return (
                <>
                  <Icon size={11} />
                  <span className="truncate">{pt?.label || selected.pointTypeLabel || "Punto"}</span>
                </>
              );
            })()}
          </span>
        </div>
      )}

    </div>
  );
}
