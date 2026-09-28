import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

// No data fetching here on purpose: /login must render for signed-out
// visitors, so the authenticated shell (sidebar, project list) lives in
// src/app/(app)/layout.tsx instead, behind requireUser().
export const dynamic = "force-dynamic";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AMPERSAND",
  description: "AMPERSAND — content generation operative system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${openSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper text-charcoal">{children}</body>
    </html>
  );
}
