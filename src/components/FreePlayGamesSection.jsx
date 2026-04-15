import React, { useState } from "react";
import { TR } from "../lib/i18n";
import GameStats from "./GameStats";

export default function FreePlayGamesSection({ freePlay, players, onStartGame }) {
  const [expandedId, setExpandedId] = useState(null);

  const teams = freePlay.teams || [];
  const games = (freePlay.games || []).filter(g => g.played);
  const tName = id => teams.find(tm => tm.id === id)?.name || "?";

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-display text-[32px] text-accent tracking-[2px]">FREE PLAYS</h1>
        <button
          onClick={() => onStartGame()}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-accent border-0 cursor-pointer"
        >
          + New Game
        </button>
      </div>

      {games.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-10 text-center text-dim">
          <div className="text-[32px] mb-2">🎮</div>
          No games yet. Start one from the LIVE tab!
          <div className="mt-4">
            <button
              onClick={() => onStartGame()}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-accent border-0 cursor-pointer"
            >
              Go to Live
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {[...games].reverse().map(game => {
            const isExpanded = expandedId === game.id;
            const winnerNum = game.winner === game.team1 ? 1 : 2;
            const t1Sets = (game.sets || []).filter(s => s.winner === 1).length;
            const t2Sets = (game.sets || []).filter(s => s.winner === 2).length;
            const hasStats = Array.isArray(game.log) && game.log.length > 0;

            return (
              <div key={game.id} className="bg-surface rounded-xl border border-line overflow-hidden">
                <div
                  onClick={() => hasStats && setExpandedId(isExpanded ? null : game.id)}
                  className={`flex items-center px-4 py-3.5 ${hasStats ? "cursor-pointer" : ""}`}
                >
                  <span className={`flex-1 text-[14px] ${game.winner === game.team1 ? "font-bold text-accent" : "font-normal text-dim"}`}>
                    {tName(game.team1)}
                  </span>
                  <div className="px-4 py-1 bg-alt rounded-lg font-display text-[22px] text-text mx-2 flex-shrink-0">
                    {game.score1} – {game.score2}
                  </div>
                  <span className={`flex-1 text-right text-[14px] ${game.winner === game.team2 ? "font-bold text-accent" : "font-normal text-dim"}`}>
                    {tName(game.team2)}
                  </span>
                  {hasStats && (
                    <span className="text-[16px] ml-2.5 text-dim flex-shrink-0">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  )}
                </div>

                {isExpanded && hasStats && (
                  <div className="border-t border-line p-4">
                    <GameStats
                      winner={winnerNum}
                      team1Id={game.team1}
                      team2Id={game.team2}
                      sets={game.sets || []}
                      t1Sets={t1Sets}
                      t2Sets={t2Sets}
                      log={game.log}
                      teams={teams}
                      players={players}
                      onSaveResult={null}
                      activeTourMatchId={null}
                      reset={null}
                      t={k => TR[k] || k}
                    />
                  </div>
                )}

                <div className="px-4 pt-1.5 pb-2.5 flex justify-between items-center">
                  <span className="text-[11px] text-dim">{game.date}</span>
                  <span className="text-[11px] font-bold text-success bg-success/15 px-2.5 py-[4px] rounded-[8px]">
                    🏆 {tName(game.winner)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
