import React, { useState } from "react";
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
          <div key={group.id} className="mb-5">
            {/* Group header */}
            <div className="font-display text-[22px] text-accent tracking-[2px] mb-2.5">
              {group.name}
            </div>

            {/* Standings table */}
            <div className="bg-surface rounded-xl border border-line p-4 mb-2 overflow-x-auto">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-display text-[15px] text-accent tracking-[1px]">STANDINGS</span>
                {gi === 0 && (
                  <button onClick={() => setShowLegend(true)} className="bg-transparent border-0 cursor-pointer text-dim text-[12px] px-1.5 py-0.5">
                    ℹ️ key
                  </button>
                )}
              </div>
              {/* Header row */}
              <div className="grid grid-cols-[24px_1fr_28px_28px_28px_36px_36px_36px_36px] gap-1 text-[10px] font-bold text-dim uppercase tracking-[0.5px] pb-1.5 border-b border-line mb-1">
                <span>#</span><span>Team</span>
                <span className="text-center">P</span>
                <span className="text-center">W</span>
                <span className="text-center">L</span>
                <span className="text-center">PF</span>
                <span className="text-center">PA</span>
                <span className="text-center">PD</span>
                <span className="text-center">MP</span>
              </div>
              {standings.map((row, rank) => {
                const advances = rank < 2;
                return (
                  <div
                    key={row.teamId}
                    className={`grid grid-cols-[24px_1fr_28px_28px_28px_36px_36px_36px_36px] gap-1 items-center py-[7px] ${advances ? "bg-success/[0.07] rounded-md" : ""} ${rank < standings.length - 1 ? "border-b border-line" : ""}`}
                  >
                    <span className={`font-bold text-[12px] ${advances ? "text-success" : "text-dim"}`}>
                      {rank + 1}
                    </span>
                    <span className={`text-[13px] ${advances ? "font-bold text-success" : "font-medium text-text"}`}>
                      {tName(row.teamId)}
                      {advances && <span className="text-[10px] ml-1 text-success">↑</span>}
                    </span>
                    {[row.played, row.wins, row.losses, row.pf, row.pa, row.pd, row.mp].map((val, ci) => (
                      <span key={ci} className={`text-center text-[13px] ${
                        ci === 6 ? "font-bold text-accent" :
                        ci === 5 ? (val > 0 ? "text-success" : val < 0 ? "text-error" : "text-text") :
                        "text-text"
                      }`}>{val}</span>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Pending matches */}
            {unplayed.length > 0 && (
              <div className="bg-surface rounded-xl border border-line p-4 mb-2">
                <div className="text-[12px] font-bold text-dim uppercase tracking-[0.5px] mb-2">Pending</div>
                <div className="flex flex-col gap-2">
                  {unplayed.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-alt rounded-[10px]">
                      <span className="flex-1 text-[13px] font-semibold text-text">{tName(m.team1)}</span>
                      <span className="px-2 text-dim font-bold text-[12px]">VS</span>
                      <span className="flex-1 text-right text-[13px] font-semibold text-text">{tName(m.team2)}</span>
                      <div className="flex gap-1.5 ml-2.5">
                        {onOpenLive && (
                          <button
                            onClick={() => onOpenLive(m.id)}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-accent border-0 cursor-pointer"
                          >
                            🏐 Live
                          </button>
                        )}
                        <button
                          onClick={() => { setScoreModal({ groupIdx: gi, match: m }); setS1("0"); setS2("0"); }}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-free border-0 cursor-pointer"
                        >
                          Score
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Played results */}
            {played.length > 0 && (
              <div className="bg-surface rounded-xl border border-line p-4">
                <div className="text-[12px] font-bold text-dim uppercase tracking-[0.5px] mb-2">Results</div>
                <div className="flex flex-col gap-1.5">
                  {played.map(m => (
                    <div
                      key={m.id}
                      onClick={() => setStatsMatch(m)}
                      className="flex items-center justify-between px-3 py-1.5 bg-alt rounded-lg cursor-pointer"
                    >
                      <span className={`flex-1 text-[13px] ${m.winner === m.team1 ? "font-bold text-accent" : "font-normal text-dim"}`}>
                        {tName(m.team1)}
                      </span>
                      <span className="px-3 py-[3px] bg-surface rounded-md font-display text-[18px] text-text mx-1.5">
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
          </div>
        );
      })}

      {/* Advance button — hidden when viewing retrospectively */}
      {!readOnly && (
        <div className="mt-2">
          <button
            onClick={advanceToKnockout}
            disabled={!allGroupMatchesPlayed}
            className="w-full min-h-[44px] rounded-xl text-[14px] font-bold text-white bg-free border-0 cursor-pointer disabled:opacity-50"
          >
            {allGroupMatchesPlayed ? "⚡ Advance to Knockout Stage" : "⏳ Complete all group matches first"}
          </button>
        </div>
      )}

      {/* Legend modal */}
      {showLegend && (
        <ModalShell title="STANDINGS GUIDE" onClose={() => setShowLegend(false)}>
          <div className="grid gap-0">
            {LEGEND.map(({ key, label }, i) => (
              <div key={key} className={`flex items-center gap-3.5 py-3 ${i < LEGEND.length - 1 ? "border-b border-line" : ""}`}>
                <div className="w-9 h-9 rounded-[10px] bg-accent flex items-center justify-center font-display text-[15px] text-white tracking-[1px] flex-shrink-0">
                  {key}
                </div>
                <span className="text-[14px] text-text">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-accent/[0.07] rounded-[10px] border-l-[3px] border-accent">
            <div className="text-[11px] font-bold text-accent uppercase tracking-[0.8px] mb-1">Tiebreaker order</div>
            <div className="text-[13px] text-text">MP → PD → PF → Head-to-head</div>
          </div>
        </ModalShell>
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
                ⚠️ No draws in beach volleyball. Enter a decisive score.
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

export default GroupStageSection;
