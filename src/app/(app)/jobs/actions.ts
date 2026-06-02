"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const JOBS_PATH = "/jobs";

const JOB_STATUSES = ["saved", "dismissed", "applied"] as const;

type JobStatus = (typeof JOB_STATUSES)[number];

function readTrimmedText(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function getJobStatus(value: string): JobStatus | null {
  return (JOB_STATUSES as readonly string[]).includes(value)
    ? (value as JobStatus)
    : null;
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function ensureProfileRow(userId: string) {
  const adminSupabase = createSupabaseAdminClient();
  const { error } = await adminSupabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id" });

  return { adminSupabase, error };
}

export async function setJobStatus(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return;
  }

  const jobId = readTrimmedText(formData, "job_id");
  const status = getJobStatus(readTrimmedText(formData, "status"));

  if (!jobId || !status) {
    return;
  }

  const { adminSupabase, error: profileError } = await ensureProfileRow(
    user.id,
  );

  if (profileError) {
    throw profileError;
  }

  const { error } = await adminSupabase.from("saved_jobs").upsert(
    {
      job_id: jobId,
      notes: null,
      status,
      updated_at: new Date().toISOString(),
      user_id: user.id,
    },
    {
      onConflict: "user_id,job_id",
    },
  );

  if (error) {
    throw error;
  }

  revalidatePath(JOBS_PATH);
  revalidatePath(`${JOBS_PATH}/${jobId}`);
}
