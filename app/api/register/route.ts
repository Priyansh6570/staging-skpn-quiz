import { MongoServerError, ObjectId } from "mongodb";
import { users } from "@/lib/models";
import type { User } from "@/lib/models/types";
import { setSession } from "@/lib/session";
import { RegistrationInput } from "@/lib/registration";
import { clearMobileProof, readMobileProof } from "@/lib/mobileProof";
import { clientIp, fail, json, rateLimit, sameOrigin } from "@/lib/api";
import { competitionOpen } from "@/lib/competition";

export async function POST(req: Request) {
  if (!competitionOpen()) return fail(403, "competition_closed");
  if (!sameOrigin(req)) return fail(403, "bad_origin");

  // Deliberately generous, and never a hard IP block: a school computer lab and a district's only
  // cybercafe share one address, and locking them out on launch day is worse than a duplicate.
  if (!rateLimit(`register:${clientIp(req)}`, 30, 60_000)) return fail(429, "rate_limited");

  const parsed = RegistrationInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    // The failing field paths used to be listed here. The form submits every field at once, so the
    // list was a map of the whole schema handed to anyone who posted a malformed body; the client
    // never read it and renders one message for a 400.
    return json({ error: "invalid" }, { status: 400 });
  }
  const input = parsed.data;

  // The account identifier is the mobile number and there is no credential behind it, so proving
  // the number reaches the person registering it is the only thing standing between this form and
  // an account opened in a stranger's name. Bound to the number it was issued for: a proof for one
  // mobile cannot register another.
  if ((await readMobileProof()) !== input.mobile) return fail(403, "mobile_not_verified");

  const now = new Date();

  const document: Omit<User, "_id"> = {
    mobile: input.mobile,
    ...(input.email ? { email: input.email } : {}),
    fullName: input.fullName,
    gender: input.gender,
    dateOfBirth: new Date(input.dateOfBirth),
    address: {
      line: input.address.line,
      cityVillage: input.address.cityVillage,
      district: input.address.district,
      state: "MP",
      pincode: input.address.pincode,
    },
    category: input.category,
    educationLevel: input.educationLevel,
    institutionName: input.institutionName,
    competitiveExam: input.competitiveExam,
    isDivyang: input.isDivyang,
    preferredLanguage: "hi",
    consents: {
      rulesAcceptedAt: now,
      privacyAcceptedAt: now,
      ...(input.guardianName
        ? { guardian: { name: input.guardianName, statementVersion: "unversioned", acceptedAt: now } }
        : {}),
    },
    registrationStatus: "complete",
    sessionVersion: 0,
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const collection = await users();
  let userId: ObjectId;
  try {
    const result = await collection.insertOne(document as User);
    userId = result.insertedId;
  } catch (error) {
    // Two unique indexes can raise this, and they are not the same refusal. Answering
    // "already_registered" for both told a student whose email was on another account that their
    // mobile number was taken, and sent them back to a step where nothing was wrong.
    if (error instanceof MongoServerError && error.code === 11000) {
      const field = Object.keys((error.keyPattern ?? {}) as Record<string, unknown>)[0];
      return fail(409, field === "email" ? "email_taken" : "already_registered");
    }
    throw error;
  }

  // Spent, so it cannot be replayed into a second account on the same verification.
  await Promise.all([
    clearMobileProof(),
    setSession({
      uid: String(userId),
      name: document.fullName,
      attemptCount: 0,
      hasCertificates: false,
      lang: "hi",
      sv: 0,
    }),
  ]);

  // No id. The session cookie carries the uid; the client had no use for the Mongo _id and echoing
  // it made a primary key readable in the network tab on the one request every student makes.
  return json({ ok: true });
}
