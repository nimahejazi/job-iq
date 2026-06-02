# Job IQ MVP Plan

## Summary

Build Job IQ as a Next.js + Supabase web app for signed-in users who upload a resume PDF, answer job-preference questions, and receive ranked job matches across US job postings. Matching will use a hybrid score: structured filters for hard constraints plus embedding similarity for semantic resume/job fit. Resume refinement in v1 will produce targeted suggestions and rewritten bullet options, not a full resume editor or export.

Primary defaults:

- Audience: all US jobs.
- Stack: Next.js, TypeScript, Supabase Auth, Postgres, Storage, Edge/server functions.
- Job sources: aggregator-first, starting with Adzuna plus supplemental public/remote feeds.
- Privacy: store resume PDFs and extracted profile data with user-controlled deletion.
- AI: embeddings for matching, structured AI output for resume extraction/refinement.

## TODO Checklist

### 1. Project Foundation

- [x] Create the Next.js app with TypeScript.
- [x] Add the core UI/component styling approach.
- [x] Configure Supabase project credentials in environment variables.
- [x] Install and configure Supabase client helpers.
- [x] Create base app layout, navigation, and authenticated dashboard shell.
- [x] Add basic error, loading, and empty-state components.
- [x] Set up linting, formatting, and test commands.

### 2. Supabase Auth, Storage, And Database

- [x] Configure Supabase Auth for email/password sign up and sign in.
- [x] Create private Supabase Storage bucket for resume PDFs.
- [x] Enable `pgvector` in Supabase Postgres.
- [x] Create database tables for profiles, resumes, resume entities, preferences, jobs, embeddings, matches, saved jobs, and refinements.
- [x] Add row-level security policies for all user-owned tables.
- [x] Add indexes for user IDs, job source IDs, active jobs, match scores, and vector search.
- [x] Add seed or fixture data for local testing.

### 3. Resume Upload And Parsing

- [x] Build `/onboarding/resume` upload UI for PDF files.
- [x] Validate file type and file size before upload.
- [x] Upload resumes to the private Supabase bucket.
- [x] Store resume metadata in the `resumes` table.
- [x] Extract text from uploaded PDFs.
- [x] Handle parsing states: pending, processing, complete, failed.
- [x] Add retry behavior for failed resume parsing.

### 4. Profile Extraction

- [x] Define structured schema for extracted skills, education, experience, certifications, titles, industries, seniority, and summary.
- [x] Use AI structured output to extract profile data from resume text.
- [x] Store extracted entities in `resume_entities`.
- [x] Build editable profile UI in `/profile`.
- [ ] Let users add, remove, or correct extracted skills, education, and experience.
- [ ] Generate and store a user profile/resume embedding.

### 5. User Preferences

- [ ] Build `/onboarding/preferences` form.
- [ ] Store minimum salary, preferred locations, relocation preference, remote/hybrid/on-site preference, desired titles, exclusions, employment type, and experience level.
- [ ] Validate salary and location inputs.
- [ ] Let users edit preferences after onboarding.
- [ ] Use preferences to decide whether onboarding is complete.

### 6. Job Source Integration

- [ ] Register for Adzuna API credentials.
- [ ] Create server-side Adzuna API client.
- [ ] Normalize Adzuna jobs into the local `jobs` schema.
- [ ] Add ingestion status tracking in `job_sources`.
- [ ] Implement deduplication by source, company, title, location, and apply URL.
- [ ] Add scheduled or manually triggered job sync.
- [ ] Add supplemental remote/public feeds after Adzuna is working.
- [ ] Add USAJOBS as an optional source later if federal jobs are desired.
- [ ] Defer Greenhouse/Lever curated-company ingestion until after broad search works.

### 7. Job Embeddings And Ranking

- [ ] Generate embeddings for normalized job descriptions.
- [ ] Store job vectors in `job_embeddings`.
- [ ] Implement `pgvector` nearest-neighbor search.
- [ ] Implement 0-100 matching score calculation.
- [ ] Include semantic similarity, skill overlap, title alignment, location/remote fit, salary fit, seniority fit, and freshness in the score.
- [ ] Redistribute salary weight when salary is unknown.
- [ ] Cap scores for hard location or work-mode conflicts.
- [ ] Exclude expired, hidden, duplicate, or apply-link-missing jobs.
- [ ] Store match results and score breakdowns in `job_matches`.

### 8. Jobs UI

- [ ] Build `/jobs` ranked job list.
- [ ] Show score, explanation, company, title, location, salary, source, and freshness.
- [ ] Add filters for remote mode, location, salary, source, and saved/dismissed state.
- [ ] Build `/jobs/[id]` detail page.
- [ ] Show full job description, matched skills, missing skills, requirements, and score breakdown.
- [ ] Add "Apply" button that opens the source application URL.
- [ ] Add save, dismiss, and applied status tracking.

### 9. Resume Refinement

- [ ] Add "Refine my resume" action from job list/detail.
- [ ] Define AI output schema for match summary, missing skills, suggested keywords, rewritten bullets, and warnings.
- [ ] Generate suggestions using only the user's actual resume/profile data and the selected job.
- [ ] Add guardrails against invented experience, credentials, employers, degrees, or dates.
- [ ] Store refinement results in `resume_refinements`.
- [ ] Build UI to review generated suggestions and rewritten bullet options.
- [ ] Keep the original resume PDF unchanged in v1.

### 10. Privacy, Settings, And Deletion

- [ ] Build `/settings/privacy`.
- [ ] Add resume deletion flow.
- [ ] Add extracted profile data deletion flow.
- [ ] Add refinement deletion flow.
- [ ] Add account data deletion flow.
- [ ] Use signed URLs for private resume access.
- [ ] Ensure third-party API keys are never exposed to the browser.
- [ ] Add clear upload notice explaining AI processing of resumes.

### 11. Observability And Admin Basics

- [ ] Track job source sync status and last successful sync time.
- [ ] Track parsing and matching failures.
- [ ] Track AI usage by internal request IDs.
- [ ] Add basic cost/usage logging for embeddings and resume refinement.
- [ ] Add lightweight admin/source health view if needed.

### 12. Testing And Acceptance

- [ ] Add unit tests for score calculation.
- [ ] Add unit tests for salary compatibility.
- [ ] Add unit tests for location and remote preference matching.
- [ ] Add unit tests for job normalization and deduplication.
- [ ] Add unit tests for resume extraction schema validation.
- [ ] Add integration tests for sign up and sign in.
- [ ] Add integration tests for resume upload, parse, and profile extraction.
- [ ] Add integration tests for preference saving.
- [ ] Add integration tests for mocked job ingestion.
- [ ] Add integration tests for match generation.
- [ ] Add integration tests for resume refinement.
- [ ] Add integration tests for resume and account data deletion.
- [ ] Add UI tests for onboarding, ranked jobs, job detail, refine action, and apply redirect.
- [ ] Confirm a new user can sign up, upload a PDF, answer preferences, and see ranked jobs.
- [ ] Confirm every job match has a score and human-readable explanation.
- [ ] Confirm private resume files and API keys are not exposed to the browser.

## Key Product Flows

### Auth

- Users sign up/sign in with email/password and optionally OAuth later.
- All resumes, preferences, matches, and saved jobs are scoped to the authenticated user.

### Onboarding

- User uploads a resume PDF.
- App extracts text from the PDF.
- AI/parser extracts structured profile data: skills, education, experience, job titles, industries, seniority, certifications, and summary.
- User answers preferences:
  - minimum desired salary
  - preferred locations
  - willing to relocate
  - remote/hybrid/on-site
  - desired titles or keywords
  - excluded titles/industries
  - employment type
  - experience level
- User can edit extracted skills, education, and experience before matching.

### Job Search And Matching

- App fetches jobs from external APIs into the local database on a schedule.
- Jobs are normalized into a common schema.
- Job descriptions are embedded.
- User profile/resume is embedded.
- User receives ranked jobs using:
  - semantic similarity between resume/profile and job text
  - skill overlap
  - title/industry relevance
  - salary compatibility when salary is present
  - location and remote/hybrid preference fit
  - experience/seniority fit
  - freshness of posting
- UI shows a ranked job list with score, short explanation, company, title, location, salary if available, source, and apply link.

### Job Detail

- User can open a job detail page/modal.
- Detail includes full description, requirements, match breakdown, missing skills, matched skills, salary/location info, and source link.
- "Apply" opens the original posting/application URL in a new tab.
- "Refine my resume" generates job-specific resume suggestions.

### Resume Refinement

- For a selected job, generate:
  - match summary
  - top missing or under-emphasized skills
  - suggested resume keywords
  - rewritten bullet options based on the user's real experience
  - warnings when the job asks for experience not present in the resume
- Do not invent experience, credentials, employers, degrees, or dates.
- Keep the original resume file unchanged in v1.

## Implementation Changes

### Frontend

- Use Next.js App Router.
- Pages:
  - `/` dashboard with onboarding state and latest matches
  - `/auth/sign-in`
  - `/auth/sign-up`
  - `/onboarding/resume`
  - `/onboarding/preferences`
  - `/jobs`
  - `/jobs/[id]`
  - `/profile`
  - `/settings/privacy`
- Core UI states:
  - no resume uploaded
  - resume parsing in progress
  - parsing failed with retry
  - no matches yet
  - job source sync unavailable
  - empty filters result
  - resume deletion confirmation

### Backend/API

- Next.js route handlers or Supabase Edge Functions for:
  - resume upload finalization
  - PDF text extraction
  - profile extraction
  - embedding generation
  - job ingestion
  - match generation
  - resume refinement
  - delete account/user data
- Keep third-party API keys server-side only.

### Database

- Use Supabase Postgres with `pgvector`.
- Main tables:
  - `profiles`: user-level metadata
  - `resumes`: file path, extracted text, parsed status, active version
  - `resume_entities`: skills, education, experience, certifications, titles
  - `user_preferences`: salary, locations, remote mode, employment type, exclusions
  - `job_sources`: source name, credentials status, sync config
  - `jobs`: normalized job records
  - `job_embeddings`: vector per job
  - `user_embeddings`: vector per active resume/profile
  - `job_matches`: score, score breakdown, generated explanation, timestamps
  - `saved_jobs`: saved/dismissed/applied status
  - `resume_refinements`: generated suggestions per user/job/resume version
- Add row-level security so users can only access their own profile, resumes, matches, saved jobs, and refinements.

### Job APIs

- Start with Adzuna as the main aggregator because its API supports job-ad search after app registration.
- Add Remotive/Career Nest-style remote feeds as supplemental sources if useful for coverage.
- Add USAJOBS as an optional source for federal jobs; it requires an API key and user-agent header.
- Add Greenhouse/Lever ingestion later for curated company boards, because they expose public company-specific job board APIs but are not broad job search aggregators.
- External source references:
  - Adzuna docs: https://developer.adzuna.com/overview
  - USAJOBS docs: https://developer.usajobs.gov/api-reference/
  - Greenhouse Job Board API: https://developers.greenhouse.io/job-board
  - Lever Postings API: https://github.com/lever/postings-api

### AI And Matching

- Use OpenAI embeddings for resume/profile and job descriptions.
- Store embeddings in `pgvector` and query nearest neighbors before applying final ranking logic.
- Use structured AI output for resume/profile extraction and resume refinement so the app receives predictable JSON.
- OpenAI references:
  - Embeddings: https://platform.openai.com/docs/guides/embeddings
  - Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
  - PDF file inputs: https://platform.openai.com/docs/guides/pdf-files

## Matching Score

Use a 0-100 score with a stored breakdown:

- 35% semantic similarity between resume/profile and job description
- 20% skill overlap
- 15% title/role alignment
- 10% location/remote preference fit
- 10% salary compatibility
- 5% experience/seniority fit
- 5% posting freshness

Rules:

- If salary is missing, do not punish heavily; mark salary as unknown and redistribute part of the salary weight across semantic and skill fit.
- If location conflicts with a hard user preference, cap the score.
- If a job is expired, hidden, duplicate, or missing an apply URL, exclude it from active results.
- Store explanations such as "Strong skill match, salary unknown, remote preference satisfied."

## Security And Privacy

- Store PDFs in private Supabase Storage buckets.
- Never expose raw storage URLs publicly; use signed URLs when needed.
- Encrypt or protect API keys through environment variables.
- Add user controls to:
  - delete a resume
  - delete extracted profile data
  - delete generated refinements
  - delete account data
- Log AI requests by internal IDs, not raw resume text, where feasible.
- Include a clear privacy note before upload: resumes may be processed by AI services for parsing, matching, and refinement.

## Milestones

1. Foundation
   - Create Next.js + Supabase project.
   - Configure Auth, Storage, Postgres, RLS, and environment variables.
   - Build signed-in dashboard shell.
2. Resume Intake
   - PDF upload.
   - PDF text extraction.
   - AI structured extraction.
   - Editable skills, education, and experience profile.
3. Preferences
   - Build preference form.
   - Store salary, location, remote/hybrid/on-site, title keywords, exclusions, and employment type.
4. Job Ingestion
   - Implement Adzuna ingestion.
   - Normalize jobs into local schema.
   - Add scheduled sync.
   - Add deduplication by source, company, title, location, and apply URL.
5. Embeddings + Ranking
   - Generate embeddings for jobs and user profiles.
   - Add `pgvector` search.
   - Implement score calculation and score breakdown.
   - Store match results.
6. Job UI
   - Ranked list.
   - Filters.
   - Job detail view.
   - Apply redirect.
   - Save/dismiss/apply tracking.
7. Resume Refinement
   - Generate job-specific suggestions and rewritten bullets.
   - Store refinement history.
   - Add guardrails against invented experience.
8. Polish + Observability
   - Loading/error states.
   - Sync status.
   - Basic admin/source health view.
   - Cost and usage logging for AI calls.

## Test Plan

- Unit tests:
  - score calculation
  - salary compatibility
  - location/remote preference matching
  - job normalization
  - duplicate detection
  - resume extraction schema validation
- Integration tests:
  - sign up/sign in flow
  - resume upload and parse flow
  - preference save flow
  - job ingestion mock flow
  - embedding generation mock flow
  - match generation flow
  - resume refinement flow
  - delete resume/user data flow
- UI tests:
  - onboarding incomplete state
  - parsing loading/error state
  - ranked jobs list
  - job detail page
  - refine resume action
  - apply redirect link
- Acceptance criteria:
  - A new user can sign up, upload a PDF, answer preferences, and see ranked jobs.
  - Every job match has a score and human-readable explanation.
  - User can open details and click through to apply.
  - User can generate resume refinement suggestions for a job.
  - User can delete resume data.
  - API keys and private resume files are not exposed to the browser.

## Assumptions

- v1 is web-only, responsive for desktop and mobile.
- Applying means redirecting to the original job site, not submitting applications inside Job IQ.
- Resume refinement produces suggestions and rewritten bullets only; no PDF/DOCX export in v1.
- The first production job source is Adzuna, assuming you obtain a free API key/app registration.
- The app can use OpenAI-compatible AI services for embeddings and resume refinement.
- All US jobs is the target, but match quality will be strongest where postings include rich descriptions, salary, and location metadata.
