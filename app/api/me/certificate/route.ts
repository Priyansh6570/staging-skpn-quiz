import { ObjectId } from "mongodb";
import { attempts, users } from "@/lib/models";
import { SAT_STATUSES } from "@/lib/models/types";
import { requireSession } from "@/lib/session";
import { certificateIdentity } from "@/lib/serialize";
import { errorResponse, fail, json } from "@/lib/api";

/**
 * The certificate page's own endpoint: the four things printed on the certificate. It exists so
 * that page stops pulling the entire profile — it needed a name, and was served the whole record.
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
    attemptsCollection.findOne({ userId, status: { $in: SAT_STATUSES } }, { sort: { submittedAt: -1 } }),
  ]);
  if (!user) return fail(404, "not_found");

  return json(certificateIdentity(user, attempt));
}
