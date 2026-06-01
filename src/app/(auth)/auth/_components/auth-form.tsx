"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import {
  initialAuthFormState,
  type AuthFormState,
} from "@/lib/auth/validation";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  redirectTo?: string;
};

const copy = {
  "sign-in": {
    title: "Sign in",
    description: "Use your email and password to continue to Job IQ.",
    button: "Sign in",
    footer: "Need an account?",
    footerHref: "/auth/sign-up",
    footerLabel: "Sign up",
  },
  "sign-up": {
    title: "Create your account",
    description:
      "Start with email/password auth, then add your resume when signed in.",
    button: "Create account",
    footer: "Already have an account?",
    footerHref: "/auth/sign-in",
    footerLabel: "Sign in",
  },
};

// Client form uses useActionState so server validation and Supabase errors render inline.
export function AuthForm({ mode, action, redirectTo = "/" }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAuthFormState,
  );
  const content = copy[mode];

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{content.title}</CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <form action={formAction} className="space-y-4">
        <input name="redirectTo" type="hidden" value={redirectTo} />
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="email"
          >
            Email
          </label>
          <Input
            autoComplete="email"
            id="email"
            name="email"
            placeholder="you@example.com"
            type="email"
          />
          {state.fieldErrors?.email ? (
            <p className="text-sm text-warning">{state.fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="password"
          >
            Password
          </label>
          <Input
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            id="password"
            name="password"
            placeholder="Your password"
            type="password"
          />
          {state.fieldErrors?.password ? (
            <p className="text-sm text-warning">{state.fieldErrors.password}</p>
          ) : null}
        </div>

        {state.message ? (
          <p
            aria-live="polite"
            className={
              state.status === "success"
                ? "rounded-md bg-success-soft px-3 py-2 text-sm text-success"
                : "rounded-md bg-warning-soft px-3 py-2 text-sm text-warning"
            }
          >
            {state.message}
          </p>
        ) : null}

        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "Working..." : content.button}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        {content.footer}{" "}
        <Link
          className="font-semibold text-primary hover:text-primary-strong"
          href={content.footerHref}
        >
          {content.footerLabel}
        </Link>
      </p>
    </Card>
  );
}
