import { useState } from "react";
import { Volleyball } from "lucide-react";
import { SectionLabel } from "../ui-new";
import ExpandableStatCard from "./ExpandableStatCard";
import SegmentStrip from "./SegmentStrip";
import { formatDuration } from "../../lib/utils";
import {
  calcServeStats, calcServeTimeline, calcServeStreaks,
} from "../../lib/matchStats";
import { POINT_TYPE_BY_ID } from "./pointTypes";

/**
 * Serve breakdown table — each player row is expandable to reveal a chronological
 * serve strip (won/lost color tiles) plus a run-rate block. Tapping a tile shows
 * the score + outcome for that serve.
 *
 * Props:
 *   pointLog    array
 *   allIds      string[]   — every player id, both teams in order
 *   t1Ids       string[]   — team1 ids (for color dot)
 *   getPlayer   fn(id)
 */
export default function ServeBreakdown({ pointLog, allIds, t1Ids, getPlayer }) {
  if (allIds.length === 0) return null;
  const firstName = id => (getPlayer(id)?.name || "?").split(" ")[0];
  const startTs = pointLog[0]?.timestamp;

  return (
    <div className="mt-3 pt-3 border-t border-line">
      <SectionLabel>Serve breakdown</SectionLabel>
      <div className="rounded-[10px] overflow-hidden border border-line">
        <div className="flex px-2.5 py-1.5 bg-alt">
          <span className="flex-1 text-[9px] font-bold text-dim">PLAYER</span>
          <span className="w-10 text-[9px] font-bold text-dim text-center">SRV</span>
          <span className="w-12 text-[9px] font-bold text-dim text-center">WIN%</span>
          <span className="w-10 text-[9px] font-bold text-dim text-center">ACES</span>
          <span className="w-[22px] flex-shrink-0" />
        </div>
        {allIds.map(pid => {
          const isTeam1 = t1Ids.includes(pid);
          const sv = calcServeStats(pointLog, pid);
          return (
            <div key={pid} className="border-b border-line last:border-b-0">
              <ExpandableStatCard
                ariaLabel={`Show serve detail for ${firstName(pid)}`}
                chevronColor="text-dim/60"
                header={
                  <div className="flex items-center px-2.5 py-[7px]">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mr-2 ${isTeam1 ? "bg-accent" : "bg-free"}`} />
                    <span className="flex-1 text-[11px] text-text truncate">{firstName(pid)}</span>
                    <span className="w-10 text-[11px] text-dim text-center">{sv.count}</span>
                    <span className={`w-12 text-[11px] font-bold text-center ${sv.pct >= 60 ? "text-success" : sv.pct >= 40 ? "text-text" : "text-error"}`}>
                      {sv.count ? `${sv.pct}%` : "—"}
                    </span>
                    <span className="w-10 text-[11px] text-dim text-center">{sv.aces}</span>
                  </div>
                }
              >
                {sv.count > 0 ? (
                  <ServeDetail
                    pid={pid}
                    pointLog={pointLog}
                    isTeam1={isTeam1}
                    firstName={firstName}
                    startTs={startTs}
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

function ServeDetail({ pid, pointLog, isTeam1, firstName, startTs }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const timeline = calcServeTimeline(pid, pointLog);
  const streaks = calcServeStreaks(timeline);

  const items = timeline.map((s, i) => ({
    key: s.id,
    colorClass: s.won ? "bg-success" : "bg-error/70",
    ariaLabel: `Serve ${i + 1}, ${s.won ? "won" : "lost"} at ${s.t1}-${s.t2}`,
  }));

  const selected = timeline.find(s => s.id === selectedKey) || null;
  const accent = isTeam1 ? "text-accent" : "text-free";

  return (
    <div className="bg-bg/60 border border-line rounded-[10px] px-3 py-2.5 mx-2.5 mb-2.5">
      {/* Serve strip */}
      <div className="mb-2">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[8px] font-bold text-dim uppercase tracking-wide">Serves over time</span>
          <span className={`text-[10px] font-bold ${accent}`}>{firstName(pid)}</span>
        </div>
        <SegmentStrip
          items={items}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          size="md"
        />
      </div>

      {/* Inline tile detail */}
      {selected && (
        <div className="mt-2 mb-2 px-2.5 py-1.5 rounded-[6px] bg-alt flex items-center gap-2 text-[11px]">
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
              return <>
                <Icon size={11} />
                <span className="truncate">{pt?.label || selected.pointTypeLabel || "Punto"}</span>
              </>;
            })()}
          </span>
        </div>
      )}

      {/* Run rate */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="bg-alt rounded-[8px] px-2 py-1.5 text-center">
          <div className="font-display text-[18px] leading-none text-success">{streaks.longest}</div>
          <div className="text-[8px] text-dim uppercase tracking-wide mt-0.5">Best run</div>
        </div>
        <div className="bg-alt rounded-[8px] px-2 py-1.5 text-center">
          <div className={`font-display text-[18px] leading-none ${streaks.trailingWon ? "text-success" : "text-error"}`}>
            {streaks.trailing}
          </div>
          <div className="text-[8px] text-dim uppercase tracking-wide mt-0.5">
            Trailing {streaks.trailingWon ? "wins" : "losses"}
          </div>
        </div>
      </div>
    </div>
  );
}
