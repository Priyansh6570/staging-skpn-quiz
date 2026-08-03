import { z } from "zod";
import { otpRequests, users, MOBILE_RE } from "@/lib/models";
import { adminOr401 } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/auth";
import { getSession } from "@/lib/session";
import { clientIp, fail, json, sameOrigin } from "@/lib/api";
import { TTL_MS, generateOtp, hashOtp, recordAuth } from "@/lib/otp";

const Body = z.object({
  mobile: z.string().regex(MOBILE_RE),
  purpose: z.enum(["register", "login"]),
});

/**
 * The fallback for MSG91 being unavailable mid-competition: an operator reads the code to the
 * student over the phone and /api/otp/verify accepts it exactly as it would an SMS one. No credit
 * is spent, so the send quotas and the circuit breaker do not apply — the control here is that
 * only two roles can reach it and every use is named in the audit log.
 *
 * It is also, unavoidably, an impersonation tool: a code issued for a registered number signs
 * whoever holds it into that account. Hence operator and owner only, never viewer.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "bad_origin");

  const ip = clientIp(req);
  const guard = await adminOr401();

  if ("response" in guard) {
    // A student cookie is not a weak admin cookie, it is a different thing entirely. Saying so
    // explicitly — and logging it — is worth more than letting the 401 above imply it.
    if (await getSession()) {
      await audit(null, "otp.manual_issue_denied", "student session", ip);
      return fail(403, "forbidden");
    }
    return guard.response;
  }

  const { session } = guard;
  if (session.role !== "operator" && session.role !== "owner") {
    await audit(session, "otp.manual_issue_denied", `role=${session.role}`, ip);
    return fail(403, "forbidden");
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_mobile");
  const { mobile, purpose } = parsed.data;

  const accounts = await users();
  const existingUser = await accounts.findOne({ mobile }, { projection: { _id: 1 } });
  if (purpose === "login" && !existingUser) return fail(404, "unknown_mobile");
  if (purpose === "register" && existingUser) return fail(409, "already_registered");

  const code = generateOtp();
  const now = new Date();
  const collection = await otpRequests();

  // Replaces whatever is pending for the number, resend window included: the operator is issuing
  // this precisely because the student is stuck, and making them wait out a timer for a message
  // that is not coming would defeat the point.
  await collection.updateOne(
    { mobile },
    {
      $set: {
        purpose,
        otpHash: hashOtp(code),
        expiresAt: new Date(now.getTime() + TTL_MS),
        attempts: 0,
        consumed: false,
        lastSentAt: now,
        channel: "admin" as const,
        ip,
      },
      $inc: { sendCount: 1 },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  // The code is in the response and nowhere else: not in the audit row, not in authEvents, not in
  // the process log. What is recorded is that this operator issued one for this number.
  await Promise.all([
    audit(session, "otp.manual_issue", `${mobile} purpose=${purpose}`, ip),
    recordAuth({ mobile, ip, userAgent: req.headers.get("user-agent") ?? "", action: "otp_admin_issue", outcome: "otp_admin_issued" }),
  ]);

  return json({ ok: true, code, expiresInSeconds: TTL_MS / 1000 });
}
