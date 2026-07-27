// Admin auth, gating, data minimisation, exports and audit trail.
//   ADMIN_USER=... ADMIN_PASS=... node tests/admin.mjs
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:4700";
const USER = process.env.ADMIN_USER ?? "skpnadmin";
const PASS = process.env.ADMIN_PASS ?? "";

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

let cookie = "";
const call = async (path, init = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { origin: BASE, "content-type": "application/json", ...(cookie ? { cookie } : {}), ...init.headers },
    redirect: "manual",
  });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    if (pair.startsWith("skpn_admin=")) cookie = pair;
  }
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 160); }
  return { status: res.status, body, headers: res.headers };
};

// --- gating -------------------------------------------------------------------------------------
let r = await call("/admin");
check("/admin unauthenticated redirects", r.status === 307 || r.status === 302, `status ${r.status}`);
r = await call("/api/admin/stats");
check("stats API unauthenticated is 401", r.status === 401, `status ${r.status}`);
r = await call("/api/admin/export/full", { method: "POST" });
check("full export unauthenticated is 401", r.status === 401, `status ${r.status}`);
r = await call("/api/admin/export/counts", { method: "POST" });
check("counts export unauthenticated is 401", r.status === 401, `status ${r.status}`);

// --- login --------------------------------------------------------------------------------------
r = await call("/api/admin/login", { method: "POST", body: JSON.stringify({ username: USER, password: "wrong-password" }) });
check("wrong password rejected", r.status === 401, `status ${r.status}`);
check("failure reveals nothing about the account", JSON.stringify(r.body) === '{"error":"invalid_credentials"}', JSON.stringify(r.body));

r = await call("/api/admin/login", { method: "POST", headers: { origin: "https://evil.example" }, body: JSON.stringify({ username: USER, password: PASS }) });
check("login rejects a foreign Origin", r.status === 403, `status ${r.status}`);

r = await call("/api/admin/login", { method: "POST", body: JSON.stringify({ username: USER, password: PASS }) });
check("correct password signs in", r.status === 200, `status ${r.status} ${JSON.stringify(r.body)}`);
check("login response carries no hash or lock state", !JSON.stringify(r.body).match(/passwordHash|failedAttempts|lockedUntil|sessionVersion|_id/), JSON.stringify(r.body));

const setCookieHeader = r.headers.getSetCookie?.().find((c) => c.startsWith("skpn_admin=")) ?? "";
check("admin cookie is httpOnly + Secure + Lax", /HttpOnly/i.test(setCookieHeader) && /Secure/i.test(setCookieHeader) && /SameSite=Lax/i.test(setCookieHeader), setCookieHeader.split(";").slice(1).join(";").trim());
check("admin cookie name is distinct from the student cookie", setCookieHeader.startsWith("skpn_admin=") && !setCookieHeader.startsWith("skpn_session="));

// --- stats --------------------------------------------------------------------------------------
r = await call("/api/admin/stats");
check("stats returns for a signed-in admin", r.status === 200, `status ${r.status}`);
const stats = r.body;
check("all 55 districts are present", stats.districts?.length === 55, `${stats.districts?.length} districts`);
check("districts are sorted ascending", stats.districts.every((d, i, a) => i === 0 || a[i - 1].count <= d.count));
check("score histogram spans 0..30", stats.scores.histogram.length === 31);
check("traffic covers 30 days", stats.traffic.length === 30);
check("stats leaks no personal fields", !JSON.stringify(stats).match(/fullName|dateOfBirth|institutionName|passwordHash|pincode/), "no PII keys");

// --- exports ------------------------------------------------------------------------------------
r = await call("/api/admin/export/counts", { method: "POST" });
check("counts export succeeds", r.status === 200, `status ${r.status}`);
check("counts export is an xlsx attachment", (r.headers.get("content-type") ?? "").includes("spreadsheetml"), r.headers.get("content-type") ?? "");

r = await call("/api/admin/export/counts", { method: "POST" });
check("second export within a minute is throttled", r.status === 429, `status ${r.status}`);

// --- audit --------------------------------------------------------------------------------------
const { MongoClient } = await import("mongodb");
const { resolve } = await import("node:path");
if (!process.env.MONGODB_URI) process.loadEnvFile(resolve(process.cwd(), ".env.local"));
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB ?? "skpn");

const audit = await db.collection("adminAuditLog").find({}).sort({ at: -1 }).limit(20).toArray();
check("login success is audited", audit.some((a) => a.action === "admin.login.success"));
check("failed login is audited", audit.some((a) => a.action === "admin.login.failed"));
check("counts export is audited", audit.some((a) => a.action === "admin.export.counts"));
check("audit rows carry the admin identity and IP", audit.every((a) => "username" in a && "ip" in a));
check("audit never stores an export password", !JSON.stringify(audit).match(/password/i));

const adminRow = await db.collection("admins").findOne({ username: USER });
check("password is argon2id, not plaintext", (adminRow?.passwordHash ?? "").startsWith("$argon2id$"), (adminRow?.passwordHash ?? "").slice(0, 12));

// --- revocation ---------------------------------------------------------------------------------
const stolen = cookie;
await call("/api/admin/logout", { method: "POST" });
cookie = stolen;
r = await call("/api/admin/stats");
check("sign-out revokes an already-issued admin cookie", r.status === 401, `status ${r.status}`);

// --- traffic ------------------------------------------------------------------------------------
const before = await db.collection("pageViews").aggregate([{ $group: { _id: null, n: { $sum: "$count" } } }]).toArray();
const browser = await chromium.launch();
const page = await browser.newPage();
for (const path of ["/", "/about", "/rules"]) await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
await page.waitForTimeout(6500);
await browser.close();
const after = await db.collection("pageViews").aggregate([{ $group: { _id: null, n: { $sum: "$count" } } }]).toArray();
check("page views are recorded", (after[0]?.n ?? 0) > (before[0]?.n ?? 0), `${before[0]?.n ?? 0} -> ${after[0]?.n ?? 0}`);

const visitor = await db.collection("visitorDays").findOne({});
check("visitor rows store only a hash and a day", visitor && Object.keys(visitor).sort().join(",") === "_id,at,day,hash", visitor ? Object.keys(visitor).join(",") : "none");
check("visitor hash is not reversible to an address", !!visitor && !/\d+\.\d+\.\d+\.\d+/.test(JSON.stringify(visitor)));

await client.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
