import React, { useState } from "react";
import { G, Card, Btn, Badge, Input, Modal } from "./ui";
import { uid, now } from "../lib/utils";

const TournamentsSection = ({ tournaments, setTournaments, players, setPlayers, onOpenTournament }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(now());
  const [teamSize, setTeamSize] = useState(2);
  const [setsPerMatch, setSetsPerMatch] = useState(1);

  const createTournament = () => {
    if (!name.trim()) return;
    const newT = {
      id: uid(),
      name: name.trim(),
      date,
      teamSize,       // 2 or 3 players per team
      setsPerMatch,   // 1, 3 or 5
      status: "active",
      invitedPlayers: [], // player ids invited to this tournament
      teams: [],          // teams created within this tournament
      matches: [],
      winner: null,
    };
    setTournaments(prev => [...prev, newT]);
    setName(""); setShowCreate(false);
    onOpenTournament(newT.id);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color: G.ocean, letterSpacing: 2 }}>
          🏆 TOURNAMENTS
        </h1>
        <Btn onClick={() => setShowCreate(true)} variant="sun">+ Create</Btn>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {tournaments.length === 0 && (
          <Card style={{ textAlign: "center", color: G.textLight, padding: 40 }}>
            No tournaments yet. Create the first one!
          </Card>
        )}
        {[...tournaments].reverse().map(tour => (
          <Card key={tour.id} style={{ cursor: "pointer" }} onClick={() => onOpenTournament(tour.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{tour.name}</div>
                <div style={{ fontSize: 13, color: G.textLight, marginTop: 3 }}>
                  {tour.date} · {tour.teamSize} players/team · {tour.teams.length} teams · {tour.setsPerMatch === 1 ? "1 set" : tour.setsPerMatch + " sets"}
                </div>
                {tour.winner && (
                  <div style={{ marginTop: 8 }}>
                    <Badge color={G.sun}>🥇 {tour.teams.find(tm => tm.id === tour.winner)?.name || "?"}</Badge>
                  </div>
                )}
              </div>
              <Badge color={tour.status === "completed" ? G.success : G.warn}>
                {tour.status === "completed" ? "Completed" : "In progress"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {showCreate && (
        <Modal title="NEW TOURNAMENT" onClose={() => setShowCreate(false)}>
          <div style={{ display: "grid", gap: 16 }}>
            <Input value={name} onChange={setName} placeholder="Tournament name" />
            <Input value={date} onChange={setDate} placeholder="Date (dd/mm/yyyy)" />

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Players per team
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[2, 3].map(n => (
                  <button key={n} onClick={() => setTeamSize(n)} style={{
                    flex: 1, padding: "12px", borderRadius: 12, border: "2px solid",
                    borderColor: teamSize === n ? G.ocean : G.sandDark,
                    background: teamSize === n ? G.ocean + "11" : G.white,
                    fontWeight: teamSize === n ? 700 : 400,
                    fontSize: 15, cursor: "pointer", color: G.text,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {n} players
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Sets per match
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[1, 3, 5].map(n => (
                  <button key={n} onClick={() => setSetsPerMatch(n)} style={{
                    flex: 1, padding: "12px", borderRadius: 12, border: "2px solid",
                    borderColor: setsPerMatch === n ? G.ocean : G.sandDark,
                    background: setsPerMatch === n ? G.ocean + "11" : G.white,
                    fontWeight: setsPerMatch === n ? 700 : 400,
                    fontSize: 15, cursor: "pointer", color: G.text,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {n === 1 ? "1 set" : n + " sets"}
                  </button>
                ))}
              </div>
            </div>

            <Btn onClick={createTournament} variant="sun" size="lg" disabled={!name.trim()}>
              Create tournament
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TournamentsSection;
