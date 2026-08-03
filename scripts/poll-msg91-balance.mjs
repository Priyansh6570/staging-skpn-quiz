// Reads the MSG91 credit balance and records it, because an exhausted balance is otherwise
// invisible: the send API answers "success" whether or not it has the credits to deliver.
//
// Run on a schedule (every 15 minutes is plenty):
//   node --experimental-strip-types scripts/poll-msg91-balance.mjs

import { MongoClient } from "mongodb";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchBalance } from "../lib/msg91.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.MONGODB_URI) process.loadEnvFile(resolve(ROOT, ".env.local"));

// Set MSG91_BALANCE_ALERT_THRESHOLD=0 to record the balance without ever alerting on it. That is
// the setting for an account whose billing does not run on credits, where balance.php answers 0
// forever and a standing red alert would only teach people to ignore the panel. The number is
// still collected and still shown — only the alert is off.
const DEFAULT_THRESHOLD = 5000;
const configured = Number(process.env.MSG91_BALANCE_ALERT_THRESHOLD);
const threshold = Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_THRESHOLD;

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB ?? "skpn");
const health = db.collection("providerHealth");
const auditLog = db.collection("adminAuditLog");

const previous = await health.findOne({ key: "msg91_balance" });
const result = await fetchBalance();
const now = new Date();
const belowThreshold = threshold > 0 && result.ok && result.credits < threshold;

await health.updateOne(
  { key: "msg91_balance" },
  {
    $set: {
      ok: result.ok,
      credits: result.credits,
      raw: result.raw,
      detail: result.detail,
      checkedAt: now,
      belowThreshold,
    },
  },
  { upsert: true },
);

// Only on the crossing, in both directions. A row every fifteen minutes would bury the one that
// matters, and an operator who has fixed it deserves to see that it cleared.
const alert = async (action, target) =>
  auditLog.insertOne({ adminId: null, username: "system", action, target, ip: "-", at: now });

if (belowThreshold && !previous?.belowThreshold) {
  await alert("otp.balance_low", `${result.credits} credits, threshold ${threshold}`);
} else if (previous?.belowThreshold && result.ok && !belowThreshold) {
  await alert("otp.balance_recovered", `${result.credits} credits`);
}

// A check that cannot reach MSG91 at all is its own signal — the same call the send path makes is
// failing — but only worth a row when it changes.
if (!result.ok && previous?.ok !== false) {
  await alert("otp.balance_check_failed", result.detail.slice(0, 200));
}

console.log(
  result.ok
    ? `MSG91 balance ${result.credits}${belowThreshold ? ` — BELOW threshold ${threshold}` : ""}`
    : `MSG91 balance check failed: ${result.detail}`,
);

await client.close();
process.exit(result.ok ? 0 : 1);
