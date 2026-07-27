import { MongoServerError, ObjectId } from "mongodb";
import { users } from "@/lib/models";
import type { User } from "@/lib/models/types";
import { setSession } from "@/lib/session";
import { RegistrationInput } from "@/lib/registration";
import { clientIp, fail, json, rateLimit, sameOrigin } from "@/lib/api";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "bad_origin");

  // Deliberately generous, and never a hard IP block: a school computer lab and a district's only
  // cybercafe share one address, and locking them out on launch day is worse than a duplicate.
  if (!rateLimit(`register:${clientIp(req)}`, 30, 60_000)) return fail(429, "rate_limited");

  const parsed = RegistrationInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "invalid", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  }
  const input = parsed.data;
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
    if (error instanceof MongoServerError && error.code === 11000) return fail(409, "already_registered");
    throw error;
  }

  await setSession({
    uid: String(userId),
    name: document.fullName,
    attemptCount: 0,
    hasCertificates: false,
    lang: "hi",
    sv: 0,
  });

  return json({ ok: true, userId: String(userId) });
}
