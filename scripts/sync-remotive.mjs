import { createClient } from "@supabase/supabase-js";
import { buildJobDedupeKey } from "./job-dedupe.mjs";
import {
  buildRemotiveSearchUrl,
  buildSourceConfig,
  DEFAULT_SOURCE_NAME,
  extractRemotiveItems,
  normalizeRemotiveJob,
} from "./remotive.mjs";
import { loadLocalEnv, requireEnv } from "./usajobs.mjs";

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
    category: process.env.REMOTIVE_CATEGORY?.trim() || "",
    companyName: process.env.REMOTIVE_COMPANY_NAME?.trim() || "",
    limit: readNumberEnv("REMOTIVE_LIMIT", 0),
    search: process.env.REMOTIVE_SEARCH?.trim() || "",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--category" && next) {
      args.category = next;
      index += 1;
      continue;
    }

    if (token === "--company-name" && next) {
      args.companyName = next;
      index += 1;
      continue;
    }

    if (token === "--search" && next) {
      args.search = next;
      index += 1;
      continue;
    }

    if (token === "--limit" && next) {
      args.limit = Number(next);
      index += 1;
    }
  }

  if (!Number.isFinite(args.limit) || args.limit < 0) {
    throw new Error(
      "Invalid REMOTIVE_LIMIT value. Use a positive number or 0 for all jobs.",
    );
  }

  return args;
}

async function upsertSource(supabase, config) {
  const { data, error } = await supabase
    .from("job_sources")
    .upsert(
      {
        base_url: "https://remotive.com/api/remote-jobs",
        config,
        name: DEFAULT_SOURCE_NAME,
        source_type: "public_feed",
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
    throw new Error("Unable to create or load the Remotive source row.");
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
  const job = normalizeRemotiveJob(item);

  if (!job) {
    return null;
  }

  return {
    apply_url: job.apply_url,
    company_name: job.company_name,
    country_code: job.country_code,
    description: job.description,
    dedupe_key: buildJobDedupeKey({
      applyUrl: job.apply_url,
      companyName: job.company_name,
      location: job.location,
      sourceId,
      title: job.title,
    }),
    employment_type: job.employment_type,
    expires_at: job.expires_at,
    external_id: job.external_id,
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

async function syncRemotive() {
  await loadLocalEnv();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = requireEnv("SUPABASE_SECRET_KEY");
  const { category, companyName, limit, search } = parseCliArgs(process.argv);

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const source = await upsertSource(
    supabase,
    buildSourceConfig({
      category,
      companyName,
      limit,
      search,
    }),
  );

  let insertedJobs = 0;
  let skippedDuplicates = 0;

  try {
    console.log(
      `Syncing ${DEFAULT_SOURCE_NAME}${search ? ` for "${search}"` : ""} with limit ${limit || "all"}.`,
    );

    const url = buildRemotiveSearchUrl({
      category,
      companyName,
      limit: limit > 0 ? limit : undefined,
      search,
    });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Remotive request failed with ${response.status} ${response.statusText}`,
      );
    }

    const payload = await response.json();
    const result = await upsertJobs(
      supabase,
      source.id,
      extractRemotiveItems(payload),
    );

    insertedJobs += result.inserted;
    skippedDuplicates += result.skippedDuplicates;

    await markSourceSyncState(supabase, source.id, { status: "success" });

    console.log(
      `Remotive sync finished with ${insertedJobs} normalized jobs; skipped ${skippedDuplicates} duplicate(s).`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Remotive sync failed.";

    await markSourceSyncState(supabase, source.id, {
      error: message,
      status: "failed",
    });

    throw error;
  }
}

syncRemotive().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
