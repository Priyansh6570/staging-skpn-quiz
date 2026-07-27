// Expires and scores attempts abandoned past their window. Without it a student who closed the
// tab at 04:00 leaves an in_progress row forever and, under the one-attempt rule, is locked out of
// the competition with no recourse.
//
// Run on a schedule (every minute is fine):  node scripts/sweep-attempts.mjs

import { MongoClient } from "mongodb";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.MONGODB_URI) process.loadEnvFile(resolve(ROOT, ".env.local"));

const GRACE_SECONDS = 15;

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB ?? "skpn");
const attempts = db.collection("attempts");
const questions = db.collection("questions");
const users = db.collection("users");
const certificates = db.collection("certificates");

const key = new Map(
  (await questions.find({}, { projection: { correctOptionId: 1 } }).toArray())
    .map((q) => [String(q._id), q.correctOptionId]),
);

const cutoff = new Date(Date.now() - GRACE_SECONDS * 1000);
const stale = await attempts.find({ status: "in_progress", expiresAt: { $lt: cutoff } }).toArray();

let swept = 0;
for (const attempt of stale) {
  const score = attempt.answers.reduce(
    (total, a) => (a.selectedOptionId && key.get(String(a.questionId)) === a.selectedOptionId ? total + 1 : total),
    0,
  );
  const timeTakenSeconds = Math.max(0, Math.round((attempt.expiresAt - attempt.startedAt) / 1000));

  // Conditional on status so it cannot overwrite an attempt a live submit just claimed.
  const claimed = await attempts.findOneAndUpdate(
    { _id: attempt._id, status: "in_progress" },
    { $set: { status: "expired", submittedAt: attempt.expiresAt, score, timeTakenSeconds } },
  );
  if (!claimed) continue;

  await Promise.all([
    users.updateOne(
      { _id: attempt.userId },
      {
        $set: { bestScore: score, bestAttemptId: attempt._id, bestAttemptAt: attempt.expiresAt, updatedAt: new Date() },
        $inc: { attemptCount: 1 },
      },
    ),
    certificates.updateOne(
      { attemptId: attempt._id },
      {
        $setOnInsert: {
          userId: attempt.userId,
          attemptId: attempt._id,
          certificateNumber: `SKPN-${[...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`,
          issuedAt: attempt.expiresAt,
        },
      },
      { upsert: true },
    ),
  ]);
  swept++;
}

// Heartbeat: without a row here the operations panel cannot tell "nothing to sweep" from
// "nobody has run the sweeper since launch".
await db.collection("adminAuditLog").insertOne({
  adminId: null,
  username: "system",
  action: "system.sweep",
  target: `${stale.length} found, ${swept} scored`,
  ip: "-",
  at: new Date(),
});

console.log(`${stale.length} expired attempt(s) found, ${swept} scored`);
await client.close();
