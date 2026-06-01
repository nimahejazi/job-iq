import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
} from "@/components/ui";

const setupSteps = [
  "Upload resume PDF",
  "Confirm extracted skills",
  "Set salary and location preferences",
];

const previewJobs = [
  {
    company: "Northstar Health",
    title: "Product Data Analyst",
    match: "91%",
    details: "Strong SQL and analytics match",
  },
  {
    company: "BrightOps",
    title: "Operations Intelligence Manager",
    match: "84%",
    details: "Hybrid role with salary fit",
  },
];

// Dashboard shell shows the signed-in landing state before real auth/data exists.
export default function DashboardPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <section className="space-y-6">
        <div className="space-y-4">
          <Badge tone="primary">Dashboard shell</Badge>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Match your resume to better-fit jobs.
            </h1>
            <p className="text-lg leading-8 text-muted-foreground">
              Job IQ will turn a resume, preferences, and live job data into a
              ranked match list with practical resume refinement suggestions.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Start your job matching setup</CardTitle>
            <CardDescription>
              These setup states will connect to resume parsing, profile
              extraction, and preference storage in later milestones.
            </CardDescription>
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            {setupSteps.map((item) => (
              <div
                className="rounded-md border border-border bg-muted/60 p-3 text-sm font-medium text-foreground"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-strong"
              href="/onboarding/resume"
            >
              Upload resume
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              href="/profile"
            >
              Set preferences
            </Link>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {previewJobs.map((job) => (
            <Card key={`${job.company}-${job.title}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                  <CardTitle className="mt-1">{job.title}</CardTitle>
                </div>
                <Badge tone="success">{job.match}</Badge>
              </div>
              <CardDescription className="mt-4">{job.details}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      <aside className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Preference preview</CardTitle>
            <CardDescription>
              Shared form styling starts here before real onboarding logic
              exists.
            </CardDescription>
          </CardHeader>
          <label className="space-y-2 text-sm font-medium text-foreground">
            Desired role
            <Input placeholder="Data analyst, product manager..." />
          </label>
        </Card>

        <EmptyState
          action={<Button variant="ghost">Review matching plan</Button>}
          description="Resume parsing, job ingestion, and scoring will plug into this dashboard shell next."
          title="No live matches yet"
        />
      </aside>
    </div>
  );
}
