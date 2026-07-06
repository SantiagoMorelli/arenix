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

/** Minimum scoring level required to render each computed section. */
export const MIN_LEVEL = {
  calcLeadStats: 1,
  calcDynamics: 1,
  calcMVP: 2,
  calcPlayerContribution: 2,
  calcPeakWindow: 2,
  calcClutchPoints: 2,
  calcServeStats: 3,
};

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
  const errors = serves.filter(e => e.errorPlayerId === pid && e.errorType === "serve").length;
  const inPlay = serves.length - aces - errors;
  const inPlayWon = serves.filter(e => e.team === e.serverTeam && e.pointType !== "ace").length;
  const inPlayLost = inPlay - inPlayWon;
  return {
    count: serves.length,
    pct: serves.length ? Math.round(wins / serves.length * 100) : 0,
    aces,
    errors,
    inPlay,
    inPlayWon,
    inPlayLost,
  };
}

export function calcActionEfficiency(pid, pointLog) {
  const spikes = pointLog.filter(e => e.scoringPlayerId === pid && e.pointType === "spike").length;
  const spikeErrors = pointLog.filter(e => e.errorPlayerId === pid && e.errorType === "spike").length;
  const tips = pointLog.filter(e => e.scoringPlayerId === pid && e.pointType === "tip").length;
  const tipErrors = pointLog.filter(e => e.errorPlayerId === pid && e.errorType === "tip").length;
  
  return {
    spikes,
    spikeErrors,
    tips,
    tipErrors
  };
}

export function calcContextualErrors(pid, pointLog) {
  let clutchErrors = 0;
  let clutchPlayed = 0;
  let fatigueErrors = 0;
  let fatiguePlayed = 0;

  pointLog.forEach(e => {
    // Clutch: point margin <= 2
    if (Math.abs(e.t1 - e.t2) <= 2) {
      if (e.scoringPlayerId === pid) clutchPlayed++;
      else if (e.errorPlayerId === pid) {
        clutchPlayed++;
        clutchErrors++;
      }
    }

    // Fatigue / late game: score >= 15 (t1/t2 are the score AFTER the point)
    if (Math.max(e.t1, e.t2) >= 15) {
      if (e.scoringPlayerId === pid) fatiguePlayed++;
      else if (e.errorPlayerId === pid) {
        fatiguePlayed++;
        fatigueErrors++;
      }
    }
  });

  return {
    clutchErrors,
    clutchPlayed,
    fatigueErrors,
    fatiguePlayed,
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

// ── Match dynamics moment lists ─────────────────────────────────────────────

// The longest streak in the match: which team scored it and the contributing
// points. Returns { team: 1|2|null, length, points: [...] }.
export function calcBestStreakRun(pointLog) {
  let bestLen = 0, bestTeam = null, bestStart = -1;
  let curLen = 0, curTeam = null, curStart = 0;
  pointLog.forEach((e, i) => {
    if (e.team === curTeam) {
      curLen++;
    } else {
      curTeam = e.team;
      curLen = 1;
      curStart = i;
    }
    if (curLen > bestLen) {
      bestLen = curLen;
      bestTeam = curTeam;
      bestStart = curStart;
    }
  });
  if (bestStart < 0) return { team: null, length: 0, points: [] };
  return {
    team: bestTeam,
    length: bestLen,
    points: pointLog.slice(bestStart, bestStart + bestLen),
  };
}

// Every point where the score was tied immediately AFTER that point landed.
export function calcTiedMoments(pointLog) {
  return pointLog.filter(e => e.t1 === e.t2);
}

// Every point played within a 2-point margin (inclusive). Useful for "clutch".
export function calcClutchMoments(pointLog) {
  return pointLog.filter(e => Math.abs(e.t1 - e.t2) <= 2);
}

// Every point where `pid` either scored or made the error.
// Returns entries with a `kind` flag: "scored" | "error".
export function calcPlayerMoments(pid, pointLog) {
  const out = [];
  pointLog.forEach(e => {
    if (e.scoringPlayerId === pid) out.push({ ...e, kind: "scored" });
    else if (e.errorPlayerId === pid) out.push({ ...e, kind: "error" });
  });
  return out;
}

// Pressure context per point, inferred purely from the log (entries don't
// carry pointsToWin). Returns { [pointId]: "match_point" | "set_point" |
// "tied" | "clutch" } — one tag per point, priority in that order; points
// with no pressure context are omitted.
export function calcPressureTags(pointLog) {
  if (pointLog.length === 0) return {};

  // Final entry (score + winner) of each set.
  const setFinal = {};
  pointLog.forEach(e => { setFinal[e.setNum] = e; });

  // Infer each set's target: exact when won by >2 points; a win-by-2 finish
  // means the set ended at or past the target, and a 21-point set can't end
  // at 16 or less (deuce of a 15-point set can).
  const targetFor = {}, winnerOf = {};
  Object.entries(setFinal).forEach(([sn, e]) => {
    const w = Math.max(e.t1, e.t2), l = Math.min(e.t1, e.t2);
    targetFor[sn] = w - l > 2 ? w : (w <= 16 ? 15 : 21);
    winnerOf[sn] = e.t1 > e.t2 ? 1 : 2;
  });

  const setNums = Object.keys(winnerOf).map(Number);
  const setsWonBy = { 1: 0, 2: 0 };
  setNums.forEach(sn => { setsWonBy[winnerOf[sn]]++; });
  const setsToWin = Math.max(setsWonBy[1], setsWonBy[2]);

  const out = {};
  pointLog.forEach(e => {
    // Score BEFORE the point landed.
    const b1 = e.team === 1 ? e.t1 - 1 : e.t1;
    const b2 = e.team === 2 ? e.t2 - 1 : e.t2;
    const T = targetFor[e.setNum] || 21;

    // Team (if any) that was one point away from closing the set. Covers
    // deuce naturally: at T-1 or beyond, any 1-point lead is a set point.
    const spTeam = (b1 >= T - 1 && b1 - b2 >= 1) ? 1
                 : (b2 >= T - 1 && b2 - b1 >= 1) ? 2
                 : null;

    if (spTeam) {
      const prevWins = setNums.filter(sn => sn < e.setNum && winnerOf[sn] === spTeam).length;
      out[e.id] = prevWins === setsToWin - 1 ? "match_point" : "set_point";
    } else if (b1 === b2 && b1 > 0) {
      out[e.id] = "tied";
    } else if (Math.abs(b1 - b2) <= 2 && Math.max(b1, b2) >= T - 6) {
      // Close margin late in the set (last ~6 points before the target);
      // the late-game gate keeps early close scores from tagging as clutch.
      out[e.id] = "clutch";
    }
  });
  return out;
}

// The runner-up to MVP by net pts. Same scoring rule as calcMVP, returns the
// 2nd-place entry or null.
export function calcRunnerUp(allPlayerIds, s1, s2, t1PlayerIds, mvpPid) {
  const ranked = allPlayerIds
    .filter(pid => pid !== mvpPid)
    .map(pid => {
      const st = t1PlayerIds.includes(pid) ? s1 : s2;
      return { pid, net: (st.playerPts[pid] || 0) - (st.playerErrors[pid] || 0) };
    })
    .sort((a, b) => b.net - a.net);
  return ranked[0] || null;
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
