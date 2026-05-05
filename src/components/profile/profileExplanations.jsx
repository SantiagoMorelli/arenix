/**
 * Explanation text for each section / stat in the Profile page.
 * Used by HelpToggle + InfoPanel (same pattern as stats/explanations.jsx).
 *
 * Each value is a JSX node or plain string — keep it short, conversational,
 * and in the same italic-dim style as the GameStats explanations.
 */

export const PROFILE_EXPLANATIONS = {
  // ── Achievements ────────────────────────────────────────────────────────────
  achievements: (
    <>
      Achievements are badges you earn by reaching milestones in your game —
      play enough matches, land a streak, dominate your serve, or climb the
      rankings. Each badge shows your progress with a ring around it; once the
      ring is full, you unlock it. Tap any category chip to filter by type.
      The sound icon (top-right) controls a short chime that plays the moment
      a new badge is unlocked — mute it if you prefer silence.
    </>
  ),

  // ── Player Stats — section header ────────────────────────────────────────────
  playerStats: (
    <>
      Detailed breakdowns of your performance across all recorded matches.
      Data is aggregated from every point logged in your league tournaments.
      Use the sub-tabs to explore serving, pressure situations, scoring
      tendencies, and your overall playing style.
    </>
  ),

  // ── Player Stats sub-tabs ────────────────────────────────────────────────────
  serving: (
    <>
      Everything about your service games — how often you win points on your
      serve, how many aces you land, and how consistent your toss is. A high
      serve-win % means opponents struggle to return your serve effectively.
      &ldquo;In play %&rdquo; counts serves that clear the net and stay in bounds.
    </>
  ),

  pressure: (
    <>
      How you perform when it matters most. &ldquo;Clutch&rdquo; covers the last 4 points
      of any set and all deciding-set situations. &ldquo;Side-out&rdquo; measures how often
      you win the rally when your team is receiving — converting those is key to
      momentum swings. Comeback points are scored while trailing by 2 or more.
    </>
  ),

  strengths: (
    <>
      Your scoring breakdown by shot type — aces, spikes, blocks, and tips —
      plus a summary of how your errors are distributed. Your &ldquo;top shot&rdquo; is
      the type you rely on most. Use the error breakdown to spot patterns and
      reduce unforced mistakes.
    </>
  ),

  playstyle: (
    <>
      Your playing profile based on shot distribution and risk patterns.
      Aggressor = spike-heavy finisher. Server = wins off the serve.
      Defender = converts defense into offense. All-rounder = balanced mix.
      Risk shows how often you commit errors relative to your shot attempts;
      Consistency (0–1) measures how stable your scoring share is match to match.
    </>
  ),

  // ── Performance stat table ───────────────────────────────────────────────────
  performance: (
    <>
      A quick summary of your career numbers across all league matches.
      &ldquo;Points per match&rdquo; counts individual scoring plays you were credited with.
      &ldquo;Serve win %&rdquo; and &ldquo;Side-out %&rdquo; are the two most important efficiency
      metrics in pickleball. &ldquo;Best win streak&rdquo; is your longest consecutive
      winning run across any period.
    </>
  ),

  // ── Leagues ─────────────────────────────────────────────────────────────────
  leagues: (
    <>
      All leagues you are currently a member of. Your rank is based on the
      standings within each league. Admin badge means you have management
      permissions. Tap any league card to jump straight to that league.
    </>
  ),

  // ── Recent matches ───────────────────────────────────────────────────────────
  matches: (
    <>
      Your last 30 tournament matches, newest first. Tap any match to open the
      full point-by-point stats breakdown — serve efficiency, match flow,
      top performers, and more. Only matches played with point logging enabled
      will show the full stats overlay.
    </>
  ),
}
