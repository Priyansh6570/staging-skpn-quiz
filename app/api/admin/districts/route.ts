import { districts } from "@/lib/admin/queries";
import { adminOr401 } from "@/lib/admin/guard";
import { json } from "@/lib/api";

export async function GET() {
  const guard = await adminOr401();
  if ("response" in guard) return guard.response;
  return json(await districts());
}
