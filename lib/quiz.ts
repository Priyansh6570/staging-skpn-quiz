import { ObjectId } from "mongodb";
import { questions } from "@/lib/models";
import { PUBLIC_QUESTION_PROJECTION, type PublicQuestion } from "@/lib/models/types";

export const TOTAL = 30;
export const DURATION_SECONDS = 600;
/** Absorbs a slow round trip on rural 4G rather than losing a paper to a 3-second request. */
export const GRACE_SECONDS = 15;

declare global {
  var __skpnBank: { questions: PublicQuestion[]; key: Map<string, string>; loadedAt: number } | undefined;
}

/**
 * The bank is 49 active questions and immutable during the competition, so it is held in process
 * and drawn from there. $sample on the attempt-start path would put a collection scan under the
 * 00:00 thundering herd.
 *
 * The answer key is loaded here too but into a separate map that no response ever reaches — the
 * question documents themselves are read through PUBLIC_QUESTION_PROJECTION and never carry it.
 */
async function bank() {
  if (globalThis.__skpnBank) return globalThis.__skpnBank;

  const collection = await questions();
  const [pool, keyRows] = await Promise.all([
    collection.find({ isActive: true }, { projection: PUBLIC_QUESTION_PROJECTION }).toArray(),
    collection.find({ isActive: true }, { projection: { correctOptionId: 1 } }).toArray(),
  ]);

  const loaded = {
    questions: pool as PublicQuestion[],
    key: new Map(keyRows.map((r) => [String(r._id), r.correctOptionId])),
    loadedAt: Date.now(),
  };
  globalThis.__skpnBank = loaded;
  return loaded;
}

export const refreshBank = () => {
  globalThis.__skpnBank = undefined;
};

export interface ServedPaper {
  questionIds: ObjectId[];
  served: { questionId: ObjectId; optionIds: string[] }[];
  payload: {
    id: string;
    text: { hi: string; en: string };
    options: { id: string; text: { hi: string; en: string } }[];
  }[];
}

const shuffle = <T>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export async function drawPaper(): Promise<ServedPaper> {
  const { questions: pool } = await bank();
  const drawn = shuffle(pool).slice(0, Math.min(TOTAL, pool.length));

  const questionIds: ObjectId[] = [];
  const served: ServedPaper["served"] = [];
  const payload: ServedPaper["payload"] = [];

  for (const q of drawn) {
    const options = shuffle(q.options);
    questionIds.push(q._id);
    served.push({ questionId: q._id, optionIds: options.map((o) => o.id) });
    payload.push({ id: String(q._id), text: q.text, options: options.map((o) => ({ id: o.id, text: o.text })) });
  }
  return { questionIds, served, payload };
}

/** Rebuilds the paper a student was actually served, in the order it was served. */
export async function replayPaper(served: { questionId: ObjectId; optionIds: string[] }[]) {
  const { questions: pool } = await bank();
  const byId = new Map(pool.map((q) => [String(q._id), q]));

  return served.flatMap((s) => {
    const q = byId.get(String(s.questionId));
    if (!q) return [];
    const byOption = new Map(q.options.map((o) => [o.id, o]));
    return [{
      id: String(q._id),
      text: q.text,
      options: s.optionIds.flatMap((id) => {
        const option = byOption.get(id);
        return option ? [{ id: option.id, text: option.text }] : [];
      }),
    }];
  });
}

export async function scoreAnswers(
  answers: { questionId: ObjectId; selectedOptionId: string | null }[],
): Promise<number> {
  const { key } = await bank();
  return answers.reduce(
    (score, a) => (a.selectedOptionId && key.get(String(a.questionId)) === a.selectedOptionId ? score + 1 : score),
    0,
  );
}
