import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "skpn_mobile_verified";

/**
 * Long enough to fill in a registration form that asks for an address and a school, short enough
 * that a shared or borrowed browser is not a standing licence to register that number.
 *
 * Raised from 15 minutes when the code step moved to the front of the form. The proof is now taken
 * before the name, the address, the school and the declaration rather than after them, so the
 * window has to cover the whole form rather than the moment at the end of it — and a student on a
 * handset in a school lab does not fill this in in fifteen minutes. It is still single-use, still
 * bound to the one number it was issued for, and still httpOnly.
 */
const MAX_AGE_SECONDS = 45 * 60;

interface Proof {
  mobile: string;
  exp: number;
}

/**
 * Domain-separated from both the student and the admin cookie. Proving you hold a number is not
 * proving you are the account that holds it, and the two must never be interchangeable even by
 * accident.
 */
function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return `mobile-proof:${value}`;
}

const mac = (body: string) => createHmac("sha256", secret()).update(body).digest();

function sign(proof: Proof): string {
  const body = Buffer.from(JSON.stringify(proof), "utf8").toString("base64url");
  return `${body}.${mac(body).toString("base64url")}`;
}

/**
 * The proof names the mobile it was issued for, so it authorises registering that number and no
 * other. A caller cannot verify one number and register a different one with the same cookie.
 */
export async function setMobileProof(mobile: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  (await cookies()).set(COOKIE_NAME, sign({ mobile, exp }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readMobileProof(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const dot = token.indexOf(".");
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = mac(body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const proof = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Proof;
  return proof.exp > Math.floor(Date.now() / 1000) ? proof.mobile : null;
}

/** Cleared the moment it is spent, so one verification buys exactly one registration. */
export async function clearMobileProof(): Promise<void> {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
