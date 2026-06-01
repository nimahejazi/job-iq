-- Quick check after running the local fixture seed.
-- Expected result: 6 total fixture jobs, 5 active fixture jobs, and 1 inactive fixture job.

select
  count(*) as total_fixture_jobs,
  count(*) filter (where jobs.is_active) as active_fixture_jobs,
  count(*) filter (where not jobs.is_active) as inactive_fixture_jobs
from public.jobs
join public.job_sources on job_sources.id = jobs.source_id
where job_sources.name = 'Job IQ Fixture Feed';

-- Expected result: only active fixture jobs, newest first.
select
  jobs.title,
  jobs.company_name,
  jobs.work_mode,
  jobs.salary_min_usd,
  jobs.salary_max_usd,
  jobs.posted_at
from public.jobs
join public.job_sources on job_sources.id = jobs.source_id
where job_sources.name = 'Job IQ Fixture Feed'
  and jobs.is_active = true
order by jobs.posted_at desc;
