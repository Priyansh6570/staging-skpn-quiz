import { ObjectId } from "mongodb";
import { attempts, users } from "@/lib/models";
import { SAT_STATUSES } from "@/lib/models/types";
import { requireSession } from "@/lib/session";
import { profileDetail } from "@/lib/serialize";
import { errorResponse, fail, json } from "@/lib/api";

/**
 * The profile page's own endpoint. The body is exactly what `profileDetail` names — it used to be
 * the whole user document plus the whole attempt, including the score, on every profile load.
 */
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
    usersCollection.findOne({ _id: userId }),
    // Papers actually sat. SAT_STATUSES is the one definition; /quiz and the attempt gate resolve
    // on the same rule.
    attemptsCollection.findOne({ userId, status: { $in: SAT_STATUSES } }, { sort: { submittedAt: -1 } }),
  ]);
  if (!user) return fail(404, "not_found");

  return json(profileDetail(user, attempt));
}
