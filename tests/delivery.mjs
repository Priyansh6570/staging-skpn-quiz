// The MSG91 delivery-report webhook: authentication, the shapes it has to survive, idempotency,
// and the operations panel figures derived from it. No SMS is sent — rows are planted directly,
// exactly as a send would have written them.
import { MongoClient } from "mongodb";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.MONGODB_URI) process.loadEnvFile(resolve(ROOT, ".env.local"));

const BASE = process.env.BASE ?? "http://localhost:3111";
const SECRET = process.env.MSG91_WEBHOOK_SECRET;

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const post = async (body, token = SECRET) => {
  const res = await fetch(`${BASE}/api/webhooks/msg91/delivery?token=${encodeURIComponent(token ?? "")}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 120); }
  return { status: res.status, body: parsed };
};

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB ?? "skpn");
const deliveries = db.collection("smsDeliveries");

const stamp = Date.now();
const ids = { delivered: `t-${stamp}-d`, failed: `t-${stamp}-f`, odd: `t-${stamp}-u` };
const today = new Date().toISOString().slice(0, 10);

// Three messages the send path has accepted and is waiting on.
await deliveries.insertMany(
  Object.values(ids).map((requestId) => ({ requestId, day: today, sentAt: new Date(), status: "pending" })),
);

// --- authentication -------------------------------------------------------------------------------
let r = await post([{ requestId: ids.delivered, report: [{ status: "1", desc: "DELIVERED" }] }], "");
check("no token is refused", r.status === 401, `status ${r.status}`);

r = await post([{ requestId: ids.delivered, report: [{ status: "1", desc: "DELIVERED" }] }], `${SECRET}x`);
check("a wrong token is refused", r.status === 401, `status ${r.status}`);

const row = async (id) => deliveries.findOne({ requestId: id });
check("a refused report writes nothing", (await row(ids.delivered)).status === "pending");

// --- the shapes ------------------------------------------------------------------------------------
r = await post([{ requestId: ids.delivered, report: [{ number: "919000000000", status: "1", desc: "DELIVERED" }] }]);
check("a nested report is accepted", r.status === 200, `status ${r.status}`);
check("...and marks the message delivered", (await row(ids.delivered)).status === "delivered");

r = await post({ data: [{ requestId: ids.failed, status: "2", desc: "FAILED" }] });
check("a flat data array is accepted", r.status === 200, `status ${r.status}`);
check("...and marks the message failed", (await row(ids.failed)).status === "failed");

r = await post([{ requestId: ids.odd, report: [{ status: "97", desc: "SOMETHING NEW" }] }]);
check("an unmapped status is accepted rather than dropped", r.status === 200, `status ${r.status}`);
{
  const stored = await row(ids.odd);
  check("...recorded as unknown, not guessed", stored.status === "unknown", stored.status);
  check("...keeping the provider's own words for it", stored.providerDesc === "SOMETHING NEW" && stored.providerCode === "97");
}

r = await post({ nothing: "useful" });
check("an unreadable body is refused so MSG91 retries", r.status === 400, `status ${r.status}`);

// --- idempotency -------------------------------------------------------------------------------------
await post([{ requestId: ids.delivered, report: [{ status: "1", desc: "DELIVERED" }] }]);
check("a repeated report does not duplicate the row", (await deliveries.countDocuments({ requestId: ids.delivered })) === 1);

// --- the panel -----------------------------------------------------------------------------------------
{
  const counts = await deliveries.aggregate([
    { $match: { day: today, requestId: { $in: Object.values(ids) } } },
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]).toArray();
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  check("the day groups as the panel reads it", byStatus.delivered === 1 && byStatus.failed === 1 && byStatus.unknown === 1, JSON.stringify(byStatus));
}

await deliveries.deleteMany({ requestId: { $in: Object.values(ids) } });
await client.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log("FAILED:"); for (const f of failed) console.log(`  ${f.name} ${f.detail}`); }
process.exit(failed.length ? 1 : 0);
