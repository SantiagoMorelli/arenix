import React, { useState } from "react";
import {
  Trophy, Check, Volleyball, Undo2, X, Target, Zap, Shield, Hand, HelpCircle,
} from "lucide-react";
import { formatDuration, getMatchDuration, getLongestRally } from "../lib/utils";
import { AppCard, AppButton, PillTabs } from "./ui-new";
import {
  calcLeadStats, calcDynamics, calcMVP,
} from "../lib/matchStats";
import { POINT_TYPES, ERROR_SUBTYPES, ERROR_SUBTYPE_BY_ID, normalizeErrorType } from "./stats/pointTypes";
import MatchFlow from "./stats/MatchFlow";
import MatchHighlights from "./stats/MatchHighlights";
import TopPerformers from "./stats/TopPerformers";
import ServeBreakdown from "./stats/ServeBreakdown";
import MatchDynamics from "./stats/MatchDynamics";
import {
  HelpToggle, SectionLabelWithHelp, HelpInlineButton, InfoPanel,
} from "./stats/StatInfo";
import { EXPLANATIONS } from "./stats/explanations";

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
  onExport,
  scoringLevel = 3,
}) => {
  const [tab, setTab] = useState("overview");
  const [selectedPointId, setSelectedPointId] = useState(null);
  const [helpMode, setHelpMode] = useState(false);
  const [pointTypesHelpOpen, setPointTypesHelpOpen] = useState(false);
  const [historyHelpOpen, setHistoryHelpOpen] = useState(false);

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
    const errsMade = pointLog.filter(e => e.team !== tn && e.pointType === "error");
    const errsMadeCount = errsMade.length;
    const byErrorType = {};
    errsMade.forEach(e => {
      const sub = normalizeErrorType(e.errorType);
      byErrorType[sub] = (byErrorType[sub] || 0) + 1;
    });
    return { total: pts.length, byType, whileServing, whileReceiving, bestStreak, playerPts, playerByType, playerErrors, unattributed, errsMadeCount, byErrorType };
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
  const mvp = scoringLevel >= 2 ? calcMVP(allIds, s1, s2, t1Ids) : null;
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

      <div className="flex items-center gap-2 mb-3">
        <PillTabs
          items={[
            { id: "overview", label: "Overview" },
            { id: "stats",    label: "Stats" },
            { id: "history",  label: "History" },
          ]}
          active={tab}
          onChange={(id) => {
            setTab(id);
            setPointTypesHelpOpen(false);
            setHistoryHelpOpen(false);
          }}
          className="mb-0 flex-1"
        />
        {onExport && (
          <button
            onClick={onExport}
            className="w-10 h-[34px] flex items-center justify-center rounded-xl bg-alt text-free cursor-pointer border-0"
            aria-label="Copy AI Coach Prompt"
          >
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
          </button>
        )}
        <HelpToggle on={helpMode} onChange={(val) => {
          setHelpMode(val);
          if (!val) {
            setPointTypesHelpOpen(false);
            setHistoryHelpOpen(false);
          }
        }} />
      </div>

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
              setsCount={sets.length}
              selectedId={selectedPointId}
              setSelectedId={setSelectedPointId}
              helpMode={helpMode}
            />
          </div>

          <MatchHighlights
            pointLog={pointLog}
            mvp={mvp}
            leadStats={leadStats}
            t1Ids={t1Ids}
            allPlayerIds={allIds}
            getPlayer={getPlayer}
            getTeam={getTeam}
            team1Id={team1Id}
            team2Id={team2Id}
            teamPlayerStats={{ 1: s1, 2: s2 }}
            selectedPointId={selectedPointId}
            onPointSelect={setSelectedPointId}
            helpMode={helpMode}
            scoringLevel={scoringLevel}
          />

          {/* Total points — multi-set only; single-set score is in the banner */}
          {sets.length > 1 && (
            <AppCard className="px-3.5 py-3 mb-3">
              <SectionLabelWithHelp
                color="accent"
                helpMode={helpMode}
                explanation={EXPLANATIONS.totalPoints}
              >
                Total points
              </SectionLabelWithHelp>
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

          {scoringLevel >= 2 && (
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
              helpMode={helpMode}
            />
          )}

          {allIds.length > 0 && scoringLevel >= 1 && (
            <AppCard className="px-3.5 py-3 mb-3">
              <ServeBreakdown
                pointLog={pointLog}
                allIds={allIds}
                t1Ids={t1Ids}
                getPlayer={getPlayer}
                helpMode={helpMode}
              />
            </AppCard>
          )}
        </>
      )}

      {tab === "stats" && (
        <>
          {scoringLevel >= 3 && (
            <AppCard className="px-3.5 py-3 mb-3">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[10px] font-bold text-accent">{tName(team1Id)}</span>
                <span className="text-[10px] font-bold text-dim uppercase tracking-wide flex items-center gap-1.5">
                  How points were won
                  <HelpInlineButton
                    helpMode={helpMode}
                    open={pointTypesHelpOpen}
                    onToggle={() => setPointTypesHelpOpen(o => !o)}
                  />
                </span>
                <span className="text-[10px] font-bold text-free">{tName(team2Id)}</span>
              </div>
              <InfoPanel open={helpMode && pointTypesHelpOpen}>
                {EXPLANATIONS.pointTypes}
              </InfoPanel>
              {POINT_TYPES
                .filter(pt => (s1.byType[pt.id] || 0) + (s2.byType[pt.id] || 0) > 0)
                .map(pt => renderStatBar(pt, s1.byType[pt.id], s2.byType[pt.id]))}
              <div className="flex justify-between text-[11px] mt-1.5 pt-1.5 border-t border-line">
                <span className="font-bold text-accent">{s1.total}</span>
                <span className="text-dim">total</span>
                <span className="font-bold text-free">{s2.total}</span>
              </div>
            </AppCard>
          )}

          {scoringLevel >= 3 && (s1.errsMadeCount + s2.errsMadeCount) > 0 && (
            <AppCard className="px-3.5 py-3 mb-3">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[10px] font-bold text-accent">{tName(team1Id)}</span>
                <span className="text-[10px] font-bold text-dim uppercase tracking-wide">Errors by type</span>
                <span className="text-[10px] font-bold text-free">{tName(team2Id)}</span>
              </div>
              {ERROR_SUBTYPES
                .filter(sub => sub.id !== "untyped")
                .filter(sub => (s1.byErrorType[sub.id] || 0) + (s2.byErrorType[sub.id] || 0) > 0)
                .map(sub => renderStatBar(sub, s1.byErrorType[sub.id], s2.byErrorType[sub.id]))}
              {(s1.byErrorType.untyped || 0) + (s2.byErrorType.untyped || 0) > 0 &&
                renderStatBar(ERROR_SUBTYPE_BY_ID.untyped, s1.byErrorType.untyped || 0, s2.byErrorType.untyped || 0)}
              <div className="flex justify-between text-[11px] mt-1.5 pt-1.5 border-t border-line">
                <span className="font-bold text-accent">{s1.errsMadeCount}</span>
                <span className="text-dim">total errors</span>
                <span className="font-bold text-free">{s2.errsMadeCount}</span>
              </div>
            </AppCard>
          )}

          {scoringLevel >= 3 && (
            <AppCard className="px-3.5 py-3 mb-3">
              <SectionLabelWithHelp helpMode={helpMode} explanation={EXPLANATIONS.serveEfficiency}>
                Serve efficiency
              </SectionLabelWithHelp>
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
          )}

          <MatchDynamics
            pointLog={pointLog}
            s1={s1}
            s2={s2}
            getTeam={getTeam}
            getPlayer={getPlayer}
            team1Id={team1Id}
            team2Id={team2Id}
            dynStats={dynStats}
            helpMode={helpMode}
          />

          {(matchDuration || longestRally) && (
            <AppCard className="px-3.5 py-3 mb-3">
              <SectionLabelWithHelp helpMode={helpMode} explanation={EXPLANATIONS.timing}>
                Timing
              </SectionLabelWithHelp>
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
          <div className="px-3.5 py-2.5 bg-alt text-[12px] font-bold text-accent tracking-wide uppercase flex items-center justify-between gap-2">
            <span>History</span>
            <HelpInlineButton
              helpMode={helpMode}
              open={historyHelpOpen}
              onToggle={() => setHistoryHelpOpen(o => !o)}
            />
          </div>
          <div className="px-3.5">
            <InfoPanel open={helpMode && historyHelpOpen}>
              {EXPLANATIONS.history}
            </InfoPanel>
          </div>
          {[...log].reverse().map((entry) => {
            if (!entry.team) return (
              <div key={entry.id} className="py-2 px-3.5 text-[12px] font-bold text-accent text-center border-b border-line">
                {entry.msg}
              </div>
            );
            const isTeam1    = entry.team === 1;
            const teamColor  = isTeam1 ? "text-accent" : "text-free";
            const teamBg     = isTeam1 ? "bg-accent/15" : "bg-free/15";
            const isError    = entry.pointType === "error";
            const ptType     = POINT_TYPES.find(pt => pt.id === entry.pointType);
            const PtIcon     = ptType?.icon;
            const srvIsTeam1 = entry.serverTeam === 1;
            const errSubtype = isError ? ERROR_SUBTYPE_BY_ID[normalizeErrorType(entry.errorType)] : null;
            const ErrIcon    = errSubtype?.icon;
            return (
              <div key={entry.id} className="flex items-center px-3.5 py-2 gap-2 border-b border-line last:border-b-0">
                <span className="text-[11px] font-bold w-9 flex-shrink-0 text-right">
                  <span className={isTeam1 ? "text-accent" : "text-dim"}>{entry.t1}</span>
                  <span className="text-dim">–</span>
                  <span className={!isTeam1 ? "text-free" : "text-dim"}>{entry.t2}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-text truncate flex items-center gap-1">
                    {isError ? (
                      <>
                        <X size={11} className="flex-shrink-0 text-error" />
                        {ErrIcon && <ErrIcon size={11} className="flex-shrink-0 text-error" />}
                        {entry.errorPlayerId && <span className="text-dim truncate">{playerName(entry.errorPlayerId)}</span>}
                      </>
                    ) : (
                      <>
                        {PtIcon
                          ? <PtIcon size={11} className={`flex-shrink-0 ${isTeam1 ? "text-accent" : "text-free"}`} />
                          : <Volleyball size={11} className={`flex-shrink-0 ${isTeam1 ? "text-accent" : "text-free"}`} />
                        }
                        {entry.scoringPlayerId && <span className="text-dim truncate">{playerName(entry.scoringPlayerId)}</span>}
                      </>
                    )}
                  </div>
                  <div className="text-[9px] text-dim flex items-center gap-1">
                    <Volleyball size={9} className={`flex-shrink-0 ${srvIsTeam1 ? "text-accent" : "text-free"}`} />
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
