import React, { useState } from "react";
import { G, Card, Btn, Badge, Input, Modal } from "./ui";
import { uid, now } from "../lib/utils";

export default function FreePlaysSection({ freePlays, setFreePlays, players, onOpenFreePlay }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");

  const createFreePlay = () => {
    if (!name.trim()) return;
    const newFp = {
      id: uid(),
      name: name.trim(),
      date: now(),
      teams: [],
      games: [],
    };
    setFreePlays(prev => [...prev, newFp]);
    setName("");
    setShowCreate(false);
    onOpenFreePlay(newFp.id);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color: G.ocean, letterSpacing: 2 }}>
          🎮 FREE PLAY
        </h1>
        <Btn onClick={() => setShowCreate(true)} variant="sun">+ Create</Btn>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {freePlays.length === 0 && (
          <Card style={{ textAlign: "center", color: G.textLight, padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎮</div>
            No free plays yet. Create the first one!
          </Card>
        )}
        {[...freePlays].reverse().map(fp => {
          const gamesPlayed = (fp.games || []).filter(g => g.played).length;
          return (
            <Card key={fp.id} style={{ cursor: "pointer" }} onClick={() => onOpenFreePlay(fp.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{fp.name}</div>
                  <div style={{ fontSize: 13, color: G.textLight, marginTop: 3 }}>
                    {fp.date} · {(fp.teams || []).length} teams · {gamesPlayed} games played
                  </div>
                </div>
                <Badge color={G.ocean}>Open</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      {showCreate && (
        <Modal title="NEW FREE PLAY" onClose={() => { setShowCreate(false); setName(""); }}>
          <div style={{ display: "grid", gap: 16 }}>
            <Input value={name} onChange={setName} placeholder="e.g. Sunday Session" />
            <Btn onClick={createFreePlay} variant="sun" size="lg" disabled={!name.trim()}>
              Create Free Play
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
