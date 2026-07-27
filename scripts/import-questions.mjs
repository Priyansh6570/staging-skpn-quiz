// Imports design/uploads/quiz-questions.json into the questions collection.
// Idempotent on externalId. Run with: node --experimental-strip-types scripts/import-questions.mjs
//
// Options get stable ids (o1..o4). The source keys the answer by array position, which becomes a
// correctness bug the moment options are shuffled per attempt.

import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.MONGODB_URI) process.loadEnvFile(resolve(ROOT, ".env.local"));

const SOURCE = join(ROOT, "design", "uploads", "quiz-questions.json");
const { questions } = JSON.parse(readFileSync(SOURCE, "utf8"));

// AUDIT.md §5.2: option C is a strict superset of option B, so a careful student who picks B is
// marked wrong for choosing a statement the key itself asserts is true. Retired until rewritten.
const RETIRED = new Set([40]);

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const collection = client.db(process.env.MONGODB_DB ?? "skpn").collection("questions");

const ops = questions.map((q) => {
  if (q.hi.options.length !== q.en.options.length) {
    throw new Error(`q${q.id}: ${q.hi.options.length} hi options vs ${q.en.options.length} en`);
  }
  if (q.answer - 1 !== q.answerIndex) throw new Error(`q${q.id}: answer/answerIndex disagree`);

  const options = q.hi.options.map((hi, i) => ({
    id: `o${i + 1}`,
    text: { hi, en: q.en.options[i] },
  }));

  return {
    updateOne: {
      filter: { externalId: q.id },
      update: {
        $set: {
          externalId: q.id,
          text: { hi: q.hi.question, en: q.en.question },
          options,
          correctOptionId: options[q.answerIndex].id,
          isActive: !RETIRED.has(q.id),
        },
      },
      upsert: true,
    },
  };
});

const result = await collection.bulkWrite(ops, { ordered: false });
const active = await collection.countDocuments({ isActive: true });

console.log(`upserted ${result.upsertedCount}, modified ${result.modifiedCount}, matched ${result.matchedCount}`);
console.log(`${active} active of ${questions.length} imported; retired: ${[...RETIRED].join(", ") || "none"}`);

await client.close();
