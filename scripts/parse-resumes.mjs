import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_BATCH_SIZE = 5;

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
    throw new Error(`Missing ${name}. Add it to .env.local before parsing.`);
  }

  return value;
}

function normalizeExtractedText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractTextFromPdfBlob(blob) {
  const parser = new PDFParse({
    data: Buffer.from(await blob.arrayBuffer()),
  });

  try {
    const result = await parser.getText();

    return {
      pageCount: result.total,
      text: normalizeExtractedText(result.text),
    };
  } finally {
    await parser.destroy();
  }
}

async function markResumeFailed(supabase, resume, message) {
  const { error } = await supabase
    .from("resumes")
    .update({
      parse_error: message,
      parse_status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", resume.id);

  if (error) {
    throw error;
  }
}

async function parseResume(supabase, resume) {
  console.log(`Parsing resume ${resume.id}: ${resume.original_file_name}`);

  const { error: processingError } = await supabase
    .from("resumes")
    .update({
      parse_error: null,
      parse_status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", resume.id);

  if (processingError) {
    throw processingError;
  }

  const { data: pdfBlob, error: downloadError } = await supabase.storage
    .from(resume.storage_bucket)
    .download(resume.storage_path);

  if (downloadError) {
    await markResumeFailed(supabase, resume, downloadError.message);
    console.error(`Failed to download resume ${resume.id}:`, downloadError);
    return;
  }

  let extracted;

  try {
    extracted = await extractTextFromPdfBlob(pdfBlob);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to extract PDF text.";

    await markResumeFailed(supabase, resume, message);
    console.error(`Failed to parse resume ${resume.id}:`, error);
    return;
  }

  if (!extracted.text) {
    const message =
      "No selectable text was found in this PDF. Scanned resumes will need OCR support later.";

    await markResumeFailed(supabase, resume, message);
    console.error(`Failed to parse resume ${resume.id}: ${message}`);
    return;
  }

  const { error: updateError } = await supabase
    .from("resumes")
    .update({
      extracted_text: extracted.text,
      parse_error: null,
      parse_status: "complete",
      updated_at: new Date().toISOString(),
    })
    .eq("id", resume.id);

  if (updateError) {
    throw updateError;
  }

  console.log(
    `Parsed resume ${resume.id}: ${extracted.pageCount} page(s), ${extracted.text.length} characters.`,
  );
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

loadLocalEnv();

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const secretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!secretKey) {
  throw new Error(
    "Missing SUPABASE_SECRET_KEY. Resume parsing needs a server-only key.",
  );
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const batchSize = getBatchSize();
const { data: resumes, error: listError } = await supabase
  .from("resumes")
  .select("id, original_file_name, storage_bucket, storage_path")
  .eq("parse_status", "pending")
  .order("created_at", { ascending: true })
  .limit(batchSize);

if (listError) {
  throw listError;
}

if (!resumes.length) {
  console.log("No pending resumes to parse.");
  process.exit(0);
}

for (const resume of resumes) {
  await parseResume(supabase, resume);
}
