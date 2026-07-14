begin;

revoke update on public.matches
from anon, authenticated;

grant update (
    status,
    score_a,
    score_b
)
on public.matches
to anon, authenticated;

drop policy if exists
    "simple admin may update match results"
on public.matches;

create policy
    "simple admin may update match results"
on public.matches
for update
to anon, authenticated
using (true)
with check (
    (
        status = 'scheduled'
        and score_a is null
        and score_b is null
    )
    or
    (
        status = 'live'
        and score_a = 0
        and score_b = 0
    )
    or
    (
        status = 'finished'
        and (
            (
                score_a = 2
                and score_b in (0, 1)
            )
            or
            (
                score_b = 2
                and score_a in (0, 1)
            )
        )
    )
);

commit;
