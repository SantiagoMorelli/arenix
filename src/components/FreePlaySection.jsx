import React, { useState, useContext } from "react";
import { G, Card, Btn, Badge, Input, Modal } from "./ui";
import { LangCtx, TR } from "../lib/i18n";
import { uid, now } from "../lib/utils";
import { SAVE_KEY } from "../hooks/useLiveGame";
import LiveScoreSection from "./LiveScoreSection";
import GameStats from "./GameStats";

// Standings: 1 pt per win, sort by wins → PD → PF
function calcStandings(teams, games) {
  return teams.map(tm => {
    let wins = 0, losses = 0, pf = 0, pa = 0, played = 0;
    (games || [])
      .filter(g => g.played && (g.team1 === tm.id || g.team2 === tm.id))
      .forEach(g => {
        played++;
        const isT1 = g.team1 === tm.id;
        const scored   = isT1 ? g.score1 : g.score2;
        const conceded = isT1 ? g.score2 : g.score1;
        pf += scored; pa += conceded;
        if (g.winner === tm.id) wins++;
        else losses++;
      });
    return { id: tm.id, name: tm.name, played, wins, losses, pf, pa, pd: pf - pa, pts: wins };
  }).sort((a, b) => b.pts - a.pts || b.pd - a.pd || b.pf - a.pf);
}

const FP_LEGEND = [
  { key: "P",   label: "Matches played" },
  { key: "W",   label: "Wins" },
  { key: "L",   label: "Losses" },
  { key: "PD",  label: "Point Difference (sets for − sets against)" },
  { key: "PTS", label: "Points  ·  Win = 1  ·  Loss = 0" },
];

function StandingsTable({ rows }) {
  const [showLegend, setShowLegend] = useState(false);
  const cols = ["#", "Team", "P", "W", "L", "PD", "PTS"];
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <button onClick={() => setShowLegend(true)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: G.textLight, fontSize: 12, padding: "2px 6px",
          fontFamily: "'DM Sans', sans-serif",
        }}>ℹ️ key</button>
      </div>
      {showLegend && (
        <Modal title="STANDINGS GUIDE" onClose={() => setShowLegend(false)}>
          <div style={{ display: "grid", gap: 0 }}>
            {FP_LEGEND.map(({ key, label }, i) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 0",
                borderBottom: i < FP_LEGEND.length - 1 ? "1px solid " + G.sandDark : "none",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: G.ocean,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Bebas Neue'", fontSize: 13, color: G.white, letterSpacing: 1, flexShrink: 0,
                }}>
                  {key}
                </div>
                <span style={{ fontSize: 14, color: G.text }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 16, padding: "12px 14px",
            background: G.ocean + "12", borderRadius: 10, borderLeft: "3px solid " + G.ocean,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.ocean, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
              Tiebreaker order
            </div>
            <div style={{ fontSize: 13, color: G.text }}>PTS → PD → PF</div>
          </div>
        </Modal>
      )}
      <div style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr 28px 28px 28px 36px 40px",
        gap: 4, fontSize: 10, fontWeight: 700, color: G.textLight, textTransform: "uppercase",
        letterSpacing: 0.5, paddingBottom: 6, borderBottom: "1px solid " + G.sandDark, marginBottom: 4,
      }}>
        {cols.map(c => <span key={c} style={{ textAlign: c === "Team" ? "left" : "center" }}>{c}</span>)}
      </div>
      {rows.map((row, rank) => (
        <div key={row.id} style={{
          display: "grid",
          gridTemplateColumns: "24px 1fr 28px 28px 28px 36px 40px",
          gap: 4, alignItems: "center", padding: "7px 0",
          borderBottom: rank < rows.length - 1 ? "1px solid " + G.sandDark : "none",
        }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: rank === 0 ? G.sun : G.textLight }}>
            {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : rank + 1}
          </span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</span>
          {[row.played, row.wins, row.losses, row.pd, row.pts].map((val, ci) => (
            <span key={ci} style={{
              textAlign: "center", fontSize: 13,
              fontWeight: ci === 4 ? 700 : 400,
              color: ci === 4 ? G.ocean : ci === 3 ? (val > 0 ? G.success : val < 0 ? G.danger : G.text) : G.text,
            }}>{val}</span>
          ))}
        </div>
      ))}
    </>
  );
}

const SUB_TABS = [
  { id: "teams",   icon: "🤝", label: "TEAMS"   },
  { id: "live",    icon: "🏐", label: "LIVE"    },
  { id: "results", icon: "📊", label: "RESULTS" },
];

export default function FreePlaySection({ freePlay, setFreePlay, players }) {
  const { t } = useContext(LangCtx);

  const [fpTab, setFpTab] = useState("teams");

  // Team creation
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [pickedPlayerIds, setPickedPlayerIds] = useState([]);

  // Live game setup
  const [team1Id, setTeam1Id] = useState("");
  const [team2Id, setTeam2Id] = useState("");
  const [setsPerMatch, setSetsPerMatch] = useState(1);
  const [pendingMatch, setPendingMatch] = useState(null);

  // Results
  const [expandedGameId, setExpandedGameId] = useState(null);

  const teams  = freePlay.teams  || [];
  const games  = freePlay.games  || [];
  const standings = calcStandings(teams, games);
  const tName = id => teams.find(tm => tm.id === id)?.name || "?";

  // ── Team creation ───────────────────────────────────────────────────────────
  const togglePlayer = (pid) => {
    setPickedPlayerIds(prev =>
      prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]
    );
  };

  const createTeam = () => {
    if (!newTeamName.trim()) return;
    const newTeam = { id: uid(), name: newTeamName.trim(), players: pickedPlayerIds };
    setFreePlay(prev => ({ ...prev, teams: [...prev.teams, newTeam] }));
    setNewTeamName(""); setPickedPlayerIds([]); setShowNewTeam(false);
  };

  // ── Live game ────────────────────────────────────────────────────────────────
  const startGame = () => {
    if (!team1Id || !team2Id || team1Id === team2Id) return;
    const match = { id: uid(), team1: team1Id, team2: team2Id, played: false, winner: null, score1: 0, score2: 0 };
    setPendingMatch(match);
  };

  const cancelGame = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setPendingMatch(null);
  };

  const handleSaveResult = (matchId, score1, score2, winnerTeamId, log, sets) => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    const completedGame = {
      id: matchId,
      team1: pendingMatch.team1,
      team2: pendingMatch.team2,
      played: true,
      winner: winnerTeamId,
      score1, score2, sets: sets || [], log: log || [],
      date: now(),
    };
    setFreePlay(prev => ({ ...prev, games: [...prev.games, completedGame] }));
    setPendingMatch(null);
    setTeam1Id(""); setTeam2Id("");
    setFpTab("results");
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color: G.ocean, letterSpacing: 2, marginBottom: 20 }}>
        🎮 FREE PLAY
      </h1>

      {/* Sub-tab bar */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 20,
        background: G.sandDark + "55", borderRadius: 14, padding: 4,
      }}>
        {SUB_TABS.map(tab => (
          <button key={tab.id} onClick={() => { if (tab.id !== "live") setPendingMatch(null); setFpTab(tab.id); }} style={{
            flex: 1, padding: "10px 4px", border: "none", borderRadius: 10, cursor: "pointer",
            background: fpTab === tab.id ? G.white : "transparent",
            boxShadow: fpTab === tab.id ? "0 2px 8px rgba(0,0,0,0.10)" : "none",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12,
            color: fpTab === tab.id ? G.ocean : G.textLight,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TEAMS tab */}
      {fpTab === "teams" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: G.ocean, letterSpacing: 1 }}>
              {games.some(g => g.played) ? "STANDINGS" : "TEAMS"}
            </div>
            <Btn onClick={() => setShowNewTeam(true)} variant="sun" size="sm">+ New Team</Btn>
          </div>

          {/* Standings (only after first game) */}
          {games.some(g => g.played) && standings.length > 0 && (
            <Card style={{ marginBottom: 16, overflowX: "auto" }}>
              <StandingsTable rows={standings} />
            </Card>
          )}

          {/* Team list */}
          {teams.length === 0 ? (
            <Card style={{ textAlign: "center", color: G.textLight, padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🤝</div>
              No teams yet. Create the first one!
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {teams.map(team => {
                const stat = standings.find(s => s.id === team.id);
                const rank = stat ? standings.indexOf(stat) + 1 : null;
                return (
                  <Card key={team.id} style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {rank && <span style={{ fontWeight: 700, fontSize: 18 }}>
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                        </span>}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{team.name}</div>
                          <div style={{ fontSize: 12, color: G.textLight }}>
                            {team.players.map(pid => players.find(p => p.id === pid)?.name || pid).join(" · ")}
                          </div>
                        </div>
                      </div>
                      {stat && stat.played > 0 && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <Badge color={G.success}>{stat.wins}W</Badge>
                          <Badge color={G.danger}>{stat.losses}L</Badge>
                          <Badge color={G.ocean}>{stat.pts}pts</Badge>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* LIVE tab */}
      {fpTab === "live" && (
        <div>
          {pendingMatch ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: G.ocean, letterSpacing: 1 }}>
                  {tName(pendingMatch.team1)} vs {tName(pendingMatch.team2)}
                </div>
                <Btn onClick={cancelGame} variant="danger" size="sm">✕ Cancel</Btn>
              </div>
              <LiveScoreSection
                teams={teams}
                players={players}
                setsPerMatch={setsPerMatch}
                preloadMatchId={pendingMatch.id}
                tournamentMatches={[pendingMatch]}
                onSaveResult={handleSaveResult}
              />
            </div>
          ) : (
            <div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: G.ocean, letterSpacing: 1, marginBottom: 16 }}>
                START A GAME
              </div>

              {teams.length < 2 ? (
                <Card style={{ textAlign: "center", color: G.textLight, padding: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🏐</div>
                  You need at least 2 teams to play.
                  <div style={{ marginTop: 16 }}>
                    <Btn onClick={() => setFpTab("teams")} variant="primary">Go to Teams</Btn>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div style={{ display: "grid", gap: 16 }}>
                    {/* Team 1 */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Team 1</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {teams.map(tm => (
                          <button key={tm.id} onClick={() => setTeam1Id(tm.id)} style={{
                            padding: "10px 14px", borderRadius: 10, border: "2px solid",
                            borderColor: team1Id === tm.id ? G.ocean : G.sandDark,
                            background: team1Id === tm.id ? G.ocean + "11" : G.white,
                            cursor: "pointer", textAlign: "left", width: "100%",
                            fontFamily: "'DM Sans', sans-serif",
                          }}>
                            <span style={{ fontWeight: 700, color: team1Id === tm.id ? G.ocean : G.text }}>{tm.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ textAlign: "center", fontFamily: "'Bebas Neue'", fontSize: 28, color: G.textLight }}>VS</div>

                    {/* Team 2 */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Team 2</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {teams.map(tm => (
                          <button key={tm.id} onClick={() => setTeam2Id(tm.id)} style={{
                            padding: "10px 14px", borderRadius: 10, border: "2px solid",
                            borderColor: team2Id === tm.id ? G.sun : G.sandDark,
                            background: team2Id === tm.id ? G.sun + "22" : G.white,
                            cursor: team1Id === tm.id ? "not-allowed" : "pointer",
                            opacity: team1Id === tm.id ? 0.4 : 1,
                            textAlign: "left", width: "100%",
                            fontFamily: "'DM Sans', sans-serif",
                          }}>
                            <span style={{ fontWeight: 700, color: team2Id === tm.id ? G.sunDark : G.text }}>{tm.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sets per match */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Sets per match</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[1, 3, 5].map(n => (
                          <button key={n} onClick={() => setSetsPerMatch(n)} style={{
                            flex: 1, padding: "10px", borderRadius: 10, border: "2px solid",
                            borderColor: setsPerMatch === n ? G.ocean : G.sandDark,
                            background: setsPerMatch === n ? G.ocean + "11" : G.white,
                            fontWeight: setsPerMatch === n ? 700 : 400,
                            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14, color: G.text,
                          }}>
                            {n === 1 ? "1 set" : `Best of ${n}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Btn
                      onClick={startGame}
                      variant="primary"
                      size="lg"
                      disabled={!team1Id || !team2Id || team1Id === team2Id}
                    >
                      🏐 Start Game
                    </Btn>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* RESULTS tab */}
      {fpTab === "results" && (
        <div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: G.ocean, letterSpacing: 1, marginBottom: 16 }}>
            RESULTS
          </div>

          {games.filter(g => g.played).length === 0 ? (
            <Card style={{ textAlign: "center", color: G.textLight, padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              No games yet.
              <div style={{ marginTop: 16 }}>
                <Btn onClick={() => setFpTab("live")} variant="primary">Go to Live</Btn>
              </div>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {[...games].filter(g => g.played).reverse().map(game => {
                const isExpanded = expandedGameId === game.id;
                const winnerNum = game.winner === game.team1 ? 1 : 2;
                const t1Sets = (game.sets || []).filter(s => s.winner === 1).length;
                const t2Sets = (game.sets || []).filter(s => s.winner === 2).length;

                return (
                  <Card key={game.id} style={{ padding: 0, overflow: "hidden" }}>
                    {/* Summary row */}
                    <div
                      onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 16px", cursor: "pointer",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{
                          fontSize: 14, fontWeight: game.winner === game.team1 ? 700 : 400,
                          color: game.winner === game.team1 ? G.ocean : G.textLight,
                        }}>
                          {tName(game.team1)}
                        </span>
                      </div>
                      <div style={{
                        padding: "4px 16px", background: G.sand, borderRadius: 8,
                        fontFamily: "'Bebas Neue'", fontSize: 22, color: G.text, margin: "0 8px",
                      }}>
                        {game.score1} – {game.score2}
                      </div>
                      <div style={{ flex: 1, textAlign: "right" }}>
                        <span style={{
                          fontSize: 14, fontWeight: game.winner === game.team2 ? 700 : 400,
                          color: game.winner === game.team2 ? G.ocean : G.textLight,
                        }}>
                          {tName(game.team2)}
                        </span>
                      </div>
                      <span style={{ fontSize: 18, marginLeft: 10, color: G.textLight }}>
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>

                    {/* Expanded stats */}
                    {isExpanded && Array.isArray(game.log) && game.log.length > 0 && (
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

                    {/* Date + winner badge */}
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
      )}

      {/* New Team Modal */}
      {showNewTeam && (
        <Modal title="NEW TEAM" onClose={() => { setShowNewTeam(false); setNewTeamName(""); setPickedPlayerIds([]); }}>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Team Name
              </div>
              <Input value={newTeamName} onChange={setNewTeamName} placeholder="e.g. Team Alpha" />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: G.textLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Players (from global list)
              </div>
              {players.length === 0 ? (
                <div style={{ color: G.textLight, fontSize: 13 }}>No players yet. Add players first.</div>
              ) : (
                <div style={{ display: "grid", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                  {players.map(p => {
                    const picked = pickedPlayerIds.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => togglePlayer(p.id)} style={{
                        padding: "10px 14px", borderRadius: 10, border: "2px solid",
                        borderColor: picked ? G.ocean : G.sandDark,
                        background: picked ? G.ocean + "11" : G.white,
                        cursor: "pointer", textAlign: "left", width: "100%",
                        fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span style={{ fontSize: 16 }}>{picked ? "✅" : "⬜"}</span>
                        <span style={{ fontWeight: picked ? 700 : 400, color: picked ? G.ocean : G.text }}>
                          {p.name}
                        </span>
                        <span style={{ fontSize: 11, color: G.textLight, marginLeft: "auto" }}>
                          {p.level}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {pickedPlayerIds.length > 0 && (
                <div style={{ fontSize: 12, color: G.ocean, marginTop: 6, fontWeight: 600 }}>
                  {pickedPlayerIds.length} player{pickedPlayerIds.length !== 1 ? "s" : ""} selected
                </div>
              )}
            </div>

            <Btn
              onClick={createTeam}
              variant="primary"
              size="lg"
              disabled={!newTeamName.trim()}
            >
              Create Team
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
