import React, { useState } from "react";
import { uid } from "../lib/utils";
import { TR } from "../lib/i18n";
import GameStats from "./GameStats";
import PointLog from "./PointLog";
import GroupStageSection from "./GroupStageSection";
import KnockoutStageSection from "./KnockoutStageSection";

function ModalShell({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-black/45 z-[100] flex items-center justify-center p-5"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-[20px] p-7 w-full max-w-[480px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display text-[26px] text-accent tracking-wide">{title}</h2>
          <button onClick={onClose} className="bg-transparent border-0 text-[22px] cursor-pointer text-dim leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Only allow group counts whose qualifier total (2×n) is a power of 2,
// so the knockout bracket is always clean (4, 8 or 16 qualifiers).
// Also requires at least 3 teams per group.
function getValidGroupOptions(numTeams) {
  return [2, 4, 8].filter(g => Math.floor(numTeams / g) >= 3);
}

function calcFreePlayStandings(teams, matches, players = []) {
  return teams.map(tm => {
    let mp = 0, pf = 0, pa = 0, played = 0, wins = 0, losses = 0;
    (matches || []).filter(m => m.played && (m.team1 === tm.id || m.team2 === tm.id))
      .forEach(m => {
        played++;
        const isT1 = m.team1 === tm.id;
        const scored   = isT1 ? m.score1 : m.score2;
        const conceded = isT1 ? m.score2 : m.score1;
        pf += scored; pa += conceded;
        if (scored > conceded) { mp += 1; wins++;   }
        else                   {          losses++; }
      });
    const playerNames = tm.players?.map(pid => {
      const p = players.find(x => x.id === pid);
      return p ? (p.displayName || p.nickname || p.name) : "Unknown";
    }).join(" · ") || "";
    return { id: tm.id, name: tm.name, playerNames, played, wins, losses, pf, pa, pd: pf - pa, mp };
  }).sort((a, b) => b.mp - a.mp || b.pd - a.pd || b.pf - a.pf);
}

const BV_LEGEND = [
  { key: "P",  label: "Matches played" },
  { key: "W",  label: "Wins" },
  { key: "L",  label: "Losses" },
  { key: "PF", label: "Points For — rally points scored" },
  { key: "PA", label: "Points Against — rally points conceded" },
  { key: "PD", label: "Points Difference (PF − PA)" },
  { key: "MP", label: "Match Points  ·  Win = 1  ·  Loss = 0" },
];


const TournamentMatchesSection = ({ tournament, setTournaments, players, onOpenLive }) => {
  const [modeChoice, setModeChoice] = useState("group");
  const [numGroupsChoice, setNumGroupsChoice] = useState(null);
  const [fpScoreModal, setFpScoreModal] = useState(null);
  const [s1, setS1] = useState("0");
  const [s2, setS2] = useState("0");
  const [statsMatch, setStatsMatch] = useState(null);
  const [viewTab, setViewTab] = useState("knockout"); // "knockout" | "groups"

  const phase = tournament.phase || "setup";
  const hasGroups = (tournament.groups || []).length > 0;
  const isFreePlay = phase === "freeplay";
  const isSetup = !hasGroups && !isFreePlay;

  const validGroupOptions = getValidGroupOptions(tournament.teams.length);
  const canGroupStage = validGroupOptions.length > 0;
  const selectedGroups = numGroupsChoice || validGroupOptions[0] || null;

  const tName = id => tournament.teams.find(tm => tm.id === id)?.name || "?";

  // ── Generate group stage ──────────────────────────────────────────────────
  const generateGroups = () => {
    const n = selectedGroups;
    if (!n) return;
    const groupArrays = Array.from({ length: n }, (_, i) => ({
      id: "g" + i,
      name: "Group " + String.fromCharCode(65 + i),
      teamIds: [], matches: [],
    }));
    tournament.teams.forEach((tm, idx) => groupArrays[idx % n].teamIds.push(tm.id));
    groupArrays.forEach(g => {
      const ids = g.teamIds;
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++)
          g.matches.push({
            id: "gm_" + g.id + "_" + i + "_" + j,
            team1: ids[i], team2: ids[j],
            played: false, winner: null, score1: 0, score2: 0,
          });
    });
    setTournaments(prev => prev.map(t =>
      t.id !== tournament.id ? t : { ...t, groups: groupArrays, phase: "group" }
    ));
  };

  // ── Generate free play ────────────────────────────────────────────────────
  const generateFreePlay = () => {
    const ids = tournament.teams.map(tm => tm.id);
    const matches = [];
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        matches.push({ id: uid(), team1: ids[i], team2: ids[j], played: false, winner: null, score1: 0, score2: 0 });
    setTournaments(prev => prev.map(t =>
      t.id !== tournament.id ? t : { ...t, matches, phase: "freeplay" }
    ));
  };

  // ── Free play score submit ────────────────────────────────────────────────
  const submitFpScore = () => {
    const sc1 = parseInt(s1) || 0, sc2 = parseInt(s2) || 0;
    const winner = sc1 > sc2 ? fpScoreModal.team1 : sc1 < sc2 ? fpScoreModal.team2 : null;
    setTournaments(prev => prev.map(tour => {
      if (tour.id !== tournament.id) return tour;
      const matches = tour.matches.map(m =>
        m.id !== fpScoreModal.id ? m : { ...m, played: true, winner, score1: sc1, score2: sc2 }
      );
      const allPlayed = matches.every(m => m.played);
      return { ...tour, matches, status: allPlayed ? "completed" : "active" };
    }));
    setFpScoreModal(null); setS1("0"); setS2("0");
  };

  // ── Not enough teams ──────────────────────────────────────────────────────
  if (tournament.teams.length < 2) {
    return (
      <div>
        <TournamentTitle name={tournament.name} />
        <div className="bg-surface rounded-xl border border-line p-6 text-center text-dim">
          Add at least 2 teams in the Teams tab to generate the schedule.
        </div>
      </div>
    );
  }

  // ── Setup: format picker ──────────────────────────────────────────────────
  if (isSetup) {
    const effectiveMode = !canGroupStage ? "freeplay" : modeChoice;
    return (
      <div>
        <TournamentTitle name={tournament.name} />
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-[11px] font-bold text-accent bg-accent/15 px-2.5 py-[4px] rounded-[8px]">{tournament.teamSize} players/team</span>
          <span className="text-[11px] font-bold text-accent bg-accent/15 px-2.5 py-[4px] rounded-[8px]">{tournament.setsPerMatch === 1 ? "1 set" : tournament.setsPerMatch + " sets"}</span>
          <span className="text-[11px] font-bold text-accent bg-accent/15 px-2.5 py-[4px] rounded-[8px]">{tournament.teams.length} teams</span>
        </div>

        <div className="bg-surface rounded-xl border border-line p-4 mb-4">
          <div className="font-display text-[18px] text-accent tracking-[1px] mb-3">
            TOURNAMENT FORMAT
          </div>

          <div className={`flex gap-2.5 ${canGroupStage ? "mb-4" : ""}`}>
            {canGroupStage && (
              <button
                onClick={() => setModeChoice("group")}
                className={`flex-1 px-3 py-3 rounded-xl border-2 text-[14px] cursor-pointer text-center transition-all ${
                  effectiveMode === "group"
                    ? "border-accent bg-accent/[0.07] font-bold text-text"
                    : "border-line bg-surface font-normal text-text"
                }`}
              >
                🏆 Group + Knockout
              </button>
            )}
            <button
              onClick={() => setModeChoice("freeplay")}
              className={`flex-1 px-3 py-3 rounded-xl border-2 text-[14px] cursor-pointer text-center transition-all ${
                effectiveMode === "freeplay"
                  ? "border-accent bg-accent/[0.07] font-bold text-text"
                  : "border-line bg-surface font-normal text-text"
              }`}
            >
              🎮 Free Play
            </button>
          </div>

          {!canGroupStage && (
            <div className="text-[12px] text-dim mt-2">
              Need at least 6 teams (2 groups × 3) for group stage. Playing in free play mode.
            </div>
          )}

          {effectiveMode === "freeplay" && (
            <div className={`text-[13px] text-dim ${canGroupStage ? "" : "mt-2"}`}>
              All teams play each other once. Final standings based on points (Win=1, Loss=0).
            </div>
          )}

          {effectiveMode === "group" && canGroupStage && (
            <div>
              <div className="text-[12px] font-bold text-dim uppercase tracking-[0.5px] mb-2">
                Number of groups
              </div>
              <div className="flex flex-wrap gap-2">
                {validGroupOptions.map(n => {
                  const perGroup = Math.floor(tournament.teams.length / n);
                  const remainder = tournament.teams.length % n;
                  const label = remainder === 0
                    ? `${n} groups · ${perGroup} teams each`
                    : `${n} groups · ${perGroup}–${perGroup + 1} teams`;
                  return (
                    <button
                      key={n}
                      onClick={() => setNumGroupsChoice(n)}
                      className={`flex-1 px-3 py-3 rounded-xl border-2 text-[14px] cursor-pointer text-center transition-all ${
                        selectedGroups === n
                          ? "border-accent bg-accent/[0.07] font-bold text-text"
                          : "border-line bg-surface font-normal text-text"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={effectiveMode === "group" ? generateGroups : generateFreePlay}
          className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer"
        >
          🎯 Generate schedule
        </button>
      </div>
    );
  }

  // ── Champion banner (used by both free play and group/knockout) ───────────
  const winnerTeam = tournament.winner
    ? tournament.teams.find(tm => tm.id === tournament.winner) : null;

  // ── Free play ─────────────────────────────────────────────────────────────
  if (isFreePlay) {
    const unplayed = (tournament.matches || []).filter(m => !m.played);
    const played   = (tournament.matches || []).filter(m => m.played);
    const standings = calcFreePlayStandings(tournament.teams, tournament.matches || [], players);

    return (
      <div>
        <TournamentTitle name={tournament.name} />
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-[11px] font-bold text-accent bg-accent/15 px-2.5 py-[4px] rounded-[8px]">{tournament.teamSize} players/team</span>
          <span className="text-[11px] font-bold text-accent bg-accent/15 px-2.5 py-[4px] rounded-[8px]">{tournament.setsPerMatch === 1 ? "1 set" : tournament.setsPerMatch + " sets"}</span>
          <span className="text-[11px] font-bold text-accent bg-accent/15 px-2.5 py-[4px] rounded-[8px]">Free Play</span>
          <span className={`text-[11px] font-bold px-2.5 py-[4px] rounded-[8px] ${phase === "completed" ? "text-success bg-success/15" : "text-free bg-free/15"}`}>
            {phase === "completed" ? "Completed" : "In progress"}
          </span>
        </div>

        {winnerTeam && <ChampionCard name={winnerTeam.name} />}

        {/* Standings */}
        <div className="bg-surface rounded-xl border border-line p-4 mb-4 overflow-x-auto">
          <div className="font-display text-[18px] text-accent tracking-[1px] mb-2.5">STANDINGS</div>
          <StandingsTable rows={standings} />
        </div>

        {/* Pending */}
        {unplayed.length > 0 && (
          <div className="bg-surface rounded-xl border border-line p-4 mb-3">
            <SectionLabel>Pending Matches</SectionLabel>
            <div className="flex flex-col gap-2">
              {unplayed.map(m => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-alt rounded-[10px]">
                  <span className="flex-1 text-[13px] font-semibold text-text">{tName(m.team1)}</span>
                  <span className="px-2 text-dim font-bold text-[12px]">VS</span>
                  <span className="flex-1 text-right text-[13px] font-semibold text-text">{tName(m.team2)}</span>
                  <div className="flex gap-1.5 ml-2.5">
                    {onOpenLive && (
                      <button onClick={() => onOpenLive(m.id)} className="px-2.5 py-1 rounded-lg text-[12px] font-semibold text-white bg-accent border-0 cursor-pointer">
                        🏐 Live
                      </button>
                    )}
                    <button
                      onClick={() => { setFpScoreModal(m); setS1("0"); setS2("0"); }}
                      className="px-2.5 py-1 rounded-lg text-[12px] font-semibold text-accent bg-accent/15 border-0 cursor-pointer"
                    >
                      Score
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {played.length > 0 && (
          <div className="bg-surface rounded-xl border border-line p-4">
            <SectionLabel>Results</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {played.map(m => (
                <div
                  key={m.id}
                  onClick={() => setStatsMatch(m)}
                  className="flex items-center justify-between px-3.5 py-2 bg-alt rounded-[10px] cursor-pointer"
                >
                  <span className={`flex-1 text-[13px] ${m.winner === m.team1 ? "font-bold text-accent" : "font-normal text-dim"}`}>
                    {tName(m.team1)}
                  </span>
                  <span className="px-3.5 py-0.5 bg-surface rounded-lg font-display text-[20px] text-text mx-2">
                    {m.score1} – {m.score2}
                  </span>
                  <span className={`flex-1 text-right text-[13px] ${m.winner === m.team2 ? "font-bold text-accent" : "font-normal text-dim"}`}>
                    {tName(m.team2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score modal */}
        {fpScoreModal && (
          <ModalShell title="ENTER RESULT" onClose={() => setFpScoreModal(null)}>
            <div className="flex flex-col gap-4">
              <div className="text-center text-[14px] text-dim">
                {tName(fpScoreModal.team1)} vs {tName(fpScoreModal.team2)}
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <div className="text-[12px] font-semibold text-dim mb-1">{tName(fpScoreModal.team1)}</div>
                  <input
                    value={s1}
                    onChange={e => setS1(e.target.value)}
                    placeholder="0"
                    className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="font-display text-[28px] text-dim pt-5">—</div>
                <div className="flex-1">
                  <div className="text-[12px] font-semibold text-dim mb-1">{tName(fpScoreModal.team2)}</div>
                  <input
                    value={s2}
                    onChange={e => setS2(e.target.value)}
                    placeholder="0"
                    className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
              <button
                onClick={submitFpScore}
                disabled={parseInt(s1) === parseInt(s2)}
                className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-success text-white border-0 cursor-pointer disabled:opacity-50"
              >
                Confirm result
              </button>
            </div>
          </ModalShell>
        )}

        {/* Stats modal */}
        {statsMatch && <MatchStatsModal match={statsMatch} tournament={tournament} players={players} onClose={() => setStatsMatch(null)} />}
      </div>
    );
  }

  // ── Group / knockout ──────────────────────────────────────────────────────
  const phaseLabel =
    phase === "completed" ? "Completed" :
    phase === "knockout"  ? "Knockout stage" : "Group stage";

  return (
    <div>
      <TournamentTitle name={tournament.name} />
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-[11px] font-bold text-accent bg-accent/15 px-2.5 py-[4px] rounded-[8px]">{tournament.teamSize} players/team</span>
        <span className="text-[11px] font-bold text-accent bg-accent/15 px-2.5 py-[4px] rounded-[8px]">{tournament.setsPerMatch === 1 ? "1 set" : tournament.setsPerMatch + " sets"}</span>
        {hasGroups && <span className="text-[11px] font-bold text-accent bg-accent/15 px-2.5 py-[4px] rounded-[8px]">{tournament.groups.length} groups</span>}
        <span className={`text-[11px] font-bold px-2.5 py-[4px] rounded-[8px] ${
          phase === "completed" ? "text-success bg-success/15" :
          phase === "knockout"  ? "text-accent bg-accent/15" :
          "text-free bg-free/15"
        }`}>{phaseLabel}</span>
      </div>

      {winnerTeam && <ChampionCard name={winnerTeam.name} />}

      {/* Tab toggle — only when past group stage */}
      {hasGroups && (phase === "knockout" || phase === "completed") && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewTab("knockout")}
            className={`flex-1 px-3 py-3 rounded-xl border-2 text-[14px] cursor-pointer text-center transition-all ${
              viewTab === "knockout"
                ? "border-accent bg-accent/[0.07] font-bold text-text"
                : "border-line bg-surface font-normal text-text"
            }`}
          >
            ⚡ Knockout
          </button>
          <button
            onClick={() => setViewTab("groups")}
            className={`flex-1 px-3 py-3 rounded-xl border-2 text-[14px] cursor-pointer text-center transition-all ${
              viewTab === "groups"
                ? "border-accent bg-accent/[0.07] font-bold text-text"
                : "border-line bg-surface font-normal text-text"
            }`}
          >
            📊 Group Stage
          </button>
        </div>
      )}

      {phase === "group" && (
        <GroupStageSection tournament={tournament} setTournaments={setTournaments} players={players} onOpenLive={onOpenLive} />
      )}
      {(phase === "knockout" || phase === "completed") && viewTab === "knockout" && (
        <KnockoutStageSection tournament={tournament} setTournaments={setTournaments} players={players} onOpenLive={onOpenLive} />
      )}
      {(phase === "knockout" || phase === "completed") && viewTab === "groups" && (
        <GroupStageSection tournament={tournament} setTournaments={setTournaments} players={players} onOpenLive={onOpenLive} readOnly />
      )}
    </div>
  );
};

// ── Shared micro-components ───────────────────────────────────────────────────

function TournamentTitle({ name }) {
  return (
    <h1 className="font-display text-[32px] text-accent tracking-[2px] mb-3">
      🏆 {name}
    </h1>
  );
}

function ChampionCard({ name }) {
  return (
    <div className="bg-gradient-to-br from-accent to-[#E8901A] rounded-xl p-5 mb-4 text-center text-white">
      <div className="text-[32px]">🏆</div>
      <div className="font-display text-[28px] tracking-[1px]">CHAMPION</div>
      <div className="text-[22px] font-bold">{name}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-[12px] font-bold text-dim uppercase tracking-[0.5px] mb-2">
      {children}
    </div>
  );
}

function StandingsTable({ rows }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <div className="flex px-3 py-1.5 bg-alt rounded-[8px] text-[10px] font-bold text-dim uppercase tracking-[0.5px]">
        <span className="w-[20px]">#</span>
        <span className="flex-1">Team</span>
        <span className="w-[30px] text-center">W</span>
        <span className="w-[30px] text-center">L</span>
        <span className="w-[30px] text-center">PTS</span>
      </div>
      {rows.map((row, i) => (
        <div key={row.teamId || i} className={`flex px-3 py-2 items-center rounded-[8px] ${i === 0 ? "bg-accent/15" : "bg-surface border border-line"} mb-1`}>
          <span className={`w-[20px] font-bold text-[12px] ${i === 0 ? "text-accent" : "text-dim"}`}>{i + 1}</span>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-[13px] font-semibold text-text truncate">{row.name}</span>
            {row.playerNames && (
              <span className="text-[10px] text-dim mt-0.5 truncate">{row.playerNames}</span>
            )}
          </div>
          <span className="w-[30px] text-center font-bold text-[13px] text-success">{row.wins}</span>
          <span className="w-[30px] text-center font-bold text-[13px] text-error">{row.losses}</span>
          <span className="w-[30px] text-center font-bold text-[13px] text-accent">{row.pts ?? row.mp}</span>
        </div>
      ))}
    </div>
  );
}

export function MatchStatsModal({ match, tournament, players, onClose }) {
  const t = k => TR[k] || k;
  const tName = id => tournament.teams.find(tm => tm.id === id)?.name || "?";
  const hasStats = Array.isArray(match.log)  && match.log.length > 0;
  const hasSets  = Array.isArray(match.sets) && match.sets.length > 0;
  const t1Sets   = hasSets ? match.sets.filter(s => s.winner === 1).length : 0;
  const t2Sets   = hasSets ? match.sets.filter(s => s.winner === 2).length : 0;
  const winner   = match.winner === match.team1 ? 1 : 2;
  return (
    <ModalShell
      title={`${tName(match.team1)}  ${match.score1}–${match.score2}  ${tName(match.team2)}`}
      onClose={onClose}
    >
      {hasStats && hasSets ? (
        <>
          <GameStats
            winner={winner} team1Id={match.team1} team2Id={match.team2}
            sets={match.sets} t1Sets={t1Sets} t2Sets={t2Sets}
            log={match.log} teams={tournament.teams} players={players}
            onSaveResult={null} activeTourMatchId={null} reset={null} t={t}
          />
          <div className="mt-4">
            <PointLog
              log={match.log} logRef={null}
              team1Id={match.team1} team2Id={match.team2}
              teams={tournament.teams} players={players} t={t}
            />
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-dim text-[14px]">
          📋 No detailed stats available.<br />This result was entered manually.
        </div>
      )}
    </ModalShell>
  );
}

export default TournamentMatchesSection;
