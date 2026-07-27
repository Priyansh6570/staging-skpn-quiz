import { z } from "zod";
import { users } from "@/lib/models";
import { requireSession, setSession, SessionError } from "@/lib/session";
import { ObjectId } from "mongodb";
import { fail, json, sameOrigin } from "@/lib/api";

const Body = z.object({ lang: z.enum(["hi", "en"]) });

export async function PATCH(req: Request) {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    // Signed-out visitors still toggle language; the cookie the client already set is enough.
    if (error instanceof SessionError) return new Response(null, { status: 204 });
    throw error;
  }
  if (!sameOrigin(req)) return fail(403, "bad_origin");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_lang");

  const collection = await users();
  await collection.updateOne(
    { _id: new ObjectId(session.uid) },
    { $set: { preferredLanguage: parsed.data.lang, updatedAt: new Date() } },
  );
  await setSession({ ...session, lang: parsed.data.lang });
  return json({ ok: true });
}
