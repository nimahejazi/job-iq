import type { Database } from "../supabase/database.types";
import type { CandidateProfile, MatchScoreResult } from "./scoring";

type ResumeEntityRow = Database["public"]["Tables"]["resume_entities"]["Row"];

function scoreSignalLabel(label: string, score: number) {
  return `${label} (${Math.round(score * 100)}%)`;
}

export function buildCandidateProfileFromResumeEntities(
  entities: ResumeEntityRow[],
): CandidateProfile {
  const skills = new Set<string>();
  const titles = new Set<string>();
  const industries = new Set<string>();
  let seniority: string | null = null;

  for (const entity of entities) {
    const label = typeof entity.label === "string" ? entity.label.trim() : "";

    if (!label) {
      continue;
    }

    switch (entity.entity_type) {
      case "skill":
        skills.add(label);
        break;
      case "title":
        titles.add(label);
        break;
      case "industry":
        industries.add(label);
        break;
      case "seniority":
        seniority ||= label;
        break;
      default:
        break;
    }
  }

  return {
    industries: [...industries],
    seniority,
    skills: [...skills],
    titles: [...titles],
  };
}

export function buildMatchExplanation(result: MatchScoreResult) {
  if (!result.eligible) {
    return result.breakdown.exclusions.length
      ? `Excluded: ${result.breakdown.exclusions.join(", ")}.`
      : "Excluded by matching rules.";
  }

  const highlightedSignals = Object.entries(result.breakdown.components)
    .filter(([, component]) => component.available && component.score >= 0.5)
    .sort((left, right) => right[1].score - left[1].score)
    .slice(0, 3)
    .map(([key, component]) => {
      switch (key) {
        case "semantic_similarity":
          return scoreSignalLabel("semantic fit", component.score);
        case "skill_overlap":
          return scoreSignalLabel("skill overlap", component.score);
        case "title_alignment":
          return scoreSignalLabel("title alignment", component.score);
        case "location_fit":
          return scoreSignalLabel("location fit", component.score);
        case "salary_fit":
          return scoreSignalLabel("salary fit", component.score);
        case "seniority_fit":
          return scoreSignalLabel("seniority fit", component.score);
        case "freshness":
          return scoreSignalLabel("freshness", component.score);
        default:
          return null;
      }
    })
    .filter((value): value is string => Boolean(value));

  const scoreText = `Score ${Math.round(result.score)}/100`;

  if (!highlightedSignals.length) {
    return `${scoreText}. Balanced fit across the available signals.`;
  }

  const capText =
    result.breakdown.cap !== null && result.breakdown.cap < 100
      ? ` Capped at ${result.breakdown.cap}/100 because of a hard preference conflict.`
      : "";

  return `${scoreText}. Top signals: ${highlightedSignals.join(", ")}.${capText}`;
}

export function normalizeJobMatchResultScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

export type { ResumeEntityRow };
