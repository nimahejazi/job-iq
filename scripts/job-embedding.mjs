import { createHash } from "node:crypto";

const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_OPENAI_EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_TEXT_LIMIT = 16000;

function getOpenAIEmbeddingModel() {
  return (
    process.env.OPENAI_EMBEDDING_MODEL?.trim() || DEFAULT_OPENAI_EMBEDDING_MODEL
  );
}

function getOpenAIEmbeddingDimensions() {
  const rawDimensions = process.env.OPENAI_EMBEDDING_DIMENSIONS?.trim();

  if (!rawDimensions) {
    return DEFAULT_OPENAI_EMBEDDING_DIMENSIONS;
  }

  const parsed = Number(rawDimensions);

  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : DEFAULT_OPENAI_EMBEDDING_DIMENSIONS;
}

function normalizeMultilineText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function appendSection(lines, title, values) {
  const cleanedValues = values
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  if (!cleanedValues.length) {
    return;
  }

  lines.push(`${title}:`);
  for (const value of cleanedValues) {
    lines.push(`- ${value}`);
  }
}

function formatSalary(job) {
  const minSalary =
    typeof job.salary_min_usd === "number" ? job.salary_min_usd : null;
  const maxSalary =
    typeof job.salary_max_usd === "number" ? job.salary_max_usd : null;

  if (!minSalary && !maxSalary) {
    return null;
  }

  if (minSalary && maxSalary) {
    return `$${minSalary.toLocaleString()} - $${maxSalary.toLocaleString()} ${job.salary_period ?? ""}`.trim();
  }

  if (minSalary) {
    return `from $${minSalary.toLocaleString()} ${job.salary_period ?? ""}`.trim();
  }

  return `up to $${maxSalary.toLocaleString()} ${job.salary_period ?? ""}`.trim();
}

export function buildJobEmbeddingContent(job) {
  const lines = [];

  lines.push(`Job title: ${job.title}`);
  lines.push(`Company: ${job.company_name}`);

  const facts = [];

  if (job.location) {
    facts.push(`Location: ${job.location}`);
  }

  if (job.country_code) {
    facts.push(`Country: ${job.country_code}`);
  }

  if (job.work_mode) {
    facts.push(`Work mode: ${job.work_mode}`);
  }

  if (job.employment_type) {
    facts.push(`Employment type: ${job.employment_type}`);
  }

  if (job.seniority) {
    facts.push(`Seniority: ${job.seniority}`);
  }

  if (job.industry) {
    facts.push(`Industry: ${job.industry}`);
  }

  const salary = formatSalary(job);

  if (salary) {
    facts.push(`Salary: ${salary}`);
  }

  appendSection(lines, "Job facts", facts);
  appendSection(lines, "Skills", job.skills ?? []);

  const description = normalizeMultilineText(job.description ?? "");
  const requirements = normalizeMultilineText(job.requirements ?? "");

  if (description) {
    lines.push("Description:");
    lines.push(description.slice(0, EMBEDDING_TEXT_LIMIT));
  }

  if (requirements) {
    lines.push("Requirements:");
    lines.push(requirements.slice(0, EMBEDDING_TEXT_LIMIT));
  }

  return lines.join("\n");
}

export function hashJobEmbeddingContent(content) {
  return createHash("sha256").update(content).digest("hex");
}

export async function createJobEmbedding(content) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    body: JSON.stringify({
      dimensions: getOpenAIEmbeddingDimensions(),
      encoding_format: "float",
      input: content,
      model: getOpenAIEmbeddingModel(),
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const responseBody = await response.json();

  if (!response.ok) {
    const errorMessage =
      responseBody?.error?.message ??
      `OpenAI embedding request failed with status ${response.status}.`;

    throw new Error(errorMessage);
  }

  const embedding = responseBody?.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || !embedding.length) {
    throw new Error("OpenAI did not return an embedding vector.");
  }

  return embedding;
}
