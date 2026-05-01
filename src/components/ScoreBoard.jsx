import React from "react";

const ScoreBoard = ({
  teams, players,
  team1Id, team2Id,
  score1, score2,
  t1Sets, t2Sets,
  side,       // { t1: "left"|"right", t2: "left"|"right" }
  srv,        // { team, playerId }  — current server
  nextSrv,    // { team, playerId }  — next server
  serveRotation, // pre-computed array
  points,
}) => {
  const getTeam   = id => teams.find(tm => tm.id === id);
  const getPlayer = id => players.find(p => p.id === id);
  const tName      = id => getTeam(id)?.name || "?";
  const playerName = id => getPlayer(id)?.name || "?";

  const getTeamPlayerNames = (teamId) => {
    const team = getTeam(teamId);
    if (!team) return "";
    const ids = team.players?.length > 0
      ? team.players
      : [team.player1, team.player2].filter(Boolean);
    return ids.map(playerName).join(", ");
  };

  const cols = {
    1: { teamId: team1Id, teamNum: 1, score: score1, sets: t1Sets },
    2: { teamId: team2Id, teamNum: 2, score: score2, sets: t2Sets },
  };
  const leftCol  = side.t1 === "left" ? cols[1] : cols[2];
  const rightCol = side.t1 === "left" ? cols[2] : cols[1];

  const TeamPanel = ({ col }) => {
    const isServing = srv.team === col.teamNum;
    const isTeam1   = col.teamNum === 1;
    const slotsForTeam = serveRotation.filter(r => r.team === col.teamNum);
    return (
      <div className="text-center">
        <div className="text-[12px] font-bold text-[#E8ECF1] mb-1">
          {tName(col.teamId)}
        </div>
        <div className="text-[10px] text-[#7A8EA0] mt-0.5 leading-tight">
          {getTeamPlayerNames(col.teamId)}
        </div>
        <div className={`font-display text-[72px] leading-none my-1 ${
          isServing
            ? isTeam1 ? "text-accent" : "text-free"
            : "text-[#7A8EA0]"
        }`}>
          {col.score}
        </div>
        <div className="min-h-[36px] flex items-center justify-center mt-1.5">
          {isServing ? (
            <div className={`inline-flex flex-col items-center rounded-[8px] px-3 py-1.5 ${
              isTeam1 ? "bg-accent/20" : "bg-free/20"
            }`}>
              <span className={`text-[9px] font-bold uppercase ${isTeam1 ? "text-accent" : "text-free"}`}>
               🏐 SERVING
              </span>
              <span className="text-[11px] font-bold text-[#E8ECF1]">
                {playerName(srv.playerId)}
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-[#7A8EA0] text-center leading-snug">
              If scores:<br />
              <b className="text-[12px] text-[#7A8EA0]/80">
                {playerName(nextSrv.team === col.teamNum ? nextSrv.playerId : slotsForTeam[0]?.playerId)}
              </b>
            </div>
          )}
        </div>
        <div className="text-[10px] text-[#7A8EA0]/50 mt-1.5">Sets: {col.sets}</div>
      </div>
    );
  };

  return (
    <div className="bg-[#0D1B2A] rounded-[20px] px-3.5 py-4 mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
      <TeamPanel col={leftCol} />
      <div className="text-center px-0.5">
        <div className="font-display text-[24px] text-[#7A8EA0]/30">VS</div>
        {points > 0 && points % 7 !== 0 && (
          <div className="text-[10px] font-semibold text-accent mt-1.5">
            Switch in {7 - (points % 7)} pts
          </div>
        )}
      </div>
      <TeamPanel col={rightCol} />
    </div>
  );
};

export default ScoreBoard;
