import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const USAJOBS_BASE_URL = "https://data.usajobs.gov/api/search";
const DEFAULT_RESULTS_PER_PAGE = 50;
const DEFAULT_DATE_POSTED_DAYS = 14;
const DEFAULT_MAX_PAGES = 2;
const DEFAULT_SOURCE_NAME = "USAJOBS";

// Local scripts read the same .env.local file that Next.js uses so development stays predictable.
function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");

  try {
    const contents = readFileSync(envPath, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");

      if (separator === -1) {
        continue;
      }

      const name = trimmed.slice(0, separator);
      const value = trimmed.slice(separator + 1).replace(/^["']|["']$/g, "");

      process.env[name] ??= value;
    }
  } catch {
    // Hosted environments can provide variables directly.
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local before syncing USAJOBS.`,
    );
  }

  return value;
}

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

function toArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replace(/[^0-9.+-]/g, ""));

  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeLocationDescriptor(location) {
  if (!location || typeof location !== "object") {
    return null;
  }

  const locationName = firstString(
    location.LocationName,
    location.CityName,
    location.LocationDisplayName,
  );

  return locationName;
}

function extractDescription(descriptor) {
  return firstString(
    descriptor?.UserArea?.Details?.JobSummary,
    descriptor?.UserArea?.Details?.WhatToExpect,
    descriptor?.QualificationSummary,
    descriptor?.Requirements?.Summary,
    descriptor?.PositionRemuneration?.[0]?.Description,
    descriptor?.JobSummary,
  );
}

function extractWorkMode(descriptor) {
  const remoteIndicator = descriptor?.RemoteIndicator;

  if (remoteIndicator === true || remoteIndicator === "True") {
    return "remote";
  }

  const locationDisplay = firstString(descriptor?.PositionLocationDisplay);

  if (locationDisplay?.toLowerCase().includes("remote")) {
    return "remote";
  }

  return "unknown";
}

function extractEmploymentType(descriptor) {
  const scheduleName = firstString(
    descriptor?.PositionScheduleType?.[0]?.Name,
    descriptor?.PositionOfferingType?.[0]?.Name,
  );

  return scheduleName;
}

function extractSalary(descriptor) {
  const remuneration = toArray(descriptor?.PositionRemuneration)[0] ?? {};

  return {
    min: toNumber(
      remuneration.MinimumRange ??
        remuneration.minimumRange ??
        remuneration.Amount,
    ),
    max: toNumber(
      remuneration.MaximumRange ??
        remuneration.maximumRange ??
        remuneration.Amount,
    ),
    period: firstString(
      remuneration.RateIntervalCode,
      remuneration.Period,
      remuneration.Periodicity,
    ),
  };
}

function extractSeniority(descriptor) {
  const grades = toArray(descriptor?.JobGrade)
    .map((grade) => firstString(grade?.Code, grade?.Name))
    .filter(Boolean)
    .map((grade) => grade.replace(/[^0-9]/g, ""))
    .filter(Boolean);

  if (!grades.length) {
    return null;
  }

  const highestGrade = Math.max(
    ...grades
      .map((grade) => Number.parseInt(grade, 10))
      .filter(Number.isFinite),
  );

  if (highestGrade >= 13) {
    return "senior";
  }

  if (highestGrade >= 9) {
    return "mid";
  }

  return "junior";
}

function extractSkills(descriptor) {
  return toArray(descriptor?.JobCategory)
    .map((category) => firstString(category?.Name))
    .filter(Boolean);
}

function normalizeUsaJobsItem(item) {
  const descriptor = item?.MatchedObjectDescriptor ?? {};
  const locations = toArray(descriptor.PositionLocation)
    .map(normalizeLocationDescriptor)
    .filter(Boolean);
  const salary = extractSalary(descriptor);
  const applyUrl = firstString(
    descriptor.ApplyURI?.[0],
    descriptor.PositionURI,
    item?.MatchedObjectId
      ? `https://www.usajobs.gov/GetJob/ViewDetails/${item.MatchedObjectId}`
      : null,
  );
  const sourceId = firstString(item?.MatchedObjectId, descriptor.PositionID);

  if (!sourceId) {
    return null;
  }

  return {
    apply_url: applyUrl,
    company_name: firstString(
      descriptor.OrganizationName,
      descriptor.DepartmentName,
      "USAJOBS",
    ),
    country_code: firstString(
      descriptor.PositionLocation?.[0]?.CountryCode,
      "United States",
    ),
    description: extractDescription(descriptor),
    employment_type: extractEmploymentType(descriptor),
    expires_at: parseDate(
      firstString(
        descriptor.ApplicationCloseDate,
        descriptor.PositionEndDate,
        descriptor.ClosingDate,
      ),
    ),
    external_id: sourceId,
    industry: "government",
    is_active: true,
    location: firstString(
      descriptor.PositionLocationDisplay,
      locations.join(", "),
    ),
    posted_at: parseDate(
      firstString(
        descriptor.PublicationStartDate,
        descriptor.PositionStartDate,
        descriptor.JobOpeningStartDate,
      ),
    ),
    raw_payload: item,
    requirements: firstString(
      descriptor.Qualifications,
      descriptor.QualificationSummary,
      descriptor.UserArea?.Details?.Requirements,
    ),
    salary_max_usd: salary.max,
    salary_min_usd: salary.min,
    salary_period: salary.period,
    seniority: extractSeniority(descriptor),
    skills: extractSkills(descriptor),
    title: firstString(descriptor.PositionTitle, descriptor.PositionID),
    work_mode: extractWorkMode(descriptor),
  };
}

function buildUsaJobsSearchUrl({
  keyword,
  location,
  page = 1,
  resultsPerPage = DEFAULT_RESULTS_PER_PAGE,
  datePosted = DEFAULT_DATE_POSTED_DAYS,
} = {}) {
  const url = new URL(USAJOBS_BASE_URL);

  url.searchParams.set("Fields", "Full");
  url.searchParams.set("WhoMayApply", "Public");
  url.searchParams.set("ResultsPerPage", String(resultsPerPage));
  url.searchParams.set("Page", String(page));
  url.searchParams.set("SortField", "DatePosted");
  url.searchParams.set("SortDirection", "Desc");
  url.searchParams.set("DatePosted", String(datePosted));

  if (keyword?.trim()) {
    url.searchParams.set("Keyword", keyword.trim());
  }

  if (location?.trim()) {
    url.searchParams.set("LocationName", location.trim());
  }

  return url;
}

async function fetchUsaJobsPage({ apiKey, userAgent, url }) {
  const response = await fetch(url, {
    headers: {
      "Authorization-Key": apiKey,
      Host: "data.usajobs.gov",
      "User-Agent": userAgent,
    },
  });

  if (!response.ok) {
    throw new Error(
      `USAJOBS request failed with ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

function extractUsaJobsItems(payload) {
  return payload?.SearchResult?.SearchResultItems ?? [];
}

function extractUsaJobsPageCount(payload) {
  const pages = payload?.SearchResult?.UserArea?.NumberOfPages;
  const parsed = Number.parseInt(String(pages), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildSourceConfig({
  keyword,
  location,
  datePosted,
  resultsPerPage,
  maxPages,
}) {
  return {
    date_posted_days: datePosted,
    keyword: keyword ?? null,
    location: location ?? null,
    max_pages: maxPages,
    provider: DEFAULT_SOURCE_NAME,
    results_per_page: resultsPerPage,
    who_may_apply: "Public",
  };
}

export {
  DEFAULT_DATE_POSTED_DAYS,
  DEFAULT_MAX_PAGES,
  DEFAULT_RESULTS_PER_PAGE,
  DEFAULT_SOURCE_NAME,
  buildSourceConfig,
  buildUsaJobsSearchUrl,
  extractUsaJobsItems,
  extractUsaJobsPageCount,
  fetchUsaJobsPage,
  loadLocalEnv,
  normalizeUsaJobsItem,
  requireEnv,
};
