import { z } from "zod";
import { authEvents, certificates, users, MOBILE_RE, type AuthOutcome } from "@/lib/models";
import { setSession } from "@/lib/session";
import { clientIp, fail, json, rateLimit, sameOrigin } from "@/lib/api";

const Body = z.object({ mobile: z.string().regex(MOBILE_RE) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "bad_origin");

  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";
  const raw: unknown = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);

  const record = async (mobile: string, outcome: AuthOutcome) => {
    const collection = await authEvents();
    await collection.insertOne({ mobile, ip, userAgent, outcome, at: new Date() } as never);
  };

  // There is no credential to verify, so the per-IP limit is the only thing between a scripted
  // client and every account on the platform.
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    await record(parsed.success ? parsed.data.mobile : "", "rate_limited");
    return fail(429, "rate_limited");
  }
  if (!parsed.success) {
    await record(typeof (raw as { mobile?: unknown })?.mobile === "string" ? String((raw as { mobile: string }).mobile).slice(0, 20) : "", "malformed_mobile");
    return fail(400, "invalid_mobile");
  }

  const { mobile } = parsed.data;
  const collection = await users();
  const user = await collection.findOne(
    { mobile },
    { projection: { fullName: 1, preferredLanguage: 1, attemptCount: 1, sessionVersion: 1 } },
  );

  if (!user) {
    await record(mobile, "unknown_mobile");
    // Deliberately the same body as success: no endpoint may confirm whether a number is
    // registered. The header reflects the real state once the client re-reads /api/session.
    return json({ ok: true });
  }

  const [certificateCount] = await Promise.all([
    certificates().then((c) => c.countDocuments({ userId: user._id })),
    record(mobile, "success"),
  ]);

  await setSession({
    uid: String(user._id),
    name: user.fullName,
    attemptCount: user.attemptCount ?? 0,
    hasCertificates: certificateCount > 0,
    lang: user.preferredLanguage ?? "hi",
    sv: user.sessionVersion ?? 0,
  });

  return json({ ok: true });
}
