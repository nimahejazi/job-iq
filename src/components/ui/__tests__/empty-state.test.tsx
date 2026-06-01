import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/ui";

describe("EmptyState", () => {
  it("renders the empty-state message and optional action", () => {
    render(
      <EmptyState
        action={<button type="button">Upload resume</button>}
        description="Upload a resume to generate your first matches."
        eyebrow="Next step"
        title="No matches yet"
      />,
    );

    // This smoke test proves the React Testing Library setup works for shared UI primitives.
    expect(screen.getByText("Next step")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "No matches yet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Upload resume" }),
    ).toBeInTheDocument();
  });
});
