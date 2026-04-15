import React, { useContext } from "react";
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
    t1InitialSide, setT1InitialSide, firstServingTeam, setFirstServingTeam,
    setSide, setPointsToWin, startGame,
    score1, score2, serveIndex, side, points,
    log, logRef, sets, winner, pointsToWin, history,
    pendingSideChange, pendingUndo, pendingPoint, setPendingPoint,
    pendingPlayerSelect,
    pendingEnd,
    serveRotation, currentServer, playerName, tName, POINT_TYPES,
    addPoint, confirmPointType, confirmPlayer, confirmSideChange,
    reset, requestUndo, confirmUndo, cancelUndo,
    requestEnd, confirmEnd, cancelEnd,
  } = useLiveGame({ teams, players, informalMode, tournamentMatches, preloadMatchId, t, setsPerMatch });

  // ── Restore saved game ──────────────────────────────────────────────────────
  if (showRestore) {
    const s = loadSaved();
    const t1name = s ? (teams.find(tm => tm.id === s.team1Id)?.name || "?") : "?";
    const t2name = s ? (teams.find(tm => tm.id === s.team2Id)?.name || "?") : "?";
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-[34px] text-accent tracking-[2px]">
          {t("liveTitle")}
        </h1>
        <div className="bg-surface rounded-xl border border-line p-5 text-center">
          <div className="text-[40px] mb-2.5">💾</div>
          <div className="font-display text-[28px] text-accent tracking-wide mb-1.5">
            {t("savedGameTitle")}
          </div>
          <div className="text-[14px] text-dim mb-5">
            {t("savedGameMsg")}
          </div>
          {s && (
            <div className="bg-alt rounded-[14px] px-4 py-3.5 mb-5">
              <div className="font-display text-[42px] text-text leading-none mb-1.5">
                {s.score1} – {s.score2}
              </div>
              <div className="text-[15px] font-bold text-text mb-1">
                {t1name} vs {t2name}
              </div>
              <div className="text-[13px] text-dim">
                {s.sets.length > 0 ? `${t("savedSet")}` : t("savedSet1")} · {s.points} {t("savedPts")}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={restoreGame}
              className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer"
            >
              {t("continueMatch")}
            </button>
            <button
              onClick={discardSaved}
              className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-alt text-dim border border-line cursor-pointer"
            >
              {t("discardMatch")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pre-game setup ──────────────────────────────────────────────────────────
  if (!gameStarted) {
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

    return (
      <GameSetupScreen
        teams={teams} players={players} tournamentMatches={tournamentMatches}
        team1Id={team1Id} setTeam1Id={setTeam1Id}
        team2Id={team2Id} setTeam2Id={setTeam2Id}
        t1ServeOrder={t1ServeOrder} setT1ServeOrder={setT1ServeOrder}
        t2ServeOrder={t2ServeOrder} setT2ServeOrder={setT2ServeOrder}
        t1InitialSide={t1InitialSide} setT1InitialSide={setT1InitialSide}
        firstServingTeam={firstServingTeam} setFirstServingTeam={setFirstServingTeam}
        setSide={setSide}
        setActiveTourMatchId={setActiveTourMatchId}
        startGame={startGame}
        serveRotation={serveRotation()}
        t={t}
      />
    );
  }

  // ── In-game ─────────────────────────────────────────────────────────────────
  const setNum = sets.length + 1;
  const t1Sets = sets.filter(s => s.winner === 1).length;
  const t2Sets = sets.filter(s => s.winner === 2).length;
  const srv = currentServer();
  const rot = serveRotation();
  const nextSrv = rot[(serveIndex + 1) % rot.length];

  return (
    <div>

      {/* ── Side-change dialog ── */}
      {pendingSideChange && (
        <div className="fixed inset-0 z-[200] bg-black/65 flex items-center justify-center p-6">
          <div className="bg-surface rounded-3xl p-8 text-center max-w-[340px] w-full shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
            <div className="text-[52px] mb-2">🔄</div>
            <div className="font-display text-[34px] text-accent tracking-[2px] leading-tight">
              {t("sideChangeTitle")}
            </div>
            <div className="text-[14px] text-dim mt-3.5 mb-1.5">{t("sideChangeMsg")}</div>

            <div className="flex items-center gap-2.5 my-4">
              {(() => {
                const newLeftId  = pendingSideChange.newSide.t1 === "left" ? team1Id : team2Id;
                const newRightId = pendingSideChange.newSide.t1 === "left" ? team2Id : team1Id;
                const leftIsT1   = newLeftId === team1Id;
                const rightIsT1  = newRightId === team1Id;
                return (
                  <>
                    <div className="flex-1 text-center">
                      <div className="text-[10px] text-dim uppercase tracking-wide mb-1.5">{t("sideLeft")}</div>
                      <div className={`font-bold text-[15px] py-2 px-2.5 rounded-[10px] ${leftIsT1 ? "bg-accent/15 text-accent" : "bg-free/15 text-free"}`}>
                        {tName(newLeftId)}
                      </div>
                    </div>
                    <div className="text-[22px] text-dim flex-shrink-0">⇄</div>
                    <div className="flex-1 text-center">
                      <div className="text-[10px] text-dim uppercase tracking-wide mb-1.5">{t("sideRight")}</div>
                      <div className={`font-bold text-[15px] py-2 px-2.5 rounded-[10px] ${rightIsT1 ? "bg-accent/15 text-accent" : "bg-free/15 text-free"}`}>
                        {tName(newRightId)}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="text-[13px] text-text mb-5 py-2.5 px-3.5 bg-alt rounded-[10px]">
              {t("nextServe")} <b>{playerName(serveRotation()[pendingSideChange.newServeIndex % 4].playerId)}</b>
            </div>

            <button
              onClick={confirmSideChange}
              className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer"
            >
              {t("confirmSideChange")}
            </button>
          </div>
        </div>
      )}

      {/* ── Undo confirmation dialog ── */}
      {pendingUndo && history.length > 0 && (() => {
        const prev = history[history.length - 1];
        const rot = serveRotation();
        const prevServer = rot[prev.serveIndex % 4];
        return (
          <div className="fixed inset-0 z-[200] bg-black/65 flex items-center justify-center p-6">
            <div className="bg-surface rounded-3xl p-7 text-center max-w-[340px] w-full shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
              <div className="text-[44px] mb-2">↩</div>
              <div className="font-display text-[30px] text-error tracking-[2px] leading-tight">
                {t("undoTitle")}
              </div>
              <div className="text-[14px] text-dim mt-3 mb-4">
                {t("undoMsg")}
              </div>
              <div className="bg-alt rounded-[14px] px-4 py-3.5 mb-5">
                <div className="font-display text-[42px] text-text leading-none mb-2">
                  {prev.score1} – {prev.score2}
                </div>
                <div className="text-[13px] text-dim mb-1.5">
                  {tName(team1Id)} – {tName(team2Id)}
                </div>
                <div className="inline-block bg-accent/15 rounded-[8px] px-3.5 py-1.5">
                  <div className="text-[11px] text-accent font-bold uppercase">{t("wasServing")}</div>
                  <div className="text-[15px] font-bold text-text">{playerName(prevServer.playerId)}</div>
                  <div className="text-[12px] text-dim">{tName(prevServer.team === 1 ? team1Id : team2Id)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={cancelUndo}
                  className="min-h-[44px] rounded-xl text-[14px] font-bold bg-alt text-dim border border-line cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={confirmUndo}
                  className="min-h-[44px] rounded-xl text-[14px] font-bold bg-error text-white border-0 cursor-pointer"
                >
                  {t("confirm")}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── End match confirmation dialog ── */}
      {pendingEnd && (
        <div className="fixed inset-0 z-[200] bg-black/65 flex items-center justify-center p-6">
          <div className="bg-surface rounded-3xl p-7 text-center max-w-[340px] w-full shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
            <div className="text-[44px] mb-2">🏁</div>
            <div className="font-display text-[30px] text-error tracking-[2px] leading-tight">
              {t("endTitle")}
            </div>
            <div className="text-[14px] text-dim mt-3 mb-5">
              {t("endMsg")}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={cancelEnd}
                className="min-h-[44px] rounded-xl text-[14px] font-bold bg-alt text-dim border border-line cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                onClick={confirmEnd}
                className="min-h-[44px] rounded-xl text-[14px] font-bold bg-error text-white border-0 cursor-pointer"
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Point type bottom sheet ── */}
      {pendingPoint && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center">
          <div className="bg-bg rounded-t-[24px] px-5 pt-4 pb-9 w-full max-w-[480px] shadow-[0_-12px_40px_rgba(0,0,0,0.25)]">
            <div className="w-9 h-1 bg-alt rounded-full mx-auto mb-3.5" />
            <div className="text-center mb-4">
              <div className={`inline-block rounded-[10px] px-4 py-1.5 ${pendingPoint.teamNum === 1 ? "bg-accent/15" : "bg-free/15"}`}>
                <div className="text-[11px] text-dim uppercase tracking-wide">{t("pointFor")}</div>
                <div className={`font-display text-[22px] tracking-wide ${pendingPoint.teamNum === 1 ? "text-accent" : "text-free"}`}>
                  {tName(pendingPoint.teamNum === 1 ? team1Id : team2Id)}
                </div>
              </div>
            </div>
            <div className="font-display text-[18px] text-text tracking-wide mb-3.5 text-center">
              {t("howWon")}
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              {POINT_TYPES.filter(p => p.id !== "error").map(pt => (
                <button
                  key={pt.id}
                  onClick={() => confirmPointType(pt.id)}
                  className="bg-alt border-2 border-line rounded-[14px] px-2.5 py-3.5 cursor-pointer text-center"
                >
                  <div className="text-[28px] mb-1">{pt.icon}</div>
                  <div className="font-bold text-[14px] text-text">{pt.label}</div>
                  <div className="text-[11px] text-dim mt-0.5">{pt.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => confirmPointType("error")}
              className="w-full bg-error/10 border border-error/25 rounded-[14px] px-2.5 py-3 flex items-center gap-2.5 cursor-pointer mb-3"
            >
              <span className="text-[24px]">❌</span>
              <div className="text-left">
                <div className="font-bold text-[14px] text-error">{t("ptError")}</div>
                <div className="text-[11px] text-dim">{t("ptErrorDesc")}</div>
              </div>
            </button>
            <button
              onClick={() => setPendingPoint(null)}
              className="w-full bg-transparent border-0 text-dim text-[14px] cursor-pointer py-1.5"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* ── Player selection bottom sheet ── */}
      {pendingPlayerSelect && (() => {
        const { teamNum, ptId } = pendingPlayerSelect;
        const isError = ptId === "error";
        const selectTeamNum = isError ? (teamNum === 1 ? 2 : 1) : teamNum;
        const selectTeamId  = selectTeamNum === 1 ? team1Id : team2Id;
        const selectOrder   = selectTeamNum === 1 ? t1ServeOrder : t2ServeOrder;
        const isTeam1Color  = selectTeamNum === 1;
        return (
          <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center">
            <div className="bg-bg rounded-t-[24px] px-5 pt-4 pb-9 w-full max-w-[480px] shadow-[0_-12px_40px_rgba(0,0,0,0.25)]">
              <div className="w-9 h-1 bg-alt rounded-full mx-auto mb-3.5" />
              <div className="text-center mb-4">
                <div className={`inline-block rounded-[10px] px-4 py-1.5 ${isTeam1Color ? "bg-accent/15" : "bg-free/15"}`}>
                  <div className="text-[11px] text-dim uppercase tracking-wide">
                    {isError ? t("ptError") : t("pointFor")}
                  </div>
                  <div className={`font-display text-[22px] tracking-wide ${isTeam1Color ? "text-accent" : "text-free"}`}>
                    {tName(selectTeamId)}
                  </div>
                </div>
              </div>
              <div className="font-display text-[18px] text-text tracking-wide mb-3.5 text-center">
                {isError ? t("whoError") : t("whoScored")}
              </div>
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                {selectOrder.map(pid => (
                  <button
                    key={pid}
                    onClick={() => confirmPlayer(pid)}
                    className="bg-alt border-2 border-line rounded-[14px] px-2.5 py-4 cursor-pointer text-center"
                  >
                    <div className="font-bold text-[15px] text-text">{playerName(pid)}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => confirmPlayer(null)}
                className="w-full bg-transparent border-2 border-line rounded-[14px] py-3 cursor-pointer text-dim text-[14px]"
              >
                {t("skipPlayer")}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── In-game header ── */}
      <div className="flex items-center gap-2.5 mb-3">
        <button
          onClick={requestEnd}
          className="text-[20px] text-accent bg-transparent border-0 cursor-pointer p-1 leading-none"
        >←</button>
        <div className="flex-1">
          <div className="font-display text-[24px] text-accent tracking-wide leading-none">
            {tName(team1Id)} vs {tName(team2Id)}
          </div>
        </div>
      </div>

      {/* ── Sets row ── */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {sets.map((s, i) => (
          <span
            key={i}
            className={`text-[11px] font-bold px-2.5 py-[4px] rounded-[8px] ${
              s.winner === 1 ? "bg-accent/15 text-accent" : "bg-free/15 text-free"
            }`}
          >
            Set {i + 1}: {s.s1}–{s.s2}
          </span>
        ))}
        {!winner && (
          <span className="text-[11px] font-bold px-2.5 py-[4px] rounded-[8px] bg-alt text-dim">
            Set {setNum} · {t("setUntil")} {pointsToWin}
          </span>
        )}
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
          <div className="flex gap-2.5 mb-3.5">
            <button
              onClick={requestUndo}
              disabled={history.length === 0}
              className="flex-1 min-h-[44px] rounded-xl text-[13px] font-semibold text-dim border border-line bg-transparent cursor-pointer disabled:opacity-40"
            >
              {t("undo")}
            </button>
            <button
              onClick={requestEnd}
              className="flex-1 min-h-[44px] rounded-xl text-[13px] font-semibold text-white bg-error border-0 cursor-pointer"
            >
              {t("finish")}
            </button>
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
