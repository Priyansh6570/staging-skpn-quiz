// Creates or resets an admin account. There is no self-registration route and never should be.
// The password is generated here, printed once, and only its argon2id hash is stored.
//
//   node scripts/seed-admin.mjs <username> [displayName] [role]

import { MongoClient } from "mongodb";
import { hash } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.MONGODB_URI) process.loadEnvFile(resolve(ROOT, ".env.local"));

const [username, displayName = username, role = "owner"] = process.argv.slice(2);
if (!username) {
  console.error("usage: node scripts/seed-admin.mjs <username> [displayName] [role]");
  process.exit(1);
}
if (!["viewer", "operator", "owner"].includes(role)) {
  console.error(`role must be viewer, operator or owner — got ${role}`);
  process.exit(1);
}

// 24 bytes of base64url: ~144 bits, well past anything worth brute-forcing through a locked-out
// login. Never written to disk, never logged, shown exactly once below.
const password = randomBytes(24).toString("base64url");

const passwordHash = await hash(password, {
  algorithm: 2,       // argon2id
  memoryCost: 19456,  // 19 MiB, the OWASP baseline
  timeCost: 2,
  parallelism: 1,
});

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const collection = client.db(process.env.MONGODB_DB ?? "skpn").collection("admins");

const now = new Date();
const result = await collection.updateOne(
  { username },
  {
    $set: { passwordHash, displayName, role, failedAttempts: 0 },
    $unset: { lockedUntil: "" },
    $setOnInsert: { username, sessionVersion: 0, createdAt: now },
  },
  { upsert: true },
);
await client.close();

console.log(`\n  ${result.upsertedCount ? "created" : "reset"}  ${username}  (${role})`);
console.log(`  password: ${password}`);
console.log(`\n  Shown once. Store it in a password manager now — it cannot be recovered.\n`);
