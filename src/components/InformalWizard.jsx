import React from "react";

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
    name: infTeam.name || "Team " + teamNum,
    players: infTeam.players.map(s => resolveSlot(s).id),
  });

  const selBtnCls = (active) =>
    `flex-1 py-3.5 rounded-xl border-2 cursor-pointer text-center text-[15px] transition-all ${
      active
        ? "border-accent bg-accent/[0.07] font-bold text-text"
        : "border-line bg-surface font-normal text-text"
    }`;

  // ── Step: config ────────────────────────────────────────────────────────────
  if (informalStep === "config") return (
    <div>
      <h1 className="font-display text-[34px] text-accent tracking-[2px] mb-5">🏐 INFORMAL MATCH</h1>
      <div className="bg-surface rounded-xl border border-line p-4">
        <div className="flex flex-col gap-5">
          <div>
            <div className="text-[13px] font-bold text-dim uppercase tracking-[0.5px] mb-2">Players per team</div>
            <div className="flex gap-2.5">
              {[2, 3].map(n => (
                <button key={n} onClick={() => setInformalTeamSize(n)} className={selBtnCls(informalTeamSize === n)}>
                  <div className="text-[24px] mb-1">👥</div>
                  {n} players
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[13px] font-bold text-dim uppercase tracking-[0.5px] mb-2">Sets per match</div>
            <div className="flex gap-2.5">
              {[1, 3, 5].map(n => (
                <button key={n} onClick={() => setInformalSets(n)} className={selBtnCls(informalSets === n)}>
                  {n === 1 ? "1 set" : n + " sets"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              setInformalTeam1({ name: "", players: [] });
              setInformalTeam2({ name: "", players: [] });
              setInformalStep("team1");
            }}
            className="w-full min-h-[44px] rounded-xl text-[14px] font-bold text-white bg-free border-0 cursor-pointer"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );

  // ── Step: team1 / team2 ─────────────────────────────────────────────────────
  if (informalStep === "team1" || informalStep === "team2") {
    const isTeam1 = informalStep === "team1";
    const infTeam = isTeam1 ? informalTeam1 : informalTeam2;
    const setInfTeam = isTeam1 ? setInformalTeam1 : setInformalTeam2;
    const teamColor = isTeam1 ? "var(--color-accent)" : "var(--color-free)";
    const teamLabel = isTeam1 ? "TEAM 1" : "TEAM 2";

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
        <div className="flex items-center gap-2.5 mb-5">
          <button
            onClick={() => setInformalStep(isTeam1 ? "config" : "team1")}
            className="bg-transparent border-0 text-[20px] cursor-pointer text-accent"
          >
            ←
          </button>
          <h1 className="font-display text-[30px] tracking-[2px]" style={{ color: teamColor }}>
            {teamLabel}
          </h1>
          <div className="text-[13px] text-dim ml-auto">Step {isTeam1 ? "2" : "3"} of 4</div>
        </div>
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="flex flex-col gap-4">
            <input
              value={infTeam.name}
              onChange={e => setInfTeam(prev => ({ ...prev, name: e.target.value }))}
              placeholder={"Team " + (isTeam1 ? "1" : "2") + " name"}
              className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors"
            />
            <div>
              <div className="text-[13px] font-bold text-dim uppercase tracking-[0.5px] mb-2.5">
                Players ({informalTeamSize})
              </div>
              <div className="flex flex-col gap-2.5">
                {Array.from({ length: informalTeamSize }).map((_, idx) => {
                  const slot = infTeam.players[idx];
                  return (
                    <div key={idx} className="bg-alt rounded-xl p-3.5">
                      <div className="text-[12px] font-bold mb-2" style={{ color: teamColor }}>
                        Player {idx + 1}
                      </div>
                      {/* Toggle type */}
                      <div className="flex gap-2 mb-2.5">
                        {[
                          { type: "global", label: "👤 From list" },
                          { type: "free",   label: "✏️ Free name" },
                        ].map(opt => {
                          const isActive = slot?.type === opt.type;
                          return (
                            <button
                              key={opt.type}
                              onClick={() => setSlot(idx, { type: opt.type, playerId: "", name: "" })}
                              className="flex-1 py-2 rounded-lg border-2 cursor-pointer text-[12px] transition-all"
                              style={{
                                borderColor: isActive ? teamColor : "var(--color-line)",
                                background: isActive ? `color-mix(in srgb, ${teamColor} 12%, transparent)` : "var(--color-surface)",
                                fontWeight: isActive ? 700 : 400,
                                color: isActive ? teamColor : "var(--color-text)",
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      {/* Input based on type */}
                      {slot?.type === "global" && (
                        <select
                          value={slot.playerId || ""}
                          onChange={e => setSlot(idx, { type: "global", playerId: e.target.value })}
                          className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors cursor-pointer"
                        >
                          <option value="">Select player...</option>
                          {players.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                      {slot?.type === "free" && (
                        <input
                          value={slot.name || ""}
                          onChange={e => setSlot(idx, { type: "free", name: e.target.value })}
                          placeholder={"Player " + (idx + 1) + " name"}
                          className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors"
                        />
                      )}
                      {!slot && (
                        <div className="text-[13px] text-dim">Select an option above</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={() => {
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
              }}
              disabled={!canContinue}
              className="w-full min-h-[44px] rounded-xl text-[14px] font-bold text-white bg-free border-0 cursor-pointer disabled:opacity-50"
            >
              {isTeam1 ? "Next → Team 2" : "Next → Serve order"}
            </button>
          </div>
        </div>
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
                background: idx === 0 ? `color-mix(in srgb, ${color} 12%, transparent)` : "var(--color-alt)",
                border: "2px solid " + (idx === 0 ? color : "transparent"),
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: color, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Bebas Neue'", fontSize: 16, color: "#fff",
                }}>{idx + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: idx === 0 ? 700 : 500, fontSize: 14, color: idx === 0 ? color : "var(--color-text)" }}>
                    {pl?.name || "?"}
                  </div>
                  {idx === 0 && <div style={{ fontSize: 11, color, marginTop: 1 }}>🏐 Serves first</div>}
                </div>
                {idx > 0 && (
                  <button onClick={() => moveUp(idx)} style={{
                    background: "var(--color-surface)", border: "1.5px solid var(--color-line)",
                    borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 14, color: "var(--color-dim)",
                  }}>↑</button>
                )}
              </div>
            );
          })}
        </div>
      );
    };

    const selSideCls = (active) =>
      `flex-1 py-3 rounded-[10px] border-2 cursor-pointer text-[14px] transition-all ${
        active
          ? "border-accent bg-accent/[0.07] font-bold text-text"
          : "border-line bg-surface font-normal text-text"
      }`;

    return (
      <div>
        <div className="flex items-center gap-2.5 mb-5">
          <button
            onClick={() => setInformalStep("team2")}
            className="bg-transparent border-0 text-[20px] cursor-pointer text-accent"
          >
            ←
          </button>
          <h1 className="font-display text-[28px] text-accent tracking-[2px]">SERVE &amp; SIDE</h1>
          <div className="text-[13px] text-dim ml-auto">Step 4 of 4</div>
        </div>
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="flex flex-col gap-5">
            {/* Team 1 serve order */}
            <div>
              <div className="text-[13px] font-bold text-accent uppercase tracking-[0.5px] mb-2">
                {informalTeam1.name || "Team 1"} — Serve order
              </div>
              <ServeOrderInformal serveOrder={t1ServeOrder} setServeOrder={setT1ServeOrder} color="var(--color-accent)" />
            </div>
            {/* Team 2 serve order */}
            <div>
              <div className="text-[13px] font-bold text-free uppercase tracking-[0.5px] mb-2">
                {informalTeam2.name || "Team 2"} — Serve order
              </div>
              <ServeOrderInformal serveOrder={t2ServeOrder} setServeOrder={setT2ServeOrder} color="var(--color-free)" />
            </div>
            {/* Initial side */}
            <div>
              <div className="text-[13px] font-bold text-dim uppercase tracking-[0.5px] mb-2">
                Initial side — {informalTeam1.name || "Team 1"}
              </div>
              <div className="flex gap-2.5">
                {["left", "right"].map(s => (
                  <button
                    key={s}
                    onClick={() => { setT1InitialSide(s); setSide({ t1: s, t2: s === "left" ? "right" : "left" }); }}
                    className={selSideCls(t1InitialSide === s)}
                  >
                    {s === "left" ? t("sideLeft") : t("sideRight")}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                setPointsToWin(21);
                setGameStarted(true);
              }}
              className="w-full min-h-[44px] rounded-xl text-[14px] font-bold text-white bg-free border-0 cursor-pointer"
            >
              {t("startMatch")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default InformalWizard;
