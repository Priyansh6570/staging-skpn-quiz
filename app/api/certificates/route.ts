import { ObjectId } from "mongodb";
import { attempts, certificates } from "@/lib/models";
import { requireSession } from "@/lib/session";
import { errorResponse, json } from "@/lib/api";

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    return errorResponse(error);
  }

  const userId = new ObjectId(session.uid);
  const [certificatesCollection, attemptsCollection] = await Promise.all([certificates(), attempts()]);
  const rows = await certificatesCollection.find({ userId, revokedAt: { $exists: false } }).sort({ issuedAt: -1 }).toArray();
  const related = await attemptsCollection
    .find({ _id: { $in: rows.map((r) => r.attemptId) } }, { projection: { score: 1, submittedAt: 1 } })
    .toArray();
  const byAttempt = new Map(related.map((a) => [String(a._id), a]));

  return json(
    rows.map((r) => ({
      id: String(r._id),
      attemptId: String(r.attemptId),
      certificateNumber: r.certificateNumber,
      issuedAt: r.issuedAt.toISOString(),
      score: byAttempt.get(String(r.attemptId))?.score ?? null,
    })),
  );
}
