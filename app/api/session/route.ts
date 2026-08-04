import { getSession } from "@/lib/session";
import { sessionSummary } from "@/lib/serialize";
import { json } from "@/lib/api";

// Called on every page by every visitor. It reads the cookie payload and the one sessionVersion
// row, and must never grow past that. The body is whatever lib/serialize.ts names and nothing else:
// this is the one response a signed-out crawler and a signed-in student both receive.
export async function GET() {
  return json(sessionSummary(await getSession()));
}
