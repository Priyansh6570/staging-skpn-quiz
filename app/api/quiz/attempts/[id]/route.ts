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

  // Named fields only. The finished-attempt branch used to spread in score and timeTakenSeconds;
  // nothing read them — the client redirects to /certificates the moment status is not in_progress
  // — so they were a leak with no reader. `status` is all this route owes about a closed paper.
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
  });
}
