import React, { useState } from "react";

const GameStats = ({
  winner,
  team1Id, team2Id,
  sets, t1Sets, t2Sets,
  log,
  teams, players,
  onSaveResult, activeTourMatchId,
  isSaving,
  reset,
  t,
}) => {
  const [tab, setTab] = useState("overview");

  const getTeam    = id => teams.find(tm => tm.id === id);
  const getPlayer  = id => {
    if (id && id.startsWith("free_")) return { id, name: id.slice(5) };
    return players.find(p => p.id === id);
  };
  const tName      = id => getTeam(id)?.name || "?";
  const playerName = id => getPlayer(id)?.name || "?";

  const teamPlayerIds = (teamId) => {
    const team = teams.find(tm => tm.id === teamId);
    if (!team) return [];
    if (team.players && team.players.length > 0) return team.players;
    return [team.player1, team.player2].filter(Boolean);
  };

  const pointLog = log.filter(e => e.team);

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
      playerPts[pid] = pts.filter(e =>
        e.scoringPlayerId != null
          ? e.scoringPlayerId === pid
          : e.serverPlayerId === pid
      ).length;
      const pScored = pts.filter(e => e.scoringPlayerId === pid);
      playerByType[pid] = {
        ace:   pScored.filter(e => e.pointType === "ace").length,
        spike: pScored.filter(e => e.pointType === "spike").length,
        block: pScored.filter(e => e.pointType === "block").length,
        tip:   pScored.filter(e => e.pointType === "tip").length,
      };
      playerErrors[pid] = pointLog.filter(e => e.errorPlayerId === pid).length;
    });
    return { total: pts.length, byType, whileServing, whileReceiving, bestStreak, playerPts, playerByType, playerErrors };
  };

  const s1 = statFor(1), s2 = statFor(2);
  const winnerIsTeam1 = winner === 1;

  // Comparison bar helper (not a React component — called as a function)
  const renderStatBar = (label, v1, v2) => {
    const total = (v1 || 0) + (v2 || 0) || 1;
    return (
      <div key={label} className="mb-2.5">
        <div className="flex justify-between mb-[3px]">
          <span className="text-[11px] font-bold text-accent">{v1}</span>
          <span className="text-[10px] font-semibold text-dim">{label}</span>
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

      {/* ── Pill tabs ── */}
      <div className="flex bg-alt rounded-[10px] p-[3px] mb-3">
        {[
          { id: "overview", label: "Overview" },
          { id: "stats",    label: "Stats"    },
          { id: "history",  label: "History"  },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 py-[7px] rounded-[8px] text-[10px] font-semibold cursor-pointer border-0 transition-all ${
              tab === item.id
                ? "bg-surface text-accent shadow-sm"
                : "bg-transparent text-dim"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === "overview" && (
        <>
          {/* Winner banner — always dark bg for contrast */}
          <div className="bg-[#0D1B2A] rounded-[16px] px-4 py-4 mb-3 text-center">
            <div className="text-[32px] mb-1.5">🏆</div>
            <div className="text-[10px] font-bold text-[#7A8EA0] uppercase tracking-wide mb-0.5">
              {t("winner")}
            </div>
            <div className={`text-[20px] font-extrabold mb-2 ${winnerIsTeam1 ? "text-accent" : "text-free"}`}>
              {tName(winnerIsTeam1 ? team1Id : team2Id)}
            </div>
            {/* Sets score */}
            <div className="flex justify-center gap-4 mb-3">
              <div className="text-center">
                <div className="text-[11px] text-[#7A8EA0] mb-1">Sets</div>
                <div className="flex gap-1.5 items-center">
                  <span className={`text-[20px] font-extrabold ${winnerIsTeam1 ? "text-accent" : "text-[#7A8EA0]"}`}>{t1Sets}</span>
                  <span className="text-[12px] text-[#7A8EA0]">-</span>
                  <span className={`text-[20px] font-extrabold ${!winnerIsTeam1 ? "text-free" : "text-[#7A8EA0]"}`}>{t2Sets}</span>
                </div>
              </div>
            </div>
            {/* Per-set scores */}
            <div className="flex justify-center gap-1.5">
              {sets.map((s, i) => (
                <div key={i} className="bg-white/5 rounded-[8px] px-2.5 py-[5px] text-center">
                  <div className="text-[9px] text-[#7A8EA0] mb-1">Set {i + 1}</div>
                  <div className="flex gap-[3px] items-center justify-center">
                    <span className={`text-[13px] font-bold ${s.winner === 1 ? "text-accent" : "text-[#7A8EA0]"}`}>{s.s1}</span>
                    <span className="text-[9px] text-[#7A8EA0]">-</span>
                    <span className={`text-[13px] font-bold ${s.winner === 2 ? "text-free" : "text-[#7A8EA0]"}`}>{s.s2}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total points */}
          <div className="bg-surface rounded-xl border border-line px-3.5 py-3 mb-3">
            <div className="text-[10px] font-bold text-accent uppercase tracking-wide mb-1.5">
              {t("totalPoints")}
            </div>
            <div className="flex justify-between items-center mb-2.5">
              <div className="text-center flex-1">
                <div className="text-[10px] text-dim">{tName(team1Id)}</div>
                <div className="font-display text-[52px] text-accent leading-none">{s1.total}</div>
              </div>
              <div className="text-center text-dim text-[11px]">
                <div className="font-display text-[22px]">–</div>
                {s1.total + s2.total} {t("totalLabel")}
              </div>
              <div className="text-center flex-1">
                <div className="text-[10px] text-dim">{tName(team2Id)}</div>
                <div className="font-display text-[52px] text-free leading-none">{s2.total}</div>
              </div>
            </div>
            {sets.length > 0 && (
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
            )}
          </div>

          {/* Streaks & players table */}
          <div className="bg-surface rounded-xl border border-line px-3.5 py-3 mb-3">
            <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-2">
              {t("streaks")}
            </div>
            {/* Streak cards side by side */}
            <div className="flex gap-2 mb-3">
              {[
                { tn: 1, st: s1, tid: team1Id, isTeam1: true  },
                { tn: 2, st: s2, tid: team2Id, isTeam1: false },
              ].map(({ tn, st, tid, isTeam1 }) => (
                <div
                  key={tn}
                  className={`flex-1 rounded-[8px] px-2.5 py-2 flex items-center justify-between ${isTeam1 ? "bg-accent/15" : "bg-free/15"}`}
                >
                  <div>
                    <div className={`text-[10px] font-bold ${isTeam1 ? "text-accent" : "text-free"}`}>{tName(tid)}</div>
                    <div className="text-[9px] text-dim">{t("maxStreak")}</div>
                  </div>
                  <div className={`text-[20px] font-extrabold ${isTeam1 ? "text-accent" : "text-free"}`}>
                    🔥 {st.bestStreak}
                  </div>
                </div>
              ))}
            </div>

            {/* Players table */}
            <div className="rounded-[10px] overflow-hidden border border-line">
              <div className="flex px-2.5 py-1.5 bg-alt">
                <span className="flex-1 text-[9px] font-bold text-dim">PLAYER</span>
                <span className="w-10 text-[9px] font-bold text-dim text-center">PTS</span>
                <span className="w-8 text-[9px] font-bold text-dim text-center">ACE</span>
                <span className="w-8 text-[9px] font-bold text-dim text-center">SPK</span>
                <span className="w-8 text-[9px] font-bold text-dim text-center">BLK</span>
              </div>
              {[
                ...teamPlayerIds(team1Id).map(pid => ({ pid, stat: s1, isTeam1: true  })),
                ...teamPlayerIds(team2Id).map(pid => ({ pid, stat: s2, isTeam1: false })),
              ].map(({ pid, stat, isTeam1 }) => {
                const pts = stat.playerPts[pid] || 0;
                const bt  = stat.playerByType[pid] || {};
                return (
                  <div key={pid} className="flex items-center px-2.5 py-[7px] border-b border-line last:border-b-0">
                    <div className="flex-1 flex items-center gap-[5px] min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isTeam1 ? "bg-accent" : "bg-free"}`} />
                      <span className="text-[11px] text-text truncate">{playerName(pid).split(" ")[0]}</span>
                    </div>
                    <span className="w-10 text-[12px] font-bold text-text text-center">{pts}</span>
                    <span className="w-8 text-[11px] text-dim text-center">{bt.ace   || 0}</span>
                    <span className="w-8 text-[11px] text-dim text-center">{bt.spike || 0}</span>
                    <span className="w-8 text-[11px] text-dim text-center">{bt.block || 0}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Stats tab ── */}
      {tab === "stats" && (
        <>
          {/* Points by type */}
          <div className="bg-surface rounded-xl border border-line px-3.5 py-3 mb-3">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-bold text-accent">{tName(team1Id)}</span>
              <span className="text-[10px] font-bold text-dim uppercase tracking-wide">{t("howWonTitle")}</span>
              <span className="text-[10px] font-bold text-free">{tName(team2Id)}</span>
            </div>
            {renderStatBar("🎯 Ace",         s1.byType.ace,   s2.byType.ace)}
            {renderStatBar("💥 Remate",      s1.byType.spike, s2.byType.spike)}
            {renderStatBar("🛡️ Bloqueo",     s1.byType.block, s2.byType.block)}
            {renderStatBar("🤏 Finta",       s1.byType.tip,   s2.byType.tip)}
            {renderStatBar("❌ Error rival", s1.byType.error, s2.byType.error)}
            <div className="flex justify-between text-[11px] mt-1.5 pt-1.5 border-t border-line">
              <span className="font-bold text-accent">{tName(team1Id)}</span>
              <span className="text-dim">{t("comparison")}</span>
              <span className="font-bold text-free">{tName(team2Id)}</span>
            </div>
          </div>

          {/* Serve efficiency */}
          <div className="bg-surface rounded-xl border border-line px-3.5 py-3 mb-3">
            <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-2">
              {t("serveEff")}
            </div>
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
                    <div className={`text-[22px] font-extrabold mb-1 leading-none ${isTeam1 ? "text-accent" : "text-free"}`}>{pct}%</div>
                    <div className="flex justify-around">
                      <div>
                        <div className="text-[14px] font-bold text-text">{st.whileServing}</div>
                        <div className="text-[8px] text-dim uppercase">{t("whileServing")}</div>
                      </div>
                      <div>
                        <div className="text-[14px] font-bold text-text">{st.whileReceiving}</div>
                        <div className="text-[8px] text-dim uppercase">{t("whileReceiving")}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── History tab ── */}
      {tab === "history" && (
        <div className="bg-surface rounded-xl border border-line overflow-hidden mb-3">
          <div className="px-3.5 py-2.5 bg-alt text-[12px] font-bold text-accent tracking-wide uppercase">
            {t("history")}
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
            return (
              <div key={entry.id} className="flex items-center px-3.5 py-2 gap-2 border-b border-line last:border-b-0">
                <span className="text-[11px] font-bold text-accent w-9 flex-shrink-0">
                  {entry.t1}–{entry.t2}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-text truncate">
                    {entry.pointTypeIcon || "🏐"} {entry.pointTypeLabel || "Punto"}
                    {entry.scoringPlayerId ? ` · ${playerName(entry.scoringPlayerId)}` : ""}
                  </div>
                  <div className="text-[9px] text-dim">🏐 {playerName(entry.serverPlayerId)}</div>
                </div>
                <span className={`text-[9px] font-semibold ${teamColor} ${teamBg} px-1.5 py-0.5 rounded-[4px] flex-shrink-0`}>
                  {tName(isTeam1 ? team1Id : team2Id).split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CTAs ── */}
      {onSaveResult && activeTourMatchId && (() => {
        const winnerTeamId = winner === 1 ? team1Id : team2Id;
        const finalS1 = sets.reduce((acc, s) => acc + (s.winner === 1 ? 1 : 0), 0);
        const finalS2 = sets.reduce((acc, s) => acc + (s.winner === 2 ? 1 : 0), 0);
        return (
          <button
            onClick={() => !isSaving && onSaveResult(activeTourMatchId, finalS1, finalS2, winnerTeamId, log, sets)}
            disabled={isSaving}
            className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-success text-white border-0 cursor-pointer mb-2.5 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                Saving…
              </>
            ) : '✓ Save result'}
          </button>
        );
      })()}
      {reset && (
        <button
          onClick={reset}
          className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer"
        >
          {t("newMatch")}
        </button>
      )}

    </div>
  );
};

export default GameStats;
