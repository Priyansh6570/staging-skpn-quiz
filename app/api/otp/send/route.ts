import { z } from "zod";
import { MongoServerError } from "mongodb";
import { otpRequests, smsDeliveries, users, MOBILE_RE } from "@/lib/models";
import { clientIp, fail, json, rateLimit, sameOrigin } from "@/lib/api";
import { competitionOpen } from "@/lib/competition";
import { sendSms } from "@/lib/msg91";
import {
  RESEND_MS, TTL_MS, consumeSendQuota, dayBucket, generateOtp, hashOtp, recordAuth,
} from "@/lib/otp";

const Body = z.object({
  mobile: z.string().regex(MOBILE_RE),
  purpose: z.enum(["register", "login"]),
});

const RESEND_SECONDS = RESEND_MS / 1000;
const secondsUntil = (readyAt: number, now: number) => Math.max(1, Math.ceil((readyAt - now) / 1000));

export async function POST(req: Request) {
  if (!competitionOpen()) return fail(403, "competition_closed");
  if (!sameOrigin(req)) return fail(403, "bad_origin");

  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";

  // In-process and generous, ahead of every database round trip. The quotas below are what bound
  // credit spend; this only stops a single script turning one connection into thousands of reads.
  if (!rateLimit(`otp-send:${ip}`, 30, 60_000)) return fail(429, "rate_limited");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_mobile");
  const { mobile, purpose } = parsed.data;

  const record = (
    outcome: Parameters<typeof recordAuth>[0]["outcome"],
    provider?: { status: number; ref: string },
  ) =>
    recordAuth({
      mobile, ip, userAgent, action: "otp_send", outcome,
      ...(provider ? { providerStatus: provider.status, providerRef: provider.ref } : {}),
    });

  // Before a credit is spent, not after: sending a code to a number that cannot use it is money
  // gone for nothing. Neither answer tells the caller anything /api/register/check-mobile and the
  // sign-in page do not already tell them.
  const accounts = await users();
  const existingUser = await accounts.findOne({ mobile }, { projection: { _id: 1 } });

  if (purpose === "login" && !existingUser) {
    await record("unknown_mobile");
    return json({ ok: true, registered: false });
  }
  if (purpose === "register" && existingUser) {
    await record("otp_already_registered");
    return fail(409, "already_registered");
  }

  const collection = await otpRequests();
  const now = new Date();
  const existing = await collection.findOne({ mobile }, { projection: { lastSentAt: 1 } });

  if (existing) {
    const readyAt = existing.lastSentAt.getTime() + RESEND_MS;
    if (readyAt > now.getTime()) {
      await record("otp_resend_too_soon");
      // The client's countdown is cosmetic; this is the gate, and it hands back the number the
      // client needs to resynchronise a timer it may have lost to a reload.
      return json(
        { error: "resend_too_soon", retryAfterSeconds: secondsUntil(readyAt, now.getTime()) },
        { status: 429 },
      );
    }
  }

  const quota = await consumeSendQuota(mobile, ip, now);
  if (!quota.ok) {
    await record(quota.outcome);
    if (quota.outcome === "otp_circuit_open") return fail(503, "sending_unavailable");
    return fail(429, "send_quota_exceeded");
  }

  const code = generateOtp();
  const otpHash = hashOtp(code);
  const cutoff = new Date(now.getTime() - RESEND_MS);

  try {
    // The resend window is in the filter, so two taps that arrive together cannot both mint a code:
    // the loser matches nothing, upserts, and is refused by the unique index on mobile.
    await collection.updateOne(
      { mobile, lastSentAt: { $lte: cutoff } },
      {
        $set: {
          purpose,
          otpHash,
          expiresAt: new Date(now.getTime() + TTL_MS),
          attempts: 0,
          consumed: false,
          lastSentAt: now,
          channel: "msg91" as const,
          ip,
        },
        $inc: { sendCount: 1 },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      await record("otp_resend_too_soon");
      return json({ error: "resend_too_soon", retryAfterSeconds: RESEND_SECONDS }, { status: 429 });
    }
    throw error;
  }

  const result = await sendSms(mobile, code);

  if (!result.ok) {
    // Dropping the row rather than keeping it lets the student retry immediately instead of
    // waiting out a minute for a code that was never delivered. The quota counters already moved,
    // so this is not a way to send without being counted.
    // Matched on the hash, not the id: if a later send has already replaced this row, that one is
    // live and delivered and must survive.
    await Promise.all([
      collection.deleteOne({ mobile, otpHash }),
      record("otp_send_failed", result),
    ]);
    // No mobile number in the process log: authEvents holds it under a retention policy, stdout
    // does not. The timestamp and status are enough to line the two up.
    console.error(`[otp] MSG91 send failed: status=${result.status} ${result.detail}`);
    return fail(502, "send_failed");
  }

  // Opened as pending and closed by the delivery webhook. Without this row a message that MSG91
  // accepted and then never delivered is indistinguishable from one that arrived, because the send
  // call said "success" either way. $setOnInsert only, so a report that somehow lands first wins.
  await Promise.all([
    record("otp_sent", result),
    result.ref
      ? smsDeliveries().then((deliveries) =>
          deliveries.updateOne(
            { requestId: result.ref },
            { $setOnInsert: { day: dayBucket(now), sentAt: now, status: "pending" as const } },
            { upsert: true },
          ),
        )
      : null,
  ]);
  return json({
    ok: true,
    registered: purpose === "login",
    resendInSeconds: RESEND_SECONDS,
    expiresInSeconds: TTL_MS / 1000,
  });
}
