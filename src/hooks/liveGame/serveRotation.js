// Pure helpers for serve-rotation logic — no React, no side-effects.

/**
 * Return the player-id array for a team, ordered by firstServerIdx rotation.
 */
export function teamPlayerIds(team) {
  if (!team) return [];
  if (team.players && team.players.length > 0) return team.players;
  return [team.player1, team.player2].filter(Boolean);
}

export function teamPlayersOrdered(pIds, firstServerIdx) {
  if (pIds.length === 0) return [null, null];
  if (firstServerIdx === 0) return pIds;
  return [...pIds.slice(firstServerIdx), ...pIds.slice(0, firstServerIdx)];
}

/**
 * Build the interleaved serve-rotation slot array from the two ordered
 * player-id lists.  Falls back to a single placeholder slot when both are
 * empty so callers never get a zero-length array.
 *
 * @param {string[]} o1  Team-1 ordered player ids
 * @param {string[]} o2  Team-2 ordered player ids
 * @returns {{ team: 1|2, playerId: string|null }[]}
 */
export function buildServeRotation(o1, o2) {
  const maxLen = Math.max(o1.length, o2.length, 1);
  const slots = [];
  for (let i = 0; i < maxLen; i++) {
    if (i < o1.length) slots.push({ team: 1, playerId: o1[i] });
    if (i < o2.length) slots.push({ team: 2, playerId: o2[i] });
  }
  return slots.length > 0 ? slots : [{ team: 1, playerId: null }, { team: 2, playerId: null }];
}
