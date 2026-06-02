-- Add a stable dedupe fingerprint so repeated job postings can be collapsed by source and content.

alter table public.jobs
add column if not exists dedupe_key text;

update public.jobs
set dedupe_key = encode(
  digest(
    lower(
      regexp_replace(
        concat_ws(
          '|',
          source_id::text,
          coalesce(company_name, ''),
          coalesce(title, ''),
          coalesce(location, ''),
          coalesce(apply_url, '')
        ),
        '\s+',
        ' ',
        'g'
      )
    ),
    'sha256'
  ),
  'hex'
)
where dedupe_key is null;

with ranked_jobs as (
  select
    id,
    row_number() over (
      partition by dedupe_key
      order by posted_at desc nulls last, created_at desc, id desc
    ) as row_number
  from public.jobs
)
delete from public.jobs
using ranked_jobs
where public.jobs.id = ranked_jobs.id
  and ranked_jobs.row_number > 1;

alter table public.jobs
alter column dedupe_key set not null;

create unique index if not exists jobs_dedupe_key_idx
on public.jobs (dedupe_key);
