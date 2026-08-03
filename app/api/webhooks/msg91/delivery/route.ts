import { timingSafeEqual } from "node:crypto";
import { smsDeliveries } from "@/lib/models";
import type { DeliveryStatus } from "@/lib/models/types";
import { classifyDelivery } from "@/lib/msg91";
import { clientIp, fail, json, rateLimit } from "@/lib/api";

interface Report {
  requestId: string;
  code: string;
  description: string;
  at: Date | null;
}

/**
 * MSG91 calls this, so none of the usual protections apply: there is no session, no Origin worth
 * checking, and the caller is not a browser. The shared secret in the query string is the whole
 * authentication, which is why the URL configured in MSG91's dashboard has to be treated as a
 * credential and rotated like one.
 */
function authorised(url: URL): boolean {
  const expected = process.env.MSG91_WEBHOOK_SECRET;
  if (!expected) return false;
  const given = url.searchParams.get("token") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const text = (value: unknown): string => (value === undefined || value === null ? "" : String(value));

const when = (value: unknown): Date | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * MSG91's report body has been seen in more than one shape across their API versions, and this
 * build has not been able to pin the contract down against a live report. Rather than assume one,
 * this walks whatever arrives for the fields it needs and ignores the rest, so a shape change costs
 * accuracy on the dashboard rather than a 500 and a retry storm. Anything it cannot read at all is
 * counted and logged.
 */
function extract(payload: unknown): Report[] {
  const out: Report[] = [];

  const visit = (node: unknown, inheritedId: string): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item, inheritedId);
      return;
    }
    if (!node || typeof node !== "object") return;

    const record = node as Record<string, unknown>;
    const requestId = text(record.requestId ?? record.request_id ?? record.requestID) || inheritedId;

    if (Array.isArray(record.report)) {
      for (const item of record.report) visit(item, requestId);
      return;
    }
    if (Array.isArray(record.data)) {
      for (const item of record.data) visit(item, requestId);
      return;
    }

    const code = text(record.status ?? record.statusCode ?? record.state);
    const description = text(record.desc ?? record.description ?? record.statusDesc ?? record.message);
    if (requestId && (code || description)) {
      out.push({ requestId, code, description, at: when(record.date ?? record.dateReceived ?? record.time) });
    }
  };

  visit(payload, "");
  return out;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const ip = clientIp(req);

  if (!authorised(url)) return fail(401, "unauthenticated");
  if (!rateLimit(`msg91-dlr:${ip}`, 600, 60_000)) return fail(429, "rate_limited");

  const payload: unknown = await req.json().catch(() => null);
  const reports = extract(payload);

  if (reports.length === 0) {
    // 400 rather than a silent 200: MSG91 retries on a non-2xx, and if the shape has changed we
    // want the retries and the log line, not a quiet loss of every delivery report.
    console.error("[msg91] delivery report in an unrecognised shape");
    return fail(400, "unreadable_report");
  }

  const collection = await smsDeliveries();
  const now = new Date();

  // Reports for different messages are independent; one unknown request id must not hold up the
  // rest of a batch.
  const written = await Promise.all(
    reports.map(async (report) => {
      const status: DeliveryStatus = classifyDelivery(report.code, report.description);
      const reportedAt = report.at ?? now;
      const result = await collection.updateOne(
        { requestId: report.requestId },
        {
          $set: { status, providerCode: report.code, providerDesc: report.description, reportedAt },
          $setOnInsert: {
            day: (report.at ?? now).toISOString().slice(0, 10),
            sentAt: report.at ?? now,
          },
        },
        { upsert: true },
      );
      return result.modifiedCount + result.upsertedCount;
    }),
  );

  const unmapped = reports.filter((r) => classifyDelivery(r.code, r.description) === "unknown");
  if (unmapped.length) {
    // Not an error — an unmapped value means classifyDelivery needs a line adding, and the codes
    // are worth having in the log to add it from. No mobile number is involved.
    console.warn(
      `[msg91] ${unmapped.length} delivery report(s) with an unmapped status: ` +
        [...new Set(unmapped.map((r) => `${r.code}/${r.description}`))].join(", "),
    );
  }

  // Nothing about any student goes back to the caller. MSG91 needs a 2xx and no more.
  return json({ received: written.length });
}
