begin;

create temporary table official_schedule_hotfix (
    team_a_id uuid not null,
    team_b_id uuid not null,
    match_day smallint not null,
    match_order smallint not null,
    scheduled_at timestamptz not null
) on commit drop;

insert into official_schedule_hotfix (
    team_a_id,
    team_b_id,
    match_day,
    match_order,
    scheduled_at
)
values
    ('10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000002'::uuid, 1, 1, '2026-07-13T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000003'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, 1, 2, '2026-07-13T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000005'::uuid, '10000000-0000-4000-8000-000000000006'::uuid, 1, 3, '2026-07-13T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000007'::uuid, '10000000-0000-4000-8000-000000000008'::uuid, 1, 4, '2026-07-13T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, 2, 1, '2026-07-14T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000002'::uuid, '10000000-0000-4000-8000-000000000006'::uuid, 2, 2, '2026-07-14T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000003'::uuid, '10000000-0000-4000-8000-000000000008'::uuid, 2, 3, '2026-07-14T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000007'::uuid, '10000000-0000-4000-8000-000000000009'::uuid, 2, 4, '2026-07-14T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000006'::uuid, 3, 1, '2026-07-15T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000004'::uuid, '10000000-0000-4000-8000-000000000008'::uuid, 3, 2, '2026-07-15T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000003'::uuid, '10000000-0000-4000-8000-000000000009'::uuid, 3, 3, '2026-07-15T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000005'::uuid, '10000000-0000-4000-8000-000000000007'::uuid, 3, 4, '2026-07-15T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000008'::uuid, 4, 1, '2026-07-16T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000004'::uuid, '10000000-0000-4000-8000-000000000009'::uuid, 4, 2, '2026-07-16T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000002'::uuid, '10000000-0000-4000-8000-000000000007'::uuid, 4, 3, '2026-07-16T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000003'::uuid, '10000000-0000-4000-8000-000000000005'::uuid, 4, 4, '2026-07-16T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000008'::uuid, '10000000-0000-4000-8000-000000000009'::uuid, 5, 1, '2026-07-17T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000006'::uuid, '10000000-0000-4000-8000-000000000007'::uuid, 5, 2, '2026-07-17T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000004'::uuid, '10000000-0000-4000-8000-000000000005'::uuid, 5, 3, '2026-07-17T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000002'::uuid, '10000000-0000-4000-8000-000000000003'::uuid, 5, 4, '2026-07-17T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000009'::uuid, 6, 1, '2026-07-18T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000008'::uuid, '10000000-0000-4000-8000-000000000005'::uuid, 6, 2, '2026-07-18T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000006'::uuid, '10000000-0000-4000-8000-000000000003'::uuid, 6, 3, '2026-07-18T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000004'::uuid, '10000000-0000-4000-8000-000000000002'::uuid, 6, 4, '2026-07-18T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000007'::uuid, 7, 1, '2026-07-19T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000009'::uuid, '10000000-0000-4000-8000-000000000005'::uuid, 7, 2, '2026-07-19T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000008'::uuid, '10000000-0000-4000-8000-000000000002'::uuid, 7, 3, '2026-07-19T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000006'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, 7, 4, '2026-07-19T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000005'::uuid, 8, 1, '2026-07-20T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000007'::uuid, '10000000-0000-4000-8000-000000000003'::uuid, 8, 2, '2026-07-20T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000009'::uuid, '10000000-0000-4000-8000-000000000002'::uuid, 8, 3, '2026-07-20T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000008'::uuid, '10000000-0000-4000-8000-000000000006'::uuid, 8, 4, '2026-07-20T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000003'::uuid, 9, 1, '2026-07-21T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000005'::uuid, '10000000-0000-4000-8000-000000000002'::uuid, 9, 2, '2026-07-21T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000007'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, 9, 3, '2026-07-21T20:00:00+07:00'::timestamptz),
    ('10000000-0000-4000-8000-000000000009'::uuid, '10000000-0000-4000-8000-000000000006'::uuid, 9, 4, '2026-07-21T20:00:00+07:00'::timestamptz);

do $$
begin
    if (
        select count(*)
        from public.matches
    ) <> 36 then
        raise exception
            'Expected 36 existing matches before schedule hotfix.';
    end if;

    if (
        select count(*)
        from official_schedule_hotfix
    ) <> 36 then
        raise exception
            'Official schedule hotfix must contain 36 matches.';
    end if;

    if exists (
        select 1
        from official_schedule_hotfix official
        left join public.matches current_match
            on least(
                current_match.team_a_id,
                current_match.team_b_id
            ) = least(
                official.team_a_id,
                official.team_b_id
            )
            and greatest(
                current_match.team_a_id,
                current_match.team_b_id
            ) = greatest(
                official.team_a_id,
                official.team_b_id
            )
        where current_match.id is null
    ) then
        raise exception
            'At least one official team pairing is missing.';
    end if;
end;
$$;

update public.matches
set
    match_day = match_day + 100,
    match_order = match_order + 100;

update public.matches as current_match
set
    score_a = case
        when current_match.team_a_id = official.team_a_id
            then current_match.score_a
        else current_match.score_b
    end,
    score_b = case
        when current_match.team_a_id = official.team_a_id
            then current_match.score_b
        else current_match.score_a
    end,
    team_a_id = official.team_a_id,
    team_b_id = official.team_b_id,
    match_day = official.match_day,
    match_order = official.match_order,
    scheduled_at = official.scheduled_at
from official_schedule_hotfix as official
where
    least(
        current_match.team_a_id,
        current_match.team_b_id
    ) = least(
        official.team_a_id,
        official.team_b_id
    )
    and greatest(
        current_match.team_a_id,
        current_match.team_b_id
    ) = greatest(
        official.team_a_id,
        official.team_b_id
    );

do $$
begin
    if exists (
        select 1
        from public.matches
        where
            match_day > 9
            or match_order > 4
            or scheduled_at is null
    ) then
        raise exception
            'Schedule hotfix did not update every match.';
    end if;
end;
$$;

commit;
