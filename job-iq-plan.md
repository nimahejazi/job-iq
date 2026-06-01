# Job IQ MVP Plan

## Summary

Build Job IQ as a Next.js + Supabase web app for signed-in users who upload a resume PDF, answer job-preference questions, and receive ranked job matches across US job postings. Matching will use a hybrid score: structured filters for hard constraints plus embedding similarity for semantic resume/job fit. Resume refinement in v1 will produce targeted suggestions and rewritten bullet options, not a full resume editor or export.

Primary defaults:

- Audience: all US jobs.
- Stack: Next.js, TypeScript, Supabase Auth, Postgres, Storage, Edge/server functions.
- Job sources: aggregator-first, starting with Adzuna plus supplemental public/remote feeds.
- Privacy: store resume PDFs and extracted profile data with user-controlled deletion.
- AI: embeddings for matching, structured AI output for resume extraction/refinement.

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
