import React, { useState } from "react";
import {
  Trophy, Flame, X, Check,
  Volleyball, Undo2, Equal, Activity,
} from "lucide-react";
import { formatDuration, getMatchDuration, getLongestRally } from "../lib/utils";
import { AppCard, AppButton, PillTabs, SectionLabel } from "./ui-new";
import {
  calcLeadStats, calcDynamics, calcMVP,
} from "../lib/matchStats";
import { POINT_TYPES } from "./stats/pointTypes";
import MatchFlow from "./stats/MatchFlow";
import MatchHighlights from "./stats/MatchHighlights";
import TopPerformers from "./stats/TopPerformers";
import ServeBreakdown from "./stats/ServeBreakdown";

const GameStats = ({
  winner,
  team1Id, team2Id,
  sets, t1Sets, t2Sets,
  log,
  teams, players,
  onSaveResult, activeTourMatchId,
  isSaving,
  reset,
  hasHistory,
  onRequestUndo,
  pendingUndo,
  onConfirmUndo,
  onCancelUndo,
}) => {
  const [tab, setTab] = useState("overview");

  const getTeam   = id => teams.find(tm => tm.id === id);
  const getPlayer = id => {
    if (id && id.startsWith("free_")) return { id, name: id.slice(5) };
    return players.find(p => p.id === id);
  };
  const tName      = id => getTeam(id)?.name || "?";
  const playerName = id => getPlayer(id)?.name || "?";
  const firstName  = id => playerName(id).split(" ")[0];

  const teamPlayerIds = (teamId) => {
    const team = teams.find(tm => tm.id === teamId);
    if (!team) return [];
    if (team.players && team.players.length > 0) return team.players;
    return [team.player1, team.player2].filter(Boolean);
  };

  const pointLog = log.filter(e => e.team);
  const matchDuration = formatDuration(getMatchDuration(pointLog));
  const longestRally  = formatDuration(getLongestRally(pointLog));

  const statFor = (tn) => {
    const pts = pointLog.filter(e => e.team === tn);
    const byType = {};
    ["ace","spike","block","tip","error"].forEach(id => { byType[id] = pts.filter(e => e.pointType === id).length; });
    const whileServing   = pts.filter(e => e.serverTeam === tn).length;
    const whileReceiving = pts.filter(e => e.serverTeam !== tn).length;
    let bestStreak = 0, cur = 0;
    pointLog.forEach(e => { if (e.team === tn) { cur++; bestStreak = Math.max(bestStreak, cur); } else cur = 0; });
    const team = tn === 1 ? getTeam(team1Id) : getTeam(team2Id);
    const tid = tn === 1 ? team1Id : team2Id;
    const playerPts = {};
    const playerByType = {};
    const playerErrors = {};
    if (team) teamPlayerIds(tid).forEach(pid => {
      const pScored = pts.filter(e => e.scoringPlayerId === pid);
      playerByType[pid] = {
        ace:   pScored.filter(e => e.pointType === "ace").length,
        spike: pScored.filter(e => e.pointType === "spike").length,
        block: pScored.filter(e => e.pointType === "block").length,
        tip:   pScored.filter(e => e.pointType === "tip").length,
      };
      playerPts[pid] = pScored.length;
      playerErrors[pid] = pointLog.filter(e => e.errorPlayerId === pid).length;
    });
    const unattributed = pts.filter(e => !e.scoringPlayerId).length;
    return { total: pts.length, byType, whileServing, whileReceiving, bestStreak, playerPts, playerByType, playerErrors, unattributed };
  };

  const s1 = statFor(1), s2 = statFor(2);
  const derivedWinnerTeam = t1Sets > t2Sets ? 1 : t2Sets > t1Sets ? 2 : (winner === 1 ? 1 : 2);
  const winnerIsTeam1 = derivedWinnerTeam === 1;
  const winnerColor = winnerIsTeam1 ? "text-accent" : "text-free";
  const winnerBorder = winnerIsTeam1 ? "border-accent/40" : "border-free/40";
  const winnerGradient = winnerIsTeam1
    ? "bg-gradient-to-br from-accent/15 to-surface"
    : "bg-gradient-to-br from-free/15 to-surface";

  const t1Ids = teamPlayerIds(team1Id);
  const t2Ids = teamPlayerIds(team2Id);
  const allIds = [...t1Ids, ...t2Ids];
  const mvp = calcMVP(allIds, s1, s2, t1Ids);
  const leadStats = calcLeadStats(pointLog);
  const dynStats  = calcDynamics(pointLog);

  const renderStatBar = (pt, v1, v2) => {
    const total = (v1 || 0) + (v2 || 0) || 1;
    const Icon = pt.icon;
    return (
      <div key={pt.id} className="mb-2.5">
        <div className="flex justify-between mb-[3px] items-center">
          <span className="text-[11px] font-bold text-accent">{v1}</span>
          <span className="text-[10px] font-semibold text-dim flex items-center gap-1">
            <Icon size={11} /> {pt.label}
          </span>
          <span className="text-[11px] font-bold text-free">{v2}</span>
        </div>
        <div className="flex h-[6px] rounded-[3px] overflow-hidden bg-alt">
          <div style={{ width: `${(v1 || 0.1) / total * 100}%` }} className="bg-accent" />
          <div style={{ width: `${(v2 || 0.1) / total * 100}%` }} className="bg-free" />
        </div>
      </div>
    );
  };

  return (
    <div>

      {pendingUndo && (
        <div className="bg-error text-white px-4 py-2.5 flex items-center justify-between text-[13px] font-bold rounded-xl mb-3">
          <span>Undo last point?</span>
          <div className="flex gap-4">
            <button onClick={onCancelUndo} className="bg-transparent border-0 text-white/70 cursor-pointer">Cancel</button>
            <button onClick={onConfirmUndo} className="bg-white text-error px-3 py-1 rounded cursor-pointer">Yes</button>
          </div>
        </div>
      )}

      {hasHistory && !pendingUndo && (
        <button
          onClick={onRequestUndo}
          className="flex items-center gap-1.5 text-dim text-[13px] font-semibold mb-3 bg-transparent border-0 cursor-pointer px-0 py-1"
        >
          <Undo2 size={16} />
          <span>Undo last point</span>
        </button>
      )}

      <PillTabs
        items={[
          { id: "overview", label: "Overview" },
          { id: "stats",    label: "Stats"    },
          { id: "history",  label: "History"  },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-3"
      />

      {tab === "overview" && (
        <>
          {/* Winner banner */}
          <div className={`${winnerGradient} ${winnerBorder} border rounded-[14px] px-4 py-4 mb-3 text-center`}>
            <div className="flex justify-center mb-1.5">
              <Trophy size={32} className={winnerColor} />
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-[0.5px] mb-1 ${winnerColor}`}>
              Winner
            </div>
            <div className={`font-display text-[30px] leading-none mb-1 ${winnerColor}`}>
              {tName(winnerIsTeam1 ? team1Id : team2Id)}
            </div>
            <div className="text-[12px] text-dim mb-3">
              {teamPlayerIds(winnerIsTeam1 ? team1Id : team2Id)
                .map(pid => firstName(pid))
                .join(" · ")}
            </div>
            {sets.length === 1 ? (
              <div className="flex gap-3 items-center justify-center mb-1">
                <span className={`font-display leading-none ${winnerIsTeam1 ? "text-[44px] text-accent" : "text-[36px] text-accent/70"}`}>{sets[0].s1}</span>
                <span className="text-[18px] text-dim">–</span>
                <span className={`font-display leading-none ${!winnerIsTeam1 ? "text-[44px] text-free" : "text-[36px] text-free/70"}`}>{sets[0].s2}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-center gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-[11px] text-dim mb-1">Sets</div>
                    <div className="flex gap-1.5 items-center">
                      <span className={`font-display text-[28px] leading-none ${winnerIsTeam1 ? "text-accent" : "text-accent/60"}`}>{t1Sets}</span>
                      <span className="text-[12px] text-dim">-</span>
                      <span className={`font-display text-[28px] leading-none ${!winnerIsTeam1 ? "text-free" : "text-free/60"}`}>{t2Sets}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-1.5">
                  {sets.map((s, i) => (
                    <div key={i} className="bg-bg rounded-[8px] px-2.5 py-[5px] text-center">
                      <div className="text-[9px] text-dim mb-1">Set {i + 1}</div>
                      <div className="flex gap-[3px] items-center justify-center">
                        <span className={`text-[13px] font-bold ${s.winner === 1 ? "text-accent" : "text-accent/60"}`}>{s.s1}</span>
                        <span className="text-[9px] text-dim">-</span>
                        <span className={`text-[13px] font-bold ${s.winner === 2 ? "text-free" : "text-free/60"}`}>{s.s2}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <MatchFlow
              pointLog={pointLog}
              getPlayer={getPlayer}
              getTeam={getTeam}
              team1Id={team1Id}
              team2Id={team2Id}
            />
          </div>

          <MatchHighlights
            pointLog={pointLog}
            mvp={mvp}
            leadStats={leadStats}
            t1Ids={t1Ids}
            getPlayer={getPlayer}
            getTeam={getTeam}
            team1Id={team1Id}
            team2Id={team2Id}
            teamPlayerStats={{ 1: s1, 2: s2 }}
          />

          {/* Total points — multi-set only; single-set score is in the banner */}
          {sets.length > 1 && (
            <AppCard className="px-3.5 py-3 mb-3">
              <SectionLabel color="accent">Total points</SectionLabel>
              <div className="flex justify-between items-center mb-2.5">
                <div className="text-center flex-1">
                  <div className="text-[10px] text-dim">{tName(team1Id)}</div>
                  <div className="font-display text-[52px] text-accent leading-none">{s1.total}</div>
                </div>
                <div className="text-center text-dim text-[11px]">
                  <div className="font-display text-[22px]">–</div>
                  {s1.total + s2.total} total
                </div>
                <div className="text-center flex-1">
                  <div className="text-[10px] text-dim">{tName(team2Id)}</div>
                  <div className="font-display text-[52px] text-free leading-none">{s2.total}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {sets.map((s, i) => (
                  <div key={i} className="flex-1 bg-alt rounded-[10px] p-2 text-center">
                    <div className="text-[10px] text-dim uppercase">Set {i + 1}</div>
                    <div className="font-display text-[20px]">{s.s1}–{s.s2}</div>
                    <div className={`text-[10px] font-bold ${s.winner === 1 ? "text-accent" : "text-free"}`}>
                      {tName(s.winner === 1 ? team1Id : team2Id).split(" ")[0]}
                    </div>
                  </div>
                ))}
              </div>
            </AppCard>
          )}

          <TopPerformers
            pointLog={pointLog}
            s1={s1}
            s2={s2}
            t1Ids={t1Ids}
            t2Ids={t2Ids}
            mvp={mvp}
            getPlayer={getPlayer}
            getTeam={getTeam}
            team1Id={team1Id}
            team2Id={team2Id}
          />

          {allIds.length > 0 && (
            <AppCard className="px-3.5 py-3 mb-3">
              <ServeBreakdown
                pointLog={pointLog}
                allIds={allIds}
                t1Ids={t1Ids}
                getPlayer={getPlayer}
              />
            </AppCard>
          )}
        </>
      )}

      {tab === "stats" && (
        <>
          <AppCard className="px-3.5 py-3 mb-3">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-bold text-accent">{tName(team1Id)}</span>
              <span className="text-[10px] font-bold text-dim uppercase tracking-wide">How points were won</span>
              <span className="text-[10px] font-bold text-free">{tName(team2Id)}</span>
            </div>
            {POINT_TYPES
              .filter(pt => (s1.byType[pt.id] || 0) + (s2.byType[pt.id] || 0) > 0)
              .map(pt => renderStatBar(pt, s1.byType[pt.id], s2.byType[pt.id]))}
            <div className="flex justify-between text-[11px] mt-1.5 pt-1.5 border-t border-line">
              <span className="font-bold text-accent">{s1.total}</span>
              <span className="text-dim">total</span>
              <span className="font-bold text-free">{s2.total}</span>
            </div>
          </AppCard>

          <AppCard className="px-3.5 py-3 mb-3">
            <SectionLabel>Serve efficiency</SectionLabel>
            <div className="flex gap-2">
              {[
                { tn: 1, st: s1, tid: team1Id, isTeam1: true  },
                { tn: 2, st: s2, tid: team2Id, isTeam1: false },
              ].map(({ tn, st, tid, isTeam1 }) => {
                const tot = st.whileServing + st.whileReceiving || 1;
                const pct = Math.round(st.whileServing / tot * 100);
                return (
                  <div
                    key={tn}
                    className={`flex-1 rounded-[10px] px-2.5 py-2.5 text-center ${isTeam1 ? "bg-accent/15" : "bg-free/15"}`}
                  >
                    <div className={`text-[11px] font-bold mb-1.5 ${isTeam1 ? "text-accent" : "text-free"}`}>{tName(tid)}</div>
                    <div className={`font-display text-[28px] mb-1 leading-none ${isTeam1 ? "text-accent" : "text-free"}`}>{pct}%</div>
                    <div className="flex justify-around">
                      <div>
                        <div className="text-[14px] font-bold text-text">{st.whileServing}</div>
                        <div className="text-[8px] text-dim uppercase">serving</div>
                      </div>
                      <div>
                        <div className="text-[14px] font-bold text-text">{st.whileReceiving}</div>
                        <div className="text-[8px] text-dim uppercase">receiving</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AppCard>

          <AppCard className="px-3.5 py-3 mb-3">
            <SectionLabel>Match dynamics</SectionLabel>
            <div className="flex gap-2">
              <div className="flex-1 bg-alt rounded-[10px] px-2.5 py-2.5 text-center">
                <Flame size={16} className="text-dim mx-auto mb-1.5" />
                <div className="font-display text-[24px] text-text leading-none mb-0.5">
                  {Math.max(s1.bestStreak, s2.bestStreak)}
                </div>
                <div className="text-[10px] text-dim truncate px-1">
                  {s1.bestStreak >= s2.bestStreak
                    ? tName(team1Id).split(" ")[0]
                    : tName(team2Id).split(" ")[0]}
                </div>
                <div className="text-[9px] text-dim uppercase mt-1">Best streak</div>
              </div>
              <div className="flex-1 bg-alt rounded-[10px] px-2.5 py-2.5 text-center">
                <Equal size={16} className="text-dim mx-auto mb-1.5" />
                <div className="font-display text-[24px] text-text leading-none mb-0.5">
                  {dynStats.timesTied}
                </div>
                <div className="text-[10px] text-dim">
                  {dynStats.timesTied > 5 ? "Neck & neck" : dynStats.timesTied >= 2 ? "Some tension" : "Dominated"}
                </div>
                <div className="text-[9px] text-dim uppercase mt-1">Times tied</div>
              </div>
              <div className="flex-1 bg-alt rounded-[10px] px-2.5 py-2.5 text-center">
                <Activity size={16} className="text-dim mx-auto mb-1.5" />
                <div className="font-display text-[24px] text-text leading-none mb-0.5">
                  {dynStats.closePoints}
                </div>
                <div className="text-[10px] text-dim">
                  margin ≤ 2
                </div>
                <div className="text-[9px] text-dim uppercase mt-1">Clutch points</div>
              </div>
            </div>
          </AppCard>

          {(matchDuration || longestRally) && (
            <AppCard className="px-3.5 py-3 mb-3">
              <SectionLabel>Timing</SectionLabel>
              <div className="flex gap-2">
                {matchDuration && (
                  <div className="flex-1 rounded-[10px] px-2.5 py-2.5 text-center bg-alt">
                    <div className="font-display text-[26px] text-text leading-none mb-1">
                      {matchDuration}
                    </div>
                    <div className="text-[9px] text-dim uppercase">Match duration</div>
                  </div>
                )}
                {longestRally && (
                  <div className="flex-1 rounded-[10px] px-2.5 py-2.5 text-center bg-alt">
                    <div className="font-display text-[26px] text-text leading-none mb-1">
                      {longestRally}
                    </div>
                    <div className="text-[9px] text-dim uppercase">Longest rally</div>
                  </div>
                )}
              </div>
            </AppCard>
          )}
        </>
      )}

      {tab === "history" && (
        <AppCard className="p-0 overflow-hidden mb-3">
          <div className="px-3.5 py-2.5 bg-alt text-[12px] font-bold text-accent tracking-wide uppercase">
            History
          </div>
          {[...log].reverse().map((entry) => {
            if (!entry.team) return (
              <div key={entry.id} className="py-2 px-3.5 text-[12px] font-bold text-accent text-center border-b border-line">
                {entry.msg}
              </div>
            );
            const isTeam1   = entry.team === 1;
            const teamColor = isTeam1 ? "text-accent" : "text-free";
            const teamBg    = isTeam1 ? "bg-accent/15" : "bg-free/15";
            const ptType    = POINT_TYPES.find(pt => pt.id === entry.pointType);
            const PtIcon    = ptType?.icon;
            return (
              <div key={entry.id} className="flex items-center px-3.5 py-2 gap-2 border-b border-line last:border-b-0">
                <span className="text-[11px] font-bold text-accent w-9 flex-shrink-0">
                  {entry.t1}–{entry.t2}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-text truncate flex items-center gap-1">
                    {PtIcon ? <PtIcon size={11} className="flex-shrink-0" /> : <Volleyball size={11} className="flex-shrink-0" />}
                    <span className="truncate">
                      {ptType?.label || entry.pointTypeLabel || "Punto"}
                      {entry.scoringPlayerId ? ` · ${playerName(entry.scoringPlayerId)}` : ""}
                    </span>
                  </div>
                  <div className="text-[9px] text-dim flex items-center gap-1">
                    <Volleyball size={9} className="flex-shrink-0" />
                    {playerName(entry.serverPlayerId)}
                  </div>
                </div>
                <span className={`text-[9px] font-semibold ${teamColor} ${teamBg} px-1.5 py-0.5 rounded-[4px] flex-shrink-0`}>
                  {tName(isTeam1 ? team1Id : team2Id)}
                </span>
              </div>
            );
          })}
        </AppCard>
      )}

      {onSaveResult && activeTourMatchId && (() => {
        const winnerTeamId = winner === 1 ? team1Id : team2Id;
        const finalS1 = sets.reduce((acc, s) => acc + (s.winner === 1 ? 1 : 0), 0);
        const finalS2 = sets.reduce((acc, s) => acc + (s.winner === 2 ? 1 : 0), 0);
        return (
          <AppButton
            variant="success"
            disabled={isSaving}
            onClick={() => !isSaving && onSaveResult(activeTourMatchId, finalS1, finalS2, winnerTeamId, log, sets)}
            className="mb-2.5"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check size={16} /> Save result
              </span>
            )}
          </AppButton>
        );
      })()}
      {reset && (
        <AppButton variant="accent" onClick={reset}>
          New match
        </AppButton>
      )}

    </div>
  );
};

export default GameStats;
