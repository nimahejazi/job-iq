import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const RESUME_BUCKET = "resumes";
const RESUME_BUCKET_CONFIG = {
  public: false,
  fileSizeLimit: 10 * 1024 * 1024,
  allowedMimeTypes: ["application/pdf"],
};

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
    // CI or hosted environments can provide variables directly without a local env file.
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local before running storage setup.`,
    );
  }

  return value;
}

loadLocalEnv();

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const secretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!secretKey) {
  throw new Error(
    "Missing SUPABASE_SECRET_KEY. Storage setup needs a server-only key.",
  );
}

// The storage admin API needs the secret key because bucket creation is a trusted backend action.
const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data: existingBuckets, error: listError } =
  await supabase.storage.listBuckets();

if (listError) {
  throw listError;
}

const bucketExists = existingBuckets.some(
  (bucket) => bucket.name === RESUME_BUCKET,
);

if (bucketExists) {
  const { error } = await supabase.storage.updateBucket(
    RESUME_BUCKET,
    RESUME_BUCKET_CONFIG,
  );

  if (error) {
    throw error;
  }

  console.log(`Updated private Supabase Storage bucket: ${RESUME_BUCKET}`);
} else {
  const { error } = await supabase.storage.createBucket(
    RESUME_BUCKET,
    RESUME_BUCKET_CONFIG,
  );

  if (error) {
    throw error;
  }

  console.log(`Created private Supabase Storage bucket: ${RESUME_BUCKET}`);
}
