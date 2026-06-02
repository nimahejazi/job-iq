import { describe, expect, it } from "vitest";
import { buildJobDedupeKey } from "./job-dedupe.mjs";

describe("buildJobDedupeKey", () => {
  it("returns the same fingerprint for equivalent normalized job details", () => {
    const first = buildJobDedupeKey({
      applyUrl: "https://example.com/jobs/123",
      companyName: "Northstar Health",
      location: "San Francisco, CA",
      sourceId: "source-1",
      title: "Product Frontend Engineer",
    });

    const second = buildJobDedupeKey({
      applyUrl: " https://example.com/jobs/123 ",
      companyName: "northstar health",
      location: "San   Francisco, CA",
      sourceId: "source-1",
      title: " product frontend engineer ",
    });

    expect(first).toBe(second);
  });
});
