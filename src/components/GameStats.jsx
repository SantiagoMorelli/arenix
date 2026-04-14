import React from "react";
import { G, Card, Btn } from "./ui";

const GameStats = ({
  winner,
  team1Id, team2Id,
  sets, t1Sets, t2Sets,
  log,
  teams, players,
  onSaveResult, activeTourMatchId,
  reset,
  t,
}) => {
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
  const winnerColor = winner === 1 ? G.ocean : G.sun;
  const winnerDark  = winner === 1 ? G.oceanDark : G.sunDark;

  const CompRow = ({ label, icon, v1, v2 }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}>
        <span style={{ fontWeight: 700, color: G.ocean }}>{v1}</span>
        <span style={{ color: G.textLight }}>{icon} {label}</span>
        <span style={{ fontWeight: 700, color: G.sun }}>{v2}</span>
      </div>
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ flex: v1 || 0.1, background: G.ocean, transition: "flex 0.5s" }} />
        <div style={{ flex: v2 || 0.1, background: G.sun,   transition: "flex 0.5s" }} />
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg," + winnerColor + "," + winnerDark + ")", borderRadius: 20, padding: "20px 16px", textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 44 }}>🏆</div>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: G.white, letterSpacing: 2 }}>{t("winner")}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: G.white }}>{tName(winner === 1 ? team1Id : team2Id)}</div>
        <div style={{ color: G.white + "BB", fontSize: 13, marginTop: 4 }}>
          Sets {t1Sets}–{t2Sets} · {sets.map(s => s.s1 + "-" + s.s2).join("  ")}
        </div>
      </div>

      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: G.ocean, letterSpacing: 1, marginBottom: 12 }}>{t("totalPoints")}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 52, color: G.ocean, lineHeight: 1 }}>{s1.total}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.ocean }}>{tName(team1Id)}</div>
          </div>
          <div style={{ textAlign: "center", color: G.textLight, fontSize: 11 }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22 }}>–</div>
            {s1.total + s2.total} {t("totalLabel")}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 52, color: G.sun, lineHeight: 1 }}>{s2.total}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.sun }}>{tName(team2Id)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {sets.map((s, i) => (
            <div key={i} style={{ flex: 1, background: G.sand, borderRadius: 10, padding: "8px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: G.textLight, textTransform: "uppercase" }}>Set {i+1}</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20 }}>{s.s1}–{s.s2}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: s.winner === 1 ? G.ocean : G.sun }}>
                {tName(s.winner === 1 ? team1Id : team2Id).split(" ")[0]}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: G.ocean, letterSpacing: 1, marginBottom: 12 }}>{t("howWonTitle")}</div>
        <CompRow label="Ace"         icon="🎯" v1={s1.byType.ace}   v2={s2.byType.ace} />
        <CompRow label="Remate"      icon="💥" v1={s1.byType.spike} v2={s2.byType.spike} />
        <CompRow label="Bloqueo"     icon="🛡️" v1={s1.byType.block} v2={s2.byType.block} />
        <CompRow label="Finta"       icon="🤏" v1={s1.byType.tip}   v2={s2.byType.tip} />
        <CompRow label="Error rival" icon="❌" v1={s1.byType.error} v2={s2.byType.error} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.textLight, marginTop: 6, paddingTop: 6, borderTop: "1px solid " + G.sandDark }}>
          <span style={{ color: G.ocean, fontWeight: 700 }}>{tName(team1Id)}</span>
          <span>{t("comparison")}</span>
          <span style={{ color: G.sun, fontWeight: 700 }}>{tName(team2Id)}</span>
        </div>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: G.ocean, letterSpacing: 1, marginBottom: 12 }}>{t("serveEff")}</div>
        {[{tn:1,st:s1,tid:team1Id,col:G.ocean},{tn:2,st:s2,tid:team2Id,col:G.sun}].map(({tn,st,tid,col}) => {
          const tot = st.whileServing + st.whileReceiving || 1;
          const pct = Math.round(st.whileServing / tot * 100);
          return (
            <div key={tn} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: col }}>{tName(tid)}</span>
                <span style={{ fontSize: 11, color: G.textLight }}>{st.whileServing} {t("whileServing")} · {st.whileReceiving} {t("whileReceiving")}</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ flex: 1, height: 8, background: G.sandDark, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: pct + "%", background: col, borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: col, minWidth: 36, textAlign: "right" }}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: G.ocean, letterSpacing: 1, marginBottom: 12 }}>{t("streaks")}</div>
        {[{tn:1,st:s1,tid:team1Id,col:G.ocean},{tn:2,st:s2,tid:team2Id,col:G.sun}].map(({tn,st,tid,col}) => {
          const team = getTeam(tid);
          const pids = team ? teamPlayerIds(tid) : [];
          return (
            <div key={tn} style={{ background: G.sand, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
              {/* Team header row with streak badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: col }}>{tName(tid)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: G.white, borderRadius: 8, padding: "4px 10px" }}>
                  <span style={{ fontSize: 16 }}>🔥</span>
                  <span style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: G.warn, lineHeight: 1 }}>{st.bestStreak}</span>
                  <span style={{ fontSize: 10, color: G.textLight }}>{t("maxStreak")}</span>
                </div>
              </div>

              {/* Player cards */}
              <div style={{ display: "flex", gap: 8 }}>
                {pids.length === 0 && (
                  <div style={{ flex: 1, color: G.textLight, fontSize: 12, textAlign: "center", padding: 8 }}>—</div>
                )}
                {pids.map(pid => {
                  const pts    = st.playerPts[pid] || 0;
                  const errs   = st.playerErrors[pid] || 0;
                  const byType = st.playerByType[pid] || {};
                  const typeBreakdown = [
                    ["ace","🎯"], ["spike","💥"], ["block","🛡️"], ["tip","🤏"],
                  ].filter(([type]) => byType[type] > 0);
                  const hasAttribution = typeBreakdown.length > 0;
                  return (
                    <div key={pid} style={{
                      flex: 1, background: G.white, borderRadius: 12,
                      padding: "10px 8px", textAlign: "center",
                    }}>
                      {/* Name */}
                      <div style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {playerName(pid).split(" ")[0]}
                      </div>
                      {/* Points big number */}
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color: col, lineHeight: 1 }}>{pts}</div>
                      <div style={{ fontSize: 10, color: G.textLight, marginBottom: 6 }}>pts</div>
                      {/* Type breakdown pills */}
                      {hasAttribution && (
                        <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap", marginBottom: 6 }}>
                          {typeBreakdown.map(([type, icon]) => (
                            <span key={type} style={{
                              fontSize: 11, background: col + "18",
                              borderRadius: 5, padding: "2px 5px", color: col, fontWeight: 600,
                            }}>
                              {icon}{byType[type]}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Errors */}
                      {errs > 0 && (
                        <div style={{
                          fontSize: 11, color: G.danger, fontWeight: 700,
                          background: G.danger + "12", borderRadius: 6, padding: "2px 6px", display: "inline-block",
                        }}>
                          ❌ {errs}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Card>

      {onSaveResult && activeTourMatchId && (() => {
        const winnerTeamId = winner === 1 ? team1Id : team2Id;
        const finalS1 = sets.reduce((acc, s) => acc + (s.winner === 1 ? 1 : 0), 0);
        const finalS2 = sets.reduce((acc, s) => acc + (s.winner === 2 ? 1 : 0), 0);
        return (
          <Btn onClick={() => onSaveResult(activeTourMatchId, finalS1, finalS2, winnerTeamId, log, sets)}
            variant="success" size="lg" style={{ width: "100%", marginBottom: 10 }}>
            ✓ Guardar resultado en fixture
          </Btn>
        );
      })()}
      {reset && <Btn onClick={reset} variant="sun" size="lg" style={{ width: "100%" }}>{t("newMatch")}</Btn>}
    </div>
  );
};

export default GameStats;
