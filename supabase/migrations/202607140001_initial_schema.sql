begin;

create extension if not exists pgcrypto;

create table public.teams (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    short_name text not null,
    logo_path text,
    is_active boolean not null default true,
    display_order smallint not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint teams_name_not_blank
        check (btrim(name) <> ''),

    constraint teams_short_name_not_blank
        check (btrim(short_name) <> ''),

    constraint teams_display_order_nonnegative
        check (display_order >= 0)
);

create unique index teams_name_case_insensitive_unique
    on public.teams (lower(name));

create unique index teams_short_name_case_insensitive_unique
    on public.teams (lower(short_name));

create table public.matches (
    id uuid primary key default gen_random_uuid(),

    team_a_id uuid not null
        references public.teams(id)
        on update cascade
        on delete restrict,

    team_b_id uuid not null
        references public.teams(id)
        on update cascade
        on delete restrict,

    score_a smallint,
    score_b smallint,

    status text not null default 'scheduled',
    match_day smallint not null,
    match_order smallint not null,
    scheduled_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint matches_distinct_teams
        check (team_a_id <> team_b_id),

    constraint matches_status_valid
        check (status in ('scheduled', 'live', 'finished')),

    constraint matches_match_day_positive
        check (match_day > 0),

    constraint matches_match_order_positive
        check (match_order > 0),

    constraint matches_score_a_valid
        check (score_a is null or score_a between 0 and 2),

    constraint matches_score_b_valid
        check (score_b is null or score_b between 0 and 2),

    constraint matches_scheduled_has_no_score
        check (
            status <> 'scheduled'
            or (score_a is null and score_b is null)
        ),

    constraint matches_live_has_score
        check (
            status <> 'live'
            or (score_a is not null and score_b is not null)
        ),

    constraint matches_finished_is_valid_bo3
        check (
            status <> 'finished'
            or (
                score_a is not null
                and score_b is not null
                and (
                    (score_a = 2 and score_b in (0, 1))
                    or
                    (score_b = 2 and score_a in (0, 1))
                )
            )
        ),

    constraint matches_day_order_unique
        unique (match_day, match_order)
);

create unique index matches_unique_team_pair
    on public.matches (
        least(team_a_id, team_b_id),
        greatest(team_a_id, team_b_id)
    );

create index matches_team_a_id_index
    on public.matches(team_a_id);

create index matches_team_b_id_index
    on public.matches(team_b_id);

create index matches_status_index
    on public.matches(status);

create index matches_match_day_order_index
    on public.matches(match_day, match_order);

create table public.tournament_settings (
    id smallint primary key default 1,
    tournament_name text not null,
    season_label text not null,
    qualification_count smallint not null default 6,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint tournament_settings_singleton
        check (id = 1),

    constraint tournament_name_not_blank
        check (btrim(tournament_name) <> ''),

    constraint season_label_not_blank
        check (btrim(season_label) <> ''),

    constraint qualification_count_positive
        check (qualification_count > 0)
);

insert into public.tournament_settings (
    id,
    tournament_name,
    season_label,
    qualification_count
)
values (
    1,
    'Bản Làng Tia Chớp Championship',
    'Summer 2026',
    6
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger teams_set_updated_at
before update on public.teams
for each row
execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

create trigger tournament_settings_set_updated_at
before update on public.tournament_settings
for each row
execute function public.set_updated_at();

alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.tournament_settings enable row level security;

create policy "Public can read active teams"
on public.teams
for select
to anon, authenticated
using (is_active = true);

create policy "Public can read matches"
on public.matches
for select
to anon, authenticated
using (true);

create policy "Public can read tournament settings"
on public.tournament_settings
for select
to anon, authenticated
using (true);

grant usage on schema public to anon, authenticated;

grant select on public.teams
to anon, authenticated;

grant select on public.matches
to anon, authenticated;

grant select on public.tournament_settings
to anon, authenticated;

revoke insert, update, delete on public.teams
from anon, authenticated;

revoke insert, update, delete on public.matches
from anon, authenticated;

revoke insert, update, delete on public.tournament_settings
from anon, authenticated;

alter table public.matches replica identity full;

do $$
begin
    if exists (
        select 1
        from pg_publication
        where pubname = 'supabase_realtime'
    )
    and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'matches'
    ) then
        alter publication supabase_realtime
            add table public.matches;
    end if;
end
$$;

commit;
