import React, { useState } from "react";
import { uid } from "../lib/utils";
import { LEVELS, levelOf } from "../lib/utils";

const LEVEL_CLS = {
  beginner:     { active: "border-success bg-success/15 text-success", inactive: "border-line bg-surface text-text" },
  intermediate: { active: "border-accent  bg-accent/15  text-accent",  inactive: "border-line bg-surface text-text" },
  advanced:     { active: "border-error   bg-error/15   text-error",   inactive: "border-line bg-surface text-text" },
};

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

const PlayersSection = ({ players, setPlayers, contextual = false }) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("beginner");
  const sorted = [...players].sort((a, b) => b.points - a.points);

  const addPlayer = () => {
    if (!name.trim()) return;
    setPlayers(prev => [...prev, { id: uid(), name: name.trim(), wins: 0, losses: 0, points: 0, level }]);
    setName(""); setLevel("beginner"); setShowModal(false);
  };

  const RANK_STYLE = [
    { bg: "#F5C842", color: "#fff" },
    { bg: "#C0C0C0", color: "#fff" },
    { bg: "#CD7F32", color: "#fff" },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-display text-[36px] text-accent tracking-[2px]">🏐 PLAYERS</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-accent border-0 cursor-pointer"
        >
          + Add
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.map((p, i) => {
          const rankStyle = RANK_STYLE[i] || { bg: "var(--color-line)", color: "var(--color-dim)" };
          return (
            <div key={p.id} className="bg-surface rounded-xl border border-line p-4 flex items-center gap-4">
              {/* Rank circle */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-display text-[20px] flex-shrink-0"
                style={{ background: rankStyle.bg, color: rankStyle.color }}
              >
                {i + 1}
              </div>
              {/* Name + record */}
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-bold text-text">{p.name}</div>
                <div className="text-[13px] text-dim mt-0.5">{p.wins}W – {p.losses}L</div>
              </div>
              {/* Points */}
              <div className="text-right">
                <div className="font-display text-[28px] text-accent leading-none">{p.points}</div>
                <div className="text-[11px] text-dim uppercase tracking-wide">pts</div>
              </div>
              {/* Avatar initials */}
              <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-[13px] text-white font-bold flex-shrink-0">
                {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <ModalShell title="NEW PLAYER" onClose={() => { setShowModal(false); setName(""); setLevel("beginner"); }}>
          <div className="flex flex-col gap-3.5">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              className="w-full border-2 border-line rounded-xl px-3.5 py-2.5 text-[15px] text-text bg-surface outline-none focus:border-accent transition-colors"
            />
            <div>
              <div className="text-[13px] font-bold text-dim uppercase tracking-wide mb-2">Level</div>
              <div className="flex gap-2">
                {LEVELS.map(lv => {
                  const active = level === lv.id;
                  const cls = LEVEL_CLS[lv.id] || LEVEL_CLS.beginner;
                  return (
                    <button
                      key={lv.id}
                      onClick={() => setLevel(lv.id)}
                      className={`flex-1 px-1.5 py-2.5 rounded-[10px] border-2 text-[12px] cursor-pointer text-center transition-all ${
                        active ? cls.active : cls.inactive
                      }`}
                    >
                      <div className="text-[18px] mb-0.5">{lv.icon}</div>
                      {lv.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={addPlayer}
              disabled={!name.trim()}
              className="w-full min-h-[44px] rounded-xl text-[14px] font-bold bg-accent text-white border-0 cursor-pointer disabled:opacity-50"
            >
              Add player
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default PlayersSection;
