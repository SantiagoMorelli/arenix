const rot = [
  {team: 1, p: 'A'},
  {team: 2, p: 'C'},
  {team: 1, p: 'B'},
  {team: 2, p: 'D'}
];

// Suppose T2 serves first
let serveIndex = 1; // C

// T1 wins
let teamNum = 1;

let newServeIndex = serveIndex;
if (rot[serveIndex].team !== teamNum) {
   // Normal rotation search
   for (let i = 1; i <= rot.length; i++) {
     const candidate = (serveIndex + i) % rot.length;
     if (rot[candidate].team === teamNum) { newServeIndex = candidate; break; }
   }
}
console.log("Normal advance (Rotates):", rot[newServeIndex]);

// What if we don't rotate on first point?
// If this is T1's first serve of the set:
newServeIndex = rot.findIndex(r => r.team === teamNum);
console.log("First serve (No rotate):", rot[newServeIndex]);

// If rotateOnFirstPoint=true for team 3:
// We skip the first server, so it's the second slot!
let firstSlot = rot.findIndex(r => r.team === teamNum);
let rotatedSlot = firstSlot;
for (let i = 1; i <= rot.length; i++) {
  const candidate = (firstSlot + i) % rot.length;
  if (rot[candidate].team === teamNum) { rotatedSlot = candidate; break; }
}
console.log("First serve (Rotated):", rot[rotatedSlot]);

