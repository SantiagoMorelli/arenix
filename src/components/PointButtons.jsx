import React from "react";

const PointButtons = ({ side, onPoint, team1Id, team2Id, teams }) => {
  const tName = id => teams.find(tm => tm.id === id)?.name || "?";

  const leftNum  = side.t1 === "left" ? 1 : 2;
  const rightNum = side.t1 === "left" ? 2 : 1;

  const btnClass = (num) =>
    num === 1
      ? "flex-1 min-h-[52px] rounded-[16px] text-[15px] font-bold text-white border-0 cursor-pointer bg-accent active:opacity-85 transition-opacity"
      : "flex-1 min-h-[52px] rounded-[16px] text-[15px] font-bold text-white border-0 cursor-pointer bg-free active:opacity-85 transition-opacity";

  return (
    <div className="grid grid-cols-2 gap-3 mb-3">
      <button
        onClick={() => onPoint(leftNum)}
        className={btnClass(leftNum)}
      >
        +1 {tName(leftNum === 1 ? team1Id : team2Id)}
      </button>
      <button
        onClick={() => onPoint(rightNum)}
        className={btnClass(rightNum)}
      >
        +1 {tName(rightNum === 1 ? team1Id : team2Id)}
      </button>
    </div>
  );
};

export default PointButtons;
