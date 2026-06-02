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

export const RESUME_PROFILE_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    certifications: {
      items: {
        additionalProperties: false,
        properties: {
          date: { type: "string" },
          expires_on: { type: "string" },
          issuer: { type: "string" },
          name: { type: "string" },
        },
        required: ["name", "issuer", "date", "expires_on"],
        type: "object",
      },
      type: "array",
    },
    education: {
      items: {
        additionalProperties: false,
        properties: {
          degree: { type: "string" },
          details: { type: "string" },
          end_date: { type: "string" },
          field: { type: "string" },
          school: { type: "string" },
          start_date: { type: "string" },
        },
        required: [
          "school",
          "degree",
          "field",
          "start_date",
          "end_date",
          "details",
        ],
        type: "object",
      },
      type: "array",
    },
    experience: {
      items: {
        additionalProperties: false,
        properties: {
          bullets: {
            items: { type: "string" },
            type: "array",
          },
          company: { type: "string" },
          end_date: { type: "string" },
          location: { type: "string" },
          start_date: { type: "string" },
          summary: { type: "string" },
          title: { type: "string" },
        },
        required: [
          "company",
          "title",
          "start_date",
          "end_date",
          "location",
          "summary",
          "bullets",
        ],
        type: "object",
      },
      type: "array",
    },
    industries: {
      items: { type: "string" },
      type: "array",
    },
    seniority: {
      enum: [
        "unknown",
        "junior",
        "mid",
        "senior",
        "staff",
        "principal",
        "lead",
      ],
      type: "string",
    },
    skills: {
      items: {
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          name: { type: "string" },
        },
        required: ["name", "category"],
        type: "object",
      },
      type: "array",
    },
    summary: { type: "string" },
    titles: {
      items: { type: "string" },
      type: "array",
    },
  },
  required: [
    "summary",
    "skills",
    "education",
    "experience",
    "certifications",
    "titles",
    "industries",
    "seniority",
  ],
  type: "object",
};

function normalizeProfileText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeProfileArray(values) {
  return Array.isArray(values)
    ? values.filter(
        (value) => typeof value === "string" && value.trim().length > 0,
      )
    : [];
}

export function normalizeResumeProfile(profile) {
  const normalized = {
    certifications: Array.isArray(profile?.certifications)
      ? profile.certifications
      : [],
    education: Array.isArray(profile?.education) ? profile.education : [],
    experience: Array.isArray(profile?.experience) ? profile.experience : [],
    industries: normalizeProfileArray(profile?.industries),
    seniority: normalizeProfileText(profile?.seniority) || "unknown",
    skills: Array.isArray(profile?.skills) ? profile.skills : [],
    summary: normalizeProfileText(profile?.summary),
    titles: normalizeProfileArray(profile?.titles),
  };

  return {
    certifications: normalized.certifications.map((item) => ({
      date: normalizeProfileText(item?.date),
      expires_on: normalizeProfileText(item?.expires_on),
      issuer: normalizeProfileText(item?.issuer),
      name: normalizeProfileText(item?.name),
    })),
    education: normalized.education.map((item) => ({
      degree: normalizeProfileText(item?.degree),
      details: normalizeProfileText(item?.details),
      end_date: normalizeProfileText(item?.end_date),
      field: normalizeProfileText(item?.field),
      school: normalizeProfileText(item?.school),
      start_date: normalizeProfileText(item?.start_date),
    })),
    experience: normalized.experience.map((item) => ({
      bullets: Array.isArray(item?.bullets)
        ? item.bullets
            .filter(
              (bullet) =>
                typeof bullet === "string" && bullet.trim().length > 0,
            )
            .map((bullet) => bullet.trim())
        : [],
      company: normalizeProfileText(item?.company),
      end_date: normalizeProfileText(item?.end_date),
      location: normalizeProfileText(item?.location),
      start_date: normalizeProfileText(item?.start_date),
      summary: normalizeProfileText(item?.summary),
      title: normalizeProfileText(item?.title),
    })),
    industries: normalized.industries.map((industry) => industry.trim()),
    seniority: normalized.seniority.toLowerCase(),
    skills: normalized.skills.map((item) => ({
      category: normalizeProfileText(item?.category),
      name: normalizeProfileText(item?.name),
    })),
    summary: normalized.summary,
    titles: normalized.titles.map((title) => title.trim()),
  };
}

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

export function buildResumeEntityDraftsFromProfile(profile, source = "resume") {
  const normalizedProfile = normalizeResumeProfile(profile);
  const entityDrafts = [];

  if (normalizedProfile.summary) {
    entityDrafts.push({
      description: normalizedProfile.summary,
      entity_type: "summary",
      label: "Resume summary",
      metadata: {
        section: "summary",
        source,
        source_type: "structured_output",
      },
    });
  }

  for (const skill of normalizedProfile.skills) {
    entityDrafts.push({
      description: skill.category || null,
      entity_type: "skill",
      label: skill.name,
      metadata: {
        category: skill.category || null,
        section: "skills",
        source,
        source_type: "structured_output",
      },
    });
  }

  for (const title of normalizedProfile.titles) {
    entityDrafts.push({
      description: null,
      entity_type: "title",
      label: title,
      metadata: {
        section: "titles",
        source,
        source_type: "structured_output",
      },
    });
  }

  for (const industry of normalizedProfile.industries) {
    entityDrafts.push({
      description: null,
      entity_type: "industry",
      label: industry,
      metadata: {
        section: "industries",
        source,
        source_type: "structured_output",
      },
    });
  }

  if (
    normalizedProfile.seniority &&
    normalizedProfile.seniority !== "unknown"
  ) {
    entityDrafts.push({
      description: `Inferred seniority: ${normalizedProfile.seniority}`,
      entity_type: "seniority",
      label: normalizedProfile.seniority,
      metadata: {
        section: "seniority",
        source,
        source_type: "structured_output",
      },
    });
  }

  for (const item of normalizedProfile.education) {
    entityDrafts.push({
      description: [
        item.degree,
        item.field,
        item.start_date,
        item.end_date,
        item.details,
      ]
        .filter(Boolean)
        .join(" • "),
      entity_type: "education",
      label: item.school || item.degree || "Education",
      metadata: {
        ...item,
        section: "education",
        source,
        source_type: "structured_output",
      },
    });
  }

  for (const item of normalizedProfile.experience) {
    entityDrafts.push({
      description: [
        item.summary,
        ...item.bullets,
        item.location,
        item.start_date,
        item.end_date,
      ]
        .filter(Boolean)
        .join(" • "),
      entity_type: "experience",
      label: item.title || item.company || "Experience",
      metadata: {
        ...item,
        section: "experience",
        source,
        source_type: "structured_output",
      },
    });
  }

  for (const item of normalizedProfile.certifications) {
    entityDrafts.push({
      description: [item.issuer, item.date, item.expires_on]
        .filter(Boolean)
        .join(" • "),
      entity_type: "certification",
      label: item.name || "Certification",
      metadata: {
        ...item,
        section: "certifications",
        source,
        source_type: "structured_output",
      },
    });
  }

  return entityDrafts;
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
  return buildResumeEntityDraftsFromProfile(profile, "resume");
}
