import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { authEvents, otpCounters } from "@/lib/models";
import type { AuthAction, AuthOutcome } from "@/lib/models/types";
import { audit } from "@/lib/admin/auth";

export const CODE_LENGTH = 6;
export const TTL_MS = 10 * 60 * 1000;
export const RESEND_MS = 60_000;
export const MAX_ATTEMPTS = 5;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const PER_MOBILE_HOUR = 5;
const PER_MOBILE_DAY = 10;
const PER_IP_HOUR = 20;

/**
 * The worst case this bounds is one bad day, not a zero balance: past the cap nothing is sent at
 * all until the UTC day turns, and the manual admin issue path is what keeps registration alive
 * meanwhile. It has to be set against the credits actually purchased — the default is a guess and
 * a guess that is too high protects nothing.
 */
const GLOBAL_DAILY_DEFAULT = 50_000;

export const globalDailyCap = (): number => {
  const configured = Number(process.env.OTP_GLOBAL_DAILY_CAP);
  return Number.isInteger(configured) && configured > 0 ? configured : GLOBAL_DAILY_DEFAULT;
};

function pepper(): string {
  const value = process.env.OTP_PEPPER;
  if (!value) throw new Error("OTP_PEPPER is not set");
  return value;
}

/**
 * randomInt is rejection-sampled and drawn from the CSPRNG. Math.random is seeded per process and
 * predictable from a handful of outputs, which for a six-digit code is the whole security of it.
 * Zero-padded rather than drawn from 100000: excluding the leading-zero codes would throw away a
 * tenth of the keyspace to make the number look tidier.
 */
export const generateOtp = (): string =>
  String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");

export const hashOtp = (code: string): string =>
  createHmac("sha256", pepper()).update(code).digest("hex");

/**
 * Both sides are fixed-width SHA-256 output, so the length check only ever fires on a corrupted
 * stored value and timingSafeEqual always sees the equal lengths it requires.
 */
export function otpMatches(code: string, storedHex: string): boolean {
  const given = Buffer.from(hashOtp(code), "hex");
  const stored = Buffer.from(storedHex, "hex");
  return given.length === stored.length && timingSafeEqual(given, stored);
}

export const hourBucket = (now: Date): string => now.toISOString().slice(0, 13);
export const dayBucket = (now: Date): string => now.toISOString().slice(0, 10);

async function bump(
  scope: "mobile" | "ip" | "global",
  key: string,
  bucket: string,
  ttlMs: number,
  now: Date,
): Promise<number> {
  const collection = await otpCounters();
  const row = await collection.findOneAndUpdate(
    { scope, key, bucket },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + ttlMs) } },
    { upsert: true, returnDocument: "after" },
  );
  return row?.count ?? 1;
}

export type QuotaOutcome = "otp_circuit_open" | "otp_quota_mobile" | "otp_quota_ip";
export type QuotaVerdict = { ok: true } | { ok: false; outcome: QuotaOutcome };

/**
 * Every counter is incremented before any of them is judged, in one round trip. Incrementing on a
 * refusal is deliberate: a caller who is already over a cap must not get free attempts at the ones
 * below it, and the windows are fixed buckets so nothing is extended by being blocked.
 */
export async function consumeSendQuota(mobile: string, ip: string, now: Date): Promise<QuotaVerdict> {
  const hour = hourBucket(now);
  const day = dayBucket(now);

  const [mobileHour, mobileDay, ipHour, globalDay] = await Promise.all([
    bump("mobile", mobile, hour, 2 * HOUR_MS, now),
    bump("mobile", mobile, day, 2 * DAY_MS, now),
    bump("ip", ip, hour, 2 * HOUR_MS, now),
    bump("global", "all", day, 2 * DAY_MS, now),
  ]);

  const cap = globalDailyCap();
  if (globalDay > cap) {
    // Only on the crossing. Alerting on every refusal past the cap would write a row per blocked
    // request and bury the one that matters.
    if (globalDay === cap + 1) await audit(null, "otp.circuit_breaker_open", `cap=${cap}`, ip);
    return { ok: false, outcome: "otp_circuit_open" };
  }
  if (mobileHour > PER_MOBILE_HOUR || mobileDay > PER_MOBILE_DAY) {
    return { ok: false, outcome: "otp_quota_mobile" };
  }
  if (ipHour > PER_IP_HOUR) return { ok: false, outcome: "otp_quota_ip" };
  return { ok: true };
}

export async function recordAuth(entry: {
  mobile: string;
  ip: string;
  userAgent: string;
  action: AuthAction;
  outcome: AuthOutcome;
  providerStatus?: number;
  providerRef?: string;
}): Promise<void> {
  const collection = await authEvents();
  await collection.insertOne({ ...entry, at: new Date() } as never);
}
