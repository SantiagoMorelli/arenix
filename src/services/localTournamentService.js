/**
 * localTournamentService — device-only tournaments.
 *
 * Mirrors the operations of `tournamentService`, but every read and write goes
 * to IndexedDB instead of Supabase. Nothing here touches the network, requires
 * a session, or knows what a league is.
 *
 * A local tournament is deliberately **isolated**: it never syncs, never feeds
 * Elo, profiles, achievements or records, and never appears in a league. It
 * exists for the case it was built for — a beach with no signal, one phone,
 * one afternoon, played start to finish.
 *
 * The scoring, bracket and standings maths is not reimplemented here: the pure
 * engines in `lib/utils.js` and `lib/tournament.js` already run entirely in
 * memory, so this module is little more than storage plumbing around them.
 *
 * ── Shape ───────────────────────────────────────────────────────────────────
 * A record matches the output of `normalizeTournament()` in leagueService (so
 * every existing tournament component renders it unchanged), plus a `players`
 * array — local players live *inside* the tournament, not in a shared roster.
 *
 *   {
 *     id, schemaVersion, name, date, teamSize, setsPerMatch, scoringConfig,
 *     players:  [{ id, name, level, sex }],
 *     teams:    [{ id, name, players: [playerId], serveOrder: [] }],
 *     groups:   [{ id, name, teamIds: [], matches: [] }],
 *     knockout: { rounds: [] } | undefined,
 *     matches:  [],                      // round-robin with no group stage
 *     tieBreakerConfig, phase, status, winnerTeamId,
 *     createdAt, updatedAt,
 *   }
 */
import {
  getAllRecords,
  getRecord,
  putRecord,
  deleteRecord,
  requestPersistentStorage,
} from '../lib/localStore'
import { uid } from '../lib/utils'
import { saveMatchResult as applyMatchResult, advanceKnockout } from '../lib/utils'

/** Bumped whenever the stored shape changes in a way that needs migrating. */
export const LOCAL_SCHEMA_VERSION = 1

/** Prefix that marks an id as device-only, so it can never be mistaken for a
 *  Supabase UUID anywhere in the app. */
export const LOCAL_ID_PREFIX = 'local_'

export const isLocalTournamentId = id => String(id || '').startsWith(LOCAL_ID_PREFIX)

const DEFAULT_TIE_BREAKER = { tieBreakerMode: 'id', seedMap: {}, drawMap: {} }

// ── Reads ────────────────────────────────────────────────────────────────────

/** Every local tournament on this device, most recently touched first. */
export async function getLocalTournaments() {
  return getAllRecords()
}

/** One local tournament, or null when it is not on this device. */
export async function getLocalTournament(id) {
  return getRecord(id)
}

// ── Creation ─────────────────────────────────────────────────────────────────

/**
 * Create and persist a local tournament.
 *
 * Takes the same payload the setup wizard already builds in local state, plus
 * the ad-hoc `players` it collected — so the wizard needs no new concepts, only
 * a different commit target.
 *
 * @param {object} payload
 * @param {string} payload.name
 * @param {string} payload.date            ISO yyyy-mm-dd
 * @param {number} [payload.teamSize]
 * @param {number} [payload.setsPerMatch]
 * @param {number|null} [payload.scoringLevel]  1 | 2 | 3, null = default (3)
 * @param {object[]} [payload.players]     [{ id, name, level, sex }]
 * @param {object[]} [payload.teams]
 * @param {object[]} [payload.groups]      each with its own `matches`
 * @param {object[]} [payload.matches]     round-robin when there is no group stage
 * @returns {Promise<object>} the stored tournament
 */
export async function createLocalTournament({
  name,
  date,
  teamSize = 2,
  setsPerMatch = 1,
  scoringLevel = null,
  players = [],
  teams = [],
  groups = [],
  matches = [],
}) {
  // Best-effort: ask to be exempt from eviction before the first write.
  // A refusal is normal (Safari) and must not block creation.
  await requestPersistentStorage()

  const record = {
    id:            LOCAL_ID_PREFIX + uid(),
    schemaVersion: LOCAL_SCHEMA_VERSION,
    name:          String(name || '').trim() || 'Local tournament',
    date,
    teamSize,
    setsPerMatch,
    scoringConfig: scoringLevel !== null ? { level: scoringLevel } : null,

    players: players.map(p => ({
      id:    p.id,
      name:  p.name,
      level: p.level ?? null,
      sex:   p.sex ?? null,
      // Mirrors normalizePlayer's contract so shared components that read
      // displayName keep working without a league profile behind them.
      displayName: p.name,
    })),

    teams: teams.map(t => ({
      id:         t.id,
      name:       t.name,
      players:    t.players || [],
      serveOrder: t.serveOrder || [],
    })),

    groups: groups.map(g => ({
      id:      g.id,
      name:    g.name,
      teamIds: g.teamIds || [],
      matches: g.matches || [],
    })),

    knockout: undefined,
    matches,

    tieBreakerConfig: { ...DEFAULT_TIE_BREAKER },
    phase:            groups.length ? 'group' : 'freeplay',
    status:           'active',
    winnerTeamId:     null,

    createdAt: Date.now(),
  }

  return putRecord(record)
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Read-modify-write helper. Every mutation below funnels through here so the
 * "tournament is gone" case is handled in exactly one place.
 */
async function update(id, mutate) {
  const current = await getRecord(id)
  if (!current) throw new Error('This tournament is no longer on this device.')
  return putRecord(mutate(current))
}

/**
 * Record a played match: score, winner, point log and sets.
 *
 * Delegates to the pure in-memory engine in `lib/utils.js`, which also advances
 * the bracket and flips the tournament to completed when the final lands. That
 * engine reports the champion as `winner`; the UI reads `winnerTeamId`, so the
 * two are reconciled here.
 */
export async function saveLocalMatchResult(id, matchId, score1, score2, winnerTeamId, log = null, sets = null) {
  return update(id, current => {
    const next = applyMatchResult(current, matchId, score1, score2, winnerTeamId, log, sets)
    return {
      ...next,
      winnerTeamId: next.winner ?? next.winnerTeamId ?? null,
    }
  })
}

/** Attach a generated bracket and move the tournament into its knockout phase. */
export async function saveLocalKnockout(id, rounds) {
  return update(id, current => ({
    ...current,
    knockout: advanceKnockout({ rounds }, current.teams),
    phase:    'knockout',
  }))
}

/** Persist the tie-breaker choices shared across the tournament's tabs. */
export async function updateLocalTieBreakerConfig(id, config) {
  return update(id, current => ({
    ...current,
    tieBreakerConfig: config ?? { ...DEFAULT_TIE_BREAKER },
  }))
}

/** Rename one team. */
export async function renameLocalTeam(id, teamId, newName) {
  return update(id, current => ({
    ...current,
    teams: current.teams.map(t =>
      t.id === teamId ? { ...t, name: newName } : t
    ),
  }))
}

/** Remember a team's serving order between matches. */
export async function saveLocalTeamServeOrder(id, teamId, serveOrder) {
  return update(id, current => ({
    ...current,
    teams: current.teams.map(t =>
      t.id === teamId ? { ...t, serveOrder } : t
    ),
  }))
}

/** Mark the tournament finished without a knockout final (round-robin close). */
export async function completeLocalTournament(id, winnerTeamId = null) {
  return update(id, current => ({
    ...current,
    phase:  'completed',
    status: 'completed',
    winnerTeamId: winnerTeamId ?? current.winnerTeamId ?? null,
  }))
}

/** Permanently delete a local tournament from this device. */
export async function deleteLocalTournament(id) {
  return deleteRecord(id)
}

// ── Backup ───────────────────────────────────────────────────────────────────

/**
 * Serialize a tournament for export.
 *
 * This is the only copy that survives a new phone, cleared site data or an
 * uninstalled PWA, so it is part of the feature rather than a nice-to-have.
 *
 * @returns {Promise<{ filename: string, json: string }>}
 */
export async function exportLocalTournament(id) {
  const record = await getRecord(id)
  if (!record) throw new Error('This tournament is no longer on this device.')

  const slug = String(record.name || 'tournament')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'tournament'

  return {
    filename: `arenix-${slug}-${record.date || 'local'}.json`,
    json: JSON.stringify({ kind: 'arenix.localTournament', version: LOCAL_SCHEMA_VERSION, tournament: record }, null, 2),
  }
}
