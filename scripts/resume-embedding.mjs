import { createHash } from "node:crypto";

const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_OPENAI_EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_TEXT_LIMIT = 12000;

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

export function buildResumeEmbeddingContent({
  extractedText,
  entityDrafts,
  originalFileName,
}) {
  const lines = [];

  if (originalFileName) {
    lines.push(`Resume file: ${originalFileName}`);
  }

  const groupedEntities = new Map();

  for (const entity of entityDrafts) {
    const group = groupedEntities.get(entity.entity_type) ?? [];
    const label = typeof entity.label === "string" ? entity.label.trim() : "";
    const description =
      typeof entity.description === "string" ? entity.description.trim() : "";
    const metadata = entity.metadata ?? {};

    let line = label;

    if (description) {
      line = `${label} — ${description}`;
    } else if (
      metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata)
    ) {
      const metadataBits = [];

      if (typeof metadata.section === "string" && metadata.section.trim()) {
        metadataBits.push(metadata.section.trim());
      }

      if (typeof metadata.category === "string" && metadata.category.trim()) {
        metadataBits.push(metadata.category.trim());
      }

      if (metadataBits.length) {
        line = `${label} (${metadataBits.join(", ")})`;
      }
    }

    if (line.trim()) {
      group.push(line.trim());
    }

    groupedEntities.set(entity.entity_type, group);
  }

  appendSection(lines, "Summary", groupedEntities.get("summary") ?? []);
  appendSection(lines, "Skills", groupedEntities.get("skill") ?? []);
  appendSection(lines, "Titles", groupedEntities.get("title") ?? []);
  appendSection(lines, "Industries", groupedEntities.get("industry") ?? []);
  appendSection(lines, "Seniority", groupedEntities.get("seniority") ?? []);
  appendSection(lines, "Education", groupedEntities.get("education") ?? []);
  appendSection(lines, "Experience", groupedEntities.get("experience") ?? []);
  appendSection(
    lines,
    "Certifications",
    groupedEntities.get("certification") ?? [],
  );

  const normalizedText = normalizeMultilineText(extractedText ?? "");

  if (normalizedText) {
    lines.push("Resume text excerpt:");
    lines.push(normalizedText.slice(0, EMBEDDING_TEXT_LIMIT));
  }

  return lines.join("\n");
}

export function hashResumeEmbeddingContent(content) {
  return createHash("sha256").update(content).digest("hex");
}

export async function createResumeEmbedding(content) {
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
