import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/lib/styles";

// Form input baseline for onboarding and preference screens.
export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cx(
        "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/15",
        className,
      )}
      {...props}
    />
  );
}
