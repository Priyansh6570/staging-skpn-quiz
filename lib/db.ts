import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set");

const dbName = process.env.MONGODB_DB ?? "skpn";

declare global {
  var __skpnMongo: Promise<MongoClient> | undefined;
}

// A client per request exhausts the pool at ~500 concurrent, not 50,000. In development the module
// is re-evaluated on every hot reload, so the connect promise is parked on globalThis instead.
export const clientPromise: Promise<MongoClient> =
  process.env.NODE_ENV === "production"
    ? new MongoClient(uri).connect()
    : (globalThis.__skpnMongo ??= new MongoClient(uri).connect());

export const getDb = async (): Promise<Db> => (await clientPromise).db(dbName);
