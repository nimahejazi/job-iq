import type { ReactNode } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

// Shared empty state for onboarding gaps, no matches, and future API failure recovery.
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-start gap-4 border-dashed">
      <div className="space-y-1">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      {action}
    </Card>
  );
}
