import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";

const jobStates = [
  "Ranked matches",
  "Saved jobs",
  "Dismissed jobs",
  "Applied jobs",
];

// Jobs page placeholder establishes the route where ranking results will appear.
export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge tone="primary">Jobs</Badge>
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Ranked job matches
          </h1>
          <p className="text-muted-foreground">
            This page will show score-ranked jobs once ingestion, embeddings,
            and match generation are wired up.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Match list shell</CardTitle>
          <CardDescription>
            The future list will include score, company, title, salary,
            location, and apply status.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {jobStates.map((state) => (
            <div
              className="rounded-md border border-border bg-muted/60 p-3 text-sm font-medium"
              key={state}
            >
              {state}
            </div>
          ))}
        </div>
        <div className="mt-5">
          <Button variant="secondary">Sync jobs later</Button>
        </div>
      </Card>

      <EmptyState
        action={<Button variant="ghost">Upload resume first</Button>}
        description="Matches will appear after a resume, preferences, and job source sync are available."
        eyebrow="Empty state"
        title="No job matches yet"
      />
    </div>
  );
}
