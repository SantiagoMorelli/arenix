import React, { useState } from "react";
import {
  Trophy, Flame, Target, Zap, Shield, Hand, X, Check,
  Volleyball, Undo2, ArrowUpDown, Repeat, Equal, Activity,
} from "lucide-react";
import { formatDuration, getMatchDuration, getLongestRally } from "../lib/utils";
import { AppCard, AppButton, PillTabs, SectionLabel } from "./ui-new";

// ── Pure stat helpers ──────────────────────────────────────────────────────────

const calcLeadStats = (pointLog) => {
  let maxLead = 0, maxLeadTeam = null, changes = 0, prevLeader = null;
  pointLog.forEach(e => {
    const diff = e.t1 - e.t2;
    const leader = diff > 0 ? 1 : diff < 0 ? 2 : prevLeader;
    if (Math.abs(diff) > maxLead) { maxLead = Math.abs(diff); maxLeadTeam = diff > 0 ? 1 : 2; }
    if (leader && prevLeader !== null && leader !== prevLeader) changes++;
    prevLeader = leader;
  });
  return { maxLead, maxLeadTeam, changes };
};

const calcDynamics = (pointLog) => {
  let timesTied = 0;
  let closePoints = 0;
  pointLog.forEach(e => {
    const diff = Math.abs(e.t1 - e.t2);
    if (diff === 0) timesTied++;
    if (diff <= 2) closePoints++;
  });
  return { timesTied, closePoints };
};

const calcMVP = (allPlayerIds, s1, s2, t1PlayerIds) => {
  return allPlayerIds
    .map(pid => {
      const st = t1PlayerIds.includes(pid) ? s1 : s2;
      return { pid, net: (st.playerPts[pid] || 0) - (st.playerErrors[pid] || 0) };
    })
    .sort((a, b) => b.net - a.net)[0] || null;
};

const calcServeStats = (pointLog, pid) => {
  const serves = pointLog.filter(e => e.team && e.serverPlayerId === pid);
  const wins = serves.filter(e => e.team === e.serverTeam).length;
  const aces = serves.filter(e => e.pointType === "ace").length;
  return { count: serves.length, pct: serves.length ? Math.round(wins / serves.length * 100) : 0, aces };
};

// ── Component ──────────────────────────────────────────────────────────────────

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

  const getTeam    = id => teams.find(tm => tm.id === id);
  const getPlayer  = id => {
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
      // PTS = ace + spike + block + tip (active contributions only, not opponent errors)
      playerPts[pid] = pScored.length;
      playerErrors[pid] = pointLog.filter(e => e.errorPlayerId === pid).length;
    });
    const unattributed = pts.filter(e => !e.scoringPlayerId).length;
    return { total: pts.length, byType, whileServing, whileReceiving, bestStreak, playerPts, playerByType, playerErrors, unattributed };
  };

  const s1 = statFor(1), s2 = statFor(2);
  // Derive winner from sets array (ground truth) — avoids any prop value ambiguity
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

  const POINT_TYPES = [
    { id: "ace",   label: "Ace",         icon: Target },
    { id: "spike", label: "Spike",       icon: Zap    },
    { id: "block", label: "Block",       icon: Shield },
    { id: "tip",   label: "Tip",         icon: Hand   },
    { id: "error", label: "Rival error", icon: X      },
  ];

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

  // ── Performer row (design handoff §5.3: avatar + name + stats + flame) ──────
  const renderPerformerRow = (pid, stat, isTeam1, isMVP) => {
    const pts  = stat.playerPts[pid] || 0;
    const bt   = stat.playerByType[pid] || {};
    const err  = stat.playerErrors[pid] || 0;
    const initials = firstName(pid).slice(0, 2).toUpperCase();
    const avatarBg   = isTeam1 ? "bg-accent/20 text-accent" : "bg-free/20 text-free";
    const teamColor  = isTeam1 ? "text-accent" : "text-free";

    return (
      <div key={pid} className="flex items-center gap-2.5 py-2.5 border-b border-line last:border-b-0">
        {/* Avatar */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${avatarBg}`}>
          {initials}
        </div>
        {/* Name + MVP flame */}
        <div className="flex items-center gap-1 min-w-0 w-[64px] flex-shrink-0">
          <span className="text-[12px] font-semibold text-text truncate">{firstName(pid)}</span>
          {isMVP && <Flame size={12} className={teamColor} />}
        </div>
        {/* Stats chips */}
        <div className="flex items-center gap-[6px] flex-1 min-w-0 flex-wrap">
          <StatChip label="PTS" value={pts} bold color="text-text" />
          <StatChip label="ACE" value={bt.ace   || 0} />
          <StatChip label="SPK" value={bt.spike || 0} />
          <StatChip label="BLK" value={bt.block || 0} />
          <StatChip label="TIP" value={bt.tip   || 0} />
          <StatChip label="ERR" value={err} color={err > 0 ? "text-error" : "text-dim"} />
        </div>
      </div>
    );
  };

  return (
    <div>

      {/* ── Undo confirmation strip ── */}
      {pendingUndo && (
        <div className="bg-error text-white px-4 py-2.5 flex items-center justify-between text-[13px] font-bold rounded-xl mb-3">
          <span>Undo last point?</span>
          <div className="flex gap-4">
            <button onClick={onCancelUndo} className="bg-transparent border-0 text-white/70 cursor-pointer">Cancel</button>
            <button onClick={onConfirmUndo} className="bg-white text-error px-3 py-1 rounded cursor-pointer">Yes</button>
          </div>
        </div>
      )}

      {/* ── Undo last point ── */}
      {hasHistory && !pendingUndo && (
        <button
          onClick={onRequestUndo}
          className="flex items-center gap-1.5 text-dim text-[13px] font-semibold mb-3 bg-transparent border-0 cursor-pointer px-0 py-1"
        >
          <Undo2 size={16} />
          <span>Undo last point</span>
        </button>
      )}

      {/* ── Pill tabs ── */}
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

      {/* ── Overview tab ── */}
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

            {/* Score Momentum Strip */}
            {pointLog.length > 0 && (
              <div className="mt-3 pt-3 border-t border-line/60">
                <div className="text-[9px] text-dim uppercase tracking-wide mb-1.5">Match flow</div>
                <div className="flex flex-wrap gap-[2px] justify-center">
                  {pointLog.map(e => (
                    <div
                      key={e.id}
                      className={`w-[5px] h-[5px] rounded-[1px] ${e.team === 1 ? "bg-accent" : "bg-free"}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Match Highlights */}
          <AppCard className="px-3.5 py-3 mb-3">
            <SectionLabel>Match highlights</SectionLabel>
            <div className="flex gap-2">
              {/* MVP */}
              <div className="flex-1 bg-alt rounded-[10px] px-2.5 py-2.5 text-center">
                <Flame size={14} className={mvp && t1Ids.includes(mvp.pid) ? "text-accent mx-auto mb-1" : "text-free mx-auto mb-1"} />
                <div className="text-[12px] font-bold text-text leading-tight">
                  {mvp ? firstName(mvp.pid) : "—"}
                </div>
                {mvp && (
                  <div className="text-[10px] text-dim mt-0.5">
                    {mvp.net > 0 ? "+" : ""}{mvp.net} net pts
                  </div>
                )}
                <div className="text-[9px] text-dim uppercase mt-1">MVP</div>
              </div>
              {/* Biggest Lead */}
              <div className="flex-1 bg-alt rounded-[10px] px-2.5 py-2.5 text-center">
                <ArrowUpDown size={14} className="text-dim mx-auto mb-1" />
                <div className={`text-[12px] font-bold leading-tight ${leadStats.maxLeadTeam === 1 ? "text-accent" : leadStats.maxLeadTeam === 2 ? "text-free" : "text-text"}`}>
                  {leadStats.maxLead > 0 ? `+${leadStats.maxLead}` : "—"}
                </div>
                {leadStats.maxLeadTeam && leadStats.maxLead > 0 && (
                  <div className="text-[10px] text-dim mt-0.5 truncate px-1">
                    {tName(leadStats.maxLeadTeam === 1 ? team1Id : team2Id).split(" ")[0]}
                  </div>
                )}
                <div className="text-[9px] text-dim uppercase mt-1">Biggest lead</div>
              </div>
              {/* Lead Changes */}
              <div className="flex-1 bg-alt rounded-[10px] px-2.5 py-2.5 text-center">
                <Repeat size={14} className="text-dim mx-auto mb-1" />
                <div className="text-[12px] font-bold text-text leading-tight">
                  {leadStats.changes}
                </div>
                <div className="text-[10px] text-dim mt-0.5">
                  {leadStats.changes === 1 ? "time" : "times"}
                </div>
                <div className="text-[9px] text-dim uppercase mt-1">Lead changes</div>
              </div>
            </div>
          </AppCard>

          {/* Total points — only shown for multi-set; 1-set score is already in the banner */}
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

          {/* TOP PERFORMERS */}
          <AppCard className="px-3.5 py-3 mb-3">
            <SectionLabel>Top performers</SectionLabel>

            {/* Column header */}
            <div className="flex items-center gap-2.5 pb-1.5 mb-0.5">
              <div className="w-7 flex-shrink-0" />
              <div className="w-[64px] flex-shrink-0" />
              <div className="flex items-center gap-[6px] flex-1 flex-wrap">
                {["PTS","ACE","SPK","BLK","TIP","ERR"].map(h => (
                  <span key={h} className={`text-[8px] font-bold uppercase tracking-wide w-[26px] text-center ${h === "ERR" ? "text-error/60" : "text-dim/60"}`}>{h}</span>
                ))}
              </div>
            </div>

            {/* Team 1 */}
            {t1Ids.length > 0 && (
              <>
                <div className="text-[9px] font-bold text-accent uppercase tracking-wide mb-0.5 pl-[37px]">
                  {tName(team1Id)}
                </div>
                {t1Ids.map(pid => renderPerformerRow(pid, s1, true, mvp?.pid === pid))}
                {s1.unattributed > 0 && (
                  <div className="flex items-center gap-2.5 py-2 border-b border-line last:border-b-0 opacity-50">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold bg-line text-dim">—</div>
                    <div className="w-[64px] flex-shrink-0 text-[11px] text-dim italic">Rival errors</div>
                    <div className="flex items-center gap-[6px] flex-1 min-w-0">
                      <span className="text-[12px] font-bold text-dim w-[26px] text-center">{s1.unattributed}</span>
                      {["ace","spk","blk","tip","err"].map(k => (
                        <span key={k} className="text-[11px] text-dim/40 w-[26px] text-center">—</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Team 2 */}
            {t2Ids.length > 0 && (
              <>
                <div className={`text-[9px] font-bold text-free uppercase tracking-wide mb-0.5 pl-[37px] ${t1Ids.length > 0 ? "mt-2" : ""}`}>
                  {tName(team2Id)}
                </div>
                {t2Ids.map(pid => renderPerformerRow(pid, s2, false, mvp?.pid === pid))}
                {s2.unattributed > 0 && (
                  <div className="flex items-center gap-2.5 py-2 border-b border-line last:border-b-0 opacity-50">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold bg-line text-dim">—</div>
                    <div className="w-[64px] flex-shrink-0 text-[11px] text-dim italic">Rival errors</div>
                    <div className="flex items-center gap-[6px] flex-1 min-w-0">
                      <span className="text-[12px] font-bold text-dim w-[26px] text-center">{s2.unattributed}</span>
                      {["ace","spk","blk","tip","err"].map(k => (
                        <span key={k} className="text-[11px] text-dim/40 w-[26px] text-center">—</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Serve breakdown */}
            {allIds.length > 0 && (
              <>
                <div className="mt-3 pt-3 border-t border-line">
                  <SectionLabel>Serve breakdown</SectionLabel>
                  <div className="rounded-[10px] overflow-hidden border border-line">
                    <div className="flex px-2.5 py-1.5 bg-alt">
                      <span className="flex-1 text-[9px] font-bold text-dim">PLAYER</span>
                      <span className="w-10 text-[9px] font-bold text-dim text-center">SRV</span>
                      <span className="w-12 text-[9px] font-bold text-dim text-center">WIN%</span>
                      <span className="w-10 text-[9px] font-bold text-dim text-center">ACES</span>
                    </div>
                    {allIds.map(pid => {
                      const isTeam1 = t1Ids.includes(pid);
                      const sv = calcServeStats(pointLog, pid);
                      return (
                        <div key={pid} className="flex items-center px-2.5 py-[7px] border-b border-line last:border-b-0">
                          <div className="flex-1 flex items-center gap-[5px] min-w-0">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isTeam1 ? "bg-accent" : "bg-free"}`} />
                            <span className="text-[11px] text-text truncate">{firstName(pid)}</span>
                          </div>
                          <span className="w-10 text-[11px] text-dim text-center">{sv.count}</span>
                          <span className={`w-12 text-[11px] font-bold text-center ${sv.pct >= 60 ? "text-success" : sv.pct >= 40 ? "text-text" : "text-error"}`}>
                            {sv.count ? `${sv.pct}%` : "—"}
                          </span>
                          <span className="w-10 text-[11px] text-dim text-center">{sv.aces}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </AppCard>
        </>
      )}

      {/* ── Stats tab ── */}
      {tab === "stats" && (
        <>
          {/* Points by type */}
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

          {/* Serve efficiency */}
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

          {/* Match Dynamics */}
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

          {/* Timing */}
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

      {/* ── History tab ── */}
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

      {/* ── CTAs ── */}
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

// ── Tiny helper component for stat chips ──────────────────────────────────────
const StatChip = ({ label, value, bold, color = "text-dim" }) => (
  <div className="flex flex-col items-center w-[26px]">
    <span className={`text-[11px] ${bold ? "font-bold text-text" : `font-semibold ${color}`}`}>{value}</span>
  </div>
);

export default GameStats;
