"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PROFILE_PATH = "/profile";

const ENTITY_TYPES = [
  "skill",
  "education",
  "experience",
  "certification",
  "title",
  "industry",
  "seniority",
  "summary",
] as const;

type EntityType = (typeof ENTITY_TYPES)[number];

function readTrimmedText(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function ensureProfileRow(
  adminSupabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
) {
  const { error } = await adminSupabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id" });

  return error;
}

function getEntityType(value: string): EntityType | null {
  return (ENTITY_TYPES as readonly string[]).includes(value)
    ? (value as EntityType)
    : null;
}

export async function updateProfileName(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return;
  }

  const fullName = readTrimmedText(formData, "full_name");
  const adminSupabase = createSupabaseAdminClient();

  const profileError = await ensureProfileRow(adminSupabase, user.id);

  if (profileError) {
    throw profileError;
  }

  const { error } = await adminSupabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    throw error;
  }

  revalidatePath(PROFILE_PATH);
}

export async function saveResumeEntity(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return;
  }

  const entityType = getEntityType(readTrimmedText(formData, "entity_type"));
  const label = readTrimmedText(formData, "label");
  const description = readTrimmedText(formData, "description");
  const entityId = readTrimmedText(formData, "entity_id");

  if (!entityType || !label) {
    return;
  }

  const adminSupabase = createSupabaseAdminClient();
  const profileError = await ensureProfileRow(adminSupabase, user.id);

  if (profileError) {
    throw profileError;
  }

  if (entityId) {
    const { data: existingEntity, error: readError } = await adminSupabase
      .from("resume_entities")
      .select("id, metadata, source")
      .eq("id", entityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (readError || !existingEntity) {
      return;
    }

    const metadata =
      existingEntity.metadata &&
      typeof existingEntity.metadata === "object" &&
      !Array.isArray(existingEntity.metadata)
        ? existingEntity.metadata
        : {};

    const { error } = await adminSupabase
      .from("resume_entities")
      .update({
        description: description || null,
        label,
        metadata: {
          ...metadata,
          edited_at: new Date().toISOString(),
          edited_by: "user",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await adminSupabase.from("resume_entities").insert({
      description: description || null,
      entity_type: entityType,
      label,
      metadata: {
        created_by: "user",
        section: entityType,
        source_type: "manual",
      },
      resume_id: null,
      source: "user",
      user_id: user.id,
    });

    if (error) {
      throw error;
    }
  }

  revalidatePath(PROFILE_PATH);
}

export async function deleteResumeEntity(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return;
  }

  const entityId = readTrimmedText(formData, "entity_id");

  if (!entityId) {
    return;
  }

  const adminSupabase = createSupabaseAdminClient();
  const { error } = await adminSupabase
    .from("resume_entities")
    .delete()
    .eq("id", entityId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  revalidatePath(PROFILE_PATH);
}
