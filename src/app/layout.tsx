import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { listProjects } from "@/lib/data/projects";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

// Every route reads live Supabase data (or redirects based on it); nothing
// here is safe to prerender statically.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AMPERSAND",
  description: "AMPERSAND — content generation operative system",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const projects = await listProjects();

  return (
    <html lang="en" className={`${openSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper text-charcoal">
        <div className="flex min-h-screen w-full">
          <Sidebar projects={projects} />
          {children}
        </div>
      </body>
    </html>
  );
}
