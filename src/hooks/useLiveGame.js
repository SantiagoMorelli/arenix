import { useCallback } from "react";
import { useLiveGameSetup }        from "./liveGame/useLiveGameSetup";
import { useLiveGameScoring }      from "./liveGame/useLiveGameScoring";
import { useLiveGameUndo }         from "./liveGame/useLiveGameUndo";
import { useLiveGamePersistence }  from "./liveGame/useLiveGamePersistence";
import { buildServeRotation }      from "./liveGame/serveRotation";

// ── Public constants & helpers (re-exported so consumers need no changes) ─────
export const SAVE_KEY    = "bv_live_game";
export const FP_SAVE_KEY = "fp_live_game";

export const loadSaved = () => {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
};

export const loadSavedFrom = (key) => {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};

// ── Composer ──────────────────────────────────────────────────────────────────
export function useLiveGame({
  teams,
  players,
  informalMode,
  tournamentMatches,
  preloadMatchId,
  setsPerMatch = 1,
  saveKey = SAVE_KEY,
}) {
  // ── 1. Setup sub-hook ──────────────────────────────────────────────────────
  const setup = useLiveGameSetup({ teams, tournamentMatches, preloadMatchId });

  // ── 2. Name helpers (stable, depend on setup state) ───────────────────────
  const getTeam = useCallback((id) => {
    const real = teams.find(tm => tm.id === id);
    if (real) return real;
    if (informalMode) {
      if (id === "informal_1") return {
        id: "informal_1",
        name: setup.informalTeam1.name || "Team 1",
        players: (setup.informalTeam1.players || []).map(s =>
          s.type === "global" ? s.playerId : "free_" + (s.name || "")),
      };
      if (id === "informal_2") return {
        id: "informal_2",
        name: setup.informalTeam2.name || "Team 2",
        players: (setup.informalTeam2.players || []).map(s =>
          s.type === "global" ? s.playerId : "free_" + (s.name || "")),
      };
    }
    return null;
  }, [teams, informalMode, setup.informalTeam1, setup.informalTeam2]);

  const getPlayer = useCallback((id) => {
    if (id && id.startsWith("free_")) return { id, name: id.slice(5) };
    return players.find(p => p.id === id);
  }, [players]);

  const playerName = useCallback((id) => getPlayer(id)?.name || "?", [getPlayer]);
  const tName      = useCallback((id) => getTeam(id)?.name  || "?", [getTeam]);

  // ── 3. Rotation inputs getter (stable; scoring reads via this callback) ────
  const getRotationInputs = useCallback(() => {
    return setup.resolveServeOrders();
  // setup object identity changes every render (it's a plain object of state),
  // so we depend on the specific values that feed resolveServeOrders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup.team1Id, setup.team2Id, setup.t1ServeOrder, setup.t2ServeOrder, setup.t1FirstServer, setup.t2FirstServer]);

  // ── 4. Undo sub-hook (needs applySnapshot from scoring — forward-declared) -
  // We resolve the circular dep by giving undo a ref-backed applier that the
  // scoring hook fills in after it is created.
  // Simpler: we create a stable wrapper that closes over scoring (defined next).
  // React hooks must be called unconditionally so we use a ref pattern:
  //   - undo.pushHistory is stable; scoring calls it via onBeforeApply.
  //   - confirmUndo needs scoring.applySnapshot, wired below via closure.

  // We break the cycle by creating undo with a placeholder and then patching
  // the applySnapshot reference through a mutable ref.
  const applySnapshotRef = { current: null };

  const undo = useLiveGameUndo({
    applySnapshot: (snap) => applySnapshotRef.current?.(snap),
  });

  // ── 5. Scoring sub-hook ───────────────────────────────────────────────────
  const scoring = useLiveGameScoring({
    initialPointsToWin: 21,
    setsPerMatch,
    informalMode,
    getInformalSets: () => setup.informalSets,
    getRotationInputs,
    tName,
    team1Id: setup.team1Id,
    team2Id: setup.team2Id,
    onBeforeApply: undo.pushHistory,
  });

  // Patch the undo applier now that scoring is available.
  applySnapshotRef.current = scoring.applySnapshot;

  // ── 6. startGame wiring ───────────────────────────────────────────────────
  const startGame = () => {
    const initialServeIndex = setup.startGame(buildServeRotation);
    scoring.setServeIndex(initialServeIndex);
  };

  // ── 7. Full reset ─────────────────────────────────────────────────────────
  const reset = () => {
    // eslint-disable-next-line no-empty
    try { localStorage.removeItem(saveKey); } catch {}
    setup.resetSetup(informalMode);
    scoring.resetScoring();
    undo.resetUndo();
    persistence.setShowRestore(false);
  };

  // ── 8. Restore applier ────────────────────────────────────────────────────
  const applyRestore = (s) => {
    setup.applySaved(s);
    scoring.applySavedScoring(s);
    undo.resetUndo();
  };

  // ── 9. Persistence sub-hook ───────────────────────────────────────────────
  const buildSnapshot = () => ({
    team1Id:       setup.team1Id,
    team2Id:       setup.team2Id,
    gameStarted:   setup.gameStarted,
    t1FirstServer: setup.t1FirstServer,
    t2FirstServer: setup.t2FirstServer,
    t1InitialSide: setup.t1InitialSide,
    score1:        scoring.score1,
    score2:        scoring.score2,
    serveIndex:    scoring.serveIndex,
    side:          scoring.side,
    points:        scoring.points,
    log:           scoring.log,
    sets:          scoring.sets,
    winner:        scoring.winner,
    pointsToWin:   scoring.pointsToWin,
    history:       undo.history,
  });

  const persistence = useLiveGamePersistence({
    saveKey,
    gameStarted: setup.gameStarted,
    buildSnapshot,
    restore: applyRestore,
    // Exact same dep values as the original hook's useEffect dep array:
    deps: [
      scoring.score1, scoring.score2, scoring.serveIndex,
      scoring.side, scoring.points, scoring.log,
      scoring.sets, scoring.winner, scoring.pointsToWin,
      undo.history,
    ],
  });

  // ── 10. Return: identical public shape ────────────────────────────────────
  return {
    // Restore
    showRestore:  persistence.showRestore,
    restoreGame:  persistence.restoreGame,
    discardSaved: persistence.discardSaved,

    // Setup
    team1Id:            setup.team1Id,
    setTeam1Id:         setup.setTeam1Id,
    team2Id:            setup.team2Id,
    setTeam2Id:         setup.setTeam2Id,
    gameStarted:        setup.gameStarted,
    setGameStarted:     setup.setGameStarted,
    activeTourMatchId:  setup.activeTourMatchId,
    setActiveTourMatchId: setup.setActiveTourMatchId,

    // Informal wizard
    informalStep:       setup.informalStep,
    setInformalStep:    setup.setInformalStep,
    informalSets:       setup.informalSets,
    setInformalSets:    setup.setInformalSets,
    informalTeamSize:   setup.informalTeamSize,
    setInformalTeamSize: setup.setInformalTeamSize,
    informalTeam1:      setup.informalTeam1,
    setInformalTeam1:   setup.setInformalTeam1,
    informalTeam2:      setup.informalTeam2,
    setInformalTeam2:   setup.setInformalTeam2,

    // Serve order / side config
    t1ServeOrder:       setup.t1ServeOrder,
    setT1ServeOrder:    setup.setT1ServeOrder,
    t2ServeOrder:       setup.t2ServeOrder,
    setT2ServeOrder:    setup.setT2ServeOrder,
    t1InitialSide:      setup.t1InitialSide,
    setT1InitialSide:   setup.setT1InitialSide,
    firstServingTeam:   setup.firstServingTeam,
    setFirstServingTeam: setup.setFirstServingTeam,
    setSide:            scoring.setSide,
    setPointsToWin:     scoring.setPointsToWin,
    startGame,

    // In-game state
    score1:       scoring.score1,
    score2:       scoring.score2,
    serveIndex:   scoring.serveIndex,
    side:         scoring.side,
    points:       scoring.points,
    log:          scoring.log,
    logRef:       scoring.logRef,
    sets:         scoring.sets,
    winner:       scoring.winner,
    pointsToWin:  scoring.pointsToWin,
    history:      undo.history,

    // Dialogs
    pendingSideChange:    scoring.pendingSideChange,
    pendingUndo:          undo.pendingUndo,
    pendingPoint:         scoring.pendingPoint,
    setPendingPoint:      scoring.setPendingPoint,
    pendingPlayerSelect:  scoring.pendingPlayerSelect,
    pendingEnd:           scoring.pendingEnd,

    // Derived helpers
    serveRotation:  scoring.serveRotation,
    currentServer:  scoring.currentServer,
    serverTeam:     scoring.serverTeam,
    playerName,
    tName,
    POINT_TYPES:    scoring.POINT_TYPES,

    // Actions
    addPoint:          scoring.addPoint,
    confirmPointType:  scoring.confirmPointType,
    confirmPlayer:     scoring.confirmPlayer,
    confirmSideChange: scoring.confirmSideChange,
    reset,
    requestUndo:  undo.requestUndo,
    confirmUndo:  undo.confirmUndo,
    cancelUndo:   undo.cancelUndo,
    requestEnd:   scoring.requestEnd,
    confirmEnd:   scoring.confirmEnd,
    cancelEnd:    scoring.cancelEnd,
  };
}
