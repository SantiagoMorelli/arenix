# Scoring configuration — implementation guide

> Status: ready to execute. Companion to `docs/scoring-config.md`.
> Audience: future Claude Code session OR human implementer.
> Each phase below is a self-contained prompt that can be pasted into a
> fresh Claude Code session and shipped as its own PR.

## Purpose

`docs/scoring-config.md` is the design note for configurable scoring levels
(L1 Basic … L4 Elite). This document operationalizes that design as **seven
independent PRs**, each with explicit acceptance criteria and a manual
smoke checklist.

## Prerequisites for any phase

1. Read `docs/scoring-config.md` end-to-end. The design decisions there
   are not re-justified in this guide — they are assumed.
2. Skim `CLAUDE.md` for repo conventions (services boundary, Lucide icons
   only, mobile-first, Tailwind utilities only, `ui-new.jsx` reuse).

## The golden rule

> **Every PR in this series must leave Level-4 behavior pixel-identical to
> today.** The default resolver returns 4. Legacy data is treated as L4.
> Existing leagues, tournaments, and matches must look and behave exactly
> as before. Phase 1's golden tests enforce this for the four pure-function
> stat libs; every later phase asserts on those same fixtures.

If a phase's diff makes you change the L4 golden tests, **stop**. Either
the test was wrong (rare) or the refactor is wrong (likely).

## Conventions (apply to every phase)

- **Branching.** Each phase opens its own branch and PR:
  `claude/scoring-config-phase-<N>-<slug>` (e.g.
  `claude/scoring-config-phase-1-vitest-foundation`).
- **Commit style.** Conventional Commits — matches recent history. Use
  `test:` for Phase 1, `feat:` for Phases 2/3/4, `refactor:` for Phases
  5/6/7.
- **Test framework — explicit exception.** `CLAUDE.md` says "no test
  framework is configured; do not scaffold one unless asked." This series
  is the exception. We add **Vitest only**, scoped to `src/lib/*Stats.js`
  and `src/lib/standings.js` (pure functions, zero React). No React Testing
  Library, no component tests, no hook tests, no page tests. Manual smoke
  covers UI.
- **Verification per phase, in this order:**
  1. `npm run lint` — zero errors.
  2. `npm run test` — all tests pass (after Phase 1 ships).
  3. `npm run build` — clean production build.
  4. Manual smoke checklist in the PR description (each phase below
     supplies one — copy it verbatim into the PR).
- **Reuse first.** Before creating any new styled element, grep
  `src/components/ui-new.jsx` and use what's there (`Card`, `Btn`,
  `Avatar`, `Badge`, `Label`, `Select`, …).
- **Services boundary.** Pages, components, and hooks must not import
  `@supabase/supabase-js` directly. All DB access goes through
  `src/services/*`.
- **Restyle, don't rewire.** When changing visuals, leave `useState`,
  `useEffect`, event handlers, and props alone.
- **No backwards-compat shims.** No `// removed for X` comments, no
  `_unused` renames, no re-exports. Delete cleanly.
- **No new docs unless asked.** Don't write a per-phase `NOTES.md`. The
  PR description is the artifact.

---

## Phase 1 — Test foundation

**Why first.** This phase produces zero behavior change. It captures
**golden L4 fixtures** that pin down today's `lib/*Stats.js` output
exactly. Every later phase proves it didn't regress L4 by leaving those
fixtures untouched and still green.

### Prompt

```text
Read these files end-to-end before writing anything:
- docs/scoring-config.md            (design note)
- docs/scoring-config-implementation.md  (this guide — Conventions
                                     section + this Phase 1 entry)
- CLAUDE.md                         (repo conventions)
- src/lib/standings.js
- src/lib/matchStats.js
- src/lib/tournamentStats.js
- src/lib/playerStats.js
- src/hooks/usePlayerStats.js       (to understand the input shape that
                                     feeds playerStats)

Goal of this phase: add Vitest, scoped strictly to the four pure-function
stat libraries above, and write characterization (golden) tests against
real Level-4 match logs. These tests are the safety net for Phases 5–7.

Tasks:
1. Add Vitest as a devDependency. Add scripts:
     "test":       "vitest run"
     "test:watch": "vitest"
   Create a minimal vitest.config.js — no jsdom, no setup files.
   The libs are pure JS.
2. Create src/lib/__tests__/fixtures/ with one or two complete L4
   match logs. To get realistic data, either:
     (a) export an existing match's `log` from the live DB and sanitize
         (replace player UUIDs with stable strings like "p1"…"p4"), or
     (b) hand-construct one match-end log that exercises every point
         type (ace, spike, block, tip, error/{net,out,serve,other})
         and every server transition.
   Save as JSON files; do NOT import them through Supabase.
3. Write four test files:
     src/lib/__tests__/standings.test.js
     src/lib/__tests__/matchStats.test.js
     src/lib/__tests__/tournamentStats.test.js
     src/lib/__tests__/playerStats.test.js
   For each, call every exported function with the fixture and assert
   on a complete output snapshot. Use `expect(result).toMatchInlineSnapshot()`
   for compact, diff-readable snapshots.
4. Add a top-of-file comment in each test file:
     // Golden L4 characterization tests. DO NOT EDIT in Phases 5-7;
     // ONLY EXTEND. If a phase requires you to change these, the
     // refactor is wrong.

Acceptance:
- `npm run lint` passes.
- `npm run test` passes — every test green.
- `npm run build` passes.
- Zero changes outside package.json, vitest.config.js, and
  src/lib/__tests__/. No production code edits.

Out of scope (do not touch):
- Anything under src/components/, src/pages/, src/hooks/, src/services/.
- Schema, supabase/.
- Adding RTL, jsdom, or any non-lib test.

Branch: claude/scoring-config-phase-1-vitest-foundation
Commit prefix: test:
```

### Acceptance summary

- New: `vitest.config.js`, `src/lib/__tests__/{fixtures,standings.test.js,
  matchStats.test.js,tournamentStats.test.js,playerStats.test.js}`,
  Vitest in `devDependencies`, `test` + `test:watch` scripts.
- Lint, test, build green. No production code touched.
- The four test files are explicitly marked DO-NOT-EDIT-IN-LATER-PHASES.

### Manual smoke

None — this phase touches no runtime code.

---

## Phase 2 — Schema, services, resolver util

**Why second.** Pure backend foundation. No UI surface, no behavior change
for users — but every later phase reads `resolveScoringLevel`, so this
must land first.

### Prompt

```text
Read first:
- docs/scoring-config.md § 5 (Configuration model)
- docs/scoring-config-implementation.md (Conventions + this Phase 2)
- supabase/schema.sql                  (current leagues + tournaments
                                        tables)
- src/services/leagueService.js
- src/services/tournamentService.js
- src/lib/utils.js                     (style reference for the new util)

Goal: add the `scoring_config JSONB` column to `leagues` and `tournaments`,
add service helpers to read/write it, and create the `resolveScoringLevel`
util. Default everywhere remains Level 4 — there is no UI to pick a level
yet (Phase 3 adds it).

Tasks:
1. Schema. Find how migrations are organized (check supabase/ for a
   migrations/ folder; if none, append a clearly headered block to
   supabase/schema.sql). Add:
     ALTER TABLE leagues     ADD COLUMN scoring_config JSONB;
     ALTER TABLE tournaments ADD COLUMN scoring_config JSONB;
   No DEFAULT — null means "inherit / use legacy default".
2. Create src/lib/scoring.js with:
     export function resolveScoringLevel(tournament, league) {
       const t = tournament?.scoring_config?.level;
       const l = league?.scoring_config?.level;
       const lvl = t ?? l ?? 4;
       return [1, 2, 3, 4].includes(lvl) ? lvl : 4;
     }
   Plus inline JSDoc with one example.
3. In src/services/leagueService.js add:
     export async function updateLeagueScoringConfig(leagueId, { level })
   In src/services/tournamentService.js add:
     export async function updateTournamentScoringConfig(tournamentId, { level })
   Both validate `level` is in [1,2,3,4] before writing; throw on bad
   input. Update existing read paths in those services so the SELECT
   includes the new column.
4. Add src/lib/__tests__/scoring.test.js covering:
     - tournament set & in range → returns tournament's level
     - tournament null, league set → returns league's level
     - both null → returns 4
     - invalid level (0, 5, "foo") falls back to 4
     - tournament set takes precedence over league
5. Lint, test, build.

Acceptance:
- Existing Phase 1 tests still pass UNTOUCHED.
- New scoring.test.js covers all five resolver branches above.
- `npm run lint && npm run test && npm run build` all clean.

Manual smoke:
- Run the app. Navigate to an existing league + tournament + match.
  Behavior is identical to before (resolver returns 4 by default).
- DevTools → Network: confirm league/tournament selects return the
  new `scoring_config` field as null.

Out of scope:
- ANY UI changes. The user-facing selector lands in Phase 3.
- Live-scoring gating. That lands in Phase 4.
- Stats screen branching. That lands in Phases 5–7.

Branch: claude/scoring-config-phase-2-schema-services
Commit prefix: feat:
```

### Acceptance summary

- New: `src/lib/scoring.js`, `src/lib/__tests__/scoring.test.js`, schema
  migration.
- Modified: `src/services/leagueService.js`,
  `src/services/tournamentService.js` (additive only — read paths gain
  `scoring_config`; new `update*ScoringConfig` exports).
- Lint, test, build green. Phase 1 golden tests untouched.

### Manual smoke

- [ ] App loads against migrated DB; existing leagues/tournaments
      unchanged in UI.
- [ ] Network panel shows `scoring_config: null` on league + tournament
      reads.

---

## Phase 3 — Setup UIs

**Why third.** With Phase 2 landed, admins can now pick a level. Phase 4
is what makes the choice *do* something for live scoring; Phases 5–7
make it do something for stats. Until those land, picking a non-L4 level
is harmless: the resolver returns it but every consumer still defaults
to L4 behavior.

### Prompt

```text
Read first:
- docs/scoring-config.md § 3 (the four levels) and § 5 (config model)
- docs/scoring-config-implementation.md (Conventions + this Phase 3)
- src/pages/LeagueDetail.jsx           (find the settings/admin area)
- src/pages/TournamentSetupWizard.jsx  (understand the existing wizard
                                        steps before adding/extending one)
- src/components/ui-new.jsx            (REUSE primitives — Select,
                                        Card, Label, Btn)

Goal: let admins pick a scoring level. League gets a default selector;
tournament setup wizard gets a "Scoring detail" choice that defaults to
"Inherit from league".

Tasks:
1. In src/pages/LeagueDetail.jsx, find the settings area (admin-only).
   Add a "Default scoring detail" Select with options:
     1 — Basic (team points only)
     2 — Intermediate (+ scoring player)
     3 — Advanced (+ point category)
     4 — Elite (+ errors w/ subtype + server) — default
   On change, call updateLeagueScoringConfig from leagueService.
   Show a one-line description per level (use the labels above).
2. In src/pages/TournamentSetupWizard.jsx, decide where this fits:
     - If the wizard has a "Settings" step, add a field there.
     - Otherwise add a new step labelled "Scoring detail" near the end.
   Options:
     Inherit from league (default) | 1 — Basic | 2 — Int | 3 — Adv | 4 — Elite
   "Inherit" persists as null. Other choices write { level: N } via
   updateTournamentScoringConfig.
3. If — and only if — the level Select is genuinely used in 2+ places,
   extract src/components/ScoringLevelSelect.jsx. Otherwise inline both.
   Do not pre-abstract.
4. Lint, test, build.

Acceptance:
- Phase 1 + Phase 2 tests untouched and still pass.
- `npm run lint && npm run test && npm run build` all clean.
- L4 user flow (existing leagues / tournaments without explicit config)
  is pixel-identical to before.

Manual smoke (mobile viewport, dark mode):
- [ ] League settings: change "Default scoring detail" to L2; reload;
      value persists.
- [ ] Tournament setup: pick L3; create tournament; DB row has
      scoring_config = { level: 3 }.
- [ ] Tournament setup: leave "Inherit from league"; create; DB row
      has scoring_config = null; resolver returns the league default.
- [ ] No regression in any other wizard step.

Out of scope:
- Live-scoring gating (Phase 4).
- Stats screen branching (Phases 5–7).
- Free-play wizard.
- Locking the level after a tournament has played matches — note this
  in the PR description as a follow-up.

Branch: claude/scoring-config-phase-3-setup-uis
Commit prefix: feat:
```

### Acceptance summary

- Modified: `src/pages/LeagueDetail.jsx`,
  `src/pages/TournamentSetupWizard.jsx`. Optionally new
  `src/components/ScoringLevelSelect.jsx` if used twice.
- Lint, test, build green. No new tests required (UI work, manual
  smoke only).

### Manual smoke

(Copy the checklist from the prompt above into the PR description.)

---

## Phase 4 — Live-scoring gating

**Why fourth.** This is the first phase that changes user-visible
behavior at non-L4 levels. With Phase 3 landed, admins can pick a level;
this phase makes the live scorer respect it.

### Prompt

```text
Read first:
- docs/scoring-config.md § 3, § 4 (levels + Skip-Player rule), § 8
- docs/scoring-config-implementation.md (Conventions + this Phase 4)
- src/hooks/useLiveGame.js
- src/hooks/liveGame/useLiveGameScoring.js
- src/hooks/liveGame/pointTypes.js
- src/components/LiveScoreboard.jsx
- src/components/PointButtons.jsx
- src/lib/scoring.js                   (resolveScoringLevel)

Goal: branch the live-scoring dialog stack on the resolved level so:
  L1 = tap → team point committed (no dialogs).
  L2 = type-skip; player picker only.
  L3 = point-type → player.
  L4 = point-type → player → error subtype on errors. (today)

The L4 path must stay pixel-identical and behavioral-identical.

Tasks:
1. In src/hooks/useLiveGame.js, fetch the resolved level once when the
   match loads (using the tournament + league already in scope) and
   pass it down through the live-game state object.
2. In src/hooks/liveGame/useLiveGameScoring.js, modify
   `resolvePoint` / the dialog-state machine to short-circuit based on
   level:
     - L1: addPoint(team) writes a log entry with no pointType,
       scoringPlayerId=null, no error fields.
     - L2: skip the type dialog. After picking the player, write a
       log entry with pointType=null, scoringPlayerId set.
     - L3: skip the error-subtype dialog only. On errors, write
       errorPlayerId but errorType=null.
     - L4: unchanged.
   The on-disk shape of `log[]` must remain a strict subset of today's
   shape — never invent new keys at lower levels.
3. In src/components/LiveScoreboard.jsx, hide the dialogs that don't
   apply at the current level. Remove the "Skip Player (Team Point)"
   button when level >= 2 (it's redundant — see § 4).
4. Make sure src/components/PointButtons.jsx remains agnostic of level.
5. Vitest: extend src/lib/__tests__/matchStats.test.js with one
   fixture per non-L4 level. Assert that level-1 lead/dynamics stats
   compute correctly from a points-only log; that L2 fixtures yield
   per-player MVP; that L3 fixtures yield byType breakdowns. Existing
   L4 golden snapshots stay UNTOUCHED.
6. Lint, test, build.

Acceptance:
- L4 golden tests still pass byte-for-byte.
- New L1/L2/L3 fixture tests pass.
- Lint, build clean.

Manual smoke (mobile viewport):
- [ ] L4 tournament: full flow indistinguishable from before.
- [ ] L3 tournament: tap → type → player. No error subtype dialog.
      Errors land with errorType=null in the log.
- [ ] L2 tournament: tap → player. No type dialog. No "Skip Player"
      button visible.
- [ ] L1 tournament: tap → point committed instantly. No dialogs.
- [ ] In each level: exit the match and re-enter — score and log
      reload correctly; sets/games persist.

Out of scope:
- Stats screen rendering (Phases 5–7). At this point post-match
  stats screen at L1/L2/L3 will look broken (sections will reference
  missing fields). That is fine and expected — it's fixed in Phase 5.
- Free-play live-match (FreePlayLiveMatch.jsx). Free play stays at
  L4 per § 9.

Branch: claude/scoring-config-phase-4-live-gating
Commit prefix: feat:
```

### Acceptance summary

- Modified: `src/hooks/useLiveGame.js`,
  `src/hooks/liveGame/useLiveGameScoring.js`,
  `src/components/LiveScoreboard.jsx`. New fixtures + tests added to
  `src/lib/__tests__/matchStats.test.js` (extending, not editing).
- L4 golden snapshots untouched.

### Manual smoke

(Copy the four-level checklist from the prompt.)

---

## Phase 5 — Post-match stats refactor (§ 6a)

### Prompt

```text
Read first:
- docs/scoring-config.md § 6 (impact matrix) and § 6a (post-match table)
- docs/scoring-config-implementation.md (Conventions + this Phase 5)
- src/components/GameStats.jsx
- src/lib/matchStats.js
- src/lib/scoring.js
- src/lib/__tests__/matchStats.test.js  (the golden tests — don't edit)

Goal: render the post-match stats screen per the § 6a level matrix.
Hide whole sections that require a higher level than the match was
played at. Do not show zeroed cards.

Tasks:
1. In src/lib/matchStats.js, annotate each calc function with its
   minLevel:
     calcLeadStats          // L1
     calcDynamics           // L1
     calcMVP                // L2
     calcPlayerContribution // L2
     calcPeakWindow         // L2
     calcClutchPoints       // L2
     calcServeStats         // L4
   Either a `MIN_LEVEL` exported map, or per-function `.minLevel = N`
   property. Pick whichever fits the existing style.
2. In src/components/GameStats.jsx:
     - Resolve the match's level once (using the resolver + tournament
       + league already in props/context).
     - For each section in the `statFor` map, gate render on
       level >= section.minLevel.
     - Sections referencing per-player byType: gate at L3.
     - Error subtype breakdown: gate at L4.
   Use existing ui-new primitives. No new styled elements.
3. Vitest: EXTEND src/lib/__tests__/matchStats.test.js with new
   fixtures for L1/L2/L3 and assert the `minLevel` annotations match
   what the design note specifies. The existing L4 snapshots remain
   untouched.
4. Lint, test, build.

Acceptance:
- L4 golden snapshots still pass.
- New per-level fixture tests pass.
- minLevel metadata is exported and asserted on.
- Lint, build clean.

Manual smoke:
- [ ] Open a finished L4 match. Screen IS PIXEL-IDENTICAL to before.
- [ ] Open a finished L3 match (pre-seed via DB if needed). Screen
      hides serve stats and error breakdown; everything else shown.
- [ ] Open a finished L2 match. Screen further hides per-player
      byType; player MVP and contributions remain.
- [ ] Open a finished L1 match. Screen reduces to score + flow chart
      + lead/ties/streaks. No player attribution shown.

Out of scope:
- Tournament stats screen (Phase 6).
- Lifetime stats (Phase 7).
- Adding a "Scoring level: N" badge to the match screen — only the
  tournament screen gets one (per § 6b).

Branch: claude/scoring-config-phase-5-post-match-stats
Commit prefix: refactor:
```

### Acceptance summary

- Modified: `src/components/GameStats.jsx`, `src/lib/matchStats.js`.
  Tests extended in `matchStats.test.js`.
- L4 golden snapshots byte-for-byte unchanged.

### Manual smoke

(Four-level finished-match walkthrough from the prompt.)

---

## Phase 6 — Tournament stats refactor (§ 6b)

### Prompt

```text
Read first:
- docs/scoring-config.md § 6 (impact matrix) and § 6b (tournament table)
- docs/scoring-config-implementation.md (Conventions + this Phase 6)
- src/components/TournamentStatsScreen.jsx
- src/lib/tournamentStats.js
- src/lib/scoring.js
- src/lib/__tests__/tournamentStats.test.js  (golden tests — don't edit)

Goal: render TournamentStatsScreen per the § 6b table. Add a small
"Scoring level: N" badge near the top so users understand why a
section is missing.

Tasks:
1. In src/lib/tournamentStats.js:
     - Annotate ranking functions with their minLevel (top scorers L2,
       awards-by-type L3, serve award L4).
     - `computePlayerTournamentBreakdown` learns to return a partial
       object when level < 4: { points, errors } at L2, plus byType at
       L3, plus serve fields at L4.
2. In src/components/TournamentStatsScreen.jsx:
     - Resolve the tournament's level once.
     - Add a "Scoring level: N" badge at the top (use ui-new <Badge>).
     - Gate sections per § 6b.
     - When a section's data is empty because of level, hide the
       whole section (don't render an empty card).
3. Vitest: EXTEND src/lib/__tests__/tournamentStats.test.js with one
   fixture per level. Existing L4 golden snapshots untouched.
4. Lint, test, build.

Acceptance:
- L4 golden snapshots untouched and green.
- New per-level fixture tests pass.
- Lint, build clean.

Manual smoke:
- [ ] Open a finished L4 tournament. Screen IS PIXEL-IDENTICAL to
      before, with the only addition being a small "Scoring level: 4"
      badge at the top.
- [ ] Open finished L3, L2, L1 tournaments — sections hide per § 6b.
- [ ] Standings + team totals render at every level.

Out of scope:
- Lifetime / Profile stats (Phase 7).
- Free-play stats screen (note as follow-up; § 8 calls this out).

Branch: claude/scoring-config-phase-6-tournament-stats
Commit prefix: refactor:
```

### Acceptance summary

- Modified: `src/components/TournamentStatsScreen.jsx`,
  `src/lib/tournamentStats.js`. Tests extended in `tournamentStats.test.js`.
- L4 snapshots untouched.

### Manual smoke

(Four-level finished-tournament walkthrough.)

---

## Phase 7 — Lifetime stats refactor (§ 7)

**Why last.** Highest blast radius. Touches every tile in the Profile
across every league a user has played in. The non-regression check is
strongest here: an L4-only player must see byte-identical output.

### Prompt

```text
Read first:
- docs/scoring-config.md § 7 (cross-league rule) and § 8 (UI captions)
- docs/scoring-config-implementation.md (Conventions + this Phase 7)
- src/hooks/usePlayerStats.js
- src/lib/playerStats.js
- src/pages/Profile.jsx
- src/lib/scoring.js
- src/lib/__tests__/playerStats.test.js  (golden tests — don't edit)

Goal: per-stat eligibility filtering for cross-league lifetime stats.
Each stat is computed only from the matches that captured the fields
it needs. Each tile shows a sample-size caption when not all of the
player's matches qualified.

Tasks:
1. In src/hooks/usePlayerStats.js, when building the annotated-match
   array, attach `level` to each match (resolved per match via parent
   tournament + league).
2. In src/lib/playerStats.js:
     - Tag each sub-computer (computeServingStats, computePressureStats,
       computeStrengths, computePlaystyle, computeWinStreak,
       computePerMatchAverages) with a `MIN_LEVEL`:
         W/L, win rate, win streak, tournaments won → L1
         points/match, errors/match, net points     → L2
         strengths, byType, top-shot                → L3
         serving, pressure, playstyle               → L4
     - Refactor each sub-computer to receive only matches that meet
       its MIN_LEVEL, and to return:
         { value, sampleSize, totalMatches, minLevel }
       instead of a bare value.
     - computeAllPlayerStats now returns a bundle of these objects.
3. In src/pages/Profile.jsx (and any tile components it uses), render
   a small caption under each tile when sampleSize < totalMatches:
     "based on {sampleSize} of {totalMatches} matches"
   Hide tiles where sampleSize < 3 (don't render with bad sample).
4. Vitest in src/lib/__tests__/playerStats.test.js:
     - The existing L4 golden test is REPLACED with an asserter that
       calls computeAllPlayerStats on the same L4 fixture and proves:
         (a) every result.value matches the original bare value, AND
         (b) every result.sampleSize equals totalMatches.
       Keep the original snapshot in a const at the top of the file
       for the diff. This is the single strongest non-regression
       check in the whole series.
     - Add new fixtures: a player with mixed L4 + L2 history. Assert
       that aceRate.sampleSize, serveWinPct.sampleSize, etc. equal
       only the L4 match count, while pointsPerMatch.sampleSize
       equals all matches.
5. Lint, test, build.

Acceptance:
- L4-only fixture: every stat's value matches the pre-refactor
  snapshot exactly. sampleSize == totalMatches everywhere.
- Mixed-level fixture: per-stat sampleSize matches the expected
  filter (L4-only stats see only L4 matches; L2+ stats see L4 + L2;
  L1+ stats see all).
- Lint, build clean.

Manual smoke:
- [ ] An L4-only player Profile renders pixel-identical to before.
      No sample-size captions visible (sampleSize == totalMatches
      everywhere).
- [ ] Create or use a player with at least one L2 match alongside
      L4 matches. Confirm: serving / strengths / playstyle tiles
      show "based on N of M matches" captions; W/L tile does not.
- [ ] Tiles with too-few-matches are hidden, not zeroed.

Out of scope:
- Free-play lifetime stats — note as follow-up.
- Surfacing the level scope in tooltips beyond the simple caption —
  follow-up.

Branch: claude/scoring-config-phase-7-lifetime-stats
Commit prefix: refactor:
```

### Acceptance summary

- Modified: `src/hooks/usePlayerStats.js`, `src/lib/playerStats.js`,
  `src/pages/Profile.jsx`. Test in `playerStats.test.js` is rewritten
  to assert the strongest non-regression invariant.
- L4-only output remains byte-identical.

### Manual smoke

(L4-only Profile + mixed-level Profile checks from the prompt.)

---

## Rollout & rollback

- **Order is recommended, not strictly required.** Phase 1 must ship
  first. Phase 2 must ship before any of 3–7. Within 3–7, any order
  works — each phase defaults to L4 behavior independently.
- **Rollback for Phases 5–7** is a `git revert` of the single PR; the
  golden tests guarantee L4 behavior wasn't disturbed elsewhere.
- **Rollback for Phase 2** schema:
    `ALTER TABLE leagues     DROP COLUMN scoring_config;`
    `ALTER TABLE tournaments DROP COLUMN scoring_config;`
  Safe pre-Phase-3 (nothing reads it yet). After Phase 3 ships, drop
  Phase 3 first.
- **Rollback for Phase 4** is `git revert`; data shape is a strict
  superset of older shapes, so no migration is needed.

## Open follow-ups (not part of this series)

- Locking the resolved level once a tournament has played matches.
- Free-play wizard level picker + free-play stats screen branching.
- Surfacing per-stat level scope in tooltips beyond the basic caption.
- Custom point categories / custom error subtypes (the JSONB shape is
  reserved for these — see `docs/scoring-config.md` § 5, § 10).
