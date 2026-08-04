import { ObjectId } from "mongodb";
import { certificates } from "@/lib/models";
import { requireSession } from "@/lib/session";
import { certificateRow } from "@/lib/serialize";
import { errorResponse, json } from "@/lib/api";

/**
 * The student's own certificates. It used to join each row back to its attempt to attach the score,
 * which nothing rendered — the certificate page reads a name and an image. The join is gone with it.
 */
export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    return errorResponse(error);
  }

  const collection = await certificates();
  const rows = await collection
    .find({ userId: new ObjectId(session.uid), revokedAt: { $exists: false } })
    .sort({ issuedAt: -1 })
    .toArray();

  return json(rows.map(certificateRow));
}
