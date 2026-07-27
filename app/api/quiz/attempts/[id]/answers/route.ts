import { ObjectId } from "mongodb";
import { z } from "zod";
import { attempts } from "@/lib/models";
import { requireOwnership, requireSession } from "@/lib/session";
import { GRACE_SECONDS } from "@/lib/quiz";
import { errorResponse, fail, json, sameOrigin } from "@/lib/api";

const Body = z.object({
  changes: z
    .array(
      z.object({
        questionId: z.string().refine(ObjectId.isValid),
        selectedOptionId: z.string().max(16).nullable(),
        clientSeq: z.number().int().nonnegative(),
      }),
    )
    .min(1)
    .max(60),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const attempt = await collection.findOne(
    { _id: attemptId },
    { projection: { userId: 1, status: 1, expiresAt: 1, questionIds: 1 } },
  );
  if (!attempt) return fail(404, "not_found");

  try {
    requireOwnership(session, attempt.userId);
  } catch (error) {
    return errorResponse(error);
  }

  const now = new Date();
  if (attempt.status !== "in_progress") return json({ ok: false, reason: "closed", serverNow: now.toISOString() });
  if (now.getTime() > attempt.expiresAt.getTime() + GRACE_SECONDS * 1000) {
    return json({ ok: false, reason: "expired", serverNow: now.toISOString() });
  }

  const onPaper = new Set(attempt.questionIds.map(String));
  const changes = parsed.data.changes.filter((c) => onPaper.has(c.questionId));
  if (!changes.length) return json({ ok: true, serverNow: now.toISOString() });

  /**
   * Two indexed updates per change, both keyed on _id, and never a read-modify-write of the
   * answers array. The $ne guard on the push is evaluated atomically, so two tabs racing the same
   * question cannot both insert. The clientSeq guard on the $set makes a retry that arrives out of
   * order a no-op rather than a rollback.
   */
  const operations = changes.flatMap((change) => {
    const questionId = new ObjectId(change.questionId);
    return [
      {
        updateOne: {
          filter: { _id: attemptId, status: "in_progress", "answers.questionId": { $ne: questionId } },
          update: {
            $push: {
              answers: {
                questionId,
                selectedOptionId: change.selectedOptionId,
                answeredAt: now,
                clientSeq: change.clientSeq,
              },
            },
          },
        },
      },
      {
        updateOne: {
          filter: { _id: attemptId, status: "in_progress", "answers.questionId": questionId },
          update: {
            $set: {
              "answers.$[slot].selectedOptionId": change.selectedOptionId,
              "answers.$[slot].answeredAt": now,
              "answers.$[slot].clientSeq": change.clientSeq,
            },
          },
          arrayFilters: [{ "slot.questionId": questionId, "slot.clientSeq": { $lt: change.clientSeq } }],
        },
      },
    ];
  });

  await collection.bulkWrite(operations as never, { ordered: false });

  return json({ ok: true, serverNow: now.toISOString() });
}
