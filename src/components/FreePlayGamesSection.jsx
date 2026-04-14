import React, { useState } from "react";
import { G, Card, Btn, Badge } from "./ui";
import { TR } from "../lib/i18n";
import GameStats from "./GameStats";

export default function FreePlayGamesSection({ freePlay, players, onStartGame }) {
  const [expandedId, setExpandedId] = useState(null);

  const teams = freePlay.teams || [];
  const games = (freePlay.games || []).filter(g => g.played);
  const tName = id => teams.find(tm => tm.id === id)?.name || "?";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: G.ocean, letterSpacing: 2 }}>
          FREE PLAYS
        </h1>
        <Btn onClick={() => onStartGame()} variant="sun">+ New Game</Btn>
      </div>

      {games.length === 0 ? (
        <Card style={{ textAlign: "center", color: G.textLight, padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎮</div>
          No games yet. Start one from the LIVE tab!
          <div style={{ marginTop: 16 }}>
            <Btn onClick={() => onStartGame()} variant="primary">Go to Live</Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {[...games].reverse().map(game => {
            const isExpanded = expandedId === game.id;
            const winnerNum = game.winner === game.team1 ? 1 : 2;
            const t1Sets = (game.sets || []).filter(s => s.winner === 1).length;
            const t2Sets = (game.sets || []).filter(s => s.winner === 2).length;
            const hasStats = Array.isArray(game.log) && game.log.length > 0;

            return (
              <Card key={game.id} style={{ padding: 0, overflow: "hidden" }}>
                <div
                  onClick={() => hasStats && setExpandedId(isExpanded ? null : game.id)}
                  style={{
                    display: "flex", alignItems: "center",
                    padding: "14px 16px",
                    cursor: hasStats ? "pointer" : "default",
                  }}
                >
                  <span style={{
                    flex: 1, fontSize: 14, fontWeight: game.winner === game.team1 ? 700 : 400,
                    color: game.winner === game.team1 ? G.ocean : G.textLight,
                  }}>
                    {tName(game.team1)}
                  </span>
                  <div style={{
                    padding: "4px 16px", background: G.sand, borderRadius: 8,
                    fontFamily: "'Bebas Neue'", fontSize: 22, color: G.text, margin: "0 8px", flexShrink: 0,
                  }}>
                    {game.score1} – {game.score2}
                  </div>
                  <span style={{
                    flex: 1, textAlign: "right", fontSize: 14,
                    fontWeight: game.winner === game.team2 ? 700 : 400,
                    color: game.winner === game.team2 ? G.ocean : G.textLight,
                  }}>
                    {tName(game.team2)}
                  </span>
                  {hasStats && (
                    <span style={{ fontSize: 16, marginLeft: 10, color: G.textLight, flexShrink: 0 }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  )}
                </div>

                {isExpanded && hasStats && (
                  <div style={{ borderTop: "1px solid " + G.sandDark, padding: "16px" }}>
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

                <div style={{
                  padding: "6px 16px 10px", display: "flex",
                  justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 11, color: G.textLight }}>{game.date}</span>
                  <Badge color={G.success}>🏆 {tName(game.winner)}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
