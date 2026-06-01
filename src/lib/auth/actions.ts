"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSafeRedirectPath,
  parseAuthCredentials,
  type AuthFormState,
} from "@/lib/auth/validation";

function configurationErrorState(): AuthFormState {
  return {
    status: "error",
    message:
      "Supabase is not configured yet. Add your project URL and publishable key to .env.local.",
  };
}

export async function signInWithPassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseAuthCredentials(formData, "sign-in");

  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors };
  }

  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return configurationErrorState();
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.credentials);

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  redirect(getSafeRedirectPath(formData));
}

export async function signUpWithPassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseAuthCredentials(formData, "sign-up");

  if (!parsed.ok) {
    return { status: "error", fieldErrors: parsed.fieldErrors };
  }

  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return configurationErrorState();
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    ...parsed.credentials,
    options: {
      // Supabase uses this URL when email confirmations are enabled.
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  return {
    status: "success",
    message:
      "Account created. Check your email for a confirmation link, or sign in now if confirmations are disabled.",
  };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
  redirect("/auth/sign-in");
}
