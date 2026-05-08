import { buildServeRotation } from './src/hooks/liveGame/serveRotation.js';
const rot = buildServeRotation(['T1_1', 'T1_2'], ['T2_1', 'T2_2']);
console.log(rot);

let serveIndex = 0; // T1 serves first
console.log("Initial T1 serves:", rot[serveIndex]);

// T2 wins
let newServeIndex = serveIndex;
for (let i = 1; i <= rot.length; i++) {
  const candidate = (serveIndex + i) % rot.length;
  if (rot[candidate].team === 2) { newServeIndex = candidate; break; }
}
console.log("T2 wins, next server:", rot[newServeIndex]);

serveIndex = 1; // T2 serves first
console.log("\nInitial T2 serves:", rot[serveIndex]);

// T1 wins
newServeIndex = serveIndex;
for (let i = 1; i <= rot.length; i++) {
  const candidate = (serveIndex + i) % rot.length;
  if (rot[candidate].team === 1) { newServeIndex = candidate; break; }
}
console.log("T1 wins, next server:", rot[newServeIndex]);
