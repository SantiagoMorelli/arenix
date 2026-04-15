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

export default function FreePlaysSection({ freePlays, setFreePlays, players, onOpenFreePlay }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");

  const createFreePlay = () => {
    if (!name.trim()) return;
    const newFp = {
      id: uid(),
      name: name.trim(),
      date: now(),
      teams: [],
      games: [],
    };
    setFreePlays(prev => [...prev, newFp]);
    setName("");
    setShowCreate(false);
    onOpenFreePlay(newFp.id);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-display text-[36px] text-accent tracking-[2px]">🎮 FREE PLAY</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-accent border-0 cursor-pointer"
        >
          + Create
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {freePlays.length === 0 && (
          <div className="bg-surface rounded-xl border border-line p-10 text-center text-dim">
            <div className="text-[32px] mb-2">🎮</div>
            No free plays yet. Create the first one!
          </div>
        )}
        {[...freePlays].reverse().map(fp => {
          const gamesPlayed = (fp.games || []).filter(g => g.played).length;
          return (
            <div
              key={fp.id}
              onClick={() => onOpenFreePlay(fp.id)}
              className="bg-surface rounded-xl border border-line p-4 cursor-pointer active:opacity-80 transition-opacity flex justify-between items-start"
            >
              <div>
                <div className="text-[17px] font-bold text-text">{fp.name}</div>
                <div className="text-[13px] text-dim mt-1">
                  {fp.date} · {(fp.teams || []).length} teams · {gamesPlayed} games played
                </div>
              </div>
              <span className="text-[11px] font-bold text-free bg-free/15 px-2.5 py-[4px] rounded-[8px]">Open</span>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <ModalShell title="NEW FREE PLAY" onClose={() => { setShowCreate(false); setName(""); }}>
          <div className="flex flex-col gap-4">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sunday Session"
              className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={createFreePlay}
              disabled={!name.trim()}
              className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50"
            >
              Create Free Play
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
