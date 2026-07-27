import { custom, strings } from "@/lib/i18n";
import type { Lang } from "@/lib/models/types";

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

export function errorMessage(lang: Lang, code: ErrorCode): { message: string; missingCopy: boolean } {
  // Three failures the export already has copy for; the rest are authored in lib/i18n/custom.ts.
  const s = strings(lang);
  const c = custom(lang);

  switch (code) {
    case "offline": return { message: s.Quiz.T.offline, missingCopy: false };
    case "already_attempted": return { message: s.Quiz.T.onceBody, missingCopy: false };
    case "attempt_expired": return { message: s.Quiz.T.submittedAuto, missingCopy: false };
    case "network": return { message: c.errors.network, missingCopy: false };
    case "session_expired": return { message: c.errors.sessionExpired, missingCopy: false };
    case "rate_limited": return { message: c.errors.rateLimited, missingCopy: false };
    case "save_failed": return { message: c.errors.saveFailed, missingCopy: false };
    case "invalid_input": return { message: c.errors.invalidInput, missingCopy: false };
    default: return { message: c.errors.server, missingCopy: false };
  }
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
