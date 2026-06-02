import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type SimilarJobRow = {
  company_name: string;
  distance: number;
  job_id: string;
  location: string | null;
  posted_at: string | null;
  salary_max_usd: number | null;
  salary_min_usd: number | null;
  similarity: number;
  title: string;
  work_mode: "remote" | "hybrid" | "onsite" | "unknown" | null;
};

export function normalizeMatchCount(matchCount: number) {
  if (!Number.isFinite(matchCount) || matchCount <= 0) {
    return 10;
  }

  return Math.min(Math.floor(matchCount), 100);
}

// The ranking pipeline can call this helper with a user or resume embedding to get the closest jobs first.
export async function findSimilarJobsByEmbedding(
  supabase: SupabaseClient<Database>,
  queryEmbedding: number[],
  matchCount = 10,
) {
  const normalizedMatchCount = normalizeMatchCount(matchCount);

  return supabase.rpc("find_similar_jobs", {
    match_count: normalizedMatchCount,
    query_embedding: queryEmbedding,
  });
}

export type { SimilarJobRow };
