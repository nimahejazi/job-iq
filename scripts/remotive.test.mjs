import { describe, expect, it } from "vitest";
import { buildRemotiveSearchUrl, normalizeRemotiveJob } from "./remotive.mjs";

describe("buildRemotiveSearchUrl", () => {
  it("builds the public remotive api url", () => {
    const url = buildRemotiveSearchUrl({
      category: "software-dev",
      companyName: "Acme",
      limit: 10,
      search: "api",
    });

    expect(url.toString()).toBe(
      "https://remotive.com/api/remote-jobs?category=software-dev&company_name=Acme&search=api&limit=10",
    );
  });
});

describe("normalizeRemotiveJob", () => {
  it("maps a remotive job into the local schema shape", () => {
    const normalized = normalizeRemotiveJob({
      candidate_required_location: "Worldwide",
      category: "Software Development",
      company_name: "Remotive",
      description: "<p>Build reliable remote APIs.</p>",
      id: 123,
      job_type: "full_time",
      publication_date: "2026-06-01T12:00:00",
      salary: "$40,000 - $50,000",
      title: "Lead Developer",
      url: "https://remotive.com/remote-jobs/product/lead-developer-123",
    });

    expect(normalized).toEqual(
      expect.objectContaining({
        apply_url:
          "https://remotive.com/remote-jobs/product/lead-developer-123",
        company_name: "Remotive",
        description: "Build reliable remote APIs.",
        external_id: "123",
        industry: "Software Development",
        is_active: true,
        location: "Worldwide",
        salary_max_usd: 50000,
        salary_min_usd: 40000,
        salary_period: null,
        title: "Lead Developer",
        work_mode: "remote",
      }),
    );
  });
});
