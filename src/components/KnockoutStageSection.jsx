import React, { useState } from "react";
import { MatchStatsModal } from "./TournamentMatchesSection";

// ── Modal shell ──────────────────────────────────────────────────────────────
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

  // ── Round color helper ───────────────────────────────────────────────────
  const roundColor = (id) => {
    if (id === "final")       return "var(--color-free)";
    if (id === "semi")        return "var(--color-accent)";
    if (id === "third_place") return "#F39C12";
    return "var(--color-accent)";
  };

  return (
    <div>
      {rounds.map((round, ri) => {
        const playable = isRoundPlayable(ri);

        return (
          <div key={round.id} className="mb-5">
            {/* Round header */}
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="font-display text-[20px] tracking-[2px]" style={{ color: roundColor(round.id) }}>
                {round.name.toUpperCase()}
              </div>
              {!playable && (
                <span className="text-[10px] font-bold text-dim bg-alt px-2 py-1 rounded-lg">
                  Waiting for previous round
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {round.matches.map(m => {
                const bothTeamsKnown = m.team1 && m.team2;
                const canPlay = playable && bothTeamsKnown && !m.played;

                return (
                  <div
                    key={m.id}
                    onClick={() => m.played && setStatsMatch(m)}
                    className={`bg-surface rounded-xl border border-line p-3 overflow-hidden ${!bothTeamsKnown ? "opacity-55" : ""} ${m.played ? "cursor-pointer" : "cursor-default"}`}
                    style={{
                      borderLeft: m.played
                        ? "4px solid var(--color-success)"
                        : bothTeamsKnown
                        ? `4px solid ${roundColor(round.id)}`
                        : "4px solid var(--color-line)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      {/* Team 1 */}
                      <div className="flex-1">
                        <div className={`text-[14px] ${m.winner === m.team1 ? "font-bold text-accent" : m.played ? "font-medium text-dim" : "font-medium text-text"}`}>
                          {tName(m.team1)}
                          {m.winner === m.team1 && <span className="ml-1 text-[12px]">🏆</span>}
                        </div>
                      </div>

                      {/* Score / VS */}
                      <div className={`px-3.5 py-1 rounded-lg mx-2.5 font-display text-center min-w-[60px] text-text ${m.played ? "text-[22px] bg-alt" : "text-[16px] bg-surface border border-line"}`}>
                        {m.played ? `${m.score1} – ${m.score2}` : "VS"}
                      </div>

                      {/* Team 2 */}
                      <div className="flex-1 text-right">
                        <div className={`text-[14px] ${m.winner === m.team2 ? "font-bold text-accent" : m.played ? "font-medium text-dim" : "font-medium text-text"}`}>
                          {m.winner === m.team2 && <span className="mr-1 text-[12px]">🏆</span>}
                          {tName(m.team2)}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {canPlay && (
                      <div className="flex gap-2 mt-2.5 justify-end">
                        {onOpenLive && (
                          <button
                            onClick={() => onOpenLive(m.id)}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-accent border-0 cursor-pointer"
                          >
                            🏐 Live
                          </button>
                        )}
                        <button
                          onClick={() => { setScoreModal({ roundIdx: ri, match: m }); setS1("0"); setS2("0"); setDrawError(false); }}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-free border-0 cursor-pointer"
                        >
                          Score
                        </button>
                      </div>
                    )}
                  </div>
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
        <ModalShell title="ENTER RESULT" onClose={() => { setScoreModal(null); setDrawError(false); }}>
          <div className="flex flex-col gap-4">
            <div className="text-center text-[14px] text-dim">
              {tName(scoreModal.match.team1)} vs {tName(scoreModal.match.team2)}
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <div className="text-[12px] font-semibold mb-1 text-dim">{tName(scoreModal.match.team1)}</div>
                <input
                  value={s1}
                  onChange={e => { setS1(e.target.value); setDrawError(false); }}
                  placeholder="0"
                  className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="font-display text-[28px] text-dim pt-[22px]">—</div>
              <div className="flex-1">
                <div className="text-[12px] font-semibold mb-1 text-dim">{tName(scoreModal.match.team2)}</div>
                <input
                  value={s2}
                  onChange={e => { setS2(e.target.value); setDrawError(false); }}
                  placeholder="0"
                  className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
            {drawError && (
              <div className="bg-error/[0.12] border border-error rounded-lg px-3.5 py-2.5 text-error text-[13px] font-semibold text-center">
                ⚠️ Draws are not allowed in the knockout stage. Please enter a decisive score.
              </div>
            )}
            <button
              onClick={submitScore}
              disabled={parseInt(s1) === parseInt(s2)}
              className="w-full min-h-[44px] rounded-xl text-[14px] font-bold text-white bg-success border-0 cursor-pointer disabled:opacity-50"
            >
              Confirm result
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default KnockoutStageSection;
