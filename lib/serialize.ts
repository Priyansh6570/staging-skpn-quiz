import type { Attempt, Certificate, User } from "@/lib/models/types";
import type { SessionPayload } from "@/lib/session";

/**
 * Every field any student-facing route emits is named in this file.
 *
 * The rule is a whitelist, never a subtraction: each serialiser writes out the keys it returns one
 * by one. No spread of a document, no `delete`, no `projection` standing in for a contract. A field
 * added to a collection cannot reach a response by inheritance, and reviewing what a student can see
 * means reading one file rather than tracing every route.
 *
 * **`score` appears in none of them, and must not be added.** Selection is by district merit list
 * and committee lottery and the results are published by the Nyas; a score in the network tab
 * pre-empts that process, and scores correlated across attempts are a path to inferring the answer
 * key. `correctOptionId` never leaves the repository layer at all — see CLAUDE.md. Raw
 * `timeTakenSeconds` and `answered` counts are not emitted either: the quiz screen computes both
 * from its own state, and the profile is given a formatted duration rather than the integer.
 *
 * Mongo `_id` is not an identifier a student is given. A certificate is addressed by its
 * `certificateNumber`, which is the number printed on it. The one ObjectId still crossing the
 * boundary is an attempt's, because it is the URL the student is already on and every read of it is
 * ownership-checked; giving attempts an opaque public id needs a field, a unique index and a
 * backfill, which is a migration rather than a serialiser change.
 */

const mmss = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

/** GET /api/session — what every page loads on every navigation. Nothing identifying beyond a name. */
export function sessionSummary(session: SessionPayload | null) {
  if (!session) {
    return { signedIn: false, displayName: null, hasCertificates: false, lang: "hi" as const };
  }
  return {
    signedIn: true,
    displayName: session.name,
    hasCertificates: session.hasCertificates,
    lang: session.lang,
  };
}

/** GET /api/me — the profile page, and only the fields it puts on screen. */
export function profileDetail(user: User, attempt: Attempt | null) {
  return {
    displayName: user.fullName,
    mobile: user.mobile,
    email: user.email ?? null,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
    address: {
      line: user.address?.line ?? "",
      cityVillage: user.address?.cityVillage ?? "",
      district: user.address?.district ?? "",
      pincode: user.address?.pincode ?? "",
    },
    category: user.category,
    educationLevel: user.educationLevel,
    institutionName: user.institutionName,
    competitiveExam: user.competitiveExam ?? null,
    isDivyang: user.isDivyang ?? false,
    // Present only for a paper actually sat. Its truthiness is the profile's completion state, so
    // it carries the two things the page prints and no measure of performance.
    attempt: attempt
      ? {
          submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
          durationLabel: attempt.timeTakenSeconds != null ? mmss(attempt.timeTakenSeconds) : null,
        }
      : null,
  };
}

/** GET /api/me/certificate — the name and details printed on the certificate. Nothing else. */
export function certificateIdentity(user: User, attempt: Attempt | null) {
  return {
    displayName: user.fullName,
    district: user.address?.district ?? "",
    category: user.category,
    attemptDate: attempt?.submittedAt ? attempt.submittedAt.toISOString() : null,
  };
}

/** GET /api/certificates — one row per certificate, addressed by its printed number. */
export function certificateRow(certificate: Certificate) {
  return {
    certificateNumber: certificate.certificateNumber,
    issuedAt: certificate.issuedAt.toISOString(),
  };
}

/** POST /api/quiz/attempts/[id]/submit — a receipt, not a result. */
export function submitReceipt(input: { submittedAt: Date; expired: boolean; certificateNumber: string | null }) {
  return {
    submittedAt: input.submittedAt.toISOString(),
    // A designed state, not a 4xx the UI renders as a crash.
    expired: input.expired,
    certificateNumber: input.certificateNumber,
  };
}
