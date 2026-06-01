import "server-only";

function readSecretKey() {
  return (
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function requireServerEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local and keep it out of the browser bundle.`,
    );
  }

  return value;
}

// Secret access bypasses Row Level Security, so keep this helper server-only.
export function getSupabaseSecretKey() {
  const value = readSecretKey();

  if (!value) {
    return requireServerEnv("SUPABASE_SECRET_KEY");
  }

  return value;
}
