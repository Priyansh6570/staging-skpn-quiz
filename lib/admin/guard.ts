import { getAdminSession, type AdminSession } from "@/lib/admin/auth";
import { fail } from "@/lib/api";

/**
 * Every admin route calls this. The proxy can only check a signature — revocation and the account's
 * existence need the database, so access is decided here, in the route, every time.
 */
export async function adminOr401(): Promise<{ session: AdminSession } | { response: Response }> {
  const session = await getAdminSession();
  return session ? { session } : { response: fail(401, "unauthenticated") };
}
