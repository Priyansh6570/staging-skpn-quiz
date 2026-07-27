import { getAdminSession } from "@/lib/admin/auth";
import { dashboardStats } from "@/lib/admin/stats";
import { fail, json } from "@/lib/api";

export async function GET() {
  // Re-checked here, not trusted from the proxy.
  const session = await getAdminSession();
  if (!session) return fail(401, "unauthenticated");
  return json(await dashboardStats());
}
