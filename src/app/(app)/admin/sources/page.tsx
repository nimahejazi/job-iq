import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type JobSourceRow = {
  base_url: string | null;
  config: Record<string, unknown>;
  created_at: string;
  id: string;
  last_sync_error: string | null;
  last_sync_status: string | null;
  last_synced_at: string | null;
  name: string;
  source_type: "aggregator" | "public_feed" | "ats" | "government";
  sync_enabled: boolean;
  updated_at: string;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusTone(status: string | null) {
  switch (status) {
    case "success":
      return "success";
    case "failed":
      return "warning";
    case "running":
    case "in_progress":
      return "primary";
    default:
      return "neutral";
  }
}

function getStatusLabel(source: JobSourceRow) {
  if (!source.sync_enabled) {
    return "Disabled";
  }

  return source.last_sync_status ?? "Never synced";
}

// Source health shows whether each job provider is connected and when it last synced.
export default async function AdminSourcesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: sources, error } = await supabase
    .from("job_sources")
    .select(
      "id, name, source_type, base_url, sync_enabled, last_synced_at, last_sync_status, last_sync_error, config, created_at, updated_at",
    )
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  const sourceRows = (sources ?? []) as JobSourceRow[];
  const healthySources = sourceRows.filter(
    (source) => source.sync_enabled && source.last_sync_status === "success",
  );
  const failedSources = sourceRows.filter(
    (source) => source.last_sync_status === "failed",
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge tone="primary">Admin</Badge>
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Job source health
          </h1>
          <p className="text-muted-foreground">
            This page shows which providers are connected, when they last
            synced, and whether any feed needs attention.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Configured sources</CardDescription>
            <CardTitle>{sourceRows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Healthy sources</CardDescription>
            <CardTitle>{healthySources.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Failed sources</CardDescription>
            <CardTitle>{failedSources.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {sourceRows.length ? (
        <div className="grid gap-4">
          {sourceRows.map((source) => (
            <Card key={source.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{source.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {source.source_type}
                      {source.base_url ? ` · ${source.base_url}` : ""}
                    </CardDescription>
                  </div>
                  <Badge tone={getStatusTone(source.last_sync_status)}>
                    {getStatusLabel(source)}
                  </Badge>
                </div>
              </CardHeader>

              <div className="grid gap-4 px-6 pb-6 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="font-medium text-foreground">Sync enabled</p>
                  <p>{source.sync_enabled ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Last sync</p>
                  <p>{formatDateTime(source.last_synced_at)}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Updated</p>
                  <p>{formatDateTime(source.updated_at)}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Created</p>
                  <p>{formatDateTime(source.created_at)}</p>
                </div>
              </div>

              <div className="px-6 pb-6 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Config</p>
                <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted/60 p-3 text-xs leading-6">
                  {JSON.stringify(source.config, null, 2)}
                </pre>
                {source.last_sync_error ? (
                  <p className="mt-3 text-warning">{source.last_sync_error}</p>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          description="No job sources have been configured yet."
          eyebrow="Empty state"
          title="No source health data yet"
        />
      )}
    </div>
  );
}
