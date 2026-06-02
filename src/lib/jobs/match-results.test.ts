import { describe, expect, it } from "vitest";
import {
  buildCandidateProfileFromResumeEntities,
  buildMatchExplanation,
} from "./match-results";

describe("buildCandidateProfileFromResumeEntities", () => {
  it("extracts core profile signals from resume entities", () => {
    const profile = buildCandidateProfileFromResumeEntities([
      {
        created_at: "2026-06-01T00:00:00.000Z",
        description: null,
        entity_type: "skill",
        id: "1",
        label: "TypeScript",
        metadata: {},
        resume_id: "resume-1",
        source: "ai",
        updated_at: "2026-06-01T00:00:00.000Z",
        user_id: "user-1",
      },
      {
        created_at: "2026-06-01T00:00:00.000Z",
        description: null,
        entity_type: "title",
        id: "2",
        label: "Frontend Engineer",
        metadata: {},
        resume_id: "resume-1",
        source: "ai",
        updated_at: "2026-06-01T00:00:00.000Z",
        user_id: "user-1",
      },
      {
        created_at: "2026-06-01T00:00:00.000Z",
        description: null,
        entity_type: "industry",
        id: "3",
        label: "Health Technology",
        metadata: {},
        resume_id: "resume-1",
        source: "ai",
        updated_at: "2026-06-01T00:00:00.000Z",
        user_id: "user-1",
      },
      {
        created_at: "2026-06-01T00:00:00.000Z",
        description: null,
        entity_type: "seniority",
        id: "4",
        label: "mid",
        metadata: {},
        resume_id: "resume-1",
        source: "ai",
        updated_at: "2026-06-01T00:00:00.000Z",
        user_id: "user-1",
      },
    ]);

    expect(profile.skills).toEqual(["TypeScript"]);
    expect(profile.titles).toEqual(["Frontend Engineer"]);
    expect(profile.industries).toEqual(["Health Technology"]);
    expect(profile.seniority).toBe("mid");
  });
});

describe("buildMatchExplanation", () => {
  it("describes exclusions for ineligible jobs", () => {
    expect(
      buildMatchExplanation({
        breakdown: {
          appliedWeights: {
            freshness: 0,
            location_fit: 0,
            salary_fit: 0,
            seniority_fit: 0,
            semantic_similarity: 0,
            skill_overlap: 0,
            title_alignment: 0,
          },
          cap: 0,
          components: {
            freshness: { available: false, baseWeight: 4, score: 0 },
            location_fit: { available: false, baseWeight: 16, score: 0 },
            salary_fit: { available: false, baseWeight: 12, score: 0 },
            seniority_fit: { available: false, baseWeight: 8, score: 0 },
            semantic_similarity: { available: false, baseWeight: 32, score: 0 },
            skill_overlap: { available: false, baseWeight: 16, score: 0 },
            title_alignment: { available: false, baseWeight: 12, score: 0 },
          },
          exclusions: ["inactive"],
          rawScore: 0,
        },
        eligible: false,
        score: 0,
      }),
    ).toContain("Excluded: inactive.");
  });
});
