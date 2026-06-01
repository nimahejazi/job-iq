import "server-only";

function requireServerEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local and keep it out of the browser bundle.`,
    );
  }

  return value;
}

// Service-role access bypasses Row Level Security, so keep this helper server-only.
export function getSupabaseServiceRoleKey() {
  return requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
}
