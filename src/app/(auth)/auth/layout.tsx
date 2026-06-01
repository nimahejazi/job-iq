import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

// Auth pages use a quieter shell so sign-in and sign-up stay focused.
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      {children}
    </main>
  );
}
