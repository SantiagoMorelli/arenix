import React, { useState } from "react";
import { G, Card, Btn, Badge, Input, Modal } from "./ui";
import { MatchStatsModal } from "./TournamentMatchesSection";

const KnockoutStageSection = ({ tournament, setTournaments, players, onOpenLive }) => {
  const [scoreModal, setScoreModal] = useState(null); // { roundIdx, match }
  const [s1, setS1] = useState("0");
  const [s2, setS2] = useState("0");
  const [drawError, setDrawError] = useState(false);
  const [statsMatch, setStatsMatch] = useState(null);

  const tName = id => {
    if (!id) return "TBD";
    return tournament.teams.find(tm => tm.id === id)?.name || "?";
  };

  const rounds = tournament.knockout?.rounds || [];

  // ── Which rounds are currently playable ─────────────────────────────────
  // A round is playable when all matches in the previous round are played,
  // OR when it's the first round.
  const isRoundPlayable = (roundIdx) => {
    if (roundIdx === 0) return true;
    const prevRound = rounds[roundIdx - 1];
    // 3rd place match is independent of the final
    if (rounds[roundIdx]?.id === "third_place") {
      const semiRound = rounds.find(r => r.id === "semi");
      if (semiRound) return semiRound.matches.every(m => m.played);
      return true;
    }
    return prevRound?.matches.every(m => m.played) ?? false;
  };

  // ── Submit knockout score ────────────────────────────────────────────────
  const submitScore = () => {
    const sc1 = parseInt(s1) || 0, sc2 = parseInt(s2) || 0;
    if (sc1 === sc2) { setDrawError(true); return; }
    setDrawError(false);

    const { roundIdx, match } = scoreModal;
    const winner = sc1 > sc2 ? match.team1 : match.team2;

    setTournaments(prev => prev.map(tour => {
      if (tour.id !== tournament.id) return tour;

      // Update the match
      const rounds = tour.knockout.rounds.map((r, ri) => {
        if (ri !== roundIdx) return r;
        return {
          ...r,
          matches: r.matches.map(m =>
            m.id !== match.id ? m : { ...m, played: true, winner, score1: sc1, score2: sc2 }
          ),
        };
      });

      let updated = { ...tour, knockout: { ...tour.knockout, rounds } };

      // Advance bracket (propagate winners)
      updated = advanceBracket(updated);

      // Check if tournament is complete (final played)
      const finalRound = updated.knockout.rounds.find(r => r.id === "final");
      if (finalRound?.matches[0]?.played) {
        updated = {
          ...updated,
          phase: "completed",
          status: "completed",
          winner: finalRound.matches[0].winner,
        };
      }

      return updated;
    }));

    setScoreModal(null); setS1("0"); setS2("0");
  };

  // ── Bracket advancement ──────────────────────────────────────────────────
  function advanceBracket(tour) {
    const rounds = tour.knockout.rounds.map(r => ({
      ...r, matches: r.matches.map(m => ({ ...m })),
    }));

    for (let ri = 0; ri < rounds.length; ri++) {
      const round = rounds[ri];
      if (round.id === "third_place" || round.id === "final") continue;

      const nextRound = rounds[ri + 1];
      if (!nextRound) continue;

      round.matches.forEach((m, mi) => {
        if (!m.played || !m.winner) return;
        const loser = m.winner === m.team1 ? m.team2 : m.team1;

        // Winners advance in pairs → next round slots
        const nextMatchIdx = Math.floor(mi / 2);
        const isFirst = mi % 2 === 0;
        if (nextRound.id !== "final" && nextRound.id !== "third_place" && nextRound.matches[nextMatchIdx]) {
          if (isFirst) nextRound.matches[nextMatchIdx] = { ...nextRound.matches[nextMatchIdx], team1: m.winner };
          else         nextRound.matches[nextMatchIdx] = { ...nextRound.matches[nextMatchIdx], team2: m.winner };
        }

        // Semi-final losers → 3rd place
        if (round.id === "semi") {
          const tp = rounds.find(r => r.id === "third_place");
          if (tp) {
            if (mi === 0) tp.matches[0] = { ...tp.matches[0], team1: loser };
            if (mi === 1) tp.matches[0] = { ...tp.matches[0], team2: loser };
          }
          // Semi winners → final
          const finalR = rounds.find(r => r.id === "final");
          if (finalR) {
            const semis = round.matches;
            const winner0 = semis[0]?.played ? semis[0].winner : null;
            const winner1 = semis[1]?.played ? semis[1].winner : null;
            if (winner0) finalR.matches[0] = { ...finalR.matches[0], team1: winner0 };
            if (winner1) finalR.matches[0] = { ...finalR.matches[0], team2: winner1 };
          }
        }
      });

      // QF winners → semi
      if (round.id === "qf") {
        const semiRound = rounds.find(r => r.id === "semi");
        if (semiRound) {
          const qfWinners = round.matches.filter(m => m.played).map(m => m.winner);
          qfWinners.forEach((w, i) => {
            const matchIdx = Math.floor(i / 2);
            const isFirst  = i % 2 === 0;
            if (semiRound.matches[matchIdx]) {
              if (isFirst) semiRound.matches[matchIdx] = { ...semiRound.matches[matchIdx], team1: w };
              else         semiRound.matches[matchIdx] = { ...semiRound.matches[matchIdx], team2: w };
            }
          });
        }
      }
    }

    return { ...tour, knockout: { ...tour.knockout, rounds } };
  }

  // ── Round label style helper ─────────────────────────────────────────────
  const roundColor = (id) => {
    if (id === "final")       return G.sun;
    if (id === "semi")        return G.ocean;
    if (id === "third_place") return G.warn;
    return G.oceanLight || G.ocean;
  };

  return (
    <div>
      {rounds.map((round, ri) => {
        const playable = isRoundPlayable(ri);

        return (
          <div key={round.id} style={{ marginBottom: 20 }}>
            {/* Round header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{
                fontFamily: "'Bebas Neue'", fontSize: 20, color: roundColor(round.id), letterSpacing: 2,
              }}>
                {round.name.toUpperCase()}
              </div>
              {!playable && (
                <Badge color={G.textLight} style={{ fontSize: 10 }}>Waiting for previous round</Badge>
              )}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {round.matches.map(m => {
                const bothTeamsKnown = m.team1 && m.team2;
                const canPlay = playable && bothTeamsKnown && !m.played;

                return (
                  <Card key={m.id}
                    onClick={() => m.played && setStatsMatch(m)}
                    style={{
                      padding: "12px 16px",
                      opacity: !bothTeamsKnown ? 0.55 : 1,
                      cursor: m.played ? "pointer" : "default",
                      borderLeft: m.played ? "4px solid " + G.success : bothTeamsKnown ? "4px solid " + roundColor(round.id) : "4px solid " + G.sandDark,
                    }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {/* Team 1 */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 14, fontWeight: m.winner === m.team1 ? 700 : 500,
                          color: m.winner === m.team1 ? G.ocean : m.played ? G.textLight : G.text,
                        }}>
                          {tName(m.team1)}
                          {m.winner === m.team1 && <span style={{ marginLeft: 4, fontSize: 12 }}>🏆</span>}
                        </div>
                      </div>

                      {/* Score / VS */}
                      <div style={{
                        padding: "4px 14px", background: m.played ? G.sand : G.white,
                        borderRadius: 8, margin: "0 10px",
                        fontFamily: "'Bebas Neue'", fontSize: m.played ? 22 : 16,
                        color: G.text, textAlign: "center", minWidth: 60,
                      }}>
                        {m.played ? `${m.score1} – ${m.score2}` : "VS"}
                      </div>

                      {/* Team 2 */}
                      <div style={{ flex: 1, textAlign: "right" }}>
                        <div style={{
                          fontSize: 14, fontWeight: m.winner === m.team2 ? 700 : 500,
                          color: m.winner === m.team2 ? G.ocean : m.played ? G.textLight : G.text,
                        }}>
                          {m.winner === m.team2 && <span style={{ marginRight: 4, fontSize: 12 }}>🏆</span>}
                          {tName(m.team2)}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {canPlay && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                        {onOpenLive && (
                          <Btn onClick={() => onOpenLive(m.id)} size="sm" variant="primary">🏐 Live</Btn>
                        )}
                        <Btn
                          onClick={() => { setScoreModal({ roundIdx: ri, match: m }); setS1("0"); setS2("0"); setDrawError(false); }}
                          size="sm" variant="sun"
                        >Score</Btn>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

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
                ⚠️ Draws are not allowed in the knockout stage. Please enter a decisive score.
              </div>
            )}
            <Btn
              onClick={submitScore}
              variant="success"
              size="lg"
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

export default KnockoutStageSection;
