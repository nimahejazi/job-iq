import { describe, expect, it } from "vitest";
import {
  buildJobEmbeddingContent,
  hashJobEmbeddingContent,
} from "./job-embedding.mjs";

describe("buildJobEmbeddingContent", () => {
  it("serializes job fields into a stable embedding prompt", () => {
    const content = buildJobEmbeddingContent({
      company_name: "Northstar Health",
      country_code: "US",
      description: "Build patient-facing workflows.",
      employment_type: "full_time",
      industry: "Health Technology",
      location: "San Francisco, CA",
      requirements: "React, TypeScript, accessibility.",
      salary_max_usd: 185000,
      salary_min_usd: 145000,
      salary_period: "year",
      seniority: "mid",
      skills: ["React", "TypeScript", "Next.js"],
      title: "Product Frontend Engineer",
      work_mode: "hybrid",
    });

    expect(content).toContain("Job title: Product Frontend Engineer");
    expect(content).toContain("Company: Northstar Health");
    expect(content).toContain("Skills:");
    expect(content).toContain("Description:");
    expect(content).toContain("Requirements:");
  });

  it("creates a stable hash for matching job content", () => {
    const first = hashJobEmbeddingContent("hello world");
    const second = hashJobEmbeddingContent("hello world");

    expect(first).toBe(second);
  });
});
