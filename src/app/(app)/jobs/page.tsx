import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  EmptyState,
  Input,
} from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  filterJobMatchViews,
  formatRelativeDate,
  getJobMatchSourceNames,
  getTopSignals,
  loadLatestJobMatchViewsForUser,
  parseJobMatchFilters,
  type JobMatchFilterState,
  type JobMatchView,
} from "@/lib/jobs/job-match-views";

function getScoreTone(score: number) {
  if (score >= 85) {
    return "success" as const;
  }

  if (score >= 70) {
    return "primary" as const;
  }

  return "warning" as const;
}

function getWorkModeLabel(workMode: JobMatchView["workMode"]) {
  switch (workMode) {
    case "remote":
      return "Remote";
    case "hybrid":
      return "Hybrid";
    case "onsite":
      return "Onsite";
    default:
      return "Work mode unknown";
  }
}

function FilterChips({ filters }: { filters: JobMatchFilterState }) {
  const chips = [
    filters.location ? `Location: ${filters.location}` : "",
    filters.sourceName ? `Source: ${filters.sourceName}` : "",
    filters.workMode !== "all" ? `Mode: ${filters.workMode}` : "",
    filters.minSalaryUsd !== null ? `Min salary: $${filters.minSalaryUsd}` : "",
  ].filter(Boolean);

  if (!chips.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Badge key={chip} tone="neutral">
          {chip}
        </Badge>
      ))}
      <Link
        className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        href="/jobs"
      >
        Clear filters
      </Link>
    </div>
  );
}

function JobsFilterForm({
  filters,
  sourceNames,
}: {
  filters: JobMatchFilterState;
  sourceNames: string[];
}) {
  return (
    <form
      className="grid gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-4"
      method="get"
    >
      <label className="space-y-1 text-sm font-medium text-foreground">
        Location
        <Input
          defaultValue={filters.location}
          name="location"
          placeholder="e.g. Austin, TX"
        />
      </label>

      <label className="space-y-1 text-sm font-medium text-foreground">
        Source
        <select
          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15"
          defaultValue={filters.sourceName}
          name="source"
        >
          <option value="">Any source</option>
          {sourceNames.map((sourceName) => (
            <option key={sourceName} value={sourceName}>
              {sourceName}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-sm font-medium text-foreground">
        Work mode
        <select
          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15"
          defaultValue={filters.workMode}
          name="work_mode"
        >
          <option value="all">Any mode</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">Onsite</option>
        </select>
      </label>

      <label className="space-y-1 text-sm font-medium text-foreground">
        Minimum salary
        <Input
          defaultValue={filters.minSalaryUsd ?? ""}
          inputMode="numeric"
          name="min_salary_usd"
          placeholder="e.g. 120000"
          type="number"
        />
      </label>

      <div className="md:col-span-4">
        <Button type="submit">Apply filters</Button>
      </div>
    </form>
  );
}

function MatchCard({ match }: { match: JobMatchView }) {
  const topSignals = getTopSignals(match.scoreBreakdown);

  return (
    <Card className="flex h-full flex-col justify-between gap-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={getScoreTone(match.score)}>
                {Math.round(match.score)}/100
              </Badge>
              <Badge tone="neutral">{match.sourceName}</Badge>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {match.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {match.companyName}
                {match.location ? ` · ${match.location}` : ""}
              </p>
            </div>
          </div>

          <Badge tone="neutral">{getWorkModeLabel(match.workMode)}</Badge>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>{match.salaryText}</span>
          <span>•</span>
          <span>Posted {formatRelativeDate(match.postedAt)}</span>
        </div>

        {match.explanation ? (
          <CardDescription>{match.explanation}</CardDescription>
        ) : null}

        {topSignals.length ? (
          <div className="flex flex-wrap gap-2">
            {topSignals.map((signal) => (
              <Badge key={signal.label} tone="neutral">
                {signal.label}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
          href={`/jobs/${match.jobId}`}
        >
          View details
        </Link>
      </div>
    </Card>
  );
}

async function getJobsPageData(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      filters: parseJobMatchFilters({}),
      matches: [],
      sourceNames: [],
      user: null,
    };
  }

  const filters = parseJobMatchFilters(await searchParams);
  const allMatches = await loadLatestJobMatchViewsForUser(supabase, user.id);
  const sourceNames = getJobMatchSourceNames(allMatches);
  const matches = filterJobMatchViews(allMatches, filters);

  return {
    filters,
    matches,
    sourceNames,
    user,
  };
}

type JobsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const data = await getJobsPageData(searchParams);

  if (!data.user) {
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
        description="Sign in to see ranked matches from your resume, preferences, and job sources."
        eyebrow="Jobs"
        title="No job matches loaded"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge tone="primary">Jobs</Badge>
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Ranked job matches
          </h1>
          <p className="text-muted-foreground">
            These matches are ordered by your current resume embedding,
            preferences, and the ranking score we store in the database.
          </p>
        </div>
      </div>

      <JobsFilterForm filters={data.filters} sourceNames={data.sourceNames} />
      <FilterChips filters={data.filters} />

      {!data.matches.length ? (
        <EmptyState
          action={
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
                href="/onboarding/resume"
              >
                Review resume
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                href="/onboarding/preferences"
              >
                Update preferences
              </Link>
            </div>
          }
          description="Generate resume embeddings and run the job matcher to populate this list with ranked results."
          eyebrow="Jobs"
          title="No ranked jobs yet"
        />
      ) : (
        <div className="grid gap-4">
          {data.matches.map((match) => (
            <MatchCard key={match.matchId} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
