import { signOut } from "@/lib/session";
import { fail, sameOrigin } from "@/lib/api";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "bad_origin");
  await signOut();
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
