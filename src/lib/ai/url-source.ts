import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_CHARS = 60000;
const MAX_REDIRECTS = 4;

function isPrivateAddress(ip: string): boolean {
  if (ip.includes(":")) {
    const v6 = ip.toLowerCase();
    if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
    return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

/** Refuses non-http(s) URLs and hosts that resolve to private/loopback addresses (the server must not be usable to probe internal services). */
async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) links can be read.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (addresses.some(isPrivateAddress)) throw new Error("That link points to a private address and can't be read.");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function htmlToText(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|head)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|article|li|tr|h[1-6]|blockquote)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return title ? `Page title: ${title}\n\n${body}` : body;
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Fetches a web page server-side and returns its readable text, so a skill can
 * summarise/extract from a link (models can't browse). Static HTML only:
 * pages that render their content with JavaScript will come back nearly empty.
 */
export async function fetchPageText(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error(`"${rawUrl}" isn't a valid URL.`);
  }

  // Follow redirects by hand so every hop is checked against the private-address rule.
  let res: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
        headers: { "user-agent": "Mozilla/5.0 (compatible; AMPERSAND/0.1)", accept: "text/html,text/plain;q=0.9,*/*;q=0.5" },
      });
    } catch (e) {
      // undici reports every network failure as a bare "fetch failed"; the real reason is on `cause`.
      const reason = (e as { cause?: { code?: string } }).cause?.code ?? (e as Error).message;
      throw new Error(`Couldn't reach ${url.hostname} (${reason}).`);
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      res = null;
      continue;
    }
    break;
  }
  if (!res) throw new Error("Too many redirects.");
  if (!res.ok) throw new Error(`The page responded with HTTP ${res.status}.`);

  const contentType = res.headers.get("content-type") ?? "";
  if (!/text\/|json|xml/i.test(contentType)) {
    throw new Error(`The link returned "${contentType || "unknown content"}", not a web page. Upload it as a file instead.`);
  }

  const raw = await readCapped(res);
  const text = /html/i.test(contentType) ? htmlToText(raw) : raw.trim();
  if (!text) throw new Error("The page had no readable text (it may need JavaScript to load its content).");
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}\n\n[…truncated]` : text;
}
