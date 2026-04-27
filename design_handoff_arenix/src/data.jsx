// Seeded realistic volleyball data
const PLAYERS = [
  { id: 'p1', name: 'Carlos Mendez',  short: 'Carlos M.', initials: 'CM', elo: 1628, hue: 28 },
  { id: 'p2', name: 'Ana Portela',    short: 'Ana P.',    initials: 'AP', elo: 1594, hue: 340 },
  { id: 'p3', name: 'Santi Alvarez',  short: 'Santi A.',  initials: 'SA', elo: 1572, hue: 200 },
  { id: 'p4', name: 'Diego Ramirez',  short: 'Diego R.',  initials: 'DR', elo: 1554, hue: 150 },
  { id: 'p5', name: 'Luis Karam',     short: 'Luis K.',   initials: 'LK', elo: 1510, hue: 48 },
  { id: 'p6', name: 'Maria Silva',    short: 'Maria S.',  initials: 'MS', elo: 1492, hue: 292 },
  { id: 'p7', name: 'Pedro Lombardi', short: 'Pedro L.',  initials: 'PL', elo: 1470, hue: 12 },
  { id: 'p8', name: 'Sofia Vitale',   short: 'Sofia V.',  initials: 'SV', elo: 1448, hue: 316 },
  { id: 'p9', name: 'Marco Torres',   short: 'Marco T.',  initials: 'MT', elo: 1420, hue: 88 },
  { id: 'p10', name: 'Julia Rocha',   short: 'Julia R.',  initials: 'JR', elo: 1396, hue: 250 },
  { id: 'p11', name: 'Alex Wen',      short: 'Alex W.',   initials: 'AW', elo: 1372, hue: 170 },
  { id: 'p12', name: 'Bruno Ibarra',  short: 'Bruno I.',  initials: 'BI', elo: 1340, hue: 60 },
];

const TEAMS = [
  { id: 't1', name: 'Alpha',   players: ['p1','p2'], w: 3, l: 0 },
  { id: 't2', name: 'Bravo',   players: ['p3','p4'], w: 2, l: 1 },
  { id: 't3', name: 'Charlie', players: ['p5','p6'], w: 1, l: 2 },
  { id: 't4', name: 'Delta',   players: ['p7','p8'], w: 0, l: 3 },
];

const LEAGUE = {
  id: 'l1',
  name: 'Miami Beach League',
  season: 'Season 2026',
  location: 'South Pointe · Miami, FL',
  playerCount: 24,
  tournaments: 3,
  matchesPlayed: 48,
  myRank: 3,
};

const TOURNAMENT = {
  id: 'spring',
  name: 'Spring Cup',
  stage: 'Round Robin · Day 2',
  status: 'LIVE',
  startedAt: 'Mar 14, 2026',
  playerCount: 8,
  teams: TEAMS,
};

const RECENT_ACTIVITY = [
  { id: 'a1', title: 'Spring Cup',   sub: 'Final round · tonight 8pm', badge: 'LIVE',  kind: 'tournament' },
  { id: 'a2', title: 'Free Play',    sub: 'Yesterday · 4 players',     badge: 'Done',  kind: 'freeplay' },
  { id: 'a3', title: 'Winter Clash', sub: 'Mar 8 · 1st place',         badge: 'Won',   kind: 'trophy' },
];

const POINT_LOG_SEED = [
  { score: [12, 9], event: 'Spike by Carlos M.',  team: 'A', scorer: 'Carlos M.', serverName: 'Ana P.',  type: 'spike' },
  { score: [11, 9], event: 'Ace by Ana P.',       team: 'A', scorer: 'Ana P.',    serverName: 'Ana P.',  type: 'ace' },
  { score: [10, 9], event: 'Rival error',         team: 'A', scorer: null,        serverName: 'Santi A.', type: 'err' },
  { score: [ 9, 9], event: 'Block by Santi A.',   team: 'B', scorer: 'Santi A.',  serverName: 'Santi A.', type: 'block' },
  { score: [ 9, 8], event: 'Tip by Carlos M.',    team: 'A', scorer: 'Carlos M.', serverName: 'Carlos M.', type: 'tip' },
  { score: [ 8, 8], event: 'Ace by Diego R.',     team: 'B', scorer: 'Diego R.',  serverName: 'Diego R.', type: 'ace' },
  { score: [ 8, 7], event: 'Spike by Ana P.',     team: 'A', scorer: 'Ana P.',    serverName: 'Diego R.', type: 'spike' },
];

const NOTIFICATIONS = [
  { id: 'n1', title: 'Spring Cup starts in 2h', body: 'Alpha vs Bravo · Court 3', time: 'now',   unread: true,  kind: 'match' },
  { id: 'n2', title: 'Carlos invited you',       body: 'Free Play · this weekend',  time: '1h',   unread: true,  kind: 'invite' },
  { id: 'n3', title: 'New league ranking',       body: 'You moved up to #3',        time: '3h',   unread: true,  kind: 'trophy' },
  { id: 'n4', title: 'Match result saved',       body: 'Alpha defeated Charlie 21-16', time: 'yesterday', unread: false, kind: 'match' },
  { id: 'n5', title: 'Winter Clash wrapped',     body: 'Final standings available', time: '2 days', unread: false, kind: 'trophy' },
];

Object.assign(window, {
  PLAYERS, TEAMS, LEAGUE, TOURNAMENT, RECENT_ACTIVITY, POINT_LOG_SEED, NOTIFICATIONS,
});
