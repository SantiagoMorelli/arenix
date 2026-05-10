/**
 * Builds a plain-text summary of match stats, suitable for pasting into
 * an LLM with a coaching prompt. Pure function — no side effects.
 */

const PCT_FMT = (n) => `${Math.round((n || 0) * 100)}%`

function formatDuration(ms) {
  if (!ms || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function buildMatchCoachExport(match, tournament, allPlayerIds, s1, s2, t1Ids, t2Ids, getPlayer, matchStats) {
  const lines = [];
  const today = new Date().toISOString().slice(0, 10);

  lines.push('=== Arenix Match Stats — coaching export ===');
  lines.push(`Generated: ${today}`);
  if (tournament) lines.push(`Tournament: ${tournament.name}`);
  lines.push('');

  const t1Name = match.teams?.[0]?.name || 'Team 1';
  const t2Name = match.teams?.[1]?.name || 'Team 2';
  
  lines.push(`MATCH RESULT: ${t1Name} ${match.score1} - ${match.score2} ${t2Name}`);
  
  if (match.sets && match.sets.length > 0) {
    const setScores = match.sets.map(s => `${s.s1}-${s.s2}`).join(', ');
    lines.push(`Sets: ${setScores}`);
  }
  lines.push('');

  lines.push('--- TEAM OVERVIEW ---');
  
  function pushTeamStats(teamName, tIds, stats) {
    lines.push(`${teamName}:`);
    lines.push(`  Total Points: ${stats.total || 0}`);
    lines.push(`  Errors Made: ${stats.totalErrors || 0}`);
    const errSubtypeLabels = { serve: "Serve errors", spike: "Spike errors", tip: "Tip errors", other: "Other errors" };
    const byErrType = stats.byErrorType || {};
    ["serve", "spike", "tip", "other"].forEach(sub => {
      if (byErrType[sub]) lines.push(`    ${errSubtypeLabels[sub]}: ${byErrType[sub]}`);
    });
    lines.push(`  Aces: ${stats.aces || 0}`);
    lines.push(`  Spikes: ${stats.spikes || 0}`);
    lines.push(`  Blocks: ${stats.blocks || 0}`);
    lines.push(`  Tips: ${stats.tips || 0}`);
    
    // Calculate Serve In-Play for team
    const serves = (match.log || []).filter(e => tIds.includes(e.serverPlayerId));
    const serveErrors = serves.filter(e => e.errorType === 'serve' && tIds.includes(e.errorPlayerId)).length;
    const teamAces = serves.filter(e => e.pointType === 'ace' && e.team === e.serverTeam).length;
    const inPlay = serves.length - teamAces - serveErrors;
    const inPlayWon = serves.filter(e => e.team === e.serverTeam && e.pointType !== 'ace').length;
    
    lines.push(`  Total Serves: ${serves.length}`);
    if (serves.length > 0) {
        lines.push(`  Serve Win %: ${PCT_FMT(stats.serveWins / serves.length)}`);
        lines.push(`  Serve In-Play Win %: ${inPlay > 0 ? PCT_FMT(inPlayWon / inPlay) : '0%'}`);
    }
  }

  pushTeamStats(t1Name, t1Ids, s1);
  lines.push('');
  pushTeamStats(t2Name, t2Ids, s2);
  lines.push('');

  lines.push('--- PLAYER BREAKDOWN ---');
  for (const pid of allPlayerIds) {
    const isTeam1 = t1Ids.includes(pid);
    const teamStats = isTeam1 ? s1 : s2;
    const pName = getPlayer(pid)?.name || 'Unknown';
    
    lines.push(`${pName} (${isTeam1 ? t1Name : t2Name}):`);
    
    const pts = teamStats.playerPts[pid] || 0;
    const errs = teamStats.playerErrors[pid] || 0;
    const byType = teamStats.playerByType[pid] || {};
    
    lines.push(`  Net Points: ${pts - errs} (${pts} pts, ${errs} errors)`);
    lines.push(`  Breakdown: ${byType.ace || 0} aces, ${byType.spike || 0} spikes, ${byType.block || 0} blocks, ${byType.tip || 0} tips`);
    
    if (matchStats && matchStats.calcActionEfficiency) {
      const eff = matchStats.calcActionEfficiency(pid, match.log || []);
      const spikeAtt = eff.spikes + eff.spikeErrors;
      if (spikeAtt > 0) {
        lines.push(`  Spike Efficiency: ${PCT_FMT(eff.spikes / spikeAtt)} (${eff.spikes} kills, ${eff.spikeErrors} errors)`);
      }
      const tipAtt = eff.tips + eff.tipErrors;
      if (tipAtt > 0) {
        lines.push(`  Tip Efficiency: ${PCT_FMT(eff.tips / tipAtt)} (${eff.tips} kills, ${eff.tipErrors} errors)`);
      }
    }
    
    if (matchStats && matchStats.calcServeStats) {
      const sv = matchStats.calcServeStats(match.log || [], pid);
      if (sv.count > 0) {
        lines.push(`  Serving: ${sv.count} serves, ${PCT_FMT(sv.pct / 100)} win rate`);
        lines.push(`    ${sv.aces} aces, ${sv.errors} errors`);
        lines.push(`    In-Play: ${sv.inPlayWon}/${sv.inPlay} won (${sv.inPlay > 0 ? PCT_FMT(sv.inPlayWon/sv.inPlay) : '0%'})`);
      }
    }
    
    if (matchStats && matchStats.calcContextualErrors) {
      const cx = matchStats.calcContextualErrors(pid, match.log || []);
      if (cx.clutchPlayed > 0) {
          lines.push(`  Clutch Errors (margin <= 2): ${cx.clutchErrors}`);
      }
      if (cx.fatiguePlayed > 0) {
          lines.push(`  Late-Game Errors (score >= 15): ${cx.fatigueErrors}`);
      }
    }

    lines.push('');
  }

  lines.push('Suggested prompt:');
  lines.push('"You are an expert volleyball coach. Analyze this match data.');
  lines.push('Focus on serve effectiveness, attack efficiency, and performance under pressure.');
  lines.push('Provide a short summary of the match, point out the MVP, and give one key area of improvement for each team."');

  return lines.join('\n');
}
