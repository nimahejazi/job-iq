import { createClient } from "@supabase/supabase-js";
import {
  buildSourceConfig,
  buildUsaJobsSearchUrl,
  DEFAULT_DATE_POSTED_DAYS,
  DEFAULT_MAX_PAGES,
  DEFAULT_RESULTS_PER_PAGE,
  DEFAULT_SOURCE_NAME,
  extractUsaJobsItems,
  extractUsaJobsPageCount,
  fetchUsaJobsPage,
  loadLocalEnv,
  normalizeUsaJobsItem,
  requireEnv,
} from "./usajobs.mjs";
import { buildJobDedupeKey } from "./job-dedupe.mjs";

function readNumberEnv(name, fallback) {
  const raw = process.env[name]?.trim();

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCliArgs(argv) {
  const args = {
    datePosted: readNumberEnv(
      "USAJOBS_DATE_POSTED_DAYS",
      DEFAULT_DATE_POSTED_DAYS,
    ),
    keyword: process.env.USAJOBS_KEYWORD?.trim() || "",
    location: process.env.USAJOBS_LOCATION?.trim() || "",
    maxPages: readNumberEnv("USAJOBS_MAX_PAGES", DEFAULT_MAX_PAGES),
    resultsPerPage: readNumberEnv(
      "USAJOBS_RESULTS_PER_PAGE",
      DEFAULT_RESULTS_PER_PAGE,
    ),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--keyword" && next) {
      args.keyword = next;
      index += 1;
      continue;
    }

    if (token === "--location" && next) {
      args.location = next;
      index += 1;
      continue;
    }

    if (token === "--date-posted" && next) {
      args.datePosted = Number(next);
      index += 1;
      continue;
    }

    if (token === "--results-per-page" && next) {
      args.resultsPerPage = Number(next);
      index += 1;
      continue;
    }

    if (token === "--max-pages" && next) {
      args.maxPages = Number(next);
      index += 1;
      continue;
    }
  }

  for (const [name, value] of Object.entries(args)) {
    if (name === "keyword" || name === "location") {
      continue;
    }

    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid USAJOBS ${name} value. Use a positive number.`);
    }
  }

  return args;
}

async function upsertSource(supabase, config) {
  const { data, error } = await supabase
    .from("job_sources")
    .upsert(
      {
        base_url: "https://data.usajobs.gov/api/search",
        config,
        name: DEFAULT_SOURCE_NAME,
        source_type: "government",
        sync_enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "name" },
    )
    .select("id, name");

  if (error) {
    throw error;
  }

  if (!data?.[0]) {
    throw new Error("Unable to create or load the USAJOBS source row.");
  }

  return data[0];
}

async function markSourceSyncState(supabase, sourceId, { status, error }) {
  const { error: updateError } = await supabase
    .from("job_sources")
    .update({
      last_sync_error: error ?? null,
      last_sync_status: status,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  if (updateError) {
    throw updateError;
  }
}

function normalizeJobRow(sourceId, item) {
  const job = normalizeUsaJobsItem(item);

  if (!job) {
    return null;
  }

  return {
    apply_url: job.apply_url,
    company_name: job.company_name,
    country_code: job.country_code,
    description: job.description,
    employment_type: job.employment_type,
    expires_at: job.expires_at,
    external_id: job.external_id,
    dedupe_key: buildJobDedupeKey({
      applyUrl: job.apply_url,
      companyName: job.company_name,
      location: job.location,
      sourceId,
      title: job.title,
    }),
    industry: job.industry,
    is_active: job.is_active,
    location: job.location,
    posted_at: job.posted_at,
    raw_payload: job.raw_payload,
    requirements: job.requirements,
    salary_max_usd: job.salary_max_usd,
    salary_min_usd: job.salary_min_usd,
    salary_period: job.salary_period,
    seniority: job.seniority,
    skills: job.skills,
    source_id: sourceId,
    title: job.title,
    work_mode: job.work_mode,
  };
}

async function upsertJobs(supabase, sourceId, items) {
  const rows = items
    .map((item) => normalizeJobRow(sourceId, item))
    .filter(Boolean);

  if (!rows.length) {
    return {
      inserted: 0,
      skippedDuplicates: 0,
    };
  }

  const uniqueRowsByDedupeKey = new Map();

  for (const row of rows) {
    if (!uniqueRowsByDedupeKey.has(row.dedupe_key)) {
      uniqueRowsByDedupeKey.set(row.dedupe_key, row);
    }
  }

  const dedupeKeys = [...uniqueRowsByDedupeKey.keys()];
  const { data: existingRows, error: lookupError } = await supabase
    .from("jobs")
    .select("dedupe_key, external_id")
    .in("dedupe_key", dedupeKeys);

  if (lookupError) {
    throw lookupError;
  }

  const existingExternalIdsByDedupeKey = new Map(
    (existingRows ?? []).map((row) => [row.dedupe_key, row.external_id]),
  );
  const rowsToUpsert = [...uniqueRowsByDedupeKey.values()].filter((row) => {
    const existingExternalId = existingExternalIdsByDedupeKey.get(
      row.dedupe_key,
    );

    return !existingExternalId || existingExternalId === row.external_id;
  });
  const skippedDuplicates = rows.length - rowsToUpsert.length;

  if (!rowsToUpsert.length) {
    return {
      inserted: 0,
      skippedDuplicates,
    };
  }

  const { error } = await supabase
    .from("jobs")
    .upsert(rowsToUpsert, { onConflict: "source_id,external_id" });

  if (error) {
    throw error;
  }

  return {
    inserted: rowsToUpsert.length,
    skippedDuplicates,
  };
}

async function syncUsaJobs() {
  await loadLocalEnv();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = requireEnv("SUPABASE_SECRET_KEY");
  const apiKey = requireEnv("USAJOBS_API_KEY");
  const userAgent = requireEnv("USAJOBS_USER_AGENT");
  const { keyword, location, datePosted, maxPages, resultsPerPage } =
    parseCliArgs(process.argv);

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const source = await upsertSource(
    supabase,
    buildSourceConfig({
      datePosted,
      keyword,
      location,
      maxPages,
      resultsPerPage,
    }),
  );

  let insertedJobs = 0;
  let skippedDuplicates = 0;

  try {
    console.log(
      `Syncing ${DEFAULT_SOURCE_NAME} with page size ${resultsPerPage} and max pages ${maxPages}.`,
    );

    const firstPageUrl = buildUsaJobsSearchUrl({
      datePosted,
      keyword,
      location,
      page: 1,
      resultsPerPage,
    });
    const firstPayload = await fetchUsaJobsPage({
      apiKey,
      userAgent,
      url: firstPageUrl,
    });
    const totalPages = Math.min(
      extractUsaJobsPageCount(firstPayload),
      maxPages,
    );

    const firstPageResult = await upsertJobs(
      supabase,
      source.id,
      extractUsaJobsItems(firstPayload),
    );
    insertedJobs += firstPageResult.inserted;
    skippedDuplicates += firstPageResult.skippedDuplicates;

    for (let page = 2; page <= totalPages; page += 1) {
      const pageUrl = buildUsaJobsSearchUrl({
        datePosted,
        keyword,
        location,
        page,
        resultsPerPage,
      });

      const payload = await fetchUsaJobsPage({
        apiKey,
        userAgent,
        url: pageUrl,
      });

      const pageResult = await upsertJobs(
        supabase,
        source.id,
        extractUsaJobsItems(payload),
      );

      insertedJobs += pageResult.inserted;
      skippedDuplicates += pageResult.skippedDuplicates;
    }

    await markSourceSyncState(supabase, source.id, { status: "success" });

    console.log(
      `USAJOBS sync finished with ${insertedJobs} normalized jobs across ${totalPages} page(s); skipped ${skippedDuplicates} duplicate(s).`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "USAJOBS sync failed.";

    await markSourceSyncState(supabase, source.id, {
      error: message,
      status: "failed",
    });

    throw error;
  }
}

syncUsaJobs().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
