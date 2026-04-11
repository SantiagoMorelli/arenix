import React from "react";
import { G, Card, Btn, Select } from "./ui";

const GameSetupScreen = ({
  teams, players, tournamentMatches,
  team1Id, setTeam1Id,
  team2Id, setTeam2Id,
  t1ServeOrder, setT1ServeOrder,
  t2ServeOrder, setT2ServeOrder,
  t1InitialSide, setT1InitialSide,
  setSide,
  setActiveTourMatchId,
  setGameStarted,
  serveRotation, // pre-computed array from LiveScoreSection
  t,
}) => {
  const getPlayer = id => players.find(p => p.id === id);
  const getTeam   = id => teams.find(tm => tm.id === id);
  const playerName = id => getPlayer(id)?.name || "?";
  const tName      = id => getTeam(id)?.name || "?";

  const teamPlayerIds = (teamId) => {
    const team = teams.find(tm => tm.id === teamId);
    if (!team) return [];
    if (team.players && team.players.length > 0) return team.players;
    return [team.player1, team.player2].filter(Boolean);
  };

  const t1 = getTeam(team1Id);
  const t2 = getTeam(team2Id);

  const ServeOrderPicker = ({ teamId, serveOrder, setServeOrder, color }) => {
    const pIds = teamPlayerIds(teamId);
    if (pIds.length === 0) return null;
    if (serveOrder.length === 0) {
      setTimeout(() => setServeOrder(pIds), 0);
      return null;
    }
    const moveUp = (idx) => {
      if (idx === 0) return;
      const o = [...serveOrder];
      [o[idx-1], o[idx]] = [o[idx], o[idx-1]];
      setServeOrder(o);
    };
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {serveOrder.map((pid, idx) => {
          const pl = getPlayer(pid);
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
        <div style={{ fontSize: 11, color: G.textLight, marginTop: 2 }}>Usá ↑ para cambiar el orden</div>
      </div>
    );
  };

  const canStart = team1Id && team2Id &&
    t1ServeOrder.length === teamPlayerIds(team1Id).length &&
    t2ServeOrder.length === teamPlayerIds(team2Id).length;

  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 34, color: G.ocean, letterSpacing: 2, marginBottom: 20 }}>
        {t("liveTitle")}
      </h1>
      <Card>
        <div style={{ display: "grid", gap: 20 }}>
          {/* Match picker for tournament mode */}
          {tournamentMatches && tournamentMatches.length > 0 ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Partidos pendientes del torneo
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {tournamentMatches.filter(m => !m.played).map(m => {
                  const tm1 = teams.find(tm => tm.id === m.team1);
                  const tm2 = teams.find(tm => tm.id === m.team2);
                  const selected = team1Id === m.team1 && team2Id === m.team2;
                  return (
                    <div key={m.id} onClick={() => {
                      setTeam1Id(m.team1); setTeam2Id(m.team2);
                      setActiveTourMatchId(m.id);
                      setT1ServeOrder(teamPlayerIds(m.team1));
                      setT2ServeOrder(teamPlayerIds(m.team2));
                    }} style={{
                      padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                      border: "2px solid " + (selected ? G.ocean : G.sandDark),
                      background: selected ? G.ocean + "11" : G.sand, transition: "all 0.15s",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: selected ? 6 : 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: selected ? G.ocean : G.text }}>{tm1?.name || "?"}</span>
                        <span style={{ color: G.textLight, fontWeight: 700, fontSize: 12 }}>VS</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: selected ? G.sun : G.text }}>{tm2?.name || "?"}</span>
                      </div>
                      {selected && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: G.textLight }}>
                          <span>{(tm1?.players || []).map(pid => getPlayer(pid)?.name || "?").join(", ")}</span>
                          <span>{(tm2?.players || []).map(pid => getPlayer(pid)?.name || "?").join(", ")}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {tournamentMatches.filter(m => !m.played).length === 0 && (
                  <div style={{ textAlign: "center", color: G.textLight, padding: 16, fontSize: 14 }}>
                    No hay partidos pendientes en el fixture
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <Select value={team1Id} onChange={v => { setTeam1Id(v); setT1ServeOrder(teamPlayerIds(v)); }}>
                <option value="">{t("team1ph")}</option>
                {teams.filter(tm => tm.id !== team2Id).map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </Select>
              <Select value={team2Id} onChange={v => { setTeam2Id(v); setT2ServeOrder(teamPlayerIds(v)); }}>
                <option value="">{t("team2ph")}</option>
                {teams.filter(tm => tm.id !== team1Id).map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </Select>
            </div>
          )}

          {/* Serve order */}
          {t1 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.ocean, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t1.name} — {t("serveOrderTitle")}
              </div>
              <ServeOrderPicker teamId={team1Id} serveOrder={t1ServeOrder} setServeOrder={setT1ServeOrder} color={G.ocean} />
            </div>
          )}
          {t2 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.sun, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t2.name} — {t("serveOrderTitle")}
              </div>
              <ServeOrderPicker teamId={team2Id} serveOrder={t2ServeOrder} setServeOrder={setT2ServeOrder} color={G.sun} />
            </div>
          )}

          {/* Initial side */}
          {t1 && t2 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("initialSideOf")} {t1.name}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {["left", "right"].map(s => (
                  <button key={s} onClick={() => { setT1InitialSide(s); setSide({ t1: s, t2: s === "left" ? "right" : "left" }); }} style={{
                    flex: 1, padding: "10px", borderRadius: 10, border: "2px solid",
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
          )}

          {/* Serve preview */}
          {canStart && (
            <div style={{ background: G.sand, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                {t("serveOrderTitle")}
              </div>
              {serveRotation.map((slot, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
                  borderBottom: i < serveRotation.length - 1 ? "1px solid " + G.sandDark : "none" }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    background: slot.team === 1 ? G.ocean : G.sun,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: G.white, fontWeight: 700,
                  }}>{i + 1}</div>
                  <span style={{ fontSize: 14, color: G.text }}>
                    <b>{playerName(slot.playerId)}</b>
                    <span style={{ color: G.textLight }}> — {tName(slot.team === 1 ? team1Id : team2Id)}</span>
                  </span>
                  {i === 0 && <span style={{ marginLeft: "auto", fontSize: 11, color: G.ocean, fontWeight: 700 }}>{t("serveOrderFirst")}</span>}
                </div>
              ))}
              <div style={{ fontSize: 11, color: G.textLight, marginTop: 8 }}>{t("serveOrderRepeat")}</div>
            </div>
          )}

          <Btn onClick={() => setGameStarted(true)} variant="sun" size="lg" disabled={!canStart}>
            {t("startMatch")}
          </Btn>
        </div>
      </Card>
    </div>
  );
};

export default GameSetupScreen;
