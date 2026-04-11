/*
 * ARENIX TOURNAMENT MANAGER
 * =================================
 * Single-file React prototype — ready to be split into components
 *
 * ✅ DONE:
 *  - Global player ranking with levels (Beginner / Intermediate / Advanced)
 *  - Tournament management: create, invite players, build teams (manual / random / balanced by level)
 *  - Contextual navbar: global (Live, Tournaments, Players) ↔ tournament (Live, Fixture, Teams, Players)
 *  - Tournament fixture: generate matches, load results, standings
 *  - Live score (tournament): open from fixture with preloaded teams, save result back to fixture
 *  - Live score (informal): 4-step wizard (config → team 1 → team 2 → serve order + side)
 *    Players can be picked from global list or entered as free-text names
 *  - Serve rotation: supports 2 and 3-player teams, reorder with ↑ buttons
 *  - Point type tracking: Ace, Spike, Block, Tip, Rival error
 *  - Side change dialog with visual team swap on screen
 *  - Undo with full snapshot restore
 *  - End-game stats: points by type, serve efficiency, streaks, players
 *  - localStorage auto-save + restore prompt
 *  - i18n: ES / EN / PT / IT (nav + live section translated, others pending)
 *
 * 🔲 TODO (good candidates for Claude Code):
 *  - Split into component files (components/, hooks/, context/, lib/)
 *  - Complete translations for Tournaments, Teams, Players sections
 *  - Connect Supabase: persist players, tournaments, match history
 *  - Player profile with match history
 *  - Tournament bracket / elimination format (alternative to round-robin)
 *  - Sets per match properly enforced in live (currently 1 set = 21pts)
 *  - Share match result (WhatsApp / image)
 *  - PWA support (installable, offline)
 */

import React, { useState, useEffect, useRef, useContext } from "react";
import { G, globalStyle, Card, Btn, Badge, Input, Select, Modal } from "./components/ui";
import PlayersSection from "./components/PlayersSection";
import TournamentsSection from "./components/TournamentsSection";
import TournamentMatchesSection from "./components/TournamentMatchesSection";
import TournamentTeamsSection from "./components/TournamentTeamsSection";

const LangCtx = React.createContext({ lang: "es", t: (k) => k });

// ── Helpers ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8);
const now = () => new Date().toLocaleDateString("es-UY");

// ── Initial Data ─────────────────────────────────────────────────────────────
const LEVELS = [
  { id: "beginner",     label: "Beginner",    color: G.success,  icon: "🟢" },
  { id: "intermediate", label: "Intermedio",  color: G.warn,     icon: "🟡" },
  { id: "advanced",     label: "Avanzado",    color: G.danger,   icon: "🔴" },
];
const levelOf = (id) => LEVELS.find(l => l.id === id) || LEVELS[0];

const initialPlayers = [
  { id: "p1", name: "Matías Torres",    wins: 12, losses: 3, points: 240, level: "advanced" },
  { id: "p2", name: "Camila Rodríguez", wins: 10, losses: 4, points: 204, level: "advanced" },
  { id: "p3", name: "Bruno Fernández",  wins: 9,  losses: 5, points: 186, level: "intermediate" },
  { id: "p4", name: "Valentina López",  wins: 8,  losses: 4, points: 172, level: "intermediate" },
  { id: "p5", name: "Diego Pérez",      wins: 7,  losses: 6, points: 148, level: "beginner" },
  { id: "p6", name: "Sofía García",     wins: 6,  losses: 7, points: 126, level: "beginner" },
];

// Tournaments now own their teams. No global initialTeams.
const initialTournaments = [];

// ── SECTION: LIVE SCORE ───────────────────────────────────────────────────────
/*
  SERVE ROTATION LOGIC
  ─────────────────────
  The serve order cycles globally across ALL players in both teams:
    [t1.playerA, t2.playerA, t1.playerB, t2.playerB, t1.playerA, ...]
  "playerA" = the player chosen to serve 1st for that team (positions 1 & 3)
  "playerB" = the other player (positions 2 & 4 in the global order)

  State `serveIndex` tracks position in that 4-element rotation.
  When a team scores, serveIndex advances to the next slot if that team was NOT
  already serving (i.e., a side-out happened). If they were already serving,
  index stays the same (they keep serving).
*/

const SAVE_KEY = "bv_live_game";

const loadSaved = () => {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
};

function LiveScoreSection(props) {
  const { teams, players, setsPerMatch = 1, preloadMatchId = null,
    tournamentMatches = null, onSaveResult = null, informalMode = false } = props;
  const { t } = useContext(LangCtx);
  // ── Restore-prompt state ─────────────────────────────────────────────────
  const [showRestore, setShowRestore] = useState(() => !!loadSaved());

  // ── Setup state ──────────────────────────────────────────────────────────
  const [team1Id, setTeam1Id] = useState("");
  const [team2Id, setTeam2Id] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  // Which tournament match is being played (id or null)
  const [activeTourMatchId, setActiveTourMatchId] = useState(preloadMatchId);

  // ── Informal mode wizard state ────────────────────────────────────────────
  // step: "config" | "team1" | "team2" | "serve"
  const [informalStep, setInformalStep] = useState("config");
  const [informalSets, setInformalSets] = useState(1);
  const [informalTeamSize, setInformalTeamSize] = useState(2);
  // Each team: { name, players: [{type:"global"|"free", playerId?:string, name?:string}] }
  const [informalTeam1, setInformalTeam1] = useState({ name: "", players: [] });
  const [informalTeam2, setInformalTeam2] = useState({ name: "", players: [] });

  // When preloadMatchId changes (from fixture), preload teams + serve orders
  useEffect(() => {
    if (!preloadMatchId || !tournamentMatches) return;
    const match = tournamentMatches.find(m => m.id === preloadMatchId);
    if (!match) return;
    setActiveTourMatchId(preloadMatchId);
    setTeam1Id(match.team1);
    setTeam2Id(match.team2);
    // Init serve order to default player order for each team
    const o1 = (() => { const tm = teams.find(t => t.id === match.team1); if (!tm) return []; return tm.players && tm.players.length ? tm.players : [tm.player1, tm.player2].filter(Boolean); })();
    const o2 = (() => { const tm = teams.find(t => t.id === match.team2); if (!tm) return []; return tm.players && tm.players.length ? tm.players : [tm.player1, tm.player2].filter(Boolean); })();
    setT1ServeOrder(o1);
    setT2ServeOrder(o2);
  }, [preloadMatchId]);

  // Serve-order setup: full ordered array of player IDs per team
  const [t1ServeOrder, setT1ServeOrder] = useState([]);
  const [t2ServeOrder, setT2ServeOrder] = useState([]);
  // Legacy fallback
  const [t1FirstServer, setT1FirstServer] = useState(0);
  const [t2FirstServer, setT2FirstServer] = useState(0);

  // Initial sides
  const [t1InitialSide, setT1InitialSide] = useState("left");

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
  // Side-change dialog
  const [pendingSideChange, setPendingSideChange] = useState(null);
  // Undo confirmation
  const [pendingUndo, setPendingUndo] = useState(false);
  // Full game snapshot stack for undo
  const [history, setHistory] = useState([]);
  // Point type selection dialog
  const [pendingPoint, setPendingPoint] = useState(null); // { teamNum } | null
  const logRef = useRef(null);

  // ── Auto-save to localStorage on every meaningful state change ───────────
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

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // ── Restore saved game ───────────────────────────────────────────────────
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

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getTeam = id => {
    const real = teams.find(tm => tm.id === id);
    if (real) return real;
    if (informalMode) {
      if (id === "informal_1") return { id: "informal_1", name: informalTeam1.name || "Equipo 1",
        players: (informalTeam1.players || []).map(s => s.type === "global" ? s.playerId : "free_" + (s.name || "")) };
      if (id === "informal_2") return { id: "informal_2", name: informalTeam2.name || "Equipo 2",
        players: (informalTeam2.players || []).map(s => s.type === "global" ? s.playerId : "free_" + (s.name || "")) };
    }
    return null;
  };
  const getPlayer = id => {
    if (id && id.startsWith("free_")) return { id, name: id.slice(5) };
    return players.find(p => p.id === id);
  };

  // Works with both old {player1,player2} and new {players:[]} team shapes
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

  // Build serve rotation interleaving teams: [t1A,t2A,t1B,t2B] or [t1A,t2A,t1B,t2B,t1C,t2C]
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
  const tName = id => getTeam(id)?.name || "?";

  // ── Point types ────────────────────────────────────────────────────────────
  const POINT_TYPES = [
    { id: "ace",   label: t("ptAce"),   icon: "🎯", desc: t("ptAceDesc") },
    { id: "spike", label: t("ptSpike"), icon: "💥", desc: t("ptSpikeDesc") },
    { id: "block", label: t("ptBlock"), icon: "🛡️", desc: t("ptBlockDesc") },
    { id: "tip",   label: t("ptTip"),   icon: "🤏", desc: t("ptTipDesc") },
    { id: "error", label: t("ptError"), icon: "❌", desc: t("ptErrorDesc") },
  ];

  // ── Add point: open type dialog first ────────────────────────────────────
  const addPoint = (teamNum) => { setPendingPoint({ teamNum }); };

  const confirmPointType = (ptId) => {
    if (!pendingPoint) return;
    const teamNum = pendingPoint.teamNum;
    setPendingPoint(null);
    resolvePoint(teamNum, ptId);
  };

  const resolvePoint = (teamNum, ptId) => {
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

    const rot = serveRotation(); const newServer = rot[newServeIndex % rot.length];
    const pt = POINT_TYPES.find(p => p.id === ptId) || POINT_TYPES[4];

    // streak
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

  const applyPoint = ({ newS1, newS2, newPoints, newServeIndex, newSide, logEntry, setOver }) => {
    // Save snapshot before applying so undo can restore exactly
    setHistory(prev => [...prev, { score1, score2, serveIndex, side: { ...side }, points, log: [...log] }]);
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
    if (t1Sets >= 2) { setWinner(1); return; }
    if (t2Sets >= 2) { setWinner(2); return; }
    setScore1(0); setScore2(0); setPoints(0);
    setSide({ t1: "left", t2: "right" });
    // Loser of the set serves first in next set → find first slot of loser team
    const loserTeam = winnerTeam === 1 ? 2 : 1;
    const rot = serveRotation();
    const firstLoserSlot = rot.findIndex(r => r.team === loserTeam);
    setServeIndex(firstLoserSlot);
    setLog(prev => [...prev, { id: uid(), msg: `🏐 SET ${newSets.length} TERMINADO — Nuevo set`, sideChange: false }]);
    if (newSets.length === 2) setPointsToWin(15);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setTeam1Id(""); setTeam2Id(""); setGameStarted(false);
    setScore1(0); setScore2(0); setServeIndex(0); setPoints(0);
    setSide({ t1: "left", t2: "right" }); setLog([]); setSets([]);
    setWinner(null); setPointsToWin(21); setPendingSideChange(null);
    setHistory([]); setPendingUndo(false); setPendingPoint(null); setT1ServeOrder([]); setT2ServeOrder([]);
    if (informalMode) { setInformalStep("config"); setInformalTeam1({ name: "", players: [] }); setInformalTeam2({ name: "", players: [] }); }
    setT1FirstServer(0); setT2FirstServer(0); setT1InitialSide("left");
  };

  // ── Undo ──────────────────────────────────────────────────────────────────
  const requestUndo = () => {
    if (history.length === 0) return;
    setPendingUndo(true);
  };

  const confirmUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setScore1(prev.score1);
    setScore2(prev.score2);
    setServeIndex(prev.serveIndex);
    setSide(prev.side);
    setPoints(prev.points);
    setLog(prev.log);
    setHistory(h => h.slice(0, -1));
    setPendingUndo(false);
  };

  const cancelUndo = () => setPendingUndo(false);

  // ── SETUP SCREEN ──────────────────────────────────────────────────────────
  // If coming from fixture with preloaded match, auto-start
  useEffect(() => {
    if (preloadMatchId && tournamentMatches && team1Id && team2Id && !gameStarted) {
      setGameStarted(true);
    }
  }, [team1Id, team2Id]);

  if (showRestore) {
    const s = loadSaved();
    const t1name = s ? (teams.find(tm => tm.id === s.team1Id)?.name || "?") : "?";
    const t2name = s ? (teams.find(tm => tm.id === s.team2Id)?.name || "?") : "?";
    return (
      <div>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color: G.ocean, letterSpacing: 2, marginBottom: 20 }}>
          {t("liveTitle")}
        </h1>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💾</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: G.ocean, letterSpacing: 1, marginBottom: 6 }}>
            {t("savedGameTitle")}
          </div>
          <div style={{ fontSize: 14, color: G.textLight, marginBottom: 20 }}>
            {t("savedGameMsg")}
          </div>
          {s && (
            <div style={{ background: G.sand, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 42, color: G.text, lineHeight: 1, marginBottom: 6 }}>
                {s.score1} – {s.score2}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: G.text, marginBottom: 4 }}>
                {t1name} vs {t2name}
              </div>
              <div style={{ fontSize: 13, color: G.textLight }}>
                {s.sets.length > 0 ? `${t("savedSet")}` : t("savedSet1")} · {s.points} {t("savedPts")}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            <Btn onClick={restoreGame} variant="sun" size="lg">{t("continueMatch")}</Btn>
            <Btn onClick={discardSaved} variant="secondary" size="lg">{t("discardMatch")}</Btn>
          </div>
        </Card>
      </div>
    );
  }

  if (!gameStarted) {

    // ── INFORMAL MODE WIZARD ────────────────────────────────────────────────
    if (informalMode) {

      // Helper: resolve a player slot to { id, name } for display and rotation
      const resolveSlot = (slot) => {
        if (slot.type === "global") {
          const p = players.find(p => p.id === slot.playerId);
          return { id: slot.playerId, name: p?.name || "?" };
        }
        return { id: "free_" + slot.name, name: slot.name || "?" };
      };

      // Build ad-hoc team object from informalTeam for rotation
      const buildTeamObj = (infTeam, teamNum) => ({
        id: "informal_" + teamNum,
        name: infTeam.name || "Equipo " + teamNum,
        players: infTeam.players.map(s => resolveSlot(s).id),
      });

      // ── Step: config ──────────────────────────────────────────────────────
      if (informalStep === "config") return (
        <div>
          <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 34, color: G.ocean, letterSpacing: 2, marginBottom: 20 }}>
            🏐 PARTIDO INFORMAL
          </h1>
          <Card>
            <div style={{ display: "grid", gap: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Jugadores por equipo
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {[2, 3].map(n => (
                    <button key={n} onClick={() => setInformalTeamSize(n)} style={{
                      flex: 1, padding: "14px", borderRadius: 12, border: "2px solid",
                      borderColor: informalTeamSize === n ? G.ocean : G.sandDark,
                      background: informalTeamSize === n ? G.ocean + "11" : G.white,
                      fontWeight: informalTeamSize === n ? 700 : 400,
                      fontSize: 15, cursor: "pointer", color: G.text,
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{n === 2 ? "👥" : "👥"}</div>
                      {n} jugadores
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Sets por partido
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {[1, 3, 5].map(n => (
                    <button key={n} onClick={() => setInformalSets(n)} style={{
                      flex: 1, padding: "14px", borderRadius: 12, border: "2px solid",
                      borderColor: informalSets === n ? G.ocean : G.sandDark,
                      background: informalSets === n ? G.ocean + "11" : G.white,
                      fontWeight: informalSets === n ? 700 : 400,
                      fontSize: 15, cursor: "pointer", color: G.text,
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      {n === 1 ? "1 set" : n + " sets"}
                    </button>
                  ))}
                </div>
              </div>
              <Btn onClick={() => {
                setInformalTeam1({ name: "", players: [] });
                setInformalTeam2({ name: "", players: [] });
                setInformalStep("team1");
              }} variant="sun" size="lg">Siguiente →</Btn>
            </div>
          </Card>
        </div>
      );

      // ── Step: team1 / team2 ───────────────────────────────────────────────
      if (informalStep === "team1" || informalStep === "team2") {
        const isTeam1 = informalStep === "team1";
        const infTeam = isTeam1 ? informalTeam1 : informalTeam2;
        const setInfTeam = isTeam1 ? setInformalTeam1 : setInformalTeam2;
        const teamColor = isTeam1 ? G.ocean : G.sun;
        const teamLabel = isTeam1 ? "EQUIPO 1" : "EQUIPO 2";

        const setSlot = (idx, slot) => {
          setInfTeam(prev => {
            const newPlayers = [...prev.players];
            newPlayers[idx] = slot;
            return { ...prev, players: newPlayers };
          });
        };

        const canContinue = infTeam.name.trim() &&
          infTeam.players.length === informalTeamSize &&
          infTeam.players.every(s => s && (s.type === "global" ? s.playerId : s.name?.trim()));

        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <button onClick={() => setInformalStep(isTeam1 ? "config" : "team1")} style={{
                background: "none", border: "none", fontSize: 20, cursor: "pointer", color: G.ocean,
              }}>←</button>
              <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: teamColor, letterSpacing: 2 }}>
                {teamLabel}
              </h1>
              <div style={{ fontSize: 13, color: G.textLight, marginLeft: "auto" }}>
                Paso {isTeam1 ? "2" : "3"} de 4
              </div>
            </div>
            <Card>
              <div style={{ display: "grid", gap: 16 }}>
                <Input
                  value={infTeam.name}
                  onChange={v => setInfTeam(prev => ({ ...prev, name: v }))}
                  placeholder={"Nombre del " + (isTeam1 ? "equipo 1" : "equipo 2")}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Jugadores ({informalTeamSize})
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {Array.from({ length: informalTeamSize }).map((_, idx) => {
                      const slot = infTeam.players[idx];
                      return (
                        <div key={idx} style={{ background: G.sand, borderRadius: 12, padding: "12px 14px" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: teamColor, marginBottom: 8 }}>
                            Jugador {idx + 1}
                          </div>
                          {/* Toggle type */}
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            {[
                              { type: "global", label: "👤 De la lista" },
                              { type: "free",   label: "✏️ Nombre libre" },
                            ].map(opt => (
                              <button key={opt.type} onClick={() => setSlot(idx, { type: opt.type, playerId: "", name: "" })} style={{
                                flex: 1, padding: "8px", borderRadius: 8, border: "2px solid",
                                borderColor: slot?.type === opt.type ? teamColor : G.sandDark,
                                background: slot?.type === opt.type ? teamColor + "18" : G.white,
                                fontWeight: slot?.type === opt.type ? 700 : 400,
                                fontSize: 12, cursor: "pointer", color: slot?.type === opt.type ? teamColor : G.text,
                                fontFamily: "'DM Sans', sans-serif",
                              }}>{opt.label}</button>
                            ))}
                          </div>
                          {/* Input based on type */}
                          {slot?.type === "global" && (
                            <Select value={slot.playerId || ""} onChange={v => setSlot(idx, { type: "global", playerId: v })}>
                              <option value="">Elegir jugador...</option>
                              {players.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </Select>
                          )}
                          {slot?.type === "free" && (
                            <Input
                              value={slot.name || ""}
                              onChange={v => setSlot(idx, { type: "free", name: v })}
                              placeholder={"Nombre del jugador " + (idx + 1)}
                            />
                          )}
                          {!slot && (
                            <div style={{ fontSize: 13, color: G.textLight }}>
                              Elegí una opción arriba
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Btn onClick={() => {
                  if (isTeam1) {
                    setInformalStep("team2");
                  } else {
                    // Build ad-hoc teams and set up rotation
                    const tm1 = buildTeamObj(informalTeam1, 1);
                    const tm2 = buildTeamObj(infTeam, 2);
                    setTeam1Id(tm1.id);
                    setTeam2Id(tm2.id);
                    setT1ServeOrder(tm1.players);
                    setT2ServeOrder(tm2.players);
                    setInformalStep("serve");
                  }
                }} variant="sun" size="lg" disabled={!canContinue}>
                  {isTeam1 ? "Siguiente → Equipo 2" : "Siguiente → Orden de saque"}
                </Btn>
              </div>
            </Card>
          </div>
        );
      }

      // ── Step: serve + side ────────────────────────────────────────────────
      if (informalStep === "serve") {
        const tm1obj = buildTeamObj(informalTeam1, 1);
        const tm2obj = buildTeamObj(informalTeam2, 2);

        // Override getTeam for informal teams
        const getInfTeam = id => id === tm1obj.id ? tm1obj : id === tm2obj.id ? tm2obj : null;
        const getInfPlayer = id => {
          const allSlots = [...informalTeam1.players, ...informalTeam2.players];
          const slot = allSlots.find(s => resolveSlot(s).id === id);
          return slot ? { id, name: resolveSlot(slot).name } : players.find(p => p.id === id);
        };

        const ServeOrderInformal = ({ teamObj, serveOrder, setServeOrder, color }) => {
          const moveUp = (idx) => {
            if (idx === 0) return;
            const newOrder = [...serveOrder];
            [newOrder[idx-1], newOrder[idx]] = [newOrder[idx], newOrder[idx-1]];
            setServeOrder(newOrder);
          };
          return (
            <div style={{ display: "grid", gap: 8 }}>
              {serveOrder.map((pid, idx) => {
                const pl = getInfPlayer(pid);
                return (
                  <div key={pid + idx} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 12,
                    background: idx === 0 ? color + "18" : G.sand,
                    border: "2px solid " + (idx === 0 ? color : "transparent"),
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: color, display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Bebas Neue'", fontSize: 16, color: G.white,
                    }}>{idx + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: idx === 0 ? 700 : 500, fontSize: 14, color: idx === 0 ? color : G.text }}>
                        {pl?.name || "?"}
                      </div>
                      {idx === 0 && <div style={{ fontSize: 11, color, marginTop: 1 }}>🏐 Saca primero</div>}
                    </div>
                    {idx > 0 && (
                      <button onClick={() => moveUp(idx)} style={{
                        background: G.white, border: "1.5px solid " + G.sandDark,
                        borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 14, color: G.textLight,
                      }}>↑</button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        };

        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <button onClick={() => setInformalStep("team2")} style={{
                background: "none", border: "none", fontSize: 20, cursor: "pointer", color: G.ocean,
              }}>←</button>
              <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: G.ocean, letterSpacing: 2 }}>
                SAQUE Y LADO
              </h1>
              <div style={{ fontSize: 13, color: G.textLight, marginLeft: "auto" }}>Paso 4 de 4</div>
            </div>
            <Card>
              <div style={{ display: "grid", gap: 20 }}>
                {/* Team 1 serve order */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: G.ocean, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {informalTeam1.name || "Equipo 1"} — Orden de saque
                  </div>
                  <ServeOrderInformal teamObj={tm1obj} serveOrder={t1ServeOrder} setServeOrder={setT1ServeOrder} color={G.ocean} />
                </div>
                {/* Team 2 serve order */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: G.sun, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {informalTeam2.name || "Equipo 2"} — Orden de saque
                  </div>
                  <ServeOrderInformal teamObj={tm2obj} serveOrder={t2ServeOrder} setServeOrder={setT2ServeOrder} color={G.sun} />
                </div>
                {/* Initial side */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Lado inicial — {informalTeam1.name || "Equipo 1"}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {["left", "right"].map(s => (
                      <button key={s} onClick={() => { setT1InitialSide(s); setSide({ t1: s, t2: s === "left" ? "right" : "left" }); }} style={{
                        flex: 1, padding: "12px", borderRadius: 10, border: "2px solid",
                        borderColor: t1InitialSide === s ? G.ocean : G.sandDark,
                        background: t1InitialSide === s ? G.ocean + "11" : G.white,
                        fontWeight: t1InitialSide === s ? 700 : 400,
                        fontSize: 14, cursor: "pointer", color: G.text,
                        fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {s === "left" ? t("sideLeft") : t("sideRight")}
                      </button>
                    ))}
                  </div>
                </div>
                <Btn onClick={() => {
                  // Inject informal teams into the teams array temporarily via a trick:
                  // We store player names in the log/state so scoreboard can show them
                  setPointsToWin(informalSets === 1 ? 21 : 21);
                  setGameStarted(true);
                }} variant="sun" size="lg">
                  {t("startMatch")}
                </Btn>
              </div>
            </Card>
          </div>
        );
      }
    }
    // ── END INFORMAL MODE WIZARD ────────────────────────────────────────────

    // ── TOURNAMENT / MANUAL SETUP ──────────────────────────────────────────
    const t1 = getTeam(team1Id);
    const t2 = getTeam(team2Id);

    const ServeOrderPicker = ({ teamId, serveOrder, setServeOrder, color }) => {
      const pIds = teamPlayerIds(teamId);
      if (pIds.length === 0) return null;
      if (serveOrder.length === 0) {
        setTimeout(() => setServeOrder(pIds), 0);
        return null;
      }
      const moveUp = (idx) => {
        if (idx === 0) return;
        const o = [...serveOrder];
        [o[idx-1], o[idx]] = [o[idx], o[idx-1]];
        setServeOrder(o);
      };
      return (
        <div style={{ display: "grid", gap: 8 }}>
          {serveOrder.map((pid, idx) => {
            const pl = getPlayer(pid);
            return (
              <div key={pid + idx} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 12,
                background: idx === 0 ? color + "18" : G.sand,
                border: "2px solid " + (idx === 0 ? color : "transparent"),
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: color, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Bebas Neue'", fontSize: 16, color: G.white,
                }}>{idx + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: idx === 0 ? 700 : 500, fontSize: 14, color: idx === 0 ? color : G.text }}>
                    {pl?.name || "?"}
                  </div>
                  {idx === 0 && <div style={{ fontSize: 11, color, marginTop: 1 }}>🏐 Saca primero</div>}
                </div>
                {idx > 0 && (
                  <button onClick={() => moveUp(idx)} style={{
                    background: G.white, border: "1.5px solid " + G.sandDark,
                    borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 14, color: G.textLight,
                  }}>↑</button>
                )}
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: G.textLight, marginTop: 2 }}>Usá ↑ para cambiar el orden</div>
        </div>
      );
    };

    const canStart = team1Id && team2Id &&
      t1ServeOrder.length === teamPlayerIds(team1Id).length &&
      t2ServeOrder.length === teamPlayerIds(team2Id).length;

    return (
      <div>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 34, color: G.ocean, letterSpacing: 2, marginBottom: 20 }}>
          {t("liveTitle")}
        </h1>
        <Card>
          <div style={{ display: "grid", gap: 20 }}>
            {/* Match picker for tournament mode */}
            {tournamentMatches && tournamentMatches.length > 0 ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Partidos pendientes del torneo
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {tournamentMatches.filter(m => !m.played).map(m => {
                    const tm1 = teams.find(tm => tm.id === m.team1);
                    const tm2 = teams.find(tm => tm.id === m.team2);
                    const selected = team1Id === m.team1 && team2Id === m.team2;
                    return (
                      <div key={m.id} onClick={() => {
                        setTeam1Id(m.team1); setTeam2Id(m.team2);
                        setActiveTourMatchId(m.id);
                        setT1ServeOrder(teamPlayerIds(m.team1));
                        setT2ServeOrder(teamPlayerIds(m.team2));
                      }} style={{
                        padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                        border: "2px solid " + (selected ? G.ocean : G.sandDark),
                        background: selected ? G.ocean + "11" : G.sand, transition: "all 0.15s",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: selected ? 6 : 0 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: selected ? G.ocean : G.text }}>{tm1?.name || "?"}</span>
                          <span style={{ color: G.textLight, fontWeight: 700, fontSize: 12 }}>VS</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: selected ? G.sun : G.text }}>{tm2?.name || "?"}</span>
                        </div>
                        {selected && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: G.textLight }}>
                            <span>{(tm1?.players || []).map(pid => getPlayer(pid)?.name || "?").join(", ")}</span>
                            <span>{(tm2?.players || []).map(pid => getPlayer(pid)?.name || "?").join(", ")}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {tournamentMatches.filter(m => !m.played).length === 0 && (
                    <div style={{ textAlign: "center", color: G.textLight, padding: 16, fontSize: 14 }}>
                      No hay partidos pendientes en el fixture
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <Select value={team1Id} onChange={v => { setTeam1Id(v); setT1ServeOrder(teamPlayerIds(v)); }}>
                  <option value="">{t("team1ph")}</option>
                  {teams.filter(tm => tm.id !== team2Id).map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                </Select>
                <Select value={team2Id} onChange={v => { setTeam2Id(v); setT2ServeOrder(teamPlayerIds(v)); }}>
                  <option value="">{t("team2ph")}</option>
                  {teams.filter(tm => tm.id !== team1Id).map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                </Select>
              </div>
            )}

            {/* Serve order */}
            {t1 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.ocean, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {t1.name} — {t("serveOrderTitle")}
                </div>
                <ServeOrderPicker teamId={team1Id} serveOrder={t1ServeOrder} setServeOrder={setT1ServeOrder} color={G.ocean} />
              </div>
            )}
            {t2 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.sun, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {t2.name} — {t("serveOrderTitle")}
                </div>
                <ServeOrderPicker teamId={team2Id} serveOrder={t2ServeOrder} setServeOrder={setT2ServeOrder} color={G.sun} />
              </div>
            )}

            {/* Initial side */}
            {t1 && t2 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {t("initialSideOf")} {t1.name}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {["left", "right"].map(s => (
                    <button key={s} onClick={() => { setT1InitialSide(s); setSide({ t1: s, t2: s === "left" ? "right" : "left" }); }} style={{
                      flex: 1, padding: "10px", borderRadius: 10, border: "2px solid",
                      borderColor: t1InitialSide === s ? G.ocean : G.sandDark,
                      background: t1InitialSide === s ? G.ocean + "11" : G.white,
                      fontWeight: t1InitialSide === s ? 700 : 400,
                      fontSize: 14, cursor: "pointer", color: G.text,
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      {s === "left" ? t("sideLeft") : t("sideRight")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Serve preview */}
            {canStart && (
              <div style={{ background: G.sand, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                  {t("serveOrderTitle")}
                </div>
                {serveRotation().map((slot, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
                    borderBottom: i < serveRotation().length - 1 ? "1px solid " + G.sandDark : "none" }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: slot.team === 1 ? G.ocean : G.sun,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, color: G.white, fontWeight: 700,
                    }}>{i + 1}</div>
                    <span style={{ fontSize: 14, color: G.text }}>
                      <b>{playerName(slot.playerId)}</b>
                      <span style={{ color: G.textLight }}> — {tName(slot.team === 1 ? team1Id : team2Id)}</span>
                    </span>
                    {i === 0 && <span style={{ marginLeft: "auto", fontSize: 11, color: G.ocean, fontWeight: 700 }}>{t("serveOrderFirst")}</span>}
                  </div>
                ))}
                <div style={{ fontSize: 11, color: G.textLight, marginTop: 8 }}>{t("serveOrderRepeat")}</div>
              </div>
            )}

            <Btn onClick={() => setGameStarted(true)} variant="sun" size="lg" disabled={!canStart}>
              {t("startMatch")}
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  // ── IN-GAME SCREEN ────────────────────────────────────────────────────────
  const setNum = sets.length + 1;
  const t1Sets = sets.filter(s => s.winner === 1).length;
  const t2Sets = sets.filter(s => s.winner === 2).length;
  const srv = currentServer();
  const rot = serveRotation();
  const nextSrv = rot[(serveIndex + 1) % rot.length];

  return (
    <div>
      {/* Side-change dialog */}
      {pendingSideChange && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: G.white, borderRadius: 24, padding: 32, textAlign: "center",
            maxWidth: 340, width: "100%",
            boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>🔄</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 34, color: G.ocean, letterSpacing: 2, lineHeight: 1.1 }}>
              {t("sideChangeTitle")}
            </div>
            <div style={{ fontSize: 14, color: G.textLight, margin: "14px 0 6px" }}>{t("sideChangeMsg")}</div>

            {/* Visual new layout: who is on left vs right after the swap */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
              {(() => {
                const newLeftId  = pendingSideChange.newSide.t1 === "left" ? team1Id : team2Id;
                const newRightId = pendingSideChange.newSide.t1 === "left" ? team2Id : team1Id;
                const leftColor  = newLeftId === team1Id ? G.ocean : G.sun;
                const rightColor = newRightId === team1Id ? G.ocean : G.sun;
                return (
                  <>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: G.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{t("sideLeft")}</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: leftColor, padding: "8px 10px", background: leftColor + "18", borderRadius: 10 }}>
                        {tName(newLeftId)}
                      </div>
                    </div>
                    <div style={{ fontSize: 22, color: G.textLight, flexShrink: 0 }}>⇄</div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: G.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{t("sideRight")}</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: rightColor, padding: "8px 10px", background: rightColor + "18", borderRadius: 10 }}>
                        {tName(newRightId)}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div style={{ fontSize: 13, color: G.text, marginBottom: 20, padding: "10px 14px", background: G.sand, borderRadius: 10 }}>
              {t("nextServe")} <b>{playerName(serveRotation()[pendingSideChange.newServeIndex % 4].playerId)}</b>
            </div>

            <Btn onClick={confirmSideChange} variant="sun" size="lg" style={{ width: "100%" }}>
              {t("confirmSideChange")}
            </Btn>
          </div>
        </div>
      )}

      {/* Undo confirmation dialog */}
      {pendingUndo && history.length > 0 && (() => {
        const prev = history[history.length - 1];
        const rot = serveRotation();
        const prevServer = rot[prev.serveIndex % 4];
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}>
            <div style={{
              background: G.white, borderRadius: 24, padding: 28, textAlign: "center",
              maxWidth: 340, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
            }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>↩</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: G.danger, letterSpacing: 2, lineHeight: 1.1 }}>
                {t("undoTitle")}
              </div>
              <div style={{ fontSize: 14, color: G.textLight, margin: "12px 0 16px" }}>
                {t("undoMsg")}
              </div>
              <div style={{ background: G.sand, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 42, color: G.text, lineHeight: 1, marginBottom: 8 }}>
                  {prev.score1} – {prev.score2}
                </div>
                <div style={{ fontSize: 13, color: G.textLight, marginBottom: 6 }}>
                  {tName(team1Id)} – {tName(team2Id)}
                </div>
                <div style={{ display: "inline-block", background: G.ocean + "18", borderRadius: 8, padding: "6px 14px" }}>
                  <div style={{ fontSize: 11, color: G.ocean, fontWeight: 700, textTransform: "uppercase" }}>{t("wasServing")}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: G.text }}>{playerName(prevServer.playerId)}</div>
                  <div style={{ fontSize: 12, color: G.textLight }}>{tName(prevServer.team === 1 ? team1Id : team2Id)}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Btn onClick={cancelUndo} variant="secondary" size="lg">{t("cancel")}</Btn>
                <Btn onClick={confirmUndo} variant="danger" size="lg">{t("confirm")}</Btn>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Point type dialog */}
      {pendingPoint && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div style={{
            background: G.white, borderRadius: "24px 24px 0 0",
            padding: "24px 20px 36px", width: "100%", maxWidth: 480,
            boxShadow: "0 -12px 40px rgba(0,0,0,0.25)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{
                display: "inline-block", borderRadius: 12, padding: "6px 18px",
                background: pendingPoint.teamNum === 1 ? G.ocean + "18" : G.sun + "22",
              }}>
                <div style={{ fontSize: 11, color: G.textLight, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("pointFor")}</div>
                <div style={{
                  fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 1,
                  color: pendingPoint.teamNum === 1 ? G.ocean : G.sun,
                }}>
                  {tName(pendingPoint.teamNum === 1 ? team1Id : team2Id)}
                </div>
              </div>
            </div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: G.text, letterSpacing: 1, marginBottom: 14, textAlign: "center" }}>
              {t("howWon")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {POINT_TYPES.filter(p => p.id !== "error").map(pt => (
                <button key={pt.id} onClick={() => confirmPointType(pt.id)} style={{
                  background: G.sand, border: "2px solid " + G.sandDark,
                  borderRadius: 14, padding: "14px 10px", cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", textAlign: "center",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{pt.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: G.text }}>{pt.label}</div>
                  <div style={{ fontSize: 11, color: G.textLight, marginTop: 2 }}>{pt.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={() => confirmPointType("error")} style={{
              width: "100%", background: G.danger + "10",
              border: "2px solid " + G.danger + "44", borderRadius: 14,
              padding: "12px 10px", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 24 }}>❌</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: G.danger }}>{t("ptError")}</div>
                <div style={{ fontSize: 11, color: G.textLight }}>{t("ptErrorDesc")}</div>
              </div>
            </button>
            <button onClick={() => setPendingPoint(null)} style={{
              width: "100%", background: "none", border: "none",
              color: G.textLight, fontSize: 14, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", padding: "6px",
            }}>{t("cancel")}</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button onClick={reset} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: G.ocean }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: G.ocean, letterSpacing: 1, lineHeight: 1 }}>
            {tName(team1Id)} vs {tName(team2Id)}
          </div>
        </div>
      </div>

      {/* Sets */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {sets.map((s, i) => (
          <Badge key={i} color={s.winner === 1 ? G.ocean : G.sun}>Set {i + 1}: {s.s1}–{s.s2}</Badge>
        ))}
        {!winner && <Badge color={G.textLight}>Set {setNum} · {t("setUntil")} {pointsToWin}</Badge>}
      </div>

      {winner ? (() => {
        const pointLog = log.filter(e => e.team);
        const statFor = (tn) => {
          const pts = pointLog.filter(e => e.team === tn);
          const byType = {};
          ["ace","spike","block","tip","error"].forEach(id => { byType[id] = pts.filter(e => e.pointType === id).length; });
          const whileServing   = pts.filter(e => e.serverTeam === tn).length;
          const whileReceiving = pts.filter(e => e.serverTeam !== tn).length;
          let bestStreak = 0, cur = 0;
          pointLog.forEach(e => { if (e.team === tn) { cur++; bestStreak = Math.max(bestStreak, cur); } else cur = 0; });
          const team = tn === 1 ? getTeam(team1Id) : getTeam(team2Id);
          const playerPts = {};
          if (team) teamPlayerIds(tid).forEach(pid => { playerPts[pid] = pts.filter(e => e.serverPlayerId === pid).length; });
          return { total: pts.length, byType, whileServing, whileReceiving, bestStreak, playerPts };
        };
        const s1 = statFor(1), s2 = statFor(2);
        const winnerColor = winner === 1 ? G.ocean : G.sun;
        const winnerDark  = winner === 1 ? G.oceanDark : G.sunDark;

        const CompRow = ({ label, icon, v1, v2 }) => (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: G.ocean }}>{v1}</span>
              <span style={{ color: G.textLight }}>{icon} {label}</span>
              <span style={{ fontWeight: 700, color: G.sun }}>{v2}</span>
            </div>
            <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ flex: v1 || 0.1, background: G.ocean, transition: "flex 0.5s" }} />
              <div style={{ flex: v2 || 0.1, background: G.sun,   transition: "flex 0.5s" }} />
            </div>
          </div>
        );

        return (
          <div>
            <div style={{ background: "linear-gradient(135deg," + winnerColor + "," + winnerDark + ")", borderRadius: 20, padding: "20px 16px", textAlign: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 44 }}>🏆</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: G.white, letterSpacing: 2 }}>{t("winner")}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: G.white }}>{tName(winner === 1 ? team1Id : team2Id)}</div>
              <div style={{ color: G.white + "BB", fontSize: 13, marginTop: 4 }}>
                Sets {t1Sets}–{t2Sets} · {sets.map(s => s.s1 + "-" + s.s2).join("  ")}
              </div>
            </div>

            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: G.ocean, letterSpacing: 1, marginBottom: 12 }}>{t("totalPoints")}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 52, color: G.ocean, lineHeight: 1 }}>{s1.total}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: G.ocean }}>{tName(team1Id)}</div>
                </div>
                <div style={{ textAlign: "center", color: G.textLight, fontSize: 11 }}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22 }}>–</div>
                  {s1.total + s2.total} {t("totalLabel")}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 52, color: G.sun, lineHeight: 1 }}>{s2.total}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: G.sun }}>{tName(team2Id)}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {sets.map((s, i) => (
                  <div key={i} style={{ flex: 1, background: G.sand, borderRadius: 10, padding: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: G.textLight, textTransform: "uppercase" }}>Set {i+1}</div>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20 }}>{s.s1}–{s.s2}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: s.winner === 1 ? G.ocean : G.sun }}>
                      {tName(s.winner === 1 ? team1Id : team2Id).split(" ")[0]}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: G.ocean, letterSpacing: 1, marginBottom: 12 }}>{t("howWonTitle")}</div>
              <CompRow label="Ace"     icon="🎯" v1={s1.byType.ace}   v2={s2.byType.ace} />
              <CompRow label="Remate"  icon="💥" v1={s1.byType.spike} v2={s2.byType.spike} />
              <CompRow label="Bloqueo" icon="🛡️" v1={s1.byType.block} v2={s2.byType.block} />
              <CompRow label="Finta"   icon="🤏" v1={s1.byType.tip}   v2={s2.byType.tip} />
              <CompRow label="Error rival" icon="❌" v1={s1.byType.error} v2={s2.byType.error} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: G.textLight, marginTop: 6, paddingTop: 6, borderTop: "1px solid " + G.sandDark }}>
                <span style={{ color: G.ocean, fontWeight: 700 }}>{tName(team1Id)}</span>
                <span>{t("comparison")}</span>
                <span style={{ color: G.sun, fontWeight: 700 }}>{tName(team2Id)}</span>
              </div>
            </Card>

            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: G.ocean, letterSpacing: 1, marginBottom: 12 }}>{t("serveEff")}</div>
              {[{tn:1,st:s1,tid:team1Id,col:G.ocean},{tn:2,st:s2,tid:team2Id,col:G.sun}].map(({tn,st,tid,col}) => {
                const tot = st.whileServing + st.whileReceiving || 1;
                const pct = Math.round(st.whileServing / tot * 100);
                return (
                  <div key={tn} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: col }}>{tName(tid)}</span>
                      <span style={{ fontSize: 11, color: G.textLight }}>{st.whileServing} {t("whileServing")} · {st.whileReceiving} {t("whileReceiving")}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div style={{ flex: 1, height: 8, background: G.sandDark, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: pct + "%", background: col, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: col, minWidth: 36, textAlign: "right" }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </Card>

            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: G.ocean, letterSpacing: 1, marginBottom: 12 }}>{t("streaks")}</div>
              {[{tn:1,st:s1,tid:team1Id,col:G.ocean},{tn:2,st:s2,tid:team2Id,col:G.sun}].map(({tn,st,tid,col}) => {
                const team = getTeam(tid);
                return (
                  <div key={tn} style={{ background: G.sand, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: col, marginBottom: 8 }}>{tName(tid)}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1, background: G.white, borderRadius: 10, padding: "8px", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: G.warn, lineHeight: 1 }}>🔥{st.bestStreak}</div>
                        <div style={{ fontSize: 11, color: G.textLight }}>{t("maxStreak")}</div>
                      </div>
                      {team && teamPlayerIds(tid).map(pid => (
                        <div key={pid} style={{ flex: 1, background: G.white, borderRadius: 10, padding: "8px", textAlign: "center" }}>
                          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: col, lineHeight: 1 }}>{st.playerPts[pid] || 0}</div>
                          <div style={{ fontSize: 11, color: G.textLight }}>{playerName(pid).split(" ")[0]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Card>

            {onSaveResult && activeTourMatchId && winner && (() => {
              const winnerTeamId = winner === 1 ? team1Id : team2Id;
              const finalS1 = sets.reduce((acc, s) => acc + (s.winner === 1 ? 1 : 0), 0);
              const finalS2 = sets.reduce((acc, s) => acc + (s.winner === 2 ? 1 : 0), 0);
              return (
                <Btn onClick={() => onSaveResult(activeTourMatchId, finalS1, finalS2, winnerTeamId)}
                  variant="success" size="lg" style={{ width: "100%", marginBottom: 10 }}>
                  ✓ Guardar resultado en fixture
                </Btn>
              );
            })()}
            <Btn onClick={reset} variant="sun" size="lg" style={{ width: "100%" }}>{t("newMatch")}</Btn>
          </div>
        );
      })() : (
        <>
          {/* Scoreboard — left/right position driven by side state so teams physically swap */}
          {(() => {
            const cols = {
              1: { teamId: team1Id, teamNum: 1, score: score1, sets: t1Sets },
              2: { teamId: team2Id, teamNum: 2, score: score2, sets: t2Sets },
            };
            // Whichever team has side "left" renders on the left of the screen
            const leftCol  = side.t1 === "left" ? cols[1] : cols[2];
            const rightCol = side.t1 === "left" ? cols[2] : cols[1];

            const TeamPanel = ({ col }) => {
              const isServing = srv.team === col.teamNum;
              const rot = serveRotation();
              const slotsForTeam = rot.filter(r => r.team === col.teamNum);
              return (
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: G.sand, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    {tName(col.teamId)}
                  </div>
                  <div style={{
                    fontFamily: "'Bebas Neue'", fontSize: 72,
                    color: isServing ? G.sun : G.white, lineHeight: 1, margin: "4px 0",
                  }}>{col.score}</div>
                  <div style={{ minHeight: 36 }}>
                    {isServing ? (
                      <div style={{ background: G.sun + "33", borderRadius: 8, padding: "4px 8px", display: "inline-block" }}>
                        <div style={{ color: G.sun, fontSize: 11, fontWeight: 700 }}>{t("serving")}</div>
                        <div style={{ color: G.sand, fontSize: 12, fontWeight: 700 }}>{playerName(srv.playerId)}</div>
                      </div>
                    ) : (
                      <div style={{ color: G.sand + "66", fontSize: 11 }}>
                        {t("ifScores")}<br />
                        <b style={{ color: G.sand + "99", fontSize: 12 }}>
                          {playerName(nextSrv.team === col.teamNum ? nextSrv.playerId : slotsForTeam[0].playerId)}
                        </b>
                      </div>
                    )}
                  </div>
                  <div style={{ color: G.sand + "55", fontSize: 11, marginTop: 4 }}>Sets: {col.sets}</div>
                </div>
              );
            };

            return (
              <div style={{
                background: G.dark, borderRadius: 20, padding: "16px 14px", marginBottom: 12,
                display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10,
              }}>
                <TeamPanel col={leftCol} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: G.sand + "44", fontFamily: "'Bebas Neue'", fontSize: 24 }}>VS</div>
                  <div style={{ color: G.warn, fontSize: 10, marginTop: 6, fontWeight: 600 }}>
                    {points > 0 && points % 7 !== 0 ? `{t("changeIn")} ${7 - (points % 7)} pts` : ""}
                  </div>
                </div>
                <TeamPanel col={rightCol} />
              </div>
            );
          })()}

          {/* Point buttons — color follows the TEAM (team1=ocean, team2=sun), position follows side */}
          {(() => {
            const leftNum  = side.t1 === "left" ? 1 : 2;
            const rightNum = side.t1 === "left" ? 2 : 1;
            const teamColor = (num) => num === 1
              ? { bg: `linear-gradient(135deg, ${G.ocean}, ${G.oceanDark})`, shadow: "0 6px 20px rgba(26,107,138,0.35)" }
              : { bg: `linear-gradient(135deg, ${G.sun}, ${G.sunDark})`,   shadow: "0 6px 20px rgba(245,166,35,0.35)" };
            const leftStyle  = teamColor(leftNum);
            const rightStyle = teamColor(rightNum);
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <button onClick={() => addPoint(leftNum)} style={{
                  background: leftStyle.bg,
                  color: G.white, border: "none", borderRadius: 16, padding: "18px 10px",
                  fontSize: 15, fontWeight: 700, cursor: "pointer", lineHeight: 1.4,
                  boxShadow: leftStyle.shadow, fontFamily: "'DM Sans', sans-serif",
                  transition: "background 0.3s",
                }}>
                  +1 {tName(leftNum === 1 ? team1Id : team2Id)}
                </button>
                <button onClick={() => addPoint(rightNum)} style={{
                  background: rightStyle.bg,
                  color: G.white, border: "none", borderRadius: 16, padding: "18px 10px",
                  fontSize: 15, fontWeight: 700, cursor: "pointer", lineHeight: 1.4,
                  boxShadow: rightStyle.shadow, fontFamily: "'DM Sans', sans-serif",
                  transition: "background 0.3s",
                }}>
                  +1 {tName(rightNum === 1 ? team1Id : team2Id)}
                </button>
              </div>
            );
          })()}

          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <Btn onClick={requestUndo} variant="secondary" style={{ flex: 1 }} disabled={history.length === 0}>{t("undo")}</Btn>
            <Btn onClick={reset} variant="danger" style={{ flex: 1 }}>{t("finish")}</Btn>
          </div>

          {/* Log */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: G.ocean, color: G.white }}>
              <span style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 1 }}>{t("history")}</span>
            </div>
            <div ref={logRef} style={{ maxHeight: 160, overflowY: "auto", padding: "10px 16px" }}>
              {log.length === 0 && <div style={{ color: G.textLight, fontSize: 13, textAlign: "center" }}>{t("noPoints")}</div>}
              {[...log].reverse().map((entry) => {
                if (!entry.team) return (
                  <div key={entry.id} style={{ padding: "5px 0", fontSize: 12, fontWeight: 700, color: G.ocean, textAlign: "center", borderBottom: "1px solid " + G.sandDark }}>{entry.msg}</div>
                );
                const tc = entry.team === 1 ? G.ocean : G.sun;
                return (
                  <div key={entry.id} style={{ padding: "5px 0", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid " + G.sandDark }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{entry.pointTypeIcon || "🏐"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: tc }}>
                        {entry.pointTypeLabel || "Punto"} · {tName(entry.team === 1 ? team1Id : team2Id)}
                      </div>
                      <div style={{ fontSize: 11, color: G.textLight }}>
                        Sacó: {playerName(entry.serverPlayerId)}
                        {entry.streak > 1 && <span style={{ color: G.warn, marginLeft: 6 }}>🔥 {entry.streak} seguidos</span>}
                        {entry.sideChange && <span style={{ color: G.sun, marginLeft: 6 }}>{t("sideLeft") === t("sideLeft") ? "🔄" : "🔄"}</span>}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: G.text, background: G.sand, borderRadius: 8, padding: "2px 8px", flexShrink: 0 }}>
                      {entry.t1}–{entry.t2}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── i18n ─────────────────────────────────────────────────────────────────────
const LANGS = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
  { code: "pt", label: "PT" },
  { code: "it", label: "IT" },
];

const TR = {
  es: {
    subtitle: "Tournament Manager",
    navLive: "EN VIVO", navTournaments: "TORNEOS", navTeams: "EQUIPOS", navPlayers: "JUGADORES",
    liveTitle: "🏐 PARTIDO EN VIVO",
    setUntil: "hasta",
    // Setup
    team1ph: "Equipo 1...", team2ph: "Equipo 2...",
    servesFirst: "🏐 Saca primero",
    sideLeft: "← Izquierda", sideRight: "Derecha →",
    serveOrderFirst: "PRIMERO", serveOrderRepeat: "Se repite cíclicamente",
    startMatch: "¡Empezar partido!",
    initialSideOf: "Lado inicial de",
    serveOrderTitle: "Orden de saque",
    whoServesFirst: "¿Quién saca primero?",
    // In-game
    serving: "🏐 SACANDO", ifScores: "Si anota:",
    changeIn: "Cambio en", ptsLabel: "pts",
    undo: "↩ Deshacer", finish: "Terminar",
    history: "HISTORIAL", noPoints: "Sin puntos aún",
    // Side change dialog
    sideChangeTitle: "CAMBIO DE LADO",
    sideChangeMsg: "Los equipos cambian de lado",
    nextServe: "🏐 Próximo saque:",
    confirmSideChange: "OK, cambiamos de lado",
    // Undo dialog
    undoTitle: "DESHACER PUNTO",
    undoMsg: "¿Confirmar? El partido vuelve a:",
    wasServing: "🏐 Sacaba",
    cancel: "Cancelar", confirm: "Confirmar",
    // Point type dialog
    pointFor: "Punto para",
    howWon: "¿CÓMO SE GANÓ EL PUNTO?",
    ptAce: "Ace", ptAceDesc: "Saque directo",
    ptSpike: "Remate", ptSpikeDesc: "Ataque ganador",
    ptBlock: "Bloqueo", ptBlockDesc: "Bloqueo en la red",
    ptTip: "Finta", ptTipDesc: "Dejada/finta",
    ptError: "Error del rival", ptErrorDesc: "El equipo contrario cometió el error",
    ptCancel: "Cancelar",
    // Restore
    savedGameTitle: "PARTIDO GUARDADO",
    savedGameMsg: "Se encontró un partido en curso. ¿Querés continuar?",
    savedSet: "en curso", savedSet1: "Set 1", savedPts: "puntos jugados",
    continueMatch: "▶ Continuar partido", discardMatch: "✕ Descartar y empezar nuevo",
    // Stats
    winner: "¡GANADOR!", newMatch: "Nuevo partido",
    totalPoints: "PUNTOS TOTALES", totalLabel: "total",
    howWonTitle: "CÓMO SE GANARON",
    serveEff: "EFECTIVIDAD DE SAQUE",
    streaks: "RACHAS Y JUGADORES",
    maxStreak: "Racha máx.",
    whileServing: "sacando", whileReceiving: "recibiendo",
    comparison: "comparación",
  },
  en: {
    subtitle: "Tournament Manager",
    navLive: "LIVE", navTournaments: "TOURNAMENTS", navTeams: "TEAMS", navPlayers: "PLAYERS",
    liveTitle: "🏐 LIVE MATCH",
    setUntil: "to",
    team1ph: "Team 1...", team2ph: "Team 2...",
    servesFirst: "🏐 Serves first",
    sideLeft: "← Left", sideRight: "Right →",
    serveOrderFirst: "FIRST", serveOrderRepeat: "Repeats cyclically",
    startMatch: "Start match!",
    initialSideOf: "Initial side for",
    serveOrderTitle: "Serve order",
    whoServesFirst: "Who serves first?",
    serving: "🏐 SERVING", ifScores: "If scores:",
    changeIn: "Switch in", ptsLabel: "pts",
    undo: "↩ Undo", finish: "End",
    history: "HISTORY", noPoints: "No points yet",
    sideChangeTitle: "SIDE SWITCH",
    sideChangeMsg: "Teams switch sides",
    nextServe: "🏐 Next serve:",
    confirmSideChange: "OK, switching sides",
    undoTitle: "UNDO POINT",
    undoMsg: "Confirm? Match returns to:",
    wasServing: "🏐 Was serving",
    cancel: "Cancel", confirm: "Confirm",
    pointFor: "Point for",
    howWon: "HOW WAS THE POINT WON?",
    ptAce: "Ace", ptAceDesc: "Serve ace",
    ptSpike: "Spike", ptSpikeDesc: "Attack winner",
    ptBlock: "Block", ptBlockDesc: "Net block",
    ptTip: "Tip", ptTipDesc: "Tip/dink shot",
    ptError: "Rival error", ptErrorDesc: "The opponent made the error",
    ptCancel: "Cancel",
    savedGameTitle: "SAVED MATCH",
    savedGameMsg: "A match in progress was found. Continue?",
    savedSet: "in progress", savedSet1: "Set 1", savedPts: "points played",
    continueMatch: "▶ Continue match", discardMatch: "✕ Discard and start new",
    winner: "WINNER!", newMatch: "New match",
    totalPoints: "TOTAL POINTS", totalLabel: "total",
    howWonTitle: "HOW POINTS WERE WON",
    serveEff: "SERVE EFFICIENCY",
    streaks: "STREAKS & PLAYERS",
    maxStreak: "Best streak",
    whileServing: "serving", whileReceiving: "receiving",
    comparison: "comparison",
  },
  pt: {
    subtitle: "Gerenciador de Torneios",
    navLive: "AO VIVO", navTournaments: "TORNEIOS", navTeams: "EQUIPES", navPlayers: "JOGADORES",
    liveTitle: "🏐 JOGO AO VIVO",
    setUntil: "até",
    team1ph: "Equipe 1...", team2ph: "Equipe 2...",
    servesFirst: "🏐 Saca primeiro",
    sideLeft: "← Esquerda", sideRight: "Direita →",
    serveOrderFirst: "PRIMEIRO", serveOrderRepeat: "Repete ciclicamente",
    startMatch: "Começar partida!",
    initialSideOf: "Lado inicial de",
    serveOrderTitle: "Ordem de saque",
    whoServesFirst: "Quem saca primeiro?",
    serving: "🏐 SACANDO", ifScores: "Se marcar:",
    changeIn: "Troca em", ptsLabel: "pts",
    undo: "↩ Desfazer", finish: "Encerrar",
    history: "HISTÓRICO", noPoints: "Sem pontos ainda",
    sideChangeTitle: "TROCA DE LADO",
    sideChangeMsg: "As equipes trocam de lado",
    nextServe: "🏐 Próximo saque:",
    confirmSideChange: "OK, trocamos de lado",
    undoTitle: "DESFAZER PONTO",
    undoMsg: "Confirmar? A partida volta para:",
    wasServing: "🏐 Sacava",
    cancel: "Cancelar", confirm: "Confirmar",
    pointFor: "Ponto para",
    howWon: "COMO O PONTO FOI GANHO?",
    ptAce: "Ace", ptAceDesc: "Saque direto",
    ptSpike: "Ataque", ptSpikeDesc: "Ataque vencedor",
    ptBlock: "Bloqueio", ptBlockDesc: "Bloqueio na rede",
    ptTip: "Toque", ptTipDesc: "Toque/largada",
    ptError: "Erro rival", ptErrorDesc: "O adversário cometeu o erro",
    ptCancel: "Cancelar",
    savedGameTitle: "PARTIDA SALVA",
    savedGameMsg: "Uma partida em andamento foi encontrada. Continuar?",
    savedSet: "em andamento", savedSet1: "Set 1", savedPts: "pontos jogados",
    continueMatch: "▶ Continuar partida", discardMatch: "✕ Descartar e iniciar nova",
    winner: "VENCEDOR!", newMatch: "Nova partida",
    totalPoints: "PONTOS TOTAIS", totalLabel: "total",
    howWonTitle: "COMO FORAM GANHOS",
    serveEff: "EFICIÊNCIA DE SAQUE",
    streaks: "SEQUÊNCIAS E JOGADORES",
    maxStreak: "Maior sequência",
    whileServing: "sacando", whileReceiving: "recebendo",
    comparison: "comparação",
  },
  it: {
    subtitle: "Gestore Tornei",
    navLive: "IN DIRETTA", navTournaments: "TORNEI", navTeams: "SQUADRE", navPlayers: "GIOCATORI",
    liveTitle: "🏐 PARTITA IN DIRETTA",
    setUntil: "fino a",
    team1ph: "Squadra 1...", team2ph: "Squadra 2...",
    servesFirst: "🏐 Batte per primo",
    sideLeft: "← Sinistra", sideRight: "Destra →",
    serveOrderFirst: "PRIMO", serveOrderRepeat: "Si ripete ciclicamente",
    startMatch: "Inizia la partita!",
    initialSideOf: "Lato iniziale di",
    serveOrderTitle: "Ordine di battuta",
    whoServesFirst: "Chi batte per primo?",
    serving: "🏐 IN BATTUTA", ifScores: "Se segna:",
    changeIn: "Cambio in", ptsLabel: "pts",
    undo: "↩ Annulla", finish: "Termina",
    history: "CRONOLOGIA", noPoints: "Nessun punto ancora",
    sideChangeTitle: "CAMBIO DI CAMPO",
    sideChangeMsg: "Le squadre cambiano campo",
    nextServe: "🏐 Prossima battuta:",
    confirmSideChange: "OK, cambiamo campo",
    undoTitle: "ANNULLA PUNTO",
    undoMsg: "Confermare? La partita torna a:",
    wasServing: "🏐 Batteva",
    cancel: "Annulla", confirm: "Conferma",
    pointFor: "Punto per",
    howWon: "COME È STATO VINTO IL PUNTO?",
    ptAce: "Ace", ptAceDesc: "Battuta vincente",
    ptSpike: "Schiacciata", ptSpikeDesc: "Attacco vincente",
    ptBlock: "Muro", ptBlockDesc: "Muro a rete",
    ptTip: "Pallonetto", ptTipDesc: "Pallonetto/tocco",
    ptError: "Errore avversario", ptErrorDesc: "L'avversario ha commesso l'errore",
    ptCancel: "Annulla",
    savedGameTitle: "PARTITA SALVATA",
    savedGameMsg: "È stata trovata una partita in corso. Continuare?",
    savedSet: "in corso", savedSet1: "Set 1", savedPts: "punti giocati",
    continueMatch: "▶ Continua partita", discardMatch: "✕ Scarta e inizia nuova",
    winner: "VINCITORE!", newMatch: "Nuova partita",
    totalPoints: "PUNTI TOTALI", totalLabel: "totale",
    howWonTitle: "COME SONO STATI VINTI",
    serveEff: "EFFICACIA IN BATTUTA",
    streaks: "SERIE E GIOCATORI",
    maxStreak: "Serie massima",
    whileServing: "in battuta", whileReceiving: "in ricezione",
    comparison: "confronto",
  },
};

const getLang = () => { try { return localStorage.getItem("bv_lang") || "es"; } catch { return "es"; } };

// ── NAV ───────────────────────────────────────────────────────────────────────
// Global nav (no active tournament)
const GLOBAL_NAV = [
  { id: "live",        icon: "🏐", label: "EN VIVO" },
  { id: "tournaments", icon: "🏆", label: "TORNEOS" },
  { id: "players",     icon: "👤", label: "JUGADORES" },
];

// Contextual nav (inside a tournament) — "live" here means tournament live
const TOUR_NAV = [
  { id: "tour_live",    icon: "🏐", label: "EN VIVO" },
  { id: "tour_matches", icon: "🏆", label: "FIXTURE" },
  { id: "tour_teams",   icon: "🤝", label: "EQUIPOS" },
  { id: "tour_players", icon: "👤", label: "JUGADORES" },
];

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("tournaments");
  const [players, setPlayers] = useState(initialPlayers);
  const [tournaments, setTournaments] = useState(initialTournaments);

  // Active tournament context
  const [activeTournamentId, setActiveTournamentId] = useState(null);
  const [tourTab, setTourTab] = useState("tour_matches");
  const [activeMatchId, setActiveMatchId] = useState(null); // match preloaded in live

  // Language
  const [lang, setLang] = useState(getLang);
  const [menuOpen, setMenuOpen] = useState(false);
  const r = (k) => (TR[lang] && TR[lang][k]) ? TR[lang][k] : (TR.es[k] || k);

  const changeLang = (code) => {
    setLang(code);
    try { localStorage.setItem("bv_lang", code); } catch {}
    setMenuOpen(false);
  };
  const cur = LANGS.find((l) => l.code === lang) || LANGS[0];

  const activeTournament = tournaments.find(tour => tour.id === activeTournamentId) || null;

  const openTournament = (id) => {
    setActiveTournamentId(id);
    setTourTab("tour_matches"); // always open on fixture/results
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
  // Hide EN VIVO from nav when tournament is completed
  const currentNav = inTournament
    ? (tourCompleted ? TOUR_NAV.filter(n => n.id !== "tour_live") : TOUR_NAV)
    : GLOBAL_NAV;
  const currentTab = inTournament ? tourTab : tab;
  const setCurrentTab = inTournament ? setTourTab : setTab;

  return (
    <LangCtx.Provider value={{ lang, t: r }}>
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
              <div style={{ fontSize: 10, color: G.sky, letterSpacing: 1, textTransform: "uppercase" }}>TORNEO</div>
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

        {/* Language picker */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen((v) => !v)} style={{
            background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)",
            borderRadius: 10, padding: "6px 12px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            color: G.white, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13,
          }}>
            <span>{cur.label}</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>&#9662;</span>
          </button>
          {menuOpen && (
            <React.Fragment>
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                background: G.white, borderRadius: 12, overflow: "hidden",
                boxShadow: "0 8px 30px rgba(0,0,0,0.18)", zIndex: 50, minWidth: 110,
              }}>
                {LANGS.map((l) => (
                  <button key={l.code} onClick={() => changeLang(l.code)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "10px 14px", border: "none",
                    borderLeft: lang === l.code ? ("3px solid " + G.ocean) : "3px solid transparent",
                    cursor: "pointer", background: lang === l.code ? (G.ocean + "22") : G.white,
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                    fontWeight: lang === l.code ? 700 : 400,
                    color: lang === l.code ? G.ocean : G.text,
                  }}>
                    <span>{l.label}</span>
                    {lang === l.code && <span style={{ marginLeft: "auto", color: G.ocean }}>&#10003;</span>}
                  </button>
                ))}
              </div>
            </React.Fragment>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px 100px", maxWidth: 600, margin: "0 auto" }}>
        {/* Global tabs */}
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

        {/* Tournament context tabs */}
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
              // Save result to fixture
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
