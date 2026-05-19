-- ============================================================
-- POLLA MUNDIALISTA 2026 - Supabase Schema Completo
-- ============================================================

-- ─────────────────────────────────────────────
-- EXTENSIONES
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ─────────────────────────────────────────────
-- TIPOS ENUMERADOS
-- ─────────────────────────────────────────────
create type match_status as enum ('scheduled','live','finished','postponed','cancelled');
create type match_phase as enum ('groups','round_of_32','round_of_16','quarterfinals','semifinals','third_place','final');
create type user_role as enum ('admin','participant');
create type sync_source as enum ('football_data','thesportsdb','openfootball','manual','cache');

-- ─────────────────────────────────────────────
-- TABLA: profiles
-- ─────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  full_name     text,
  avatar_url    text,
  role          user_role not null default 'participant',
  total_points  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_total_points on public.profiles(total_points desc);

-- ─────────────────────────────────────────────
-- TABLA: teams
-- ─────────────────────────────────────────────
create table public.teams (
  id           serial primary key,
  name         text not null,
  short_name   text not null,    -- ej: ARG, BRA, COL
  flag_url     text,
  group_letter text,             -- A-L para fase de grupos
  fifa_code    text unique,
  created_at   timestamptz not null default now()
);
create index idx_teams_short_name on public.teams(short_name);
create index idx_teams_group on public.teams(group_letter);

-- ─────────────────────────────────────────────
-- TABLA: matches
-- ─────────────────────────────────────────────
create table public.matches (
  id               serial primary key,
  external_id      text unique,               -- ID en football-data.org
  match_number     integer,                   -- Partido 1-104
  phase            match_phase not null,
  home_team_id     integer references public.teams(id),
  away_team_id     integer references public.teams(id),
  home_score       integer,
  away_score       integer,
  match_date       timestamptz not null,
  venue            text,
  city             text,
  status           match_status not null default 'scheduled',
  lock_time        timestamptz,               -- Calculado automáticamente
  last_synced_at   timestamptz,
  sync_source      sync_source,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_matches_date on public.matches(match_date);
create index idx_matches_status on public.matches(status);
create index idx_matches_phase on public.matches(phase);
create index idx_matches_external_id on public.matches(external_id);

-- Trigger: actualizar lock_time automáticamente (30 min antes del partido)
create or replace function set_match_lock_time()
returns trigger language plpgsql as $$
begin
  new.lock_time := new.match_date - interval '30 minutes';
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_match_lock_time
  before insert or update of match_date on public.matches
  for each row execute function set_match_lock_time();

-- ─────────────────────────────────────────────
-- TABLA: polls (pollas)
-- ─────────────────────────────────────────────
create table public.polls (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  description  text,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  invite_code  text unique not null default upper(substr(md5(random()::text), 1, 8)),
  is_public    boolean not null default false,
  max_members  integer default 50,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_polls_invite_code on public.polls(invite_code);
create index idx_polls_owner on public.polls(owner_id);

-- ─────────────────────────────────────────────
-- TABLA: poll_members
-- ─────────────────────────────────────────────
create table public.poll_members (
  id         serial primary key,
  poll_id    uuid not null references public.polls(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  points     integer not null default 0,
  rank       integer,
  joined_at  timestamptz not null default now(),
  unique(poll_id, user_id)
);
create index idx_poll_members_poll on public.poll_members(poll_id);
create index idx_poll_members_user on public.poll_members(user_id);
create index idx_poll_members_points on public.poll_members(poll_id, points desc);

-- ─────────────────────────────────────────────
-- TABLA: predictions
-- ─────────────────────────────────────────────
create table public.predictions (
  id                serial primary key,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  match_id          integer not null references public.matches(id) on delete cascade,
  poll_id           uuid not null references public.polls(id) on delete cascade,
  home_score_pred   integer not null check (home_score_pred >= 0),
  away_score_pred   integer not null check (away_score_pred >= 0),
  points_earned     integer not null default 0,
  is_calculated     boolean not null default false,
  submitted_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(user_id, match_id, poll_id)
);
create index idx_predictions_user on public.predictions(user_id);
create index idx_predictions_match on public.predictions(match_id);
create index idx_predictions_poll on public.predictions(poll_id);
create index idx_predictions_calculated on public.predictions(is_calculated);

-- ─────────────────────────────────────────────
-- TABLA: standings (ranking general)
-- ─────────────────────────────────────────────
create table public.standings (
  id              serial primary key,
  poll_id         uuid not null references public.polls(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  total_points    integer not null default 0,
  exact_scores    integer not null default 0,    -- marcador exacto (5pts)
  correct_winners integer not null default 0,    -- ganador correcto (3pts)
  correct_diffs   integer not null default 0,    -- dif. de goles (2pts extra)
  predictions_made integer not null default 0,
  rank            integer,
  updated_at      timestamptz not null default now(),
  unique(poll_id, user_id)
);
create index idx_standings_poll on public.standings(poll_id);
create index idx_standings_rank on public.standings(poll_id, rank);

-- ─────────────────────────────────────────────
-- TABLA: sync_logs
-- ─────────────────────────────────────────────
create table public.sync_logs (
  id            serial primary key,
  source        sync_source not null,
  matches_updated integer not null default 0,
  success       boolean not null default true,
  error_message text,
  duration_ms   integer,
  synced_at     timestamptz not null default now()
);
create index idx_sync_logs_date on public.sync_logs(synced_at desc);

-- ─────────────────────────────────────────────
-- TABLA: admin_logs
-- ─────────────────────────────────────────────
create table public.admin_logs (
  id          serial primary key,
  admin_id    uuid not null references public.profiles(id),
  action      text not null,
  target_type text,     -- 'match', 'prediction', 'user', etc.
  target_id   text,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz not null default now()
);
create index idx_admin_logs_admin on public.admin_logs(admin_id);
create index idx_admin_logs_date on public.admin_logs(created_at desc);

-- ─────────────────────────────────────────────
-- FUNCIÓN: Calcular puntos de una predicción
-- ─────────────────────────────────────────────
create or replace function calculate_prediction_points(
  pred_home integer,
  pred_away integer,
  real_home integer,
  real_away integer
) returns integer language plpgsql immutable as $$
declare
  pts integer := 0;
  pred_winner text;
  real_winner text;
begin
  -- Marcador exacto: 5 puntos
  if pred_home = real_home and pred_away = real_away then
    return 5;
  end if;

  -- Determinar ganador
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

  -- Ganador/empate correcto: 3 puntos
  if pred_winner = real_winner then
    pts := 3;
  end if;

  -- Diferencia de goles correcta: 2 puntos extra
  if pred_winner = real_winner
    and (pred_home - pred_away) = (real_home - real_away) then
    pts := pts + 2;
  end if;

  return pts;
end;
$$;

-- ─────────────────────────────────────────────
-- FUNCIÓN: Recalcular ranking de una polla
-- ─────────────────────────────────────────────
create or replace function recalculate_poll_ranking(p_poll_id uuid)
returns void language plpgsql as $$
begin
  -- Actualizar standings desde predicciones calculadas
  insert into public.standings (poll_id, user_id, total_points, exact_scores, correct_winners, correct_diffs, predictions_made)
  select
    pr.poll_id,
    pr.user_id,
    sum(pr.points_earned),
    count(*) filter (where pr.points_earned = 5),
    count(*) filter (where pr.points_earned >= 3),
    count(*) filter (where pr.points_earned in (2,5)),
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

  -- Asignar rangos
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

  -- Actualizar poll_members también
  update public.poll_members pm
  set points = s.total_points,
      rank   = s.rank
  from public.standings s
  where pm.poll_id = s.poll_id and pm.user_id = s.user_id and pm.poll_id = p_poll_id;
end;
$$;

-- ─────────────────────────────────────────────
-- FUNCIÓN: Procesar resultados de un partido
-- ─────────────────────────────────────────────
create or replace function process_match_results(p_match_id integer)
returns integer language plpgsql as $$
declare
  m record;
  updated_count integer := 0;
begin
  select * into m from public.matches where id = p_match_id and status = 'finished';
  if not found then return 0; end if;

  -- Calcular puntos de todas las predicciones del partido
  update public.predictions
  set points_earned = calculate_prediction_points(
        home_score_pred, away_score_pred,
        m.home_score, m.away_score
      ),
      is_calculated = true,
      updated_at    = now()
  where match_id = p_match_id and is_calculated = false;

  get diagnostics updated_count = row_count;

  -- Recalcular rankings de todas las pollas afectadas
  perform recalculate_poll_ranking(distinct_poll.poll_id)
  from (
    select distinct poll_id from public.predictions where match_id = p_match_id
  ) distinct_poll;

  return updated_count;
end;
$$;

-- ─────────────────────────────────────────────
-- TRIGGER: Auto-proceso cuando partido termina
-- ─────────────────────────────────────────────
create or replace function trg_on_match_finished()
returns trigger language plpgsql as $$
begin
  if new.status = 'finished' and old.status != 'finished' then
    perform process_match_results(new.id);
  end if;
  return new;
end;
$$;

create trigger trg_match_finished
  after update of status on public.matches
  for each row execute function trg_on_match_finished();

-- ─────────────────────────────────────────────
-- TRIGGER: Auto-crear profile al registrarse
-- ─────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────
-- FUNCIÓN: Validar que predicción no sea tardía
-- ─────────────────────────────────────────────
create or replace function validate_prediction_timing()
returns trigger language plpgsql as $$
declare
  lock_t timestamptz;
begin
  select lock_time into lock_t from public.matches where id = new.match_id;
  if now() >= lock_t then
    raise exception 'Las predicciones para este partido están cerradas.';
  end if;
  return new;
end;
$$;

create trigger trg_validate_prediction
  before insert or update on public.predictions
  for each row execute function validate_prediction_timing();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.profiles     enable row level security;
alter table public.teams        enable row level security;
alter table public.matches      enable row level security;
alter table public.polls        enable row level security;
alter table public.poll_members enable row level security;
alter table public.predictions  enable row level security;
alter table public.standings    enable row level security;
alter table public.sync_logs    enable row level security;
alter table public.admin_logs   enable row level security;

-- Profiles: lectura pública, edición solo propia
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Teams: solo lectura pública
create policy "teams_select" on public.teams for select using (true);
create policy "teams_admin_all" on public.teams for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Matches: solo lectura pública
create policy "matches_select" on public.matches for select using (true);
create policy "matches_admin_all" on public.matches for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Polls: lectura si miembro o pública, escritura si dueño
create policy "polls_select" on public.polls for select using (
  is_public = true
  or owner_id = auth.uid()
  or exists (select 1 from public.poll_members where poll_id = polls.id and user_id = auth.uid())
);
create policy "polls_insert" on public.polls for insert with check (auth.uid() = owner_id);
create policy "polls_update" on public.polls for update using (auth.uid() = owner_id);
create policy "polls_delete" on public.polls for delete using (auth.uid() = owner_id);

-- Poll members: ver si pertenece a la polla
create policy "poll_members_select" on public.poll_members for select using (
  exists (select 1 from public.poll_members pm2 where pm2.poll_id = poll_members.poll_id and pm2.user_id = auth.uid())
);
create policy "poll_members_insert" on public.poll_members for insert with check (auth.uid() = user_id);
create policy "poll_members_delete" on public.poll_members for delete using (auth.uid() = user_id);

-- Predictions: ver/editar propias
create policy "predictions_select" on public.predictions for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.poll_members pm
    where pm.poll_id = predictions.poll_id and pm.user_id = auth.uid()
  )
);
create policy "predictions_insert" on public.predictions for insert with check (auth.uid() = user_id);
create policy "predictions_update" on public.predictions for update using (auth.uid() = user_id);

-- Standings: lectura si pertenece a la polla
create policy "standings_select" on public.standings for select using (
  exists (select 1 from public.poll_members pm where pm.poll_id = standings.poll_id and pm.user_id = auth.uid())
);

-- Sync logs: solo admin
create policy "sync_logs_admin" on public.sync_logs for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Admin logs: solo admin
create policy "admin_logs_admin" on public.admin_logs for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ─────────────────────────────────────────────
-- DATOS INICIALES: Equipos Mundial 2026
-- ─────────────────────────────────────────────
insert into public.teams (name, short_name, group_letter, fifa_code) values
-- Grupo A (México sede)
('México',          'MEX', 'A', 'MEX'),
('Sudáfrica',       'SUD', 'A', 'RSA'),
('Corea del Sur',   'KOR', 'A', 'KOR'),
('República Checa', 'CZE', 'A', 'CZE'),
-- Grupo B
('Canadá',          'CAN', 'B', 'CAN'),
('Bosnia',          'BIH', 'B', 'BIH'),
('Estados Unidos',  'USA', 'B', 'USA'),
('Paraguay',        'PAR', 'B', 'PAR'),
-- Grupo C
('Qatar',           'QAT', 'C', 'QAT'),
('Suiza',           'SUI', 'C', 'SUI'),
('Brasil',          'BRA', 'C', 'BRA'),
('Marruecos',       'MAR', 'C', 'MAR'),
('Haití',           'HAI', 'C', 'HAI'),
('Escocia',         'ESC', 'C', 'SCO'),
-- Grupo D
('Australia',       'AUS', 'D', 'AUS'),
('Turquía',         'TUR', 'D', 'TUR'),
('Alemania',        'ALE', 'D', 'GER'),
('Curazao',         'CUR', 'D', 'CUW'),
('Países Bajos',    'NED', 'D', 'NED'),
('Japón',           'JAP', 'D', 'JPN'),
('Costa de Marfil', 'CIV', 'D', 'CIV'),
('Ecuador',         'ECU', 'D', 'ECU'),
('Suecia',          'SUE', 'D', 'SWE'),
('Túnez',           'TUN', 'D', 'TUN'),
-- Grupo E
('España',          'ESP', 'E', 'ESP'),
('Cabo Verde',      'CPV', 'E', 'CPV'),
('Bélgica',         'BEL', 'E', 'BEL'),
('Egipto',          'EGI', 'E', 'EGY'),
('Arabia Saudita',  'KSA', 'E', 'KSA'),
('Uruguay',         'URU', 'E', 'URU'),
('Irán',            'IRN', 'E', 'IRN'),
('Nueva Zelanda',   'NZL', 'E', 'NZL'),
-- Grupo F
('Francia',         'FRA', 'F', 'FRA'),
('Senegal',         'SEN', 'F', 'SEN'),
('Irak',            'IRQ', 'F', 'IRQ'),
('Noruega',         'NOR', 'F', 'NOR'),
('Argentina',       'ARG', 'F', 'ARG'),
('Argelia',         'ALG', 'F', 'ALG'),
-- Grupo G
('Jordania',        'JOR', 'G', 'JOR'),
('Portugal',        'POR', 'G', 'POR'),
('Uzbekistán',      'UZB', 'G', 'UZB'),
('Inglaterra',      'ING', 'G', 'ENG'),
('Ghana',           'GHA', 'G', 'GHA'),
('Panamá',          'PAN', 'G', 'PAN'),
('Croacia',         'CRO', 'G', 'CRO'),
('Colombia',        'COL', 'G', 'COL'),
('R. D. Congo',     'COD', 'G', 'COD')
on conflict (fifa_code) do nothing;
