import React from "react";

const PointLog = ({ log, logRef, team1Id, team2Id, teams, players }) => {
  const getTeam   = id => teams.find(tm => tm.id === id);
  const getPlayer = id => {
    if (id && id.startsWith("free_")) return { id, name: id.slice(5) };
    return players.find(p => p.id === id);
  };
  const tName      = id => getTeam(id)?.name || "?";
  const playerName = id => getPlayer(id)?.name || "?";

  return (
    <div className="bg-surface rounded-xl border border-line overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-alt">
        <span className="font-display text-[18px] text-accent tracking-wide">HISTORY</span>
      </div>

      {/* Log list */}
      <div ref={logRef} className="max-h-[160px] overflow-y-auto">
        {log.length === 0 && (
          <div className="text-dim text-[13px] text-center py-4">No points yet</div>
        )}

        {[...log].reverse().map((entry) => {
          /* ── Divider / system event (side change, set end, etc.) ── */
          if (!entry.team) return (
            <div
              key={entry.id}
              className="py-[5px] px-4 text-[12px] font-bold text-accent text-center border-b border-line"
            >
              {entry.msg}
            </div>
          );

          /* ── Point entry ── */
          const isTeam1  = entry.team === 1;
          const teamColor = isTeam1 ? "text-accent" : "text-free";

          return (
            <div
              key={entry.id}
              className="py-[5px] px-4 flex items-center gap-2 border-b border-line last:border-b-0"
            >
              <span className="text-[16px] flex-shrink-0">
                {entry.pointTypeIcon || "🏐"}
              </span>

              <div className="flex-1 min-w-0">
                <div className={`text-[12px] font-bold ${teamColor}`}>
                  {entry.pointTypeLabel || "Punto"} · {tName(isTeam1 ? team1Id : team2Id)}
                </div>
                <div className="text-[11px] text-dim flex flex-wrap gap-1 items-center">
                  {entry.scoringPlayerId && (
                    <span className={`font-semibold ${teamColor}`}>
                      {playerName(entry.scoringPlayerId)}
                    </span>
                  )}
                  {entry.errorPlayerId && (
                    <span className="font-semibold text-error">
                      ❌ {playerName(entry.errorPlayerId)}
                    </span>
                  )}
                  {(entry.scoringPlayerId || entry.errorPlayerId) && (
                    <span className="text-line">·</span>
                  )}
                  <span>Sacó: {playerName(entry.serverPlayerId)}</span>
                  {entry.streak > 1 && (
                    <span className="text-accent">🔥 {entry.streak}</span>
                  )}
                  {entry.sideChange && (
                    <span className="text-free">🔄</span>
                  )}
                </div>
              </div>

              <div className="font-display text-[18px] text-text bg-alt rounded-[8px] px-2 py-0.5 flex-shrink-0">
                {entry.t1}–{entry.t2}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PointLog;
