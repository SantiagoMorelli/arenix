/**
 * Data migration — runs synchronously at import time, before React renders.
 *
 * v1 → v2: Flatten arenix_players + arenix_tournaments into arenix_leagues.
 *
 * If arenix_leagues already exists the function is a no-op.
 * Old keys are removed after a successful write.
 */

const INITIAL_PLAYERS = [
  { id: "p1", name: "Matías Torres",    wins: 12, losses: 3, points: 240, level: "advanced" },
  { id: "p2", name: "Camila Rodríguez", wins: 10, losses: 4, points: 204, level: "advanced" },
  { id: "p3", name: "Bruno Fernández",  wins: 9,  losses: 5, points: 186, level: "intermediate" },
  { id: "p4", name: "Valentina López",  wins: 8,  losses: 4, points: 172, level: "intermediate" },
  { id: "p5", name: "Diego Pérez",      wins: 7,  losses: 6, points: 148, level: "beginner" },
  { id: "p6", name: "Sofía García",     wins: 6,  losses: 7, points: 126, level: "beginner" },
];

try {
  if (localStorage.getItem("arenix_leagues") === null) {
    const oldPlayersRaw     = localStorage.getItem("arenix_players");
    const oldTournamentsRaw = localStorage.getItem("arenix_tournaments");

    const players     = oldPlayersRaw     ? JSON.parse(oldPlayersRaw)     : INITIAL_PLAYERS;
    const tournaments = oldTournamentsRaw ? JSON.parse(oldTournamentsRaw) : [];

    localStorage.setItem("arenix_leagues", JSON.stringify([{
      id:          "league_default",
      name:        "My League",
      season:      "2026",
      createdAt:   new Date().toLocaleDateString("en-US"),
      players,
      tournaments,
    }]));

    // Clean up old keys only after the write succeeds
    localStorage.removeItem("arenix_players");
    localStorage.removeItem("arenix_tournaments");
  }
} catch {
  // localStorage unavailable (private browsing, quota) — app still works in memory
}
