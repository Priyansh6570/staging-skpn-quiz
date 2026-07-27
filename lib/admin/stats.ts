import { attempts, authEvents, pageViews, users, visitorDays } from "@/lib/models";
import { en } from "@/lib/i18n";

const CACHE_MS = 60_000;
const DISTRICTS: string[] = en.Register.DISTRICTS.map((d) => d[0]);

export interface DashboardStats {
  generatedAt: string;
  counters: { registrations: number; submitted: number; inProgress: number; lastHour: number };
  splits: {
    category: { key: string; count: number }[];
    gender: { key: string; count: number }[];
    divyang: { key: string; count: number }[];
    educationLevel: { key: string; count: number }[];
  };
  districts: { district: string; count: number }[];
  scores: { histogram: { score: number; count: number }[]; mean: number; median: number; total: number };
  health: { stuckInProgress: number; failedLoginsLastHour: number; malformedLoginsLastHour: number };
  flags: { duplicateMobiles: { value: string; count: number }[]; nameInstitutionClusters: { name: string; institution: string; count: number }[] };
  traffic: { day: string; views: number; visitors: number }[];
}

let cached: { at: number; value: DashboardStats } | null = null;

const countBy = async (
  collection: Awaited<ReturnType<typeof users>>,
  field: string,
): Promise<{ key: string; count: number }[]> => {
  const rows = await collection
    .aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
  return rows.map((r) => ({ key: String(r._id ?? "—"), count: r.count }));
};

async function build(): Promise<DashboardStats> {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const fromDay = thirtyDaysAgo.toISOString().slice(0, 10);

  const [usersCollection, attemptsCollection, authCollection, viewsCollection, visitorsCollection] =
    await Promise.all([users(), attempts(), authEvents(), pageViews(), visitorDays()]);

  const [
    registrations, submitted, inProgress, lastHour,
    category, gender, divyang, educationLevel,
    districtRows, scoreRows, stuckInProgress,
    failedLoginsLastHour, malformedLoginsLastHour,
    duplicateMobiles, nameInstitutionClusters,
    viewRows, visitorRows,
  ] = await Promise.all([
    usersCollection.countDocuments({}),
    attemptsCollection.countDocuments({ status: { $in: ["submitted", "auto_submitted", "expired"] } }),
    attemptsCollection.countDocuments({ status: "in_progress" }),
    usersCollection.countDocuments({ createdAt: { $gte: hourAgo } }),

    countBy(usersCollection, "category"),
    countBy(usersCollection, "gender"),
    countBy(usersCollection, "isDivyang"),
    countBy(usersCollection, "educationLevel"),

    usersCollection.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$address.district", count: { $sum: 1 } } },
    ]).toArray(),

    attemptsCollection.aggregate<{ _id: number; count: number }>([
      { $match: { score: { $ne: null } } },
      { $group: { _id: "$score", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),

    attemptsCollection.countDocuments({ status: "in_progress", expiresAt: { $lt: new Date(now) } }),
    authCollection.countDocuments({ outcome: "unknown_mobile", at: { $gte: hourAgo } }),
    authCollection.countDocuments({ outcome: "malformed_mobile", at: { $gte: hourAgo } }),

    usersCollection.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$mobile", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]).toArray(),

    usersCollection.aggregate<{ _id: { name: string; institution: string }; count: number }>([
      { $group: { _id: { name: "$fullName", institution: "$institutionName" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]).toArray(),

    viewsCollection.aggregate<{ _id: string; views: number }>([
      { $match: { day: { $gte: fromDay } } },
      { $group: { _id: "$day", views: { $sum: "$count" } } },
    ]).toArray(),

    visitorsCollection.aggregate<{ _id: string; visitors: number }>([
      { $match: { day: { $gte: fromDay } } },
      { $group: { _id: "$day", visitors: { $sum: 1 } } },
    ]).toArray(),
  ]);

  // Every district, including the empty ones, ascending — the whole point of the panel is that a
  // district with nobody in it is the first thing on screen.
  const districtCounts = new Map(districtRows.map((r) => [r._id, r.count]));
  const districts = DISTRICTS
    .map((district) => ({ district, count: districtCounts.get(district) ?? 0 }))
    .sort((a, b) => a.count - b.count || a.district.localeCompare(b.district));

  const histogram = Array.from({ length: 31 }, (_, score) => ({
    score,
    count: scoreRows.find((r) => r._id === score)?.count ?? 0,
  }));
  const total = histogram.reduce((sum, h) => sum + h.count, 0);
  const mean = total ? histogram.reduce((sum, h) => sum + h.score * h.count, 0) / total : 0;
  let seen = 0;
  let median = 0;
  for (const h of histogram) {
    seen += h.count;
    if (seen >= total / 2) { median = h.score; break; }
  }

  const viewsByDay = new Map(viewRows.map((r) => [r._id, r.views]));
  const visitorsByDay = new Map(visitorRows.map((r) => [r._id, r.visitors]));
  const traffic = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(now - (29 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return { day, views: viewsByDay.get(day) ?? 0, visitors: visitorsByDay.get(day) ?? 0 };
  });

  return {
    generatedAt: new Date(now).toISOString(),
    counters: { registrations, submitted, inProgress, lastHour },
    splits: { category, gender, divyang, educationLevel },
    districts,
    scores: { histogram, mean: Number(mean.toFixed(2)), median, total },
    health: { stuckInProgress, failedLoginsLastHour, malformedLoginsLastHour },
    flags: {
      duplicateMobiles: duplicateMobiles.map((r) => ({ value: r._id, count: r.count })),
      nameInstitutionClusters: nameInstitutionClusters.map((r) => ({
        name: r._id.name, institution: r._id.institution, count: r.count,
      })),
    },
    traffic,
  };
}

/** Cached for a minute: these are collection scans and the page must not run one per load. */
export async function dashboardStats(): Promise<DashboardStats> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const value = await build();
  cached = { at: Date.now(), value };
  return value;
}
