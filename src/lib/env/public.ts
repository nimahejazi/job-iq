type SupabasePublicEnv = {
  url: string;
  publishableKey: string;
};

function readPublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function requirePublicKey() {
  const value = readPublicKey();

  if (!value) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add it to .env.local using .env.example as the template.",
    );
  }

  return value;
}

function requirePublicEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local using .env.example as the template.`,
    );
  }

  return value;
}

// Lets proxy/build-time code avoid hard failing before local Supabase credentials exist.
export function hasSupabasePublicEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && readPublicKey());
}

// Reads only browser-safe Supabase variables. Prefer the new publishable key, with legacy anon fallback.
export function getSupabasePublicEnv(): SupabasePublicEnv {
  return {
    url: requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: requirePublicKey(),
  };
}
