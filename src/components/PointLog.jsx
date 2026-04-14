import React from "react";
import { G, Card } from "./ui";

const PointLog = ({ log, logRef, team1Id, team2Id, teams, players, t }) => {
  const getTeam   = id => teams.find(tm => tm.id === id);
  const getPlayer = id => {
    if (id && id.startsWith("free_")) return { id, name: id.slice(5) };
    return players.find(p => p.id === id);
  };
  const tName      = id => getTeam(id)?.name || "?";
  const playerName = id => getPlayer(id)?.name || "?";

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", background: G.ocean, color: G.white }}>
        <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 1 }}>{t("history")}</span>
      </div>
      <div ref={logRef} style={{ maxHeight: 160, overflowY: "auto", padding: "10px 16px" }}>
        {log.length === 0 && (
          <div style={{ color: G.textLight, fontSize: 13, textAlign: "center" }}>{t("noPoints")}</div>
        )}
        {[...log].reverse().map((entry) => {
          if (!entry.team) return (
            <div key={entry.id} style={{
              padding: "5px 0", fontSize: 12, fontWeight: 700,
              color: G.ocean, textAlign: "center", borderBottom: "1px solid " + G.sandDark,
            }}>{entry.msg}</div>
          );
          const tc = entry.team === 1 ? G.ocean : G.sun;
          return (
            <div key={entry.id} style={{
              padding: "5px 0", display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid " + G.sandDark,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{entry.pointTypeIcon || "🏐"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: tc }}>
                  {entry.pointTypeLabel || "Punto"} · {tName(entry.team === 1 ? team1Id : team2Id)}
                </div>
                <div style={{ fontSize: 11, color: G.textLight, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                  {entry.scoringPlayerId && (
                    <span style={{ color: tc, fontWeight: 600 }}>{playerName(entry.scoringPlayerId)}</span>
                  )}
                  {entry.errorPlayerId && (
                    <span style={{ color: G.danger, fontWeight: 600 }}>❌ {playerName(entry.errorPlayerId)}</span>
                  )}
                  {(entry.scoringPlayerId || entry.errorPlayerId) && (
                    <span style={{ color: G.sandDark }}>·</span>
                  )}
                  <span>Sacó: {playerName(entry.serverPlayerId)}</span>
                  {entry.streak > 1 && <span style={{ color: G.warn }}>🔥 {entry.streak}</span>}
                  {entry.sideChange && <span style={{ color: G.sun }}>🔄</span>}
                </div>
              </div>
              <div style={{
                fontFamily: "'Bebas Neue'", fontSize: 18, color: G.text,
                background: G.sand, borderRadius: 8, padding: "2px 8px", flexShrink: 0,
              }}>
                {entry.t1}–{entry.t2}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default PointLog;
