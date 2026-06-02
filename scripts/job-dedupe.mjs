import { createHash } from "node:crypto";

// The dedupe key is a stable fingerprint so we can collapse repeated postings from the same source.
function normalizeJobDedupePart(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildJobDedupeKey({
  sourceId,
  companyName,
  title,
  location,
  applyUrl,
}) {
  const canonicalParts = [
    normalizeJobDedupePart(sourceId),
    normalizeJobDedupePart(companyName),
    normalizeJobDedupePart(title),
    normalizeJobDedupePart(location),
    normalizeJobDedupePart(applyUrl),
  ];

  return createHash("sha256").update(canonicalParts.join("|")).digest("hex");
}

export { buildJobDedupeKey, normalizeJobDedupePart };
