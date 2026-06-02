import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  formatRelativeDate,
  loadJobMatchDetailForUser,
  type JobMatchDetailView,
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

function getComponentLabel(key: string) {
  switch (key) {
    case "semantic_similarity":
      return "Semantic fit";
    case "skill_overlap":
      return "Skill overlap";
    case "title_alignment":
      return "Title alignment";
    case "location_fit":
      return "Location fit";
    case "salary_fit":
      return "Salary fit";
    case "seniority_fit":
      return "Seniority fit";
    case "freshness":
      return "Freshness";
    default:
      return key;
  }
}

function getScoreBreakdownRows(match: JobMatchDetailView) {
  return Object.entries(match.scoreBreakdown.components).map(
    ([key, component]) => ({
      available: component.available,
      label: getComponentLabel(key),
      score: component.score,
      weight: match.scoreBreakdown.appliedWeights[key] ?? 0,
    }),
  );
}

function SkillList({
  items,
  emptyLabel,
}: {
  emptyLabel: string;
  items: string[];
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} tone="neutral">
          {item}
        </Badge>
      ))}
    </div>
  );
}

async function getPageData(jobId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { match: null, user: null };
  }

  const match = await loadJobMatchDetailForUser(supabase, user.id, jobId);

  return {
    match,
    user,
  };
}

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const data = await getPageData(id);

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
        description="Sign in to review ranked matches, score breakdowns, and the job detail page."
        eyebrow="Jobs"
        title="No job details loaded"
      />
    );
  }

  if (!data.match) {
    notFound();
  }

  const match = data.match;
  const scoreRows = getScoreBreakdownRows(match);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={getScoreTone(match.score)}>
                {Math.round(match.score)}/100
              </Badge>
              <Badge tone="neutral">{match.sourceName}</Badge>
              <Badge tone="neutral">{match.workMode ?? "Unknown mode"}</Badge>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {match.title}
              </h1>
              <p className="text-lg text-muted-foreground">
                {match.companyName}
                {match.location ? ` · ${match.location}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>{match.salaryText}</span>
              <span>•</span>
              <span>Posted {formatRelativeDate(match.postedAt)}</span>
              <span>•</span>
              <span>Generated {formatRelativeDate(match.generatedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              href="/jobs"
            >
              Back to jobs
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
              href={match.applyUrl}
              rel="noreferrer"
              target="_blank"
            >
              Apply
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Match summary</CardTitle>
            <CardDescription>{match.explanation}</CardDescription>
          </CardHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Score breakdown
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {scoreRows.map((row) => (
                  <div
                    className="rounded-md border border-border bg-muted/30 p-3"
                    key={row.label}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {row.label}
                      </span>
                      <Badge tone={row.available ? "primary" : "neutral"}>
                        {Math.round(row.score * 100)}%
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Weight: {Math.round(row.weight)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Matched skills
                </p>
                <SkillList
                  emptyLabel="No overlapping skills were identified yet."
                  items={match.matchedSkills}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Missing skills
                </p>
                <SkillList
                  emptyLabel="No major missing skills were identified."
                  items={match.missingSkills}
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
              <CardDescription>
                What the posting explicitly asks for.
              </CardDescription>
            </CardHeader>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {match.requirements?.trim() ||
                "No separate requirements field was provided."}
            </p>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job description</CardTitle>
              <CardDescription>
                The full posting text we stored with the job.
              </CardDescription>
            </CardHeader>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {match.description?.trim() ||
                "No description was stored for this job."}
            </p>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Candidate profile signals</CardTitle>
              <CardDescription>
                What the matcher inferred from the selected resume.
              </CardDescription>
            </CardHeader>
            <div className="space-y-3 text-sm text-foreground">
              <div>
                <p className="font-medium">Titles</p>
                <SkillList
                  emptyLabel="No titles extracted yet."
                  items={match.candidateTitles}
                />
              </div>
              <div>
                <p className="font-medium">Industries</p>
                <SkillList
                  emptyLabel="No industries extracted yet."
                  items={match.candidateIndustries}
                />
              </div>
              <div>
                <p className="font-medium">Skills</p>
                <SkillList
                  emptyLabel="No skills extracted yet."
                  items={match.candidateSkills}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
