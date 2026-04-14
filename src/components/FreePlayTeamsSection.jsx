import React, { useState } from "react";
import { G, Card, Btn, Badge, Input, Modal } from "./ui";
import { uid } from "../lib/utils";

function calcStandings(teams, games) {
  return teams.map(tm => {
    let wins = 0, losses = 0, pf = 0, pa = 0, played = 0;
    (games || [])
      .filter(g => g.played && (g.team1 === tm.id || g.team2 === tm.id))
      .forEach(g => {
        played++;
        const isT1 = g.team1 === tm.id;
        pf += isT1 ? g.score1 : g.score2;
        pa += isT1 ? g.score2 : g.score1;
        if (g.winner === tm.id) wins++; else losses++;
      });
    return { id: tm.id, name: tm.name, played, wins, losses, pf, pa, pd: pf - pa, pts: wins };
  }).sort((a, b) => b.pts - a.pts || b.pd - a.pd || b.pf - a.pf);
}

const FP_LEGEND = [
  { key: "P",   label: "Matches played" },
  { key: "W",   label: "Wins" },
  { key: "L",   label: "Losses" },
  { key: "PD",  label: "Point Difference (sets for − sets against)" },
  { key: "PTS", label: "Points  ·  Win = 1  ·  Loss = 0" },
];

function StandingsTable({ rows }) {
  const [showLegend, setShowLegend] = useState(false);
  const cols = ["#", "Team", "P", "W", "L", "PD", "PTS"];
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <button onClick={() => setShowLegend(true)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: G.textLight, fontSize: 12, padding: "2px 6px",
          fontFamily: "'DM Sans', sans-serif",
        }}>ℹ️ key</button>
      </div>
      {showLegend && (
        <Modal title="STANDINGS GUIDE" onClose={() => setShowLegend(false)}>
          <div style={{ display: "grid", gap: 0 }}>
            {FP_LEGEND.map(({ key, label }, i) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 0",
                borderBottom: i < FP_LEGEND.length - 1 ? "1px solid " + G.sandDark : "none",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: G.ocean,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Bebas Neue'", fontSize: 13, color: G.white, letterSpacing: 1, flexShrink: 0,
                }}>{key}</div>
                <span style={{ fontSize: 14, color: G.text }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 16, padding: "12px 14px",
            background: G.ocean + "12", borderRadius: 10, borderLeft: "3px solid " + G.ocean,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.ocean, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
              Tiebreaker order
            </div>
            <div style={{ fontSize: 13, color: G.text }}>PTS → PD → PF</div>
          </div>
        </Modal>
      )}
      <div style={{
        display: "grid", gridTemplateColumns: "28px 1fr 28px 28px 28px 36px 40px",
        gap: 4, fontSize: 10, fontWeight: 700, color: G.textLight, textTransform: "uppercase",
        letterSpacing: 0.5, paddingBottom: 6, borderBottom: "1px solid " + G.sandDark, marginBottom: 4,
      }}>
        {cols.map(c => <span key={c} style={{ textAlign: c === "Team" ? "left" : "center" }}>{c}</span>)}
      </div>
      {rows.map((row, rank) => (
        <div key={row.id} style={{
          display: "grid", gridTemplateColumns: "28px 1fr 28px 28px 28px 36px 40px",
          gap: 4, alignItems: "center", padding: "7px 0",
          borderBottom: rank < rows.length - 1 ? "1px solid " + G.sandDark : "none",
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: rank === 0 ? G.sun : G.textLight }}>
            {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : rank + 1}
          </span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</span>
          {[row.played, row.wins, row.losses, row.pd, row.pts].map((val, ci) => (
            <span key={ci} style={{
              textAlign: "center", fontSize: 13,
              fontWeight: ci === 4 ? 700 : 400,
              color: ci === 4 ? G.ocean : ci === 3 ? (val > 0 ? G.success : val < 0 ? G.danger : G.text) : G.text,
            }}>{val}</span>
          ))}
        </div>
      ))}
    </>
  );
}

export default function FreePlayTeamsSection({ freePlay, setFreePlays, players }) {
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [pickedPlayerIds, setPickedPlayerIds] = useState([]);

  const teams    = freePlay.teams || [];
  const games    = freePlay.games || [];
  const hasGames = games.some(g => g.played);
  const standings = calcStandings(teams, games);

  const togglePlayer = (pid) =>
    setPickedPlayerIds(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]);

  const createTeam = () => {
    if (!newTeamName.trim()) return;
    const newTeam = { id: uid(), name: newTeamName.trim(), players: pickedPlayerIds };
    setFreePlays(prev => prev.map(fp =>
      fp.id !== freePlay.id ? fp : { ...fp, teams: [...fp.teams, newTeam] }
    ));
    setNewTeamName(""); setPickedPlayerIds([]); setShowNewTeam(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: G.ocean, letterSpacing: 2 }}>
          {hasGames ? "STANDINGS" : "TEAMS"}
        </h1>
        <Btn onClick={() => setShowNewTeam(true)} variant="sun">+ New Team</Btn>
      </div>

      {hasGames && standings.length > 0 && (
        <Card style={{ marginBottom: 16, overflowX: "auto" }}>
          <StandingsTable rows={standings} />
        </Card>
      )}

      {teams.length === 0 ? (
        <Card style={{ textAlign: "center", color: G.textLight, padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🤝</div>
          No teams yet. Create the first one!
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {teams.map(team => {
            const stat = standings.find(s => s.id === team.id);
            const rank = stat ? standings.indexOf(stat) + 1 : null;
            return (
              <Card key={team.id} style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {rank && hasGames && (
                      <span style={{ fontWeight: 700, fontSize: 18 }}>
                        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                      </span>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{team.name}</div>
                      <div style={{ fontSize: 12, color: G.textLight }}>
                        {(team.players || []).map(pid => players.find(p => p.id === pid)?.name || pid).join(" · ") || "No players assigned"}
                      </div>
                    </div>
                  </div>
                  {stat && stat.played > 0 && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <Badge color={G.success}>{stat.wins}W</Badge>
                      <Badge color={G.danger}>{stat.losses}L</Badge>
                      <Badge color={G.ocean}>{stat.pts}pts</Badge>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showNewTeam && (
        <Modal title="NEW TEAM" onClose={() => { setShowNewTeam(false); setNewTeamName(""); setPickedPlayerIds([]); }}>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Team Name
              </div>
              <Input value={newTeamName} onChange={setNewTeamName} placeholder="e.g. Team Alpha" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Players (same player can be on multiple teams)
              </div>
              {players.length === 0 ? (
                <div style={{ color: G.textLight, fontSize: 13 }}>No global players yet. Add from Players tab.</div>
              ) : (
                <div style={{ display: "grid", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                  {players.map(p => {
                    const picked = pickedPlayerIds.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => togglePlayer(p.id)} style={{
                        padding: "10px 14px", borderRadius: 10, border: "2px solid",
                        borderColor: picked ? G.ocean : G.sandDark,
                        background: picked ? G.ocean + "11" : G.white,
                        cursor: "pointer", textAlign: "left", width: "100%",
                        fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span style={{ fontSize: 16 }}>{picked ? "✅" : "⬜"}</span>
                        <span style={{ fontWeight: picked ? 700 : 400, color: picked ? G.ocean : G.text }}>{p.name}</span>
                        <span style={{ fontSize: 11, color: G.textLight, marginLeft: "auto" }}>{p.level}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {pickedPlayerIds.length > 0 && (
                <div style={{ fontSize: 12, color: G.ocean, marginTop: 6, fontWeight: 600 }}>
                  {pickedPlayerIds.length} player{pickedPlayerIds.length !== 1 ? "s" : ""} selected
                </div>
              )}
            </div>
            <Btn onClick={createTeam} variant="primary" size="lg" disabled={!newTeamName.trim()}>
              Create Team
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
