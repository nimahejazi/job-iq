import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";
import { PreferencesForm } from "./_components/preferences-form";
import { type PreferencesRecord } from "@/lib/preferences/validation";

type ProfileRow = {
  onboarding_completed_at: string | null;
};

type PreferencesRow = PreferencesRecord & {
  created_at: string;
  updated_at: string;
  user_id: string;
};

function formatList(values: string[] | undefined) {
  return values && values.length ? values.join(", ") : "Not set";
}

async function getPreferencesPageData() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("user_preferences")
      .select(
        "user_id, min_salary_usd, preferred_locations, willing_to_relocate, work_modes, desired_titles, excluded_titles, excluded_industries, employment_types, experience_level, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .maybeSingle<PreferencesRow>(),
  ]);

  return {
    profile: profile ?? null,
    preferences: preferences ?? null,
  };
}

// Preferences onboarding captures the candidate's hard constraints before jobs are ranked.
export default async function PreferencesPage() {
  const data = await getPreferencesPageData();

  if (!data) {
    return (
      <EmptyState
        action={
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            href="/auth/sign-in"
          >
            Sign in
          </Link>
        }
        description="Sign in to set salary, location, and work-mode preferences for Job IQ."
        eyebrow="Preferences"
        title="No preferences loaded"
      />
    );
  }

  const onboardingComplete = Boolean(data.profile?.onboarding_completed_at);
  const initialPreferences = data.preferences
    ? {
        desired_titles: data.preferences.desired_titles,
        employment_types: data.preferences.employment_types,
        experience_level: data.preferences.experience_level,
        excluded_industries: data.preferences.excluded_industries,
        excluded_titles: data.preferences.excluded_titles,
        min_salary_usd: data.preferences.min_salary_usd,
        preferred_locations: data.preferences.preferred_locations,
        willing_to_relocate: data.preferences.willing_to_relocate,
        work_modes: data.preferences.work_modes,
      }
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="space-y-6">
        <div className="space-y-3">
          <Badge tone={onboardingComplete ? "success" : "primary"}>
            {onboardingComplete ? "Onboarding complete" : "Onboarding"}
          </Badge>
          <div className="max-w-2xl space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Set your job preferences
            </h1>
            <p className="text-muted-foreground">
              Tell Job IQ what you want to earn, where you want to work, and
              which roles to target so the matcher can rank jobs for you.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Preference form</CardTitle>
            <CardDescription>
              Keep these fields editable after onboarding so your job matches
              stay current.
            </CardDescription>
          </CardHeader>
          <PreferencesForm
            initialPreferences={initialPreferences}
            key={data.preferences?.updated_at ?? "new"}
          />
        </Card>
      </section>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Current preferences</CardTitle>
            <CardDescription>
              These values drive the first round of job filtering.
            </CardDescription>
          </CardHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-foreground">Salary</p>
              <p className="text-muted-foreground">
                {data.preferences?.min_salary_usd
                  ? `$${data.preferences.min_salary_usd.toLocaleString()}`
                  : "Not set"}
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Locations</p>
              <p className="text-muted-foreground">
                {formatList(data.preferences?.preferred_locations)}
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Work modes</p>
              <p className="text-muted-foreground">
                {formatList(data.preferences?.work_modes)}
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Desired titles</p>
              <p className="text-muted-foreground">
                {formatList(data.preferences?.desired_titles)}
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Experience level</p>
              <p className="text-muted-foreground">
                {data.preferences?.experience_level ?? "Not set"}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Onboarding status</CardTitle>
            <CardDescription>
              Job IQ considers onboarding complete after you save preferences.
            </CardDescription>
          </CardHeader>
          <p className="text-sm text-muted-foreground">
            {onboardingComplete
              ? "You can now use the dashboard and job matching flow."
              : "Save your preferences to unlock the rest of the app."}
          </p>
        </Card>
      </aside>
    </div>
  );
}
