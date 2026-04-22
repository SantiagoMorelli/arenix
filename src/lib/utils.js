export const uid = () => Math.random().toString(36).slice(2, 8);

export const now = () => new Date().toLocaleDateString("en-US");

export const LEVELS = [
  { id: "beginner",     label: "Beginner",     color: "#2ECC71", icon: "🟢" },
  { id: "intermediate", label: "Intermediate", color: "#F39C12", icon: "🟡" },
  { id: "advanced",     label: "Advanced",     color: "#E74C3C", icon: "🔴" },
];

export const levelOf = (id) => LEVELS.find(l => l.id === id) || LEVELS[0];

/**
 * Circle Method for Round-Robin scheduling to maximize rest between matches.
 * Generates matches round by round (e.g. 1v2, 3v4) to naturally interleave games.
 */
export function generateRoundRobinSchedule(teamIds, prefix = "") {
  if (teamIds.length < 2) return [];

  // Clone to avoid mutating original, add 'Bye' if odd number of teams
  const t = [...teamIds];
  if (t.length % 2 !== 0) t.push(null);
  
  const n = t.length;
  const roundsCount = n - 1;
  const matchesPerRound = n / 2;
  const schedule = [];
  
  // Track the last team that played to avoid back-to-backs across rounds if possible
  let lastPlayedTeam1 = null;
  let lastPlayedTeam2 = null;

  for (let r = 0; r < roundsCount; r++) {
    const roundMatches = [];
    for (let m = 0; m < matchesPerRound; m++) {
      // For the first team, alternate home/away based on round to balance it
      let home, away;
      if (m === 0 && r % 2 === 1) {
        home = t[n - 1];
        away = t[0];
      } else {
        home = t[m];
        away = t[n - 1 - m];
      }
      
      // If not playing a Bye
      if (home !== null && away !== null) {
        roundMatches.push({
          id: prefix + uid(),
          team1: home,
          team2: away,
          played: false,
          winner: null,
          score1: 0,
          score2: 0,
        });
      }
    }

    // Shuffle the match order within the round randomly to prevent pattern predictability 
    // AND prevent back-to-backs if possible
    if (roundMatches.length > 1) {
      // Put the match that DOES NOT contain lastPlayed teams at the front
      const safeFirstMatchIndex = roundMatches.findIndex(m => 
        m.team1 !== lastPlayedTeam1 && m.team1 !== lastPlayedTeam2 &&
        m.team2 !== lastPlayedTeam1 && m.team2 !== lastPlayedTeam2
      );

      if (safeFirstMatchIndex > 0) {
        // Swap to make it the first match of the round
        const temp = roundMatches[0];
        roundMatches[0] = roundMatches[safeFirstMatchIndex];
        roundMatches[safeFirstMatchIndex] = temp;
      }
    }

    if (roundMatches.length > 0) {
      lastPlayedTeam1 = roundMatches[roundMatches.length - 1].team1;
      lastPlayedTeam2 = roundMatches[roundMatches.length - 1].team2;
    }

    schedule.push(...roundMatches);
    
    // Rotate teams: fix the first team, rotate the rest clockwise
    t.splice(1, 0, t.pop());
  }

  return schedule;
}

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
