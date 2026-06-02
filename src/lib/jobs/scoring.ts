import type { PreferencesRecord } from "../preferences/validation";
import type { Database } from "../supabase/database.types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

type CandidateProfile = {
  industries: string[];
  seniority: string | null;
  skills: string[];
  titles: string[];
};

type MatchComponentKey =
  | "semantic_similarity"
  | "skill_overlap"
  | "title_alignment"
  | "location_fit"
  | "salary_fit"
  | "seniority_fit"
  | "freshness";

type MatchComponentScore = {
  available: boolean;
  baseWeight: number;
  score: number;
};

type MatchScoreBreakdown = {
  appliedWeights: Record<MatchComponentKey, number>;
  components: Record<MatchComponentKey, MatchComponentScore>;
  cap: number | null;
  exclusions: string[];
  rawScore: number;
};

type MatchScoreResult = {
  breakdown: MatchScoreBreakdown;
  eligible: boolean;
  score: number;
};

type MatchScoreInput = {
  candidate: CandidateProfile;
  job: JobRow;
  now?: Date;
  preferences: PreferencesRecord;
  semanticSimilarity?: number | null;
  isDuplicate?: boolean;
};

const BASE_WEIGHTS: Record<MatchComponentKey, number> = {
  freshness: 4,
  location_fit: 16,
  salary_fit: 12,
  seniority_fit: 8,
  semantic_similarity: 32,
  skill_overlap: 16,
  title_alignment: 12,
};

const LEVEL_RANKS: Record<string, number> = {
  entry: 1,
  junior: 2,
  mid: 3,
  senior: 4,
  staff: 5,
  lead: 6,
  principal: 7,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeList(values: string[]) {
  return values.map((value) => normalizeText(value)).filter(Boolean);
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter(Boolean);
}

function uniqueTokens(values: string[]) {
  return [...new Set(values)];
}

function jaccardSimilarity(left: string[], right: string[]) {
  if (!left.length || !right.length) {
    return 0;
  }

  const leftSet = new Set(uniqueTokens(left));
  const rightSet = new Set(uniqueTokens(right));
  let intersection = 0;

  for (const value of leftSet) {
    if (rightSet.has(value)) {
      intersection += 1;
    }
  }

  const union = leftSet.size + rightSet.size - intersection;

  return union > 0 ? intersection / union : 0;
}

function hasAnySubstringMatch(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

function formatJobLocation(job: JobRow) {
  return normalizeText(job.location ?? "");
}

function isExpired(job: JobRow, now: Date) {
  if (!job.expires_at) {
    return false;
  }

  return new Date(job.expires_at).getTime() < now.getTime();
}

function getRank(level: string | null | undefined) {
  if (!level) {
    return null;
  }

  const normalizedLevel = normalizeText(level);

  return LEVEL_RANKS[normalizedLevel] ?? null;
}

function getFreshnessScore(job: JobRow, now: Date) {
  if (!job.posted_at) {
    return { available: false, score: 0 };
  }

  const postedAt = new Date(job.posted_at);

  if (Number.isNaN(postedAt.getTime())) {
    return { available: false, score: 0 };
  }

  const ageDays = Math.max(
    0,
    (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    available: true,
    score: clamp(1 - ageDays / 30, 0, 1),
  };
}

function getSkillOverlapScore(candidate: CandidateProfile, job: JobRow) {
  const candidateSkills = normalizeList(candidate.skills);
  const jobSkills = normalizeList(job.skills ?? []);

  if (!candidateSkills.length || !jobSkills.length) {
    return { available: false, score: 0 };
  }

  return {
    available: true,
    score: jaccardSimilarity(candidateSkills, jobSkills),
  };
}

function getTitleAlignmentScore(
  candidate: CandidateProfile,
  preferences: PreferencesRecord,
  job: JobRow,
) {
  const candidateTitles = normalizeList(candidate.titles);
  const preferredTitles = normalizeList(preferences.desired_titles);
  const jobTokens = tokenize(job.title);

  if (!candidateTitles.length && !preferredTitles.length) {
    return { available: false, score: 0 };
  }

  const titleSources = [...candidateTitles, ...preferredTitles];
  const exactMatch = titleSources.some(
    (title) => normalizeText(job.title) === title,
  );
  const containsMatch = hasAnySubstringMatch(
    normalizeText(job.title),
    titleSources,
  );
  const overlap = jaccardSimilarity(
    jobTokens,
    uniqueTokens(titleSources.flatMap(tokenize)),
  );

  return {
    available: true,
    score: exactMatch ? 1 : containsMatch ? Math.max(0.8, overlap) : overlap,
  };
}

function getLocationFitScore(preferences: PreferencesRecord, job: JobRow) {
  const preferredLocations = normalizeList(preferences.preferred_locations);
  const workModes = normalizeList(preferences.work_modes);
  const jobLocation = formatJobLocation(job);
  const jobWorkMode = normalizeText(job.work_mode ?? "");

  if (!preferredLocations.length && !workModes.length) {
    return { available: false, score: 0 };
  }

  const remoteAllowed = workModes.includes("remote");
  const hybridAllowed = workModes.includes("hybrid");
  const onsiteAllowed = workModes.includes("onsite");

  if (jobWorkMode === "remote") {
    return { available: true, score: remoteAllowed ? 1 : 0.15 };
  }

  if (jobWorkMode === "hybrid") {
    return {
      available: true,
      score: hybridAllowed ? 0.9 : remoteAllowed ? 0.5 : 0.2,
    };
  }

  if (jobWorkMode === "onsite") {
    return {
      available: true,
      score: onsiteAllowed ? 1 : preferences.willing_to_relocate ? 0.7 : 0.1,
    };
  }

  if (!jobLocation) {
    return { available: false, score: 0 };
  }

  const locationMatch = preferredLocations.some((preferredLocation) =>
    jobLocation.includes(preferredLocation),
  );

  if (locationMatch) {
    return { available: true, score: 1 };
  }

  if (preferences.willing_to_relocate) {
    return { available: true, score: 0.7 };
  }

  return { available: true, score: 0.2 };
}

function getSalaryFitScore(preferences: PreferencesRecord, job: JobRow) {
  const minDesiredSalary = preferences.min_salary_usd;
  const jobMin = job.salary_min_usd;
  const jobMax = job.salary_max_usd;

  if (minDesiredSalary === null || (jobMin === null && jobMax === null)) {
    return { available: false, score: 0 };
  }

  const ceiling = jobMax ?? jobMin ?? 0;
  const floor = jobMin ?? jobMax ?? 0;

  if (ceiling < minDesiredSalary) {
    return { available: true, score: 0 };
  }

  if (floor >= minDesiredSalary) {
    return { available: true, score: 1 };
  }

  const overlap = Math.max(0, ceiling - minDesiredSalary);
  const targetSpan = Math.max(1, ceiling - floor);

  return {
    available: true,
    score: clamp(overlap / targetSpan, 0, 1),
  };
}

function getSeniorityFitScore(
  candidate: CandidateProfile,
  preferences: PreferencesRecord,
  job: JobRow,
) {
  const jobRank = getRank(job.seniority);
  const candidateRank = getRank(candidate.seniority);
  const preferenceRank = getRank(preferences.experience_level);
  const targetRank = preferenceRank ?? candidateRank;

  if (!jobRank || !targetRank) {
    return { available: false, score: 0 };
  }

  const distance = Math.abs(jobRank - targetRank);

  return {
    available: true,
    score: clamp(1 - distance / 6, 0, 1),
  };
}

function getSemanticSimilarityScore(
  semanticSimilarity: number | null | undefined,
) {
  if (semanticSimilarity === null || semanticSimilarity === undefined) {
    return { available: false, score: 0 };
  }

  return {
    available: true,
    score: clamp(semanticSimilarity, 0, 1),
  };
}

function getEligibility(job: JobRow, isDuplicate: boolean, now: Date) {
  const exclusions: string[] = [];

  if (!job.is_active) {
    exclusions.push("inactive");
  }

  if (!job.apply_url?.trim()) {
    exclusions.push("missing_apply_url");
  }

  if (isDuplicate) {
    exclusions.push("duplicate");
  }

  if (isExpired(job, now)) {
    exclusions.push("expired");
  }

  return {
    eligible: exclusions.length === 0,
    exclusions,
  };
}

function getMatchCap(
  preferences: PreferencesRecord,
  job: JobRow,
  locationScore: MatchComponentScore,
  salaryScore: MatchComponentScore,
) {
  const preferredLocations = normalizeList(preferences.preferred_locations);
  const preferredWorkModes = normalizeList(preferences.work_modes);
  const jobLocation = formatJobLocation(job);
  const jobWorkMode = normalizeText(job.work_mode ?? "");

  const locationConflict =
    preferredLocations.length > 0 &&
    locationScore.available &&
    locationScore.score < 0.5 &&
    !preferences.willing_to_relocate &&
    jobWorkMode !== "remote" &&
    !preferredLocations.some((preferredLocation) =>
      jobLocation.includes(preferredLocation),
    );

  const workModeConflict =
    preferredWorkModes.length > 0 &&
    jobWorkMode &&
    !preferredWorkModes.includes(jobWorkMode) &&
    jobWorkMode !== "remote";

  if (locationConflict && workModeConflict) {
    return 20;
  }

  if (locationConflict) {
    return 35;
  }

  if (workModeConflict) {
    return 30;
  }

  if (!salaryScore.available) {
    return 100;
  }

  return 100;
}

// Ranking combines semantic similarity with practical fit signals, then caps hard conflicts.
export function calculateJobMatchScore({
  candidate,
  job,
  now = new Date(),
  preferences,
  semanticSimilarity,
  isDuplicate = false,
}: MatchScoreInput): MatchScoreResult {
  const eligibility = getEligibility(job, isDuplicate, now);

  if (!eligibility.eligible) {
    return {
      breakdown: {
        appliedWeights: Object.fromEntries(
          Object.keys(BASE_WEIGHTS).map((key) => [key, 0]),
        ) as Record<MatchComponentKey, number>,
        cap: 0,
        components: {
          freshness: {
            available: false,
            baseWeight: BASE_WEIGHTS.freshness,
            score: 0,
          },
          location_fit: {
            available: false,
            baseWeight: BASE_WEIGHTS.location_fit,
            score: 0,
          },
          salary_fit: {
            available: false,
            baseWeight: BASE_WEIGHTS.salary_fit,
            score: 0,
          },
          seniority_fit: {
            available: false,
            baseWeight: BASE_WEIGHTS.seniority_fit,
            score: 0,
          },
          semantic_similarity: {
            available: false,
            baseWeight: BASE_WEIGHTS.semantic_similarity,
            score: 0,
          },
          skill_overlap: {
            available: false,
            baseWeight: BASE_WEIGHTS.skill_overlap,
            score: 0,
          },
          title_alignment: {
            available: false,
            baseWeight: BASE_WEIGHTS.title_alignment,
            score: 0,
          },
        },
        exclusions: eligibility.exclusions,
        rawScore: 0,
      },
      eligible: false,
      score: 0,
    };
  }

  const components: Record<MatchComponentKey, MatchComponentScore> = {
    freshness: {
      baseWeight: BASE_WEIGHTS.freshness,
      ...getFreshnessScore(job, now),
    },
    location_fit: {
      baseWeight: BASE_WEIGHTS.location_fit,
      ...getLocationFitScore(preferences, job),
    },
    salary_fit: {
      baseWeight: BASE_WEIGHTS.salary_fit,
      ...getSalaryFitScore(preferences, job),
    },
    seniority_fit: {
      baseWeight: BASE_WEIGHTS.seniority_fit,
      ...getSeniorityFitScore(candidate, preferences, job),
    },
    semantic_similarity: {
      baseWeight: BASE_WEIGHTS.semantic_similarity,
      ...getSemanticSimilarityScore(semanticSimilarity),
    },
    skill_overlap: {
      baseWeight: BASE_WEIGHTS.skill_overlap,
      ...getSkillOverlapScore(candidate, job),
    },
    title_alignment: {
      baseWeight: BASE_WEIGHTS.title_alignment,
      ...getTitleAlignmentScore(candidate, preferences, job),
    },
  };

  const availableWeight = Object.values(components)
    .filter((component) => component.available)
    .reduce((sum, component) => sum + component.baseWeight, 0);

  const weightedScoreSum = Object.values(components).reduce(
    (sum, component) => {
      if (!component.available || availableWeight === 0) {
        return sum;
      }

      return sum + component.score * component.baseWeight;
    },
    0,
  );

  const rawScore =
    availableWeight > 0 ? (weightedScoreSum / availableWeight) * 100 : 0;
  const cap = getMatchCap(
    preferences,
    job,
    components.location_fit,
    components.salary_fit,
  );
  const finalScore = Math.round(clamp(Math.min(rawScore, cap), 0, 100));

  const appliedWeights = Object.fromEntries(
    (Object.keys(components) as MatchComponentKey[]).map((key) => [
      key,
      components[key].available && availableWeight > 0
        ? (components[key].baseWeight / availableWeight) * 100
        : 0,
    ]),
  ) as Record<MatchComponentKey, number>;

  return {
    breakdown: {
      appliedWeights,
      cap,
      components,
      exclusions: eligibility.exclusions,
      rawScore: Math.round(clamp(rawScore, 0, 100)),
    },
    eligible: true,
    score: finalScore,
  };
}

export type {
  CandidateProfile,
  JobRow,
  MatchScoreBreakdown,
  MatchScoreInput,
  MatchScoreResult,
};
