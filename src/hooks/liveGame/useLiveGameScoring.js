import { useState, useEffect, useRef, useMemo } from "react";
import { uid } from "../../lib/utils";
import { POINT_TYPES } from "./pointTypes";
import { buildServeRotation } from "./serveRotation";

/**
 * useLiveGameScoring
 *
 * Owns all in-game state: scores, serve index, side, points played, event log,
 * completed sets, match winner, points-to-win threshold, and all pending-dialog
 * flags (side-change, point-type picker, player picker, end-match).
 *
 * Key design decisions:
 *   - serveRotation + currentServer are memoized (useMemo) on their true inputs
 *     so they are only recomputed when serve configuration actually changes.
 *   - onBeforeApply(snapshot) is called synchronously before any state mutation
 *     so the composer can push the snapshot to undo history.
 *   - getRotationInputs() is a stable callback (useCallback / plain ref) supplied
 *     by the composer; it returns { o1, o2 } (the resolved serve-order arrays).
 *     This avoids the scoring hook subscribing to setup state directly.
 *   - tName / playerName are stable callbacks supplied by the composer.
 *
 * @param {{
 *   initialPointsToWin?: number,
 *   setsPerMatch?: number,
 *   informalMode?: boolean,
 *   getInformalSets: () => number,
 *   getRotationInputs: () => { o1: string[], o2: string[] },
 *   tName: (teamId: string) => string,
 *   team1Id: string,
 *   team2Id: string,
 *   onBeforeApply?: (snapshot: object) => void,
 * }} opts
 */
export function useLiveGameScoring({
  initialPointsToWin = 21,
  setsPerMatch = 1,
  informalMode = false,
  getInformalSets,
  getRotationInputs,
  tName,
  team1Id,
  team2Id,
  onBeforeApply,
}) {
  // ── Core in-game state ─────────────────────────────────────────────────────
  const [score1, setScore1]           = useState(0);
  const [score2, setScore2]           = useState(0);
  const [serveIndex, setServeIndex]   = useState(0);
  const [side, setSide]               = useState({ t1: "left", t2: "right" });
  const [points, setPoints]           = useState(0);
  const [log, setLog]                 = useState([]);
  const [sets, setSets]               = useState([]);
  const [winner, setWinner]           = useState(null);
  const [pointsToWin, setPointsToWin] = useState(initialPointsToWin);

  // ── Pending-dialog flags ───────────────────────────────────────────────────
  const [pendingSideChange, setPendingSideChange]     = useState(null);
  const [pendingPoint, setPendingPoint]               = useState(null);
  const [pendingPlayerSelect, setPendingPlayerSelect] = useState(null);
  const [pendingEnd, setPendingEnd]                   = useState(false);

  // ── Log scroll ref ─────────────────────────────────────────────────────────
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // ── Serve rotation (memoized) ──────────────────────────────────────────────
  // getRotationInputs() is a stable getter; we also depend on serveIndex so
  // currentServer updates when the index advances.
  const { o1: _o1, o2: _o2 } = getRotationInputs();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const serveRotation = useMemo(() => buildServeRotation(_o1, _o2), [
    // We stringify to get value-level equality for the array contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(_o1), JSON.stringify(_o2),
  ]);

  const currentServer = useMemo(
    () => serveRotation[serveIndex % serveRotation.length],
    [serveRotation, serveIndex],
  );

  // ── Snapshot (for undo + auto-save) ───────────────────────────────────────
  const snapshot = () => ({
    score1, score2, serveIndex, side: { ...side }, points,
    log: [...log], sets: [...sets],
  });

  // ── applySnapshot (used by undo + restore) ─────────────────────────────────
  const applySnapshot = (snap) => {
    setScore1(snap.score1);
    setScore2(snap.score2);
    setServeIndex(snap.serveIndex);
    setSide(snap.side);
    setPoints(snap.points);
    setLog(snap.log);
    if (snap.sets !== undefined) setSets(snap.sets);
    if (snap.winner !== undefined) setWinner(snap.winner);
    if (snap.pointsToWin !== undefined) setPointsToWin(snap.pointsToWin);
    // Reset undo: clear winner when restoring a mid-game state
    if (snap.winner === undefined) setWinner(null);
  };

  // ── applyPoint (internal) ──────────────────────────────────────────────────
  const applyPoint = ({ newS1, newS2, newPoints, newServeIndex, newSide, logEntry }) => {
    // Notify undo hook before we mutate anything.
    if (onBeforeApply) onBeforeApply(snapshot());

    setScore1(newS1);
    setScore2(newS2);
    setServeIndex(newServeIndex);
    setSide(newSide);
    setPoints(newPoints);
    setLog(prev => [...prev, logEntry]);

    const isWin = (s, opp) => s >= pointsToWin && s - opp >= 2;
    if (isWin(newS1, newS2)) endSet(1, newS1, newS2, newServeIndex);
    else if (isWin(newS2, newS1)) endSet(2, newS1, newS2, newServeIndex);
  };

  // ── endSet ─────────────────────────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  const endSet = (winnerTeam, s1, s2, _si) => {
    setSets(prevSets => {
      const newSets = [...prevSets, { winner: winnerTeam, s1, s2 }];
      const t1Sets = newSets.filter(s => s.winner === 1).length;
      const t2Sets = newSets.filter(s => s.winner === 2).length;
      const effectiveSets = informalMode ? getInformalSets() : setsPerMatch;
      const setsToWin = Math.ceil(effectiveSets / 2);
      if (t1Sets >= setsToWin) { setWinner(1); return newSets; }
      if (t2Sets >= setsToWin) { setWinner(2); return newSets; }
      // Continue: reset set scores
      setScore1(0); setScore2(0); setPoints(0);
      setSide({ t1: "left", t2: "right" });
      const loserTeam = winnerTeam === 1 ? 2 : 1;
      const rot = buildServeRotation(...Object.values(getRotationInputs()));
      const firstLoserSlot = rot.findIndex(r => r.team === loserTeam);
      setServeIndex(firstLoserSlot >= 0 ? firstLoserSlot : 0);
      setLog(prev => [...prev, { id: uid(), msg: `🏐 SET ${newSets.length} ENDED — New set`, sideChange: false }]);
      if (newSets.length === effectiveSets - 1) setPointsToWin(15);
      return newSets;
    });
  };

  // ── resolvePoint ───────────────────────────────────────────────────────────
  const resolvePoint = (teamNum, ptId, playerId = null) => {
    const newS1     = teamNum === 1 ? score1 + 1 : score1;
    const newS2     = teamNum === 2 ? score2 + 1 : score2;
    const newPoints = points + 1;

    // Advance serve index to next slot owned by the scoring team.
    let newServeIndex = serveIndex;
    if (currentServer.team !== teamNum) {
      const rot = serveRotation;
      for (let i = 1; i <= rot.length; i++) {
        const candidate = (serveIndex + i) % rot.length;
        if (rot[candidate].team === teamNum) { newServeIndex = candidate; break; }
      }
    }

    const isSideChange = newPoints % 7 === 0;
    const newSide = isSideChange
      ? { t1: side.t1 === "left" ? "right" : "left", t2: side.t2 === "left" ? "right" : "left" }
      : side;

    const rot        = serveRotation;
    const newServer  = rot[newServeIndex % rot.length];
    const pt         = POINT_TYPES.find(p => p.id === ptId) || POINT_TYPES[4];

    let streak = 1;
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].team === teamNum) streak++; else break;
    }

    const logEntry = {
      id: uid(), timestamp: Date.now(),
      team: teamNum, t1: newS1, t2: newS2,
      setNum: sets.length + 1, pointNum: newPoints,
      pointType: ptId, pointTypeLabel: pt.label, pointTypeIcon: pt.icon,
      serverPlayerId: currentServer.playerId, serverTeam: currentServer.team,
      nextServerPlayerId: newServer.playerId, nextServerTeam: newServer.team,
      sideBeforePoint: { ...side }, sideChange: isSideChange, streak,
      scoringPlayerId: ptId !== "error" ? playerId : null,
      errorPlayerId:   ptId === "error" ? playerId : null,
      msg: pt.icon + " " + pt.label + " • " + tName(teamNum === 1 ? team1Id : team2Id) + " • " + newS1 + ":" + newS2,
    };

    const isWin = (s, opp) => s >= pointsToWin && s - opp >= 2;
    const setOver = isWin(newS1, newS2) || isWin(newS2, newS1);

    if (isSideChange && !setOver) {
      setPendingSideChange({ newS1, newS2, newPoints, newServeIndex, newSide, logEntry, setOver: false });
    } else {
      applyPoint({ newS1, newS2, newPoints, newServeIndex, newSide, logEntry, setOver });
    }
  };

  // ── Public point actions ───────────────────────────────────────────────────
  const addPoint = (teamNum) => setPendingPoint({ teamNum });

  const confirmPointType = (ptId) => {
    if (!pendingPoint) return;
    const teamNum = pendingPoint.teamNum;
    setPendingPoint(null);
    if (ptId === "ace") {
      resolvePoint(teamNum, ptId, currentServer.playerId);
    } else {
      setPendingPlayerSelect({ teamNum, ptId });
    }
  };

  const confirmPlayer = (playerId) => {
    if (!pendingPlayerSelect) return;
    const { teamNum, ptId } = pendingPlayerSelect;
    setPendingPlayerSelect(null);
    resolvePoint(teamNum, ptId, playerId);
  };

  const confirmSideChange = () => {
    if (!pendingSideChange) return;
    applyPoint(pendingSideChange);
    setPendingSideChange(null);
  };

  // ── End match actions ──────────────────────────────────────────────────────
  const requestEnd = () => setPendingEnd(true);
  const cancelEnd  = () => setPendingEnd(false);

  const confirmEnd = () => {
    setPendingEnd(false);
    if (score1 === 0 && score2 === 0 && sets.length === 0) {
      resetScoring(); return;
    }
    let finalSets = [...sets];
    if (score1 > 0 || score2 > 0) {
      const setWin = score1 > score2 ? 1 : score2 > score1 ? 2 : 1;
      finalSets = [...sets, { winner: setWin, s1: score1, s2: score2 }];
      setSets(finalSets);
    }
    const t1S = finalSets.filter(s => s.winner === 1).length;
    const t2S = finalSets.filter(s => s.winner === 2).length;
    const matchWinner = t1S > t2S ? 1 : t2S > t1S ? 2 : (score1 >= score2 ? 1 : 2);
    setWinner(matchWinner);
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetScoring = () => {
    setScore1(0); setScore2(0); setServeIndex(0); setPoints(0);
    setSide({ t1: "left", t2: "right" }); setLog([]); setSets([]);
    setWinner(null); setPointsToWin(initialPointsToWin);
    setPendingSideChange(null); setPendingPoint(null);
    setPendingPlayerSelect(null); setPendingEnd(false);
  };

  // ── applySavedScoring: restore scoring fields from persisted snapshot ──────
  const applySavedScoring = (s) => {
    setScore1(s.score1); setScore2(s.score2);
    setServeIndex(s.serveIndex); setSide(s.side);
    setPoints(s.points); setLog(s.log); setSets(s.sets);
    setWinner(s.winner); setPointsToWin(s.pointsToWin);
  };

  return {
    // State
    score1, score2, serveIndex, side, setSide, points,
    log, logRef, sets, winner, pointsToWin, setPointsToWin,
    // Derived
    serveRotation, currentServer,
    serverTeam: currentServer.team,
    POINT_TYPES,
    // Dialog flags
    pendingSideChange,
    pendingPoint, setPendingPoint,
    pendingPlayerSelect,
    pendingEnd,
    // Actions
    addPoint, confirmPointType, confirmPlayer, confirmSideChange,
    requestEnd, confirmEnd, cancelEnd,
    // Internal helpers exposed for composer
    setServeIndex,
    resetScoring,
    applySavedScoring,
    snapshot,
    applySnapshot,
  };
}
