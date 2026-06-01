-- Row-level security keeps user-owned data private when accessed with browser-safe keys.
-- Service/secret-key backend jobs still bypass RLS for trusted ingestion and automation.

alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_entities enable row level security;
alter table public.user_preferences enable row level security;
alter table public.job_sources enable row level security;
alter table public.jobs enable row level security;
alter table public.job_embeddings enable row level security;
alter table public.user_embeddings enable row level security;
alter table public.job_matches enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.resume_refinements enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
on public.profiles
for delete
to authenticated
using (id = auth.uid());

drop policy if exists "Users can read their own resumes" on public.resumes;
create policy "Users can read their own resumes"
on public.resumes
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own resumes" on public.resumes;
create policy "Users can insert their own resumes"
on public.resumes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own resumes" on public.resumes;
create policy "Users can update their own resumes"
on public.resumes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own resumes" on public.resumes;
create policy "Users can delete their own resumes"
on public.resumes
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can read their own resume entities" on public.resume_entities;
create policy "Users can read their own resume entities"
on public.resume_entities
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own resume entities" on public.resume_entities;
create policy "Users can insert their own resume entities"
on public.resume_entities
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own resume entities" on public.resume_entities;
create policy "Users can update their own resume entities"
on public.resume_entities
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own resume entities" on public.resume_entities;
create policy "Users can delete their own resume entities"
on public.resume_entities
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can read their own preferences" on public.user_preferences;
create policy "Users can read their own preferences"
on public.user_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own preferences" on public.user_preferences;
create policy "Users can insert their own preferences"
on public.user_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
on public.user_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own preferences" on public.user_preferences;
create policy "Users can delete their own preferences"
on public.user_preferences
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Authenticated users can read job sources" on public.job_sources;
create policy "Authenticated users can read job sources"
on public.job_sources
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read active jobs" on public.jobs;
create policy "Authenticated users can read active jobs"
on public.jobs
for select
to authenticated
using (is_active = true);

drop policy if exists "Authenticated users can read active job embeddings" on public.job_embeddings;
create policy "Authenticated users can read active job embeddings"
on public.job_embeddings
for select
to authenticated
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = job_embeddings.job_id
      and jobs.is_active = true
  )
);

drop policy if exists "Users can read their own embeddings" on public.user_embeddings;
create policy "Users can read their own embeddings"
on public.user_embeddings
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own embeddings" on public.user_embeddings;
create policy "Users can insert their own embeddings"
on public.user_embeddings
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own embeddings" on public.user_embeddings;
create policy "Users can update their own embeddings"
on public.user_embeddings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own embeddings" on public.user_embeddings;
create policy "Users can delete their own embeddings"
on public.user_embeddings
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can read their own matches" on public.job_matches;
create policy "Users can read their own matches"
on public.job_matches
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own matches" on public.job_matches;
create policy "Users can insert their own matches"
on public.job_matches
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own matches" on public.job_matches;
create policy "Users can update their own matches"
on public.job_matches
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own matches" on public.job_matches;
create policy "Users can delete their own matches"
on public.job_matches
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can read their own saved jobs" on public.saved_jobs;
create policy "Users can read their own saved jobs"
on public.saved_jobs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own saved jobs" on public.saved_jobs;
create policy "Users can insert their own saved jobs"
on public.saved_jobs
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own saved jobs" on public.saved_jobs;
create policy "Users can update their own saved jobs"
on public.saved_jobs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own saved jobs" on public.saved_jobs;
create policy "Users can delete their own saved jobs"
on public.saved_jobs
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can read their own resume refinements" on public.resume_refinements;
create policy "Users can read their own resume refinements"
on public.resume_refinements
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own resume refinements" on public.resume_refinements;
create policy "Users can insert their own resume refinements"
on public.resume_refinements
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own resume refinements" on public.resume_refinements;
create policy "Users can update their own resume refinements"
on public.resume_refinements
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own resume refinements" on public.resume_refinements;
create policy "Users can delete their own resume refinements"
on public.resume_refinements
for delete
to authenticated
using (user_id = auth.uid());

