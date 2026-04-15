import React, { useState } from "react";
import { uid, LEVELS, levelOf } from "../lib/utils";

// ── Knockout depth: how far a team went in the bracket ───────────────────────
// Higher weight = further round reached.
const ROUND_WEIGHT = { r16: 1, qf: 2, semi: 3, third_place: 4, final: 5 };

// PTS: Win=1 + position bonus for top-4 finish + round bonus for depth reached
const POSITION_BONUS = { 1: 12, 2: 8, 3: 5, 4: 3 }; // 1st–4th place
const ROUND_BONUS    = { 2: 2, 1: 1 };                // QF reached = +2, R16 = +1

function getKnockoutPositions(tournament) {
  const pos = {};
  const rounds = tournament.knockout?.rounds || [];

  const finalM = rounds.find(r => r.id === "final")?.matches[0];
  if (finalM?.played && finalM.winner) {
    const loser = finalM.winner === finalM.team1 ? finalM.team2 : finalM.team1;
    pos[finalM.winner] = 1;
    if (loser) pos[loser] = 2;
  }

  const thirdM = rounds.find(r => r.id === "third_place")?.matches[0];
  if (thirdM?.played && thirdM.winner) {
    const loser = thirdM.winner === thirdM.team1 ? thirdM.team2 : thirdM.team1;
    pos[thirdM.winner] = 3;
    if (loser) pos[loser] = 4;
  }

  return pos;
}

// For each team, the highest knockout round weight they participated in
function getKnockoutDepth(tournament) {
  const depth = {};
  (tournament.knockout?.rounds || []).forEach(round => {
    const w = ROUND_WEIGHT[round.id] || 0;
    round.matches.forEach(m => {
      if (m.team1) depth[m.team1] = Math.max(depth[m.team1] || 0, w);
      if (m.team2) depth[m.team2] = Math.max(depth[m.team2] || 0, w);
    });
  });
  return depth;
}

// ── Compute live team stats from all played matches ──────────────────────────
function calcAllTeamStats(tournament) {
  const allMatches = [
    ...(tournament.groups || []).flatMap(g => g.matches || []),
    ...(tournament.knockout?.rounds || []).flatMap(r => r.matches || []),
    ...(tournament.matches || []),
  ];

  const koPos   = getKnockoutPositions(tournament);
  const koDepth = getKnockoutDepth(tournament);

  const teams = tournament.teams.map(tm => {
    let wins = 0, losses = 0, pf = 0, pa = 0;
    allMatches
      .filter(m => m.played && (m.team1 === tm.id || m.team2 === tm.id))
      .forEach(m => {
        const isT1 = m.team1 === tm.id;
        const scored   = isT1 ? m.score1 : m.score2;
        const conceded = isT1 ? m.score2 : m.score1;
        pf += scored; pa += conceded;
        if (scored > conceded) wins++; else losses++;
      });
    const kp    = koPos[tm.id]   || null;
    const depth = koDepth[tm.id] || 0;
    // PTS = wins (W=1) + position bonus (top 4) + round bonus (QF/R16 depth)
    const pts = wins + (POSITION_BONUS[kp] || ROUND_BONUS[depth] || 0);
    return { ...tm, wins, losses, pf, pa, pd: pf - pa, kp, depth, pts };
  });

  // Sort priority:
  // 1. Known final positions (1–4)
  // 2. Knockout depth — semi > QF > R16 > group only
  // 3. Wins → PD → PF tiebreaker
  teams.sort((a, b) => {
    if (a.kp && b.kp) return a.kp - b.kp;
    if (a.kp) return -1;
    if (b.kp) return 1;
    if (b.depth !== a.depth) return b.depth - a.depth;
    return b.wins - a.wins || b.pd - a.pd || b.pf - a.pf;
  });

  // Attach final rank index (1-based) after sort
  return teams.map((tm, i) => ({ ...tm, rank: i + 1 }));
}

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

const selBtnCls = (active) =>
  `flex-1 px-2.5 py-3.5 rounded-xl border-2 cursor-pointer text-center transition-all ${
    active ? "border-accent bg-accent/[0.07]" : "border-line bg-surface"
  }`;

const TournamentTeamsSection = ({ tournament, setTournaments, players }) => {
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoMode, setAutoMode] = useState("random"); // "random" | "balanced"
  const [proposedTeams, setProposedTeams] = useState(null); // null | array of proposed teams

  const invitedPlayers = players.filter(p => tournament.invitedPlayers.includes(p.id));
  const availablePlayers = invitedPlayers.filter(p => !tournament.teams.some(tm => tm.players.includes(p.id)));
  const teamSize = tournament.teamSize || 2;

  const togglePlayer = (pid) => {
    setSelectedPlayers(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : prev.length < teamSize ? [...prev, pid] : prev
    );
  };

  const addTeam = () => {
    if (!teamName.trim() || selectedPlayers.length !== teamSize) return;
    const newTeam = { id: uid(), name: teamName.trim(), players: selectedPlayers, wins: 0, losses: 0, points: 0 };
    setTournaments(prev => prev.map(tour =>
      tour.id !== tournament.id ? tour : { ...tour, teams: [...tour.teams, newTeam] }
    ));
    setTeamName(""); setSelectedPlayers([]); setShowModal(false);
  };

  // ── Auto team generation ──────────────────────────────────────────────────
  const levelScore = { beginner: 1, intermediate: 2, advanced: 3 };

  const generateRandom = (pool) => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const teams = [];
    for (let i = 0; i < shuffled.length; i += teamSize) {
      const chunk = shuffled.slice(i, i + teamSize);
      if (chunk.length === teamSize) teams.push(chunk.map(p => p.id));
    }
    return teams;
  };

  const generateBalanced = (pool) => {
    // Sort by level score descending, then snake draft into teams
    const sorted = [...pool].sort((a, b) =>
      (levelScore[b.level] || 1) - (levelScore[a.level] || 1)
    );
    const numTeams = Math.floor(sorted.length / teamSize);
    const teams = Array.from({ length: numTeams }, () => []);
    sorted.forEach((p, i) => {
      const row = Math.floor(i / numTeams);
      const col = row % 2 === 0 ? i % numTeams : numTeams - 1 - (i % numTeams); // snake
      if (teams[col] && teams[col].length < teamSize) teams[col].push(p.id);
    });
    return teams.filter(t => t.length === teamSize);
  };

  const proposeTeams = () => {
    const pool = availablePlayers;
    if (pool.length < teamSize) return;
    const groups = autoMode === "random" ? generateRandom(pool) : generateBalanced(pool);
    setProposedTeams(groups.map((pIds, i) => ({
      id: uid(),
      name: "Team " + (tournament.teams.length + i + 1),
      players: pIds,
      wins: 0, losses: 0, points: 0,
    })));
  };

  const confirmProposed = () => {
    if (!proposedTeams) return;
    setTournaments(prev => prev.map(tour =>
      tour.id !== tournament.id ? tour : { ...tour, teams: [...tour.teams, ...proposedTeams] }
    ));
    setProposedTeams(null);
    setShowAutoModal(false);
  };

  // Invite player to tournament
  const [showInvite, setShowInvite] = useState(false);
  const uninvited = players.filter(p => !tournament.invitedPlayers.includes(p.id));

  const invitePlayer = (pid) => {
    setTournaments(prev => prev.map(tour =>
      tour.id !== tournament.id ? tour : { ...tour, invitedPlayers: [...tour.invitedPlayers, pid] }
    ));
  };

  const removeInvite = (pid) => {
    // Only remove if not part of any team
    const inTeam = tournament.teams.some(tm => tm.players.includes(pid));
    if (inTeam) return;
    setTournaments(prev => prev.map(tour =>
      tour.id !== tournament.id ? tour : { ...tour, invitedPlayers: tour.invitedPlayers.filter(id => id !== pid) }
    ));
  };

  const sortedTeams = calcAllTeamStats(tournament);
  const anyPlayed = sortedTeams.some(tm => tm.wins + tm.losses > 0);

  const RANK_COLORS = { 1: "#F5C842", 2: "#C0C0C0", 3: "#CD7F32" };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="font-display text-[32px] text-accent tracking-[2px] leading-none">
            {anyPlayed ? "📊 STANDINGS" : "🤝 TEAMS"}
          </h1>
          {anyPlayed && (
            <div className="text-[11px] text-dim tracking-[0.3px] mt-0.5">
              PTS = W + position bonus · 1st+12 · 2nd+8 · 3rd+5 · 4th+3
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInvite(true)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-text bg-surface border border-line cursor-pointer"
          >
            + Players
          </button>
          <button
            onClick={() => { setShowAutoModal(true); setProposedTeams(null); }}
            disabled={availablePlayers.length < teamSize}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-text bg-surface border border-line cursor-pointer disabled:opacity-50"
          >
            ⚡ Auto
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={invitedPlayers.length < teamSize}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-accent border-0 cursor-pointer disabled:opacity-50"
          >
            + Team
          </button>
        </div>
      </div>

      {/* Invited players chips */}
      {invitedPlayers.length > 0 && (
        <div className="bg-surface rounded-xl border border-line px-4 py-3.5 mb-3.5">
          <div className="text-[12px] font-bold text-dim uppercase tracking-[0.5px] mb-2.5">
            Invited players ({invitedPlayers.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {invitedPlayers.map(p => {
              const inTeam = tournament.teams.some(tm => tm.players.includes(p.id));
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 rounded-[20px] px-3 py-[5px] text-[13px] ${
                    inTeam ? "bg-accent/[0.09] font-bold text-accent" : "bg-alt font-normal text-text"
                  }`}
                >
                  <span className="text-[12px]">{levelOf(p.level).icon}</span>
                  {p.name}
                  {!inTeam && (
                    <button
                      onClick={() => removeInvite(p.id)}
                      className="bg-transparent border-0 cursor-pointer text-dim text-[12px] leading-none p-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Teams list — sorted by live performance */}
      <div className="flex flex-col gap-3">
        {sortedTeams.length === 0 && (
          <div className="bg-surface rounded-xl border border-line p-8 text-center text-dim">
            {invitedPlayers.length < teamSize
              ? `First invite at least ${teamSize} players`
              : "No teams yet. Create the first one!"}
          </div>
        )}
        {sortedTeams.map(tm => {
          const rankBg    = RANK_COLORS[tm.rank] || "var(--color-line)";
          const rankColor = RANK_COLORS[tm.rank] ? "#fff" : "var(--color-dim)";
          const posLabels = { 1: "🥇 Champion", 2: "🥈 Runner-up", 3: "🥉 3rd place", 4: "4th place" };
          const isWinner  = tournament.winner === tm.id;
          return (
            <div
              key={tm.id}
              className={`bg-surface rounded-xl border border-line p-4 flex items-center gap-3.5 ${
                tm.rank === 1 && anyPlayed
                  ? isWinner ? "border-l-[4px] border-l-free" : "border-l-[4px] border-l-success"
                  : ""
              }`}
            >
              {/* Rank badge */}
              <div
                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-display text-[20px]"
                style={{ background: rankBg, color: rankColor }}
              >
                {tm.rank}
              </div>

              {/* Name + players + stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[16px] text-text">{tm.name}</span>
                </div>
                <div className="text-[12px] text-dim mt-0.5">
                  {tm.players.map(pid => players.find(p => p.id === pid)?.name || "?").join(" · ")}
                </div>
                {anyPlayed && (
                  <div className="flex gap-2.5 mt-1.5 flex-wrap">
                    <span className="text-[12px] font-semibold text-success">{tm.wins}W</span>
                    <span className="text-[12px] text-error">{tm.losses}L</span>
                    <span className={`text-[12px] ${tm.pd > 0 ? "text-success" : tm.pd < 0 ? "text-error" : "text-dim"}`}>
                      PD {tm.pd > 0 ? "+" : ""}{tm.pd}
                    </span>
                    {tm.kp && (
                      <span className="text-[11px] font-bold text-free">
                        {posLabels[tm.kp]}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* PTS */}
              <div className="text-right flex-shrink-0">
                <div className="font-display text-[30px] text-accent leading-none">{tm.pts}</div>
                <div className="text-[10px] text-dim uppercase tracking-[0.5px]">PTS</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto team generation modal */}
      {showAutoModal && (
        <ModalShell title="AUTO TEAMS" onClose={() => { setShowAutoModal(false); setProposedTeams(null); }}>
          <div className="flex flex-col gap-4">
            {!proposedTeams ? (
              <>
                <div>
                  <div className="text-[13px] font-bold text-dim uppercase tracking-[0.5px] mb-2">Method</div>
                  <div className="flex gap-2.5">
                    {[
                      { id: "random",   icon: "🎲", label: "Random",   desc: "Random distribution" },
                      { id: "balanced", icon: "⚖️", label: "By level", desc: "Balanced teams" },
                    ].map(m => (
                      <button key={m.id} onClick={() => setAutoMode(m.id)} className={selBtnCls(autoMode === m.id)}>
                        <div className="text-[26px] mb-1">{m.icon}</div>
                        <div className={`font-bold text-[14px] ${autoMode === m.id ? "text-accent" : "text-text"}`}>{m.label}</div>
                        <div className="text-[11px] text-dim mt-0.5">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-alt rounded-xl px-3.5 py-3">
                  <div className="text-[13px] font-bold text-dim mb-2">
                    Available players ({availablePlayers.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availablePlayers.map(p => (
                      <span key={p.id} className="bg-surface rounded-[20px] px-2.5 py-1 text-[12px] flex items-center gap-1">
                        <span>{levelOf(p.level).icon}</span>{p.name}
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] text-dim mt-2">
                    {Math.floor(availablePlayers.length / teamSize)} teams of {teamSize} will be formed
                    {availablePlayers.length % teamSize > 0 && ` (${availablePlayers.length % teamSize} players left over)`}
                  </div>
                </div>

                <button
                  onClick={proposeTeams}
                  disabled={availablePlayers.length < teamSize}
                  className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50"
                >
                  {autoMode === "random" ? "🎲 Random" : "⚖️ By level"}
                </button>
              </>
            ) : (
              <>
                <div className="text-[14px] text-dim text-center">
                  Team proposal — confirm or regenerate
                </div>
                <div className="flex flex-col gap-2.5">
                  {proposedTeams.map((tm) => (
                    <div key={tm.id} className="bg-alt rounded-xl px-3.5 py-3">
                      <div className="font-bold text-[14px] text-accent mb-1.5">{tm.name}</div>
                      <div className="flex gap-2 flex-wrap">
                        {tm.players.map(pid => {
                          const pl = players.find(p => p.id === pid);
                          return pl ? (
                            <span key={pid} className="bg-surface rounded-[20px] px-2.5 py-1 text-[13px] flex items-center gap-1">
                              <span>{levelOf(pl.level).icon}</span>{pl.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={proposeTeams}
                    className="min-h-[44px] rounded-xl text-[14px] font-semibold text-text bg-surface border border-line cursor-pointer"
                  >
                    🔄 Regenerate
                  </button>
                  <button
                    onClick={confirmProposed}
                    className="min-h-[44px] rounded-xl text-[14px] font-bold text-white bg-accent border-0 cursor-pointer"
                  >
                    ✓ Confirm
                  </button>
                </div>
              </>
            )}
          </div>
        </ModalShell>
      )}

      {/* Invite modal */}
      {showInvite && (
        <ModalShell title="INVITE PLAYERS" onClose={() => setShowInvite(false)}>
          <div className="flex flex-col gap-2.5">
            {uninvited.length === 0 && (
              <div className="text-center text-dim py-5">
                All players are already invited
              </div>
            )}
            {uninvited.map(p => (
              <div
                key={p.id}
                onClick={() => invitePlayer(p.id)}
                className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-alt cursor-pointer active:opacity-80 transition-opacity"
              >
                <div className="font-semibold text-text">{p.name}</div>
                <div className="text-accent font-bold text-[20px]">+</div>
              </div>
            ))}
          </div>
        </ModalShell>
      )}

      {/* Create team modal */}
      {showModal && (
        <ModalShell title="NEW TEAM" onClose={() => { setShowModal(false); setTeamName(""); setSelectedPlayers([]); }}>
          <div className="flex flex-col gap-3.5">
            <input
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="Team name"
              className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors"
            />
            <div>
              <div className="text-[13px] font-bold text-dim mb-2">
                Select {teamSize} players ({selectedPlayers.length}/{teamSize})
              </div>
              <div className="flex flex-col gap-2">
                {invitedPlayers.map(p => {
                  const sel = selectedPlayers.includes(p.id);
                  const inOtherTeam = tournament.teams.some(tm => tm.players.includes(p.id));
                  return (
                    <div
                      key={p.id}
                      onClick={() => !inOtherTeam && togglePlayer(p.id)}
                      className={`px-3.5 py-2.5 rounded-[10px] border-2 flex justify-between items-center transition-all ${
                        inOtherTeam
                          ? "border-line bg-line/25 opacity-50 cursor-not-allowed"
                          : sel
                          ? "border-accent bg-accent/[0.07] cursor-pointer font-bold"
                          : "border-line bg-surface cursor-pointer font-normal"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-[14px]">{levelOf(p.level).icon}</span>
                        <span className="text-text">{p.name}</span>
                      </span>
                      {inOtherTeam && <span className="text-[11px] text-dim">already in team</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={addTeam}
              disabled={!teamName.trim() || selectedPlayers.length !== teamSize}
              className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50"
            >
              Create team
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default TournamentTeamsSection;
