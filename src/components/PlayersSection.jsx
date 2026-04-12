import React, { useState } from "react";
import { G, Card, Btn, Badge, Input, Modal } from "./ui";
import { uid, LEVELS, levelOf } from "../lib/utils";

const PlayersSection = ({ players, setPlayers, contextual = false }) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("beginner");
  const sorted = [...players].sort((a, b) => b.points - a.points);

  const addPlayer = () => {
    if (!name.trim()) return;
    setPlayers(prev => [...prev, { id: uid(), name: name.trim(), wins: 0, losses: 0, points: 0, level }]);
    setName(""); setLevel("beginner"); setShowModal(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color: G.ocean, letterSpacing: 2 }}>
          🏐 PLAYERS
        </h1>
        <Btn onClick={() => setShowModal(true)} variant="sun">+ Add</Btn>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {sorted.map((p, i) => {
          const lvl = levelOf(p.level);
          return (
            <Card key={p.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: i === 0 ? G.sun : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : G.sandDark,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Bebas Neue'", fontSize: 20, color: i < 3 ? G.white : G.textLight, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: G.textLight, marginTop: 2 }}>{p.wins}W – {p.losses}L</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: G.ocean, lineHeight: 1 }}>{p.points}</div>
                <div style={{ fontSize: 11, color: G.textLight, textTransform: "uppercase", letterSpacing: 0.5 }}>pts</div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: G.ocean, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: G.white, fontWeight: 700, flexShrink: 0,
              }}>{p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
            </Card>
          );
        })}
      </div>
      {showModal && (
        <Modal title="NEW PLAYER" onClose={() => { setShowModal(false); setName(""); setLevel("beginner"); }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Input value={name} onChange={setName} placeholder="Full name" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Level
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {LEVELS.map(lv => (
                  <button key={lv.id} onClick={() => setLevel(lv.id)} style={{
                    flex: 1, padding: "10px 6px", borderRadius: 10, border: "2px solid",
                    borderColor: level === lv.id ? lv.color : G.sandDark,
                    background: level === lv.id ? lv.color + "18" : G.white,
                    fontWeight: level === lv.id ? 700 : 400,
                    fontSize: 12, cursor: "pointer", color: level === lv.id ? lv.color : G.text,
                    fontFamily: "'DM Sans', sans-serif", textAlign: "center",
                    transition: "all 0.15s",
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{lv.icon}</div>
                    {lv.label}
                  </button>
                ))}
              </div>
            </div>
            <Btn onClick={addPlayer} variant="sun" size="lg" disabled={!name.trim()}>
              Add player
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PlayersSection;
