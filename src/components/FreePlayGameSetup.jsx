import React, { useState } from "react";
import { G, Card, Btn } from "./ui";

export default function FreePlayGameSetup({ freePlay, onStartGame }) {
  const [team1Id, setTeam1Id] = useState("");
  const [team2Id, setTeam2Id] = useState("");
  const [setsPerMatch, setSetsPerMatch] = useState(1);

  const teams = freePlay.teams || [];
  const canStart = team1Id && team2Id && team1Id !== team2Id;

  if (teams.length < 2) {
    return (
      <div>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: G.ocean, letterSpacing: 2, marginBottom: 20 }}>
          LIVE
        </h1>
        <Card style={{ textAlign: "center", color: G.textLight, padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏐</div>
          You need at least 2 teams to play.
          <div style={{ fontSize: 13, marginTop: 8 }}>Go to the TEAMS tab to create them.</div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: G.ocean, letterSpacing: 2, marginBottom: 20 }}>
        START A GAME
      </h1>

      <Card>
        <div style={{ display: "grid", gap: 20 }}>
          {/* Team 1 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.ocean, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Team 1
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {teams.map(tm => (
                <button key={tm.id} onClick={() => setTeam1Id(tm.id)} style={{
                  padding: "11px 14px", borderRadius: 10, border: "2px solid",
                  borderColor: team1Id === tm.id ? G.ocean : G.sandDark,
                  background: team1Id === tm.id ? G.ocean + "11" : G.white,
                  cursor: "pointer", textAlign: "left", width: "100%",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <span style={{ fontWeight: 700, color: team1Id === tm.id ? G.ocean : G.text }}>{tm.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center", fontFamily: "'Bebas Neue'", fontSize: 32, color: G.sandDark, letterSpacing: 2 }}>
            VS
          </div>

          {/* Team 2 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.sun, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Team 2
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {teams.map(tm => (
                <button key={tm.id} onClick={() => setTeam2Id(tm.id)} style={{
                  padding: "11px 14px", borderRadius: 10, border: "2px solid",
                  borderColor: team2Id === tm.id ? G.sun : G.sandDark,
                  background: team2Id === tm.id ? G.sun + "22" : G.white,
                  opacity: team1Id === tm.id ? 0.35 : 1,
                  cursor: team1Id === tm.id ? "not-allowed" : "pointer",
                  textAlign: "left", width: "100%",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <span style={{ fontWeight: 700, color: team2Id === tm.id ? G.sunDark : G.text }}>{tm.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sets */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Sets per match
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 3, 5].map(n => (
                <button key={n} onClick={() => setSetsPerMatch(n)} style={{
                  flex: 1, padding: "11px", borderRadius: 10, border: "2px solid",
                  borderColor: setsPerMatch === n ? G.ocean : G.sandDark,
                  background: setsPerMatch === n ? G.ocean + "11" : G.white,
                  fontWeight: setsPerMatch === n ? 700 : 400,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: G.text,
                }}>
                  {n === 1 ? "1 set" : `Best of ${n}`}
                </button>
              ))}
            </div>
          </div>

          <Btn onClick={() => onStartGame(team1Id, team2Id, setsPerMatch)} variant="primary" size="lg" disabled={!canStart}>
            🏐 Start Game
          </Btn>
        </div>
      </Card>
    </div>
  );
}
