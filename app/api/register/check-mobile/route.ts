import { z } from "zod";
import { users, MOBILE_RE } from "@/lib/models";
import { getSession } from "@/lib/session";
import { clientIp, fail, json, rateLimit, sameOrigin } from "@/lib/api";

const Body = z.object({ mobile: z.string().regex(MOBILE_RE) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "bad_origin");

  const ip = clientIp(req);
  const session = await getSession();

  // Throttled per IP and per session: unthrottled this is a "who has registered?" census over a
  // 10-digit keyspace people can guess (AUDIT.md §7.3).
  if (!rateLimit(`check:${ip}`, 20, 60_000)) return fail(429, "rate_limited");
  if (session && !rateLimit(`check-session:${session.uid}`, 20, 60_000)) return fail(429, "rate_limited");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_mobile");

  const collection = await users();
  const existing = await collection.findOne({ mobile: parsed.data.mobile }, { projection: { _id: 1 } });

  // A boolean and nothing else. Never which account holds the number — that is somebody else's data.
  return json({ available: !existing });
}
