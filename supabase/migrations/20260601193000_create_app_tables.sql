-- Core Job IQ schema.
-- RLS policies and performance indexes are handled in separate checklist steps.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per authenticated user for app-level profile metadata.';

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_bucket text not null default 'resumes',
  storage_path text not null,
  original_file_name text not null,
  content_type text not null default 'application/pdf',
  file_size_bytes bigint not null check (file_size_bytes > 0),
  extracted_text text,
  parse_status text not null default 'pending' check (
    parse_status in ('pending', 'processing', 'complete', 'failed')
  ),
  parse_error text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

comment on table public.resumes is
  'Uploaded resume PDF metadata plus extracted text and parsing state.';

create table if not exists public.resume_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  resume_id uuid references public.resumes (id) on delete cascade,
  entity_type text not null check (
    entity_type in (
      'skill',
      'education',
      'experience',
      'certification',
      'title',
      'industry',
      'seniority',
      'summary'
    )
  ),
  label text not null,
  description text,
  start_date date,
  end_date date,
  source text not null default 'resume' check (
    source in ('resume', 'user', 'ai')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.resume_entities is
  'Editable structured facts extracted from resumes or added by users.';

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  min_salary_usd integer check (min_salary_usd is null or min_salary_usd >= 0),
  preferred_locations text[] not null default '{}'::text[],
  willing_to_relocate boolean not null default false,
  work_modes text[] not null default '{}'::text[],
  desired_titles text[] not null default '{}'::text[],
  excluded_titles text[] not null default '{}'::text[],
  excluded_industries text[] not null default '{}'::text[],
  employment_types text[] not null default '{}'::text[],
  experience_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_preferences is
  'User-controlled matching preferences for salary, location, work mode, and role filters.';

create table if not exists public.job_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  source_type text not null check (
    source_type in ('aggregator', 'public_feed', 'ats', 'government')
  ),
  base_url text,
  sync_enabled boolean not null default true,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.job_sources is
  'External job data providers such as Adzuna, remote feeds, USAJOBS, Greenhouse, or Lever.';

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.job_sources (id) on delete restrict,
  external_id text not null,
  dedupe_key text not null,
  title text not null,
  company_name text not null,
  description text,
  requirements text,
  apply_url text not null,
  location text,
  country_code text,
  work_mode text check (work_mode in ('remote', 'hybrid', 'onsite', 'unknown')),
  employment_type text,
  salary_min_usd integer check (salary_min_usd is null or salary_min_usd >= 0),
  salary_max_usd integer check (salary_max_usd is null or salary_max_usd >= 0),
  salary_period text,
  seniority text,
  industry text,
  skills text[] not null default '{}'::text[],
  posted_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_id),
  unique (dedupe_key),
  check (
    salary_min_usd is null
    or salary_max_usd is null
    or salary_min_usd <= salary_max_usd
  )
);

comment on table public.jobs is
  'Normalized job postings ingested from external providers.';

create table if not exists public.job_embeddings (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  embedding_model text not null,
  embedding_dimensions integer not null default 1536,
  embedding extensions.vector(1536) not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.job_embeddings is
  'Semantic embedding for each normalized job posting.';

create table if not exists public.user_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  resume_id uuid references public.resumes (id) on delete cascade,
  embedding_model text not null,
  embedding_dimensions integer not null default 1536,
  embedding extensions.vector(1536) not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, resume_id, embedding_model)
);

comment on table public.user_embeddings is
  'Semantic embedding for a user profile or active resume version.';

create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  resume_id uuid references public.resumes (id) on delete set null,
  score numeric(5, 2) not null check (score >= 0 and score <= 100),
  score_breakdown jsonb not null default '{}'::jsonb,
  explanation text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, job_id, resume_id)
);

comment on table public.job_matches is
  'Stored ranked match results and score explanations for a user/job/resume combination.';

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  status text not null default 'saved' check (
    status in ('saved', 'dismissed', 'applied')
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

comment on table public.saved_jobs is
  'User job state for saved, dismissed, and applied postings.';

create table if not exists public.resume_refinements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  resume_id uuid references public.resumes (id) on delete set null,
  job_id uuid not null references public.jobs (id) on delete cascade,
  match_summary text,
  missing_skills text[] not null default '{}'::text[],
  suggested_keywords text[] not null default '{}'::text[],
  rewritten_bullets jsonb not null default '[]'::jsonb,
  warnings text[] not null default '{}'::text[],
  model text,
  created_at timestamptz not null default now()
);

comment on table public.resume_refinements is
  'Job-specific resume improvement suggestions generated from real user experience.';
