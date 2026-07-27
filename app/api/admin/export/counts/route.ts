import { audit, getAdminSession } from "@/lib/admin/auth";
import { buildCountsSheets, writeWorkbook } from "@/lib/admin/export";
import { clientIp, fail, rateLimit, sameOrigin } from "@/lib/api";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return fail(401, "unauthenticated");
  if (!sameOrigin(req)) return fail(403, "bad_origin");

  // Per admin, not per IP: several admins share one office address.
  if (!rateLimit(`export:${session.aid}`, 1, 60_000)) return fail(429, "rate_limited");

  const buffer = await writeWorkbook(await buildCountsSheets());
  await audit(session, "admin.export.counts", "aggregates", clientIp(req));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="SKPN Counts.xlsx"',
      "cache-control": "no-store",
    },
  });
}
