import { strings, type Lang } from "@/lib/i18n";

export type ErrorCode =
  | "offline"
  | "already_attempted"
  | "attempt_expired"
  | "network"
  | "server"
  | "session_expired"
  | "rate_limited"
  | "save_failed"
  | "invalid_input";

/**
 * Failures the export already has copy for, in both languages. These are real design strings, not
 * error text invented here.
 */
const FROM_DESIGN: Partial<Record<ErrorCode, (s: ReturnType<typeof strings>) => string>> = {
  offline: (s) => s.Quiz.T.offline,
  already_attempted: (s) => s.Quiz.T.onceBody,
  attempt_expired: (s) => s.Quiz.T.submittedAuto,
};

/**
 * Failures the export has no copy for at all. English only, because inventing Hindi for a
 * government portal is not this codebase's call — see the report accompanying this change.
 * Every entry here is a blocking copy request, not a finished string.
 */
const AWAITING_HINDI: Record<string, string> = {
  network: "Could not reach the server. Check your connection and try again.",
  server: "Something went wrong at our end. Please try again.",
  session_expired: "Your session has ended. Please sign in again.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  save_failed: "Your last answer could not be saved. It will be retried automatically.",
  invalid_input: "Some details are not valid. Please check the highlighted fields.",
};

export const MISSING_HINDI_ERROR_KEYS = Object.keys(AWAITING_HINDI);

export function errorMessage(lang: Lang, code: ErrorCode): { message: string; missingCopy: boolean } {
  const fromDesign = FROM_DESIGN[code];
  if (fromDesign) return { message: fromDesign(strings(lang)), missingCopy: false };
  return { message: AWAITING_HINDI[code] ?? AWAITING_HINDI.server, missingCopy: true };
}

/** Maps an API error payload onto a code the catalogue knows. */
export function codeFromResponse(status: number, body: unknown): ErrorCode {
  const error = typeof body === "object" && body && "error" in body ? String((body as { error: unknown }).error) : "";
  if (status === 401) return "session_expired";
  if (status === 409 || error === "already_attempted") return "already_attempted";
  if (status === 429 || error === "rate_limited") return "rate_limited";
  if (status === 400) return "invalid_input";
  return "server";
}
