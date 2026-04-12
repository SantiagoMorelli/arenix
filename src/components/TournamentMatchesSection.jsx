import React, { useState } from "react";
import { G, Card, Btn, Badge, Input, Modal } from "./ui";
import { uid } from "../lib/utils";

const TournamentMatchesSection = ({ tournament, setTournaments, players, onOpenLive }) => {
  const [showScoreModal, setShowScoreModal] = useState(null);
  const [s1, setS1] = useState("0");
  const [s2, setS2] = useState("0");

  const tName = id => tournament.teams.find(tm => tm.id === id)?.name || "?";

  const generateMatches = () => {
    if (tournament.teams.length < 2) return;
    const teamIds = tournament.teams.map(tm => tm.id);
    const matches = [];
    for (let i = 0; i < teamIds.length; i++)
      for (let j = i + 1; j < teamIds.length; j++)
        matches.push({ id: uid(), team1: teamIds[i], team2: teamIds[j], played: false, winner: null, score1: 0, score2: 0 });
    setTournaments(prev => prev.map(tour =>
      tour.id !== tournament.id ? tour : { ...tour, matches }
    ));
  };

  const submitScore = () => {
    const sc1 = parseInt(s1) || 0, sc2 = parseInt(s2) || 0;
    if (sc1 === sc2) return;
    const winner = sc1 > sc2 ? showScoreModal.team1 : showScoreModal.team2;
    setTournaments(prev => prev.map(tour => {
      if (tour.id !== tournament.id) return tour;
      const matches = tour.matches.map(m =>
        m.id !== showScoreModal.id ? m : { ...m, played: true, winner, score1: sc1, score2: sc2 }
      );
      // Update team stats
      const teams = tour.teams.map(tm => {
        if (tm.id === winner) return { ...tm, wins: tm.wins + 1, points: tm.points + 20 };
        if (tm.id === showScoreModal.team1 || tm.id === showScoreModal.team2)
          return { ...tm, losses: tm.losses + 1, points: tm.points + 5 };
        return tm;
      });
      const allPlayed = matches.every(m => m.played);
      const tourWinner = allPlayed ? getLeader(matches, tour.teams.map(tm => tm.id)) : null;
      return { ...tour, matches, teams, status: allPlayed ? "completed" : "active", winner: tourWinner };
    }));
    setShowScoreModal(null); setS1("0"); setS2("0");
  };

  const getLeader = (matches, teamIds) => {
    const wins = {};
    teamIds.forEach(id => wins[id] = 0);
    matches.forEach(m => { if (m.winner) wins[m.winner] = (wins[m.winner] || 0) + 1; });
    return Object.entries(wins).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  };

  const unplayed = tournament.matches.filter(m => !m.played);
  const played = tournament.matches.filter(m => m.played);

  const standings = (() => {
    const wins = {};
    tournament.teams.forEach(tm => wins[tm.id] = 0);
    played.forEach(m => { if (m.winner) wins[m.winner] = (wins[m.winner] || 0) + 1; });
    return Object.entries(wins).sort((a, b) => b[1] - a[1]).map(([id, w]) => ({ id, wins: w }));
  })();

  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: G.ocean, letterSpacing: 2, marginBottom: 16 }}>
        🏆 {tournament.name}
      </h1>

      {/* Info bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Badge color={G.ocean}>{tournament.teamSize} jug/equipo</Badge>
        <Badge color={G.ocean}>{tournament.setsPerMatch === 1 ? "1 set" : tournament.setsPerMatch + " sets"}</Badge>
        <Badge color={tournament.status === "completed" ? G.success : G.warn}>
          {tournament.status === "completed" ? "Finalizado" : "En curso"}
        </Badge>
      </div>

      {/* Champion */}
      {tournament.winner && (
        <Card style={{ background: "linear-gradient(135deg," + G.sun + "," + G.sunDark + ")", marginBottom: 16 }}>
          <div style={{ textAlign: "center", color: G.white }}>
            <div style={{ fontSize: 32 }}>🏆</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 1 }}>CAMPEÓN</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{tName(tournament.winner)}</div>
          </div>
        </Card>
      )}

      {/* Generate matches button */}
      {tournament.teams.length >= 2 && tournament.matches.length === 0 && (
        <Btn onClick={generateMatches} variant="sun" size="lg" style={{ width: "100%", marginBottom: 16 }}>
          🎯 Generar fixture
        </Btn>
      )}
      {tournament.teams.length < 2 && (
        <Card style={{ textAlign: "center", color: G.textLight, marginBottom: 16 }}>
          Necesitás al menos 2 equipos para generar el fixture
        </Card>
      )}

      {/* Standings */}
      {standings.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: G.ocean, letterSpacing: 1, marginBottom: 12 }}>
            TABLA DE POSICIONES
          </div>
          {standings.map((s, i) => (
            <div key={s.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: i < standings.length - 1 ? "1px solid " + G.sandDark : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 24, fontWeight: 700, color: i === 0 ? G.sun : G.textLight }}>{i + 1}</span>
                <span style={{ fontWeight: 600 }}>{tName(s.id)}</span>
              </div>
              <Badge color={G.ocean}>{s.wins} V</Badge>
            </div>
          ))}
        </Card>
      )}

      {/* Pending */}
      {unplayed.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: G.ocean, letterSpacing: 1, marginBottom: 12 }}>
            PARTIDOS PENDIENTES
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {unplayed.map(m => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", background: G.sand, borderRadius: 12,
              }}>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{tName(m.team1)}</div>
                <div style={{ padding: "0 10px", color: G.textLight, fontWeight: 700 }}>VS</div>
                <div style={{ flex: 1, textAlign: "right", fontSize: 14, fontWeight: 600 }}>{tName(m.team2)}</div>
                <div style={{ display: "flex", gap: 6, marginLeft: 10 }}>
                  <Btn onClick={() => onOpenLive && onOpenLive(m.id)}
                    size="sm" variant="primary">🏐 Vivo</Btn>
                  <Btn onClick={() => { setShowScoreModal(m); setS1("0"); setS2("0"); }}
                    size="sm" variant="sun">Cargar</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Results */}
      {played.length > 0 && (
        <Card>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: G.ocean, letterSpacing: 1, marginBottom: 12 }}>
            RESULTADOS
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {played.map(m => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 14px", background: G.sand, borderRadius: 10,
              }}>
                <div style={{
                  flex: 1, fontSize: 13,
                  fontWeight: m.winner === m.team1 ? 700 : 400,
                  color: m.winner === m.team1 ? G.ocean : G.textLight,
                }}>{tName(m.team1)}</div>
                <div style={{
                  padding: "4px 14px", background: G.white, borderRadius: 8,
                  fontFamily: "'Bebas Neue'", fontSize: 20, color: G.text, margin: "0 8px",
                }}>{m.score1} – {m.score2}</div>
                <div style={{
                  flex: 1, textAlign: "right", fontSize: 13,
                  fontWeight: m.winner === m.team2 ? 700 : 400,
                  color: m.winner === m.team2 ? G.ocean : G.textLight,
                }}>{tName(m.team2)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showScoreModal && (
        <Modal title="CARGAR RESULTADO" onClose={() => setShowScoreModal(null)}>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ textAlign: "center", fontSize: 14, color: G.textLight }}>
              {tName(showScoreModal.team1)} vs {tName(showScoreModal.team2)}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: G.textLight }}>{tName(showScoreModal.team1)}</div>
                <Input value={s1} onChange={setS1} placeholder="0" />
              </div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: G.textLight, paddingTop: 22 }}>—</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: G.textLight }}>{tName(showScoreModal.team2)}</div>
                <Input value={s2} onChange={setS2} placeholder="0" />
              </div>
            </div>
            <Btn onClick={submitScore} variant="success" size="lg" disabled={parseInt(s1) === parseInt(s2)}>
              Confirmar resultado
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TournamentMatchesSection;
