import { ObjectId } from "mongodb";
import { z } from "zod";
import { attempts, certificates, users } from "@/lib/models";
import type { AttemptStatus } from "@/lib/models/types";
import { requireOwnership, requireSession, setSession } from "@/lib/session";
import { GRACE_SECONDS, TOTAL, scoreAnswers } from "@/lib/quiz";
import { errorResponse, fail, json, sameOrigin } from "@/lib/api";
import { competitionOpen } from "@/lib/competition";
import { randomBytes } from "node:crypto";

const Body = z.object({ reason: z.enum(["manual", "auto"]) });

/** Non-sequential: /verify/[n] is a public name lookup keyed by this number. */
const certificateNumber = () => `SKPN-${randomBytes(6).toString("hex").toUpperCase()}`;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!competitionOpen()) return fail(403, "competition_closed");

  let session;
  try {
    session = await requireSession();
  } catch (error) {
    return errorResponse(error);
  }
  if (!sameOrigin(req)) return fail(403, "bad_origin");

  const { id } = await params;
  if (!ObjectId.isValid(id)) return fail(404, "not_found");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_body");

  const attemptId = new ObjectId(id);
  const collection = await attempts();
  const attempt = await collection.findOne({ _id: attemptId });
  if (!attempt) return fail(404, "not_found");

  try {
    requireOwnership(session, attempt.userId);
  } catch (error) {
    return errorResponse(error);
  }

  const now = new Date();
  const expired = now.getTime() > attempt.expiresAt.getTime() + GRACE_SECONDS * 1000;

  // Idempotent: the auto-submit timer and a manual tap will race, and whichever loses reads back
  // the stored result instead of scoring a second time.
  if (attempt.status !== "in_progress") {
    return json({
      score: attempt.score ?? 0,
      total: TOTAL,
      answered: attempt.answers.filter((a) => a.selectedOptionId).length,
      timeTakenSeconds: attempt.timeTakenSeconds ?? 0,
      submittedAt: attempt.submittedAt?.toISOString() ?? now.toISOString(),
      expired: attempt.status === "expired",
      alreadySubmitted: true,
    });
  }

  const score = await scoreAnswers(attempt.answers);
  const closedAt = expired ? attempt.expiresAt : now;
  const timeTakenSeconds = Math.max(
    0,
    Math.round((closedAt.getTime() - attempt.startedAt.getTime()) / 1000),
  );
  const status: AttemptStatus = expired ? "expired" : parsed.data.reason === "auto" ? "auto_submitted" : "submitted";

  const claimed = await collection.findOneAndUpdate(
    { _id: attemptId, status: "in_progress" },
    { $set: { status, submittedAt: closedAt, score, timeTakenSeconds } },
    { returnDocument: "after" },
  );

  // Lost the race: another request scored it first, so read that result back.
  if (!claimed) {
    const settled = await collection.findOne({ _id: attemptId });
    return json({
      score: settled?.score ?? 0,
      total: TOTAL,
      answered: settled?.answers.filter((a) => a.selectedOptionId).length ?? 0,
      timeTakenSeconds: settled?.timeTakenSeconds ?? 0,
      submittedAt: settled?.submittedAt?.toISOString() ?? now.toISOString(),
      expired: settled?.status === "expired",
      alreadySubmitted: true,
    });
  }

  const [certificatesCollection, usersCollection] = await Promise.all([certificates(), users()]);
  const [certificate] = await Promise.all([
    certificatesCollection.findOneAndUpdate(
      { attemptId },
      { $setOnInsert: { userId: attempt.userId, attemptId, certificateNumber: certificateNumber(), issuedAt: closedAt } },
      { upsert: true, returnDocument: "after" },
    ),
    usersCollection.updateOne(
      { _id: attempt.userId },
      {
        $set: { bestScore: score, bestAttemptId: attemptId, bestAttemptAt: closedAt, updatedAt: closedAt },
        $inc: { attemptCount: 1 },
      },
    ),
  ]);

  await setSession({ ...session, hasCertificates: true, attemptCount: session.attemptCount + 1 });

  return json({
    score,
    total: TOTAL,
    answered: attempt.answers.filter((a) => a.selectedOptionId).length,
    timeTakenSeconds,
    submittedAt: closedAt.toISOString(),
    // A designed state, not a 4xx the UI renders as a crash.
    expired,
    certificateId: certificate ? String(certificate._id) : null,
  });
}
