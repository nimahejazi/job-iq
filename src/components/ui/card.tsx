import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/lib/styles";

// Cards frame repeated dashboard and job-match content without creating nested panels.
export function Card({ className, ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cx(
        "rounded-lg border border-border bg-surface p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cx("mb-4 space-y-1", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className={cx("text-base font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return <p className={cx("text-sm text-muted-foreground", className)} {...props} />;
}
