import { randomBytes } from "node:crypto";
import { audit, getAdminSession } from "@/lib/admin/auth";
import { SYNC_ROW_LIMIT, buildFullSheets, writeWorkbook } from "@/lib/admin/export";
import { clientIp, fail, json, rateLimit, sameOrigin } from "@/lib/api";

/**
 * The workbook comes back base64 in the JSON body alongside its password. Neither may go in the
 * URL: query strings reach proxy logs, browser history and Referer headers.
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return fail(401, "unauthenticated");
  if (!sameOrigin(req)) return fail(403, "bad_origin");
  if (!rateLimit(`export:${session.aid}`, 1, 60_000)) return fail(429, "rate_limited");

  const { sheets, rowCount, truncated } = await buildFullSheets();

  if (truncated) {
    console.warn(
      `[admin] full export truncated at ${SYNC_ROW_LIMIT} rows — synchronous generation is past its limit, see DEFERRED.md`,
    );
  }

  // Generated per download, never stored, never logged, never reused.
  const password = randomBytes(12).toString("base64url");
  const buffer = await writeWorkbook(sheets, password);

  await audit(session, "admin.export.full", `${rowCount} participants`, clientIp(req));

  return json({
    fileName: "SKPN Participants.xlsx",
    password,
    rowCount,
    truncated,
    workbook: Buffer.from(buffer).toString("base64"),
  });
}
