# BLTC Local Setup

## Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
NEXT_PUBLIC_ADMIN_USERNAME=admin
NEXT_PUBLIC_ADMIN_PASSWORD=<admin-password>
```

## Admin behavior

The V1 admin screen uses a simple browser-side username/password gate.

The official 36-match schedule is fixed. Admin may only:

- start a match;
- finish with 2-0, 2-1, 1-2 or 0-2;
- correct a result;
- reset a match to scheduled.

Admin cannot create or delete matches.

## Database

Anonymous browser clients may read tournament data and update only these
`matches` columns:

- `status`
- `score_a`
- `score_b`

Database checks reject invalid BO3 score states.

## Verification

```text
npm run seed:verify
npm run test:run
npm run lint
npm run build
```
