const currentServer = { team: 2, playerId: 'C' };
const log = [];

function hasServed(teamNum) {
   return currentServer.team === teamNum || log.some(l => l.serverTeam === teamNum);
}

console.log("Before point 1:");
console.log("T1 has served:", hasServed(1)); // false
console.log("T2 has served:", hasServed(2)); // true

// T1 wins point 1
const teamNum = 1;
const isFirstServe = !hasServed(teamNum);
console.log("Is first serve for T1?", isFirstServe); // true!

