import React, { useState } from "react";
import { uid, now } from "../lib/utils";

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
  `flex-1 px-3 py-3 rounded-xl border-2 text-[14px] cursor-pointer text-center transition-all ${
    active
      ? "border-accent bg-accent/[0.07] font-bold text-text"
      : "border-line bg-surface font-normal text-text"
  }`;

const TournamentsSection = ({ tournaments, setTournaments, players, setPlayers, onOpenTournament }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(now());
  const [teamSize, setTeamSize] = useState(2);
  const [setsPerMatch, setSetsPerMatch] = useState(1);

  const createTournament = () => {
    if (!name.trim()) return;
    const newT = {
      id: uid(),
      name: name.trim(),
      date,
      teamSize,       // 2 or 3 players per team
      setsPerMatch,   // 1, 3 or 5
      phase: "setup", // "setup" | "group" | "freeplay" | "knockout" | "completed"
      status: "active",
      invitedPlayers: [],
      teams: [],
      groups: [],     // populated when group stage is generated
      knockout: null, // populated when advancing to knockout
      matches: [],    // used for free-play round-robin
      winner: null,
    };
    setTournaments(prev => [...prev, newT]);
    setName(""); setShowCreate(false);
    onOpenTournament(newT.id);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-display text-[36px] text-accent tracking-[2px]">🏆 TOURNAMENTS</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-accent border-0 cursor-pointer"
        >
          + Create
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {tournaments.length === 0 && (
          <div className="bg-surface rounded-xl border border-line p-10 text-center text-dim">
            No tournaments yet. Create the first one!
          </div>
        )}
        {[...tournaments].reverse().map(tour => (
          <div
            key={tour.id}
            onClick={() => onOpenTournament(tour.id)}
            className="bg-surface rounded-xl border border-line p-4 cursor-pointer active:opacity-80 transition-opacity"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[17px] font-bold text-text">{tour.name}</div>
                <div className="text-[13px] text-dim mt-0.5">
                  {tour.date} · {tour.teamSize} players/team · {tour.teams.length} teams · {tour.setsPerMatch === 1 ? "1 set" : tour.setsPerMatch + " sets"}
                </div>
                {tour.winner && (
                  <div className="mt-2">
                    <span className="text-[11px] font-bold text-free bg-free/15 px-2.5 py-[4px] rounded-[8px]">
                      🥇 {tour.teams.find(tm => tm.id === tour.winner)?.name || "?"}
                    </span>
                  </div>
                )}
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-[4px] rounded-[8px] flex-shrink-0 ${
                tour.status === "completed"
                  ? "text-success bg-success/15"
                  : "text-accent bg-accent/15"
              }`}>
                {tour.status === "completed" ? "Completed" : "In progress"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <ModalShell title="NEW TOURNAMENT" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-4">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tournament name"
              className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors"
            />
            <input
              value={date}
              onChange={e => setDate(e.target.value)}
              placeholder="Date (dd/mm/yyyy)"
              className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors"
            />

            <div>
              <div className="text-[13px] font-bold text-dim uppercase tracking-wide mb-2">Players per team</div>
              <div className="flex gap-2.5">
                {[2, 3].map(n => (
                  <button key={n} onClick={() => setTeamSize(n)} className={selBtnCls(teamSize === n)}>
                    {n} players
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[13px] font-bold text-dim uppercase tracking-wide mb-2">Sets per match</div>
              <div className="flex gap-2.5">
                {[1, 3, 5].map(n => (
                  <button key={n} onClick={() => setSetsPerMatch(n)} className={selBtnCls(setsPerMatch === n)}>
                    {n === 1 ? "1 set" : n + " sets"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={createTournament}
              disabled={!name.trim()}
              className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50"
            >
              Create tournament
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default TournamentsSection;
