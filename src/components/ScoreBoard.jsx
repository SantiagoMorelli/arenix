import React from "react";
import { G } from "./ui";

const ScoreBoard = ({
  teams, players,
  team1Id, team2Id,
  score1, score2,
  t1Sets, t2Sets,
  side,       // { t1: "left"|"right", t2: "left"|"right" }
  srv,        // { team, playerId }  — current server
  nextSrv,    // { team, playerId }  — next server
  serveRotation, // pre-computed array
  points,
  t,
}) => {
  const getTeam   = id => teams.find(tm => tm.id === id);
  const getPlayer = id => players.find(p => p.id === id);
  const tName      = id => getTeam(id)?.name || "?";
  const playerName = id => getPlayer(id)?.name || "?";

  const cols = {
    1: { teamId: team1Id, teamNum: 1, score: score1, sets: t1Sets },
    2: { teamId: team2Id, teamNum: 2, score: score2, sets: t2Sets },
  };
  const leftCol  = side.t1 === "left" ? cols[1] : cols[2];
  const rightCol = side.t1 === "left" ? cols[2] : cols[1];

  const TeamPanel = ({ col }) => {
    const isServing = srv.team === col.teamNum;
    const slotsForTeam = serveRotation.filter(r => r.team === col.teamNum);
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ color: G.sand, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
          {tName(col.teamId)}
        </div>
        <div style={{
          fontFamily: "'Bebas Neue'", fontSize: 72,
          color: isServing ? G.sun : G.white, lineHeight: 1, margin: "4px 0",
        }}>{col.score}</div>
        <div style={{ minHeight: 36 }}>
          {isServing ? (
            <div style={{ background: G.sun + "33", borderRadius: 8, padding: "4px 8px", display: "inline-block" }}>
              <div style={{ color: G.sun, fontSize: 11, fontWeight: 700 }}>{t("serving")}</div>
              <div style={{ color: G.sand, fontSize: 12, fontWeight: 700 }}>{playerName(srv.playerId)}</div>
            </div>
          ) : (
            <div style={{ color: G.sand + "66", fontSize: 11 }}>
              {t("ifScores")}<br />
              <b style={{ color: G.sand + "99", fontSize: 12 }}>
                {playerName(nextSrv.team === col.teamNum ? nextSrv.playerId : slotsForTeam[0]?.playerId)}
              </b>
            </div>
          )}
        </div>
        <div style={{ color: G.sand + "55", fontSize: 11, marginTop: 4 }}>Sets: {col.sets}</div>
      </div>
    );
  };

  return (
    <div style={{
      background: G.dark, borderRadius: 20, padding: "16px 14px", marginBottom: 12,
      display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10,
    }}>
      <TeamPanel col={leftCol} />
      <div style={{ textAlign: "center" }}>
        <div style={{ color: G.sand + "44", fontFamily: "'Bebas Neue'", fontSize: 24 }}>VS</div>
        <div style={{ color: G.warn, fontSize: 10, marginTop: 6, fontWeight: 600 }}>
          {points > 0 && points % 7 !== 0 ? `${t("changeIn")} ${7 - (points % 7)} pts` : ""}
        </div>
      </div>
      <TeamPanel col={rightCol} />
    </div>
  );
};

export default ScoreBoard;
