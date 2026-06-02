"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  parsePreferencesForm,
  type PreferencesFormState,
} from "@/lib/preferences/validation";

const ONBOARDING_PREFERENCES_PATH = "/onboarding/preferences";
const DASHBOARD_PATH = "/";

async function ensureUserProfile(
  adminSupabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
) {
  const { error } = await adminSupabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id" });

  return error;
}

async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function saveUserPreferences(
  _state: PreferencesFormState,
  formData: FormData,
): Promise<PreferencesFormState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      message: "Sign in to save your preferences.",
      status: "error",
    };
  }

  const parsed = parsePreferencesForm(formData);

  if (!parsed.ok) {
    return {
      fieldErrors: parsed.fieldErrors,
      message: "Fix the highlighted fields and try again.",
      status: "error",
    };
  }

  const adminSupabase = createSupabaseAdminClient();
  const profileError = await ensureUserProfile(adminSupabase, user.id);

  if (profileError) {
    return {
      message: profileError.message,
      status: "error",
    };
  }

  const { error: upsertError } = await adminSupabase
    .from("user_preferences")
    .upsert(
      {
        ...parsed.preferences,
        updated_at: new Date().toISOString(),
        user_id: user.id,
      },
      {
        onConflict: "user_id",
      },
    );

  if (upsertError) {
    return {
      message: upsertError.message,
      status: "error",
    };
  }

  const { data: profile, error: profileReadError } = await adminSupabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileReadError) {
    return {
      message: profileReadError.message,
      status: "error",
    };
  }

  if (!profile?.onboarding_completed_at) {
    const { error: onboardingUpdateError } = await adminSupabase
      .from("profiles")
      .update({
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (onboardingUpdateError) {
      return {
        message: onboardingUpdateError.message,
        status: "error",
      };
    }
  }

  revalidatePath(ONBOARDING_PREFERENCES_PATH);
  revalidatePath(DASHBOARD_PATH);

  return {
    message: "Preferences saved and onboarding marked complete.",
    status: "success",
  };
}
