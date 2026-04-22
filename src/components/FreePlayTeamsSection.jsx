import React, { useState } from "react";
import { uid } from "../lib/utils";

function calcStandings(teams, games, players = []) {
  return teams.map(tm => {
    let wins = 0, losses = 0, pf = 0, pa = 0, played = 0;
    (games || [])
      .filter(g => g.played && (g.team1 === tm.id || g.team2 === tm.id))
      .forEach(g => {
        played++;
        const isT1 = g.team1 === tm.id;
        pf += isT1 ? g.score1 : g.score2;
        pa += isT1 ? g.score2 : g.score1;
        if (g.winner === tm.id) wins++; else losses++;
      });
    const playerNames = (tm.players || []).map(pid => {
      const p = players.find(x => x.id === pid);
      return p ? (p.displayName || p.nickname || p.name) : "Unknown";
    }).join(" · ");
    return { id: tm.id, name: tm.name, playerNames, played, wins, losses, pf, pa, pd: pf - pa, pts: wins };
  }).sort((a, b) => b.pts - a.pts || b.pd - a.pd || b.pf - a.pf);
}

const FP_LEGEND = [
  { key: "P",   label: "Matches played" },
  { key: "W",   label: "Wins" },
  { key: "L",   label: "Losses" },
  { key: "PD",  label: "Point Difference (sets for − sets against)" },
  { key: "PTS", label: "Points  ·  Win = 1  ·  Loss = 0" },
];

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

function StandingsTable({ rows }) {
  const [showLegend, setShowLegend] = useState(false);
  const cols = ["#", "Team", "P", "W", "L", "PD", "PTS"];
  return (
    <>
      <div className="flex justify-end mb-1.5">
        <button
          onClick={() => setShowLegend(true)}
          className="bg-transparent border-0 cursor-pointer text-dim text-[12px] px-1.5 py-0.5"
        >
          ℹ️ key
        </button>
      </div>
      {showLegend && (
        <ModalShell title="STANDINGS GUIDE" onClose={() => setShowLegend(false)}>
          <div className="grid gap-0">
            {FP_LEGEND.map(({ key, label }, i) => (
              <div key={key} className={`flex items-center gap-3.5 py-3 ${i < FP_LEGEND.length - 1 ? "border-b border-line" : ""}`}>
                <div className="w-9 h-9 rounded-[10px] bg-accent flex items-center justify-center font-display text-[13px] text-white tracking-wide flex-shrink-0">
                  {key}
                </div>
                <span className="text-[14px] text-text">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-accent/[0.07] rounded-[10px] border-l-[3px] border-accent">
            <div className="text-[11px] font-bold text-accent uppercase tracking-[0.8px] mb-1">Tiebreaker order</div>
            <div className="text-[13px] text-text">PTS → PD → PF</div>
          </div>
        </ModalShell>
      )}
      <div className="grid grid-cols-[28px_1fr_28px_28px_28px_36px_40px] gap-1 text-[10px] font-bold text-dim uppercase tracking-[0.5px] pb-1.5 border-b border-line mb-1">
        {cols.map(c => (
          <span key={c} className={c === "Team" ? "text-left" : "text-center"}>{c}</span>
        ))}
      </div>
      {rows.map((row, rank) => (
        <div
          key={row.id}
          className={`grid grid-cols-[28px_1fr_28px_28px_28px_36px_40px] gap-1 items-center py-[7px] ${rank < rows.length - 1 ? "border-b border-line" : ""}`}
        >
          <span className={`font-bold text-[15px] ${rank === 0 ? "text-free" : "text-dim"}`}>
            {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : rank + 1}
          </span>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="font-semibold text-[13px] truncate">{row.name}</span>
            {row.playerNames && (
              <span className="text-[10px] text-dim mt-0.5 truncate">{row.playerNames}</span>
            )}
          </div>
          {[row.played, row.wins, row.losses, row.pd, row.pts].map((val, ci) => (
            <span
              key={ci}
              className={`text-center text-[13px] ${
                ci === 4 ? "font-bold text-accent" :
                ci === 3 ? (val > 0 ? "text-success" : val < 0 ? "text-error" : "text-text") :
                "text-text"
              }`}
            >
              {val}
            </span>
          ))}
        </div>
      ))}
    </>
  );
}

export default function FreePlayTeamsSection({ freePlay, setFreePlays, players }) {
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [pickedPlayerIds, setPickedPlayerIds] = useState([]);

  const teams    = freePlay.teams || [];
  const games    = freePlay.games || [];
  const hasGames = games.some(g => g.played);
  const standings = calcStandings(teams, games, players);

  const togglePlayer = (pid) =>
    setPickedPlayerIds(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]);

  const createTeam = () => {
    if (!newTeamName.trim()) return;
    const newTeam = { id: uid(), name: newTeamName.trim(), players: pickedPlayerIds };
    setFreePlays(prev => prev.map(fp =>
      fp.id !== freePlay.id ? fp : { ...fp, teams: [...fp.teams, newTeam] }
    ));
    setNewTeamName(""); setPickedPlayerIds([]); setShowNewTeam(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-display text-[32px] text-accent tracking-[2px]">
          {hasGames ? "STANDINGS" : "TEAMS"}
        </h1>
        <button
          onClick={() => setShowNewTeam(true)}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-accent border-0 cursor-pointer"
        >
          + New Team
        </button>
      </div>

      {hasGames && standings.length > 0 && (
        <div className="bg-surface rounded-xl border border-line p-4 mb-4 overflow-x-auto">
          <StandingsTable rows={standings} />
        </div>
      )}

      {teams.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-10 text-center text-dim">
          <div className="text-[32px] mb-2">🤝</div>
          No teams yet. Create the first one!
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {standings.map((stat, rank) => {
            const team = teams.find(t => t.id === stat.id);
            if (!team) return null;
            return (
              <div key={team.id} className="bg-surface rounded-xl border border-line px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-[18px] flex-shrink-0">
                      {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`}
                    </span>
                    <div>
                      <div className="font-bold text-[15px] text-text">{team.name}</div>
                      <div className="text-[12px] text-dim">
                        {(team.players || []).map(pid => players.find(p => p.id === pid)?.name || pid).join(" · ") || "No players assigned"}
                      </div>
                    </div>
                  </div>
                  {stat.played > 0 && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className="text-[11px] font-bold text-success bg-success/15 px-2.5 py-[4px] rounded-[8px]">{stat.wins}W</span>
                      <span className="text-[11px] font-bold text-error bg-error/15 px-2.5 py-[4px] rounded-[8px]">{stat.losses}L</span>
                      <span className="text-[11px] font-bold text-accent bg-accent/15 px-2.5 py-[4px] rounded-[8px]">{stat.pts}pts</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewTeam && (
        <ModalShell title="NEW TEAM" onClose={() => { setShowNewTeam(false); setNewTeamName(""); setPickedPlayerIds([]); }}>
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[12px] font-bold text-dim uppercase tracking-wide mb-1.5">Team Name</div>
              <input
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="e.g. Team Alpha"
                className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <div className="text-[12px] font-bold text-dim uppercase tracking-wide mb-2">
                Players (same player can be on multiple teams)
              </div>
              {players.length === 0 ? (
                <div className="text-dim text-[13px]">No global players yet. Add from Players tab.</div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto">
                  {players.map(p => {
                    const picked = pickedPlayerIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlayer(p.id)}
                        className={`px-3.5 py-2.5 rounded-[10px] border-2 cursor-pointer text-left w-full flex items-center gap-2 transition-all ${
                          picked
                            ? "border-accent bg-accent/[0.07]"
                            : "border-line bg-surface"
                        }`}
                      >
                        <span className="text-[16px]">{picked ? "✅" : "⬜"}</span>
                        <span className={`${picked ? "font-bold text-accent" : "font-normal text-text"}`}>{p.name}</span>
                        <span className="text-[11px] text-dim ml-auto">{p.level}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {pickedPlayerIds.length > 0 && (
                <div className="text-[12px] text-accent mt-1.5 font-semibold">
                  {pickedPlayerIds.length} player{pickedPlayerIds.length !== 1 ? "s" : ""} selected
                </div>
              )}
            </div>
            <button
              onClick={createTeam}
              disabled={!newTeamName.trim()}
              className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50"
            >
              Create Team
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
