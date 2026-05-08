export function buildServeRotation(o1, o2, firstServingTeam, rotateOnFirstPoint) {
  let rot1 = [...o1];
  let rot2 = [...o2];

  if (rotateOnFirstPoint) {
    if (firstServingTeam === 1 && rot2.length > 0) {
      // T2 is receiving, so T2 rotates once before serving starts
      rot2.push(rot2.shift());
    } else if (firstServingTeam === 2 && rot1.length > 0) {
      // T1 is receiving, so T1 rotates once before serving starts
      rot1.push(rot1.shift());
    }
  }

  const slots = [];
  const maxLen = Math.max(rot1.length, rot2.length, 1);
  
  for (let i = 0; i < maxLen; i++) {
    if (firstServingTeam === 2) {
      if (i < rot2.length) slots.push({ team: 2, playerId: rot2[i] });
      if (i < rot1.length) slots.push({ team: 1, playerId: rot1[i] });
    } else {
      if (i < rot1.length) slots.push({ team: 1, playerId: rot1[i] });
      if (i < rot2.length) slots.push({ team: 2, playerId: rot2[i] });
    }
  }
  return slots;
}

console.log("T1 serves first, rotate=true:", buildServeRotation(['A', 'B', 'C'], ['D', 'E', 'F'], 1, true));
console.log("T2 serves first, rotate=true:", buildServeRotation(['A', 'B', 'C'], ['D', 'E', 'F'], 2, true));
