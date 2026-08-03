import { custom, strings } from "@/lib/i18n";
import type { Lang } from "@/lib/models/types";

export type ErrorCode =
  | "offline"
  | "already_attempted"
  | "mobile_registered"
  | "not_registered"
  | "email_taken"
  | "verification_expired"
  | "attempt_expired"
  | "network"
  | "server"
  | "session_expired"
  | "rate_limited"
  | "save_failed"
  | "invalid_input";

export function errorMessage(lang: Lang, code: ErrorCode): { message: string; missingCopy: boolean } {
  // Three failures the export already has copy for; the rest are authored in lib/i18n/custom.ts.
  const s = strings(lang);
  const c = custom(lang);

  switch (code) {
    case "offline": return { message: s.Quiz.T.offline, missingCopy: false };
    case "already_attempted": return { message: s.Quiz.T.onceBody, missingCopy: false };
    // A number that already has an account and a student who has already sat the paper are two
    // different refusals. Collapsing them told a first-time registrant their attempt was recorded.
    case "mobile_registered": return { message: s.Register.S.mobileDuplicate, missingCopy: false };
    case "not_registered": return { message: c.errors.notRegistered, missingCopy: false };
    case "email_taken": return { message: c.errors.emailTaken, missingCopy: false };
    case "verification_expired": return { message: c.otp.verificationExpired, missingCopy: false };
    case "attempt_expired": return { message: s.Quiz.T.submittedAuto, missingCopy: false };
    case "network": return { message: c.errors.network, missingCopy: false };
    case "session_expired": return { message: c.errors.sessionExpired, missingCopy: false };
    case "rate_limited": return { message: c.errors.rateLimited, missingCopy: false };
    case "save_failed": return { message: c.errors.saveFailed, missingCopy: false };
    case "invalid_input": return { message: c.errors.invalidInput, missingCopy: false };
    default: return { message: c.errors.server, missingCopy: false };
  }
}

/**
 * The refusals /api/otp/send and /api/otp/verify give back. Separate from the catalogue above
 * because these are about a code rather than about a request, and the sign-in and registration
 * forms were each carrying their own copy of this switch.
 */
export function otpMessage(lang: Lang, error: string | undefined): string {
  const c = custom(lang);
  switch (error) {
    case "wrong_code": return c.otp.wrongCode;
    case "otp_expired":
    case "otp_not_found":
    case "otp_consumed": return c.otp.expired;
    case "attempts_exhausted": return c.otp.exhausted;
    case "send_failed": return c.otp.sendFailed;
    case "sending_unavailable": return c.otp.unavailable;
    case "send_quota_exceeded": return c.otp.quotaExceeded;
    case "rate_limited": return c.errors.rateLimited;
    default: return c.errors.server;
  }
}

/**
 * Maps an API error payload onto a code the catalogue knows.
 *
 * The body's own code decides first and the status is only a fallback. Two unrelated refusals share
 * 409 — a mobile number that already has an account, and a student who has already sat the paper —
 * so reading the status alone told people filling in the registration form for the first time that
 * their attempt had been recorded.
 */
export function codeFromResponse(status: number, body: unknown): ErrorCode {
  const error = typeof body === "object" && body && "error" in body ? String((body as { error: unknown }).error) : "";

  switch (error) {
    case "already_registered": return "mobile_registered";
    case "email_taken": return "email_taken";
    case "already_attempted": return "already_attempted";
    case "mobile_not_verified": return "verification_expired";
    case "rate_limited": return "rate_limited";
    default: break;
  }

  if (status === 401) return "session_expired";
  if (status === 429) return "rate_limited";
  if (status === 400) return "invalid_input";
  return "server";
}
