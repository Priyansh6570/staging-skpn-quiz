import { ObjectId } from "mongodb";
import { z } from "zod";
import { attempts, users } from "@/lib/models";
import type { Attempt } from "@/lib/models/types";
import { requireSession, setSession } from "@/lib/session";
import { DURATION_SECONDS, TOTAL, drawPaper } from "@/lib/quiz";
import { errorResponse, fail, json, sameOrigin } from "@/lib/api";

const Body = z.object({ rulesAccepted: z.literal(true) });

export async function POST(req: Request) {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    return errorResponse(error);
  }
  if (!sameOrigin(req)) return fail(403, "bad_origin");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "rules_not_accepted");

  const userId = new ObjectId(session.uid);
  const [attemptsCollection, usersCollection] = await Promise.all([attempts(), users()]);

  const existing = await attemptsCollection.findOne(
    { userId },
    { projection: { status: 1, expiresAt: 1 }, sort: { _id: -1 } },
  );
  if (existing) {
    // One attempt ever. An in-progress one is a resume, not a second paper.
    if (existing.status === "in_progress") return json({ attemptId: String(existing._id), resumed: true });
    return fail(409, "already_attempted");
  }

  const profile = await usersCollection.findOne(
    { _id: userId },
    { projection: { district: 1, category: 1, gender: 1, isDivyang: 1, address: 1 } },
  );
  if (!profile) return fail(404, "no_profile");

  const paper = await drawPaper();
  const startedAt = new Date();
  // Written here, never accepted from the client.
  const expiresAt = new Date(startedAt.getTime() + DURATION_SECONDS * 1000);

  const attempt: Omit<Attempt, "_id"> = {
    userId,
    questionIds: paper.questionIds,
    served: paper.served,
    startedAt,
    expiresAt,
    answers: [],
    status: "in_progress",
    district: profile.address?.district ?? "",
    category: profile.category,
    gender: profile.gender,
    isDivyang: profile.isDivyang,
    rulesAcceptedAt: startedAt,
  };

  const { insertedId } = await attemptsCollection.insertOne(attempt as Attempt);

  await Promise.all([
    usersCollection.updateOne({ _id: userId }, { $inc: { attemptCount: 1 }, $set: { updatedAt: startedAt } }),
    setSession({ ...session, attemptCount: session.attemptCount + 1 }),
  ]);

  return json({
    attemptId: String(insertedId),
    questions: paper.payload,
    total: TOTAL,
    serverNow: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
}
