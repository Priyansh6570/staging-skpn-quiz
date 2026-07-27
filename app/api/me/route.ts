import { ObjectId } from "mongodb";
import { attempts, users } from "@/lib/models";
import { requireSession } from "@/lib/session";
import { errorResponse, fail, json } from "@/lib/api";

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    return errorResponse(error);
  }

  const userId = new ObjectId(session.uid);
  const [usersCollection, attemptsCollection] = await Promise.all([users(), attempts()]);
  const [user, attempt] = await Promise.all([
    usersCollection.findOne({ _id: userId }, { projection: { sessionVersion: 0 } }),
    attemptsCollection.findOne({ userId }, { sort: { submittedAt: -1 } }),
  ]);
  if (!user) return fail(404, "not_found");

  return json({
    fullName: user.fullName,
    mobile: user.mobile,
    email: user.email ?? null,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
    address: user.address,
    category: user.category,
    educationLevel: user.educationLevel,
    institutionName: user.institutionName,
    competitiveExam: user.competitiveExam,
    isDivyang: user.isDivyang,
    preferredLanguage: user.preferredLanguage,
    attemptCount: user.attemptCount ?? 0,
    attempt: attempt
      ? {
          id: String(attempt._id),
          status: attempt.status,
          score: attempt.score ?? null,
          submittedAt: attempt.submittedAt?.toISOString() ?? null,
          timeTakenSeconds: attempt.timeTakenSeconds ?? null,
          answered: attempt.answers.filter((a) => a.selectedOptionId).length,
        }
      : null,
  });
}
