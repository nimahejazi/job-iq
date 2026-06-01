import type { ComponentPropsWithoutRef } from "react";
import { Card } from "@/components/ui/card";
import { cx } from "@/lib/styles";

type LoadingStateProps = {
  title?: string;
  description?: string;
};

// Skeleton is the low-level shimmer block used to sketch pending content without layout jumps.
export function Skeleton({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cx("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

// LoadingState gives pages and panels a consistent fallback while async data streams in.
export function LoadingState({
  title = "Loading",
  description = "Preparing the latest information...",
}: LoadingStateProps) {
  return (
    <Card className="space-y-5" role="status" aria-live="polite">
      <div className="space-y-2">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </Card>
  );
}
