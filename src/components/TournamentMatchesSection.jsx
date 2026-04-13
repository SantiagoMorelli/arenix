import React from "react";
import { G, Card, Btn, Badge } from "./ui";
import GroupStageSection from "./GroupStageSection";
import KnockoutStageSection from "./KnockoutStageSection";

const TournamentMatchesSection = ({ tournament, setTournaments, players, onOpenLive }) => {
  const phase = tournament.phase || "group";
  const hasGroups = (tournament.groups || []).length > 0;

  // ── Generate groups + round-robin matches ────────────────────────────────
  const generateGroups = () => {
    if (tournament.teams.length < 2) return;
    const numGroups = tournament.numGroups || 2;
    const teams = tournament.teams;

    // Distribute teams round-robin across groups
    const groupArrays = Array.from({ length: numGroups }, (_, i) => ({
      id: "g" + i,
      name: "Group " + String.fromCharCode(65 + i), // A, B, C …
      teamIds: [],
      matches: [],
    }));
    teams.forEach((tm, idx) => {
      groupArrays[idx % numGroups].teamIds.push(tm.id);
    });

    // Round-robin matches per group
    groupArrays.forEach(g => {
      const ids = g.teamIds;
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++)
          g.matches.push({
            id: "gm_" + g.id + "_" + i + "_" + j,
            team1: ids[i], team2: ids[j],
            played: false, winner: null, score1: 0, score2: 0,
          });
    });

    setTournaments(prev => prev.map(t =>
      t.id !== tournament.id ? t : { ...t, groups: groupArrays, phase: "group" }
    ));
  };

  // ── Not enough teams ─────────────────────────────────────────────────────
  if (tournament.teams.length < 2) {
    return (
      <div>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: G.ocean, letterSpacing: 2, marginBottom: 16 }}>
          🏆 {tournament.name}
        </h1>
        <Card style={{ textAlign: "center", color: G.textLight }}>
          You need at least 2 teams to generate the schedule.
        </Card>
      </div>
    );
  }

  // ── Generate schedule prompt ─────────────────────────────────────────────
  if (!hasGroups) {
    return (
      <div>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: G.ocean, letterSpacing: 2, marginBottom: 16 }}>
          🏆 {tournament.name}
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <Badge color={G.ocean}>{tournament.teamSize} players/team</Badge>
          <Badge color={G.ocean}>{tournament.setsPerMatch === 1 ? "1 set" : tournament.setsPerMatch + " sets"}</Badge>
          <Badge color={G.ocean}>{tournament.numGroups || 2} groups</Badge>
          <Badge color={G.warn}>Not started</Badge>
        </div>
        <Btn onClick={generateGroups} variant="sun" size="lg" style={{ width: "100%" }}>
          🎯 Generate group stage
        </Btn>
      </div>
    );
  }

  // ── Champion banner (tournament completed) ───────────────────────────────
  const winnerTeam = tournament.winner
    ? tournament.teams.find(tm => tm.id === tournament.winner)
    : null;

  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: G.ocean, letterSpacing: 2, marginBottom: 12 }}>
        🏆 {tournament.name}
      </h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Badge color={G.ocean}>{tournament.teamSize} players/team</Badge>
        <Badge color={G.ocean}>{tournament.setsPerMatch === 1 ? "1 set" : tournament.setsPerMatch + " sets"}</Badge>
        <Badge color={G.ocean}>{tournament.numGroups || 2} groups</Badge>
        <Badge color={phase === "completed" ? G.success : phase === "knockout" ? G.ocean : G.warn}>
          {phase === "completed" ? "Completed" : phase === "knockout" ? "Knockout stage" : "Group stage"}
        </Badge>
      </div>

      {winnerTeam && (
        <Card style={{ background: "linear-gradient(135deg," + G.sun + "," + G.sunDark + ")", marginBottom: 16 }}>
          <div style={{ textAlign: "center", color: G.white }}>
            <div style={{ fontSize: 32 }}>🏆</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 1 }}>CHAMPION</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{winnerTeam.name}</div>
          </div>
        </Card>
      )}

      {(phase === "group") && (
        <GroupStageSection
          tournament={tournament}
          setTournaments={setTournaments}
          players={players}
          onOpenLive={onOpenLive}
        />
      )}

      {(phase === "knockout" || phase === "completed") && (
        <KnockoutStageSection
          tournament={tournament}
          setTournaments={setTournaments}
          players={players}
          onOpenLive={onOpenLive}
        />
      )}
    </div>
  );
};

export default TournamentMatchesSection;
