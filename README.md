# Job IQ

Job IQ is a Next.js app for matching user resumes and job preferences to US job postings. The MVP will use Supabase for authentication, database storage, private resume storage, and server-side data workflows.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Environment Variables

Copy the example file before running Supabase-backed features:

```bash
cp .env.example .env.local
```

Fill in the values from your Supabase project settings:

- `NEXT_PUBLIC_SUPABASE_URL`: public project URL used by browser and server code.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public anon key used with Supabase Row Level Security.
- `SUPABASE_SERVICE_ROLE_KEY`: private server-only key for trusted backend tasks.

Keep `.env.local` private. The repository tracks `.env.example` only so future contributors know which credentials are required.

## Supabase Helpers

Supabase client helpers live in `src/lib/supabase`:

- `browser.ts`: browser/client-component client using the public anon key.
- `server.ts`: request-scoped server client that reads auth cookies.
- `admin.ts`: server-only service-role client for trusted backend jobs.

Do not import the admin helper into client components. It uses the service-role key and bypasses Row Level Security.

## Useful Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Use `npm run check` before commits to run formatting, linting, type checking, and unit tests together.
