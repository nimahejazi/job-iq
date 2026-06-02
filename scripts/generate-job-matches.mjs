import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCandidateProfileFromResumeEntities,
  buildMatchExplanation,
} from "../src/lib/jobs/match-results.ts";
import { calculateJobMatchScore } from "../src/lib/jobs/scoring.ts";
import { findSimilarJobsByEmbedding } from "../src/lib/jobs/nearest-neighbors.ts";

const DEFAULT_LIMIT = 50;

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
      `Missing ${name}. Add it to .env.local before generating matches.`,
    );
  }

  return value;
}

function parseArgs(argv) {
  const args = {
    limit: Number(process.env.JOB_MATCH_LIMIT?.trim() ?? DEFAULT_LIMIT),
    resumeId: process.env.JOB_MATCH_RESUME_ID?.trim() || "",
    userId: process.env.JOB_MATCH_USER_ID?.trim() || "",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--user-id" && next) {
      args.userId = next;
      index += 1;
      continue;
    }

    if (token === "--resume-id" && next) {
      args.resumeId = next;
      index += 1;
      continue;
    }

    if (token === "--limit" && next) {
      args.limit = Number(next);
      index += 1;
    }
  }

  if (!args.userId) {
    throw new Error("Pass --user-id to generate matches for a specific user.");
  }

  if (!Number.isFinite(args.limit) || args.limit <= 0) {
    throw new Error("Invalid JOB_MATCH_LIMIT value. Use a positive number.");
  }

  return args;
}

async function loadPreferences(supabase, userId) {
  const { data, error } = await supabase
    .from("user_preferences")
    .select(
      "desired_titles, employment_types, experience_level, excluded_industries, excluded_titles, min_salary_usd, preferred_locations, willing_to_relocate, work_modes",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`No preferences found for user ${userId}.`);
  }

  return data;
}

async function loadLatestResumeId(supabase, userId, resumeId) {
  if (resumeId) {
    const { data, error } = await supabase
      .from("resumes")
      .select("id, user_id")
      .eq("id", resumeId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(`Resume ${resumeId} was not found for user ${userId}.`);
    }

    return data.id;
  }

  const { data, error } = await supabase
    .from("user_embeddings")
    .select("resume_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.resume_id) {
    return data.resume_id;
  }

  throw new Error(`No resume embedding found for user ${userId}.`);
}

async function loadResumeEntities(supabase, resumeId) {
  const { data, error } = await supabase
    .from("resume_entities")
    .select(
      "entity_type, label, description, metadata, resume_id, source, user_id",
    )
    .eq("resume_id", resumeId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function loadUserEmbedding(supabase, userId, resumeId) {
  const query = supabase
    .from("user_embeddings")
    .select("embedding, content_hash, embedding_model, resume_id")
    .eq("user_id", userId);

  if (resumeId) {
    query.eq("resume_id", resumeId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`No embedding found for user ${userId}.`);
  }

  return data;
}

async function loadCandidateJobs(supabase, embedding, limit) {
  const { data, error } = await findSimilarJobsByEmbedding(
    supabase,
    embedding,
    limit,
  );

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function loadFullJobsById(supabase, jobIds) {
  if (!jobIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, apply_url, company_name, country_code, created_at, dedupe_key, description, employment_type, expires_at, external_id, industry, is_active, location, posted_at, raw_payload, requirements, salary_max_usd, salary_min_usd, salary_period, seniority, skills, source_id, title, updated_at, work_mode",
    )
    .in("id", jobIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function replaceJobMatches(supabase, userId, resumeId, rows) {
  const { error: deleteError } = await supabase
    .from("job_matches")
    .delete()
    .eq("user_id", userId)
    .eq("resume_id", resumeId);

  if (deleteError) {
    throw deleteError;
  }

  if (!rows.length) {
    return;
  }

  const { error: insertError } = await supabase
    .from("job_matches")
    .upsert(rows, {
      onConflict: "user_id,job_id,resume_id",
    });

  if (insertError) {
    throw insertError;
  }
}

async function main() {
  loadLocalEnv();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = requireEnv("SUPABASE_SECRET_KEY");
  const {
    limit,
    resumeId: requestedResumeId,
    userId,
  } = parseArgs(process.argv);

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const resumeId = await loadLatestResumeId(
    supabase,
    userId,
    requestedResumeId,
  );
  const [preferences, resumeEntities, embeddingRecord] = await Promise.all([
    loadPreferences(supabase, userId),
    loadResumeEntities(supabase, resumeId),
    loadUserEmbedding(supabase, userId, resumeId),
  ]);

  const candidate = buildCandidateProfileFromResumeEntities(resumeEntities);
  const candidateJobs = await loadCandidateJobs(
    supabase,
    embeddingRecord.embedding,
    limit,
  );
  const jobIds = candidateJobs.map((job) => job.job_id);
  const fullJobs = await loadFullJobsById(supabase, jobIds);
  const fullJobsById = new Map(fullJobs.map((job) => [job.id, job]));
  const now = new Date();

  const matchRows = candidateJobs
    .map((job) => {
      const fullJob = fullJobsById.get(job.job_id);

      if (!fullJob) {
        return null;
      }

      const result = calculateJobMatchScore({
        candidate,
        job: fullJob,
        now,
        preferences,
        semanticSimilarity: job.similarity,
      });

      return {
        explanation: buildMatchExplanation(result),
        generated_at: now.toISOString(),
        job_id: fullJob.id,
        resume_id: resumeId,
        score: result.score,
        score_breakdown: result.breakdown,
        user_id: userId,
      };
    })
    .filter(Boolean);

  await replaceJobMatches(supabase, userId, resumeId, matchRows);

  console.log(
    `Stored ${matchRows.length} ranked match rows for user ${userId} and resume ${resumeId}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
