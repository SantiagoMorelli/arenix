/**
 * leagueService — all Supabase calls for leagues.
 *
 * Returns data normalized to match the legacy localStorage shape so that
 * existing components work without modification.
 */
import { supabase } from '../lib/supabase'

// ── Normalizers ──────────────────────────────────────────────────────────────

function normalizeLeague(row) {
  return {
    id:          row.id,
    name:        row.name,
    season:      row.season,
    inviteCode:  row.invite_code,
    ownerId:     row.owner_id,
    createdAt:   row.created_at,
    // filled in by getLeagueById with sub-queries:
    players:     row.players     || [],
    tournaments: row.tournaments || [],
    members:     row.members     || [],
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch all leagues the current user is a member of.
 * Returns an array of normalized league objects (shallow — no nested data).
 * Multiple role rows per league are collapsed into a single entry.
 */
export async function getMyLeagues() {
  const { data, error } = await supabase
    .from('league_member_roles')
    .select('league_id, role, granted_at, leagues(*)')
    .order('granted_at', { ascending: true })

  if (error) throw error

  // Collapse multiple role rows per league into one entry
  const leagueMap = new Map()
  for (const row of data || []) {
    if (!leagueMap.has(row.league_id)) {
      leagueMap.set(row.league_id, {
        ...normalizeLeague(row.leagues),
        myRole:  row.role,
        myRoles: [row.role],
      })
    } else {
      leagueMap.get(row.league_id).myRoles.push(row.role)
    }
  }
  return [...leagueMap.values()]
}

/**
 * Fetch a single league with full nested data:
 * players, tournaments (with teams + groups + knockout + matches).
 */
export async function getLeagueById(leagueId) {
  const [leagueRes, membersRes, playersRes, tournamentsRes, permissionsRes] = await Promise.all([
    supabase.from('leagues').select('*').eq('id', leagueId).single(),
    supabase.from('league_member_roles').select('user_id, role, granted_at, profiles(full_name, avatar_url)').eq('league_id', leagueId),
    supabase.from('players').select('*, profiles!players_user_id_fkey(nickname, full_name, country, avatar_url, gender)').eq('league_id', leagueId).order('created_at', { ascending: true }),
    supabase.from('tournaments').select('*').eq('league_id', leagueId).order('created_at', { ascending: true }),
    supabase.from('league_member_permissions').select('user_id, permission').eq('league_id', leagueId),
  ])

  if (leagueRes.error) throw leagueRes.error

  const players = (playersRes.data || []).map(normalizePlayer)

  const tournaments = await Promise.all(
    (tournamentsRes.data || []).map(t => normalizeTournament(t))
  )

  // Collapse multiple role rows per member into one entry with roles array
  const memberMap = new Map()
  for (const m of membersRes.data || []) {
    if (!memberMap.has(m.user_id)) {
      memberMap.set(m.user_id, {
        userId:      m.user_id,
        role:        m.role,
        roles:       [m.role],
        joinedAt:    m.granted_at,
        fullName:    m.profiles?.full_name || '',
        avatarUrl:   m.profiles?.avatar_url || null,
        permissions: new Set(),
      })
    } else {
      memberMap.get(m.user_id).roles.push(m.role)
    }
  }
  for (const p of permissionsRes.data || []) {
    memberMap.get(p.user_id)?.permissions.add(p.permission)
  }
  const members = [...memberMap.values()]

  return {
    ...normalizeLeague(leagueRes.data),
    players,
    tournaments,
    members,
  }
}

/**
 * Create a new league. Automatically adds the creator as 'admin' member.
 */
export async function createLeague({ name, season = '2026' }) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: league, error } = await supabase
    .from('leagues')
    .insert({ name, season, owner_id: user.id })
    .select()
    .single()

  if (error) throw error

  // Add creator as admin with full permissions
  await Promise.all([
    supabase.from('league_member_roles').insert({
      league_id: league.id,
      user_id:   user.id,
      role:      'admin',
    }),
    supabase.from('league_member_permissions').insert(
      ['manage_league', 'create_tournament', 'invite_players', 'score_match', 'edit_profile']
        .map(permission => ({ league_id: league.id, user_id: user.id, permission }))
    ),
  ])

  return normalizeLeague(league)
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function normalizePlayer(row) {
  const linked = row.profiles
  return {
    id:          row.id,
    name:        row.name,
    fullName:    linked?.full_name ?? row.name,
    nickname:    linked?.nickname  ?? null,
    displayName: (linked?.nickname || linked?.full_name) || row.name,
    country:     linked?.country ?? row.country ?? null,
    avatarUrl:   linked?.avatar_url ?? null,
    sex:         row.sex ?? null,
    gender:      linked?.gender   ?? null,
    level:       row.level,
    wins:        row.wins,
    losses:      row.losses,
    points:      row.points,
    userId:      row.user_id,
    leagueId:    row.league_id,
  }
}

/**
 * Build a tournament object that matches the legacy localStorage shape:
 * { id, name, date, teamSize, setsPerMatch, phase, status, teams, groups, knockout, matches }
 */
async function normalizeTournament(row) {
  const tid = row.id

  const [teamsRes, groupsRes, koRoundsRes, matchesRes] = await Promise.all([
    supabase.from('teams').select('*, team_players(player_id)').eq('tournament_id', tid),
    supabase.from('groups').select('*, group_teams(team_id)').eq('tournament_id', tid).order('sort_order'),
    supabase.from('knockout_rounds').select('*').eq('tournament_id', tid).order('sort_order'),
    supabase.from('matches').select('*').eq('tournament_id', tid).order('created_at'),
  ])

  // Build teams (with player id arrays matching the legacy shape)
  const teams = (teamsRes.data || []).map(t => ({
    id:      t.id,
    name:    t.name,
    wins:    t.wins,
    losses:  t.losses,
    points:  t.points,
    players: (t.team_players || []).map(tp => tp.player_id),
  }))

  const allMatches = matchesRes.data || []

  // Build groups
  const groups = (groupsRes.data || []).map(g => ({
    id:      g.id,
    name:    g.name,
    teamIds: (g.group_teams || []).map(gt => gt.team_id),
    matches: allMatches
      .filter(m => m.group_id === g.id)
      .map(normalizeMatch),
  }))

  // Build knockout
  const rounds = (koRoundsRes.data || []).map(r => ({
    id:      r.round_key,
    name:    r.name,
    matches: allMatches
      .filter(m => m.knockout_round_id === r.id)
      .map(normalizeMatch),
  }))
  const knockout = rounds.length ? { rounds } : undefined

  // Free-play matches (source_type === 'freeplay', no group/round)
  const fpMatches = allMatches
    .filter(m => m.source_type === 'freeplay')
    .map(normalizeMatch)

  return {
    id:            row.id,
    name:          row.name,
    date:          row.date,
    teamSize:      row.team_size,
    setsPerMatch:  row.sets_per_match,
    phase:         row.phase,
    status:        row.status,
    winnerTeamId:  row.winner_team_id,
    teams,
    groups,
    knockout,
    matches:       fpMatches,
    // Supabase row id of each knockout round (needed for saving match results)
    _knockoutRoundDbIds: Object.fromEntries(
      (koRoundsRes.data || []).map(r => [r.round_key, r.id])
    ),
    _groupDbIds: Object.fromEntries(
      (groupsRes.data || []).map(g => [g.id, g.id])
    ),
  }
}

function normalizeMatch(m) {
  return {
    id:      m.id,
    team1:   m.team1_id,
    team2:   m.team2_id,
    score1:  m.score1,
    score2:  m.score2,
    winner:  m.winner_id,
    played:  m.played,
    log:     m.log,
    sets:    m.sets,
  }
}

/**
 * Delete a league and all its nested data (cascades via FK constraints).
 * Only league admins or superAdmins should call this.
 */

/**
 * Leave a league as a member. 
 * This unlinks the user from their player profile, removes their role, and removes their permissions.
 * The player profile remains in the league to preserve match history.
 */
export async function leaveLeague(leagueId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 1. Unlink the user from any player profile in this league
  await supabase
    .from('players')
    .update({ user_id: null })
    .eq('league_id', leagueId)
    .eq('user_id', user.id)

  // 2. Remove all permissions for this user in this league
  await supabase
    .from('league_member_permissions')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', user.id)

  // 3. Remove all roles for this user in this league
  const { error } = await supabase
    .from('league_member_roles')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function deleteLeague(leagueId) {
  const { error } = await supabase
    .from('leagues')
    .delete()
    .eq('id', leagueId)
  if (error) throw error
}
