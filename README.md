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
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public publishable key used with Supabase Row Level Security.
- `SUPABASE_SECRET_KEY`: private server-only key for trusted backend tasks.
- `OPENAI_API_KEY`: private server-only key used by the resume profile extraction worker.
- `OPENAI_RESUME_MODEL`: optional model override for resume extraction. Defaults to `gpt-4o-mini`.
- `OPENAI_EMBEDDING_MODEL`: optional model override for resume/profile embeddings. Defaults to `text-embedding-3-small`.
- `OPENAI_EMBEDDING_DIMENSIONS`: optional embedding size override for text-embedding-3 models. Defaults to `1536`.

Keep `.env.local` private. The repository tracks `.env.example` only so future contributors know which credentials are required.

## Supabase Helpers

Supabase client helpers live in `src/lib/supabase`:

- `browser.ts`: browser/client-component client using the public publishable key.
- `server.ts`: request-scoped server client that reads auth cookies.
- `admin.ts`: server-only secret-key client for trusted backend jobs.

Do not import the admin helper into client components. It uses the secret key and bypasses Row Level Security.

## Authentication

Email/password auth pages live at `/auth/sign-up` and `/auth/sign-in`. Supabase confirmation emails should redirect back to `/auth/callback`.

Before testing auth locally, create `.env.local` from `.env.example` and fill in your Supabase project URL and publishable key. In the Supabase dashboard, confirm that email/password signups are enabled and add `http://localhost:3000/auth/callback` to the allowed redirect URLs if email confirmations are enabled.

## Storage

Resume PDFs are stored in a private Supabase Storage bucket named `resumes`. Create or update it from local credentials with:

```bash
npm run storage:setup
```

The setup script keeps the bucket private, accepts PDF files only, and limits uploads to 10 MB. You can also verify the bucket in Supabase under `Storage -> Buckets -> resumes`.

## Resume Parsing

Resume upload runs through a Next.js Server Action, stores the PDF in private Storage, creates a `resumes` row, and leaves `parse_status` as `pending`. PDF text extraction runs in a separate Node backend worker so PDF.js is not bundled into the Next.js request path.

Parse pending resumes locally with:

```bash
npm run resumes:parse
```

You can limit each run with:

```bash
npm run resumes:parse -- --limit=1
```

The parser downloads pending PDFs from the private bucket, stores extracted text in `resumes.extracted_text`, and updates `parse_status` to `complete` or `failed`.

After text extraction, the same backend worker also writes structured resume facts into `resume_entities` for skills, education, experience, certifications, titles, industries, seniority, and summary.

If `OPENAI_API_KEY` is set, the worker uses OpenAI structured outputs to extract the profile data from resume text. If the key is missing or the request fails, the worker falls back to the local heuristic extractor so parsing can still complete.

The same worker also creates a `user_embeddings` row for the current resume, using the extracted text plus structured resume facts as the embedding input. If the OpenAI key is missing, embedding storage is skipped for that run.

## User Preferences

Set job preferences in `/onboarding/preferences`. The form stores minimum salary, preferred locations, relocation preference, work modes, desired titles, excluded titles, excluded industries, employment types, and experience level in `user_preferences`.

Saving preferences also marks the user profile as onboarding complete in `profiles.onboarding_completed_at`, which lets the dashboard know the onboarding flow is finished.

## Database Extensions

Job matching will use `pgvector` for resume and job embeddings. Enable it once in Supabase with the SQL in `supabase/sql/enable_pgvector.sql`:

```sql
create extension if not exists vector with schema extensions;
```

In the Supabase dashboard, run it from `SQL Editor -> New query`. You can verify it with:

```sql
select extname, extversion, nspname
from pg_extension
join pg_namespace on pg_namespace.oid = pg_extension.extnamespace
where extname = 'vector';
```

## Database Tables

The first app schema is in `supabase/sql/create_app_tables.sql`. Run it in `Supabase Dashboard -> SQL Editor -> New query` after `pgvector` is enabled.

It creates the core tables for:

- user profiles and preferences
- uploaded resumes and extracted resume entities
- job sources and normalized jobs
- user/job embeddings
- match results, saved jobs, and resume refinements

RLS policies and performance indexes are intentionally separate checklist steps.

Add row-level security policies with `supabase/sql/add_rls_policies.sql` after the tables exist. The policies keep user-owned rows scoped to `auth.uid()`, allow authenticated users to read active jobs, and leave ingestion/admin writes to server-side secret-key clients.

Add query and vector-search indexes with `supabase/sql/add_database_indexes.sql` after RLS is applied. These indexes support user-owned lookups, active job browsing, match-score ranking, source-based ingestion queries, and pgvector cosine search.

## Local Fixture Data

Local job fixtures live in `supabase/seed.sql`. The seed adds one disabled fixture source, five active jobs, and one inactive job for testing active-job filters. It does not create fake users because user-owned rows must reference real Supabase Auth users.

If you are using the Supabase dashboard, run `supabase/sql/seed_local_data.sql` from `SQL Editor -> New query`, then run `supabase/sql/verify_seed_data.sql` to confirm the fixture counts. If you are using the Supabase CLI locally, `supabase db reset` will replay migrations and then run `supabase/seed.sql`.

## Useful Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run resumes:parse
npm run storage:setup
```

Use `npm run check` before commits to run formatting, linting, type checking, and unit tests together.
