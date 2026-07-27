import { traffic } from "@/lib/admin/queries";
import { adminOr401 } from "@/lib/admin/guard";
import { fail, json } from "@/lib/api";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const dayString = (offsetDays: number) =>
  new Date(Date.now() - offsetDays * 86_400_000).toISOString().slice(0, 10);

export async function GET(req: Request) {
  const guard = await adminOr401();
  if ("response" in guard) return guard.response;

  const params = new URL(req.url).searchParams;
  const from = params.get("from") ?? dayString(29);
  const to = params.get("to") ?? dayString(0);
  if (!DAY.test(from) || !DAY.test(to) || from > to) return fail(400, "invalid_range");

  return json(await traffic(from, to));
}
