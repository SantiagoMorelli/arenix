import React, { useState } from "react";
import { G, Card, Btn, Input, Modal } from "./ui";

const uid = () => Math.random().toString(36).slice(2, 8);

const LEVELS = [
  { id: "beginner",     label: "Beginner",   color: G.success, icon: "🟢" },
  { id: "intermediate", label: "Intermedio", color: G.warn,    icon: "🟡" },
  { id: "advanced",     label: "Avanzado",   color: G.danger,  icon: "🔴" },
];
const levelOf = (id) => LEVELS.find(l => l.id === id) || LEVELS[0];

const TournamentTeamsSection = ({ tournament, setTournaments, players }) => {
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoMode, setAutoMode] = useState("random"); // "random" | "balanced"
  const [proposedTeams, setProposedTeams] = useState(null); // null | array of proposed teams

  const invitedPlayers = players.filter(p => tournament.invitedPlayers.includes(p.id));
  const availablePlayers = invitedPlayers.filter(p => !tournament.teams.some(tm => tm.players.includes(p.id)));
  const teamSize = tournament.teamSize || 2;

  const togglePlayer = (pid) => {
    setSelectedPlayers(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : prev.length < teamSize ? [...prev, pid] : prev
    );
  };

  const addTeam = () => {
    if (!teamName.trim() || selectedPlayers.length !== teamSize) return;
    const newTeam = { id: uid(), name: teamName.trim(), players: selectedPlayers, wins: 0, losses: 0, points: 0 };
    setTournaments(prev => prev.map(tour =>
      tour.id !== tournament.id ? tour : { ...tour, teams: [...tour.teams, newTeam] }
    ));
    setTeamName(""); setSelectedPlayers([]); setShowModal(false);
  };

  // ── Auto team generation ──────────────────────────────────────────────────
  const levelScore = { beginner: 1, intermediate: 2, advanced: 3 };

  const generateRandom = (pool) => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const teams = [];
    for (let i = 0; i < shuffled.length; i += teamSize) {
      const chunk = shuffled.slice(i, i + teamSize);
      if (chunk.length === teamSize) teams.push(chunk.map(p => p.id));
    }
    return teams;
  };

  const generateBalanced = (pool) => {
    // Sort by level score descending, then snake draft into teams
    const sorted = [...pool].sort((a, b) =>
      (levelScore[b.level] || 1) - (levelScore[a.level] || 1)
    );
    const numTeams = Math.floor(sorted.length / teamSize);
    const teams = Array.from({ length: numTeams }, () => []);
    sorted.forEach((p, i) => {
      const row = Math.floor(i / numTeams);
      const col = row % 2 === 0 ? i % numTeams : numTeams - 1 - (i % numTeams); // snake
      if (teams[col] && teams[col].length < teamSize) teams[col].push(p.id);
    });
    return teams.filter(t => t.length === teamSize);
  };

  const proposeTeams = () => {
    const pool = availablePlayers;
    if (pool.length < teamSize) return;
    const groups = autoMode === "random" ? generateRandom(pool) : generateBalanced(pool);
    setProposedTeams(groups.map((pIds, i) => ({
      id: uid(),
      name: "Equipo " + (tournament.teams.length + i + 1),
      players: pIds,
      wins: 0, losses: 0, points: 0,
    })));
  };

  const confirmProposed = () => {
    if (!proposedTeams) return;
    setTournaments(prev => prev.map(tour =>
      tour.id !== tournament.id ? tour : { ...tour, teams: [...tour.teams, ...proposedTeams] }
    ));
    setProposedTeams(null);
    setShowAutoModal(false);
  };

  // Invite player to tournament
  const [showInvite, setShowInvite] = useState(false);
  const uninvited = players.filter(p => !tournament.invitedPlayers.includes(p.id));

  const invitePlayer = (pid) => {
    setTournaments(prev => prev.map(tour =>
      tour.id !== tournament.id ? tour : { ...tour, invitedPlayers: [...tour.invitedPlayers, pid] }
    ));
  };

  const removeInvite = (pid) => {
    // Only remove if not part of any team
    const inTeam = tournament.teams.some(tm => tm.players.includes(pid));
    if (inTeam) return;
    setTournaments(prev => prev.map(tour =>
      tour.id !== tournament.id ? tour : { ...tour, invitedPlayers: tour.invitedPlayers.filter(id => id !== pid) }
    ));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: G.ocean, letterSpacing: 2 }}>
          🤝 EQUIPOS
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => setShowInvite(true)} variant="secondary" size="sm">+ Jugadores</Btn>
          <Btn onClick={() => { setShowAutoModal(true); setProposedTeams(null); }} variant="secondary" size="sm"
            disabled={availablePlayers.length < teamSize}>
            ⚡ Auto
          </Btn>
          <Btn onClick={() => setShowModal(true)} variant="sun" size="sm"
            disabled={invitedPlayers.length < teamSize}>
            + Equipo
          </Btn>
        </div>
      </div>

      {/* Invited players chips */}
      {invitedPlayers.length > 0 && (
        <Card style={{ marginBottom: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Jugadores invitados ({invitedPlayers.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {invitedPlayers.map(p => {
              const inTeam = tournament.teams.some(tm => tm.players.includes(p.id));
              return (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: inTeam ? G.ocean + "18" : G.sand,
                  borderRadius: 20, padding: "5px 12px",
                  fontSize: 13, fontWeight: inTeam ? 700 : 400,
                  color: inTeam ? G.ocean : G.text,
                }}>
                  <span style={{ fontSize: 12 }}>{levelOf(p.level).icon}</span>
                  {p.name}
                  {!inTeam && (
                    <button onClick={() => removeInvite(p.id)} style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: G.textLight, fontSize: 12, lineHeight: 1, padding: 0,
                    }}>✕</button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Teams list */}
      <div style={{ display: "grid", gap: 12 }}>
        {tournament.teams.length === 0 && (
          <Card style={{ textAlign: "center", color: G.textLight, padding: 32 }}>
            {invitedPlayers.length < teamSize
              ? `Primero invitá al menos ${teamSize} jugadores`
              : "No hay equipos aún. ¡Crea el primero!"}
          </Card>
        )}
        {tournament.teams.map((tm, i) => (
          <Card key={tm.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: i === 0 ? G.sun : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : G.sandDark,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Bebas Neue'", fontSize: 20, color: i < 3 ? G.white : G.textLight, flexShrink: 0,
            }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{tm.name}</div>
              <div style={{ fontSize: 13, color: G.textLight, marginTop: 2 }}>
                {tm.players.map(pid => players.find(p => p.id === pid)?.name || "?").join(" · ")}
              </div>
              <div style={{ fontSize: 12, color: G.textLight }}>{tm.wins}V – {tm.losses}D</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: G.ocean, lineHeight: 1 }}>{tm.points}</div>
              <div style={{ fontSize: 11, color: G.textLight, textTransform: "uppercase", letterSpacing: 0.5 }}>pts</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Auto team generation modal */}
      {showAutoModal && (
        <Modal title="ARMAR EQUIPOS AUTO" onClose={() => { setShowAutoModal(false); setProposedTeams(null); }}>
          <div style={{ display: "grid", gap: 16 }}>

            {!proposedTeams ? (
              <>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Método
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[
                      { id: "random",   icon: "🎲", label: "Al azar",   desc: "Distribución aleatoria" },
                      { id: "balanced", icon: "⚖️", label: "Por nivel", desc: "Equipos equilibrados" },
                    ].map(m => (
                      <button key={m.id} onClick={() => setAutoMode(m.id)} style={{
                        flex: 1, padding: "14px 10px", borderRadius: 12, border: "2px solid",
                        borderColor: autoMode === m.id ? G.ocean : G.sandDark,
                        background: autoMode === m.id ? G.ocean + "11" : G.white,
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                        textAlign: "center", transition: "all 0.15s",
                      }}>
                        <div style={{ fontSize: 26, marginBottom: 4 }}>{m.icon}</div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: autoMode === m.id ? G.ocean : G.text }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: G.textLight, marginTop: 2 }}>{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: G.sand, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8 }}>
                    Jugadores disponibles ({availablePlayers.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {availablePlayers.map(p => (
                      <span key={p.id} style={{
                        background: G.white, borderRadius: 20, padding: "4px 10px",
                        fontSize: 12, display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <span>{levelOf(p.level).icon}</span>{p.name}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: G.textLight, marginTop: 8 }}>
                    Se formarán {Math.floor(availablePlayers.length / teamSize)} equipos de {teamSize}
                    {availablePlayers.length % teamSize > 0 && ` (sobran ${availablePlayers.length % teamSize} jugadores)`}
                  </div>
                </div>

                <Btn onClick={proposeTeams} variant="sun" size="lg"
                  disabled={availablePlayers.length < teamSize}>
                  {autoMode === "random" ? "🎲 Generar al azar" : "⚖️ Generar por nivel"}
                </Btn>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, color: G.textLight, textAlign: "center" }}>
                  Propuesta de equipos — confirmá o regenerá
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {proposedTeams.map((tm, i) => (
                    <div key={tm.id} style={{ background: G.sand, borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: G.ocean, marginBottom: 6 }}>
                        {tm.name}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {tm.players.map(pid => {
                          const pl = players.find(p => p.id === pid);
                          return pl ? (
                            <span key={pid} style={{
                              background: G.white, borderRadius: 20, padding: "4px 10px",
                              fontSize: 13, display: "flex", alignItems: "center", gap: 4,
                            }}>
                              <span>{levelOf(pl.level).icon}</span>{pl.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Btn onClick={proposeTeams} variant="secondary">🔄 Regenerar</Btn>
                  <Btn onClick={confirmProposed} variant="sun">✓ Confirmar</Btn>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Invite modal */}
      {showInvite && (
        <Modal title="INVITAR JUGADORES" onClose={() => setShowInvite(false)}>
          <div style={{ display: "grid", gap: 10 }}>
            {uninvited.length === 0 && (
              <div style={{ textAlign: "center", color: G.textLight, padding: 20 }}>
                Todos los jugadores ya están invitados
              </div>
            )}
            {uninvited.map(p => (
              <div key={p.id} onClick={() => invitePlayer(p.id)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: 12, background: G.sand, cursor: "pointer",
              }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: G.ocean, fontWeight: 700, fontSize: 20 }}>+</div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Create team modal */}
      {showModal && (
        <Modal title="NUEVO EQUIPO" onClose={() => { setShowModal(false); setTeamName(""); setSelectedPlayers([]); }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Input value={teamName} onChange={setTeamName} placeholder="Nombre del equipo" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8 }}>
                Seleccioná {teamSize} jugadores ({selectedPlayers.length}/{teamSize})
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {invitedPlayers.map(p => {
                  const sel = selectedPlayers.includes(p.id);
                  const inOtherTeam = tournament.teams.some(tm => tm.players.includes(p.id));
                  return (
                    <div key={p.id} onClick={() => !inOtherTeam && togglePlayer(p.id)} style={{
                      padding: "10px 14px", borderRadius: 10, cursor: inOtherTeam ? "not-allowed" : "pointer",
                      border: "2px solid " + (sel ? G.ocean : G.sandDark),
                      background: inOtherTeam ? G.sandDark + "44" : sel ? G.ocean + "11" : G.white,
                      fontWeight: sel ? 700 : 400, opacity: inOtherTeam ? 0.5 : 1,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{levelOf(p.level).icon}</span>{p.name}
                      </span>
                      {inOtherTeam && <span style={{ fontSize: 11, color: G.textLight }}>ya en equipo</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <Btn onClick={addTeam} variant="sun" size="lg"
              disabled={!teamName.trim() || selectedPlayers.length !== teamSize}>
              Crear equipo
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TournamentTeamsSection;
