import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ObjectId } from "mongodb";
import { adminAuditLog, admins } from "@/lib/models";
import type { AdminRole } from "@/lib/models/types";

export const ADMIN_COOKIE = "skpn_admin";
const MAX_AGE_SECONDS = 60 * 60 * 4;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export interface AdminSession {
  aid: string;
  username: string;
  displayName: string;
  role: AdminRole;
  sv: number;
  iat: number;
  exp: number;
}

export class AdminAuthError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403) {
    super(status === 401 ? "unauthenticated" : "forbidden");
    this.status = status;
    this.name = "AdminAuthError";
  }
}

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET is not set");
  // Domain-separated from the student cookie so neither can ever be replayed as the other, even
  // if they end up sharing a secret in a deployment.
  return `admin:${s}`;
}

const mac = (body: string) => createHmac("sha256", secret()).update(body).digest();

export function signAdmin(payload: Omit<AdminSession, "iat" | "exp">): string {
  const iat = Math.floor(Date.now() / 1000);
  const full: AdminSession = { ...payload, iat, exp: iat + MAX_AGE_SECONDS };
  const body = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  return `${body}.${mac(body).toString("base64url")}`;
}

export function verifyAdmin(token: string): AdminSession | null {
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = mac(body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdminSession;
  return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
}

/** Empty or unset disables the allowlist entirely. */
export function ipAllowed(ip: string): boolean {
  const raw = (process.env.ADMIN_IP_ALLOWLIST ?? "").trim();
  if (!raw) return true;
  return raw.split(",").map((s) => s.trim()).filter(Boolean).includes(ip);
}

/**
 * Signature, expiry and revocation in one place. Every admin route calls this — the proxy gate is
 * a courtesy that keeps unauthenticated traffic off the pages, never the thing being relied on.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyAdmin(token);
  if (!payload || !ObjectId.isValid(payload.aid)) return null;

  const collection = await admins();
  const row = await collection.findOne(
    { _id: new ObjectId(payload.aid) },
    { projection: { sessionVersion: 1 } },
  );
  return row && (row.sessionVersion ?? 0) === payload.sv ? payload : null;
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new AdminAuthError(401);
  return session;
}

export async function setAdminSession(payload: Omit<AdminSession, "iat" | "exp">): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, signAdmin(payload), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0,
  });
}

export async function audit(
  session: Pick<AdminSession, "aid" | "username"> | null,
  action: string,
  target: string,
  ip: string,
): Promise<void> {
  const collection = await adminAuditLog();
  await collection.insertOne({
    adminId: session && ObjectId.isValid(session.aid) ? new ObjectId(session.aid) : null,
    username: session?.username ?? "-",
    action,
    target,
    ip,
    at: new Date(),
  } as never);
}
