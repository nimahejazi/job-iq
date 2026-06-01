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

## Useful Commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```
