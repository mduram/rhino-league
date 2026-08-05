-- August 12 is unavailable for the VWR Summer Event. Move the affected
-- playoff sequence into added 9am slots while preserving August 27 as a
-- rest day and the August 28 medal-match schedule.
update public.playoff_games
set
  scheduled_at = case game_number
    when 28 then '2026-08-13T09:00:00-04:00'::timestamptz
    when 29 then '2026-08-13T12:00:00-04:00'::timestamptz
    when 30 then '2026-08-13T15:00:00-04:00'::timestamptz
    when 32 then '2026-08-13T16:00:00-04:00'::timestamptz
    when 33 then '2026-08-14T09:00:00-04:00'::timestamptz
    when 34 then '2026-08-14T12:00:00-04:00'::timestamptz
    when 35 then '2026-08-14T15:00:00-04:00'::timestamptz
    when 36 then '2026-08-14T16:00:00-04:00'::timestamptz
    when 37 then '2026-08-17T09:00:00-04:00'::timestamptz
    else scheduled_at
  end,
  location = 'Sand Court',
  updated_at = now()
where game_number in (28, 29, 30, 32, 33, 34, 35, 36, 37);
