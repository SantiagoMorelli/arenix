import React from "react";

const GameSetupScreen = ({
  teams, players, tournamentMatches,
  team1Id, setTeam1Id,
  team2Id, setTeam2Id,
  t1ServeOrder, setT1ServeOrder,
  t2ServeOrder, setT2ServeOrder,
  t1InitialSide, setT1InitialSide,
  firstServingTeam, setFirstServingTeam,
  setSide,
  setActiveTourMatchId,
  startGame,
  serveRotation, // pre-computed array from LiveScoreSection
  t,
}) => {
  const getPlayer = id => players.find(p => p.id === id);
  const getTeam   = id => teams.find(tm => tm.id === id);
  const playerName = id => getPlayer(id)?.name || "?";
  const tName      = id => getTeam(id)?.name || "?";

  const teamPlayerIds = (teamId) => {
    const team = teams.find(tm => tm.id === teamId);
    if (!team) return [];
    if (team.players && team.players.length > 0) return team.players;
    return [team.player1, team.player2].filter(Boolean);
  };

  const t1 = getTeam(team1Id);
  const t2 = getTeam(team2Id);

  const ServeOrderPicker = ({ teamId, serveOrder, setServeOrder, isTeam1 }) => {
    const pIds = teamPlayerIds(teamId);
    if (pIds.length === 0) return null;
    if (serveOrder.length === 0) {
      setTimeout(() => setServeOrder(pIds), 0);
      return null;
    }
    const rotate = () => {
      setServeOrder([...serveOrder.slice(1), serveOrder[0]]);
    };
    const highlightBg    = isTeam1 ? "bg-accent/15" : "bg-free/15";
    const numberBg       = isTeam1 ? "bg-accent"    : "bg-free";
    const firstTextColor = isTeam1 ? "text-accent"  : "text-free";

    return (
      <div className="flex flex-col gap-1.5">
        {serveOrder.map((pid, idx) => {
          const pl = getPlayer(pid);
          return (
            <div
              key={pid + idx}
              className={`flex items-center gap-1.5 rounded-lg px-1.5 py-[5px] ${idx === 0 ? highlightBg : "bg-transparent"}`}
            >
              <div className={`w-[18px] h-[18px] rounded-full ${numberBg} text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0`}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[11px] font-semibold truncate ${idx === 0 ? firstTextColor : "text-text"}`}>
                  {pl?.name || "?"}
                </div>
                {idx === 0 && (
                  <div className={`text-[10px] mt-px ${firstTextColor}`}>🏐 Saca primero</div>
                )}
              </div>
            </div>
          );
        })}
        <button
          onClick={rotate}
          className="w-full mt-1 py-[5px] rounded-lg text-[11px] font-semibold text-dim border border-line bg-transparent cursor-pointer"
        >↻ Rotar orden</button>
      </div>
    );
  };

  const canStart = team1Id && team2Id &&
    t1ServeOrder.length === teamPlayerIds(team1Id).length &&
    t2ServeOrder.length === teamPlayerIds(team2Id).length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-[34px] text-accent tracking-[2px] mb-0">
        {t("liveTitle")}
      </h1>

      <div className="bg-surface rounded-xl border border-line p-4 flex flex-col gap-5">

        {/* ── Match picker for tournament mode ── */}
        {tournamentMatches && tournamentMatches.length > 0 ? (
          <div>
            <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-2.5">
              Partidos pendientes del torneo
            </div>
            <div className="flex flex-col gap-2">
              {tournamentMatches.filter(m => !m.played).map(m => {
                const tm1 = teams.find(tm => tm.id === m.team1);
                const tm2 = teams.find(tm => tm.id === m.team2);
                const selected = team1Id === m.team1 && team2Id === m.team2;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setTeam1Id(m.team1); setTeam2Id(m.team2);
                      setActiveTourMatchId(m.id);
                      setT1ServeOrder(teamPlayerIds(m.team1));
                      setT2ServeOrder(teamPlayerIds(m.team2));
                    }}
                    className={`p-3 rounded-xl cursor-pointer border-2 transition-all ${
                      selected ? "border-accent bg-accent/10" : "border-line bg-alt"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`font-bold text-[14px] ${selected ? "text-accent" : "text-text"}`}>
                        {tm1?.name || "?"}
                      </span>
                      <span className="text-dim font-bold text-[12px]">VS</span>
                      <span className={`font-bold text-[14px] ${selected ? "text-free" : "text-text"}`}>
                        {tm2?.name || "?"}
                      </span>
                    </div>
                    {selected && (
                      <div className="flex justify-between text-[11px] text-dim mt-1.5">
                        <span>{(tm1?.players || []).map(pid => getPlayer(pid)?.name || "?").join(", ")}</span>
                        <span>{(tm2?.players || []).map(pid => getPlayer(pid)?.name || "?").join(", ")}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {tournamentMatches.filter(m => !m.played).length === 0 && (
                <div className="text-center text-dim py-4 text-[14px]">
                  No hay partidos pendientes en el fixture
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Free-form team selects ── */
          <div className="flex flex-col gap-2.5">
            <div>
              <div className="text-[10px] font-bold text-accent uppercase tracking-wide mb-1.5">Team 1</div>
              <select
                value={team1Id}
                onChange={e => { setTeam1Id(e.target.value); setT1ServeOrder(teamPlayerIds(e.target.value)); }}
                className="w-full bg-alt border border-line rounded-xl px-3 py-2.5 text-[14px] text-text cursor-pointer appearance-none"
              >
                <option value="">{t("team1ph")}</option>
                {teams.filter(tm => tm.id !== team2Id).map(tm => (
                  <option key={tm.id} value={tm.id}>{tm.name}</option>
                ))}
              </select>
            </div>

            <div className="text-center text-[16px] font-extrabold text-dim tracking-[3px] py-0.5">VS</div>

            <div>
              <div className="text-[10px] font-bold text-free uppercase tracking-wide mb-1.5">Team 2</div>
              <select
                value={team2Id}
                onChange={e => { setTeam2Id(e.target.value); setT2ServeOrder(teamPlayerIds(e.target.value)); }}
                className="w-full bg-alt border border-line rounded-xl px-3 py-2.5 text-[14px] text-text cursor-pointer appearance-none"
              >
                <option value="">{t("team2ph")}</option>
                {teams.filter(tm => tm.id !== team1Id).map(tm => (
                  <option key={tm.id} value={tm.id}>{tm.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Serve orders — side by side ── */}
        {(t1 || t2) && (
          <div className="flex gap-2">
            {t1 && (
              <div className="flex-1 bg-alt rounded-xl p-2.5 border border-line">
                <div className="text-[10px] font-bold text-accent uppercase tracking-wide mb-1.5">
                  {t1.name}
                </div>
                <ServeOrderPicker
                  teamId={team1Id}
                  serveOrder={t1ServeOrder}
                  setServeOrder={setT1ServeOrder}
                  isTeam1={true}
                />
              </div>
            )}
            {t2 && (
              <div className="flex-1 bg-alt rounded-xl p-2.5 border border-line">
                <div className="text-[10px] font-bold text-free uppercase tracking-wide mb-1.5">
                  {t2.name}
                </div>
                <ServeOrderPicker
                  teamId={team2Id}
                  serveOrder={t2ServeOrder}
                  setServeOrder={setT2ServeOrder}
                  isTeam1={false}
                />
              </div>
            )}
          </div>
        )}

        {/* ── First serve picker ── */}
        {t1 && t2 && (
          <div>
            <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-1.5">
              ¿Quién saca primero?
            </div>
            <div className="flex gap-1.5">
              {[{ num: 1, team: t1, isTeam1: true }, { num: 2, team: t2, isTeam1: false }].map(({ num, team, isTeam1 }) => (
                <button
                  key={num}
                  onClick={() => setFirstServingTeam(num)}
                  className={`flex-1 py-[9px] rounded-[10px] text-[11px] font-semibold cursor-pointer border transition-all ${
                    firstServingTeam === num
                      ? isTeam1
                        ? "bg-accent/20 text-accent border-accent"
                        : "bg-free/20 text-free border-free"
                      : "bg-transparent text-dim border-line"
                  }`}
                >
                  🏐 {team.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Initial side picker ── */}
        {t1 && t2 && (
          <div>
            <div className="text-[10px] font-bold text-dim uppercase tracking-wide mb-1.5">
              {t("initialSideOf")} {t1.name}
            </div>
            <div className="flex gap-1.5">
              {["left", "right"].map(s => (
                <button
                  key={s}
                  onClick={() => { setT1InitialSide(s); setSide({ t1: s, t2: s === "left" ? "right" : "left" }); }}
                  className={`flex-1 py-[9px] rounded-[10px] text-[11px] font-semibold cursor-pointer border transition-all ${
                    t1InitialSide === s
                      ? "bg-accent/20 text-accent border-accent"
                      : "bg-transparent text-dim border-line"
                  }`}
                >
                  {s === "left" ? t("sideLeft") : t("sideRight")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Serve rotation preview ── */}
        {canStart && (() => {
          // Reorder preview so the chosen first-serving team appears first
          const teamA = serveRotation.filter(s => s.team === firstServingTeam);
          const teamB = serveRotation.filter(s => s.team !== firstServingTeam);
          const maxLen = Math.max(teamA.length, teamB.length);
          const preview = [];
          for (let i = 0; i < maxLen; i++) {
            if (i < teamA.length) preview.push(teamA[i]);
            if (i < teamB.length) preview.push(teamB[i]);
          }
          return (
            <div className="bg-alt rounded-xl px-3 py-2 border border-line">
              <div className="text-[10px] font-bold text-accent uppercase tracking-wide mb-1.5">
                {t("serveOrderTitle")}
              </div>
              <div className="flex gap-1 items-center flex-wrap">
                {preview.map((slot, i) => {
                  const isTeam1Slot = slot.team === 1;
                  return (
                    <div key={i} className="flex items-center gap-[3px]">
                      <div className={`flex items-center gap-1 rounded-md px-2 py-[3px] ${
                        i === 0
                          ? "bg-accent/15 border border-accent/40"
                          : isTeam1Slot ? "bg-accent/10" : "bg-free/10"
                      }`}>
                        <span className={`text-[9px] font-bold ${isTeam1Slot ? "text-accent" : "text-free"}`}>
                          {i + 1}
                        </span>
                        <span className="text-[10px] font-semibold text-text">
                          {playerName(slot.playerId)}
                        </span>
                      </div>
                      {i < preview.length - 1 && (
                        <span className="text-[10px] text-dim">→</span>
                      )}
                    </div>
                  );
                })}
                <span className="text-[9px] text-dim italic ml-0.5">↻</span>
              </div>
              <div className="text-[10px] text-dim mt-1.5">{t("serveOrderRepeat")}</div>
            </div>
          );
        })()}

        {/* ── Start Match CTA ── */}
        <button
          onClick={startGame}
          disabled={!canStart}
          className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-success text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-0 transition-opacity"
        >
          {t("startMatch")}
        </button>

      </div>
    </div>
  );
};

export default GameSetupScreen;
