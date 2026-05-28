import { useState, useRef, useCallback, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Volleyball, AlertTriangle, CheckCircle2 } from "lucide-react";
import { POINT_TYPE_BY_ID } from "./pointTypes";
import { HelpInlineButton, InfoPanel } from "./StatInfo";
import { EXPLANATIONS } from "./explanations";

const PANEL_W  = 172;
const PANEL_H  = 120;
const GAP      = 10;

export default function MatchFlow({
  pointLog, getTeam, getPlayer, team1Id, team2Id, setsCount = 1,
  selectedId: selectedIdProp, setSelectedId: setSelectedIdProp,
  helpMode = false,
}) {
  const [internalId, setInternalId] = useState(null);
  const [helpOpen, setHelpOpen]     = useState(false);
  const [panelPos, setPanelPos]     = useState(null);
  const containerRef = useRef(null);
  const wrapperRef   = useRef(null);

  const isControlled  = selectedIdProp !== undefined && typeof setSelectedIdProp === "function";
  const selectedId    = isControlled ? selectedIdProp    : internalId;
  const setSelectedId = isControlled ? setSelectedIdProp : setInternalId;

  const selectedIdx = selectedId ? pointLog.findIndex(e => e.id === selectedId) : -1;
  const selected    = selectedIdx >= 0 ? pointLog[selectedIdx] : null;

  // Close panel on tap/click outside the component
  useEffect(() => {
    if (!selected) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setSelectedId(null);
        setPanelPos(null);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [selected, setSelectedId]);

  if (pointLog.length === 0) return null;

  const tName     = id => getTeam(id)?.name    || "?";
  const firstName = id => (getPlayer(id)?.name || "—").split(" ")[0];

  const chartData = pointLog.map((e, i) => ({
    i,
    point: e.pointNum ?? i + 1,
    t1: e.t1,
    t2: e.t2,
    id: e.id,
  }));

  const handleClick = useCallback((data) => {
    if (!data?.activePayload?.length) return;
    const payload = data.activePayload[0]?.payload;
    if (!payload) return;
    const entry = pointLog[payload.i];
    if (!entry) return;

    if (entry.id === selectedId) {
      setSelectedId(null);
      setPanelPos(null);
      return;
    }

    setSelectedId(entry.id);

    if (containerRef.current) {
      const cw = containerRef.current.offsetWidth;
      const ch = containerRef.current.offsetHeight;
      setPanelPos({ x: data.chartX ?? cw / 2, y: data.chartY ?? ch / 2, cw, ch });
    }
  }, [pointLog, selectedId, setSelectedId]);

  const getPanelStyle = () => {
    if (!panelPos) return { display: "none" };
    const { x, y, cw, ch } = panelPos;

    let left = x + GAP;
    if (left + PANEL_W > cw - GAP) left = x - PANEL_W - GAP;
    left = Math.max(GAP, left);

    let top = y - PANEL_H / 2;
    top = Math.max(0, Math.min(top, ch - PANEL_H));

    return { left, top, width: PANEL_W };
  };

  // Render a glow + solid dot only on the selected point for each line
  const makeDot = (color) => (props) => {
    const { cx, cy, payload } = props;
    if (payload.id !== selectedId) return <g key={`dot-${payload.i}`} />;
    return (
      <g key={`dot-sel-${payload.i}`}>
        <circle cx={cx} cy={cy} r={9}   fill={color} opacity={0.18} />
        <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="var(--color-surface)" strokeWidth={2} />
      </g>
    );
  };

  const tickInterval = Math.max(0, Math.ceil(chartData.length / 7) - 1);

  return (
    <div ref={wrapperRef} className="mt-3 pt-3 border-t border-line/60">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-[9px] text-dim uppercase tracking-wide flex items-center gap-1.5">
          Match flow
          <HelpInlineButton helpMode={helpMode} open={helpOpen} onToggle={() => setHelpOpen(o => !o)} />
        </span>
        <div className="flex items-center gap-3">
          {[
            { key: "t1", name: tName(team1Id), color: "bg-accent" },
            { key: "t2", name: tName(team2Id), color: "bg-free"   },
          ].map(({ key, name, color }) => (
            <span key={key} className="flex items-center gap-1.5 text-[9px] text-dim">
              <span className={`w-3 h-0.5 rounded ${color}`} />
              {name}
            </span>
          ))}
        </div>
      </div>

      <InfoPanel open={helpMode && helpOpen}>{EXPLANATIONS.matchFlow}</InfoPanel>

      {/* Chart */}
      <div ref={containerRef} className="relative" style={{ touchAction: "none" }}>
        <ResponsiveContainer width="100%" height={164}>
          <LineChart
            data={chartData}
            onClick={handleClick}
            margin={{ top: 6, right: 4, bottom: 0, left: -20 }}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis
              dataKey="point"
              tick={{ fill: "var(--color-dim)", fontSize: 10 }}
              interval={tickInterval}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-dim)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Line
              type="monotone" dataKey="t1"
              stroke="var(--color-accent)" strokeWidth={2}
              dot={makeDot("var(--color-accent)")}
              activeDot={{ r: 5, fill: "var(--color-accent)", strokeWidth: 0 }}
            />
            <Line
              type="monotone" dataKey="t2"
              stroke="var(--color-free)" strokeWidth={2}
              dot={makeDot("var(--color-free)")}
              activeDot={{ r: 5, fill: "var(--color-free)", strokeWidth: 0 }}
            />
            {selected && (
              <ReferenceLine
                x={selected.pointNum ?? selectedIdx + 1}
                stroke="var(--color-text)"
                strokeDasharray="3 2"
                strokeOpacity={0.3}
                strokeWidth={1}
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Floating detail panel */}
        {selected && panelPos && (
          <div className="absolute z-20 pointer-events-none" style={getPanelStyle()}>
            <PointDetailPanel
              point={selected}
              getTeam={getTeam}
              firstName={firstName}
              team1Id={team1Id}
              team2Id={team2Id}
              setsCount={setsCount}
            />
          </div>
        )}
      </div>

      <p className="text-[9px] text-dim/50 text-center mt-1.5">Tap a point to see details</p>
    </div>
  );
}

function PointDetailPanel({ point, getTeam, firstName, team1Id, team2Id, setsCount }) {
  const isTeam1  = point.team === 1;
  const accentCls = isTeam1 ? "bg-accent" : "bg-free";
  const textCls   = isTeam1 ? "text-accent" : "text-free";
  const bgCls     = isTeam1 ? "bg-accent/10" : "bg-free/10";
  const borderCls = isTeam1 ? "border-accent/25" : "border-free/25";

  const ptType   = POINT_TYPE_BY_ID[point.pointType];
  const PtIcon   = ptType?.icon || Volleyball;
  const isError  = point.pointType === "error";
  const player   = isError ? point.errorPlayerId : point.scoringPlayerId;
  const srvTeam1 = point.serverTeam === 1;

  return (
    <div className={`bg-surface border ${borderCls} rounded-xl shadow-xl overflow-hidden flex`}>
      {/* Left accent strip */}
      <div className={`w-[3px] flex-shrink-0 ${accentCls}`} />

      <div className="flex-1 px-2.5 py-2 min-w-0">
        {/* Row 1: score + point label */}
        <div className="flex items-baseline justify-between gap-1 mb-2">
          <span className="font-display text-[26px] leading-none">
            <span className="text-accent">{point.t1}</span>
            <span className="text-dim text-[15px] mx-0.5">–</span>
            <span className="text-free">{point.t2}</span>
          </span>
          <span className="text-[8px] text-dim">
            Pt {point.pointNum ?? ""}
            {setsCount > 1 && point.setNum != null ? ` · S${point.setNum + 1}` : ""}
          </span>
        </div>

        {/* Row 2: type pill + player */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className={`inline-flex items-center gap-0.5 ${bgCls} rounded-[5px] px-1.5 py-0.5 flex-shrink-0`}>
            <PtIcon size={9} className={textCls} />
            <span className={`text-[9px] font-bold ${textCls}`}>{ptType?.label || "Point"}</span>
          </div>
          {player && (
            <span className="flex items-center gap-1 text-[10px] text-text min-w-0">
              {isError
                ? <AlertTriangle size={9} className="text-error flex-shrink-0" />
                : <CheckCircle2 size={9} className={`${textCls} flex-shrink-0`} />}
              <span className="truncate">{firstName(player)}</span>
            </span>
          )}
        </div>

        {/* Row 3: server */}
        {point.serverPlayerId && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${srvTeam1 ? "bg-accent" : "bg-free"}`} />
            <span className="text-dim/70">srv</span>
            <span className="text-text truncate">{firstName(point.serverPlayerId)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
