/**
 * Plain-language "Match Story" engine.
 *
 * Turns a finished match's point log into a short narrative a player with
 * zero stats knowledge can read: a hero "result framing" line, up to four
 * prioritized insights, and an optional personal card when the viewer
 * played in the match.
 *
 * Pure module: no React, no Supabase. Same input → same output.
 *
 * Capability flags are derived from the data itself (not scoringLevel) so
 * legacy logs and level-1/2 matches degrade gracefully:
 *   hasPointTypes  — entries carry pointType/errorType   (level 3)
 *   hasAttribution — entries carry scoringPlayerId       (level 2+)
 *   hasServeInfo   — entries carry serverPlayerId        (all levels)
 */

import {
  calcLeadStats, calcBestStreakRun, calcPlayerContribution,
  calcServeStats, calcServeTimeline, calcClutchPoints,
} from "./matchStats";

const ERROR_SUBTYPE_PHRASE = {
  serve: "Most of them were missed serves.",
  spike: "Most of them were spikes into the net or out.",
  tip:   "Most of them were failed tips.",
};

// Set winners are re-derived from scores: the tournament overlay's
// single-set fallback stores a team id (not 1|2) in `sets[0].winner`.
function setWinner(s) {
  if (!s) return null;
  if (s.s1 !== s.s2) return s.s1 > s.s2 ? 1 : 2;
  return s.winner === 1 || s.winner === 2 ? s.winner : null;
}

function deriveWinner(sets, fallback) {
  const w1 = sets.filter(s => setWinner(s) === 1).length;
  const w2 = sets.filter(s => setWinner(s) === 2).length;
  if (w1 !== w2) return w1 > w2 ? 1 : 2;
  return fallback === 2 ? 2 : 1;
}

function sliceForSet(pointLog, setIdx, setsCount) {
  if (setsCount <= 1) return pointLog;
  return pointLog.filter(e => e.setNum === setIdx);
}

// Largest deficit team `tn` faced within a slice, plus the entry where it peaked.
function maxDeficit(slice, tn) {
  let deficit = 0, at = null;
  slice.forEach(e => {
    const d = tn === 1 ? e.t2 - e.t1 : e.t1 - e.t2;
    if (d > deficit) { deficit = d; at = e; }
  });
  return { deficit, at };
}

/**
 * Hero "result framing" line of the Match Story (comeback / nail-biter /
 * comfortable / solid), viewer-aware. Used standalone by the lightweight
 * post-match screen; buildMatchStory composes it with the insight list.
 *
 * Returns { framing, winner, viewerTeam, viewerWon } or null for empty logs.
 */
export function buildResultFraming({
  pointLog, sets, winnerTeam, t1Ids, t2Ids, team1Name, team2Name, viewerPlayerId,
}) {
  if (!pointLog || pointLog.length === 0 || !sets || sets.length === 0) return null;

  const winner = deriveWinner(sets, winnerTeam);

  const viewerTeam = viewerPlayerId
    ? (t1Ids.includes(viewerPlayerId) ? 1 : t2Ids.includes(viewerPlayerId) ? 2 : null)
    : null;
  const viewerWon = viewerTeam ? viewerTeam === winner : null;

  const names = { 1: team1Name || "Team 1", 2: team2Name || "Team 2" };

  const decidingSet   = sets[sets.length - 1];
  const decidingSlice = sliceForSet(pointLog, sets.length, sets.length);
  const finalMargin   = Math.abs(decidingSet.s1 - decidingSet.s2);
  const wScore = winner === 1 ? decidingSet.s1 : decidingSet.s2;
  const lScore = winner === 1 ? decidingSet.s2 : decidingSet.s1;
  const lead   = calcLeadStats(pointLog);

  const { deficit: winnerDeficit, at: deficitAt } = maxDeficit(decidingSlice, winner);
  const deficitScore = deficitAt
    ? (winner === 1 ? `${deficitAt.t1}–${deficitAt.t2}` : `${deficitAt.t2}–${deficitAt.t1}`)
    : null;

  let framingId;
  if (winnerDeficit >= 4) framingId = "comeback";
  else if (finalMargin <= 2 || (lead.changes >= 4 && finalMargin <= 4)) framingId = "nail-biter";
  else if (finalMargin >= 6 && lead.changes <= 1) framingId = "comfortable";
  else framingId = "solid";

  const finalScore = `${wScore}–${lScore}`;
  let setsSuffix = "";
  let scoreline = finalScore;
  if (sets.length > 1) {
    const wSets = sets.filter(s => setWinner(s) === winner).length;
    const lSets = sets.length - wSets;
    scoreline = `${wSets}–${lSets}`;
    setsSuffix = lSets === 0 ? " in straight sets" : " in the deciding set";
  }

  const FRAMING_COPY = {
    comeback: {
      viewerWin: {
        headline: "What a comeback!",
        detail: `You were down ${deficitScore} and came back to win ${finalScore}${setsSuffix}.`,
      },
      viewerLoss: {
        headline: "So close.",
        detail: `You were up by ${winnerDeficit}, but ${names[winner]} stormed back to take it ${finalScore}${setsSuffix}.`,
      },
      neutral: {
        headline: `${names[winner]} pulled off a comeback`,
        detail: `Down ${deficitScore} at one point, they fought back to win ${finalScore}${setsSuffix}.`,
      },
      icon: "flame",
    },
    "nail-biter": {
      viewerWin: {
        headline: "You won a nail-biter!",
        detail: `Every point mattered — it came down to the wire at ${finalScore}${setsSuffix}.`,
      },
      viewerLoss: {
        headline: "Lost by a whisker.",
        detail: `It went down to the final points, ${finalScore}${setsSuffix}. Nothing between the two sides.`,
      },
      neutral: {
        headline: `${names[winner]} edged a nail-biter`,
        detail: `Decided by the smallest of margins, ${finalScore}${setsSuffix}.`,
      },
      icon: "zap",
    },
    comfortable: {
      viewerWin: {
        headline: "A comfortable win!",
        detail: `You controlled the game from start to finish, ${finalScore}${setsSuffix}.`,
      },
      viewerLoss: {
        headline: "A tough one.",
        detail: `${names[winner]} ran away with it ${finalScore}${setsSuffix} — shake it off, the next one's yours.`,
      },
      neutral: {
        headline: `${names[winner]} cruised to victory`,
        detail: `In control the whole way, winning ${finalScore}${setsSuffix}.`,
      },
      icon: "trophy",
    },
    solid: {
      viewerWin: {
        headline: "A solid win!",
        detail: `You took it ${finalScore}${setsSuffix}.`,
      },
      viewerLoss: {
        headline: "Not your day.",
        detail: `${names[winner]} took it ${finalScore}${setsSuffix} — good fight, though.`,
      },
      neutral: {
        headline: `${names[winner]} takes the win`,
        detail: `Final score ${finalScore}${setsSuffix}.`,
      },
      icon: "trophy",
    },
  };

  const fc = FRAMING_COPY[framingId];
  const fCopy = viewerTeam ? (viewerWon ? fc.viewerWin : fc.viewerLoss) : fc.neutral;
  const framing = {
    id: framingId,
    icon: viewerTeam && !viewerWon ? "heart" : fc.icon,
    tone: viewerTeam ? (viewerWon ? "success" : "error") : (winner === 1 ? "accent" : "free"),
    headline: fCopy.headline,
    detail: fCopy.detail,
    scoreline,
  };

  return { framing, winner, viewerTeam, viewerWon };
}

export function buildMatchStory({
  pointLog, sets, winnerTeam, s1, s2, t1Ids, t2Ids,
  team1Name, team2Name, firstName, viewerPlayerId,
}) {
  const result = buildResultFraming({
    pointLog, sets, winnerTeam, t1Ids, t2Ids, team1Name, team2Name, viewerPlayerId,
  });
  if (!result) return null;
  const { framing, winner, viewerTeam, viewerWon } = result;
  const framingId = framing.id;

  const hasPointTypes  = pointLog.some(e => e.pointType);
  const hasAttribution = pointLog.some(e => e.scoringPlayerId);
  const hasServeInfo   = pointLog.some(e => e.serverPlayerId);

  const loser = winner === 1 ? 2 : 1;
  const other = tn => (tn === 1 ? 2 : 1);

  const names    = { 1: team1Name || "Team 1", 2: team2Name || "Team 2" };
  const who      = tn => (viewerTeam === tn ? "Your team" : names[tn]);
  const whoLower = tn => (viewerTeam === tn ? "your team" : names[tn]);
  const teamTone = tn => (tn === 1 ? "accent" : "free");
  const stat     = tn => (tn === 1 ? s1 : s2);

  const decidingSet   = sets[sets.length - 1];
  const decidingSlice = sliceForSet(pointLog, sets.length, sets.length);
  const wScore = winner === 1 ? decidingSet.s1 : decidingSet.s2;
  const lScore = winner === 1 ? decidingSet.s2 : decidingSet.s1;
  const finalScore = `${wScore}–${lScore}`;
  const lead = calcLeadStats(pointLog);

  // ── R2–R12: insight rules ─────────────────────────────────────────────────
  const fired = [];
  const add = (priority, insight) => fired.push({ priority, ...insight });

  // R2 — comeback inside a single set (multi-set matches; the deciding-set
  // comeback is already the hero when framingId === "comeback").
  if (framingId !== "comeback" && sets.length > 1) {
    let best = null;
    sets.forEach((s, i) => {
      const sw = setWinner(s);
      if (!sw) return;
      const slice = sliceForSet(pointLog, i + 1, sets.length);
      const { deficit, at } = maxDeficit(slice, sw);
      if (deficit >= 4 && (!best || deficit > best.deficit)) best = { setIdx: i + 1, sw, deficit, at, s };
    });
    if (best) {
      const downScore = best.sw === 1 ? `${best.at.t1}–${best.at.t2}` : `${best.at.t2}–${best.at.t1}`;
      const setScore = best.sw === 1 ? `${best.s.s1}–${best.s.s2}` : `${best.s.s2}–${best.s.s1}`;
      add(90, {
        id: "comeback-set",
        icon: "flame",
        tone: viewerTeam ? (best.sw === viewerTeam ? "success" : "dim") : teamTone(best.sw),
        headline: `Comeback in set ${best.setIdx}`,
        detail: `${who(best.sw)} was down ${downScore} and flipped it to take the set ${setScore}.`,
      });
    }
  }

  // R3 — gifted points (own errors fed the opponent).
  if (hasPointTypes) {
    const T = viewerTeam ?? loser;
    const opp = other(T);
    const errs = stat(T).errsMadeCount || 0;
    const oppTotal = stat(opp).total || 0;
    if (errs >= 4 && oppTotal > 0 && errs / oppTotal >= 0.25) {
      const pct = Math.round((errs / oppTotal) * 100);
      const subEntries = Object.entries(stat(T).byErrorType || {}).filter(([k]) => k !== "untyped");
      const dominant = subEntries.sort((a, b) => b[1] - a[1])[0];
      const subPhrase = dominant && dominant[1] >= errs * 0.5 ? ERROR_SUBTYPE_PHRASE[dominant[0]] : null;
      add(80, {
        id: "gifted-points",
        icon: "gift",
        tone: "error",
        headline: T === viewerTeam
          ? `${errs} points were giveaways`
          : `${names[T]} gave away ${errs} points`,
        detail: (T === viewerTeam
          ? `You handed ${names[opp]} ${errs} points on your own mistakes — ${pct}% of everything they scored. Cutting those is the fastest way to win more.`
          : `${pct}% of ${names[opp]}'s score came from ${names[T]} mistakes.`)
          + (subPhrase ? ` ${subPhrase}` : ""),
      });
    }
  }

  // R4 — won by staying steady while the rival made mistakes.
  if (hasPointTypes) {
    const T = viewerTeam ?? winner;
    const opp = other(T);
    const st = stat(T);
    if (st.total >= 10 && (st.byType.error || 0) / st.total >= 0.4) {
      const pct = Math.round(((st.byType.error || 0) / st.total) * 100);
      add(75, {
        id: "rival-mistakes",
        icon: "target",
        tone: "dim",
        headline: T === viewerTeam ? "They cracked first" : "Mistakes decided it",
        detail: T === viewerTeam
          ? `${pct}% of your points came from ${names[opp]} mistakes — staying steady paid off.`
          : `${pct}% of ${names[T]}'s points came from ${names[opp]} mistakes.`,
      });
    }
  }

  // R5 — star performer (the viewer's own stardom lives in the personal card).
  if (hasAttribution) {
    const T = viewerTeam ?? winner;
    const st = stat(T);
    const top = Object.entries(st.playerPts || {}).sort((a, b) => b[1] - a[1])[0];
    if (
      top && top[1] >= 4 && st.total > 0 &&
      top[1] / st.total >= 0.35 &&
      (st.unattributed || 0) / st.total < 0.3 &&
      top[0] !== viewerPlayerId
    ) {
      add(70, {
        id: "star-performer",
        icon: "star",
        tone: teamTone(T),
        headline: `${firstName(top[0])} was on fire`,
        detail: `Scored ${top[1]} of ${whoLower(T)}'s ${st.total} points — ${Math.round((top[1] / st.total) * 100)}% of the attack.`,
      });
    }
  }

  // R6 — biggest run of consecutive points.
  {
    const run = calcBestStreakRun(pointLog);
    if (run.length >= 4 && run.team) {
      const sameSet = new Set(run.points.map(p => p.setNum)).size <= 1;
      let detail = `${who(run.team)} scored ${run.length} points in a row`;
      if (sameSet) {
        const f = run.points[0];
        const l = run.points[run.points.length - 1];
        const beforeT1 = f.t1 - (f.team === 1 ? 1 : 0);
        const beforeT2 = f.t2 - (f.team === 2 ? 1 : 0);
        const from = run.team === 1 ? `${beforeT1}–${beforeT2}` : `${beforeT2}–${beforeT1}`;
        const to   = run.team === 1 ? `${l.t1}–${l.t2}` : `${l.t2}–${l.t1}`;
        detail += `, turning ${from} into ${to}.`;
      } else {
        detail += " — a momentum swing that broke the game open.";
      }
      add(65, {
        id: "best-run",
        icon: "trendUp",
        tone: viewerTeam ? (run.team === viewerTeam ? "success" : "dim") : teamTone(run.team),
        headline: `${run.length} points in a row`,
        detail,
      });
    }
  }

  // R7 — serve weapon (works even at level 1, serve info is always logged).
  if (hasServeInfo) {
    const candidates = viewerTeam ? (viewerTeam === 1 ? t1Ids : t2Ids) : [...t1Ids, ...t2Ids];
    let best = null;
    candidates.forEach(pid => {
      const timeline = calcServeTimeline(pid, pointLog);
      if (timeline.length < 5) return;
      const wins = timeline.filter(s => s.won).length;
      const pct = wins / timeline.length;
      if (pct >= 0.7 && (!best || pct > best.pct || (pct === best.pct && timeline.length > best.count))) {
        best = { pid, wins, count: timeline.length, pct };
      }
    });
    if (best) {
      const aces = hasPointTypes ? calcServeStats(pointLog, best.pid).aces : 0;
      const isViewer = best.pid === viewerPlayerId;
      add(60, {
        id: "serve-weapon",
        icon: "sparkles",
        tone: "success",
        headline: isViewer ? "Your serve was a weapon" : `${firstName(best.pid)}'s serve was a weapon`,
        detail: `Won ${best.wins} of ${best.count} points while serving`
          + (aces >= 2 ? `, including ${aces} aces (serves the other side couldn't even return).` : "."),
      });
    }
  }

  // R8 — serve leak (missed serves = free points).
  if (hasPointTypes) {
    const order = viewerTeam ? [viewerTeam, other(viewerTeam)] : [loser, winner];
    const T = order.find(tn => (stat(tn).byErrorType?.serve || 0) >= 3);
    if (T) {
      const n = stat(T).byErrorType.serve;
      const opp = other(T);
      add(55, {
        id: "serve-leak",
        icon: "alert",
        tone: T === viewerTeam ? "error" : "dim",
        headline: T === viewerTeam ? `${n} missed serves` : `${names[T]} missed ${n} serves`,
        detail: T === viewerTeam
          ? `You put ${n} serves into the net or out — free points for ${names[opp]}. The easiest fix for next time.`
          : `Each one a free point for ${whoLower(opp)}.`,
      });
    }
  }

  // R9 — strong finish in the deciding set.
  if (framingId !== "nail-biter" && decidingSlice.length >= 5) {
    const last5 = decidingSlice.slice(-5);
    const wonOfLast = last5.filter(e => e.team === winner).length;
    const tiedLate = decidingSlice.slice(-4).some(e => e.t1 === e.t2);
    if (wonOfLast >= 4 || tiedLate) {
      add(50, {
        id: "clutch-finish",
        icon: "flag",
        tone: viewerTeam ? (viewerWon ? "success" : "dim") : teamTone(winner),
        headline: viewerWon ? "You closed it strong" : `${who(winner)} closed it strong`,
        detail: `Took ${wonOfLast} of the last ${last5.length} points to seal the match.`,
      });
    }
  }

  // R10 — set-by-set swing (multi-set only).
  if (sets.length > 1) {
    const split = sets.some(s => setWinner(s) === loser);
    if (split) {
      const droppedIdx = sets.findIndex(s => setWinner(s) === loser);
      const d = sets[droppedIdx];
      const dropped = winner === 1 ? `${d.s1}–${d.s2}` : `${d.s2}–${d.s1}`;
      add(45, {
        id: "set-swing",
        icon: "repeat",
        tone: "dim",
        headline: "It went the distance",
        detail: `${who(winner)} dropped set ${droppedIdx + 1} ${dropped} but took the decider ${finalScore}.`,
      });
    } else {
      const margins = sets.map(s => Math.abs(s.s1 - s.s2));
      const i = margins.findIndex((m, idx) => idx < margins.length - 1 && Math.abs(margins[idx + 1] - m) >= 6);
      if (i >= 0) {
        add(45, {
          id: "set-swing",
          icon: "repeat",
          tone: "dim",
          headline: "A game of two halves",
          detail: `Set ${i + 1} finished ${sets[i].s1}–${sets[i].s2}; set ${i + 2} was a different story at ${sets[i + 1].s1}–${sets[i + 1].s2}.`,
        });
      }
    }
  }

  // R11 — seesaw battle.
  if (framingId !== "nail-biter" && lead.changes >= 5) {
    add(40, {
      id: "seesaw",
      icon: "repeat",
      tone: "dim",
      headline: "Back and forth all game",
      detail: `The lead changed hands ${lead.changes} times — neither side could pull away.`,
    });
  }

  // R12 — wire-to-wire control.
  if (
    (framingId === "comfortable" || framingId === "solid") &&
    lead.maxLead >= 7 && lead.maxLeadTeam === winner &&
    pointLog.every(e => (winner === 1 ? e.t1 - e.t2 : e.t2 - e.t1) >= 0)
  ) {
    add(35, {
      id: "wire-to-wire",
      icon: "trophy",
      tone: viewerWon ? "success" : teamTone(winner),
      headline: viewerWon ? "In front from start to finish" : `${who(winner)} led from start to finish`,
      detail: `Never behind, and led by as many as ${lead.maxLead} points.`,
    });
  }

  // ── Personal card ─────────────────────────────────────────────────────────
  let personal = null;
  if (viewerTeam) {
    const st = stat(viewerTeam);
    const serveStats = hasServeInfo ? calcServeStats(pointLog, viewerPlayerId) : { count: 0, pct: 0, aces: 0 };
    const serve = { count: serveStats.count, pct: serveStats.pct, aces: serveStats.aces };

    if (hasAttribution) {
      const c = calcPlayerContribution(viewerPlayerId, pointLog, st);
      const clutch = calcClutchPoints(viewerPlayerId, pointLog);
      const topPts = Math.max(0, ...Object.values(st.playerPts || {}));
      const isTopScorer = c.pts > 0 && c.pts === topPts;

      let takeaway;
      if (isTopScorer && c.pts >= 4) takeaway = "Top scorer of your team — you led the attack.";
      else if (clutch >= 3) takeaway = `You scored ${clutch} points when the game was on the line — clutch.`;
      else if (serve.count >= 5 && serve.pct >= 70) takeaway = `Your serve won ${serve.pct}% of its points — a real weapon.`;
      else if (hasPointTypes && c.errors > c.pts) takeaway = "More giveaways than winners this time — cleaner play wins matches.";
      else if (c.pts === 0) takeaway = "No points credited to you this one — the next one's yours.";
      else takeaway = `You scored ${c.contributionPct}% of your team's points.`;

      personal = {
        name: firstName(viewerPlayerId),
        slim: false,
        pts: c.pts,
        contributionPct: c.contributionPct,
        errors: c.errors,
        net: c.net,
        showErrors: hasPointTypes,
        serve,
        clutch,
        isTopScorer,
        takeaway,
      };
    } else if (serve.count >= 5) {
      personal = {
        name: firstName(viewerPlayerId),
        slim: true,
        showErrors: false,
        isTopScorer: false,
        serve,
        takeaway: `Your serve won ${serve.pct}% of its points.`,
      };
    }
  }

  // ── Selection: top N by priority, upbeat first, "improve" beats last ──────
  const picked = fired
    .sort((a, b) => b.priority - a.priority)
    .slice(0, personal ? 3 : 4);
  const insights = [
    ...picked.filter(i => i.tone !== "error"),
    ...picked.filter(i => i.tone === "error"),
  ].map(i => ({ id: i.id, icon: i.icon, tone: i.tone, headline: i.headline, detail: i.detail }));

  return { viewerTeam, viewerWon, framing, insights, personal };
}
