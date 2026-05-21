-- Actualiza el sistema de puntos:
-- exacto = 5, ganador + diferencia = 4, ganador/empate = 3, sin acierto = 0.

create or replace function public.calculate_prediction_points(
  pred_home integer,
  pred_away integer,
  real_home integer,
  real_away integer
) returns integer language plpgsql immutable as $$
declare
  pred_winner text;
  real_winner text;
begin
  if pred_home = real_home and pred_away = real_away then
    return 5;
  end if;

  pred_winner := case
    when pred_home > pred_away then 'home'
    when pred_home < pred_away then 'away'
    else 'draw'
  end;
  real_winner := case
    when real_home > real_away then 'home'
    when real_home < real_away then 'away'
    else 'draw'
  end;

  if pred_winner = real_winner
    and (pred_home - pred_away) = (real_home - real_away) then
    return 4;
  end if;

  if pred_winner = real_winner then
    return 3;
  end if;

  return 0;
end;
$$;

create or replace function public.recalculate_poll_ranking(p_poll_id uuid)
returns void language plpgsql as $$
begin
  insert into public.standings (poll_id, user_id, total_points, exact_scores, correct_winners, correct_diffs, predictions_made)
  select
    pr.poll_id,
    pr.user_id,
    sum(pr.points_earned),
    count(*) filter (where pr.points_earned = 5),
    count(*) filter (where pr.points_earned >= 3),
    count(*) filter (where pr.points_earned in (4,5)),
    count(*)
  from public.predictions pr
  where pr.poll_id = p_poll_id and pr.is_calculated = true
  group by pr.poll_id, pr.user_id
  on conflict (poll_id, user_id) do update set
    total_points     = excluded.total_points,
    exact_scores     = excluded.exact_scores,
    correct_winners  = excluded.correct_winners,
    correct_diffs    = excluded.correct_diffs,
    predictions_made = excluded.predictions_made,
    updated_at       = now();

  with ranked as (
    select user_id,
           rank() over (partition by poll_id order by total_points desc, exact_scores desc, correct_winners desc) as r
    from public.standings
    where poll_id = p_poll_id
  )
  update public.standings s
  set rank = ranked.r
  from ranked
  where s.user_id = ranked.user_id and s.poll_id = p_poll_id;

  update public.poll_members pm
  set points = s.total_points,
      rank   = s.rank
  from public.standings s
  where pm.poll_id = s.poll_id and pm.user_id = s.user_id and pm.poll_id = p_poll_id;
end;
$$;

-- Recalcula predicciones que ya estaban calculadas con la regla anterior.
update public.predictions pr
set points_earned = public.calculate_prediction_points(
      pr.home_score_pred,
      pr.away_score_pred,
      m.home_score,
      m.away_score
    ),
    updated_at = now()
from public.matches m
where pr.match_id = m.id
  and pr.is_calculated = true
  and m.home_score is not null
  and m.away_score is not null;

do $$
declare
  affected_poll uuid;
begin
  for affected_poll in
    select distinct poll_id from public.predictions where is_calculated = true
  loop
    perform public.recalculate_poll_ranking(affected_poll);
  end loop;
end;
$$;
