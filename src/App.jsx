import React, { useState } from "react";
import { G, globalStyle } from "./components/ui";
import { LangCtx, TR } from "./lib/i18n";
import PlayersSection from "./components/PlayersSection";
import TournamentsSection from "./components/TournamentsSection";
import TournamentMatchesSection from "./components/TournamentMatchesSection";
import TournamentTeamsSection from "./components/TournamentTeamsSection";
import LiveScoreSection from "./components/LiveScoreSection";

const initialPlayers = [
  { id: "p1", name: "Matías Torres",    wins: 12, losses: 3, points: 240, level: "advanced" },
  { id: "p2", name: "Camila Rodríguez", wins: 10, losses: 4, points: 204, level: "advanced" },
  { id: "p3", name: "Bruno Fernández",  wins: 9,  losses: 5, points: 186, level: "intermediate" },
  { id: "p4", name: "Valentina López",  wins: 8,  losses: 4, points: 172, level: "intermediate" },
  { id: "p5", name: "Diego Pérez",      wins: 7,  losses: 6, points: 148, level: "beginner" },
  { id: "p6", name: "Sofía García",     wins: 6,  losses: 7, points: 126, level: "beginner" },
];

const initialTournaments = [];

// Global nav (no active tournament)
const GLOBAL_NAV = [
  { id: "live",        icon: "🏐", label: "LIVE" },
  { id: "tournaments", icon: "🏆", label: "TOURNAMENTS" },
  { id: "players",     icon: "👤", label: "PLAYERS" },
];

// Contextual nav (inside a tournament)
const TOUR_NAV = [
  { id: "tour_live",    icon: "🏐", label: "LIVE" },
  { id: "tour_matches", icon: "🏆", label: "SCHEDULE" },
  { id: "tour_teams",   icon: "🤝", label: "TEAMS" },
  { id: "tour_players", icon: "👤", label: "PLAYERS" },
];

export default function App() {
  const [tab, setTab] = useState("tournaments");
  const [players, setPlayers] = useState(initialPlayers);
  const [tournaments, setTournaments] = useState(initialTournaments);

  const [activeTournamentId, setActiveTournamentId] = useState(null);
  const [tourTab, setTourTab] = useState("tour_matches");
  const [activeMatchId, setActiveMatchId] = useState(null);

  const r = (k) => TR[k] || k;

  const activeTournament = tournaments.find(tour => tour.id === activeTournamentId) || null;

  const openTournament = (id) => {
    setActiveTournamentId(id);
    setTourTab("tour_matches");
    setActiveMatchId(null);
  };

  const openLiveMatch = (matchId) => {
    setActiveMatchId(matchId);
    setTourTab("tour_live");
  };

  const closeTournament = () => {
    setActiveTournamentId(null);
    setTab("tournaments");
  };

  const inTournament = !!activeTournament;
  const tourCompleted = activeTournament?.status === "completed";
  const currentNav = inTournament
    ? (tourCompleted ? TOUR_NAV.filter(n => n.id !== "tour_live") : TOUR_NAV)
    : GLOBAL_NAV;
  const currentTab = inTournament ? tourTab : tab;
  const setCurrentTab = inTournament ? setTourTab : setTab;

  return (
    <LangCtx.Provider value={{ t: r }}>
      <style>{globalStyle}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg," + G.ocean + "," + G.oceanDark + ")",
        padding: "14px 16px 12px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        {inTournament && (
          <button onClick={closeTournament} style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
            padding: "6px 10px", cursor: "pointer", color: G.white,
            fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16,
          }}>←</button>
        )}
        <div style={{ flex: 1 }}>
          {inTournament ? (
            <>
              <div style={{ fontSize: 10, color: G.sky, letterSpacing: 1, textTransform: "uppercase" }}>TOURNAMENT</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: G.white, letterSpacing: 1, lineHeight: 1 }}>
                {activeTournament.name}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: G.white, letterSpacing: 2, lineHeight: 1 }}>
                ARENIX
              </div>
              <div style={{ fontSize: 10, color: G.sky, letterSpacing: 2, textTransform: "uppercase" }}>
                {r("subtitle")}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px 100px", maxWidth: 600, margin: "0 auto" }}>
        {!inTournament && tab === "live" && (
          <LiveScoreSection teams={[]} players={players} informalMode />
        )}
        {!inTournament && tab === "tournaments" && (
          <TournamentsSection
            tournaments={tournaments} setTournaments={setTournaments}
            players={players} setPlayers={setPlayers}
            onOpenTournament={openTournament}
          />
        )}
        {!inTournament && tab === "players" && (
          <PlayersSection players={players} setPlayers={setPlayers} />
        )}

        {inTournament && tourTab === "tour_matches" && (
          <TournamentMatchesSection
            tournament={activeTournament}
            setTournaments={setTournaments}
            players={players}
            onOpenLive={openLiveMatch}
          />
        )}
        {inTournament && tourTab === "tour_teams" && (
          <TournamentTeamsSection
            tournament={activeTournament}
            setTournaments={setTournaments}
            players={players}
          />
        )}
        {inTournament && tourTab === "tour_players" && (
          <PlayersSection players={players} setPlayers={setPlayers} contextual />
        )}
        {inTournament && tourTab === "tour_live" && (
          <LiveScoreSection
            teams={activeTournament.teams}
            players={players}
            setsPerMatch={activeTournament.setsPerMatch}
            preloadMatchId={activeMatchId}
            tournamentMatches={activeTournament.matches}
            onSaveResult={(matchId, score1, score2, winnerTeamId) => {
              setTournaments(prev => prev.map(tour => {
                if (tour.id !== activeTournamentId) return tour;
                const matches = tour.matches.map(m =>
                  m.id !== matchId ? m : { ...m, played: true, winner: winnerTeamId, score1, score2 }
                );
                const teams = tour.teams.map(tm => {
                  if (tm.id === winnerTeamId) return { ...tm, wins: tm.wins + 1, points: tm.points + 20 };
                  const inMatch = tour.matches.find(mx => mx.id === matchId);
                  if (inMatch && (tm.id === inMatch.team1 || tm.id === inMatch.team2))
                    return { ...tm, losses: tm.losses + 1, points: tm.points + 5 };
                  return tm;
                });
                const allPlayed = matches.every(m => m.played);
                const winnerIds = tour.teams.map(tm => tm.id);
                const wins = {};
                winnerIds.forEach(id => wins[id] = 0);
                matches.forEach(m => { if (m.winner) wins[m.winner] = (wins[m.winner] || 0) + 1; });
                const tourWinner = allPlayed ? Object.entries(wins).sort((a, b) => b[1] - a[1])[0]?.[0] : null;
                return { ...tour, matches, teams, status: allPlayed ? "completed" : "active", winner: tourWinner };
              }));
              setActiveMatchId(null);
              setTourTab("tour_matches");
            }}
          />
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: G.white, borderTop: "2px solid " + G.sandDark,
        display: "flex", justifyContent: "space-around",
        padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
      }}>
        {currentNav.map((n) => (
          <button key={n.id} onClick={() => setCurrentTab(n.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "6px 12px", borderRadius: 12, transition: "all 0.15s",
          }}>
            <div style={{ fontSize: 22 }}>{n.icon}</div>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
              color: currentTab === n.id ? G.ocean : G.textLight,
              textTransform: "uppercase",
            }}>{n.label}</div>
            {currentTab === n.id && (
              <div style={{ width: 20, height: 3, background: G.ocean, borderRadius: 2 }} />
            )}
          </button>
        ))}
      </div>
    </LangCtx.Provider>
  );
}
