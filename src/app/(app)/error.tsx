"use client";

import { useEffect } from "react";
import { Button, ErrorState } from "@/components/ui";

type AppErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

// Route-level error boundary catches rendering failures inside the product app shell.
export default function AppError({ error, unstable_retry }: AppErrorProps) {
  useEffect(() => {
    // Keep this visible during local development until a real error reporter is added.
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      action={<Button onClick={unstable_retry}>Try again</Button>}
      description="Job IQ could not render this section. Retrying will re-render the route segment."
      digest={error.digest}
      title="We hit a page error"
    />
  );
}
