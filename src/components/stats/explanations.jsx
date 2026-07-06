/* eslint-disable react-refresh/only-export-components -- this file exports a data
   map of JSX nodes, not hot-reloadable components. */

/**
 * Plain-language explanations for every stats section.
 *
 * Surfaced through the help-mode toggle in GameStats. Default off — when the
 * user flips it on, each section reveals a small help icon next to its label,
 * and tapping the icon expands the corresponding entry from this map.
 *
 * Tone: example-rich, no volleyball jargon dumps. Each one should answer
 * "what am I looking at and why does it matter?" in a few sentences.
 */

const Item = ({ title, children }) => (
  <div>
    <span className="font-bold text-text not-italic">{title}</span>
    <span> — </span>
    <span>{children}</span>
  </div>
);

export const EXPLANATIONS = {
  matchStory: (
    <>
      A plain-English summary of the match, generated automatically from the
      point-by-point log. It picks the few things that mattered most — how
      close the game was, big runs, who carried the scoring, and what to
      improve next time — so you don't need to read the numbers below to
      understand how you played. If you played in this match, the wording
      is addressed to you and a "How you played" card shows your own numbers.
    </>
  ),

  matchFlow: (
    <>
      The row of tiny colored dots is the <span className="font-bold text-text not-italic">Score Momentum Strip</span>.
      Each dot is one point played, left-to-right in chronological order.
      Orange dots are points team 1 won, teal dots are team 2's. A long run of
      one color is a streak. Lots of alternation = a tight back-and-forth match.
      A big block of one color = one team dominated that stretch. Instant
      "shape of the match" without reading a single number.
    </>
  ),

  matchHighlights: (
    <div className="space-y-1.5">
      <p>Three quick facts that answer the most interesting questions about the match:</p>
      <Item title="MVP">
        The player with the best net score: points they scored minus errors
        they caused. A fairer measure of impact than total points alone — a
        player with 8 points but 5 errors was less helpful than one with 6
        points and 0 errors. Highest net score gets the flame.
      </Item>
      <Item title="Biggest Lead">
        The maximum point gap that existed at any moment. "+7" means at some
        point one team was leading by 7 points, shown in their color. A small
        lead (+2 or +3) means the match was extremely tight throughout. A
        large one (+9) means one team was in control at some point — even if
        the other came back to win.
      </Item>
      <Item title="Lead Changes">
        How many times the leading team switched. Zero means one team led
        from start to finish. A high number (6 or 7) means neither team could
        pull away — a very competitive, exciting match. This single number
        tells you how contested the game was.
      </Item>
    </div>
  ),

  totalPoints: (
    <>
      The total points scored by each team across the entire match (all sets
      combined), with individual set scores below. Lets you see if one set
      was more lopsided than another — winning 21-10 in set 1 and 21-19 in
      set 2 tells a very different story than two close sets.
    </>
  ),

  topPerformers: (
    <div className="space-y-1.5">
      <p>
        The main player analysis section. Every player on both teams gets a
        row. The initials circle is color-coded to their team, and the flame
        icon marks the MVP. The pill next to the name is{" "}
        <span className="font-bold not-italic">net points</span> — points
        scored minus errors caused, the same measure the MVP is picked by.{" "}
        <span className="text-success font-bold not-italic">Green</span> means
        the player added more than they gave away;{" "}
        <span className="text-error font-bold not-italic">red</span> means
        their errors outweighed their points.
      </p>
      <p className="font-bold text-text not-italic">The stat columns:</p>
      <Item title="PTS">
        Total points the player directly contributed to their team (attacks
        won, aces, blocks, tips). Best gauge of how active they were
        offensively.
      </Item>
      <Item title="ACE">
        Direct serve points the opponent couldn't return. The highest-value
        serve — no chance to respond.
      </Item>
      <Item title="SPK">
        Spike winners — hard attacks the opponent couldn't dig or block. The
        primary attacking weapon in beach volleyball.
      </Item>
      <Item title="BLK">
        Blocks — points won by stopping the opponent's attack at the net.
        Defensive dominance at the net.
      </Item>
      <Item title="TIP">
        Soft shots placed over or around the block. Tactical play and court
        awareness rather than raw power.
      </Item>
      <Item title="ERR">
        <span className="text-error font-bold not-italic">Errors</span>{" "}
        committed by this player — points the opponent gets because of a
        mistake. Errors are tagged by action: a spike error means an attack
        that went into the net or out, a serve error is a missed serve, a tip
        error is a failed dink, and other covers second-touch or reception
        mistakes. Shown in red because errors directly gift points to the
        opponent.
      </Item>
      <p>
        Real self-analysis is now possible: 7 PTS / 1 ERR is a clean,
        high-value game. 7 PTS / 6 ERR is risky play that nearly cancels out
        the contribution. And with action-tagged errors you can see exactly
        where the mistakes are coming from — e.g. 5 spike errors vs. 1 serve
        error tells you the attack needs work, not the serve.
      </p>
      <p>
        Tap a player to expand their key moments: every point they scored or
        errored, in order, with the running score. Errors show the action
        they came from (spike, serve, tip). Icons mark points played under
        pressure — match point, set point, tied score, or clutch (a close
        score late in the set). Tap a moment to find it in Match Flow.
      </p>
    </div>
  ),

  serveBreakdown: (
    <div className="space-y-1.5">
      <p>A focused breakdown of each player's serving:</p>
      <Item title="SRV">
        How many times the player served. The serve rotates, so this depends
        on how long the match lasted and when they were in rotation.
      </Item>
      <Item title="WIN%">
        Percentage of their serves where their team scored the point.{" "}
        <span className="text-success font-bold not-italic">Green (60%+)</span>{" "}
        means dominant when serving.{" "}
        <span className="text-error font-bold not-italic">Red (below 40%)</span>{" "}
        means the opponent tends to score back — possibly a weak serve, or
        the team struggles in the rally that follows.
      </Item>
      <Item title="ACES">
        How many serves were direct aces. A subset of serve wins — 2 aces in
        8 serves is a 25% ace rate, very strong serving.
      </Item>
      <p>
        Answers the question:{" "}
        <span className="font-bold not-italic text-text">
          "am I a weapon on serve, or am I just handing the ball over?"
        </span>
      </p>
    </div>
  ),

  pointTypes: (
    <>
      A side-by-side bar chart of how each team's points ended — Aces,
      Spikes, Blocks, Tips, and Rival Errors. A wide{" "}
      <span className="font-bold text-text not-italic">Spike</span> bar means
      a dominant attacking team. A wide{" "}
      <span className="font-bold text-text not-italic">Rival Error</span> bar
      means the match was won and lost on mistakes rather than winners.
      Reveals each team's style of play in this match.
    </>
  ),

  serveEfficiency: (
    <>
      The percentage of each team's points that were scored while that team
      was serving.{" "}
      <span className="font-bold not-italic text-text">50%</span> = perfectly
      balanced.{" "}
      <span className="font-bold not-italic text-text">Above 50%</span> = the
      team was more dangerous when they had the ball in hand.{" "}
      <span className="font-bold not-italic text-text">Below 50%</span> = the
      opponent was breaking their serve frequently. The two numbers below the
      percentage ("serving" and "receiving") are the raw counts so you can see
      the volume, not just the ratio.
    </>
  ),

  matchDynamics: (
    <div className="space-y-1.5">
      <p>Three stats that describe the rhythm and tension of the match:</p>
      <Item title="Best Streak">
        The longest run of consecutive points by a single team without the
        other scoring back. A streak of 7 or 8 is a massive momentum swing —
        one team completely shut the other out for that stretch. A max streak
        of 3-4 means no team ever ran away with it.
      </Item>
      <Item title="Times Tied">
        How often the score was level after a point. A high number (5+) means
        the teams kept catching up to each other — neck and neck the whole
        way. A low number (0-1) means one team pulled ahead early and stayed
        there.
      </Item>
      <Item title="Clutch Points">
        Points decided when the score margin was within 2 — the "anything
        can happen" zone. Many clutch points = tense throughout. Few = the
        score gap stayed comfortable for one team.
      </Item>
    </div>
  ),

  timing: (
    <div className="space-y-1.5">
      <Item title="Match duration">
        How long the match lasted, from the first point to the last. Tells a
        quick 18-minute match from a grueling 45-minute one.
      </Item>
      <Item title="Longest rally">
        The longest gap between two consecutive point entries. Since only the
        final point of a rally is logged (not each touch), this is an
        approximation — but it gives a sense of whether there were any
        extended exchanges.
      </Item>
    </div>
  ),

  podium: (
    <>
      The top three teams of the event. The champion takes the tall center
      step. In a tournament this comes from the final bracket; in free play
      it follows the standings below.
    </>
  ),

  playerAwards: (
    <>
      Fun titles for the statistical leaders, counted only from matches that
      were scored live point-by-point. Each card shows who led the stat and
      by how much, with a short line explaining what earned the award.
    </>
  ),

  finalStandings: (
    <div className="space-y-1.5">
      <p>
        Teams ranked top to bottom; the highlighted row is first place. The
        columns:
      </p>
      <Item title="W / L">Matches won and lost.</Item>
      <Item title="PF / PA">
        Points scored (For) and conceded (Against) across all matches.
      </Item>
      <Item title="PD">
        The difference, PF minus PA. Positive means the team outscored its
        opponents overall.
      </Item>
      <Item title="PTS">
        Table points used for the ranking — winning matches earns them, and
        ties are broken by PD.
      </Item>
    </div>
  ),

  matchRecords: (
    <>
      Superlatives across every match played: the most lopsided win, the
      highest combined score, the longest scoring streak, the biggest
      comeback, the longest game and the longest rally.
    </>
  ),

  playerPodium: (
    <>
      Players ranked individually, regardless of which team they played on.
      Sorted by match wins, then win percentage, then points scored.
    </>
  ),

  playerRankings: (
    <div className="space-y-1.5">
      <p>Every player's session totals. The columns:</p>
      <Item title="W / L">Matches the player's team won and lost.</Item>
      <Item title="WIN%">The share of their matches they won.</Item>
      <Item title="Pts">
        Points they personally scored in live-tracked matches.
      </Item>
      <Item title="Aces / Spikes / Blocks">How those points were scored.</Item>
      <Item title="Errors">
        <span className="text-error font-bold not-italic">Mistakes</span>{" "}
        that gave the opponent a point — shown in red.
      </Item>
      <p>Swipe the table sideways to see every column.</p>
    </div>
  ),

  history: (
    <>
      A reverse-chronological log of every point in the match. Each row shows
      the score at that moment — the left number in orange (team 1) and the
      right in teal (team 2). For regular points, the action icon is colored
      in the scoring team's color followed by the player who scored. For
      errors, a red X appears alongside the error-type icon and the name of
      the player who made the mistake. The volleyball icon below shows who
      was serving, colored by their team. Scroll to any score to understand
      exactly what happened at that moment.
    </>
  ),
};
