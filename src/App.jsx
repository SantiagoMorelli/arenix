import React, { useState, useEffect } from "react";
import { LangCtx, TR } from "./lib/i18n";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { SAVE_KEY } from "./hooks/useLiveGame";
import { uid, now } from "./lib/utils";
import PlayersSection from "./components/PlayersSection";
import TournamentsSection from "./components/TournamentsSection";
import TournamentMatchesSection from "./components/TournamentMatchesSection";
import TournamentTeamsSection from "./components/TournamentTeamsSection";
import LiveScoreSection from "./components/LiveScoreSection";
import TournamentSetupWizard from "./components/TournamentSetupWizard";
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
  const [tab, setTab] = useState("tournaments");

  // ── Leagues (new unified structure) ────────────────────────────────────────
  // Migration from arenix_players + arenix_tournaments runs synchronously in
  // src/lib/migration.js before this component ever mounts, so arenix_leagues
  // will always contain at least one entry by the time this hook reads it.
  const [leagues, setLeagues] = useLocalStorage("arenix_leagues", []);
  const [freePlays, setFreePlays] = useLocalStorage("arenix_freeplays", []);

  // Derive players + tournaments from the active (first) league
  const activeLeague  = leagues[0] || null;
  const players       = activeLeague?.players     || [];
  const tournaments   = activeLeague?.tournaments || [];

  // Wrapper setters — keep all downstream components' interfaces intact
  const setPlayers = (updater) => {
    setLeagues(prev => {
      if (!prev.length) return prev;
      const first = prev[0];
      return [
        { ...first, players: typeof updater === "function" ? updater(first.players || []) : updater },
        ...prev.slice(1),
      ];
    });
  };

  const setTournaments = (updater) => {
    setLeagues(prev => {
      if (!prev.length) return prev;
      const first = prev[0];
      return [
        { ...first, tournaments: typeof updater === "function" ? updater(first.tournaments || []) : updater },
        ...prev.slice(1),
      ];
    });
  };

  // Dark mode
  const [isDark, setIsDark] = useLocalStorage("arenix-dark", false);
  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

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

      {/* Header */}
      <div className="bg-accent px-4 pt-3.5 pb-3 flex items-center gap-3">
        {(inTournament || inFreePlay) && (
          <button
            onClick={inTournament ? closeTournament : closeFreePlay}
            className="bg-white/15 border-0 rounded-lg px-2.5 py-1.5 cursor-pointer text-white font-bold text-[16px]"
          >
            ←
          </button>
        )}
        <div className="flex-1">
          {inTournament ? (
            <>
              <div className="text-[10px] text-white/70 tracking-[1px] uppercase">TOURNAMENT</div>
              <div className="font-display text-[22px] text-white tracking-[1px] leading-none">
                {activeTournament.name}
              </div>
            </>
          ) : inFreePlay ? (
            <>
              <div className="text-[10px] text-white/70 tracking-[1px] uppercase">FREE PLAY</div>
              <div className="font-display text-[22px] text-white tracking-[1px] leading-none">
                {activeFreePlay.name}
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-[24px] text-white tracking-[2px] leading-none">ARENIX</div>
              <div className="text-[10px] text-white/70 tracking-[2px] uppercase">{r("subtitle")}</div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 pb-[100px] max-w-[600px] mx-auto">

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

        {/* ── Tournament setup wizard ── */}
        {inTournament && activeTournament.phase === "setup" && (
          <TournamentSetupWizard
            tournament={activeTournament}
            setTournaments={setTournaments}
            players={players}
            onDone={() => setTourTab("tour_matches")}
          />
        )}

        {/* ── Tournament tabs ── */}
        {inTournament && activeTournament.phase !== "setup" && tourTab === "tour_matches" && (
          <TournamentMatchesSection
            tournament={activeTournament}
            setTournaments={setTournaments}
            players={players}
            onOpenLive={openLiveMatch}
          />
        )}
        {inTournament && activeTournament.phase !== "setup" && tourTab === "tour_teams" && (
          <TournamentTeamsSection
            tournament={activeTournament}
            setTournaments={setTournaments}
            players={players}
          />
        )}
        {inTournament && activeTournament.phase !== "setup" && tourTab === "tour_players" && (
          <PlayersSection players={players} setPlayers={setPlayers} contextual />
        )}
        {inTournament && activeTournament.phase !== "setup" && tourTab === "tour_live" && (
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

      {/* Bottom Nav — hidden during setup wizard */}
      {!(inTournament && activeTournament.phase === "setup") && <div
        className="fixed bottom-0 left-0 right-0 bg-surface border-t-2 border-line flex justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))", paddingTop: 8 }}
      >
        {currentNav.map(n => (
          <button
            key={n.id}
            onClick={() => setCurrentTab(n.id)}
            className="bg-transparent border-0 cursor-pointer flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all"
          >
            <div className="text-[22px]">{n.icon}</div>
            <div className={`text-[9px] font-bold tracking-[0.8px] uppercase ${currentTab === n.id ? "text-accent" : "text-dim"}`}>
              {n.label}
            </div>
            {currentTab === n.id && (
              <div className="w-5 h-[3px] bg-accent rounded-[2px]" />
            )}
          </button>
        ))}
      </div>}
    </LangCtx.Provider>
  );
}
