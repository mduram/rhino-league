create table if not exists public.playoff_game_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  playoff_game_id uuid not null references public.playoff_games(id) on delete cascade,
  side text not null check (side in ('home', 'away')),
  amount integer not null check (amount > 0),
  odds numeric not null check (odds > 0),
  potential_payout integer not null check (potential_payout >= 0),
  status text not null default 'open' check (
    status in ('open', 'won', 'lost', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create unique index if not exists playoff_game_bets_one_open_pick_per_user
  on public.playoff_game_bets (user_id, playoff_game_id)
  where status = 'open';

create index if not exists playoff_game_bets_game_status_idx
  on public.playoff_game_bets (playoff_game_id, status);

alter table public.playoff_game_bets enable row level security;

drop policy if exists "Users can read their playoff bets"
  on public.playoff_game_bets;

create policy "Users can read their playoff bets"
  on public.playoff_game_bets
  for select
  using (auth.uid() = user_id);

create or replace function public.place_playoff_game_bet(
  p_user_id uuid,
  p_playoff_game_id uuid,
  p_side text,
  p_amount integer,
  p_odds numeric,
  p_potential_payout integer
)
returns table(bet_id uuid, remaining_coins integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_bet_id uuid;
  v_status text;
  v_scheduled_at timestamptz;
  v_home_team_id uuid;
  v_away_team_id uuid;
begin
  if p_side not in ('home', 'away') then
    raise exception 'Choose a valid playoff team.';
  end if;

  if p_amount <= 0 or p_odds <= 0 or p_potential_payout < 0 then
    raise exception 'Invalid playoff bet values.';
  end if;

  select status, scheduled_at, home_team_id, away_team_id
  into v_status, v_scheduled_at, v_home_team_id, v_away_team_id
  from public.playoff_games
  where id = p_playoff_game_id
  for update;

  if v_status is null then
    raise exception 'Playoff game not found.';
  end if;

  if v_status <> 'scheduled'
    or v_scheduled_at is null
    or v_scheduled_at <= now()
    or v_home_team_id is null
    or v_away_team_id is null then
    raise exception 'This playoff game is not open for betting.';
  end if;

  select coalesce(rhino_coins, 0)
  into v_balance
  from public.profiles
  where id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'Profile not found.';
  end if;

  if v_balance < p_amount then
    raise exception 'Not enough Rhino Coins.';
  end if;

  insert into public.playoff_game_bets (
    user_id,
    playoff_game_id,
    side,
    amount,
    odds,
    potential_payout,
    status
  )
  values (
    p_user_id,
    p_playoff_game_id,
    p_side,
    p_amount,
    p_odds,
    p_potential_payout,
    'open'
  )
  returning id into v_bet_id;

  update public.profiles
  set rhino_coins = v_balance - p_amount
  where id = p_user_id;

  return query
  select v_bet_id, v_balance - p_amount;
end;
$$;

revoke all on function public.place_playoff_game_bet(
  uuid,
  uuid,
  text,
  integer,
  numeric,
  integer
) from public, anon, authenticated;

grant execute on function public.place_playoff_game_bet(
  uuid,
  uuid,
  text,
  integer,
  numeric,
  integer
) to service_role;
