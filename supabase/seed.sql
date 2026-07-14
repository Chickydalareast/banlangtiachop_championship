begin;

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
)
on conflict (id) do update
set
    tournament_name = excluded.tournament_name,
    season_label = excluded.season_label,
    qualification_count = excluded.qualification_count,
    updated_at = now();

-- Teams and the 36-match schedule will be inserted after the official
-- team names, short names, logos and schedule order are confirmed.

commit;
