import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildJobEmbeddingContent,
  createJobEmbedding,
  hashJobEmbeddingContent,
} from "./job-embedding.mjs";

const DEFAULT_BATCH_SIZE = 25;

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
    // Hosted workers can provide environment variables directly.
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local before embedding jobs.`,
    );
  }

  return value;
}

function getBatchSize() {
  const rawBatchSize = process.argv
    .find((argument) => argument.startsWith("--limit="))
    ?.split("=")
    .at(1);
  const batchSize = Number(rawBatchSize ?? DEFAULT_BATCH_SIZE);

  return Number.isFinite(batchSize) && batchSize > 0
    ? Math.floor(batchSize)
    : DEFAULT_BATCH_SIZE;
}

async function readExistingJobEmbedding(supabase, jobId) {
  const { data, error } = await supabase
    .from("job_embeddings")
    .select("content_hash, embedding_model")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

async function upsertJobEmbedding(supabase, job, embedding, contentHash) {
  const embeddingModel =
    process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
  const embeddingDimensions = Number(
    process.env.OPENAI_EMBEDDING_DIMENSIONS?.trim() || 1536,
  );

  const { error } = await supabase.from("job_embeddings").upsert(
    {
      content_hash: contentHash,
      embedding,
      embedding_dimensions: embeddingDimensions,
      embedding_model: embeddingModel,
      job_id: job.id,
    },
    {
      onConflict: "job_id",
    },
  );

  if (error) {
    throw error;
  }
}

async function embedJob(supabase, job) {
  const embeddingContent = buildJobEmbeddingContent(job);
  const contentHash = hashJobEmbeddingContent(embeddingContent);
  const embeddingModel =
    process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
  const existingEmbedding = await readExistingJobEmbedding(supabase, job.id);

  if (
    existingEmbedding?.content_hash === contentHash &&
    existingEmbedding?.embedding_model === embeddingModel
  ) {
    return { embedded: false, skipped: true };
  }

  try {
    const embedding = await createJobEmbedding(embeddingContent);

    if (!embedding) {
      console.warn(
        `Skipping job embedding for ${job.id} because OPENAI_API_KEY is not configured.`,
      );

      return { embedded: false, skipped: true };
    }

    await upsertJobEmbedding(supabase, job, embedding, contentHash);

    return { embedded: true, skipped: false };
  } catch (error) {
    console.warn(`Failed to store job embedding for ${job.id}:`, error);

    return { embedded: false, skipped: true };
  }
}

async function main() {
  loadLocalEnv();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = requireEnv("SUPABASE_SECRET_KEY");
  const batchSize = getBatchSize();

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id, title, company_name, description, requirements, location, country_code, work_mode, employment_type, salary_min_usd, salary_max_usd, salary_period, seniority, industry, skills",
    )
    .eq("is_active", true)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(batchSize);

  if (error) {
    throw error;
  }

  if (!jobs?.length) {
    console.log("No active jobs to embed.");
    process.exit(0);
  }

  let embeddedJobs = 0;
  let skippedJobs = 0;

  for (const job of jobs) {
    const result = await embedJob(supabase, job);

    if (result.embedded) {
      embeddedJobs += 1;
    } else if (result.skipped) {
      skippedJobs += 1;
    }
  }

  console.log(
    `Embedded ${embeddedJobs} job(s) and skipped ${skippedJobs} job(s) in this run.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
