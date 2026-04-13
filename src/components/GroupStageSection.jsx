import React, { useState } from "react";
import { G, Card, Btn, Badge, Input, Modal } from "./ui";
import { uid } from "../lib/utils";
import { MatchStatsModal } from "./TournamentMatchesSection";

// ── Head-to-head stats between two teams ─────────────────────────────────────
function h2hStats(idA, idB, matches) {
  const s = { [idA]: { pts: 0, gd: 0 }, [idB]: { pts: 0, gd: 0 } };
  (matches || [])
    .filter(m => m.played &&
      ((m.team1 === idA && m.team2 === idB) || (m.team1 === idB && m.team2 === idA)))
    .forEach(m => {
      const [s1, s2] = [m.score1, m.score2];
      s[m.team1].gd += s1 - s2; s[m.team2].gd += s2 - s1;
      if (s1 > s2) s[m.team1].pts += 1; else s[m.team2].pts += 1; // W=1, L=0
    });
  return s;
}

// ── Standings calculator ─────────────────────────────────────────────────────
function calcStandings(group) {
  return group.teamIds.map(teamId => {
    let mp = 0, pf = 0, pa = 0, played = 0, wins = 0, losses = 0;
    (group.matches || [])
      .filter(m => m.played && (m.team1 === teamId || m.team2 === teamId))
      .forEach(m => {
        played++;
        const isT1 = m.team1 === teamId;
        const scored   = isT1 ? m.score1 : m.score2;
        const conceded = isT1 ? m.score2 : m.score1;
        pf += scored; pa += conceded;
        if (scored > conceded) { mp += 1; wins++;   }
        else                   {          losses++; }
      });
    return { teamId, played, wins, losses, pf, pa, pd: pf - pa, mp };
  }).sort((a, b) => {
    if (b.mp !== a.mp) return b.mp - a.mp;   // Match Points (W=1)
    if (b.pd !== a.pd) return b.pd - a.pd;   // Point Difference
    if (b.pf !== a.pf) return b.pf - a.pf;   // Points For
    // Head-to-head tiebreaker
    const h = h2hStats(a.teamId, b.teamId, group.matches || []);
    if (h[b.teamId].pts !== h[a.teamId].pts) return h[b.teamId].pts - h[a.teamId].pts;
    return h[b.teamId].gd - h[a.teamId].gd;
  });
}

// ── Standings legend ─────────────────────────────────────────────────────────
const LEGEND = [
  { key: "P",  label: "Matches played" },
  { key: "W",  label: "Wins" },
  { key: "L",  label: "Losses" },
  { key: "PF", label: "Points For — rally points scored" },
  { key: "PA", label: "Points Against — rally points conceded" },
  { key: "PD", label: "Points Difference (PF − PA)" },
  { key: "MP", label: "Match Points  ·  Win = 1  ·  Loss = 0" },
];

// ── Knockout bracket builder ─────────────────────────────────────────────────
function buildKnockout(groups) {
  // top2[i] = [{ teamId, position: 1|2, groupIdx }, ...]
  const qualifiers = groups.flatMap((g, gi) => {
    const standings = calcStandings(g);
    return standings.slice(0, 2).map((s, pos) => ({ teamId: s.teamId, position: pos, groupIdx: gi }));
  });

  // Cross-seed: 1st of group i vs 2nd of group i+1 (wrap)
  const n = groups.length;
  const firstPlace  = qualifiers.filter(q => q.position === 0);
  const secondPlace = qualifiers.filter(q => q.position === 1);

  // First round matches: 1st[i] vs 2nd[(i+1) % n]
  const firstRoundMatches = firstPlace.map((fp, i) => ({
    id: uid(),
    team1: fp.teamId,
    team2: secondPlace[(i + 1) % n].teamId,
    played: false, winner: null, score1: 0, score2: 0,
  }));

  const totalQualifiers = firstRoundMatches.length * 2; // == qualifiers.length

  // Build round structure
  const rounds = [];

  // First round name
  const firstRoundName =
    totalQualifiers >= 16 ? "Round of 16" :
    totalQualifiers >= 8  ? "Quarter-finals" :
    "Semi-finals";

  let currentMatches = firstRoundMatches;
  let currentId = totalQualifiers >= 16 ? "r16" : totalQualifiers >= 8 ? "qf" : "semi";
  let currentName = firstRoundName;

  while (currentMatches.length > 1) {
    rounds.push({ id: currentId, name: currentName, matches: currentMatches });

    // Next round: TBD slots
    const nextCount = Math.ceil(currentMatches.length / 2);
    const nextMatches = Array.from({ length: nextCount }, () => ({
      id: uid(), team1: null, team2: null, played: false, winner: null, score1: 0, score2: 0,
    }));

    currentMatches = nextMatches;
    if (currentId === "r16")   { currentId = "qf";    currentName = "Quarter-finals"; }
    else if (currentId === "qf"){ currentId = "semi";  currentName = "Semi-finals"; }
    else                        { currentId = "final"; currentName = "Final"; break; }
  }

  // Always add Final as the last round
  const finalMatch = {
    id: uid(), team1: null, team2: null, played: false, winner: null, score1: 0, score2: 0,
  };
  rounds.push({ id: "final", name: "Final", matches: [finalMatch] });

  // 3rd place match (between semi-final losers)
  const thirdMatch = {
    id: uid(), team1: null, team2: null, played: false, winner: null, score1: 0, score2: 0,
  };
  rounds.push({ id: "third_place", name: "3rd Place", matches: [thirdMatch] });

  // If only 2 groups (4 qualifiers → 2 semi matches), fill the final directly from semis
  // (handled by advanceKnockout in App.jsx)

  // Special case: if the first round IS the semi-final, fill the final slots now
  if (rounds[0].id === "semi") {
    const semis = rounds[0].matches;
    if (semis.length === 2) {
      // Final and 3rd place are TBD — will be filled by advanceKnockout
    }
  }

  return { rounds };
}

// ────────────────────────────────────────────────────────────────────────────
const GroupStageSection = ({ tournament, setTournaments, players, onOpenLive, readOnly = false }) => {
  const [scoreModal, setScoreModal] = useState(null); // { groupIdx, match }
  const [s1, setS1] = useState("0");
  const [s2, setS2] = useState("0");
  const [drawError, setDrawError] = useState(false);
  const [statsMatch, setStatsMatch] = useState(null);
  const [showLegend, setShowLegend] = useState(false);

  const tName = id => tournament.teams.find(tm => tm.id === id)?.name || "?";

  const allGroupMatchesPlayed = (tournament.groups || []).every(g =>
    g.matches.every(m => m.played)
  );

  // ── Submit a group-stage score ───────────────────────────────────────────
  const submitScore = () => {
    const sc1 = parseInt(s1) || 0, sc2 = parseInt(s2) || 0;
    if (sc1 === sc2) { setDrawError(true); return; }
    setDrawError(false);
    const { groupIdx, match } = scoreModal;
    const winner = sc1 > sc2 ? match.team1 : match.team2;

    setTournaments(prev => prev.map(tour => {
      if (tour.id !== tournament.id) return tour;
      const groups = tour.groups.map((g, gi) => {
        if (gi !== groupIdx) return g;
        return {
          ...g,
          matches: g.matches.map(m =>
            m.id !== match.id ? m : { ...m, played: true, winner, score1: sc1, score2: sc2 }
          ),
        };
      });
      return { ...tour, groups };
    }));
    setScoreModal(null); setS1("0"); setS2("0"); setDrawError(false);
  };

  // ── Advance to knockout stage ────────────────────────────────────────────
  const advanceToKnockout = () => {
    const knockout = buildKnockout(tournament.groups);
    setTournaments(prev => prev.map(tour =>
      tour.id !== tournament.id ? tour : { ...tour, knockout, phase: "knockout" }
    ));
  };

  return (
    <div>
      {(tournament.groups || []).map((group, gi) => {
        const standings = calcStandings(group);
        const unplayed  = group.matches.filter(m => !m.played);
        const played    = group.matches.filter(m => m.played);

        return (
          <div key={group.id} style={{ marginBottom: 20 }}>
            {/* Group header */}
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: G.ocean, letterSpacing: 2, marginBottom: 10 }}>
              {group.name}
            </div>

            {/* Standings table */}
            <Card style={{ marginBottom: 10, overflowX: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontFamily: "'Bebas Neue'", fontSize: 15, color: G.ocean, letterSpacing: 1 }}>
                  STANDINGS
                </span>
                {gi === 0 && (
                  <button onClick={() => setShowLegend(true)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: G.textLight, fontSize: 12, padding: "2px 6px",
                    fontFamily: "'DM Sans', sans-serif",
                  }}>ℹ️ key</button>
                )}
              </div>
              {/* Header row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "24px 1fr 28px 28px 28px 36px 36px 36px 36px",
                gap: 4, alignItems: "center",
                fontSize: 10, fontWeight: 700, color: G.textLight,
                textTransform: "uppercase", letterSpacing: 0.5,
                paddingBottom: 6, borderBottom: "1px solid " + G.sandDark,
                marginBottom: 4,
              }}>
                <span>#</span><span>Team</span>
                <span style={{ textAlign: "center" }}>P</span>
                <span style={{ textAlign: "center" }}>W</span>
                <span style={{ textAlign: "center" }}>L</span>
                <span style={{ textAlign: "center" }}>PF</span>
                <span style={{ textAlign: "center" }}>PA</span>
                <span style={{ textAlign: "center" }}>PD</span>
                <span style={{ textAlign: "center" }}>MP</span>
              </div>
              {standings.map((row, rank) => {
                const advances = rank < 2;
                return (
                  <div key={row.teamId} style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr 28px 28px 28px 36px 36px 36px 36px",
                    gap: 4, alignItems: "center",
                    padding: "7px 0",
                    borderBottom: rank < standings.length - 1 ? "1px solid " + G.sandDark : "none",
                    background: advances ? G.success + "12" : "transparent",
                    borderRadius: advances ? 6 : 0,
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: advances ? G.success : G.textLight }}>
                      {rank + 1}
                    </span>
                    <span style={{ fontWeight: advances ? 700 : 500, fontSize: 13, color: advances ? G.success : G.text }}>
                      {tName(row.teamId)}
                      {advances && <span style={{ fontSize: 10, marginLeft: 4, color: G.success }}>↑</span>}
                    </span>
                    {[row.played, row.wins, row.losses, row.pf, row.pa, row.pd, row.mp].map((val, ci) => (
                      <span key={ci} style={{
                        textAlign: "center", fontSize: 13,
                        fontWeight: ci === 6 ? 700 : 400,
                        color: ci === 6 ? G.ocean : ci === 5 ? (val > 0 ? G.success : val < 0 ? G.danger : G.text) : G.text,
                      }}>{val}</span>
                    ))}
                  </div>
                );
              })}
            </Card>

            {/* Pending matches */}
            {unplayed.length > 0 && (
              <Card style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
                  Pending
                </div>
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
                        {onOpenLive && (
                          <Btn onClick={() => onOpenLive(m.id)} size="sm" variant="primary">🏐 Live</Btn>
                        )}
                        <Btn onClick={() => { setScoreModal({ groupIdx: gi, match: m }); setS1("0"); setS2("0"); }}
                          size="sm" variant="sun">Score</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Played results */}
            {played.length > 0 && (
              <Card>
                <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
                  Results
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {played.map(m => (
                    <div key={m.id} onClick={() => setStatsMatch(m)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "6px 12px", background: G.sand, borderRadius: 8, cursor: "pointer",
                    }}>
                      <span style={{
                        flex: 1, fontSize: 13,
                        fontWeight: m.winner === m.team1 ? 700 : 400,
                        color: m.winner === m.team1 ? G.ocean : m.winner === null ? G.text : G.textLight,
                      }}>{tName(m.team1)}</span>
                      <span style={{
                        padding: "3px 12px", background: G.white, borderRadius: 6,
                        fontFamily: "'Bebas Neue'", fontSize: 18, color: G.text, margin: "0 6px",
                      }}>{m.score1} – {m.score2}</span>
                      <span style={{
                        flex: 1, textAlign: "right", fontSize: 13,
                        fontWeight: m.winner === m.team2 ? 700 : 400,
                        color: m.winner === m.team2 ? G.ocean : m.winner === null ? G.text : G.textLight,
                      }}>{tName(m.team2)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        );
      })}

      {/* Advance button — hidden when viewing retrospectively */}
      {!readOnly && (
        <div style={{ marginTop: 8 }}>
          <Btn
            onClick={advanceToKnockout}
            variant="sun"
            size="lg"
            disabled={!allGroupMatchesPlayed}
            style={{ width: "100%" }}
          >
            {allGroupMatchesPlayed ? "⚡ Advance to Knockout Stage" : "⏳ Complete all group matches first"}
          </Btn>
        </div>
      )}

      {/* Legend modal */}
      {showLegend && (
        <Modal title="STANDINGS GUIDE" onClose={() => setShowLegend(false)}>
          <div style={{ display: "grid", gap: 0 }}>
            {LEGEND.map(({ key, label }, i) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 0",
                borderBottom: i < LEGEND.length - 1 ? "1px solid " + G.sandDark : "none",
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
            <div style={{ fontSize: 13, color: G.text }}>MP → PD → PF → Head-to-head</div>
          </div>
        </Modal>
      )}

      {/* Stats modal */}
      {statsMatch && (
        <MatchStatsModal
          match={statsMatch} tournament={tournament} players={players}
          onClose={() => setStatsMatch(null)}
        />
      )}

      {/* Score entry modal */}
      {scoreModal && (
        <Modal title="ENTER RESULT" onClose={() => { setScoreModal(null); setDrawError(false); }}>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ textAlign: "center", fontSize: 14, color: G.textLight }}>
              {tName(scoreModal.match.team1)} vs {tName(scoreModal.match.team2)}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: G.textLight }}>
                  {tName(scoreModal.match.team1)}
                </div>
                <Input value={s1} onChange={v => { setS1(v); setDrawError(false); }} placeholder="0" />
              </div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: G.textLight, paddingTop: 22 }}>—</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: G.textLight }}>
                  {tName(scoreModal.match.team2)}
                </div>
                <Input value={s2} onChange={v => { setS2(v); setDrawError(false); }} placeholder="0" />
              </div>
            </div>
            {drawError && (
              <div style={{
                background: G.danger + "18", border: "1px solid " + G.danger,
                borderRadius: 8, padding: "10px 14px",
                color: G.danger, fontSize: 13, fontWeight: 600, textAlign: "center",
              }}>
                ⚠️ No draws in beach volleyball. Enter a decisive score.
              </div>
            )}
            <Btn
              onClick={submitScore} variant="success" size="lg"
              disabled={parseInt(s1) === parseInt(s2)}
            >
              Confirm result
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default GroupStageSection;
