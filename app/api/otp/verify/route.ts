import { z } from "zod";
import { certificates, otpRequests, users, MOBILE_RE } from "@/lib/models";
import { setSession } from "@/lib/session";
import { setMobileProof } from "@/lib/mobileProof";
import { clientIp, fail, json, rateLimit, sameOrigin } from "@/lib/api";
import { competitionOpen } from "@/lib/competition";
import { CODE_LENGTH, MAX_ATTEMPTS, otpMatches, recordAuth } from "@/lib/otp";

const Body = z.object({
  mobile: z.string().regex(MOBILE_RE),
  code: z.string().regex(new RegExp(`^\\d{${CODE_LENGTH}}$`)),
  purpose: z.enum(["register", "login"]),
});

export async function POST(req: Request) {
  if (!competitionOpen()) return fail(403, "competition_closed");
  if (!sameOrigin(req)) return fail(403, "bad_origin");

  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";

  if (!rateLimit(`otp-verify:${ip}`, 30, 60_000)) return fail(429, "rate_limited");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_code");
  const { mobile, code, purpose } = parsed.data;

  const record = (outcome: Parameters<typeof recordAuth>[0]["outcome"]) =>
    recordAuth({ mobile, ip, userAgent, action: "otp_verify", outcome });

  const collection = await otpRequests();
  const doc = await collection.findOne({ mobile });

  if (!doc) {
    await record("otp_not_found");
    return fail(400, "otp_not_found");
  }
  if (doc.consumed) {
    await record("otp_consumed");
    return fail(400, "otp_consumed");
  }
  // The TTL monitor runs about once a minute, so an expired row is routinely still present and
  // this comparison — not the index — is what actually refuses it.
  if (doc.expiresAt.getTime() <= Date.now()) {
    await record("otp_expired");
    return fail(400, "otp_expired");
  }
  if (doc.purpose !== purpose) {
    await record("otp_purpose_mismatch");
    return fail(400, "otp_purpose_mismatch");
  }

  if (!otpMatches(code, doc.otpHash)) {
    // One pipeline update, so the count and the invalidation cannot come apart: a crash between an
    // increment and a separate "now lock it" write would leave a code sitting at the limit and
    // still guessable.
    const updated = await collection.findOneAndUpdate(
      { _id: doc._id, consumed: false },
      [{
        $set: {
          attempts: { $add: ["$attempts", 1] },
          consumed: { $gte: [{ $add: ["$attempts", 1] }, MAX_ATTEMPTS] },
        },
      }],
      { returnDocument: "after" },
    );

    if (!updated || updated.consumed) {
      await record("otp_attempts_exhausted");
      return fail(429, "attempts_exhausted");
    }
    await record("otp_wrong_code");
    return json(
      { error: "wrong_code", attemptsRemaining: MAX_ATTEMPTS - updated.attempts },
      { status: 400 },
    );
  }

  // Guarded on consumed:false, so the auto-submit-style race — two taps on Verify with the right
  // code — spends the code once and the loser is told so rather than being signed in twice.
  const claimed = await collection.findOneAndUpdate(
    { _id: doc._id, consumed: false },
    { $set: { consumed: true } },
  );
  if (!claimed) {
    await record("otp_consumed");
    return fail(400, "otp_consumed");
  }

  // The unique index on mobile already makes this a no-op. It stays because the property being
  // protected — no superseded code survives a successful verification — should not depend on an
  // index that an operator could drop in an incident.
  await collection.deleteMany({ mobile, _id: { $ne: doc._id } });

  if (purpose === "register") {
    await Promise.all([setMobileProof(mobile), record("otp_verified")]);
    return json({ ok: true, registered: false });
  }

  const accounts = await users();
  const user = await accounts.findOne(
    { mobile },
    { projection: { fullName: 1, preferredLanguage: 1, attemptCount: 1, sessionVersion: 1 } },
  );

  // Deleted between the send and the verify. Rare, and not something to sign a session for.
  if (!user) {
    await record("unknown_mobile");
    return json({ ok: true, registered: false });
  }

  const [certificateCount] = await Promise.all([
    certificates().then((c) => c.countDocuments({ userId: user._id })),
    record("otp_verified"),
  ]);

  await setSession({
    uid: String(user._id),
    name: user.fullName,
    attemptCount: user.attemptCount ?? 0,
    hasCertificates: certificateCount > 0,
    lang: user.preferredLanguage ?? "hi",
    sv: user.sessionVersion ?? 0,
  });

  return json({ ok: true, registered: true });
}
