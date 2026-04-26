import { useState, useEffect, useRef } from "react";
import { uid } from "../lib/utils";

export const SAVE_KEY = "bv_live_game";

export const loadSaved = () => {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
};

export function useLiveGame({ teams, players, informalMode, tournamentMatches, preloadMatchId, t, setsPerMatch = 1 }) {
  // ── Restore-prompt state ─────────────────────────────────────────────────
  const [showRestore, setShowRestore] = useState(() => !!loadSaved());

  // ── Setup state ──────────────────────────────────────────────────────────
  const [team1Id, setTeam1Id] = useState("");
  const [team2Id, setTeam2Id] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [activeTourMatchId, setActiveTourMatchId] = useState(preloadMatchId);

  // ── Informal mode wizard state ────────────────────────────────────────────
  const [informalStep, setInformalStep] = useState("config");
  const [informalSets, setInformalSets] = useState(1);
  const [informalTeamSize, setInformalTeamSize] = useState(2);
  const [informalTeam1, setInformalTeam1] = useState({ name: "", players: [] });
  const [informalTeam2, setInformalTeam2] = useState({ name: "", players: [] });

  // ── Serve order ──────────────────────────────────────────────────────────
  const [t1ServeOrder, setT1ServeOrder] = useState([]);
  const [t2ServeOrder, setT2ServeOrder] = useState([]);
  const [t1FirstServer, setT1FirstServer] = useState(0);
  const [t2FirstServer, setT2FirstServer] = useState(0);
  const [t1InitialSide, setT1InitialSide] = useState("left");
  const [firstServingTeam, setFirstServingTeam] = useState(1);

  // ── In-game state ────────────────────────────────────────────────────────
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [serveIndex, setServeIndex] = useState(0);
  const [side, setSide] = useState({ t1: "left", t2: "right" });
  const [points, setPoints] = useState(0);
  const [log, setLog] = useState([]);
  const [sets, setSets] = useState([]);
  const [winner, setWinner] = useState(null);
  const [pointsToWin, setPointsToWin] = useState(21);
  const [pendingSideChange, setPendingSideChange] = useState(null);
  const [pendingUndo, setPendingUndo] = useState(false);
  const [history, setHistory] = useState([]);
  const [pendingPoint, setPendingPoint] = useState(null);
  const [pendingPlayerSelect, setPendingPlayerSelect] = useState(null);
  const logRef = useRef(null);

  // ── Preload match from fixture ────────────────────────────────────────────
  useEffect(() => {
    if (!preloadMatchId || !tournamentMatches) return;
    const match = tournamentMatches.find(m => m.id === preloadMatchId);
    if (!match) return;
    setActiveTourMatchId(preloadMatchId);
    setTeam1Id(match.team1);
    setTeam2Id(match.team2);
    const o1 = (() => { const tm = teams.find(t => t.id === match.team1); if (!tm) return []; return tm.players && tm.players.length ? tm.players : [tm.player1, tm.player2].filter(Boolean); })();
    const o2 = (() => { const tm = teams.find(t => t.id === match.team2); if (!tm) return []; return tm.players && tm.players.length ? tm.players : [tm.player1, tm.player2].filter(Boolean); })();
    setT1ServeOrder(o1);
    setT2ServeOrder(o2);
  }, [preloadMatchId]);

  // ── Auto-save to localStorage ────────────────────────────────────────────
  useEffect(() => {
    if (!gameStarted) return;
    const snapshot = {
      team1Id, team2Id, gameStarted,
      t1FirstServer, t2FirstServer, t1InitialSide,
      score1, score2, serveIndex, side, points,
      log, sets, winner, pointsToWin, history,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot)); } catch {}
  }, [gameStarted, score1, score2, serveIndex, side, points, log, sets, winner, pointsToWin, history]);

  // ── Scroll log to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getTeam = id => {
    const real = teams.find(tm => tm.id === id);
    if (real) return real;
    if (informalMode) {
      if (id === "informal_1") return { id: "informal_1", name: informalTeam1.name || "Team 1",
        players: (informalTeam1.players || []).map(s => s.type === "global" ? s.playerId : "free_" + (s.name || "")) };
      if (id === "informal_2") return { id: "informal_2", name: informalTeam2.name || "Team 2",
        players: (informalTeam2.players || []).map(s => s.type === "global" ? s.playerId : "free_" + (s.name || "")) };
    }
    return null;
  };

  const getPlayer = id => {
    if (id && id.startsWith("free_")) return { id, name: id.slice(5) };
    return players.find(p => p.id === id);
  };

  const teamPlayerIds = (teamId) => {
    const team = teams.find(tm => tm.id === teamId);
    if (!team) return [];
    if (team.players && team.players.length > 0) return team.players;
    return [team.player1, team.player2].filter(Boolean);
  };

  const teamPlayers = (teamId, firstServerIdx) => {
    const pIds = teamPlayerIds(teamId);
    if (pIds.length === 0) return [null, null];
    if (firstServerIdx === 0) return pIds;
    return [...pIds.slice(firstServerIdx), ...pIds.slice(0, firstServerIdx)];
  };

  const serveRotation = () => {
    const o1 = t1ServeOrder.length > 0 ? t1ServeOrder : teamPlayers(team1Id, t1FirstServer);
    const o2 = t2ServeOrder.length > 0 ? t2ServeOrder : teamPlayers(team2Id, t2FirstServer);
    const maxLen = Math.max(o1.length, o2.length, 1);
    const slots = [];
    for (let i = 0; i < maxLen; i++) {
      if (i < o1.length) slots.push({ team: 1, playerId: o1[i] });
      if (i < o2.length) slots.push({ team: 2, playerId: o2[i] });
    }
    return slots.length > 0 ? slots : [{ team: 1, playerId: null }, { team: 2, playerId: null }];
  };

  const currentServer = () => {
    const rot = serveRotation();
    return rot[serveIndex % rot.length];
  };

  const playerName = id => getPlayer(id)?.name || "?";
  const tName      = id => getTeam(id)?.name || "?";

  // ── Point types ───────────────────────────────────────────────────────────
  const POINT_TYPES = [
    { id: "ace",   label: t("ptAce"),   icon: "🎯", desc: t("ptAceDesc") },
    { id: "spike", label: t("ptSpike"), icon: "💥", desc: t("ptSpikeDesc") },
    { id: "block", label: t("ptBlock"), icon: "🛡️", desc: t("ptBlockDesc") },
    { id: "tip",   label: t("ptTip"),   icon: "🤏", desc: t("ptTipDesc") },
    { id: "error", label: t("ptError"), icon: "❌", desc: t("ptErrorDesc") },
  ];

  // ── Add point ─────────────────────────────────────────────────────────────
  const addPoint = (teamNum) => { setPendingPoint({ teamNum }); };

  const confirmPointType = (ptId) => {
    if (!pendingPoint) return;
    const teamNum = pendingPoint.teamNum;
    setPendingPoint(null);
    if (ptId === "ace") {
      resolvePoint(teamNum, ptId, currentServer().playerId);
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

  const resolvePoint = (teamNum, ptId, playerId = null) => {
    const newS1 = teamNum === 1 ? score1 + 1 : score1;
    const newS2 = teamNum === 2 ? score2 + 1 : score2;
    const newPoints = points + 1;

    const srv = currentServer();
    let newServeIndex = serveIndex;
    if (srv.team !== teamNum) {
      const rot = serveRotation();
      for (let i = 1; i <= rot.length; i++) {
        const candidate = (serveIndex + i) % rot.length;
        if (rot[candidate].team === teamNum) { newServeIndex = candidate; break; }
      }
    }

    const isSideChange = newPoints % 7 === 0;
    const newSide = isSideChange
      ? { t1: side.t1 === "left" ? "right" : "left", t2: side.t2 === "left" ? "right" : "left" }
      : side;

    const rot = serveRotation();
    const newServer = rot[newServeIndex % rot.length];
    const pt = POINT_TYPES.find(p => p.id === ptId) || POINT_TYPES[4];

    let streak = 1;
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].team === teamNum) streak++; else break;
    }

    const logEntry = {
      id: uid(), timestamp: Date.now(),
      team: teamNum, t1: newS1, t2: newS2,
      setNum: sets.length + 1, pointNum: newPoints,
      pointType: ptId, pointTypeLabel: pt.label, pointTypeIcon: pt.icon,
      serverPlayerId: srv.playerId, serverTeam: srv.team,
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

  const applyPoint = ({ newS1, newS2, newPoints, newServeIndex, newSide, logEntry }) => {
    setHistory(prev => [...prev, { score1, score2, serveIndex, side: { ...side }, points, log: [...log], sets: [...sets] }]);
    setScore1(newS1); setScore2(newS2);
    setServeIndex(newServeIndex);
    setSide(newSide);
    setPoints(newPoints);
    setLog(prev => [...prev, logEntry]);

    const isWin = (s, opp) => s >= pointsToWin && s - opp >= 2;
    if (isWin(newS1, newS2)) endSet(1, newS1, newS2, newServeIndex);
    else if (isWin(newS2, newS1)) endSet(2, newS1, newS2, newServeIndex);
  };

  const confirmSideChange = () => {
    if (!pendingSideChange) return;
    applyPoint(pendingSideChange);
    setPendingSideChange(null);
  };

  // ── End set ───────────────────────────────────────────────────────────────
  const endSet = (winnerTeam, s1, s2, si) => {
    const newSets = [...sets, { winner: winnerTeam, s1, s2 }];
    setSets(newSets);
    const t1Sets = newSets.filter(s => s.winner === 1).length;
    const t2Sets = newSets.filter(s => s.winner === 2).length;
    const effectiveSets = informalMode ? informalSets : setsPerMatch;
    const setsToWin = Math.ceil(effectiveSets / 2);
    if (t1Sets >= setsToWin) { setWinner(1); return; }
    if (t2Sets >= setsToWin) { setWinner(2); return; }
    setScore1(0); setScore2(0); setPoints(0);
    setSide({ t1: "left", t2: "right" });
    const loserTeam = winnerTeam === 1 ? 2 : 1;
    const rot = serveRotation();
    const firstLoserSlot = rot.findIndex(r => r.team === loserTeam);
    setServeIndex(firstLoserSlot);
    setLog(prev => [...prev, { id: uid(), msg: `🏐 SET ${newSets.length} ENDED — New set`, sideChange: false }]);
    if (newSets.length === effectiveSets - 1) setPointsToWin(15);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setTeam1Id(""); setTeam2Id(""); setGameStarted(false);
    setScore1(0); setScore2(0); setServeIndex(0); setPoints(0);
    setSide({ t1: "left", t2: "right" }); setLog([]); setSets([]);
    setWinner(null); setPointsToWin(21); setPendingSideChange(null);
    setHistory([]); setPendingUndo(false); setPendingPoint(null); setPendingPlayerSelect(null);
    setT1ServeOrder([]); setT2ServeOrder([]);
    if (informalMode) {
      setInformalStep("config");
      setInformalTeam1({ name: "", players: [] });
      setInformalTeam2({ name: "", players: [] });
    }
    setT1FirstServer(0); setT2FirstServer(0); setT1InitialSide("left");
  };

  // ── Undo ──────────────────────────────────────────────────────────────────
  const requestUndo = () => { if (history.length > 0) setPendingUndo(true); };

  const confirmUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setScore1(prev.score1); setScore2(prev.score2);
    setServeIndex(prev.serveIndex); setSide(prev.side);
    setPoints(prev.points); setLog(prev.log);
    if (prev.sets !== undefined) setSets(prev.sets);
    setWinner(null);
    setHistory(h => h.slice(0, -1));
    setPendingUndo(false);
  };

  const cancelUndo = () => setPendingUndo(false);

  // ── End (finish match) ────────────────────────────────────────────────────
  const [pendingEnd, setPendingEnd] = useState(false);
  const requestEnd = () => setPendingEnd(true);
  const confirmEnd = () => {
    setPendingEnd(false);
    // If nothing has been played at all, just reset without showing stats
    if (score1 === 0 && score2 === 0 && sets.length === 0) { reset(); return; }
    // Finalize the in-progress set (if any points were played in it)
    let finalSets = [...sets];
    if (score1 > 0 || score2 > 0) {
      const setWin = score1 > score2 ? 1 : score2 > score1 ? 2 : 1;
      finalSets = [...sets, { winner: setWin, s1: score1, s2: score2 }];
      setSets(finalSets);
    }
    // Determine overall match winner (sets won, then score as tiebreaker)
    const t1S = finalSets.filter(s => s.winner === 1).length;
    const t2S = finalSets.filter(s => s.winner === 2).length;
    const matchWinner = t1S > t2S ? 1 : t2S > t1S ? 2 : (score1 >= score2 ? 1 : 2);
    setWinner(matchWinner);
  };
  const cancelEnd = () => setPendingEnd(false);

  // ── Restore / discard saved game ──────────────────────────────────────────
  const restoreGame = () => {
    const s = loadSaved();
    if (!s) return;
    setTeam1Id(s.team1Id); setTeam2Id(s.team2Id); setGameStarted(s.gameStarted);
    setT1FirstServer(s.t1FirstServer); setT2FirstServer(s.t2FirstServer);
    setT1InitialSide(s.t1InitialSide);
    setScore1(s.score1); setScore2(s.score2); setServeIndex(s.serveIndex);
    setSide(s.side); setPoints(s.points); setLog(s.log); setSets(s.sets);
    setWinner(s.winner); setPointsToWin(s.pointsToWin); setHistory(s.history || []);
    setShowRestore(false);
  };

  const discardSaved = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setShowRestore(false);
  };

  // ── Start game (sets correct initial serve index) ─────────────────────────
  const startGame = () => {
    if (firstServingTeam === 2) {
      const rot = serveRotation();
      const firstT2Slot = rot.findIndex(r => r.team === 2);
      setServeIndex(firstT2Slot >= 0 ? firstT2Slot : 0);
    } else {
      setServeIndex(0);
    }
    setGameStarted(true);
  };

  return {
    // Restore
    showRestore, restoreGame, discardSaved,
    // Setup
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
    t1InitialSide, setT1InitialSide,
    firstServingTeam, setFirstServingTeam,
    setSide, setPointsToWin,
    startGame,
    // In-game state
    score1, score2, serveIndex, side, points,
    log, logRef, sets, winner, pointsToWin, history,
    // Dialogs
    pendingSideChange, pendingUndo,
    pendingPoint, setPendingPoint,
    pendingPlayerSelect,
    pendingEnd,
    // Derived helpers
    serveRotation, currentServer,
    serverTeam: currentServer().team,
    playerName, tName, POINT_TYPES,
    // Actions
    addPoint, confirmPointType, confirmPlayer, confirmSideChange,
    reset, requestUndo, confirmUndo, cancelUndo,
    requestEnd, confirmEnd, cancelEnd,
  };
}
