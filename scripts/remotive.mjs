const REMOTIVE_BASE_URL = "https://remotive.com/api/remote-jobs";
const DEFAULT_SOURCE_NAME = "Remotive";

function firstString(...values) {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function stripHtml(value) {
  if (typeof value !== "string") {
    return null;
  }

  const stripped = value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return stripped || null;
}

function parseSalaryRange(value) {
  if (typeof value !== "string") {
    return { max: null, min: null, period: null };
  }

  const cleaned = value.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/(\$?\d[\d,]*)\s*-\s*(\$?\d[\d,]*)/);
  const min = match?.[1]?.replace(/[^0-9]/g, "") ?? null;
  const max = match?.[2]?.replace(/[^0-9]/g, "") ?? null;

  return {
    max: max ? Number(max) : null,
    min: min ? Number(min) : null,
    period: cleaned.toLowerCase().includes("year") ? "year" : null,
  };
}

function buildRemotiveSearchUrl({ category, companyName, limit, search } = {}) {
  const url = new URL(REMOTIVE_BASE_URL);

  if (category?.trim()) {
    url.searchParams.set("category", category.trim());
  }

  if (companyName?.trim()) {
    url.searchParams.set("company_name", companyName.trim());
  }

  if (search?.trim()) {
    url.searchParams.set("search", search.trim());
  }

  if (Number.isFinite(limit) && limit > 0) {
    url.searchParams.set("limit", String(limit));
  }

  return url;
}

function extractRemotiveItems(payload) {
  return payload?.jobs ?? [];
}

function normalizeRemotiveJob(item) {
  const sourceId =
    item?.id === null || item?.id === undefined ? null : String(item.id);

  if (!sourceId) {
    return null;
  }

  const salary = parseSalaryRange(item?.salary);
  const title = firstString(item?.title, sourceId);
  const companyName = firstString(item?.company_name, "Remotive");
  const applyUrl = firstString(item?.url);
  const location = firstString(item?.candidate_required_location);

  if (!title || !companyName || !applyUrl) {
    return null;
  }

  return {
    apply_url: applyUrl,
    company_name: companyName,
    country_code: null,
    description: stripHtml(item?.description),
    employment_type: firstString(item?.job_type),
    expires_at: null,
    external_id: sourceId,
    industry: firstString(item?.category, "remote"),
    is_active: true,
    location,
    posted_at: item?.publication_date
      ? new Date(item.publication_date).toISOString()
      : null,
    raw_payload: item,
    requirements: null,
    salary_max_usd: salary.max,
    salary_min_usd: salary.min,
    salary_period: salary.period,
    seniority: null,
    skills: firstString(item?.category) ? [item.category] : [],
    title,
    work_mode: "remote",
  };
}

function buildSourceConfig({ category, companyName, limit, search }) {
  return {
    category: category ?? null,
    company_name: companyName ?? null,
    limit: limit ?? null,
    provider: DEFAULT_SOURCE_NAME,
    search: search ?? null,
  };
}

export {
  DEFAULT_SOURCE_NAME,
  buildRemotiveSearchUrl,
  buildSourceConfig,
  extractRemotiveItems,
  normalizeRemotiveJob,
};
