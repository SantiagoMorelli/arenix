import React from "react";
import { G } from "./ui";

const PointButtons = ({ side, onPoint, team1Id, team2Id, teams }) => {
  const tName = id => teams.find(tm => tm.id === id)?.name || "?";

  const leftNum  = side.t1 === "left" ? 1 : 2;
  const rightNum = side.t1 === "left" ? 2 : 1;

  const teamColor = (num) => num === 1
    ? { bg: `linear-gradient(135deg, ${G.ocean}, ${G.oceanDark})`, shadow: "0 6px 20px rgba(26,107,138,0.35)" }
    : { bg: `linear-gradient(135deg, ${G.sun}, ${G.sunDark})`,    shadow: "0 6px 20px rgba(245,166,35,0.35)" };

  const leftStyle  = teamColor(leftNum);
  const rightStyle = teamColor(rightNum);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
      <button onClick={() => onPoint(leftNum)} style={{
        background: leftStyle.bg,
        color: G.white, border: "none", borderRadius: 16, padding: "18px 10px",
        fontSize: 15, fontWeight: 700, cursor: "pointer", lineHeight: 1.4,
        boxShadow: leftStyle.shadow, fontFamily: "'DM Sans', sans-serif",
        transition: "background 0.3s",
      }}>
        +1 {tName(leftNum === 1 ? team1Id : team2Id)}
      </button>
      <button onClick={() => onPoint(rightNum)} style={{
        background: rightStyle.bg,
        color: G.white, border: "none", borderRadius: 16, padding: "18px 10px",
        fontSize: 15, fontWeight: 700, cursor: "pointer", lineHeight: 1.4,
        boxShadow: rightStyle.shadow, fontFamily: "'DM Sans', sans-serif",
        transition: "background 0.3s",
      }}>
        +1 {tName(rightNum === 1 ? team1Id : team2Id)}
      </button>
    </div>
  );
};

export default PointButtons;
