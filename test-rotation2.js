export function buildServeRotation(o1, o2, firstServingTeam, rotateOnFirstPoint) {
  const slots = [];
  const maxLen = Math.max(o1.length, o2.length, 1);
  
  // Normal interleaved order: T1 first, then T2. 
  // e.g. [T1_1, T2_1, T1_2, T2_2]
  // If T2 serves first, we just swap the interleaving!
  // e.g. [T2_1, T1_1, T2_2, T1_2]
  // BUT wait, what if rotateOnFirstPoint is true?
  
  // Let's test standard tennis/padel (rotateOnFirstPoint = false)
  for (let i = 0; i < maxLen; i++) {
    if (firstServingTeam === 2) {
      if (i < o2.length) slots.push({ team: 2, playerId: o2[i] });
      if (i < o1.length) slots.push({ team: 1, playerId: o1[i] });
    } else {
      if (i < o1.length) slots.push({ team: 1, playerId: o1[i] });
      if (i < o2.length) slots.push({ team: 2, playerId: o2[i] });
    }
  }
  return slots;
}

console.log("T1 serves first:", buildServeRotation(['A', 'B'], ['C', 'D'], 1, false));
console.log("T2 serves first:", buildServeRotation(['A', 'B'], ['C', 'D'], 2, false));
