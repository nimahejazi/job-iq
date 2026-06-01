import type { ReactNode } from "react";
import { PageShell } from "@/components/ui";

type AppLayoutProps = {
  children: ReactNode;
};

// This route-group layout is the shared shell for signed-in product pages.
// The actual Supabase session check will be added when auth routes are implemented.
export default function AppLayout({ children }: AppLayoutProps) {
  return <PageShell>{children}</PageShell>;
}
