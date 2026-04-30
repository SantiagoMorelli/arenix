-- Delete all free play data
--
-- Deleting from free_plays is sufficient because the child tables
-- (free_play_games, free_play_teams, free_play_players) all have
-- ON DELETE CASCADE foreign keys pointing to free_plays.id.

DELETE FROM public.free_plays;
