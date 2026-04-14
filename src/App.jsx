import React, { useState } from "react";
import { G, globalStyle } from "./components/ui";
import { LangCtx, TR } from "./lib/i18n";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { SAVE_KEY } from "./hooks/useLiveGame";
import { uid, now } from "./lib/utils";
import PlayersSection from "./components/PlayersSection";
import TournamentsSection from "./components/TournamentsSection";
import TournamentMatchesSection from "./components/TournamentMatchesSection";
import TournamentTeamsSection from "./components/TournamentTeamsSection";
import LiveScoreSection from "./components/LiveScoreSection";
import FreePlaysSection from "./components/FreePlaysSection";
import FreePlayTeamsSection from "./components/FreePlayTeamsSection";
import FreePlayGamesSection from "./components/FreePlayGamesSection";
import FreePlayGameSetup from "./components/FreePlayGameSetup";

const initialPlayers = [
  { id: "p1", name: "Matías Torres",    wins: 12, losses: 3, points: 240, level: "advanced" },
  { id: "p2", name: "Camila Rodríguez", wins: 10, losses: 4, points: 204, level: "advanced" },
  { id: "p3", name: "Bruno Fernández",  wins: 9,  losses: 5, points: 186, level: "intermediate" },
  { id: "p4", name: "Valentina López",  wins: 8,  losses: 4, points: 172, level: "intermediate" },
  { id: "p5", name: "Diego Pérez",      wins: 7,  losses: 6, points: 148, level: "beginner" },
  { id: "p6", name: "Sofía García",     wins: 6,  losses: 7, points: 126, level: "beginner" },
];

// ── Static nav definitions ────────────────────────────────────────────────────

const GLOBAL_NAV = [
  { id: "tournaments", icon: "🏆", label: "TOURNAMENTS" },
  { id: "freeplay",    icon: "🎮", label: "FREE PLAY"   },
  { id: "players",     icon: "👤", label: "PLAYERS"     },
];

const TOUR_NAV = [
  { id: "tour_live",    icon: "🏐", label: "LIVE"     },
  { id: "tour_matches", icon: "🏆", label: "SCHEDULE" },
  { id: "tour_teams",   icon: "🤝", label: "TEAMS"    },
  { id: "tour_players", icon: "👤", label: "PLAYERS"  },
];

const FP_NAV = [
  { id: "fp_live",    icon: "🏐", label: "LIVE"       },
  { id: "fp_games",   icon: "🎮", label: "FREE PLAYS" },
  { id: "fp_teams",   icon: "🤝", label: "TEAMS"      },
  { id: "fp_players", icon: "👤", label: "PLAYERS"    },
];

// ── Tournament helpers ────────────────────────────────────────────────────────

function getAllTournamentMatches(tour) {
  const groupMatches   = (tour.groups || []).flatMap(g => g.matches || []);
  const knockoutMatches = (tour.knockout?.rounds || []).flatMap(r => r.matches || []);
  return [...groupMatches, ...knockoutMatches, ...(tour.matches || [])];
}

function saveLiveResult(tour, matchId, score1, score2, winnerTeamId, log, sets) {
  const updated = { ...tour };

  updated.groups = (tour.groups || []).map(g => {
    if (!g.matches.find(m => m.id === matchId)) return g;
    return {
      ...g,
      matches: g.matches.map(m =>
        m.id !== matchId ? m : { ...m, played: true, winner: winnerTeamId, score1, score2, log: log || null, sets: sets || null }
      ),
    };
  });

  if (tour.knockout) {
    const rounds = tour.knockout.rounds.map(r => {
      if (!r.matches.find(m => m.id === matchId)) return r;
      return {
        ...r,
        matches: r.matches.map(m =>
          m.id !== matchId ? m : { ...m, played: true, winner: winnerTeamId, score1, score2, log: log || null, sets: sets || null }
        ),
      };
    });
    updated.knockout = advanceKnockout({ ...tour.knockout, rounds }, updated.teams);
    const finalRound = updated.knockout.rounds.find(r => r.id === "final");
    if (finalRound?.matches[0]?.played) {
      updated.phase  = "completed";
      updated.status = "completed";
      updated.winner = finalRound.matches[0].winner;
    }
  }

  if ((tour.matches || []).find(m => m.id === matchId)) {
    updated.matches = tour.matches.map(m =>
      m.id !== matchId ? m : { ...m, played: true, winner: winnerTeamId, score1, score2, log: log || null, sets: sets || null }
    );
  }

  return updated;
}

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

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab]         = useState("tournaments");
  const [players, setPlayers] = useLocalStorage("arenix_players", initialPlayers);
  const [tournaments, setTournaments] = useLocalStorage("arenix_tournaments", []);
  const [freePlays,   setFreePlays]   = useLocalStorage("arenix_freeplays",   []);

  // Tournament context
  const [activeTournamentId, setActiveTournamentId] = useLocalStorage("arenix_active_tournament_id", null);
  const [tourTab, setTourTab] = useState("tour_matches");
  const [activeMatchId, setActiveMatchId] = useState(null);

  // Free play context
  const [activeFreePlayId, setActiveFreePlayId] = useLocalStorage("arenix_active_freeplay_id", null);
  const [fpTab, setFpTab] = useState("fp_games");
  const [pendingFpMatch,  setPendingFpMatch]  = useState(null);
  const [activeFpMatchId, setActiveFpMatchId] = useState(null);

  const r = (k) => TR[k] || k;

  const activeTournament = tournaments.find(t  => t.id  === activeTournamentId) || null;
  const activeFreePlay   = freePlays.find(fp  => fp.id === activeFreePlayId)    || null;

  const inTournament = !!activeTournament;
  const inFreePlay   = !inTournament && !!activeFreePlay;

  // ── Tournament actions ──────────────────────────────────────────────────────
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

  // ── Free play actions ───────────────────────────────────────────────────────
  const openFreePlay = (id) => {
    setActiveFreePlayId(id);
    setFpTab("fp_games");
    setActiveFpMatchId(null);
    setPendingFpMatch(null);
  };

  const closeFreePlay = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setActiveFreePlayId(null);
    setActiveFpMatchId(null);
    setPendingFpMatch(null);
    setTab("freeplay");
  };

  const openFpLiveGame = (team1Id, team2Id, setsPerMatch) => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    const match = { id: uid(), team1: team1Id, team2: team2Id, played: false, winner: null, score1: 0, score2: 0, setsPerMatch };
    setPendingFpMatch(match);
    setActiveFpMatchId(match.id);
    setFpTab("fp_live");
  };

  const handleFpSaveResult = (matchId, score1, score2, winnerTeamId, log, sets) => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    const completedGame = {
      id: matchId,
      team1: pendingFpMatch.team1,
      team2: pendingFpMatch.team2,
      played: true,
      winner: winnerTeamId,
      score1, score2, sets: sets || [], log: log || [],
      date: now(),
    };
    setFreePlays(prev => prev.map(fp =>
      fp.id !== activeFreePlayId ? fp : { ...fp, games: [...(fp.games || []), completedGame] }
    ));
    setPendingFpMatch(null);
    setActiveFpMatchId(null);
    setFpTab("fp_games");
  };

  // When navigating FP tabs: abandon in-flight game if leaving fp_live
  const setFpTabSafe = (newTab) => {
    if (newTab !== "fp_live" && activeFpMatchId) {
      try { localStorage.removeItem(SAVE_KEY); } catch {}
      setActiveFpMatchId(null);
      setPendingFpMatch(null);
    }
    setFpTab(newTab);
  };

  // ── Nav computation ─────────────────────────────────────────────────────────
  const tourCompleted = activeTournament?.status === "completed";

  const currentNav = inTournament
    ? (tourCompleted ? TOUR_NAV.filter(n => n.id !== "tour_live") : TOUR_NAV)
    : inFreePlay
    ? FP_NAV
    : GLOBAL_NAV;

  const currentTab    = inTournament ? tourTab  : inFreePlay ? fpTab  : tab;
  const setCurrentTab = inTournament ? setTourTab : inFreePlay ? setFpTabSafe : setTab;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <LangCtx.Provider value={{ t: r }}>
      <style>{globalStyle}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg," + G.ocean + "," + G.oceanDark + ")",
        padding: "14px 16px 12px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        {(inTournament || inFreePlay) && (
          <button
            onClick={inTournament ? closeTournament : closeFreePlay}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
              padding: "6px 10px", cursor: "pointer", color: G.white,
              fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16,
            }}
          >←</button>
        )}
        <div style={{ flex: 1 }}>
          {inTournament ? (
            <>
              <div style={{ fontSize: 10, color: G.sky, letterSpacing: 1, textTransform: "uppercase" }}>TOURNAMENT</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: G.white, letterSpacing: 1, lineHeight: 1 }}>
                {activeTournament.name}
              </div>
            </>
          ) : inFreePlay ? (
            <>
              <div style={{ fontSize: 10, color: G.sky, letterSpacing: 1, textTransform: "uppercase" }}>FREE PLAY</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: G.white, letterSpacing: 1, lineHeight: 1 }}>
                {activeFreePlay.name}
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

        {/* ── Global tabs ── */}
        {!inTournament && !inFreePlay && tab === "tournaments" && (
          <TournamentsSection
            tournaments={tournaments} setTournaments={setTournaments}
            players={players} setPlayers={setPlayers}
            onOpenTournament={openTournament}
          />
        )}
        {!inTournament && !inFreePlay && tab === "freeplay" && (
          <FreePlaysSection
            freePlays={freePlays} setFreePlays={setFreePlays}
            players={players}
            onOpenFreePlay={openFreePlay}
          />
        )}
        {!inTournament && !inFreePlay && tab === "players" && (
          <PlayersSection players={players} setPlayers={setPlayers} />
        )}

        {/* ── Tournament tabs ── */}
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
              setTournaments(prev => prev.map(tour =>
                tour.id !== activeTournamentId ? tour
                : saveLiveResult(tour, matchId, score1, score2, winnerTeamId, log, sets)
              ));
              setActiveMatchId(null);
              setTourTab("tour_matches");
            }}
          />
        )}

        {/* ── Free Play tabs ── */}
        {inFreePlay && fpTab === "fp_live" && (
          activeFpMatchId && pendingFpMatch ? (
            <LiveScoreSection
              teams={activeFreePlay.teams || []}
              players={players}
              setsPerMatch={pendingFpMatch.setsPerMatch || 1}
              preloadMatchId={activeFpMatchId}
              tournamentMatches={[pendingFpMatch]}
              onSaveResult={handleFpSaveResult}
            />
          ) : (
            <FreePlayGameSetup
              freePlay={activeFreePlay}
              onStartGame={openFpLiveGame}
            />
          )
        )}
        {inFreePlay && fpTab === "fp_games" && (
          <FreePlayGamesSection
            freePlay={activeFreePlay}
            players={players}
            onStartGame={openFpLiveGame}
          />
        )}
        {inFreePlay && fpTab === "fp_teams" && (
          <FreePlayTeamsSection
            freePlay={activeFreePlay}
            setFreePlays={setFreePlays}
            players={players}
          />
        )}
        {inFreePlay && fpTab === "fp_players" && (
          <PlayersSection players={players} setPlayers={setPlayers} contextual />
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
        {currentNav.map(n => (
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
