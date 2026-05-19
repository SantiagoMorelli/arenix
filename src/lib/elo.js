export function getKFactor(matchType, roundKey) {
  if (matchType === 'group') return 20;
  if (matchType === 'knockout') {
    if (roundKey === 'r16' || roundKey === 'qf' || roundKey === 'third_place') return 25;
    if (roundKey === 'semi') return 30;
    if (roundKey === 'final') return 40;
  }
  return 20; // Default fallback
}

export function calculateExpectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calculateNewElo(ratingA, ratingB, actualScore, kFactor) {
  const expectedScore = calculateExpectedScore(ratingA, ratingB);
  return Math.round(ratingA + kFactor * (actualScore - expectedScore));
}

export function simulateTournamentElo(matches, teamPlayers, players) {
  // Create a running map of player Elos to avoid mutating original
  const runningElos = {};
  const playerNames = {};
  
  // Initialize with current Elos
  for (const [playerId, player] of Object.entries(players)) {
    runningElos[playerId] = player.elo;
    playerNames[playerId] = player.displayName || player.name;
  }

  const auditLog = [];
  auditLog.push(`# Elo Processing Audit Log`);
  auditLog.push(`Generated sequentially based on chronological match order.\n`);

  // Helper to get team average Elo
  const getTeamAverageElo = (teamId) => {
    const pIds = teamPlayers.filter(tp => tp.team_id === teamId).map(tp => tp.player_id);
    if (pIds.length === 0) return 1000;
    const total = pIds.reduce((sum, pId) => sum + (runningElos[pId] || 1000), 0);
    return total / pIds.length;
  };

  const getTeamPlayerNames = (teamId) => {
    const pIds = teamPlayers.filter(tp => tp.team_id === teamId).map(tp => tp.player_id);
    return pIds.map(pId => playerNames[pId] || 'Unknown').join(', ');
  };

  // Helper to update team player Elos
  const updateTeamElos = (teamId, oldTeamAvg, opponentAvg, actualScore, kFactor, isTeam1) => {
    const pIds = teamPlayers.filter(tp => tp.team_id === teamId).map(tp => tp.player_id);
    const expectedScore = calculateExpectedScore(oldTeamAvg, opponentAvg);
    const delta = kFactor * (actualScore - expectedScore);
    const deltaRounded = Math.round(delta);

    for (const pId of pIds) {
      const pElo = runningElos[pId] || 1000;
      runningElos[pId] = pElo + deltaRounded;
    }
    
    return {
      expected: expectedScore,
      delta: deltaRounded
    };
  };

  let matchNumber = 1;
  for (const match of matches) {
    if (!match.played || !match.winner_id) continue;
    
    let t1Score = 0;
    let t2Score = 0;
    if (match.winner_id === match.team1_id) {
      t1Score = 1;
      t2Score = 0;
    } else if (match.winner_id === match.team2_id) {
      t1Score = 0;
      t2Score = 1;
    } else if (match.winner_id === 'draw') {
      t1Score = 0.5;
      t2Score = 0.5;
    }

    const t1Avg = getTeamAverageElo(match.team1_id);
    const t2Avg = getTeamAverageElo(match.team2_id);
    const kFactor = getKFactor(match.source_type, match.knockout_rounds?.round_key);

    const t1Names = getTeamPlayerNames(match.team1_id);
    const t2Names = getTeamPlayerNames(match.team2_id);

    const t1Result = updateTeamElos(match.team1_id, t1Avg, t2Avg, t1Score, kFactor, true);
    const t2Result = updateTeamElos(match.team2_id, t2Avg, t1Avg, t2Score, kFactor, false);

    auditLog.push(`## Match ${matchNumber}: ${match.source_type.toUpperCase()} (K = ${kFactor})`);
    auditLog.push(`**Team 1**: ${t1Names}`);
    auditLog.push(`  - Starting Avg Elo: ${Math.round(t1Avg)}`);
    auditLog.push(`  - Expected Win Prob: ${(t1Result.expected * 100).toFixed(1)}%`);
    auditLog.push(`  - Outcome: ${t1Score === 1 ? 'WIN' : t1Score === 0 ? 'LOSS' : 'DRAW'}`);
    auditLog.push(`  - Delta applied to all players: ${t1Result.delta > 0 ? '+' : ''}${t1Result.delta}`);
    
    auditLog.push(`**Team 2**: ${t2Names}`);
    auditLog.push(`  - Starting Avg Elo: ${Math.round(t2Avg)}`);
    auditLog.push(`  - Expected Win Prob: ${(t2Result.expected * 100).toFixed(1)}%`);
    auditLog.push(`  - Outcome: ${t2Score === 1 ? 'WIN' : t2Score === 0 ? 'LOSS' : 'DRAW'}`);
    auditLog.push(`  - Delta applied to all players: ${t2Result.delta > 0 ? '+' : ''}${t2Result.delta}\n`);

    matchNumber++;
  }

  auditLog.push(`## Final Player Standings (Post-Tournament)`);
  const finalStandings = Object.entries(runningElos).map(([pId, elo]) => ({
    name: playerNames[pId],
    elo: elo,
    startElo: players[pId].elo
  })).sort((a, b) => b.elo - a.elo);

  for (const p of finalStandings) {
    const diff = p.elo - p.startElo;
    auditLog.push(`- **${p.name}**: ${p.elo} (${diff >= 0 ? '+' : ''}${diff})`);
  }

  return {
    finalRatings: runningElos,
    auditLog: auditLog.join('\n')
  };
}
