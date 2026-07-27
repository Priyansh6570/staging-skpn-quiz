import { ObjectId } from "mongodb";
import { admins } from "@/lib/models";
import { audit, clearAdminSession, getAdminSession } from "@/lib/admin/auth";
import { clientIp, fail, sameOrigin } from "@/lib/api";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "bad_origin");
  const session = await getAdminSession();

  if (session) {
    const collection = await admins();
    await collection.updateOne({ _id: new ObjectId(session.aid) }, { $inc: { sessionVersion: 1 } });
    await audit(session, "admin.logout", session.username, clientIp(req));
  }
  await clearAdminSession();
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
