const fs = require('fs');
const path = 'supabase/schema.sql';
let content = fs.readFileSync(path, 'utf8');

// Add the player unlink policy right after the "players: admin can delete" policy
const playersTarget = `CREATE POLICY "players: admin can delete" ON public.players
  FOR DELETE USING (public.my_league_has_role(league_id, 'admin'));`;

const playersNewPolicy = `CREATE POLICY "players: admin can delete" ON public.players
  FOR DELETE USING (public.my_league_has_role(league_id, 'admin'));

DROP POLICY IF EXISTS "players: user can self-unlink" ON public.players;
CREATE POLICY "players: user can self-unlink" ON public.players
  FOR UPDATE USING (user_id = auth.uid());`;

content = content.replace(playersTarget, playersNewPolicy);

// Add the member_roles self-delete policy right after "member_roles: admin can manage"
const rolesTarget = `CREATE POLICY "member_roles: admin can manage" ON public.league_member_roles
  FOR ALL USING (public.my_league_has_role(league_id, 'admin'));`;

const rolesNewPolicy = `CREATE POLICY "member_roles: admin can manage" ON public.league_member_roles
  FOR ALL USING (public.my_league_has_role(league_id, 'admin'));

DROP POLICY IF EXISTS "member_roles: user can self-delete" ON public.league_member_roles;
CREATE POLICY "member_roles: user can self-delete" ON public.league_member_roles
  FOR DELETE USING (user_id = auth.uid());`;

content = content.replace(rolesTarget, rolesNewPolicy);

// Add the member_perms self-delete policy right after "member_perms: admin can manage"
const permsTarget = `CREATE POLICY "member_perms: admin can manage" ON public.league_member_permissions
  FOR ALL USING (public.my_league_has_role(league_id, 'admin'));`;

const permsNewPolicy = `CREATE POLICY "member_perms: admin can manage" ON public.league_member_permissions
  FOR ALL USING (public.my_league_has_role(league_id, 'admin'));

DROP POLICY IF EXISTS "member_perms: user can self-delete" ON public.league_member_permissions;
CREATE POLICY "member_perms: user can self-delete" ON public.league_member_permissions
  FOR DELETE USING (user_id = auth.uid());`;

content = content.replace(permsTarget, permsNewPolicy);

fs.writeFileSync(path, content);
console.log('schema.sql updated with self-leave policies');
