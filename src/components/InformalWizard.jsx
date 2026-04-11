import React from "react";
import { G, Card, Btn, Input, Select } from "./ui";

const InformalWizard = ({
  players,
  t,
  // Step state
  informalStep, setInformalStep,
  informalSets, setInformalSets,
  informalTeamSize, setInformalTeamSize,
  informalTeam1, setInformalTeam1,
  informalTeam2, setInformalTeam2,
  // Serve order + side (lifted to LiveScoreSection so game can start with them)
  t1ServeOrder, setT1ServeOrder,
  t2ServeOrder, setT2ServeOrder,
  t1InitialSide, setT1InitialSide,
  setSide,
  // Game start setters
  setTeam1Id, setTeam2Id,
  setPointsToWin, setGameStarted,
}) => {
  // Helper: resolve a player slot to { id, name } for display and rotation
  const resolveSlot = (slot) => {
    if (slot.type === "global") {
      const p = players.find(p => p.id === slot.playerId);
      return { id: slot.playerId, name: p?.name || "?" };
    }
    return { id: "free_" + slot.name, name: slot.name || "?" };
  };

  // Build ad-hoc team object from informalTeam for rotation
  const buildTeamObj = (infTeam, teamNum) => ({
    id: "informal_" + teamNum,
    name: infTeam.name || "Equipo " + teamNum,
    players: infTeam.players.map(s => resolveSlot(s).id),
  });

  // ── Step: config ────────────────────────────────────────────────────────────
  if (informalStep === "config") return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 34, color: G.ocean, letterSpacing: 2, marginBottom: 20 }}>
        🏐 PARTIDO INFORMAL
      </h1>
      <Card>
        <div style={{ display: "grid", gap: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Jugadores por equipo
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {[2, 3].map(n => (
                <button key={n} onClick={() => setInformalTeamSize(n)} style={{
                  flex: 1, padding: "14px", borderRadius: 12, border: "2px solid",
                  borderColor: informalTeamSize === n ? G.ocean : G.sandDark,
                  background: informalTeamSize === n ? G.ocean + "11" : G.white,
                  fontWeight: informalTeamSize === n ? 700 : 400,
                  fontSize: 15, cursor: "pointer", color: G.text,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>👥</div>
                  {n} jugadores
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Sets por partido
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {[1, 3, 5].map(n => (
                <button key={n} onClick={() => setInformalSets(n)} style={{
                  flex: 1, padding: "14px", borderRadius: 12, border: "2px solid",
                  borderColor: informalSets === n ? G.ocean : G.sandDark,
                  background: informalSets === n ? G.ocean + "11" : G.white,
                  fontWeight: informalSets === n ? 700 : 400,
                  fontSize: 15, cursor: "pointer", color: G.text,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {n === 1 ? "1 set" : n + " sets"}
                </button>
              ))}
            </div>
          </div>
          <Btn onClick={() => {
            setInformalTeam1({ name: "", players: [] });
            setInformalTeam2({ name: "", players: [] });
            setInformalStep("team1");
          }} variant="sun" size="lg">Siguiente →</Btn>
        </div>
      </Card>
    </div>
  );

  // ── Step: team1 / team2 ─────────────────────────────────────────────────────
  if (informalStep === "team1" || informalStep === "team2") {
    const isTeam1 = informalStep === "team1";
    const infTeam = isTeam1 ? informalTeam1 : informalTeam2;
    const setInfTeam = isTeam1 ? setInformalTeam1 : setInformalTeam2;
    const teamColor = isTeam1 ? G.ocean : G.sun;
    const teamLabel = isTeam1 ? "EQUIPO 1" : "EQUIPO 2";

    const setSlot = (idx, slot) => {
      setInfTeam(prev => {
        const newPlayers = [...prev.players];
        newPlayers[idx] = slot;
        return { ...prev, players: newPlayers };
      });
    };

    const canContinue = infTeam.name.trim() &&
      infTeam.players.length === informalTeamSize &&
      infTeam.players.every(s => s && (s.type === "global" ? s.playerId : s.name?.trim()));

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setInformalStep(isTeam1 ? "config" : "team1")} style={{
            background: "none", border: "none", fontSize: 20, cursor: "pointer", color: G.ocean,
          }}>←</button>
          <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: teamColor, letterSpacing: 2 }}>
            {teamLabel}
          </h1>
          <div style={{ fontSize: 13, color: G.textLight, marginLeft: "auto" }}>
            Paso {isTeam1 ? "2" : "3"} de 4
          </div>
        </div>
        <Card>
          <div style={{ display: "grid", gap: 16 }}>
            <Input
              value={infTeam.name}
              onChange={v => setInfTeam(prev => ({ ...prev, name: v }))}
              placeholder={"Nombre del " + (isTeam1 ? "equipo 1" : "equipo 2")}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Jugadores ({informalTeamSize})
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {Array.from({ length: informalTeamSize }).map((_, idx) => {
                  const slot = infTeam.players[idx];
                  return (
                    <div key={idx} style={{ background: G.sand, borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: teamColor, marginBottom: 8 }}>
                        Jugador {idx + 1}
                      </div>
                      {/* Toggle type */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                        {[
                          { type: "global", label: "👤 De la lista" },
                          { type: "free",   label: "✏️ Nombre libre" },
                        ].map(opt => (
                          <button key={opt.type} onClick={() => setSlot(idx, { type: opt.type, playerId: "", name: "" })} style={{
                            flex: 1, padding: "8px", borderRadius: 8, border: "2px solid",
                            borderColor: slot?.type === opt.type ? teamColor : G.sandDark,
                            background: slot?.type === opt.type ? teamColor + "18" : G.white,
                            fontWeight: slot?.type === opt.type ? 700 : 400,
                            fontSize: 12, cursor: "pointer", color: slot?.type === opt.type ? teamColor : G.text,
                            fontFamily: "'DM Sans', sans-serif",
                          }}>{opt.label}</button>
                        ))}
                      </div>
                      {/* Input based on type */}
                      {slot?.type === "global" && (
                        <Select value={slot.playerId || ""} onChange={v => setSlot(idx, { type: "global", playerId: v })}>
                          <option value="">Elegir jugador...</option>
                          {players.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </Select>
                      )}
                      {slot?.type === "free" && (
                        <Input
                          value={slot.name || ""}
                          onChange={v => setSlot(idx, { type: "free", name: v })}
                          placeholder={"Nombre del jugador " + (idx + 1)}
                        />
                      )}
                      {!slot && (
                        <div style={{ fontSize: 13, color: G.textLight }}>
                          Elegí una opción arriba
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Btn onClick={() => {
              if (isTeam1) {
                setInformalStep("team2");
              } else {
                // Build ad-hoc teams and set up rotation
                const tm1 = buildTeamObj(informalTeam1, 1);
                const tm2 = buildTeamObj(infTeam, 2);
                setTeam1Id(tm1.id);
                setTeam2Id(tm2.id);
                setT1ServeOrder(tm1.players);
                setT2ServeOrder(tm2.players);
                setInformalStep("serve");
              }
            }} variant="sun" size="lg" disabled={!canContinue}>
              {isTeam1 ? "Siguiente → Equipo 2" : "Siguiente → Orden de saque"}
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  // ── Step: serve + side ──────────────────────────────────────────────────────
  if (informalStep === "serve") {
    const tm1obj = buildTeamObj(informalTeam1, 1);
    const tm2obj = buildTeamObj(informalTeam2, 2);

    const getInfPlayer = id => {
      const allSlots = [...informalTeam1.players, ...informalTeam2.players];
      const slot = allSlots.find(s => resolveSlot(s).id === id);
      return slot ? { id, name: resolveSlot(slot).name } : players.find(p => p.id === id);
    };

    const ServeOrderInformal = ({ serveOrder, setServeOrder, color }) => {
      const moveUp = (idx) => {
        if (idx === 0) return;
        const newOrder = [...serveOrder];
        [newOrder[idx-1], newOrder[idx]] = [newOrder[idx], newOrder[idx-1]];
        setServeOrder(newOrder);
      };
      return (
        <div style={{ display: "grid", gap: 8 }}>
          {serveOrder.map((pid, idx) => {
            const pl = getInfPlayer(pid);
            return (
              <div key={pid + idx} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 12,
                background: idx === 0 ? color + "18" : G.sand,
                border: "2px solid " + (idx === 0 ? color : "transparent"),
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: color, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Bebas Neue'", fontSize: 16, color: G.white,
                }}>{idx + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: idx === 0 ? 700 : 500, fontSize: 14, color: idx === 0 ? color : G.text }}>
                    {pl?.name || "?"}
                  </div>
                  {idx === 0 && <div style={{ fontSize: 11, color, marginTop: 1 }}>🏐 Saca primero</div>}
                </div>
                {idx > 0 && (
                  <button onClick={() => moveUp(idx)} style={{
                    background: G.white, border: "1.5px solid " + G.sandDark,
                    borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 14, color: G.textLight,
                  }}>↑</button>
                )}
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setInformalStep("team2")} style={{
            background: "none", border: "none", fontSize: 20, cursor: "pointer", color: G.ocean,
          }}>←</button>
          <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: G.ocean, letterSpacing: 2 }}>
            SAQUE Y LADO
          </h1>
          <div style={{ fontSize: 13, color: G.textLight, marginLeft: "auto" }}>Paso 4 de 4</div>
        </div>
        <Card>
          <div style={{ display: "grid", gap: 20 }}>
            {/* Team 1 serve order */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.ocean, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {informalTeam1.name || "Equipo 1"} — Orden de saque
              </div>
              <ServeOrderInformal serveOrder={t1ServeOrder} setServeOrder={setT1ServeOrder} color={G.ocean} />
            </div>
            {/* Team 2 serve order */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.sun, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {informalTeam2.name || "Equipo 2"} — Orden de saque
              </div>
              <ServeOrderInformal serveOrder={t2ServeOrder} setServeOrder={setT2ServeOrder} color={G.sun} />
            </div>
            {/* Initial side */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Lado inicial — {informalTeam1.name || "Equipo 1"}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {["left", "right"].map(s => (
                  <button key={s} onClick={() => { setT1InitialSide(s); setSide({ t1: s, t2: s === "left" ? "right" : "left" }); }} style={{
                    flex: 1, padding: "12px", borderRadius: 10, border: "2px solid",
                    borderColor: t1InitialSide === s ? G.ocean : G.sandDark,
                    background: t1InitialSide === s ? G.ocean + "11" : G.white,
                    fontWeight: t1InitialSide === s ? 700 : 400,
                    fontSize: 14, cursor: "pointer", color: G.text,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {s === "left" ? t("sideLeft") : t("sideRight")}
                  </button>
                ))}
              </div>
            </div>
            <Btn onClick={() => {
              setPointsToWin(21);
              setGameStarted(true);
            }} variant="sun" size="lg">
              {t("startMatch")}
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

export default InformalWizard;
