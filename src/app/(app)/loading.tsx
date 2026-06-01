import { LoadingState } from "@/components/ui";

// Route-level fallback shown while product pages stream through the shared app layout.
export default function Loading() {
  return (
    <LoadingState
      description="Loading the dashboard workspace and shared navigation state."
      title="Loading Job IQ"
    />
  );
}
