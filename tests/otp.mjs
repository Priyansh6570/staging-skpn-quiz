// Plants a code the way a delivered SMS would have, so the end-to-end tests walk the real
// /api/otp/verify route. No endpoint returns an OTP in any environment, and no test flag exists to
// make one — the code is known here because the test computes the same HMAC the server does.
import { MongoClient } from "mongodb";
import { createHmac } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.MONGODB_URI) process.loadEnvFile(resolve(ROOT, ".env.local"));

export const CODE = "424242";

let client = null;

const collection = async () => {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
  }
  return client.db(process.env.MONGODB_DB ?? "skpn").collection("otpRequests");
};

/** Leaves the number in the state it would be in a second after MSG91 accepted the message. */
export async function plantOtp(mobile, purpose) {
  const otpHash = createHmac("sha256", process.env.OTP_PEPPER).update(CODE).digest("hex");
  const now = new Date();
  await (await collection()).updateOne(
    { mobile },
    {
      $set: {
        purpose,
        otpHash,
        expiresAt: new Date(now.getTime() + 600_000),
        attempts: 0,
        consumed: false,
        lastSentAt: now,
        channel: "admin",
        ip: "test",
      },
      $inc: { sendCount: 1 },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

/**
 * The browser-driven half of the same thing. The page must already be on the app's origin — the
 * verify call has to be same-origin to pass the CSRF check, and the proof cookie it sets has to
 * land in the context the registration will be made from.
 */
export async function verifyInPage(page, mobile, purpose = "register") {
  await plantOtp(mobile, purpose);
  await page.evaluate(async ([m, p, c]) => {
    await fetch("/api/otp/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mobile: m, purpose: p, code: c }),
    });
  }, [mobile, purpose, CODE]);
}

export async function closeOtp() {
  if (client) await client.close();
  client = null;
}
