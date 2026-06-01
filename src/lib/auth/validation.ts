export type AuthFieldErrors = {
  email?: string;
  password?: string;
};

export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: AuthFieldErrors;
};

export const initialAuthFormState: AuthFormState = {
  status: "idle",
};

function normalizeFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

// Keeps basic auth validation server-side before we call Supabase.
export function parseAuthCredentials(
  formData: FormData,
  mode: "sign-in" | "sign-up",
) {
  const email = normalizeFormValue(formData.get("email")).toLowerCase();
  const password = normalizeFormValue(formData.get("password"));
  const fieldErrors: AuthFieldErrors = {};

  if (!email || !email.includes("@")) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (mode === "sign-up" && password.length < 8) {
    fieldErrors.password = "Use at least 8 characters for your password.";
  }

  if (mode === "sign-in" && !password) {
    fieldErrors.password = "Enter your password.";
  }

  if (fieldErrors.email || fieldErrors.password) {
    return {
      ok: false as const,
      fieldErrors,
    };
  }

  return {
    ok: true as const,
    credentials: { email, password },
  };
}

// Only allow internal redirects so form submissions cannot bounce users to another site.
export function getSafeRedirectPath(formData: FormData) {
  const redirectTo = normalizeFormValue(formData.get("redirectTo"));

  if (
    !redirectTo ||
    !redirectTo.startsWith("/") ||
    redirectTo.startsWith("//")
  ) {
    return "/";
  }

  return redirectTo;
}
