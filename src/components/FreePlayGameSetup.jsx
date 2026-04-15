import React, { useState } from "react";

const selBtnCls = (active) =>
  `flex-1 py-3 rounded-xl border-2 text-[14px] cursor-pointer text-center transition-all ${
    active
      ? "border-accent bg-accent/[0.07] font-bold text-text"
      : "border-line bg-surface font-normal text-text"
  }`;

export default function FreePlayGameSetup({ freePlay, onStartGame }) {
  const [team1Id, setTeam1Id] = useState("");
  const [team2Id, setTeam2Id] = useState("");
  const [setsPerMatch, setSetsPerMatch] = useState(1);

  const teams = freePlay.teams || [];
  const canStart = team1Id && team2Id && team1Id !== team2Id;

  if (teams.length < 2) {
    return (
      <div>
        <h1 className="font-display text-[32px] text-accent tracking-[2px] mb-5">LIVE</h1>
        <div className="bg-surface rounded-xl border border-line p-10 text-center text-dim">
          <div className="text-[32px] mb-2">🏐</div>
          You need at least 2 teams to play.
          <div className="text-[13px] mt-2">Go to the TEAMS tab to create them.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[32px] text-accent tracking-[2px] mb-5">START A GAME</h1>

      <div className="bg-surface rounded-xl border border-line p-4">
        <div className="flex flex-col gap-5">
          {/* Team 1 */}
          <div>
            <div className="text-[12px] font-bold text-accent uppercase tracking-[0.5px] mb-2">Team 1</div>
            <select
              value={team1Id}
              onChange={e => setTeam1Id(e.target.value)}
              className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors cursor-pointer"
            >
              <option value="">— Select team —</option>
              {teams.map(tm => (
                <option key={tm.id} value={tm.id}>{tm.name}</option>
              ))}
            </select>
          </div>

          <div className="text-center font-display text-[32px] text-line tracking-[2px]">VS</div>

          {/* Team 2 */}
          <div>
            <div className="text-[12px] font-bold text-free uppercase tracking-[0.5px] mb-2">Team 2</div>
            <select
              value={team2Id}
              onChange={e => setTeam2Id(e.target.value)}
              className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors cursor-pointer"
            >
              <option value="">— Select team —</option>
              {teams.filter(tm => tm.id !== team1Id).map(tm => (
                <option key={tm.id} value={tm.id}>{tm.name}</option>
              ))}
            </select>
          </div>

          {/* Sets */}
          <div>
            <div className="text-[12px] font-bold text-dim uppercase tracking-[0.5px] mb-2">Sets per match</div>
            <div className="flex gap-2">
              {[1, 3, 5].map(n => (
                <button key={n} onClick={() => setSetsPerMatch(n)} className={selBtnCls(setsPerMatch === n)}>
                  {n === 1 ? "1 set" : `Best of ${n}`}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onStartGame(team1Id, team2Id, setsPerMatch)}
            disabled={!canStart}
            className="w-full min-h-[44px] rounded-xl text-[14px] font-bold text-white bg-accent border-0 cursor-pointer disabled:opacity-50"
          >
            🏐 Start Game
          </button>
        </div>
      </div>
    </div>
  );
}
