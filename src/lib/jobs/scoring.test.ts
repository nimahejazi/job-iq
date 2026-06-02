import { describe, expect, it } from "vitest";
import { calculateJobMatchScore, type JobRow } from "./scoring";

function makeJob(overrides: Partial<JobRow> = {}): JobRow {
  return {
    apply_url: "https://example.com/apply",
    company_name: "Northstar Health",
    country_code: "US",
    created_at: "2026-06-01T00:00:00.000Z",
    dedupe_key: "dedupe-key",
    description: "Build patient-facing workflows.",
    employment_type: "full_time",
    expires_at: null,
    external_id: "job-1",
    id: "job-1",
    industry: "Health Technology",
    is_active: true,
    location: "San Francisco, CA",
    posted_at: "2026-06-01T00:00:00.000Z",
    raw_payload: {},
    requirements: "React, TypeScript, accessibility.",
    salary_max_usd: 185000,
    salary_min_usd: 145000,
    salary_period: "year",
    seniority: "mid",
    skills: ["React", "TypeScript", "Next.js"],
    source_id: "source-1",
    title: "Product Frontend Engineer",
    updated_at: "2026-06-01T00:00:00.000Z",
    work_mode: "hybrid",
    ...overrides,
  };
}

function makePreferences(overrides = {}) {
  return {
    desired_titles: ["Frontend Engineer"],
    employment_types: ["full_time"],
    experience_level: "mid",
    excluded_industries: [],
    excluded_titles: [],
    min_salary_usd: 140000,
    preferred_locations: ["San Francisco"],
    willing_to_relocate: false,
    work_modes: ["hybrid", "remote"],
    ...overrides,
  };
}

const candidate = {
  industries: ["Health Technology"],
  seniority: "mid",
  skills: ["React", "TypeScript", "Accessibility", "Next.js"],
  titles: ["Frontend Engineer", "UI Engineer"],
};

describe("calculateJobMatchScore", () => {
  it("produces a weighted score and breakdown for a strong fit", () => {
    const result = calculateJobMatchScore({
      candidate,
      job: makeJob(),
      preferences: makePreferences(),
      semanticSimilarity: 0.92,
    });

    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThan(80);
    expect(result.breakdown.cap).toBe(100);
    expect(result.breakdown.components.semantic_similarity.available).toBe(
      true,
    );
    expect(result.breakdown.components.skill_overlap.available).toBe(true);
  });

  it("redistributes salary weight when salary is unknown", () => {
    const result = calculateJobMatchScore({
      candidate,
      job: makeJob({ salary_min_usd: null, salary_max_usd: null }),
      preferences: makePreferences({ min_salary_usd: 130000 }),
      semanticSimilarity: 0.75,
    });

    expect(result.eligible).toBe(true);
    expect(result.breakdown.components.salary_fit.available).toBe(false);
    expect(result.breakdown.appliedWeights.salary_fit).toBe(0);
    expect(
      Object.values(result.breakdown.appliedWeights).reduce(
        (sum, value) => sum + value,
        0,
      ),
    ).toBeCloseTo(100, 5);
  });

  it("caps hard location conflicts", () => {
    const result = calculateJobMatchScore({
      candidate,
      job: makeJob({
        location: "Austin, TX",
        work_mode: "onsite",
      }),
      preferences: makePreferences({
        preferred_locations: ["San Francisco"],
        work_modes: ["remote"],
        willing_to_relocate: false,
      }),
      semanticSimilarity: 0.95,
    });

    expect(result.eligible).toBe(true);
    expect(result.breakdown.cap).toBe(20);
    expect(result.score).toBeLessThanOrEqual(20);
  });

  it("excludes inactive jobs", () => {
    const result = calculateJobMatchScore({
      candidate,
      job: makeJob({ is_active: false }),
      preferences: makePreferences(),
      semanticSimilarity: 0.95,
    });

    expect(result.eligible).toBe(false);
    expect(result.score).toBe(0);
    expect(result.breakdown.exclusions).toContain("inactive");
  });
});
