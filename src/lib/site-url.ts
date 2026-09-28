import "server-only";
import { headers } from "next/headers";

/**
 * The origin this request actually arrived at — localhost in dev, the
 * Vercel preview/production URL once deployed. Used to build email-link
 * redirects (invite, magic link) so they're never hardcoded per environment.
 */
export async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
