/**
 * Pure compute helpers for post-match stats.
 *
 * Conventions:
 *   pointLog: array of point entries from `matches.log`, already filtered to
 *             only entries where `e.team` is set (1 or 2).
 *   timestamp on each entry is ms since epoch.
 *
 * Every helper here is pure: given the same input, returns the same output.
 * No side effects, no React, safe to memoize at the caller.
 */

// ── Lead / momentum ──────────────────────────────────────────────────────────

export function calcLeadStats(pointLog) {
  let maxLead = 0, maxLeadTeam = null, changes = 0, prevLeader = null;
  pointLog.forEach(e => {
    const diff = e.t1 - e.t2;
    const leader = diff > 0 ? 1 : diff < 0 ? 2 : prevLeader;
    if (Math.abs(diff) > maxLead) {
      maxLead = Math.abs(diff);
      maxLeadTeam = diff > 0 ? 1 : 2;
    }
    if (leader && prevLeader !== null && leader !== prevLeader) changes++;
    prevLeader = leader;
  });
  return { maxLead, maxLeadTeam, changes };
}

export function calcDynamics(pointLog) {
  let timesTied = 0;
  let closePoints = 0;
  pointLog.forEach(e => {
    const diff = Math.abs(e.t1 - e.t2);
    if (diff === 0) timesTied++;
    if (diff <= 2) closePoints++;
  });
  return { timesTied, closePoints };
}

// All points where the leader's lead reached the maximum value.
// Returns one entry per point (so plateaus appear as multiple rows).
export function calcLeadMoments(pointLog) {
  const { maxLead } = calcLeadStats(pointLog);
  if (maxLead === 0) return [];
  return pointLog
    .filter(e => Math.abs(e.t1 - e.t2) === maxLead)
    .map(e => ({
      pointId: e.id,
      team: e.t1 - e.t2 > 0 ? 1 : 2,
      lead: maxLead,
      t1: e.t1,
      t2: e.t2,
      timestamp: e.timestamp,
      pointNum: e.pointNum,
      setNum: e.setNum,
    }));
}

// Every leader transition (1→2 or 2→1). Ties carry the previous leader so
// transitions across a tie are still detected when leadership flips.
export function calcLeadChangeList(pointLog) {
  const out = [];
  let prevLeader = null;
  pointLog.forEach(e => {
    const diff = e.t1 - e.t2;
    const leader = diff > 0 ? 1 : diff < 0 ? 2 : prevLeader;
    if (leader && prevLeader !== null && leader !== prevLeader) {
      out.push({
        pointId: e.id,
        fromTeam: prevLeader,
        toTeam: leader,
        t1: e.t1,
        t2: e.t2,
        timestamp: e.timestamp,
        pointNum: e.pointNum,
        setNum: e.setNum,
      });
    }
    prevLeader = leader;
  });
  return out;
}

// Cumulative score margin (t1 - t2) at each point. Feeds the Match Flow sparkline.
export function cumulativeMargin(pointLog) {
  return pointLog.map(e => e.t1 - e.t2);
}

// ── MVP / contributions ─────────────────────────────────────────────────────

export function calcMVP(allPlayerIds, s1, s2, t1PlayerIds) {
  return allPlayerIds
    .map(pid => {
      const st = t1PlayerIds.includes(pid) ? s1 : s2;
      return { pid, net: (st.playerPts[pid] || 0) - (st.playerErrors[pid] || 0) };
    })
    .sort((a, b) => b.net - a.net)[0] || null;
}

// Per-player breakdown. `statFor` is the team-level stat blob from GameStats
// (carries playerPts / playerByType / playerErrors). Returns a flat object
// suitable for rendering in the MVP expanded panel.
export function calcPlayerContribution(pid, pointLog, teamStat) {
  const bt = teamStat.playerByType[pid] || {};
  const acePts = bt.ace || 0;
  const spikePts = bt.spike || 0;
  const blockPts = bt.block || 0;
  const tipPts = bt.tip || 0;
  const errors = teamStat.playerErrors[pid] || 0;
  const pts = teamStat.playerPts[pid] || 0;
  const net = pts - errors;
  const teamTotal = teamStat.total || 1;
  const contributionPct = Math.round((pts / teamTotal) * 100);

  // Biggest streak of consecutive points scored by this player.
  let biggestStreak = 0, cur = 0;
  pointLog.forEach(e => {
    if (e.scoringPlayerId === pid) {
      cur++;
      biggestStreak = Math.max(biggestStreak, cur);
    } else {
      cur = 0;
    }
  });

  return { pts, acePts, spikePts, blockPts, tipPts, errors, net, biggestStreak, contributionPct };
}

// "Scored N of last K points" — used for MVP's key-contributions sentence.
export function lastKContribution(pid, pointLog, k = 5) {
  const tail = pointLog.slice(-k);
  const scored = tail.filter(e => e.scoringPlayerId === pid).length;
  return { scored, of: tail.length };
}

// ── Top performers ──────────────────────────────────────────────────────────

// Points scored by `pid` while score margin was within ±2.
export function calcClutchPoints(pid, pointLog) {
  return pointLog.filter(e =>
    e.scoringPlayerId === pid && Math.abs(e.t1 - e.t2) <= 2
  ).length;
}

// Sliding-window peak: the K-point window where this player scored the most.
// Returns { start, end, count } using 1-based pointNum bounds for display.
export function calcPeakWindow(pid, pointLog, windowSize = 5) {
  if (pointLog.length === 0) return { start: 0, end: 0, count: 0 };
  const flags = pointLog.map(e => e.scoringPlayerId === pid ? 1 : 0);
  let best = 0, bestStart = 0;
  let cur = 0;
  for (let i = 0; i < flags.length; i++) {
    cur += flags[i];
    if (i >= windowSize) cur -= flags[i - windowSize];
    if (cur > best) {
      best = cur;
      bestStart = Math.max(0, i - windowSize + 1);
    }
  }
  if (best === 0) return { start: 0, end: 0, count: 0 };
  const startNum = pointLog[bestStart]?.pointNum ?? bestStart + 1;
  const endIdx = Math.min(bestStart + windowSize - 1, pointLog.length - 1);
  const endNum = pointLog[endIdx]?.pointNum ?? endIdx + 1;
  return { start: startNum, end: endNum, count: best };
}

// Running cumulative pts for a player, point-by-point. Feeds MiniSparkline.
export function calcCumulativeSeries(pid, pointLog) {
  let total = 0;
  return pointLog.map(e => {
    if (e.scoringPlayerId === pid) total++;
    return total;
  });
}

// Direct comparison of two players over the same log.
export function calcHeadToHead(pidA, pidB, pointLog) {
  let ptsA = 0, ptsB = 0, errA = 0, errB = 0;
  pointLog.forEach(e => {
    if (e.scoringPlayerId === pidA) ptsA++;
    if (e.scoringPlayerId === pidB) ptsB++;
    if (e.errorPlayerId === pidA) errA++;
    if (e.errorPlayerId === pidB) errB++;
  });
  return { ptsA, ptsB, errA, errB };
}

// ── Serve stats ─────────────────────────────────────────────────────────────

export function calcServeStats(pointLog, pid) {
  const serves = pointLog.filter(e => e.team && e.serverPlayerId === pid);
  const wins = serves.filter(e => e.team === e.serverTeam).length;
  const aces = serves.filter(e => e.pointType === "ace").length;
  return {
    count: serves.length,
    pct: serves.length ? Math.round(wins / serves.length * 100) : 0,
    aces,
  };
}

// Every serve made by `pid`, in chronological order, with outcome metadata.
export function calcServeTimeline(pid, pointLog) {
  return pointLog
    .filter(e => e.serverPlayerId === pid)
    .map(e => ({
      id: e.id,
      won: e.team === e.serverTeam,
      t1: e.t1,
      t2: e.t2,
      timestamp: e.timestamp,
      pointType: e.pointType,
      pointTypeLabel: e.pointTypeLabel,
      pointNum: e.pointNum,
      setNum: e.setNum,
    }));
}

// Streak metrics over a serve timeline.
//   longest  = longest run of consecutive won serves
//   trailing = current run at the end of the timeline (won or lost; sign via .won)
export function calcServeStreaks(timeline) {
  let longest = 0, cur = 0;
  for (const s of timeline) {
    if (s.won) { cur++; longest = Math.max(longest, cur); }
    else cur = 0;
  }
  // Trailing run from the end:
  let trailing = 0;
  let trailingWon = null;
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (trailingWon === null) trailingWon = timeline[i].won;
    if (timeline[i].won === trailingWon) trailing++;
    else break;
  }
  return { longest, trailing, trailingWon };
}
