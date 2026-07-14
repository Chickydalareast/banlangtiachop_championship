# BLTC Clean Rebuild Setup

## Required services

- GitHub repository
- Supabase project
- Vercel project, added only after local verification passes

## Local environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

The browser and server Supabase clients both read the publishable key above.

Do not commit `.env.local`, database passwords, secret keys or connection
strings containing passwords.

## Database source of truth

The database is rebuilt from:

```text
supabase/migrations/
supabase/seed.sql
```

The standings table is intentionally not stored.

Standings are recalculated from valid completed matches.

## Public access policy

Anonymous users may read:

- active teams;
- matches;
- tournament settings.

Anonymous and authenticated browser clients may not insert, update or delete
tournament data.

Administrative writes will be implemented through a protected server-side
route in a later step.

## Recovery order

1. Create a new Supabase project.
2. Run migrations in filename order.
3. Run `supabase/seed.sql`.
4. Configure `.env.local`.
5. Run `npm ci`.
6. Run tests, lint and production build.
7. Configure Vercel only after local verification passes.
