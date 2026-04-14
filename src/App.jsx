import React, { useState } from "react";
import { G, globalStyle } from "./components/ui";
import { LangCtx, TR } from "./lib/i18n";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { SAVE_KEY } from "./hooks/useLiveGame";
import PlayersSection from "./components/PlayersSection";
import TournamentsSection from "./components/TournamentsSection";
import TournamentMatchesSection from "./components/TournamentMatchesSection";
import TournamentTeamsSection from "./components/TournamentTeamsSection";
import LiveScoreSection from "./components/LiveScoreSection";
import CreateMenuSection from "./components/CreateMenuSection";
import FreePlaySection from "./components/FreePlaySection";

const initialPlayers = [
  { id: "p1", name: "Matías Torres",    wins: 12, losses: 3, points: 240, level: "advanced" },
  { id: "p2", name: "Camila Rodríguez", wins: 10, losses: 4, points: 204, level: "advanced" },
  { id: "p3", name: "Bruno Fernández",  wins: 9,  losses: 5, points: 186, level: "intermediate" },
  { id: "p4", name: "Valentina López",  wins: 8,  losses: 4, points: 172, level: "intermediate" },
  { id: "p5", name: "Diego Pérez",      wins: 7,  losses: 6, points: 148, level: "beginner" },
  { id: "p6", name: "Sofía García",     wins: 6,  losses: 7, points: 126, level: "beginner" },
];

// Contextual nav (inside a tournament)
const TOUR_NAV = [
  { id: "tour_live",    icon: "🏐", label: "LIVE" },
  { id: "tour_matches", icon: "🏆", label: "SCHEDULE" },
  { id: "tour_teams",   icon: "🤝", label: "TEAMS" },
  { id: "tour_players", icon: "👤", label: "PLAYERS" },
];

// Collect all matches across group and knockout phases for live score lookup
function getAllTournamentMatches(tour) {
  const groupMatches = (tour.groups || []).flatMap(g => g.matches || []);
  const knockoutMatches = (tour.knockout?.rounds || []).flatMap(r => r.matches || []);
  return [...groupMatches, ...knockoutMatches, ...(tour.matches || [])];
}

// Apply a live-scored result to the correct location in the tournament structure
function saveLiveResult(tour, matchId, score1, score2, winnerTeamId, log, sets) {
  const updated = { ...tour };

  // Try group stage first
  const groups = (tour.groups || []).map(g => {
    const match = g.matches.find(m => m.id === matchId);
    if (!match) return g;
    return {
      ...g,
      matches: g.matches.map(m =>
        m.id !== matchId ? m : { ...m, played: true, winner: winnerTeamId, score1, score2, log: log || null, sets: sets || null }
      ),
    };
  });
  updated.groups = groups;

  // Try knockout
  if (tour.knockout) {
    const rounds = tour.knockout.rounds.map(r => {
      const match = r.matches.find(m => m.id === matchId);
      if (!match) return r;
      return {
        ...r,
        matches: r.matches.map(m =>
          m.id !== matchId ? m : { ...m, played: true, winner: winnerTeamId, score1, score2, log: log || null, sets: sets || null }
        ),
      };
    });
    updated.knockout = { ...tour.knockout, rounds };
    // Advance knockout bracket after saving
    updated.knockout = advanceKnockout(updated.knockout, updated.teams);
    // Check if final is played
    const finalRound = updated.knockout.rounds.find(r => r.id === "final");
    if (finalRound?.matches[0]?.played) {
      updated.phase = "completed";
      updated.status = "completed";
      updated.winner = finalRound.matches[0].winner;
    }
  }

  // Legacy flat matches fallback
  if ((tour.matches || []).find(m => m.id === matchId)) {
    updated.matches = tour.matches.map(m =>
      m.id !== matchId ? m : { ...m, played: true, winner: winnerTeamId, score1, score2, log: log || null, sets: sets || null }
    );
  }

  return updated;
}

// After each knockout match, propagate winners into subsequent rounds
function advanceKnockout(knockout, teams) {
  const rounds = knockout.rounds.map(r => ({ ...r, matches: r.matches.map(m => ({ ...m })) }));

  for (let ri = 0; ri < rounds.length; ri++) {
    const round = rounds[ri];
    if (round.id === "third_place" || round.id === "final") continue;
    const nextRound = rounds[ri + 1];
    if (!nextRound) continue;

    round.matches.forEach((m, mi) => {
      if (!m.played || !m.winner) return;
      const loser = m.winner === m.team1 ? m.team2 : m.team1;

      // Winners advance to next round (pairs: 0→slot0, 1→slot0; 2→slot1, 3→slot1 etc.)
      const nextMatchIdx = Math.floor(mi / 2);
      const isFirstOfPair = mi % 2 === 0;
      if (nextRound.matches[nextMatchIdx]) {
        if (isFirstOfPair) nextRound.matches[nextMatchIdx] = { ...nextRound.matches[nextMatchIdx], team1: m.winner };
        else              nextRound.matches[nextMatchIdx] = { ...nextRound.matches[nextMatchIdx], team2: m.winner };
      }

      // Semi-final losers → 3rd place match
      if (round.id === "semi") {
        const thirdPlace = rounds.find(r => r.id === "third_place");
        if (thirdPlace) {
          if (mi === 0) thirdPlace.matches[0] = { ...thirdPlace.matches[0], team1: loser };
          if (mi === 1) thirdPlace.matches[0] = { ...thirdPlace.matches[0], team2: loser };
        }
      }
    });

    // After last non-final round fills semi, fill final from semi winners
    if (nextRound.id === "final") {
      const semis = round.matches;
      if (semis[0]?.played && semis[1]?.played) {
        const finalRound = rounds.find(r => r.id === "final");
        if (finalRound) {
          finalRound.matches[0] = {
            ...finalRound.matches[0],
            team1: semis[0].winner,
            team2: semis[1].winner,
          };
        }
      }
    }
  }

  return { ...knockout, rounds };
}

export default function App() {
  const [tab, setTab] = useState("create");
  const [players, setPlayers] = useLocalStorage("arenix_players", initialPlayers);
  const [tournaments, setTournaments] = useLocalStorage("arenix_tournaments", []);
  const [freePlay, setFreePlay] = useLocalStorage("arenix_freeplay", { teams: [], games: [] });
  const [unlockedSections, setUnlockedSections] = useLocalStorage("arenix_unlocked", []);

  const [activeTournamentId, setActiveTournamentId] = useLocalStorage("arenix_active_tournament_id", null);
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

  const handleCreateChoice = (section) => {
    if (!unlockedSections.includes(section)) {
      setUnlockedSections(prev => [...prev, section]);
    }
    setTab(section);
  };

  const inTournament = !!activeTournament;
  const tourCompleted = activeTournament?.status === "completed";

  // Build global nav dynamically — sections appear after first unlock or when data exists
  const showTournaments = unlockedSections.includes("tournaments") || tournaments.length > 0;
  const showFreePlay    = unlockedSections.includes("freeplay") || (freePlay.teams || []).length > 0 || (freePlay.games || []).length > 0;
  const GLOBAL_NAV = [
    { id: "live",         icon: "🏐", label: "LIVE" },
    ...(showTournaments ? [{ id: "tournaments", icon: "🏆", label: "TOURNAMENTS" }] : []),
    ...(showFreePlay    ? [{ id: "freeplay",    icon: "🎮", label: "FREE PLAY"  }] : []),
    { id: "create",       icon: "➕", label: "CREATE" },
    { id: "players",      icon: "👤", label: "PLAYERS" },
  ];

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
        {!inTournament && tab === "create" && (
          <CreateMenuSection onChoose={handleCreateChoice} />
        )}
        {!inTournament && tab === "tournaments" && (
          <TournamentsSection
            tournaments={tournaments} setTournaments={setTournaments}
            players={players} setPlayers={setPlayers}
            onOpenTournament={openTournament}
          />
        )}
        {!inTournament && tab === "freeplay" && (
          <FreePlaySection
            freePlay={freePlay}
            setFreePlay={setFreePlay}
            players={players}
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
            tournamentMatches={getAllTournamentMatches(activeTournament)}
            onSaveResult={(matchId, score1, score2, winnerTeamId, log, sets) => {
              try { localStorage.removeItem(SAVE_KEY); } catch {}
              setTournaments(prev => prev.map(tour => {
                if (tour.id !== activeTournamentId) return tour;
                return saveLiveResult(tour, matchId, score1, score2, winnerTeamId, log, sets);
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
