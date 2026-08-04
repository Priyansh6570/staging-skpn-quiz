import { NextResponse } from "next/server";
import { SessionError } from "@/lib/session";

export const json = (body: unknown, init?: ResponseInit) =>
  NextResponse.json(body, { ...init, headers: { "cache-control": "no-store", ...init?.headers } });

export const fail = (status: number, code: string) => json({ error: code }, { status });

/**
 * SameSite=Lax stops a cross-site POST carrying the session cookie, but a same-site subdomain or a
 * form post from an attacker-controlled page on the same registrable domain still would. Every
 * mutating route checks Origin before it parses a body.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("host");
  return !!host && new URL(origin).host === host;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// In-process, so the limit is per Node worker. With several workers behind the reverse proxy the
// effective ceiling is (workers x limit); Redis is the fix when the box grows past one process.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

// Bounded so a flood of unique IPs cannot grow the map without limit.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 60_000).unref?.();

/**
 * The only thing a client is told about a failure is a code this codebase chose.
 *
 * A SessionError carries one; anything else is logged server-side and answered with a bare 500.
 * It used to rethrow, which in development renders the stack — and a driver error rethrown here
 * would put Mongo's own message, index names and all, into a response body.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof SessionError) return fail(error.status, error.message);
  console.error("unhandled route error", error);
  return fail(500, "server_error");
}
