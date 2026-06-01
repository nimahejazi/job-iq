import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job IQ",
  description: "Job matching and resume refinement for US job seekers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
