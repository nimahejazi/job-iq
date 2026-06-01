import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/env/public";
import { getSupabaseServiceRoleKey } from "@/lib/env/server";
import type { Database } from "@/lib/supabase/database.types";

// Admin client is only for trusted backend tasks because the service role bypasses Row Level Security.
export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicEnv();

  return createClient<Database>(url, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
