"use server";

import { randomUUID } from "node:crypto";
import { RESUME_BUCKET } from "@/lib/storage/buckets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateResumeFile } from "@/lib/resumes/validation";

export type ResumeUploadState = {
  fileName?: string;
  message?: string;
  resumeId?: string;
  status: "idle" | "error" | "success";
  storagePath?: string;
};

type ResumeMetadataInsert = {
  content_type: string;
  file_size_bytes: number;
  original_file_name: string;
  parse_status: "pending";
  storage_bucket: typeof RESUME_BUCKET;
  storage_path: string;
  user_id: string;
};

async function ensureUserProfile(
  adminSupabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
) {
  const { error } = await adminSupabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id" });

  return error;
}

function safeStorageFileName(fileName: string) {
  const fallbackName = "resume.pdf";
  const normalizedName = fileName.trim().toLowerCase() || fallbackName;
  const safeName = normalizedName.replace(/[^a-z0-9._-]+/g, "-");

  return safeName.endsWith(".pdf") ? safeName : fallbackName;
}

function buildResumeStoragePath(userId: string, fileName: string) {
  const uploadDate = new Date().toISOString().slice(0, 10);
  const uploadId = randomUUID();

  return `${userId}/${uploadDate}/${uploadId}-${safeStorageFileName(fileName)}`;
}

export async function uploadResume(
  _state: ResumeUploadState,
  formData: FormData,
): Promise<ResumeUploadState> {
  const resume = formData.get("resume");
  const file = resume instanceof File ? resume : undefined;
  const validation = validateResumeFile(file);

  if (!validation.valid) {
    return {
      fileName: file?.name,
      status: "error",
      message: validation.message,
    };
  }

  if (!file) {
    return {
      status: "error",
      message: "Choose a PDF resume before continuing.",
    };
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;

  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return {
      fileName: file.name,
      status: "error",
      message:
        "Supabase is not configured yet. Add your project URL and publishable key to .env.local.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      fileName: file.name,
      status: "error",
      message: "Sign in before uploading a resume.",
    };
  }

  const storagePath = buildResumeStoragePath(user.id, file.name);
  let adminSupabase: ReturnType<typeof createSupabaseAdminClient>;

  try {
    adminSupabase = createSupabaseAdminClient();
  } catch {
    return {
      fileName: file.name,
      status: "error",
      message:
        "Supabase secret key is not configured yet. Add SUPABASE_SECRET_KEY to .env.local.",
    };
  }

  const profileError = await ensureUserProfile(adminSupabase, user.id);

  if (profileError) {
    return {
      fileName: file.name,
      status: "error",
      message: profileError.message,
    };
  }

  const { error } = await adminSupabase.storage
    .from(RESUME_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    return {
      fileName: file.name,
      status: "error",
      message: error.message,
    };
  }

  const metadata: ResumeMetadataInsert = {
    content_type: "application/pdf",
    file_size_bytes: file.size,
    original_file_name: file.name,
    parse_status: "pending",
    storage_bucket: RESUME_BUCKET,
    storage_path: storagePath,
    user_id: user.id,
  };
  const { data: resumeRecord, error: metadataError } = await adminSupabase
    .from("resumes")
    .insert(metadata)
    .select("id")
    .single();

  if (metadataError) {
    // Keep Storage and Postgres aligned if the database write fails after upload.
    await adminSupabase.storage.from(RESUME_BUCKET).remove([storagePath]);

    return {
      fileName: file.name,
      status: "error",
      message: metadataError.message,
    };
  }

  return {
    fileName: file.name,
    resumeId: resumeRecord.id,
    status: "success",
    message: "Resume uploaded and queued for parsing.",
    storagePath,
  };
}
