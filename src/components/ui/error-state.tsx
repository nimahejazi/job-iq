import type { ReactNode } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  digest?: string;
};

// ErrorState avoids leaking raw errors while still giving support a digest when Next provides one.
export function ErrorState({
  title = "Something went wrong",
  description = "The page could not be loaded. Try again, or come back in a moment.",
  action,
  digest,
}: ErrorStateProps) {
  return (
    <Card className="flex flex-col items-start gap-4 border-warning/40 bg-warning-soft/40">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-warning">
          Error
        </p>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      {digest ? (
        <p className="rounded-md bg-surface px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
          Error digest: {digest}
        </p>
      ) : null}
      {action}
    </Card>
  );
}
