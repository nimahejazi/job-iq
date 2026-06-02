import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCandidateProfileFromResumeEntities } from "./match-results";
import type { Database, Json } from "../supabase/database.types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type ResumeEntityRow = Database["public"]["Tables"]["resume_entities"]["Row"];
type SavedJobRow = Database["public"]["Tables"]["saved_jobs"]["Row"];
type JobSourcePreview = Pick<
  Database["public"]["Tables"]["job_sources"]["Row"],
  "name" | "source_type"
>;

type ScoreComponent = {
  available: boolean;
  baseWeight: number;
  score: number;
};

export type ScoreBreakdown = {
  appliedWeights: Record<string, number>;
  cap: number | null;
  components: Record<string, ScoreComponent>;
  exclusions: string[];
  rawScore: number;
};

export type JobMatchView = {
  applyUrl: string;
  companyName: string;
  description: string | null;
  explanation: string | null;
  generatedAt: string;
  jobId: string;
  location: string | null;
  matchId: string;
  salaryMaxUsd: number | null;
  salaryMinUsd: number | null;
  postedAt: string | null;
  requirements: string | null;
  resumeId: string | null;
  salaryText: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  sourceName: string;
  sourceType: JobSourcePreview["source_type"] | null;
  skills: string[];
  title: string;
  workMode: JobRow["work_mode"];
  jobStatus: SavedJobRow["status"] | null;
};

export type JobMatchDetailView = JobMatchView & {
  candidateIndustries: string[];
  candidateSeniority: string | null;
  candidateSkills: string[];
  candidateTitles: string[];
  matchedSkills: string[];
  missingSkills: string[];
};

export type JobMatchFilterState = {
  location: string;
  minSalaryUsd: number | null;
  sourceName: string;
  workMode: "all" | "hybrid" | "onsite" | "remote";
};

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatSalaryRange(
  job: Pick<JobRow, "salary_min_usd" | "salary_max_usd" | "salary_period">,
) {
  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "USD",
  });

  if (job.salary_min_usd === null && job.salary_max_usd === null) {
    return "Salary not listed";
  }

  if (job.salary_min_usd !== null && job.salary_max_usd !== null) {
    return `${formatter.format(job.salary_min_usd)} - ${formatter.format(job.salary_max_usd)}${job.salary_period ? ` / ${job.salary_period}` : ""}`;
  }

  const value = job.salary_min_usd ?? job.salary_max_usd ?? 0;
  return `${formatter.format(value)}${job.salary_period ? ` / ${job.salary_period}` : ""}`;
}

function formatRelativeDate(dateValue: string | null) {
  if (!dateValue) {
    return "Date unavailable";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  const now = new Date();
  const deltaDays = Math.round(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
  });

  if (Math.abs(deltaDays) >= 30) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  if (Math.abs(deltaDays) >= 7) {
    return formatter.format(Math.round(deltaDays / 7), "week");
  }

  if (deltaDays === 0) {
    return "today";
  }

  return formatter.format(deltaDays, "day");
}

function getSourceName(source: JobSourcePreview | undefined) {
  return source?.name ?? "Unknown source";
}

function getTopSignals(scoreBreakdown: ScoreBreakdown) {
  return Object.entries(scoreBreakdown.components)
    .filter(([, component]) => component.available && component.score >= 0.5)
    .sort((left, right) => right[1].score - left[1].score)
    .slice(0, 3)
    .map(([key, component]) => ({
      label:
        key === "semantic_similarity"
          ? "semantic fit"
          : key === "skill_overlap"
            ? "skill overlap"
            : key === "title_alignment"
              ? "title alignment"
              : key === "location_fit"
                ? "location fit"
                : key === "salary_fit"
                  ? "salary fit"
                  : key === "seniority_fit"
                    ? "seniority fit"
                    : "freshness",
      score: component.score,
    }));
}

function buildScoreBreakdown(rawBreakdown: Json): ScoreBreakdown {
  const breakdown =
    rawBreakdown &&
    typeof rawBreakdown === "object" &&
    !Array.isArray(rawBreakdown)
      ? rawBreakdown
      : {};

  return {
    appliedWeights:
      "appliedWeights" in breakdown &&
      breakdown.appliedWeights &&
      typeof breakdown.appliedWeights === "object" &&
      !Array.isArray(breakdown.appliedWeights)
        ? (breakdown.appliedWeights as Record<string, number>)
        : {},
    cap:
      typeof breakdown.cap === "number" || breakdown.cap === null
        ? breakdown.cap
        : null,
    components:
      "components" in breakdown &&
      breakdown.components &&
      typeof breakdown.components === "object" &&
      !Array.isArray(breakdown.components)
        ? (breakdown.components as Record<string, ScoreComponent>)
        : {},
    exclusions:
      Array.isArray(breakdown.exclusions) &&
      breakdown.exclusions.every((value) => typeof value === "string")
        ? (breakdown.exclusions as string[])
        : [],
    rawScore: typeof breakdown.rawScore === "number" ? breakdown.rawScore : 0,
  };
}

export async function loadLatestJobMatchViewsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<JobMatchView[]> {
  const { data: matches, error: matchesError } = await supabase
    .from("job_matches")
    .select(
      "id, job_id, resume_id, score, score_breakdown, explanation, generated_at",
    )
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .order("score", { ascending: false })
    .limit(100);

  if (matchesError) {
    throw matchesError;
  }

  if (!matches?.length) {
    return [];
  }

  const latestGeneratedAt = matches[0].generated_at;
  const latestMatches = matches.filter(
    (match) => match.generated_at === latestGeneratedAt,
  );
  const jobIds = latestMatches.map((match) => match.job_id);

  const [
    { data: jobs, error: jobsError },
    { data: sources, error: sourcesError },
    { data: savedJobs, error: savedJobsError },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, apply_url, company_name, description, location, posted_at, salary_max_usd, salary_min_usd, salary_period, skills, source_id, title, work_mode, requirements",
      )
      .in("id", jobIds),
    supabase.from("job_sources").select("id, name, source_type"),
    supabase
      .from("saved_jobs")
      .select("job_id, status")
      .eq("user_id", userId)
      .in("job_id", jobIds),
  ]);

  if (jobsError) {
    throw jobsError;
  }

  if (sourcesError) {
    throw sourcesError;
  }

  if (savedJobsError) {
    throw savedJobsError;
  }

  const jobsById = new Map((jobs ?? []).map((job) => [job.id, job]));
  const sourcesById = new Map(
    (sources ?? []).map((source) => [source.id, source]),
  );
  const savedJobsById = new Map(
    (savedJobs ?? []).map((savedJob) => [savedJob.job_id, savedJob.status]),
  );

  return latestMatches
    .map((match) => {
      const job = jobsById.get(match.job_id);

      if (!job) {
        return null;
      }

      const source = sourcesById.get(job.source_id);

      return {
        applyUrl: job.apply_url,
        companyName: job.company_name,
        description: job.description,
        explanation: match.explanation,
        generatedAt: match.generated_at,
        jobId: job.id,
        location: job.location,
        matchId: match.id,
        salaryMaxUsd: job.salary_max_usd,
        salaryMinUsd: job.salary_min_usd,
        postedAt: job.posted_at,
        requirements: job.requirements,
        resumeId: match.resume_id,
        salaryText: formatSalaryRange(job),
        score: match.score,
        scoreBreakdown: buildScoreBreakdown(match.score_breakdown),
        sourceName: getSourceName(source),
        sourceType: source?.source_type ?? null,
        jobStatus: savedJobsById.get(job.id) ?? null,
        skills: job.skills ?? [],
        title: job.title,
        workMode: job.work_mode,
      };
    })
    .filter((value): value is JobMatchView => Boolean(value));
}

export function parseJobMatchFilters(
  searchParams: Record<string, string | string[] | undefined>,
): JobMatchFilterState {
  const location =
    typeof searchParams.location === "string"
      ? searchParams.location.trim()
      : "";
  const sourceName =
    typeof searchParams.source === "string" ? searchParams.source.trim() : "";
  const workModeCandidate =
    typeof searchParams.work_mode === "string"
      ? searchParams.work_mode.trim().toLowerCase()
      : "all";
  const minSalaryText =
    typeof searchParams.min_salary_usd === "string"
      ? searchParams.min_salary_usd.trim()
      : "";
  const parsedMinSalary = minSalaryText ? Number(minSalaryText) : null;

  return {
    location,
    minSalaryUsd:
      parsedMinSalary !== null && Number.isFinite(parsedMinSalary)
        ? Math.max(0, Math.floor(parsedMinSalary))
        : null,
    sourceName,
    workMode:
      workModeCandidate === "remote" ||
      workModeCandidate === "hybrid" ||
      workModeCandidate === "onsite"
        ? workModeCandidate
        : "all",
  };
}

function jobMatchesSalaryFilter(
  job: JobMatchView,
  minSalaryUsd: number | null,
) {
  if (minSalaryUsd === null) {
    return true;
  }

  const floor = job.salaryMinUsd ?? job.salaryMaxUsd;

  if (floor === null) {
    return false;
  }

  return floor >= minSalaryUsd || (job.salaryMaxUsd ?? 0) >= minSalaryUsd;
}

export function filterJobMatchViews(
  matches: JobMatchView[],
  filters: JobMatchFilterState,
) {
  const locationNeedle = filters.location.toLowerCase();
  const sourceNeedle = filters.sourceName.toLowerCase();

  return matches.filter((match) => {
    const location = match.location?.toLowerCase() ?? "";
    const source = match.sourceName.toLowerCase();

    if (filters.workMode !== "all" && match.workMode !== filters.workMode) {
      return false;
    }

    if (locationNeedle && !location.includes(locationNeedle)) {
      return false;
    }

    if (sourceNeedle && !source.includes(sourceNeedle)) {
      return false;
    }

    if (!jobMatchesSalaryFilter(match, filters.minSalaryUsd)) {
      return false;
    }

    return true;
  });
}

export function getJobMatchSourceNames(matches: JobMatchView[]) {
  return [...new Set(matches.map((match) => match.sourceName))].sort(
    (left, right) => left.localeCompare(right),
  );
}

export async function loadJobMatchDetailForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  jobId: string,
): Promise<JobMatchDetailView | null> {
  const matches = await loadLatestJobMatchViewsForUser(supabase, userId);
  const match = matches.find((row) => row.jobId === jobId);

  if (!match) {
    return null;
  }

  const resumeId = match.resumeId;

  if (!resumeId) {
    return {
      ...match,
      candidateIndustries: [],
      candidateSeniority: null,
      candidateSkills: [],
      candidateTitles: [],
      matchedSkills: [],
      missingSkills: match.skills,
    };
  }

  const { data: entities, error } = await supabase
    .from("resume_entities")
    .select(
      "entity_type, label, description, metadata, resume_id, source, user_id",
    )
    .eq("resume_id", resumeId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const candidate = buildCandidateProfileFromResumeEntities(
    (entities ?? []) as ResumeEntityRow[],
  );
  const candidateSkills = candidate.skills;
  const normalizedCandidateSkills = new Set(
    candidateSkills.map((skill) => normalizeText(skill)),
  );
  const matchedSkills = match.skills.filter((skill) =>
    normalizedCandidateSkills.has(normalizeText(skill)),
  );
  const missingSkills = match.skills.filter(
    (skill) => !normalizedCandidateSkills.has(normalizeText(skill)),
  );

  return {
    ...match,
    candidateIndustries: candidate.industries,
    candidateSeniority: candidate.seniority,
    candidateSkills,
    candidateTitles: candidate.titles,
    matchedSkills,
    missingSkills,
  };
}

export {
  buildScoreBreakdown,
  formatRelativeDate,
  formatSalaryRange,
  getTopSignals,
};
