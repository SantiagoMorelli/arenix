export const uid = () => Math.random().toString(36).slice(2, 8);

export const now = () => new Date().toLocaleDateString("en-US");

export const LEVELS = [
  { id: "beginner",     label: "Beginner",     color: "#2ECC71", icon: "🟢" },
  { id: "intermediate", label: "Intermediate", color: "#F39C12", icon: "🟡" },
  { id: "advanced",     label: "Advanced",     color: "#E74C3C", icon: "🔴" },
];

export const levelOf = (id) => LEVELS.find(l => l.id === id) || LEVELS[0];

// ── Match Results & Knockout Logic (Shared between Old and New App) ──────────

export function advanceKnockout(knockout, teams) {
  const rounds = knockout.rounds.map(r => ({ ...r, matches: r.matches.map(m => ({ ...m })) }));

  for (let ri = 0; ri < rounds.length; ri++) {
    const round = rounds[ri];
    if (round.id === "third_place" || round.id === "final") continue;
    const nextRound = rounds[ri + 1];
    if (!nextRound) continue;

    round.matches.forEach((m, mi) => {
      if (!m.played || !m.winner) return;
      const loser = m.winner === m.team1 ? m.team2 : m.team1;
      const nextMatchIdx  = Math.floor(mi / 2);
      const isFirstOfPair = mi % 2 === 0;
      if (nextRound.matches[nextMatchIdx]) {
        if (isFirstOfPair) nextRound.matches[nextMatchIdx] = { ...nextRound.matches[nextMatchIdx], team1: m.winner };
        else               nextRound.matches[nextMatchIdx] = { ...nextRound.matches[nextMatchIdx], team2: m.winner };
      }
      if (round.id === "semi") {
        const tp = rounds.find(r => r.id === "third_place");
        if (tp) {
          if (mi === 0) tp.matches[0] = { ...tp.matches[0], team1: loser };
          if (mi === 1) tp.matches[0] = { ...tp.matches[0], team2: loser };
        }
      }
    });

    if (nextRound.id === "final") {
      const semis = round.matches;
      if (semis[0]?.played && semis[1]?.played) {
        const fr = rounds.find(r => r.id === "final");
        if (fr) fr.matches[0] = { ...fr.matches[0], team1: semis[0].winner, team2: semis[1].winner };
      }
    }
  }

  return { ...knockout, rounds };
}

export function saveMatchResult(tour, matchId, score1, score2, winnerTeamId, log = null, sets = null) {
  const updated = { ...tour };

  if (updated.groups) {
    updated.groups = updated.groups.map(g => {
      if (!g.matches.find(m => m.id === matchId)) return g;
      return {
        ...g,
        matches: g.matches.map(m =>
          m.id !== matchId ? m : { ...m, played: true, winner: winnerTeamId, score1, score2, log, sets }
        ),
      };
    });
  }

  if (updated.knockout) {
    const rounds = updated.knockout.rounds.map(r => {
      if (!r.matches.find(m => m.id === matchId)) return r;
      return {
        ...r,
        matches: r.matches.map(m =>
          m.id !== matchId ? m : { ...m, played: true, winner: winnerTeamId, score1, score2, log, sets }
        ),
      };
    });
    updated.knockout = advanceKnockout({ ...updated.knockout, rounds }, updated.teams);
    const finalRound = updated.knockout.rounds.find(r => r.id === "final");
    if (finalRound?.matches[0]?.played) {
      updated.phase  = "completed";
      updated.status = "completed";
      updated.winner = finalRound.matches[0].winner;
    }
  }

  if (updated.matches) {
    if (updated.matches.find(m => m.id === matchId)) {
      updated.matches = updated.matches.map(m =>
        m.id !== matchId ? m : { ...m, played: true, winner: winnerTeamId, score1, score2, log, sets }
      );
    }
  }

  return updated;
}
