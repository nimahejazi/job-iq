-- Performance indexes for the first Job IQ schema.
-- These support the expected app paths: user-owned rows, active job browsing,
-- ranked match lists, source-based ingestion checks, and semantic vector search.

-- Resume queries usually start from the signed-in user and often need the active file first.
create index if not exists resumes_user_id_idx
on public.resumes (user_id);

create index if not exists resumes_user_active_created_idx
on public.resumes (user_id, is_active, created_at desc);

-- Resume entities are loaded by user profile screens and by resume-specific parsing flows.
create index if not exists resume_entities_user_id_idx
on public.resume_entities (user_id);

create index if not exists resume_entities_resume_id_idx
on public.resume_entities (resume_id);

create index if not exists resume_entities_user_type_idx
on public.resume_entities (user_id, entity_type);

-- Job source indexes help ingestion jobs find enabled providers and upsert source rows.
create index if not exists job_sources_sync_enabled_idx
on public.job_sources (sync_enabled);

create index if not exists jobs_source_id_idx
on public.jobs (source_id);

create unique index if not exists jobs_dedupe_key_idx
on public.jobs (dedupe_key);

create index if not exists jobs_source_active_posted_idx
on public.jobs (source_id, is_active, posted_at desc);

-- Active job indexes keep the main job list and matching candidate queries fast.
create index if not exists jobs_active_posted_idx
on public.jobs (posted_at desc)
where is_active = true;

create index if not exists jobs_active_work_mode_idx
on public.jobs (work_mode, posted_at desc)
where is_active = true;

-- Vector indexes power nearest-neighbor search between jobs and user/resume embeddings.
create index if not exists job_embeddings_embedding_hnsw_idx
on public.job_embeddings
using hnsw (embedding extensions.vector_cosine_ops);

create index if not exists user_embeddings_user_id_idx
on public.user_embeddings (user_id);

create index if not exists user_embeddings_resume_id_idx
on public.user_embeddings (resume_id);

create index if not exists user_embeddings_embedding_hnsw_idx
on public.user_embeddings
using hnsw (embedding extensions.vector_cosine_ops);

-- Match indexes support the ranked dashboard list and job-level recalculation checks.
create index if not exists job_matches_user_score_idx
on public.job_matches (user_id, score desc, generated_at desc);

create index if not exists job_matches_job_id_idx
on public.job_matches (job_id);

-- Saved-job and refinement indexes keep user-specific follow-up pages responsive.
create index if not exists saved_jobs_user_status_idx
on public.saved_jobs (user_id, status, created_at desc);

create index if not exists saved_jobs_job_id_idx
on public.saved_jobs (job_id);

create index if not exists resume_refinements_user_created_idx
on public.resume_refinements (user_id, created_at desc);

create index if not exists resume_refinements_job_id_idx
on public.resume_refinements (job_id);
