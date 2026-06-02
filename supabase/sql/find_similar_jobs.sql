-- Search active jobs by vector similarity for the current ranking pipeline.

create or replace function public.find_similar_jobs(
  query_embedding extensions.vector(1536),
  match_count integer default 10
)
returns table (
  job_id uuid,
  similarity numeric,
  distance numeric,
  title text,
  company_name text,
  location text,
  work_mode text,
  salary_min_usd integer,
  salary_max_usd integer,
  posted_at timestamptz
)
language sql
stable
as $$
  select
    jobs.id as job_id,
    1 - (job_embeddings.embedding <=> query_embedding) as similarity,
    (job_embeddings.embedding <=> query_embedding) as distance,
    jobs.title,
    jobs.company_name,
    jobs.location,
    jobs.work_mode,
    jobs.salary_min_usd,
    jobs.salary_max_usd,
    jobs.posted_at
  from public.job_embeddings
  join public.jobs on jobs.id = job_embeddings.job_id
  where jobs.is_active = true
  order by job_embeddings.embedding <=> query_embedding asc
  limit greatest(1, least(match_count, 100));
$$;
