# Row Level Security — Arenix Reference

> **Purpose:** This document captures the *effective* RLS state after all migration files in
> `supabase/` have been applied, explains the authorization model, cross-references which
> service calls rely on which policies, and flags known loose spots.
>
> **Source of truth for the actual SQL:** `supabase/schema.sql` + migration files (see
> [Section 6](#6-migration-file-index) for the ordered list).
>
> **How to verify against a live DB:** see [Section 7](#7-verification-query).

---

## 1. Overview & Threat Model

All Supabase client calls in the codebase use the **anon / authenticated key** — there is no
server-side middleware that enforces authorization before the query reaches Postgres. This means:

- **RLS is the sole hard authorization layer.** Services (`leagueService`, `tournamentService`,
  `inviteService`, `freePlayService`, `playerService`, `profileService`, `notificationService`)
  perform **no client-side role checks** before calling `.insert()`, `.update()`, or `.delete()`.
  They rely entirely on Postgres rejecting or silently filtering rows that violate policy.
- A misconfigured policy (or a missing `DROP POLICY` during a migration) silently grants or
  denies access with no app-level error visible in the codebase.
- UI-level guards (e.g. hiding a "Delete league" button from non-admins) are **UX only** and
  provide no security guarantee.

### Roles & Permissions

Roles and permissions are separate concepts stored in separate tables:

| Concept | Table | Values |
|---|---|---|
| Role | `league_member_roles` | `admin`, `player`, `viewer` |
| Permission | `league_member_permissions` | `manage_league`, `create_tournament`, `invite_players`, `score_match`, `edit_profile` |

Roles and permissions are per-league, per-user. A user can hold multiple roles in the same league
(the UI collapses them). `score_match` is **not** granted to `player` by default — it must be
granted explicitly.

Default permissions granted per role (defined in `inviteService.js`):

| Role | Default permissions |
|---|---|
| `admin` | `manage_league`, `create_tournament`, `invite_players`, `score_match`, `edit_profile` |
| `player` | `edit_profile` |
| `viewer` | `edit_profile` |

### Platform Superadmin

`profiles.is_super_admin = TRUE` grants a bypass on every league-scoped helper function
(`my_league_is_member`, `my_league_has_role`, `my_league_has_permission`). Superadmins can read
and mutate any league's data regardless of membership.

---

## 2. Helper Functions

All helpers are `SECURITY DEFINER` (bypass RLS on the tables they query) and are defined in
`schema.sql` except `my_free_play_is_visible` which is in `add_free_play_visibility.sql`.
The legacy `my_league_role` helper is defined in `schema.sql` and kept for backward compatibility.

| Function | Returns | Contract |
|---|---|---|
| `is_super_admin()` | `BOOLEAN` | `TRUE` if `auth.uid()` has `profiles.is_super_admin = TRUE`. |
| `my_league_is_member(league UUID)` | `BOOLEAN` | `TRUE` if `auth.uid()` has any row in `league_member_roles` for this league, **or** is a superadmin. |
| `my_league_has_role(league UUID, check_role TEXT)` | `BOOLEAN` | `TRUE` if `auth.uid()` holds `check_role` in `league_member_roles` for this league, **or** is a superadmin. |
| `my_league_has_permission(league UUID, perm TEXT)` | `BOOLEAN` | `TRUE` if `auth.uid()` holds `perm` in `league_member_permissions` for this league, **or** is a superadmin. |
| `is_team_member(p_team_id UUID)` | `BOOLEAN` | `TRUE` if `auth.uid()` is linked (via `players.user_id`) to any player in `team_players` for the given team. Used to allow team rename without an admin role. |
| `my_free_play_is_visible(fp_id UUID)` | `BOOLEAN` | `TRUE` if `auth.uid()` created the session (`free_plays.created_by`), **or** is a league-linked player added to it (`free_play_players → players.user_id`), **or** is a superadmin. Legacy rows (`created_by IS NULL`) return `FALSE` for all non-superadmin users — they are hidden from lists but remain reachable by direct URL or invite code. |
| `my_league_role(league UUID)` *(legacy)* | `TEXT` | Returns the first `role` from the old `league_members` table for `auth.uid()`. Kept for backward compatibility; not used by current services. |

---

## 3. Effective Policy Matrix

This table reflects the **current effective state** after all migrations. Where a later migration
replaced an earlier policy, only the final policy is shown. See [Section 6](#6-migration-file-index)
for the supersession log.

`—` means no policy exists for that operation (Postgres denies by default when RLS is enabled).

> **Role column legend:** `anon` = unauthenticated Supabase anon key; `authed` = any authenticated
> user; `self` = authenticated user whose `id` = the row's owner column; `admin` = `my_league_has_role('admin')`;
> `member` = `my_league_is_member`; `perm(X)` = `my_league_has_permission(X)`;
> `team-member` = `is_team_member(team_id)`; `creator` = `free_plays.created_by = auth.uid()`.

### Core league tables

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | `anon` (public-league members only via `players` join); `authed` (all rows — `USING (TRUE)`) | — | `self`; `is_super_admin()` (any row) | — |
| `leagues` | `anon` (visibility = 'public'); `authed` (all rows — `USING (TRUE)`, see §4) | `authed` where `owner_id = auth.uid()` | `admin` | `admin` |
| `league_members` *(legacy)* | `self` or `member` | `self` | — | `admin` (via FOR ALL) |
| `league_member_roles` | `member` | `self` (join flow); `admin` (FOR ALL) | `admin` (FOR ALL) | `self`; `admin` (FOR ALL) |
| `league_member_permissions` | `member` | `self` (join flow); `admin` (FOR ALL) | `admin` (FOR ALL) | `self`; `admin` (FOR ALL) |

### Player / tournament tables

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `players` | `anon` (public-league); `member` | `admin` | `admin`; `self` (unlink only — `user_id = auth.uid()`) | `admin` |
| `tournaments` | `anon` (public-league); `member` | `admin` | `admin` | `admin` |
| `teams` | `anon` (public-league); `member` (via tournament → league) | `admin` (via FOR ALL) | `admin` (via FOR ALL); `team-member` (rename only) | `admin` (via FOR ALL) |
| `team_players` | `anon` (public-league); `member` (via team → tournament → league) | `admin` (via FOR ALL) | — | `admin` (via FOR ALL) |
| `groups` | `anon` (public-league); `member` (via tournament → league) | `admin` (via FOR ALL) | `admin` (via FOR ALL) | `admin` (via FOR ALL) |
| `group_teams` | `anon` (public-league); `member` (via group → tournament → league) | `admin` (via FOR ALL) | — | `admin` (via FOR ALL) |
| `knockout_rounds` | `anon` (public-league); `member` (via tournament → league) | `admin` (via FOR ALL) | `admin` (via FOR ALL) | `admin` (via FOR ALL) |
| `matches` | `anon` (public-league); `member` (via tournament → league) | `admin` (via tournament → league) | `perm(score_match)` (via tournament → league) | `admin` (via tournament → league) |

### Free play tables

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `free_plays` | `anon` (all rows — `USING (TRUE)`); `authed` via `my_free_play_is_visible`; `authed` where `invite_code IS NOT NULL` | `authed` where `created_by = auth.uid()` or `created_by IS NULL` | `creator` or legacy (`created_by IS NULL`, any authed) | `creator` or legacy |
| `free_play_players` | `anon` (all — `USING (TRUE)`); `authed` (all — `USING (TRUE)`) | `authed` where parent `free_plays.created_by = auth.uid()` or IS NULL | — | `authed` where parent `created_by = auth.uid()` or IS NULL |
| `free_play_teams` | `anon` (all); `authed` (all) | `creator` or legacy | `creator` or legacy | `creator` or legacy |
| `free_play_team_players` | `anon` (all); `authed` (all) | `authed` | — | — |
| `free_play_games` | `anon` (all); `authed` (all) | `creator` or legacy | `creator` or legacy | `creator` or legacy |

### Other tables

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `notifications` | `self` (`user_id = auth.uid()`) | `self`; **any `authed` user** (see §4) | `self` | — |

---

## 4. Known Looseness

These are not bugs if the current behaviour is intentional, but they represent places where the
policy is broader than the name or intent implies, and a reviewer cannot tell from the codebase
alone whether the live DB matches the expected contract.

### 4a. `notifications` — any authenticated user can INSERT for any recipient

**Policy:** `notifs: insert for others` in `add_notifications.sql`:
```sql
CREATE POLICY "notifs: insert for others" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```
**Intent (per comment):** Admin-driven bulk notifications go through
`createNotificationsForLeagueMembers` which inserts rows for other users. Allowing any authed
user to INSERT for anyone was the simplest way to support this without a service-role key.

**Risk:** Any authenticated user can spam notifications to any other user's inbox. There is no
check that the inserting user has a legitimate relationship to the recipient. The app never does
this maliciously, but it is a real vector if the client key leaks.

**Would need to fix:** Replace the blanket policy with an RPC (`SECURITY DEFINER`) that validates
league membership before bulk-inserting, and restrict direct `INSERT` to `self` only.

### 4b. `profiles` — all columns readable by any authenticated user

**Policy:** `profiles: any member can view` in `schema.sql`:
```sql
CREATE POLICY "profiles: any member can view" ON public.profiles
  FOR SELECT USING (TRUE);
```
This exposes `is_super_admin`, `can_create_league`, and `notification_prefs` to every
authenticated user. Column-level restriction is enforced only in application queries (e.g.
`guest_read_access.sql` line 140 notes this explicitly). Postgres RLS does not restrict
individual columns.

**Risk:** Low — these are not secret credentials — but `is_super_admin` leaking to other users
could facilitate targeted attacks on superadmin accounts.

### 4c. `leagues` — `USING (TRUE)` for authenticated SELECT is misnamed

**Policy:** `leagues: any auth user can view by invite code` in `schema.sql`:
```sql
CREATE POLICY "leagues: any auth user can view by invite code" ON public.leagues
  FOR SELECT USING (TRUE);
```
The policy name implies it is scoped to invite-code lookups, but `USING (TRUE)` grants
unrestricted SELECT on all league rows to any authenticated user. Every authenticated user can
enumerate all leagues, including private ones.

**Intent:** The invite-code JOIN flow requires an open SELECT to resolve the code. However
visibility filtering for the "my leagues" list is done client-side (`getMyLeagues` queries
`league_member_roles`), so private leagues without membership are visible via direct query even
if not shown in the UI.

**Would need to fix:** Change to `USING (visibility = 'public' OR my_league_is_member(id))` and
ensure the invite-code lookup is handled through a `SECURITY DEFINER` RPC that does not require
the broader policy.

### 4d. Free play legacy rows (`created_by IS NULL`) editable by any authenticated user

Rows created before `add_free_play_permissions.sql` was applied have `created_by IS NULL`.
The UPDATE and DELETE policies for `free_plays`, `free_play_players`, `free_play_teams`, and
`free_play_games` all accept `created_by IS NULL` as sufficient:
```sql
USING (auth.uid() IS NOT NULL AND (created_by = auth.uid() OR created_by IS NULL))
```
Any authenticated user can overwrite or delete legacy free play data. Documented as intentional
in the migration comment, but the window is wider than "the original owner."

### 4e. `free_play_team_players` — INSERT open to any authenticated user

`schema.sql` sets `INSERT WITH CHECK (auth.uid() IS NOT NULL)` on `free_play_team_players`.
Unlike `free_play_teams` and `free_play_games` (which were tightened by `add_free_play_permissions.sql`),
`free_play_team_players` was never re-restricted. Any authed user can add a player to any team in
any free play session.

### 4f. Anon guest-read policies depend on `leagues.visibility`

`guest_read_access.sql` grants `anon` SELECT on players, tournaments, teams, matches, etc. via
multi-table JOINs back to `leagues.visibility = 'public'`. If the `leagues.visibility` column
is backfilled incorrectly for existing rows, or if the check constraint is bypassed (e.g., via
direct SQL), private-league data could become readable by unauthenticated visitors.

---

## 5. Service ↔ Policy Summary

Services are trusted UX: they assume the correct role exists in the session before calling
mutating operations. RLS silently blocks or (more commonly) returns a Postgres error that
surfaces as a thrown exception in the service. No client-side pre-flight role check is performed.

### `leagueService`

Reads: `leagues`, `league_member_roles`, `league_member_permissions`, `players`, `tournaments`,
`teams`, `team_players`, `groups`, `group_teams`, `knockout_rounds`, `matches`.

Mutations:
- `createLeague` — inserts into `leagues` (policy: `owner_id = auth.uid()`), then inserts
  the creator's row in `league_member_roles` and `league_member_permissions` (policy: `self`).
- `updateLeague` — updates `leagues` (policy: `admin`).
- `deleteLeague` — deletes `leagues` (policy: `admin`; cascades to all child tables).
- `leaveLeague` — updates `players` to null `user_id` (policy: `self` unlink), deletes from
  `league_member_permissions` and `league_member_roles` (policy: `self`-delete).

### `inviteService`

Reads: `leagues`, `league_member_roles`, `league_member_permissions`, `profiles`.

Mutations:
- `joinLeague` — inserts into `league_member_roles` and `league_member_permissions` with
  `user_id = auth.uid()` (policy: `self`). Notifies admins via `notificationService`.
- `regenerateInviteCode` — updates `leagues.invite_code` (policy: `admin`).
- `addMemberRole` / `changeMemberRole` — upserts into `league_member_roles` and
  `league_member_permissions` for an arbitrary `userId` (policy: `admin`).
- `removeMemberRole` — deletes from `league_member_roles` (policy: `self` or `admin`).
- `grantMemberPermission` / `revokeMemberPermission` — upserts / deletes from
  `league_member_permissions` (policy: `admin`).

### `tournamentService`

Reads: `teams`, `team_players`, `players`, `matches`, `tournaments`.

Mutations (all guarded by the `admin` policy family or `perm(score_match)` for match updates):
- Team / group / knockout setup: inserts into `teams`, `team_players`, `groups`, `group_teams`,
  `knockout_rounds`, `matches` (all: `admin` via tournament → league).
- Score a match: updates `matches`, `teams`, `players` stats (policy: `perm(score_match)` for
  `matches`; `admin` for `teams` and `players`). The stats update on `teams` and `players` runs
  even when the caller is a non-admin scorer — it succeeds only if the scorer also holds `admin`,
  which is the common case. A user with `score_match` but not `admin` will have their `matches`
  update succeed but the `teams` / `players` stat updates silently blocked.
- Advance phase / finalize tournament: updates `tournaments` and `matches` (policy: `admin`).

### `playerService`

Mutations:
- `addPlayer` — inserts into `players` (policy: `admin`).
- `updatePlayer` — updates `players` (policy: `admin` or `self` for `user_id` unlink).
- `deletePlayer` — deletes from `players` (policy: `admin`).

### `freePlayService`

The service has its own client-side `canEditFreePlay` helper (checks `created_by`) that mirrors
the RLS condition — this is the one place where a service performs a pre-flight check, though it
is applied only in UI guards, not before every mutating call.

Reads: `free_plays`, `free_play_players`, `free_play_teams`, `free_play_games`, `players`.

Mutations (all guarded by the `creator or legacy` policy family):
- `createFreePlay` — inserts into `free_plays` with `created_by = auth.uid()`.
- `updateFreePlay` / `finishFreePlay` / `deleteFreePlay` — update/delete `free_plays`.
- `addFreePlayPlayer` / `removeFreePlayPlayer` — insert / delete `free_play_players`.
- `createFreePlayTeam` / `updateFreePlayTeam` / `deleteFreePlayTeam` — `free_play_teams`.
- `createFreePlayGame` / `deleteUnplayedGame` / `saveFreePlayGame` — `free_play_games`.
- `notifyPlayersAddedToFreePlay` — inserts `notifications` for other users (relies on the broad
  `notifs: insert for others` policy, see §4a).

### `profileService`

Mutations:
- `updateProfilePermission` — updates arbitrary `profiles` columns (e.g. `can_create_league`).
  Policy: `is_super_admin()` (only superadmins can update other users' profiles). The caller
  must already be a superadmin or the update will be silently rejected.
- `deleteOwnAccount` — calls `delete_own_account()` RPC (`SECURITY DEFINER`; deletes
  `auth.users` row which cascades to `profiles` and all FK-linked data).
- `uploadAvatar` — Supabase Storage (not subject to table RLS).

### `notificationService`

Reads: `notifications` filtered to `user_id = auth.uid()` (policy: `self`).

Mutations:
- `markRead` / `markAllRead` — updates `notifications` (policy: `self` via `user_id = auth.uid()`).
- `createNotification` — inserts for an **arbitrary** `userId` (relies on `notifs: insert for others`,
  see §4a). Called by `inviteService` and `freePlayService` to notify other users.
- `createNotificationsForLeagueMembers` — bulk-inserts for all league members (same policy).

---

## 6. Migration File Index

Files must be applied in this order against a fresh DB. Each file is idempotent (`IF NOT EXISTS`,
`DROP POLICY IF EXISTS`, `CREATE OR REPLACE FUNCTION`).

| # | File | What it does | Supersedes |
|---|---|---|---|
| 1 | `schema.sql` | Full schema, RLS enable, all helper functions, all base policies for every table. | — |
| 2 | `add_league_location_visibility.sql` | Adds `leagues.location` and `leagues.visibility` columns. | — |
| 3 | `add_player_sex.sql` | Adds `players.sex` column. | — |
| 4 | `add_profile_fields.sql` | Adds `profiles.nickname`, `profiles.gender`, `profiles.country`. | — |
| 5 | `add_notifications.sql` | Creates `notifications` table + RLS policies (`select own`, `insert own`, `insert for others`, `update own`). | — |
| 6 | `add_notification_prefs.sql` | Adds `profiles.notification_prefs` JSONB column. | — |
| 7 | `add_scorer_to_matches.sql` | Adds `matches.scorer_user_id` and `matches.scorer_started_at` columns. | — |
| 8 | `add_can_create_league.sql` | Adds `profiles.can_create_league` column; adds `profiles: superadmin can update` policy. | — |
| 9 | `add_team_rename_policy.sql` | Re-creates `is_team_member()` as `SECURITY DEFINER` (fixes RLS recursion); re-creates `teams: team member can rename` policy. | `schema.sql` definition of `is_team_member()` and the same-named policy. |
| 10 | `add_free_play_feature.sql` | Adds `free_plays.status`, `free_plays.invite_code`; creates `free_play_players` table + RLS; adds UPDATE/DELETE policies for `free_play_teams`; replaces `free_plays: members can view` with `free_plays: anyone can view` (`USING (TRUE)`). | `schema.sql`: `free_plays: members can view`. |
| 11 | `add_free_play_teams_created_at.sql` | Adds `free_play_teams.created_at` column and index. | — |
| 12 | `add_free_play_permissions.sql` | Adds `free_plays.created_by`; replaces the open `free_plays` SELECT/INSERT/UPDATE/DELETE policies with creator-or-legacy-gated ones; tightens write policies on `free_play_players`, `free_play_teams`, `free_play_games`. | `add_free_play_feature.sql`: `free_plays: anyone can view`, `free_plays: auth user can insert/update/delete`, plus the `fpt: update/delete authed` policies. |
| 13 | `add_free_play_visibility.sql` | Creates `my_free_play_is_visible()` helper; drops the open `free_plays: public can view` authenticated SELECT policy and replaces it with `free_plays: creator or player can view`; adds `free_plays: authed can view by invite_code`. | `add_free_play_permissions.sql`: `free_plays: public can view`. |
| 14 | `guest_read_access.sql` | Adds `anon`-role SELECT policies for public leagues across all tournament/match/player tables; adds `anon` SELECT on `profiles` (scoped to public-league members); adds `anon` SELECT (`USING (TRUE)`) on all free play tables; adds defensive `free_play_players: anon can view` via dynamic SQL. | `schema.sql`: no prior anon policies. |
| — | `delete_all_free_plays.sql` | **One-time data cleanup** — `DELETE FROM public.free_plays`. **Not idempotent after first run.** Do not apply to production unless intentionally wiping all free play data. | — |

---

## 7. Verification Query

Run this in the Supabase SQL Editor (Dashboard → SQL Editor) to list every active policy on the
`public` schema, sorted by table then command:

```sql
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual        AS using_expr,
  with_check  AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
```

To compare the live state against the matrix in [Section 3](#3-effective-policy-matrix), check
that for each table:

1. The expected `cmd` values (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) each have exactly the
   policies listed (no extras, no missing).
2. `roles` matches `{public}` (all roles), `{anon}`, or `{authenticated}` as expected.
3. `qual` / `with_check_expr` matches the helper-function calls documented above.

Any policy present in the live DB but not in this document (or vice versa) indicates either an
un-committed migration or a manual change applied directly to the DB.
