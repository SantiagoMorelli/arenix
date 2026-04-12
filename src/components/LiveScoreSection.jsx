import React, { useContext } from "react";
import { G, Card, Btn, Badge } from "./ui";
import { LangCtx } from "../lib/i18n";
import { useLiveGame, loadSaved } from "../hooks/useLiveGame";
import InformalWizard from "./InformalWizard";
import GameSetupScreen from "./GameSetupScreen";
import GameStats from "./GameStats";
import ScoreBoard from "./ScoreBoard";
import PointLog from "./PointLog";
import PointButtons from "./PointButtons";

function LiveScoreSection({ teams, players, setsPerMatch = 1, preloadMatchId = null,
  tournamentMatches = null, onSaveResult = null, informalMode = false }) {
  const { t } = useContext(LangCtx);
  const {
    showRestore, restoreGame, discardSaved,
    team1Id, setTeam1Id, team2Id, setTeam2Id,
    gameStarted, setGameStarted, activeTourMatchId, setActiveTourMatchId,
    informalStep, setInformalStep, informalSets, setInformalSets,
    informalTeamSize, setInformalTeamSize, informalTeam1, setInformalTeam1,
    informalTeam2, setInformalTeam2,
    t1ServeOrder, setT1ServeOrder, t2ServeOrder, setT2ServeOrder,
    t1InitialSide, setT1InitialSide, setSide, setPointsToWin,
    score1, score2, serveIndex, side, points,
    log, logRef, sets, winner, pointsToWin, history,
    pendingSideChange, pendingUndo, pendingPoint, setPendingPoint, pendingEnd,
    serveRotation, currentServer, playerName, tName, POINT_TYPES,
    addPoint, confirmPointType, confirmSideChange,
    reset, requestUndo, confirmUndo, cancelUndo,
    requestEnd, confirmEnd, cancelEnd,
  } = useLiveGame({ teams, players, informalMode, tournamentMatches, preloadMatchId, t, setsPerMatch });

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

    // ── INFORMAL MODE WIZARD ──────────────────────────────────────────────────
    if (informalMode) return (
      <InformalWizard
        players={players} t={t}
        informalStep={informalStep} setInformalStep={setInformalStep}
        informalSets={informalSets} setInformalSets={setInformalSets}
        informalTeamSize={informalTeamSize} setInformalTeamSize={setInformalTeamSize}
        informalTeam1={informalTeam1} setInformalTeam1={setInformalTeam1}
        informalTeam2={informalTeam2} setInformalTeam2={setInformalTeam2}
        t1ServeOrder={t1ServeOrder} setT1ServeOrder={setT1ServeOrder}
        t2ServeOrder={t2ServeOrder} setT2ServeOrder={setT2ServeOrder}
        t1InitialSide={t1InitialSide} setT1InitialSide={setT1InitialSide}
        setSide={setSide}
        setTeam1Id={setTeam1Id} setTeam2Id={setTeam2Id}
        setPointsToWin={setPointsToWin} setGameStarted={setGameStarted}
      />
    );

    // ── TOURNAMENT / MANUAL SETUP ─────────────────────────────────────────────
    return (
      <GameSetupScreen
        teams={teams} players={players} tournamentMatches={tournamentMatches}
        team1Id={team1Id} setTeam1Id={setTeam1Id}
        team2Id={team2Id} setTeam2Id={setTeam2Id}
        t1ServeOrder={t1ServeOrder} setT1ServeOrder={setT1ServeOrder}
        t2ServeOrder={t2ServeOrder} setT2ServeOrder={setT2ServeOrder}
        t1InitialSide={t1InitialSide} setT1InitialSide={setT1InitialSide}
        setSide={setSide}
        setActiveTourMatchId={setActiveTourMatchId}
        setGameStarted={setGameStarted}
        serveRotation={serveRotation()}
        t={t}
      />
    );
  }

  // ── IN-GAME SCREEN ──────────────────────────────────────────────────────────
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

      {/* End match confirmation dialog */}
      {pendingEnd && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: G.white, borderRadius: 24, padding: 28, textAlign: "center",
            maxWidth: 340, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🏁</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: G.danger, letterSpacing: 2, lineHeight: 1.1 }}>
              {t("endTitle")}
            </div>
            <div style={{ fontSize: 14, color: G.textLight, margin: "12px 0 20px" }}>
              {t("endMsg")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Btn onClick={cancelEnd} variant="secondary" size="lg">{t("cancel")}</Btn>
              <Btn onClick={confirmEnd} variant="danger" size="lg">{t("confirm")}</Btn>
            </div>
          </div>
        </div>
      )}

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
        <button onClick={requestEnd} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: G.ocean }}>←</button>
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

      {winner ? (
        <GameStats
          winner={winner}
          team1Id={team1Id} team2Id={team2Id}
          sets={sets} t1Sets={t1Sets} t2Sets={t2Sets}
          log={log}
          teams={teams} players={players}
          onSaveResult={onSaveResult} activeTourMatchId={activeTourMatchId}
          reset={reset}
          t={t}
        />
      ) : (
        <>
          <ScoreBoard
            teams={teams} players={players}
            team1Id={team1Id} team2Id={team2Id}
            score1={score1} score2={score2}
            t1Sets={t1Sets} t2Sets={t2Sets}
            side={side}
            srv={srv} nextSrv={nextSrv}
            serveRotation={serveRotation()}
            points={points}
            t={t}
          />
          <PointButtons
            side={side}
            onPoint={addPoint}
            team1Id={team1Id} team2Id={team2Id}
            teams={teams}
          />
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <Btn onClick={requestUndo} variant="secondary" style={{ flex: 1 }} disabled={history.length === 0}>{t("undo")}</Btn>
            <Btn onClick={requestEnd} variant="danger" style={{ flex: 1 }}>{t("finish")}</Btn>
          </div>
          <PointLog
            log={log} logRef={logRef}
            team1Id={team1Id} team2Id={team2Id}
            teams={teams} players={players}
            t={t}
          />
        </>
      )}
    </div>
  );
}

export default LiveScoreSection;
