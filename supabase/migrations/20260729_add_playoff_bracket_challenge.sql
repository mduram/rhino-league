create table if not exists public.playoff_bracket_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_year integer not null,
  bracket_version text not null,
  picks jsonb not null,
  entry_fee integer not null default 100 check (entry_fee = 100),
  score integer not null default 0 check (score >= 0),
  payout integer not null default 0 check (payout >= 0),
  status text not null default 'submitted' check (
    status in ('submitted', 'winner', 'settled', 'refunded')
  ),
  submitted_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (user_id, season_year)
);

create index if not exists playoff_bracket_entries_season_score_idx
  on public.playoff_bracket_entries (season_year, score desc, submitted_at asc);

alter table public.playoff_bracket_entries enable row level security;

drop policy if exists "Users can read their bracket entry"
  on public.playoff_bracket_entries;

create policy "Users can read their bracket entry"
  on public.playoff_bracket_entries
  for select
  using (auth.uid() = user_id);

create or replace function public.submit_playoff_bracket_entry(
  p_user_id uuid,
  p_season_year integer,
  p_bracket_version text,
  p_picks jsonb,
  p_entry_fee integer
)
returns table(entry_id uuid, remaining_coins integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_entry_id uuid;
begin
  if p_entry_fee <> 100 then
    raise exception 'The bracket entry fee must be 100 Rhino Coins.';
  end if;

  if jsonb_typeof(p_picks) <> 'object' then
    raise exception 'Bracket picks must be a JSON object.';
  end if;

  if exists (
    select 1
    from public.playoff_bracket_entries
    where user_id = p_user_id and season_year = p_season_year
  ) then
    raise exception 'You already submitted a bracket for this season.';
  end if;

  select coalesce(rhino_coins, 0)
  into v_balance
  from public.profiles
  where id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'Profile not found.';
  end if;

  if v_balance < p_entry_fee then
    raise exception 'Not enough Rhino Coins.';
  end if;

  update public.profiles
  set rhino_coins = v_balance - p_entry_fee
  where id = p_user_id;

  insert into public.playoff_bracket_entries (
    user_id,
    season_year,
    bracket_version,
    picks,
    entry_fee,
    status
  )
  values (
    p_user_id,
    p_season_year,
    p_bracket_version,
    p_picks,
    p_entry_fee,
    'submitted'
  )
  returning id into v_entry_id;

  return query
  select v_entry_id, v_balance - p_entry_fee;
end;
$$;

revoke all on function public.submit_playoff_bracket_entry(
  uuid,
  integer,
  text,
  jsonb,
  integer
) from public, anon, authenticated;

grant execute on function public.submit_playoff_bracket_entry(
  uuid,
  integer,
  text,
  jsonb,
  integer
) to service_role;

create or replace function public.settle_playoff_bracket_challenge(
  p_season_year integer,
  p_scores jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pot integer;
  v_top_score integer;
  v_winner_count integer;
  v_base_payout integer;
  v_remainder integer;
  v_index integer := 0;
  v_payout integer;
  v_entry record;
begin
  if exists (
    select 1
    from public.playoff_bracket_entries
    where season_year = p_season_year and status = 'winner'
  ) then
    raise exception 'This bracket challenge has already been settled.';
  end if;

  update public.playoff_bracket_entries as entry
  set score = coalesce((p_scores ->> entry.id::text)::integer, 0)
  where entry.season_year = p_season_year
    and entry.status = 'submitted';

  select
    coalesce(sum(entry_fee), 0),
    coalesce(max(score), 0)
  into v_pot, v_top_score
  from public.playoff_bracket_entries
  where season_year = p_season_year
    and status = 'submitted';

  select count(*)
  into v_winner_count
  from public.playoff_bracket_entries
  where season_year = p_season_year
    and status = 'submitted'
    and score = v_top_score;

  if v_winner_count = 0 then
    raise exception 'There are no submitted brackets to settle.';
  end if;

  v_base_payout := v_pot / v_winner_count;
  v_remainder := v_pot % v_winner_count;

  for v_entry in
    select id, user_id
    from public.playoff_bracket_entries
    where season_year = p_season_year
      and status = 'submitted'
      and score = v_top_score
    order by submitted_at asc, id asc
  loop
    v_payout := v_base_payout + case when v_index < v_remainder then 1 else 0 end;

    update public.profiles
    set rhino_coins = coalesce(rhino_coins, 0) + v_payout
    where id = v_entry.user_id;

    update public.playoff_bracket_entries
    set status = 'winner', payout = v_payout, settled_at = now()
    where id = v_entry.id;

    v_index := v_index + 1;
  end loop;

  update public.playoff_bracket_entries
  set status = 'settled', payout = 0, settled_at = now()
  where season_year = p_season_year
    and status = 'submitted';

  return jsonb_build_object(
    'pot', v_pot,
    'topScore', v_top_score,
    'winnerCount', v_winner_count,
    'basePayout', v_base_payout
  );
end;
$$;

revoke all on function public.settle_playoff_bracket_challenge(
  integer,
  jsonb
) from public, anon, authenticated;

grant execute on function public.settle_playoff_bracket_challenge(
  integer,
  jsonb
) to service_role;
