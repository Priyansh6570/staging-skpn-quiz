import { getSession } from "@/lib/session";
import { json } from "@/lib/api";

// Called on every page by every visitor. It reads the cookie payload and the one sessionVersion
// row, and must never grow past that.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return json({ signedIn: false, name: null, initial: null, attemptCount: 0, hasCertificates: false, lang: "hi" });
  }
  return json({
    signedIn: true,
    name: session.name,
    initial: session.name ? [...session.name][0] : null,
    attemptCount: session.attemptCount,
    hasCertificates: session.hasCertificates,
    lang: session.lang,
  });
}
