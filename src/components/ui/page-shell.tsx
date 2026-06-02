import Link from "next/link";
import type { ReactNode } from "react";

type PageShellProps = {
  actions?: ReactNode;
  children: ReactNode;
};

const navigationItems = [
  { href: "/", label: "Dashboard" },
  { href: "/onboarding/resume", label: "Resume" },
  { href: "/onboarding/preferences", label: "Preferences" },
  { href: "/jobs", label: "Jobs" },
  { href: "/profile", label: "Profile" },
  { href: "/settings/privacy", label: "Privacy" },
];

// PageShell defines the shared authenticated app chrome.
// It stays data-free for now so auth/session checks can be added deliberately later.
export function PageShell({ actions, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            className="text-lg font-bold tracking-tight text-foreground"
            href="/"
          >
            Job IQ
          </Link>
          <div className="flex items-center gap-2">
            <nav
              aria-label="Primary navigation"
              className="flex items-center gap-1"
            >
              {navigationItems.map((item) => (
                <Link
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {actions}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
