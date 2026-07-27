// Idempotent. Run with:  node --experimental-strip-types scripts/ensure-indexes.mjs
// createIndexes is a no-op when an index of the same name and definition already exists; it errors
// if the name exists with a different key, which is the failure you want to see rather than hide.

import { MongoClient } from "mongodb";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTIONS, INDEXES } from "../lib/models/indexes.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.MONGODB_URI) process.loadEnvFile(resolve(ROOT, ".env.local"));

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set");

const client = new MongoClient(uri);
await client.connect();
const db = client.db(process.env.MONGODB_DB ?? "skpn");

const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));

for (const name of COLLECTIONS) {
  if (!existing.has(name)) await db.createCollection(name);
  const collection = db.collection(name);

  const specs = INDEXES[name].map(
    ({ name: indexName, key, unique, partialFilterExpression, expireAfterSeconds }) => ({
      name: indexName,
      key,
      ...(unique ? { unique: true } : {}),
      ...(partialFilterExpression ? { partialFilterExpression } : {}),
      ...(expireAfterSeconds !== undefined ? { expireAfterSeconds } : {}),
    }),
  );
  const created = await collection.createIndexes(specs);

  // Converge, don't just accumulate: an index dropped from INDEXES has to disappear from the
  // database too, or every environment keeps whatever it was given the first time it ran.
  const declared = new Set(specs.map((s) => s.name));
  const stale = (await collection.indexes())
    .map((i) => i.name)
    .filter((i) => i !== "_id_" && !declared.has(i));
  for (const indexName of stale) await collection.dropIndex(indexName);

  console.log(
    `${name}: ${specs.length} ensured -> ${created.join(", ")}` +
      (stale.length ? `  |  dropped: ${stale.join(", ")}` : ""),
  );
}

await client.close();
