const fs = require('fs');

const path = 'src/services/leagueService.js';
let content = fs.readFileSync(path, 'utf8');

const leaveLeagueFn = `
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
`;

// Insert right before export async function deleteLeague
content = content.replace('export async function deleteLeague(leagueId)', leaveLeagueFn + '\nexport async function deleteLeague(leagueId)');

fs.writeFileSync(path, content);
console.log('leagueService updated');
