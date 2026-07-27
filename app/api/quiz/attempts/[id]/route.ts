import { ObjectId } from "mongodb";
import { attempts } from "@/lib/models";
import { requireOwnership, requireSession } from "@/lib/session";
import { TOTAL, replayPaper } from "@/lib/quiz";
import { errorResponse, fail, json } from "@/lib/api";

/** The resume path. The export had none: a refresh at question 22 lost everything. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    return errorResponse(error);
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) return fail(404, "not_found");

  const collection = await attempts();
  const attempt = await collection.findOne({ _id: new ObjectId(id) });
  if (!attempt) return fail(404, "not_found");

  try {
    requireOwnership(session, attempt.userId);
  } catch (error) {
    return errorResponse(error);
  }

  const questions = await replayPaper(attempt.served);

  return json({
    attemptId: String(attempt._id),
    status: attempt.status,
    questions,
    total: TOTAL,
    answers: attempt.answers.map((a) => ({
      questionId: String(a.questionId),
      selectedOptionId: a.selectedOptionId,
      clientSeq: a.clientSeq,
    })),
    serverNow: new Date().toISOString(),
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt.toISOString(),
    ...(attempt.status !== "in_progress"
      ? { score: attempt.score, submittedAt: attempt.submittedAt?.toISOString(), timeTakenSeconds: attempt.timeTakenSeconds }
      : {}),
  });
}
