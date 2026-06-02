import Link from "next/link";
import { Badge, Card, CardDescription, EmptyState } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  formatRelativeDate,
  getTopSignals,
  loadLatestJobMatchViewsForUser,
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

async function getJobsPageData() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { matches: [], user: null };
  }

  const matches = await loadLatestJobMatchViewsForUser(supabase, user.id);

  return {
    matches,
    user,
  };
}

export default async function JobsPage() {
  const data = await getJobsPageData();

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

  if (!data.matches.length) {
    return (
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

      <div className="grid gap-4">
        {data.matches.map((match) => (
          <MatchCard key={match.matchId} match={match} />
        ))}
      </div>
    </div>
  );
}
