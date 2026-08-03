import type { DeliveryStatus } from "@/lib/models/types";

const SEND_TIMEOUT_MS = 8_000;
const BALANCE_TIMEOUT_MS = 8_000;

export interface SendResult {
  ok: boolean;
  /** MSG91's HTTP status, or 0 when the request never completed. Recorded on the auth event. */
  status: number;
  /** MSG91's request_id when it gave one. The handle every delivery report is keyed by. */
  ref: string;
  /** Server-side diagnostics only. Never reaches a response body. */
  detail: string;
}

/**
 * We generate and verify the code ourselves and hand MSG91 only the delivery, so nothing here is
 * trusted for the security of the flow — a compromised or wrong answer costs a message, not an
 * account.
 *
 * What "ok" means here is narrower than it looks. This endpoint answers 200 {"type":"success"} to a
 * request carrying a plainly invalid auth key — verified against the live API, not assumed — so it
 * is queue-accepted, not delivered, and an exhausted balance or a suspended sender will very likely
 * read as a success. What this does catch is a timeout, a DNS or TLS failure, a 5xx, and a
 * malformed reply. Everything else is what the delivery webhook and the balance poll are for.
 */
export async function sendSms(mobile: string, code: string): Promise<SendResult> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const sender = process.env.MSG91_SENDER_ID;
  const dltTemplateId = process.env.MSG91_DLT_TEMPLATE_ID;

  if (!authKey || !templateId || !sender || !dltTemplateId) {
    return { ok: false, status: 0, ref: "", detail: "MSG91 environment is incomplete" };
  }

  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", templateId);
  url.searchParams.set("mobile", `91${mobile}`);
  url.searchParams.set("otp", code);
  url.searchParams.set("sender", sender);
  url.searchParams.set("DLT_TE_ID", dltTemplateId);
  // Explicit rather than inferred. The approved template is Latin script; letting MSG91 decide
  // unicode for itself turns each message into a multi-part send and doubles the credit cost.
  url.searchParams.set("unicode", "0");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { authkey: authKey, "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ref: "",
      detail: error instanceof Error ? error.message : "request failed",
    };
  }

  const body = (await response.json().catch(() => null)) as
    | { type?: string; message?: unknown; request_id?: string }
    | null;

  // The status alone is not the outcome — MSG91 also answers 200 with {"type":"error"} — so both
  // are checked. See the caveat above for what this cannot see.
  const ok = response.ok && body?.type === "success";
  return {
    ok,
    status: response.status,
    ref: String(body?.request_id ?? ""),
    detail: ok ? "" : `type=${body?.type ?? "none"} ${String(body?.message ?? "")}`.trim(),
  };
}

/**
 * Classified on the text first and the numeric code second.
 *
 * MSG91 sends both a numeric `status` and a `desc`, and the numeric table is not something this
 * build has been able to confirm against their documentation — only 1 and 2 are used here, and
 * anything unrecognised is kept verbatim as "unknown" rather than guessed into a bucket. An
 * "unknown" showing up in the operations panel means this mapping needs a line adding, not that the
 * message failed. See HANDOFF.md.
 */
export function classifyDelivery(code: string, description: string): DeliveryStatus {
  const text = description.trim().toUpperCase();
  if (text.includes("DELIVER") && !text.includes("UNDELIVER") && !text.includes("NOT DELIVER")) return "delivered";
  if (/FAIL|REJECT|BLOCK|NDNC|EXPIR|INVALID|UNDELIVER|NOT DELIVER|ABSENT/.test(text)) return "failed";
  if (code === "1") return "delivered";
  if (code === "2") return "failed";
  return "unknown";
}

export interface BalanceResult {
  ok: boolean;
  /** Credits, not currency — the paise-as-integers rule does not apply, and it can be fractional. */
  credits: number;
  /** Exactly what came back, so a shape this does not parse can still be read by a human. */
  raw: string;
  detail: string;
}

/**
 * The endpoint and route are configurable because this build has not been able to confirm which
 * balance API the trust's account is on. The legacy `balance.php` answers a bare number in the body;
 * the v5 endpoints answer JSON. Both shapes are handled, and an unparseable answer is a failure
 * that shows on the dashboard rather than a silent zero.
 */
export async function fetchBalance(): Promise<BalanceResult> {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) return { ok: false, credits: 0, raw: "", detail: "MSG91_AUTH_KEY is not set" };

  const url = new URL(process.env.MSG91_BALANCE_URL ?? "https://control.msg91.com/api/balance.php");
  url.searchParams.set("authkey", authKey);
  url.searchParams.set("type", process.env.MSG91_BALANCE_ROUTE ?? "4");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { authkey: authKey },
      signal: AbortSignal.timeout(BALANCE_TIMEOUT_MS),
    });
  } catch (error) {
    return {
      ok: false,
      credits: 0,
      raw: "",
      detail: error instanceof Error ? error.message : "request failed",
    };
  }

  const raw = (await response.text().catch(() => "")).trim();
  if (!response.ok) return { ok: false, credits: 0, raw: raw.slice(0, 200), detail: `HTTP ${response.status}` };

  const credits = parseBalance(raw);
  return credits === null
    ? { ok: false, credits: 0, raw: raw.slice(0, 200), detail: "could not read a balance from the reply" }
    : { ok: true, credits, raw: raw.slice(0, 200), detail: "" };
}

function parseBalance(raw: string): number | null {
  const direct = Number(raw);
  if (raw !== "" && Number.isFinite(direct)) return direct;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Neither a bare number nor JSON. The caller reports it as a failed check and keeps the body.
    return null;
  }

  if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    for (const key of ["balance", "credits", "data", "message"]) {
      const value = record[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
    }
  }
  return null;
}
