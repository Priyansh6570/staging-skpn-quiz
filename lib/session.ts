import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ObjectId } from "mongodb";
import { users } from "@/lib/models";
import type { Lang } from "@/lib/models/types";

const COOKIE_NAME = "skpn_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Everything GET /api/session answers with, so the hot path never reads a profile. Whatever changes
 * here — attempt taken, certificate issued, language switched — has to re-issue the cookie.
 */
export interface SessionPayload {
  uid: string;
  name: string;
  attemptCount: number;
  hasCertificates: boolean;
  lang: Lang;
  /** Must equal users.sessionVersion or the cookie is dead. Sign-out increments it. */
  sv: number;
  iat: number;
  exp: number;
}

export class SessionError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403) {
    super(status === 401 ? "unauthenticated" : "forbidden");
    this.status = status;
    this.name = "SessionError";
  }
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

const mac = (body: string) => createHmac("sha256", secret()).update(body).digest();

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${mac(body).toString("base64url")}`;
}

function verify(token: string): SessionPayload | null {
  const dot = token.indexOf(".");
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = mac(body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  // Past the MAC check the bytes are ours, so parsing them cannot fail.
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
}

/** null when the account is gone. Absent field means 0, so accounts predating the column still work. */
async function storedVersion(uid: string): Promise<number | null> {
  if (!ObjectId.isValid(uid)) return null;
  const collection = await users();
  const doc = await collection.findOne(
    { _id: new ObjectId(uid) },
    { projection: { sessionVersion: 1 } },
  );
  return doc ? (doc.sessionVersion ?? 0) : null;
}

/**
 * Signature, expiry and revocation are all checked here rather than in a separate opt-in helper, so
 * a caller cannot get a session object that has not been through the sessionVersion comparison.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verify(token);
  if (!payload) return null;

  return (await storedVersion(payload.uid)) === payload.sv ? payload : null;
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new SessionError(401);
  return session;
}

export function requireOwnership(session: SessionPayload, ownerId: ObjectId | string): void {
  if (session.uid !== String(ownerId)) throw new SessionError(403);
}

export async function setSession(payload: Omit<SessionPayload, "iat" | "exp">): Promise<void> {
  const iat = Math.floor(Date.now() / 1000);
  (await cookies()).set(COOKIE_NAME, sign({ ...payload, iat, exp: iat + MAX_AGE_SECONDS }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Invalidates every cookie issued to this account, on every device, not just this browser. */
export async function signOut(): Promise<void> {
  const store = await cookies();
  const payload = verify(store.get(COOKIE_NAME)?.value ?? "");

  if (payload && ObjectId.isValid(payload.uid)) {
    const collection = await users();
    await collection.updateOne({ _id: new ObjectId(payload.uid) }, { $inc: { sessionVersion: 1 } });
  }

  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
