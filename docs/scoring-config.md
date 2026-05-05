# Scoring configuration — design note

> Status: design proposal, not yet implemented.
> Owner: TBD. Audience: future implementer.
> See also: `design_handoff_arenix/README.md` (visual canon),
> `supabase/schema.sql` (schema).

## 1. Context & goals

Arenix today captures every point at maximum detail: team, scoring player,
point category (ace / spike / block / tip), error subtype, and the server.
That is the right model for serious tournaments, but it is heavyweight for
casual leagues, after-work pickup play, or beginners running their first
event.

We want a configurable **scoring level** so admins can pick how much detail
the live scorer captures, *without* breaking the existing stats system or
producing misleading numbers when a player has data from leagues at different
levels.

### Goals

- Configurable scoring detail per league, with per-tournament override.
- Same data shape across levels — lower levels simply omit fields.
- Stats degrade gracefully: each metric is computed only from the matches
  that actually captured the data it needs.
- No regressions for matches already played (all existing data is treated
  as the most-detailed level).

### Non-goals

- Changing the live-scoring UX at the top level (Level 4 stays exactly as
  today).
- Changing rule logic: points-to-win, sets-per-match, side-change interval,
  tie-break behavior. Those remain governed by `tournaments.sets_per_match`
  and `tournaments.tie_breaker_config`.
- Custom point categories or custom error subtypes (out of scope for v1).

## 2. Current scoring snapshot

A point flows through the app today as:

```
PointButtons.onPoint(team)                        src/components/PointButtons.jsx
  → live.addPoint(team)                           src/components/LiveScoreboard.jsx
  → setPendingPoint({ teamNum })                  src/hooks/liveGame/useLiveGameScoring.js
  → confirmPointType(type)                        ↓
  → confirmPlayer(playerId | null)                ↓   (Skip Player path = null)
  → confirmErrorSubtype(subtype)                  ↓   (only when type === 'error')
  → resolvePoint(...)                             ↓   appends to log[]
  → tournamentService.saveMatch / freePlayService updates JSONB `log` + `sets`
```

### Fields captured per log entry today

From `src/hooks/liveGame/useLiveGameScoring.js` (`resolvePoint`):

```
id, timestamp, team, t1, t2,
pointType, pointTypeLabel, pointTypeIcon,
scoringPlayerId,           // nullable today — "Skip Player (Team Point)"
errorPlayerId, errorType,  // only on errors
serverPlayerId, serverTeam,
nextServerPlayerId, nextServerTeam,
setNum, pointNum, streak,
sideBeforePoint, sideChange, msg
```

### Hardcoded enums

- `POINT_TYPES = [ace, spike, block, tip, error]` — `src/hooks/liveGame/pointTypes.js`
- `ERROR_SUBTYPES = [net, out, serve, other]` — same file, mirrored in
  `src/components/stats/pointTypes.js` (with an extra `untyped` for legacy
  log entries)

### Existing config surface

- `leagues` — no scoring configuration today (`supabase/schema.sql`).
- `tournaments.sets_per_match` (int, default 1).
- `tournaments.tie_breaker_config` (JSONB) — only consumed by knockout
  tie-breaking; not a generic config bag.

### Skip Player already exists

The "Skip Player (Team Point)" button in `LiveScoreboard.jsx` already records
points with `scoringPlayerId = null`. Stats code in
`lib/tournamentStats.js` and `lib/playerStats.js` treats null-attributed
points as team points and excludes them from per-player aggregates. **This
means Level 1 is already representable in today's schema; we just need to
gate the UI and stats reads.**

## 3. The four scoring levels

Each level is a strict superset of the level below. Storage shape never
changes — lower levels simply leave fields `null` / absent.

| Level | Name         | Captures                                                       | Required keys on each log entry beyond the L1 baseline |
| ----- | ------------ | -------------------------------------------------------------- | ------------------------------------------------------ |
| 1     | Basic        | Team points only.                                              | —                                                      |
| 2     | Intermediate | + scoring player.                                              | `scoringPlayerId`                                      |
| 3     | Advanced     | + point category (ace / spike / block / tip).                  | `scoringPlayerId`, `pointType`                         |
| 4     | Elite        | + errors (with subtype) + server attribution.                  | `scoringPlayerId`, `pointType`, `errorPlayerId`, `errorType`, `serverPlayerId` |

**L1 baseline keys (always present):** `id`, `timestamp`, `team`, `t1`, `t2`,
`setNum`, `pointNum`, `streak`, `msg`.

> **Historical data:** every match played before this feature ships matches
> the Level 4 shape. Stats eligibility code treats all pre-existing matches
> as Level 4. No backfill / migration is required.

## 4. The Skip-Player rule

The `Skip Player` button is **not** a separate setting. It is implied by the
level:

- **Level 1** — no player picker is shown. `scoringPlayerId` is always `null`.
- **Level 2 +** — the player picker is **required**. The current "Skip Player
  (Team Point)" affordance in `src/components/LiveScoreboard.jsx` is removed
  whenever the resolved level is ≥ 2.

Rationale: an orthogonal toggle creates four redundant setting combinations
("L3 with skip", "L3 without skip", …) and produces ambiguous stats.
Collapsing it into the level keeps the data shape unambiguous from the level
alone.

## 5. Configuration model

### Storage

Add a JSONB column called `scoring_config` to **both** tables:

- `leagues.scoring_config` — the league default.
- `tournaments.scoring_config` — per-tournament override. `null` means
  "inherit from league".

### Shape

```json
{ "level": 1 }
```

That is the entire v1 shape. The object form (vs. a plain int column) is
deliberate so that future additions — custom categories, custom error
subtypes, opt-in serve tracking at L3, etc. — can be added without another
schema migration.

### Resolution

```js
function resolveScoringLevel(tournament, league) {
  return (
    tournament?.scoring_config?.level ??
    league?.scoring_config?.level ??
    4 // legacy default — preserves today's behavior for unconfigured leagues
  );
}
```

Live this as a small util — a likely home is `src/lib/scoring.js` (new) or
inside `src/services/tournamentService.js` if we prefer to keep it next to
the tournament read path.

### Where the level is **read**

- `src/hooks/useLiveGame.js` and `src/hooks/liveGame/useLiveGameScoring.js`
  — gate the dialog stack at point-capture time.
- `src/components/GameStats.jsx` and `src/lib/matchStats.js` — gate the
  post-match stats screen.
- `src/components/TournamentStatsScreen.jsx` and `src/lib/tournamentStats.js`
  — gate the tournament stats screen.
- `src/hooks/usePlayerStats.js` and `src/lib/playerStats.js` — annotate each
  match with its resolved level for cross-league per-stat eligibility.

### Where the level is **written**

- `src/pages/TournamentSetupWizard.jsx` — new "Scoring detail" step (or
  field on an existing step).
- `src/pages/LeagueDetail.jsx` — league settings area gains a default
  selector.
- New service helpers in `src/services/leagueService.js` and
  `src/services/tournamentService.js` to update the JSONB column.

### Lock rule

Once a tournament has at least one **played** match, its resolved scoring
level is locked. Changing the level mid-tournament would produce incoherent
intra-tournament stats (some matches with `pointType`, some without) without
a useful UX. The League default may still be edited; future tournaments
pick up the new default unless they have their own override.

## 6. Stats impact matrix

The single source of truth for "which stat needs which level". Rows are
grouped by where they are computed.

### Match-level (`src/lib/matchStats.js`)

| Stat                                              | Min level | Function          |
| ------------------------------------------------- | --------- | ----------------- |
| Final score, set-by-set                           | 1         | n/a (read from match row) |
| Lead chart, max lead, lead changes                | 1         | `calcLeadStats`   |
| Ties, close points, dynamics                      | 1         | `calcDynamics`    |
| Best / longest streak per team                    | 1         | derived from log  |
| MVP per match                                     | 2         | `calcMVP`         |
| Per-player points & errors                        | 2         | `calcPlayerContribution` |
| Peak window, clutch points                        | 2         | `calcPeakWindow`, `calcClutchPoints` |
| Per-player points-by-type breakdown               | 3         | derived from `byType` in `calcPlayerContribution` |
| Serving stats (serve win %, serve count)          | 4         | `calcServeStats`  |
| Error subtype breakdown                           | 4         | derived from log  |

### Tournament-level (`src/lib/tournamentStats.js`)

| Stat                                              | Min level | Function          |
| ------------------------------------------------- | --------- | ----------------- |
| Standings (W/L, PF, PA, PD, PTS, head-to-head)    | 1         | `lib/standings.js → calcOverallStandings` |
| Team totals (pointsScored, mistakes, W/L)         | 1         | `computeTeamTournamentTotals` |
| Top scorers, most errors, cleanest player         | 2         | `rankPlayersByStat` (`points`, `errors`) |
| Awards by type (Spike Machine, Block Master, …)   | 3         | `rankPlayersByStat` over `byType` |
| Most Efficient Server (≥ 10 serves)               | 4         | `serveWinPct`     |
| Player tournament breakdown                       | 2 (partial) / 4 (full) | `computePlayerTournamentBreakdown` |

### Lifetime / cross-league (`src/lib/playerStats.js`)

| Stat                                              | Min level |
| ------------------------------------------------- | --------- |
| Total matches, win rate, win streaks              | 1         |
| Tournaments won, best finish rank                 | 1         |
| Points per match, errors per match, net points    | 2         |
| Strengths (top shot, shot share, byType)          | 3         |
| Serve stats (totalServes, serveWinPct, aceRate)   | 4         |
| Pressure stats (clutch, side-out %)               | 4         |
| Playstyle classification                          | 4         |

## 6a. Post-match stats screen

Renders right after a match ends. Driven by `src/components/GameStats.jsx`
and `src/lib/matchStats.js`. The screen branches on the **match's** resolved
level — single match, single level, no cross-level mixing applies here.

| Section                                                      | L1     | L2     | L3     | L4     |
| ------------------------------------------------------------ | ------ | ------ | ------ | ------ |
| Final score, set-by-set                                      | shown  | shown  | shown  | shown  |
| Lead chart, ties, close points                               | shown  | shown  | shown  | shown  |
| Best / longest streak per team                               | shown  | shown  | shown  | shown  |
| MVP, per-player points & errors                              | hidden | shown  | shown  | shown  |
| Peak window, clutch points                                   | hidden | shown  | shown  | shown  |
| Per-player points-by-type breakdown                          | hidden | hidden | shown  | shown  |
| Serving stats (serve win %, serve count)                     | hidden | hidden | hidden | shown  |
| Error subtype breakdown (net / out / serve / other)          | hidden | hidden | hidden | shown  |

- L1 collapses to a "match summary" card: score, sets, flow chart.
- L2 adds the player-attribution sections.
- L3 adds the type-breakdown chart.
- L4 is today's full screen.

The post-match screen does **not** show sample-size captions — it is
single-match, single-level data.

## 6b. Tournament stats screen

Driven by `src/components/TournamentStatsScreen.jsx` and
`src/lib/tournamentStats.js`. The tournament has a single resolved level
(see § 5 lock rule), so all matches inside a tournament share that level —
no per-match filtering needed at this scope.

| Section                                                      | L1     | L2      | L3      | L4     |
| ------------------------------------------------------------ | ------ | ------- | ------- | ------ |
| Standings (`calcOverallStandings`)                           | shown  | shown   | shown   | shown  |
| Team totals (pointsScored, mistakes, W/L)                    | shown  | shown   | shown   | shown  |
| Top scorers (`rankPlayersByStat` on `points`)                | hidden | shown   | shown   | shown  |
| Most errors / cleanest player                                | hidden | shown   | shown   | shown  |
| Awards by type (Spike Machine, Block Master, Ace King)       | hidden | hidden  | shown   | shown  |
| Most Efficient Server (gated ≥ 10 serves)                    | hidden | hidden  | hidden  | shown  |
| Player tournament breakdown                                  | hidden | partial | partial | shown  |

`partial` — render the screen with only the fields available at that level
(e.g. show `points` and `errors` but omit the `byType` card and the serve
card) rather than rendering empty zeros.

A small **"Scoring level: N"** badge sits at the top of the screen so the
user understands why a section is missing rather than assuming it broke.

## 7. Cross-league lifetime stats

This is the trickiest case: a single user's career view aggregates matches
across every league they play in, and those leagues may run at different
levels.

### Rule: per-stat eligibility

Every lifetime stat is computed from the **subset of the player's matches
that captured the fields it needs**. Each rendered stat carries:

- a **value**,
- a **sample size** (matches / sets / serves used),
- the **level scope** it was drawn from.

The Profile UI shows the sample size as a small caption under each tile,
e.g. "based on 18 of your 30 matches".

### Worked example

Player has 30 matches across two leagues — 18 in League A (Level 4) and 12
in League B (Level 2):

- **Win rate** — uses all 30. L1+ stat.
- **Points per match** — uses all 30. L2+ stat, both leagues qualify.
- **Ace rate** — uses only the 18 League-A matches. UI: "based on 18 of 30".
- **Serve win %** — uses only the 18 League-A matches. UI: "based on 18 of 30".
- **Playstyle label** — uses only the 18 League-A matches; if fewer than
  some threshold (TBD), hide rather than guess.

### Implementation outline

1. In `src/hooks/usePlayerStats.js`, when building the annotated-match array
   (around `usePlayerStats.js` `getMyLeagues` →  `myPlayer` resolution),
   attach the resolved `level` to each match record.
2. In `src/lib/playerStats.js`, refactor `computeAllPlayerStats` so each
   sub-computer (`computeServingStats`, `computePressureStats`,
   `computeStrengths`, `computePlaystyle`, `computeWinStreak`) takes the
   already-filtered subset of matches that satisfies its `minLevel` and
   returns both the value and the sample size.
3. The bundle returned to the UI grows from `{ value }` to
   `{ value, sampleSize, totalMatches, minLevel }` per stat. UI components
   in `src/pages/Profile.jsx` render the caption from this.

### Why not the alternatives

- **Degrade-to-lowest** — if any one of a player's leagues runs at L1, the
  career view collapses to win-rate-only. Throws away data the player
  actually generated.
- **Segregate per league** — kills the unified career view that
  `Profile.jsx` is built around. Worst UX.
- **Silent merge** (today's behavior) — produces misleading numbers. A
  player with one L2 league and one L4 league sees a diluted "ace %"
  because L2 matches contribute zero aces just because they didn't capture
  any.

## 8. UI implications

- **Live scoring** (`src/components/LiveScoreboard.jsx`,
  `src/components/PointButtons.jsx`): the dialog stack becomes level-aware.
  - L1 — no dialogs at all; tapping a team button immediately commits a team
    point.
  - L2 — player picker only.
  - L3 — point-type → player.
  - L4 — point-type → player → error subtype (when type === error). Today's
    flow.
- **Post-match stats** (`src/components/GameStats.jsx`): branches per § 6a.
  Hide whole sections rather than showing zeroed cards.
- **Tournament stats** (`src/components/TournamentStatsScreen.jsx`):
  branches per § 6b. Add the "Scoring level: N" badge at the top.
- **Profile / lifetime stats** (`src/pages/Profile.jsx` + tiles in the Stats
  tab): every tile gains a sample-size caption when `sampleSize <
  totalMatches`. Hide tiles whose `sampleSize` is below a small threshold
  (e.g. < 3 matches) instead of rendering misleading values.
- **Setup**:
  - `src/pages/TournamentSetupWizard.jsx` — add a "Scoring detail" step or
    field. Default = league default. Preview the captured fields per level.
  - `src/pages/LeagueDetail.jsx` — settings area gains a "Default scoring
    detail" selector.
- **Free play** (`src/pages/FreePlayWizard.jsx`,
  `src/components/FreePlayStatsScreen.jsx`): free play has no league, so it
  defaults to Level 4 to preserve today's behavior. A level picker on the
  wizard is a stretch goal. The free-play stats screen follows the § 6b
  rules using its own resolved level.

## 9. Backward compatibility

- All existing rows (matches, free-play games): implicitly Level 4 — their
  `log` already contains the L4 shape.
- Leagues created before this feature ships: `scoring_config = NULL` →
  resolver returns Level 4. No change for existing users.
- Leagues created post-feature without explicit config: same default (4),
  but the League settings UI surfaces a "Choose default scoring detail"
  prompt to nudge admins.

## 10. Open questions

- **Downgrade display?** Should historical matches in a league that is now
  configured as L1 be displayed at L1 (hiding their captured detail)?
  Recommendation: **no**. The captured data remains valid; the level
  governs what is captured *going forward*.
- **Locking** — § 5 recommends locking the level once a tournament has any
  played match. Confirm before implementation.
- **Free-play override** — should free-play sessions be allowed to choose
  a non-Elite level? Probably yes for symmetry, but punt to v2.
- **Custom categories / error subtypes** — out of scope for v1. The JSONB
  shape is reserved for it.

## 11. Implementation roadmap (non-binding)

1. **Schema** — add `scoring_config JSONB` to `leagues` and `tournaments`
   in `supabase/schema.sql` plus a migration.
2. **Service layer** — read/write helpers in `leagueService.js` and
   `tournamentService.js`; new `resolveScoringLevel(tournament, league)`
   util in `src/lib/scoring.js`.
3. **Live-scoring gating** — branch the dialog stack in
   `useLiveGameScoring.js` / `LiveScoreboard.jsx` on the resolved level.
4. **Setup UIs** — wizard step in `TournamentSetupWizard.jsx`; league
   default selector in `LeagueDetail.jsx`.
5. **Post-match stats refactor** — branch `GameStats.jsx` rendering on the
   match's resolved level (§ 6a).
6. **Tournament stats refactor** — branch `TournamentStatsScreen.jsx`
   rendering on the tournament's resolved level (§ 6b); add the level
   badge.
7. **Lifetime stats refactor** — per-stat eligibility filtering in
   `playerStats.js` and `usePlayerStats.js`; UI sample-size captions in
   `Profile.jsx`.

Steps 1–4 unlock recording at lower levels. Steps 5–7 are the stats work
that this design note exists primarily to underwrite.
