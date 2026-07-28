import { NextResponse, type NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { pageViews, visitorDays } from "@/lib/models";
import { ADMIN_COOKIE, ipAllowed, verifyAdmin } from "@/lib/admin/auth";
import { competitionOpen } from "@/lib/competition";

// Next 16 runs proxy on the Node.js runtime, so it can reach Mongo directly.
export const config = {
  matcher: ["/((?!_next/|uploads/|assets/|favicon.ico|.*\\.(?:png|jpe?g|webp|svg|ico|mp4)$).*)"],
};

const clientIp = (req: NextRequest) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "unknown";

const today = () => new Date().toISOString().slice(0, 10);

// Everything that exists only to register, sign in or sit the paper. While the competition is
// closed these resolve to the home page, which carries the pending notice; the routes and their
// components stay in the tree untouched.
// "/quiz" also covers /quiz/rules, the gated twin of /rules.
const CLOSED_ROUTES = ["/login", "/register", "/quiz", "/profile", "/certificates", "/rules"];
const isClosedRoute = (pathname: string) =>
  CLOSED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

/**
 * Rotates daily and is never stored, so a hash cannot be matched back to an address once the day
 * turns — and today's hashes cannot be re-derived for any other day.
 */
const visitorHash = (ip: string, userAgent: string, day: string) =>
  createHmac("sha256", `${process.env.VISITOR_SALT_SECRET ?? ""}:${day}`)
    .update(`${ip}\n${userAgent}`)
    .digest("base64url");

// One write per page view would put a Mongo round trip on every request under a launch spike, so
// views accumulate in process and flush in a batch. A lost buffer costs a few counts, nothing else.
const buffer = new Map<string, number>();
let flushing: Promise<void> | null = null;

async function flush() {
  if (!buffer.size || flushing) return;
  const batch = [...buffer.entries()];
  buffer.clear();
  flushing = (async () => {
    const collection = await pageViews();
    await collection.bulkWrite(
      batch.map(([key, count]) => {
        const [day, path] = key.split(" ");
        return { updateOne: { filter: { day, path }, update: { $inc: { count } }, upsert: true } };
      }),
      { ordered: false },
    );
  })()
    .catch(() => {})
    .finally(() => { flushing = null; });
}

function record(req: NextRequest) {
  const day = today();
  const path = req.nextUrl.pathname;
  const key = `${day} ${path}`;
  buffer.set(key, (buffer.get(key) ?? 0) + 1);
  if (buffer.size >= 25) void flush();
  else setTimeout(() => void flush(), 5000).unref?.();

  // The unique-visitor row is upserted on its own: it must be exact, and the unique index makes
  // the repeat writes free.
  void (async () => {
    const collection = await visitorDays();
    const hash = visitorHash(clientIp(req), req.headers.get("user-agent") ?? "", day);
    await collection.updateOne(
      { day, hash },
      { $setOnInsert: { day, hash, at: new Date() } },
      { upsert: true },
    );
  })().catch(() => {});
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!ipAllowed(clientIp(req))) {
      return pathname.startsWith("/api/")
        ? NextResponse.json({ error: "forbidden" }, { status: 403 })
        : new NextResponse("Forbidden", { status: 403 });
    }
    // The login page and its endpoint are the way in, so they cannot require a session.
    const isEntry = pathname === "/admin/login" || pathname === "/api/admin/login";
    if (!isEntry) {
      // Signature and expiry only. Revocation needs the database, so every admin route re-checks
      // with getAdminSession() — this gate never stands alone.
      const token = req.cookies.get(ADMIN_COOKIE)?.value;
      if (!token || !verifyAdmin(token)) {
        return pathname.startsWith("/api/")
          ? NextResponse.json({ error: "unauthenticated" }, { status: 401 })
          : NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }
    return NextResponse.next();
  }

  // Admin traffic is not public traffic, and API calls are not page views. Recorded before the
  // closed-route redirect, so demand for registration while it is shut is still visible in /admin.
  if (!pathname.startsWith("/api/")) record(req);

  // Pages only. The API routes return 403 themselves — redirecting a POST here would turn it into
  // a GET of the home page and hide the refusal from the caller.
  if (!competitionOpen() && !pathname.startsWith("/api/") && isClosedRoute(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}
