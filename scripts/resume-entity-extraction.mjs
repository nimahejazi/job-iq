const SECTION_HEADINGS = new Map([
  ["summary", "summary"],
  ["profile", "summary"],
  ["professional summary", "summary"],
  ["about", "summary"],
  ["about me", "summary"],
  ["skills", "skills"],
  ["technical skills", "skills"],
  ["core skills", "skills"],
  ["experience", "experience"],
  ["work experience", "experience"],
  ["professional experience", "experience"],
  ["employment history", "experience"],
  ["career history", "experience"],
  ["education", "education"],
  ["academic background", "education"],
  ["certifications", "certifications"],
  ["certification", "certifications"],
]);

const KNOWN_SKILLS = [
  "typescript",
  "javascript",
  "react",
  "next.js",
  "node.js",
  "node",
  "express",
  "python",
  "java",
  "go",
  "rust",
  "sql",
  "postgresql",
  "postgres",
  "mysql",
  "mongodb",
  "redis",
  "graphql",
  "rest",
  "tailwind css",
  "tailwind",
  "prisma",
  "supabase",
  "aws",
  "gcp",
  "azure",
  "docker",
  "kubernetes",
  "terraform",
  "git",
  "ci/cd",
  "jest",
  "vitest",
  "playwright",
  "testing",
  "redux",
  "zustand",
  "flask",
  "django",
  "fastapi",
  "rails",
  "laravel",
  "php",
  "kotlin",
  "swift",
  "figma",
  "llm",
  "openai",
  "prompt engineering",
  "machine learning",
  "data analysis",
  "tableau",
  "power bi",
  "excel",
];

const KNOWN_TITLES = [
  "software engineer",
  "full stack engineer",
  "frontend engineer",
  "front-end engineer",
  "backend engineer",
  "back-end engineer",
  "platform engineer",
  "devops engineer",
  "site reliability engineer",
  "data engineer",
  "data scientist",
  "product manager",
  "engineering manager",
  "technical lead",
  "staff engineer",
  "principal engineer",
  "solutions architect",
  "product designer",
  "ux designer",
  "ui designer",
  "mobile engineer",
  "machine learning engineer",
];

const KNOWN_INDUSTRIES = [
  "saas",
  "fintech",
  "healthcare",
  "education",
  "edtech",
  "ecommerce",
  "retail",
  "manufacturing",
  "government",
  "nonprofit",
  "media",
  "gaming",
  "logistics",
  "cybersecurity",
  "cloud",
  "mobile",
  "ai",
  "devtools",
];

const SENIORITY_RULES = [
  {
    label: "staff",
    patterns: [/\bstaff\b/i, /\bprincipal\b/i, /\bdirector\b/i],
  },
  { label: "senior", patterns: [/\bsenior\b/i, /\blead\b/i, /\barchitect\b/i] },
  { label: "mid", patterns: [/\bmid[- ]level\b/i, /\bintermediate\b/i] },
  {
    label: "junior",
    patterns: [
      /\bjunior\b/i,
      /\bentry[- ]level\b/i,
      /\bassociate\b/i,
      /\bintern\b/i,
    ],
  },
];

const DEGREE_HINTS = [
  "bachelor",
  "master",
  "phd",
  "doctorate",
  "mba",
  "associate",
  "b.s.",
  "bs",
  "b.a.",
  "ba",
  "m.s.",
  "ms",
  "certificate",
  "diploma",
];

const CERTIFICATION_HINTS = [
  "certified",
  "certification",
  "certificate",
  "aws certified",
  "azure certified",
  "google cloud certified",
  "pmp",
  "scrum master",
];

function normalizeText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeHeading(line) {
  return line
    .toLowerCase()
    .replace(/[:\s]+$/g, "")
    .trim();
}

function splitLines(text) {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getSectionName(line) {
  return SECTION_HEADINGS.get(normalizeHeading(line));
}

function groupSections(lines) {
  const sections = {
    preamble: [],
    summary: [],
    skills: [],
    experience: [],
    education: [],
    certifications: [],
  };

  let currentSection = "preamble";

  for (const line of lines) {
    const nextSection = getSectionName(line);

    if (nextSection) {
      currentSection = nextSection;
      continue;
    }

    sections[currentSection] ??= [];
    sections[currentSection].push(line);
  }

  return sections;
}

function dedupeStrings(values) {
  return [...new Set(values.filter(Boolean).map((value) => value.trim()))];
}

function splitCandidates(lines) {
  return lines
    .flatMap((line) => line.split(/[|•·/]/g))
    .flatMap((line) => line.split(/,\s*/g))
    .map((candidate) => candidate.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function scanKnownTerms(text, terms) {
  const normalizedText = ` ${text.toLowerCase().replace(/[^a-z0-9+.#]+/g, " ")} `;

  return terms.filter((term) => {
    const normalizedTerm = term
      .toLowerCase()
      .replace(/[^a-z0-9+.#]+/g, " ")
      .trim();
    const pattern = ` ${normalizedTerm} `;

    return normalizedText.includes(pattern);
  });
}

function extractSummary(sections, lines) {
  const summaryLines = sections.summary.length
    ? sections.summary
    : sections.preamble;
  const filteredLines = summaryLines.filter(
    (line) =>
      !/[@]/.test(line) && !/\b\d{3}[-. ]?\d{3}[-. ]?\d{4}\b/.test(line),
  );

  if (!filteredLines.length) {
    const firstParagraph = lines.slice(0, 4).join(" ").trim();

    return firstParagraph ? firstParagraph.slice(0, 280) : null;
  }

  return filteredLines.join(" ").replace(/\s+/g, " ").slice(0, 280);
}

function parseSimpleBlock(line) {
  const raw = line.trim();
  const parts = raw
    .split(/\s+[|•·-]\s+|,\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  let label = parts[0] ?? raw;
  let description = parts.length > 1 ? parts.slice(1).join(", ") : null;
  let year = null;

  const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    year = yearMatch[0];
  }

  if (!description && parts.length > 1) {
    description = parts.slice(1).join(", ");
  }

  return {
    description,
    label,
    raw,
    year,
  };
}

function extractEducationEntries(lines) {
  const candidates = splitCandidates(lines).filter((line) =>
    DEGREE_HINTS.some((hint) => line.toLowerCase().includes(hint)),
  );

  return dedupeStrings(candidates.length ? candidates : lines).map((line) => ({
    ...parseSimpleBlock(line),
    metadata: {
      raw_line: line,
      section: "education",
    },
  }));
}

function looksLikeExperienceBoundary(line) {
  return (
    /\b(19|20)\d{2}\b/.test(line) ||
    /\b(yr|yrs|years)\b/i.test(line) ||
    /^[-*•]/.test(line) ||
    /\bat\b/i.test(line)
  );
}

function extractExperienceEntries(lines) {
  const blocks = [];
  let currentBlock = [];

  for (const line of lines) {
    if (!currentBlock.length) {
      currentBlock.push(line);
      continue;
    }

    if (looksLikeExperienceBoundary(line) && currentBlock.length > 1) {
      blocks.push(currentBlock);
      currentBlock = [line];
      continue;
    }

    currentBlock.push(line);
  }

  if (currentBlock.length) {
    blocks.push(currentBlock);
  }

  return blocks.map((block) => {
    const raw = block.join(" ").replace(/\s+/g, " ").trim();
    const titleLine = block[0] ?? raw;
    const parsed = parseSimpleBlock(titleLine);

    return {
      description: raw === parsed.label ? null : raw,
      label: parsed.label,
      metadata: {
        raw_lines: block,
        section: "experience",
      },
      raw,
    };
  });
}

function extractCertificationEntries(lines) {
  const candidates = splitCandidates(lines).filter((line) =>
    CERTIFICATION_HINTS.some((hint) => line.toLowerCase().includes(hint)),
  );

  return dedupeStrings(candidates.length ? candidates : lines).map((line) => ({
    ...parseSimpleBlock(line),
    metadata: {
      raw_line: line,
      section: "certification",
    },
  }));
}

function inferSeniority(text) {
  for (const rule of SENIORITY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.label;
    }
  }

  return null;
}

function buildEntityDraft(entityType, entry, extraMetadata = {}) {
  return {
    description: entry.description,
    entity_type: entityType,
    label: entry.label,
    metadata: {
      ...extraMetadata,
      ...entry.metadata,
    },
  };
}

export function extractResumeStructuredProfile(text) {
  const normalizedText = normalizeText(text);
  const lines = splitLines(normalizedText);
  const sections = groupSections(lines);

  const summary = extractSummary(sections, lines);
  const skills = dedupeStrings([
    ...scanKnownTerms(normalizedText, KNOWN_SKILLS),
    ...splitCandidates(sections.skills),
  ]);
  const titles = dedupeStrings(scanKnownTerms(normalizedText, KNOWN_TITLES));
  const industries = dedupeStrings(
    scanKnownTerms(normalizedText, KNOWN_INDUSTRIES),
  );
  const education = extractEducationEntries(sections.education);
  const experience = extractExperienceEntries(sections.experience);
  const certifications = extractCertificationEntries(sections.certifications);
  const seniority = inferSeniority(normalizedText);

  return {
    certifications,
    education,
    experience,
    industries,
    seniority,
    skills,
    summary,
    titles,
  };
}

export function extractResumeEntityDrafts(text) {
  const profile = extractResumeStructuredProfile(text);
  const entityDrafts = [];

  if (profile.summary) {
    entityDrafts.push({
      description: profile.summary,
      entity_type: "summary",
      label: "Resume summary",
      metadata: {
        section: "summary",
        source: "resume_text",
      },
    });
  }

  for (const skill of profile.skills) {
    entityDrafts.push(
      buildEntityDraft(
        "skill",
        {
          description: null,
          label: skill,
          metadata: {
            source: "resume_text",
            source_type: "keyword",
          },
        },
        { section: "skills" },
      ),
    );
  }

  for (const title of profile.titles) {
    entityDrafts.push(
      buildEntityDraft(
        "title",
        {
          description: null,
          label: title,
          metadata: {
            source: "resume_text",
            source_type: "keyword",
          },
        },
        { section: "titles" },
      ),
    );
  }

  for (const industry of profile.industries) {
    entityDrafts.push(
      buildEntityDraft(
        "industry",
        {
          description: null,
          label: industry,
          metadata: {
            source: "resume_text",
            source_type: "keyword",
          },
        },
        { section: "industries" },
      ),
    );
  }

  if (profile.seniority) {
    entityDrafts.push({
      description: `Inferred seniority: ${profile.seniority}`,
      entity_type: "seniority",
      label: profile.seniority,
      metadata: {
        section: "seniority",
        source: "resume_text",
        source_type: "keyword",
      },
    });
  }

  for (const item of profile.education) {
    entityDrafts.push(
      buildEntityDraft("education", item, { section: "education" }),
    );
  }

  for (const item of profile.experience) {
    entityDrafts.push(
      buildEntityDraft("experience", item, { section: "experience" }),
    );
  }

  for (const item of profile.certifications) {
    entityDrafts.push(
      buildEntityDraft("certification", item, { section: "certifications" }),
    );
  }

  return entityDrafts;
}
