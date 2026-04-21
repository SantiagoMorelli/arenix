const fs = require('fs');

const path = 'src/services/leagueService.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'async function normalizeTournament(row, leaguePlayers) {',
  'async function normalizeTournament(row) {'
);

// We need to also fix the call to normalizeTournament inside getLeagueById
content = content.replace(
  '(tournamentsRes.data || []).map(t => normalizeTournament(t, players))',
  '(tournamentsRes.data || []).map(t => normalizeTournament(t))'
);

fs.writeFileSync(path, content);
console.log('Fixed leaguePlayers arg');
