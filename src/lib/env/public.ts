type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

function requirePublicEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local using .env.example as the template.`,
    );
  }

  return value;
}

// Reads only browser-safe Supabase variables. These NEXT_PUBLIC values may be bundled client-side.
export function getSupabasePublicEnv(): SupabasePublicEnv {
  return {
    url: requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}
