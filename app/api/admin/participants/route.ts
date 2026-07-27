import { PAGE_SIZE, participants } from "@/lib/admin/queries";
import { adminOr401 } from "@/lib/admin/guard";
import { json } from "@/lib/api";

const SORTS = new Set(["name", "district", "category", "registered", "score", "attempt"]);

export async function GET(req: Request) {
  const guard = await adminOr401();
  if ("response" in guard) return guard.response;

  const params = new URL(req.url).searchParams;
  const sort = params.get("sort") ?? "name";

  const result = await participants({
    page: Math.max(1, Number(params.get("page") ?? 1) || 1),
    search: (params.get("search") ?? "").slice(0, 80),
    district: (params.get("district") ?? "").slice(0, 60),
    category: (params.get("category") ?? "").slice(0, 20),
    gender: (params.get("gender") ?? "").slice(0, 10),
    divyang: (params.get("divyang") ?? "").slice(0, 3),
    sort: SORTS.has(sort) ? sort : "name",
    direction: params.get("direction") === "desc" ? -1 : 1,
  });

  // Whitelisted in the query layer; this route adds only paging metadata.
  return json({ ...result, pageSize: PAGE_SIZE });
}
