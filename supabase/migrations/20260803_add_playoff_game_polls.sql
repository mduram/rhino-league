alter table public.playoff_games
  add column if not exists home_votes integer not null default 0,
  add column if not exists away_votes integer not null default 0;

alter table public.poll_votes
  add column if not exists playoff_game_id uuid
  references public.playoff_games(id) on delete cascade;

alter table public.poll_votes
  alter column game_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'poll_votes_exactly_one_game'
      and conrelid = 'public.poll_votes'::regclass
  ) then
    alter table public.poll_votes
      add constraint poll_votes_exactly_one_game
      check (num_nonnulls(game_id, playoff_game_id) = 1);
  end if;
end
$$;

create unique index if not exists poll_votes_playoff_game_ip_unique
  on public.poll_votes(playoff_game_id, ip_hash)
  where playoff_game_id is not null;
