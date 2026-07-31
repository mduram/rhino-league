insert into public.futures_markets (
  slug,
  title,
  description,
  status,
  closes_at
)
select
  'playoff-runner-up',
  'Playoff Runner-Up',
  'Which team will finish second in the 2026 Rhino League playoffs?',
  'open',
  (select min(scheduled_at) from public.playoff_games where scheduled_at is not null)
where not exists (
  select 1
  from public.futures_markets
  where slug = 'playoff-runner-up'
);

update public.futures_markets
set closes_at = (
  select min(scheduled_at)
  from public.playoff_games
  where scheduled_at is not null
)
where slug in ('tournament-winner', 'playoff-runner-up')
  and exists (
    select 1
    from public.playoff_games
    where scheduled_at is not null
  );

insert into public.futures_options (market_id, team_id, label, odds)
select market.id, seeds.team_id, teams.name, 10
from public.futures_markets market
cross join public.playoff_seeds seeds
join public.teams teams on teams.id = seeds.team_id
where market.slug = 'playoff-runner-up'
  and not exists (
    select 1
    from public.futures_options existing
    where existing.market_id = market.id
      and existing.team_id = seeds.team_id
  );

delete from public.futures_options option
using public.futures_markets market
where option.market_id = market.id
  and market.slug in ('tournament-winner', 'playoff-runner-up')
  and not exists (
    select 1
    from public.playoff_seeds seeds
    where seeds.team_id = option.team_id
  )
  and not exists (
    select 1
    from public.futures_bets bet
    where bet.option_id = option.id
  );
