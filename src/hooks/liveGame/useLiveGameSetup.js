import { useState, useEffect } from "react";
import { teamPlayerIds, teamPlayersOrdered } from "./serveRotation";

/**
 * useLiveGameSetup
 *
 * Owns all pre-match configuration state:
 *   - team selection (team1Id, team2Id)
 *   - gameStarted flag
 *   - active tournament match id
 *   - informal-mode wizard (step, sets, teamSize, team1/team2 definitions)
 *   - serve order for each team (explicit ordering + first-server index)
 *   - initial side and which team serves first
 *
 * Exposes:
 *   - All state values + their setters (unchanged API)
 *   - startGame({ serveRotation, firstServingTeam }) → returns the initial
 *     serveIndex the composer must pass to scoring (keeps scoring decoupled)
 *   - resetSetup()      → resets this slice to defaults
 *   - applySaved(snap)  → restores setup fields from a persisted snapshot
 */
export function useLiveGameSetup({ teams, tournamentMatches, preloadMatchId }) {
  // ── Team selection ─────────────────────────────────────────────────────────
  const [team1Id, setTeam1Id] = useState("");
  const [team2Id, setTeam2Id] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [activeTourMatchId, setActiveTourMatchId] = useState(preloadMatchId);

  // ── Informal mode wizard ───────────────────────────────────────────────────
  const [informalStep, setInformalStep] = useState("config");
  const [informalSets, setInformalSets] = useState(1);
  const [informalTeamSize, setInformalTeamSize] = useState(2);
  const [informalTeam1, setInformalTeam1] = useState({ name: "", players: [] });
  const [informalTeam2, setInformalTeam2] = useState({ name: "", players: [] });

  // ── Serve order / side config ──────────────────────────────────────────────
  const [t1ServeOrder, setT1ServeOrder] = useState([]);
  const [t2ServeOrder, setT2ServeOrder] = useState([]);
  const [t1FirstServer, setT1FirstServer] = useState(0);
  const [t2FirstServer, setT2FirstServer] = useState(0);
  const [t1InitialSide, setT1InitialSide] = useState("left");
  const [firstServingTeam, setFirstServingTeam] = useState(1);

  // ── Preload match from tournament fixture ──────────────────────────────────
  useEffect(() => {
    if (!preloadMatchId || !tournamentMatches) return;
    const match = tournamentMatches.find(m => m.id === preloadMatchId);
    if (!match) return;
    setActiveTourMatchId(preloadMatchId);
    setTeam1Id(match.team1);
    setTeam2Id(match.team2);
    const o1 = (() => {
      const tm = teams.find(t => t.id === match.team1);
      if (!tm) return [];
      return tm.players && tm.players.length ? tm.players : [tm.player1, tm.player2].filter(Boolean);
    })();
    const o2 = (() => {
      const tm = teams.find(t => t.id === match.team2);
      if (!tm) return [];
      return tm.players && tm.players.length ? tm.players : [tm.player1, tm.player2].filter(Boolean);
    })();
    setT1ServeOrder(o1);
    setT2ServeOrder(o2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadMatchId]);

  // ── Helpers (used internally and by composer) ──────────────────────────────
  const getTeamPlayerIds = (teamId) => {
    const team = teams.find(tm => tm.id === teamId);
    return teamPlayerIds(team);
  };

  /**
   * Compute the effective ordered arrays for each team, resolving
   * explicit serve-order overrides vs. roster + firstServer index.
   */
  const resolveServeOrders = () => {
    const o1 = t1ServeOrder.length > 0
      ? t1ServeOrder
      : teamPlayersOrdered(getTeamPlayerIds(team1Id), t1FirstServer);
    const o2 = t2ServeOrder.length > 0
      ? t2ServeOrder
      : teamPlayersOrdered(getTeamPlayerIds(team2Id), t2FirstServer);
    return { o1, o2 };
  };

  // ── startGame: returns the initial serve index for scoring ─────────────────
  const startGame = (buildRotationFn) => {
    // buildRotationFn is buildServeRotation(o1, o2) imported by composer,
    // called here with the current serve orders to get the rotation slots.
    const { o1, o2 } = resolveServeOrders();
    const rot = buildRotationFn(o1, o2);
    let initialServeIndex = 0;
    if (firstServingTeam === 2) {
      const idx = rot.findIndex(r => r.team === 2);
      initialServeIndex = idx >= 0 ? idx : 0;
    }
    setGameStarted(true);
    return initialServeIndex;
  };

  // ── resetSetup ─────────────────────────────────────────────────────────────
  const resetSetup = (informalMode) => {
    setTeam1Id(""); setTeam2Id(""); setGameStarted(false);
    setT1ServeOrder([]); setT2ServeOrder([]);
    setT1FirstServer(0); setT2FirstServer(0); setT1InitialSide("left");
    setFirstServingTeam(1);
    if (informalMode) {
      setInformalStep("config");
      setInformalTeam1({ name: "", players: [] });
      setInformalTeam2({ name: "", players: [] });
    }
  };

  // ── applySaved: restore setup slice from persisted snapshot ───────────────
  const applySaved = (s) => {
    setTeam1Id(s.team1Id);
    setTeam2Id(s.team2Id);
    setGameStarted(s.gameStarted);
    setT1FirstServer(s.t1FirstServer);
    setT2FirstServer(s.t2FirstServer);
    setT1InitialSide(s.t1InitialSide);
  };

  return {
    // State
    team1Id, setTeam1Id,
    team2Id, setTeam2Id,
    gameStarted, setGameStarted,
    activeTourMatchId, setActiveTourMatchId,
    // Informal wizard
    informalStep, setInformalStep,
    informalSets, setInformalSets,
    informalTeamSize, setInformalTeamSize,
    informalTeam1, setInformalTeam1,
    informalTeam2, setInformalTeam2,
    // Serve order / side
    t1ServeOrder, setT1ServeOrder,
    t2ServeOrder, setT2ServeOrder,
    t1FirstServer, setT1FirstServer,
    t2FirstServer, setT2FirstServer,
    t1InitialSide, setT1InitialSide,
    firstServingTeam, setFirstServingTeam,
    // Methods
    startGame,
    resetSetup,
    applySaved,
    // Internal helper exposed so composer can pass to GameSetupScreen
    getTeamPlayerIds,
    resolveServeOrders,
  };
}
