const rot = [
  {team: 1, p: 'T1_1'},
  {team: 2, p: 'T2_1'},
  {team: 1, p: 'T1_2'},
  {team: 2, p: 'T2_2'},
  {team: 1, p: 'T1_3'},
  {team: 2, p: 'T2_3'}
];

function getNextServeIndex(rot, serveIndex, teamNum, isFirstServe, rotate) {
  if (isFirstServe) {
    if (!rotate) {
      return rot.findIndex(r => r.team === teamNum);
    } else {
      // We want to skip their very first slot and take the second slot.
      const firstSlot = rot.findIndex(r => r.team === teamNum);
      for (let i = 1; i <= rot.length; i++) {
        const candidate = (firstSlot + i) % rot.length;
        if (rot[candidate].team === teamNum) return candidate;
      }
    }
  }
  // Normal advance
  for (let i = 1; i <= rot.length; i++) {
    const candidate = (serveIndex + i) % rot.length;
    if (rot[candidate].team === teamNum) return candidate;
  }
}

console.log("T1 serves first (index 0). T2 wins.");
console.log("T2 next (no rotate):", rot[getNextServeIndex(rot, 0, 2, true, false)]);
console.log("T2 next (rotate):", rot[getNextServeIndex(rot, 0, 2, true, true)]);

console.log("\nT2 serves first (index 1). T1 wins.");
console.log("T1 next (no rotate):", rot[getNextServeIndex(rot, 1, 1, true, false)]);
console.log("T1 next (rotate):", rot[getNextServeIndex(rot, 1, 1, true, true)]);
