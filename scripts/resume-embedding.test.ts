import { describe, expect, it } from "vitest";
import {
  buildResumeEmbeddingContent,
  hashResumeEmbeddingContent,
} from "./resume-embedding.mjs";

describe("buildResumeEmbeddingContent", () => {
  it("serializes resume entities and text into a stable embedding payload", () => {
    const content = buildResumeEmbeddingContent({
      entityDrafts: [
        {
          description: "Senior engineer focused on product delivery.",
          entity_type: "summary",
          label: "Resume summary",
          metadata: { section: "summary", source: "ai" },
        },
        {
          description: null,
          entity_type: "skill",
          label: "TypeScript",
          metadata: { category: "frontend", section: "skills" },
        },
        {
          description: "Built matching workflows.",
          entity_type: "experience",
          label: "Senior Software Engineer",
          metadata: { section: "experience" },
        },
      ],
      extractedText: "Resume body text",
      originalFileName: "resume.pdf",
    });

    expect(content).toContain("Resume file: resume.pdf");
    expect(content).toContain("Summary:");
    expect(content).toContain("TypeScript (skills, frontend)");
    expect(content).toContain("Resume text excerpt:");
  });
});

describe("hashResumeEmbeddingContent", () => {
  it("returns a deterministic content hash", () => {
    const content = "Resume file: resume.pdf\nSummary:\n- Example";

    expect(hashResumeEmbeddingContent(content)).toBe(
      hashResumeEmbeddingContent(content),
    );
  });
});
