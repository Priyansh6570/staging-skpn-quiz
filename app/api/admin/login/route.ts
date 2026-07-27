import { z } from "zod";
import { verify } from "@node-rs/argon2";
import { admins } from "@/lib/models";
import { audit, ipAllowed, LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS, setAdminSession } from "@/lib/admin/auth";
import { clientIp, fail, json, rateLimit, sameOrigin } from "@/lib/api";

const Body = z.object({ username: z.string().min(1).max(64), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "bad_origin");

  const ip = clientIp(req);
  if (!ipAllowed(ip)) return fail(403, "forbidden");

  // Independent of the per-account lockout: one throttles the credential, the other the source.
  if (!rateLimit(`admin-login:${ip}`, 10, 60_000)) {
    await audit(null, "admin.login.rate_limited", "-", ip);
    return fail(429, "rate_limited");
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_credentials");

  const collection = await admins();
  const admin = await collection.findOne({ username: parsed.data.username });
  const now = new Date();

  if (!admin) {
    await audit(null, "admin.login.unknown", parsed.data.username, ip);
    return fail(401, "invalid_credentials");
  }
  if (admin.lockedUntil && admin.lockedUntil > now) {
    await audit(null, "admin.login.locked", admin.username, ip);
    return fail(423, "locked");
  }

  const ok = await verify(admin.passwordHash, parsed.data.password).catch(() => false);
  if (!ok) {
    const failedAttempts = (admin.failedAttempts ?? 0) + 1;
    const lock = failedAttempts >= MAX_FAILED_ATTEMPTS;
    await collection.updateOne(
      { _id: admin._id },
      { $set: { failedAttempts, ...(lock ? { lockedUntil: new Date(now.getTime() + LOCKOUT_MINUTES * 60_000) } : {}) } },
    );
    await audit(null, lock ? "admin.login.locked_out" : "admin.login.failed", admin.username, ip);
    return fail(lock ? 423 : 401, lock ? "locked" : "invalid_credentials");
  }

  await collection.updateOne(
    { _id: admin._id },
    { $set: { failedAttempts: 0, lastLoginAt: now }, $unset: { lockedUntil: "" } },
  );
  await setAdminSession({
    aid: String(admin._id),
    username: admin.username,
    displayName: admin.displayName,
    role: admin.role,
    sv: admin.sessionVersion ?? 0,
  });
  await audit({ aid: String(admin._id), username: admin.username }, "admin.login.success", admin.username, ip);

  // Whitelisted: the row also carries passwordHash, failedAttempts and lockedUntil.
  return json({ displayName: admin.displayName, role: admin.role });
}
