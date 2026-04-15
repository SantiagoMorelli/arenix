import React, { useState } from "react";
import { G, Card, Btn, Badge, Input, Modal } from "./ui";
import { uid } from "../lib/utils";
import { TR } from "../lib/i18n";
import GameStats from "./GameStats";
import PointLog from "./PointLog";
import GroupStageSection from "./GroupStageSection";
import KnockoutStageSection from "./KnockoutStageSection";

// Only allow group counts whose qualifier total (2×n) is a power of 2,
// so the knockout bracket is always clean (4, 8 or 16 qualifiers).
// Also requires at least 3 teams per group.
function getValidGroupOptions(numTeams) {
  return [2, 4, 8].filter(g => Math.floor(numTeams / g) >= 3);
}

function calcFreePlayStandings(teams, matches) {
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
    return { id: tm.id, name: tm.name, played, wins, losses, pf, pa, pd: pf - pa, mp };
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

const selBtnStyle = (active) => ({
  flex: 1, padding: "12px", borderRadius: 12, border: "2px solid",
  borderColor: active ? G.ocean : G.sandDark,
  background: active ? G.ocean + "11" : G.white,
  fontWeight: active ? 700 : 400,
  fontSize: 14, cursor: "pointer", color: G.text,
  fontFamily: "'DM Sans', sans-serif", textAlign: "center",
});

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
        <Card style={{ textAlign: "center", color: G.textLight }}>
          Add at least 2 teams in the Teams tab to generate the schedule.
        </Card>
      </div>
    );
  }

  // ── Setup: format picker ──────────────────────────────────────────────────
  if (isSetup) {
    const effectiveMode = !canGroupStage ? "freeplay" : modeChoice;
    return (
      <div>
        <TournamentTitle name={tournament.name} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <Badge color={G.ocean}>{tournament.teamSize} players/team</Badge>
          <Badge color={G.ocean}>{tournament.setsPerMatch === 1 ? "1 set" : tournament.setsPerMatch + " sets"}</Badge>
          <Badge color={G.ocean}>{tournament.teams.length} teams</Badge>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: G.ocean, letterSpacing: 1, marginBottom: 12 }}>
            TOURNAMENT FORMAT
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: canGroupStage ? 16 : 0 }}>
            {canGroupStage && (
              <button onClick={() => setModeChoice("group")} style={selBtnStyle(effectiveMode === "group")}>
                🏆 Group + Knockout
              </button>
            )}
            <button
              onClick={() => setModeChoice("freeplay")}
              style={selBtnStyle(effectiveMode === "freeplay")}
            >
              🎮 Free Play
            </button>
          </div>

          {!canGroupStage && (
            <div style={{ fontSize: 12, color: G.textLight, marginTop: 8 }}>
              Need at least 6 teams (2 groups × 3) for group stage. Playing in free play mode.
            </div>
          )}

          {effectiveMode === "freeplay" && (
            <div style={{ fontSize: 13, color: G.textLight, marginTop: canGroupStage ? 0 : 8 }}>
              All teams play each other once. Final standings based on points (W=3, D=1, L=0).
            </div>
          )}

          {effectiveMode === "group" && canGroupStage && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Number of groups
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {validGroupOptions.map(n => {
                  const perGroup = Math.floor(tournament.teams.length / n);
                  const remainder = tournament.teams.length % n;
                  const label = remainder === 0
                    ? `${n} groups · ${perGroup} teams each`
                    : `${n} groups · ${perGroup}–${perGroup + 1} teams`;
                  return (
                    <button key={n} onClick={() => setNumGroupsChoice(n)} style={selBtnStyle(selectedGroups === n)}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <Btn
          onClick={effectiveMode === "group" ? generateGroups : generateFreePlay}
          variant="sun" size="lg" style={{ width: "100%" }}
        >
          🎯 Generate schedule
        </Btn>
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
    const standings = calcFreePlayStandings(tournament.teams, tournament.matches || []);

    return (
      <div>
        <TournamentTitle name={tournament.name} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <Badge color={G.ocean}>{tournament.teamSize} players/team</Badge>
          <Badge color={G.ocean}>{tournament.setsPerMatch === 1 ? "1 set" : tournament.setsPerMatch + " sets"}</Badge>
          <Badge color={G.ocean}>Free Play</Badge>
          <Badge color={phase === "completed" ? G.success : G.warn}>
            {phase === "completed" ? "Completed" : "In progress"}
          </Badge>
        </div>

        {winnerTeam && <ChampionCard name={winnerTeam.name} />}

        {/* Standings */}
        <Card style={{ marginBottom: 16, overflowX: "auto" }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: G.ocean, letterSpacing: 1, marginBottom: 10 }}>
            STANDINGS
          </div>
          <StandingsTable rows={standings} />
        </Card>

        {/* Pending */}
        {unplayed.length > 0 && (
          <Card style={{ marginBottom: 12 }}>
            <SectionLabel>Pending Matches</SectionLabel>
            <div style={{ display: "grid", gap: 8 }}>
              {unplayed.map(m => (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", background: G.sand, borderRadius: 10,
                }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{tName(m.team1)}</span>
                  <span style={{ padding: "0 8px", color: G.textLight, fontWeight: 700, fontSize: 12 }}>VS</span>
                  <span style={{ flex: 1, textAlign: "right", fontSize: 13, fontWeight: 600 }}>{tName(m.team2)}</span>
                  <div style={{ display: "flex", gap: 6, marginLeft: 10 }}>
                    {onOpenLive && <Btn onClick={() => onOpenLive(m.id)} size="sm" variant="primary">🏐 Live</Btn>}
                    <Btn onClick={() => { setFpScoreModal(m); setS1("0"); setS2("0"); }} size="sm" variant="sun">Score</Btn>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Results */}
        {played.length > 0 && (
          <Card>
            <SectionLabel>Results</SectionLabel>
            <div style={{ display: "grid", gap: 6 }}>
              {played.map(m => (
                <div key={m.id} onClick={() => setStatsMatch(m)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 14px", background: G.sand, borderRadius: 10, cursor: "pointer",
                }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: m.winner === m.team1 ? 700 : 400, color: m.winner === m.team1 ? G.ocean : G.textLight }}>
                    {tName(m.team1)}
                  </span>
                  <span style={{ padding: "3px 14px", background: G.white, borderRadius: 8, fontFamily: "'Bebas Neue'", fontSize: 20, color: G.text, margin: "0 8px" }}>
                    {m.score1} – {m.score2}
                  </span>
                  <span style={{ flex: 1, textAlign: "right", fontSize: 13, fontWeight: m.winner === m.team2 ? 700 : 400, color: m.winner === m.team2 ? G.ocean : G.textLight }}>
                    {tName(m.team2)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Score modal */}
        {fpScoreModal && (
          <Modal title="ENTER RESULT" onClose={() => setFpScoreModal(null)}>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ textAlign: "center", fontSize: 14, color: G.textLight }}>
                {tName(fpScoreModal.team1)} vs {tName(fpScoreModal.team2)}
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: G.textLight }}>{tName(fpScoreModal.team1)}</div>
                  <Input value={s1} onChange={setS1} placeholder="0" />
                </div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: G.textLight, paddingTop: 22 }}>—</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: G.textLight }}>{tName(fpScoreModal.team2)}</div>
                  <Input value={s2} onChange={setS2} placeholder="0" />
                </div>
              </div>
              <Btn onClick={submitFpScore} variant="success" size="lg"
                disabled={parseInt(s1) === parseInt(s2)}>Confirm result</Btn>
            </div>
          </Modal>
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
  const phaseColor =
    phase === "completed" ? G.success :
    phase === "knockout"  ? G.ocean : G.warn;

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
    <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: G.ocean, letterSpacing: 2, marginBottom: 12 }}>
      🏆 {name}
    </h1>
  );
}

function ChampionCard({ name }) {
  return (
    <Card style={{ background: "linear-gradient(135deg," + G.sun + "," + G.sunDark + ")", marginBottom: 16 }}>
      <div style={{ textAlign: "center", color: G.white }}>
        <div style={{ fontSize: 32 }}>🏆</div>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 1 }}>CHAMPION</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{name}</div>
      </div>
    </Card>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function StandingsTable({ rows }) {
  const [showLegend, setShowLegend] = React.useState(false);
  const cols = ["#", "Team", "P", "W", "L", "PF", "PA", "PD", "MP"];
  return (
    <>
      {/* Legend toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <button onClick={() => setShowLegend(true)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: G.textLight, fontSize: 12, padding: "2px 6px",
          fontFamily: "'DM Sans', sans-serif",
        }}>ℹ️ key</button>
      </div>
      {showLegend && (
        <Modal title="STANDINGS GUIDE" onClose={() => setShowLegend(false)}>
          <div style={{ display: "grid", gap: 0 }}>
            {BV_LEGEND.map(({ key, label }, i) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 0",
                borderBottom: i < BV_LEGEND.length - 1 ? "1px solid " + G.sandDark : "none",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: G.ocean,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Bebas Neue'", fontSize: 15, color: G.white, letterSpacing: 1, flexShrink: 0,
                }}>
                  {key}
                </div>
                <span style={{ fontSize: 14, color: G.text }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 16, padding: "12px 14px",
            background: G.ocean + "12", borderRadius: 10, borderLeft: "3px solid " + G.ocean,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.ocean, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
              Tiebreaker order
            </div>
            <div style={{ fontSize: 13, color: G.text }}>MP → PD → PF</div>
          </div>
        </Modal>
      )}
      <div style={{
        display: "grid", gridTemplateColumns: "24px 1fr 28px 28px 28px 36px 36px 36px 36px",
        gap: 4, fontSize: 10, fontWeight: 700, color: G.textLight, textTransform: "uppercase",
        letterSpacing: 0.5, paddingBottom: 6, borderBottom: "1px solid " + G.sandDark, marginBottom: 4,
      }}>
        {cols.map(c => <span key={c} style={{ textAlign: c === "Team" ? "left" : "center" }}>{c}</span>)}
      </div>
      {rows.map((row, rank) => (
        <div key={row.id} style={{
          display: "grid", gridTemplateColumns: "24px 1fr 28px 28px 28px 36px 36px 36px 36px",
          gap: 4, alignItems: "center", padding: "7px 0",
          borderBottom: rank < rows.length - 1 ? "1px solid " + G.sandDark : "none",
        }}>
          <span style={{ fontWeight: 700, fontSize: 12, color: rank === 0 ? G.sun : G.textLight }}>{rank + 1}</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</span>
          {[row.played, row.wins, row.losses, row.pf, row.pa, row.pd, row.mp].map((val, ci) => (
            <span key={ci} style={{
              textAlign: "center", fontSize: 13,
              fontWeight: ci === 6 ? 700 : 400,
              color: ci === 6 ? G.ocean : ci === 5 ? (val > 0 ? G.success : val < 0 ? G.danger : G.text) : G.text,
            }}>{val}</span>
          ))}
        </div>
      ))}
    </>
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
    <Modal
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
          <div style={{ marginTop: 16 }}>
            <PointLog
              log={match.log} logRef={null}
              team1Id={match.team1} team2Id={match.team2}
              teams={tournament.teams} players={players} t={t}
            />
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "32px 0", color: G.textLight, fontSize: 14 }}>
          📋 No detailed stats available.<br />This result was entered manually.
        </div>
      )}
    </Modal>
  );
}

export default TournamentMatchesSection;
