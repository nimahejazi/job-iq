import type { ReactNode } from "react";
import { Button, PageShell } from "@/components/ui";
import { signOut } from "@/lib/auth/actions";

type AppLayoutProps = {
  children: ReactNode;
};

// This route group stays dynamic so auth-dependent pages render with runtime env values.
export const dynamic = "force-dynamic";

// This route-group layout is the shared shell for signed-in product pages.
// Proxy handles auth redirects; the sign-out action clears the Supabase session.
export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <PageShell
      actions={
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      }
    >
      {children}
    </PageShell>
  );
}
