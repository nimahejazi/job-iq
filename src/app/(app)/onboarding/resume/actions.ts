"use server";

import { randomUUID } from "node:crypto";
import { RESUME_BUCKET } from "@/lib/storage/buckets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateResumeFile } from "@/lib/resumes/validation";

export type ResumeUploadState = {
  fileName?: string;
  message?: string;
  status: "idle" | "error" | "success";
  storagePath?: string;
};

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

  return {
    fileName: file.name,
    status: "success",
    message: "Resume uploaded to private storage.",
    storagePath,
  };
}
