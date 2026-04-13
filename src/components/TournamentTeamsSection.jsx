import React, { useState } from "react";
import { G, Card, Btn, Input, Modal } from "./ui";
import { uid, LEVELS, levelOf } from "../lib/utils";

// ── Knockout depth: how far a team went in the bracket ───────────────────────
// Higher weight = further round reached.
const ROUND_WEIGHT = { r16: 1, qf: 2, semi: 3, third_place: 4, final: 5 };

// PTS: Win=1 + position bonus for top-4 finish + round bonus for depth reached
const POSITION_BONUS = { 1: 12, 2: 8, 3: 5, 4: 3 }; // 1st–4th place
const ROUND_BONUS    = { 2: 2, 1: 1 };                // QF reached = +2, R16 = +1

function getKnockoutPositions(tournament) {
  const pos = {};
  const rounds = tournament.knockout?.rounds || [];

  const finalM = rounds.find(r => r.id === "final")?.matches[0];
  if (finalM?.played && finalM.winner) {
    const loser = finalM.winner === finalM.team1 ? finalM.team2 : finalM.team1;
    pos[finalM.winner] = 1;
    if (loser) pos[loser] = 2;
  }

  const thirdM = rounds.find(r => r.id === "third_place")?.matches[0];
  if (thirdM?.played && thirdM.winner) {
    const loser = thirdM.winner === thirdM.team1 ? thirdM.team2 : thirdM.team1;
    pos[thirdM.winner] = 3;
    if (loser) pos[loser] = 4;
  }

  return pos;
}

// For each team, the highest knockout round weight they participated in
function getKnockoutDepth(tournament) {
  const depth = {};
  (tournament.knockout?.rounds || []).forEach(round => {
    const w = ROUND_WEIGHT[round.id] || 0;
    round.matches.forEach(m => {
      if (m.team1) depth[m.team1] = Math.max(depth[m.team1] || 0, w);
      if (m.team2) depth[m.team2] = Math.max(depth[m.team2] || 0, w);
    });
  });
  return depth;
}

// ── Compute live team stats from all played matches ──────────────────────────
function calcAllTeamStats(tournament) {
  const allMatches = [
    ...(tournament.groups || []).flatMap(g => g.matches || []),
    ...(tournament.knockout?.rounds || []).flatMap(r => r.matches || []),
    ...(tournament.matches || []),
  ];

  const koPos   = getKnockoutPositions(tournament);
  const koDepth = getKnockoutDepth(tournament);

  const teams = tournament.teams.map(tm => {
    let wins = 0, losses = 0, pf = 0, pa = 0;
    allMatches
      .filter(m => m.played && (m.team1 === tm.id || m.team2 === tm.id))
      .forEach(m => {
        const isT1 = m.team1 === tm.id;
        const scored   = isT1 ? m.score1 : m.score2;
        const conceded = isT1 ? m.score2 : m.score1;
        pf += scored; pa += conceded;
        if (scored > conceded) wins++; else losses++;
      });
    const kp    = koPos[tm.id]   || null;
    const depth = koDepth[tm.id] || 0;
    // PTS = wins (W=1) + position bonus (top 4) + round bonus (QF/R16 depth)
    const pts = wins + (POSITION_BONUS[kp] || ROUND_BONUS[depth] || 0);
    return { ...tm, wins, losses, pf, pa, pd: pf - pa, kp, depth, pts };
  });

  // Sort priority:
  // 1. Known final positions (1–4)
  // 2. Knockout depth — semi > QF > R16 > group only
  // 3. Wins → PD → PF tiebreaker
  teams.sort((a, b) => {
    if (a.kp && b.kp) return a.kp - b.kp;
    if (a.kp) return -1;
    if (b.kp) return 1;
    if (b.depth !== a.depth) return b.depth - a.depth;
    return b.wins - a.wins || b.pd - a.pd || b.pf - a.pf;
  });

  // Attach final rank index (1-based) after sort
  return teams.map((tm, i) => ({ ...tm, rank: i + 1 }));
}

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
      name: "Team " + (tournament.teams.length + i + 1),
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

  const sortedTeams = calcAllTeamStats(tournament);
  const anyPlayed = sortedTeams.some(tm => tm.wins + tm.losses > 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: G.ocean, letterSpacing: 2, lineHeight: 1 }}>
            {anyPlayed ? "📊 STANDINGS" : "🤝 TEAMS"}
          </h1>
          {anyPlayed && (
            <div style={{ fontSize: 11, color: G.textLight, letterSpacing: 0.3, marginTop: 2 }}>
              PTS = W + position bonus · 1st+12 · 2nd+8 · 3rd+5 · 4th+3
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => setShowInvite(true)} variant="secondary" size="sm">+ Players</Btn>
          <Btn onClick={() => { setShowAutoModal(true); setProposedTeams(null); }} variant="secondary" size="sm"
            disabled={availablePlayers.length < teamSize}>
            ⚡ Auto
          </Btn>
          <Btn onClick={() => setShowModal(true)} variant="sun" size="sm"
            disabled={invitedPlayers.length < teamSize}>
            + Team
          </Btn>
        </div>
      </div>

      {/* Invited players chips */}
      {invitedPlayers.length > 0 && (
        <Card style={{ marginBottom: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Invited players ({invitedPlayers.length})
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

      {/* Teams list — sorted by live performance */}
      <div style={{ display: "grid", gap: 12 }}>
        {sortedTeams.length === 0 && (
          <Card style={{ textAlign: "center", color: G.textLight, padding: 32 }}>
            {invitedPlayers.length < teamSize
              ? `First invite at least ${teamSize} players`
              : "No teams yet. Create the first one!"}
          </Card>
        )}
        {sortedTeams.map(tm => {
          const rankColors = { 1: "#F5C842", 2: "#C0C0C0", 3: "#CD7F32" };
          const rankBg    = rankColors[tm.rank] || G.sandDark;
          const rankColor = rankColors[tm.rank] ? G.white : G.textLight;
          const posLabels = { 1: "🥇 Champion", 2: "🥈 Runner-up", 3: "🥉 3rd place", 4: "4th place" };
          const isWinner  = tournament.winner === tm.id;
          return (
            <Card key={tm.id} style={{
              display: "flex", alignItems: "center", gap: 14,
              borderLeft: tm.rank === 1 && anyPlayed
                ? "4px solid " + (isWinner ? G.sun : G.success)
                : "none",
            }}>
              {/* Rank badge — uses computed tm.rank from sorted position */}
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: rankBg, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Bebas Neue'", fontSize: 20, color: rankColor,
              }}>{tm.rank}</div>

              {/* Name + players + stats */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: G.text }}>{tm.name}</span>
                </div>
                <div style={{ fontSize: 12, color: G.textLight, marginTop: 1 }}>
                  {tm.players.map(pid => players.find(p => p.id === pid)?.name || "?").join(" · ")}
                </div>
                {anyPlayed && (
                  <div style={{ display: "flex", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: G.success }}>{tm.wins}W</span>
                    <span style={{ fontSize: 12, color: G.danger }}>{tm.losses}L</span>
                    <span style={{ fontSize: 12, color: tm.pd > 0 ? G.success : tm.pd < 0 ? G.danger : G.textLight }}>
                      PD {tm.pd > 0 ? "+" : ""}{tm.pd}
                    </span>
                    {tm.kp && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: G.sun }}>
                        {posLabels[tm.kp]}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* PTS = W×3 + position bonus */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: G.ocean, lineHeight: 1 }}>
                  {tm.pts}
                </div>
                <div style={{ fontSize: 10, color: G.textLight, textTransform: "uppercase", letterSpacing: 0.5 }}>PTS</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Auto team generation modal */}
      {showAutoModal && (
        <Modal title="AUTO TEAMS" onClose={() => { setShowAutoModal(false); setProposedTeams(null); }}>
          <div style={{ display: "grid", gap: 16 }}>

            {!proposedTeams ? (
              <>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Method
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[
                      { id: "random",   icon: "🎲", label: "Random",   desc: "Random distribution" },
                      { id: "balanced", icon: "⚖️", label: "By level", desc: "Balanced teams" },
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
                    Available players ({availablePlayers.length})
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
                    {Math.floor(availablePlayers.length / teamSize)} teams of {teamSize} will be formed
                    {availablePlayers.length % teamSize > 0 && ` (${availablePlayers.length % teamSize} players left over)`}
                  </div>
                </div>

                <Btn onClick={proposeTeams} variant="sun" size="lg"
                  disabled={availablePlayers.length < teamSize}>
                  {autoMode === "random" ? "🎲 Random" : "⚖️ By level"}
                </Btn>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, color: G.textLight, textAlign: "center" }}>
                  Team proposal — confirm or regenerate
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
                  <Btn onClick={proposeTeams} variant="secondary">🔄 Regenerate</Btn>
                  <Btn onClick={confirmProposed} variant="sun">✓ Confirm</Btn>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Invite modal */}
      {showInvite && (
        <Modal title="INVITE PLAYERS" onClose={() => setShowInvite(false)}>
          <div style={{ display: "grid", gap: 10 }}>
            {uninvited.length === 0 && (
              <div style={{ textAlign: "center", color: G.textLight, padding: 20 }}>
                All players are already invited
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
        <Modal title="NEW TEAM" onClose={() => { setShowModal(false); setTeamName(""); setSelectedPlayers([]); }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Input value={teamName} onChange={setTeamName} placeholder="Team name" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8 }}>
                Select {teamSize} players ({selectedPlayers.length}/{teamSize})
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
                      {inOtherTeam && <span style={{ fontSize: 11, color: G.textLight }}>already in team</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <Btn onClick={addTeam} variant="sun" size="lg"
              disabled={!teamName.trim() || selectedPlayers.length !== teamSize}>
              Create team
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TournamentTeamsSection;
