import { describe, expect, it } from "vitest";
import {
  buildResumeEntityDraftsFromProfile,
  extractResumeEntityDrafts,
  extractResumeStructuredProfile,
} from "./resume-entity-extraction.mjs";

const sampleResumeText = `
Jane Doe
Senior Software Engineer with 8 years of experience building SaaS and FinTech products.

Skills
TypeScript, React, Node.js, PostgreSQL, AWS, Docker, Kubernetes

Experience
Senior Software Engineer - Acme FinTech, 2021 - Present
Built internal tooling and customer dashboards for regulated financial products.
Software Engineer - Cloud Health, 2018 - 2021
Improved release reliability and shipped reusable platform components.

Education
University of Washington, B.S. Computer Science, 2018

Certifications
AWS Certified Solutions Architect
`;

describe("extractResumeStructuredProfile", () => {
  it("derives a structured resume profile from extracted text", () => {
    const profile = extractResumeStructuredProfile(sampleResumeText);

    expect(profile.summary).toContain("Senior Software Engineer");
    expect(profile.skills).toEqual(
      expect.arrayContaining([
        "typescript",
        "react",
        "node.js",
        "postgresql",
        "aws",
      ]),
    );
    expect(profile.titles).toEqual(
      expect.arrayContaining(["software engineer"]),
    );
    expect(profile.industries).toEqual(
      expect.arrayContaining(["saas", "fintech"]),
    );
    expect(profile.seniority).toBe("senior");
    expect(profile.education).toHaveLength(1);
    expect(profile.experience.length).toBeGreaterThan(0);
    expect(profile.certifications).toHaveLength(1);
  });
});

describe("extractResumeEntityDrafts", () => {
  it("maps structured resume data into resume_entities drafts", () => {
    const entityDrafts = extractResumeEntityDrafts(sampleResumeText);
    const entityTypes = entityDrafts.map((draft) => draft.entity_type);

    expect(entityTypes).toEqual(
      expect.arrayContaining([
        "summary",
        "skill",
        "title",
        "industry",
        "seniority",
        "education",
        "experience",
        "certification",
      ]),
    );
  });

  it("maps AI structured output into the same resume_entities drafts", () => {
    const entityDrafts = buildResumeEntityDraftsFromProfile(
      {
        certifications: [
          {
            date: "2024-02-01",
            expires_on: "",
            issuer: "OpenAI",
            name: "OpenAI Certified Builder",
          },
        ],
        education: [
          {
            degree: "B.S.",
            details: "Magna cum laude",
            end_date: "2018-06-01",
            field: "Computer Science",
            school: "University of Washington",
            start_date: "2014-09-01",
          },
        ],
        experience: [
          {
            bullets: ["Shipped matching workflows."],
            company: "Acme",
            end_date: "2024-01-01",
            location: "Remote",
            start_date: "2021-01-01",
            summary: "Built product features.",
            title: "Senior Software Engineer",
          },
        ],
        industries: ["saas"],
        seniority: "senior",
        skills: [
          { category: "frontend", name: "React" },
          { category: "backend", name: "Node.js" },
        ],
        summary: "A senior engineer focused on product delivery.",
        titles: ["Software Engineer"],
      },
      "ai",
    );

    expect(entityDrafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity_type: "summary",
          metadata: expect.objectContaining({ source: "ai" }),
        }),
        expect.objectContaining({
          entity_type: "skill",
          metadata: expect.objectContaining({
            source_type: "structured_output",
          }),
        }),
        expect.objectContaining({
          entity_type: "experience",
        }),
        expect.objectContaining({
          entity_type: "education",
        }),
        expect.objectContaining({
          entity_type: "certification",
        }),
      ]),
    );
  });
});
