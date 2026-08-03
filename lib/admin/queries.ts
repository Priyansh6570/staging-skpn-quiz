import type { Filter } from "mongodb";
import {
  adminAuditLog, attempts, authEvents, otpCounters, pageViews, providerHealth, smsDeliveries,
  users, visitorDays,
} from "@/lib/models";
import type { User } from "@/lib/models/types";
import { en } from "@/lib/i18n";
import { cached } from "@/lib/admin/cache";
import { globalDailyCap } from "@/lib/otp";

export const DISTRICTS: string[] = en.Register.DISTRICTS.map((d) => d[0]);
const CLOSED = ["submitted", "auto_submitted", "expired"] as const;

const day = (d: Date) => d.toISOString().slice(0, 10);
const iso = (d?: Date | null) => (d ? d.toISOString() : null);

// --- overview -----------------------------------------------------------------------------------

export interface Overview {
  generatedAt: string;
  counters: {
    registrations: number; registrationsPrevDay: number;
    submitted: number; inProgress: number; lastHour: number; prevHour: number;
  };
  scores: { histogram: { score: number; count: number }[]; mean: number; median: number; total: number };
  sparkline: { day: string; views: number }[];
  zeroDistricts: string[];
}

export const overview = () => cached<Overview>("overview", async () => {
  const now = Date.now();
  const hourAgo = new Date(now - 3_600_000);
  const twoHoursAgo = new Date(now - 7_200_000);
  const dayAgo = new Date(now - 86_400_000);
  const from = day(new Date(now - 13 * 86_400_000));

  const [usersCollection, attemptsCollection, viewsCollection] =
    await Promise.all([users(), attempts(), pageViews()]);

  const [registrations, registrationsPrevDay, submitted, inProgress, lastHour, prevHour, scoreRows, districtRows, viewRows] =
    await Promise.all([
      usersCollection.countDocuments({}),
      usersCollection.countDocuments({ createdAt: { $lt: dayAgo } }),
      attemptsCollection.countDocuments({ status: { $in: CLOSED } }),
      attemptsCollection.countDocuments({ status: "in_progress" }),
      usersCollection.countDocuments({ createdAt: { $gte: hourAgo } }),
      usersCollection.countDocuments({ createdAt: { $gte: twoHoursAgo, $lt: hourAgo } }),
      attemptsCollection.aggregate<{ _id: number; count: number }>([
        { $match: { score: { $ne: null } } },
        { $group: { _id: "$score", count: { $sum: 1 } } },
      ]).toArray(),
      usersCollection.aggregate<{ _id: string }>([
        { $group: { _id: "$address.district" } },
      ]).toArray(),
      viewsCollection.aggregate<{ _id: string; views: number }>([
        { $match: { day: { $gte: from } } },
        { $group: { _id: "$day", views: { $sum: "$count" } } },
      ]).toArray(),
    ]);

  const histogram = Array.from({ length: 31 }, (_, score) => ({
    score, count: scoreRows.find((r) => r._id === score)?.count ?? 0,
  }));
  const total = histogram.reduce((sum, h) => sum + h.count, 0);
  const mean = total ? histogram.reduce((sum, h) => sum + h.score * h.count, 0) / total : 0;
  let seen = 0;
  let median = 0;
  for (const h of histogram) {
    seen += h.count;
    if (seen >= total / 2) { median = h.score; break; }
  }

  const present = new Set(districtRows.map((r) => r._id));
  const byDay = new Map(viewRows.map((r) => [r._id, r.views]));

  return {
    generatedAt: new Date(now).toISOString(),
    counters: { registrations, registrationsPrevDay, submitted, inProgress, lastHour, prevHour },
    scores: { histogram, mean: Number(mean.toFixed(2)), median, total },
    sparkline: Array.from({ length: 14 }, (_, i) => {
      const d = day(new Date(now - (13 - i) * 86_400_000));
      return { day: d, views: byDay.get(d) ?? 0 };
    }),
    zeroDistricts: DISTRICTS.filter((d) => !present.has(d)),
  };
});

// --- districts ----------------------------------------------------------------------------------

export interface DistrictRow {
  district: string; registrations: number; submitted: number; share: number;
}

export const districts = () => cached<{ generatedAt: string; rows: DistrictRow[]; total: number }>("districts", async () => {
  const [usersCollection, attemptsCollection] = await Promise.all([users(), attempts()]);
  const [regRows, subRows] = await Promise.all([
    usersCollection.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$address.district", count: { $sum: 1 } } },
    ]).toArray(),
    attemptsCollection.aggregate<{ _id: string; count: number }>([
      { $match: { status: { $in: CLOSED } } },
      { $group: { _id: "$district", count: { $sum: 1 } } },
    ]).toArray(),
  ]);

  const reg = new Map(regRows.map((r) => [r._id, r.count]));
  const sub = new Map(subRows.map((r) => [r._id, r.count]));
  const total = [...reg.values()].reduce((a, b) => a + b, 0);

  const rows = DISTRICTS.map((district) => {
    const registrations = reg.get(district) ?? 0;
    return {
      district,
      registrations,
      submitted: sub.get(district) ?? 0,
      share: total ? Number(((registrations / total) * 100).toFixed(1)) : 0,
    };
  }).sort((a, b) => a.registrations - b.registrations || a.district.localeCompare(b.district));

  return { generatedAt: new Date().toISOString(), rows, total };
});

// --- integrity ----------------------------------------------------------------------------------

export interface Integrity {
  generatedAt: string;
  duplicateMobiles: { mobile: string; count: number }[];
  nameInstitutionClusters: { name: string; institution: string; district: string; count: number }[];
}

export const integrity = () => cached<Integrity>("integrity", async () => {
  const usersCollection = await users();
  const [mobiles, clusters] = await Promise.all([
    usersCollection.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$mobile", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 200 },
    ]).toArray(),
    usersCollection.aggregate<{ _id: { name: string; institution: string; district: string }; count: number }>([
      {
        $group: {
          _id: { name: "$fullName", institution: "$institutionName", district: "$address.district" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 200 },
    ]).toArray(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    duplicateMobiles: mobiles.map((m) => ({ mobile: m._id, count: m.count })),
    nameInstitutionClusters: clusters.map((c) => ({
      name: c._id.name, institution: c._id.institution, district: c._id.district ?? "", count: c.count,
    })),
  };
});

// --- operations ---------------------------------------------------------------------------------

export interface Operations {
  generatedAt: string;
  stuckInProgress: number;
  oldestStuckAt: string | null;
  signIn: { success: number; unknownMobile: number; malformed: number; rateLimited: number };
  topSignInIps: { ip: string; attempts: number }[];
  sweeper: { lastRunAt: string | null; runsLast24h: number };
  sms: {
    /** Today, UTC, matching the buckets the caps are enforced in. */
    sentToday: number;
    deliveredToday: number;
    failedToday: number;
    pendingToday: number;
    sendFailuresToday: number;
    balance: {
      /** null when the poller has never run — which is itself the thing to report. */
      credits: number | null;
      ok: boolean;
      detail: string;
      checkedAt: string | null;
      belowThreshold: boolean;
    };
    circuit: { used: number; cap: number; open: boolean };
  };
}

export const operations = () => cached<Operations>("operations", async () => {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3_600_000);
  const dayAgo = new Date(now.getTime() - 86_400_000);

  const today = day(now);

  const [attemptsCollection, authCollection, auditCollection, deliveryCollection, healthCollection, counterCollection] =
    await Promise.all([attempts(), authEvents(), adminAuditLog(), smsDeliveries(), providerHealth(), otpCounters()]);

  const [
    stuckInProgress, oldest, success, unknownMobile, malformed, rateLimited, topIps, lastSweep, runsLast24h,
    deliveryRows, sendFailuresToday, balanceRow, globalCounter,
  ] =
    await Promise.all([
      attemptsCollection.countDocuments({ status: "in_progress", expiresAt: { $lt: now } }),
      attemptsCollection.findOne(
        { status: "in_progress", expiresAt: { $lt: now } },
        { projection: { expiresAt: 1 }, sort: { expiresAt: 1 } },
      ),
      authCollection.countDocuments({ outcome: "success", at: { $gte: hourAgo } }),
      authCollection.countDocuments({ outcome: "unknown_mobile", at: { $gte: hourAgo } }),
      authCollection.countDocuments({ outcome: "malformed_mobile", at: { $gte: hourAgo } }),
      authCollection.countDocuments({ outcome: "rate_limited", at: { $gte: hourAgo } }),
      authCollection.aggregate<{ _id: string; attempts: number }>([
        { $match: { at: { $gte: dayAgo }, outcome: { $in: ["unknown_mobile", "malformed_mobile", "rate_limited"] } } },
        { $group: { _id: "$ip", attempts: { $sum: 1 } } },
        { $sort: { attempts: -1 } },
        { $limit: 10 },
      ]).toArray(),
      auditCollection.findOne({ action: "system.sweep" }, { projection: { at: 1 }, sort: { at: -1 } }),
      auditCollection.countDocuments({ action: "system.sweep", at: { $gte: dayAgo } }),
      deliveryCollection.aggregate<{ _id: string; n: number }>([
        { $match: { day: today } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]).toArray(),
      // A send MSG91 never accepted has no request_id and so no delivery row. It belongs in the
      // same picture: it is a message the student did not get either.
      authCollection.countDocuments({ outcome: "otp_send_failed", at: { $gte: new Date(`${today}T00:00:00.000Z`) } }),
      healthCollection.findOne({ key: "msg91_balance" }),
      counterCollection.findOne({ scope: "global", key: "all", bucket: today }),
    ]);

  const byStatus = new Map(deliveryRows.map((r) => [r._id, r.n]));
  const statusCount = (status: string) => byStatus.get(status) ?? 0;
  const cap = globalDailyCap();
  const used = globalCounter?.count ?? 0;

  return {
    generatedAt: now.toISOString(),
    stuckInProgress,
    oldestStuckAt: iso(oldest?.expiresAt),
    signIn: { success, unknownMobile, malformed, rateLimited },
    topSignInIps: topIps.map((r) => ({ ip: r._id, attempts: r.attempts })),
    sweeper: { lastRunAt: iso(lastSweep?.at), runsLast24h },
    sms: {
      sentToday: deliveryRows.reduce((total, r) => total + r.n, 0),
      deliveredToday: statusCount("delivered"),
      // "unknown" is a report whose status this build could not map, not a delivery. Counted with
      // the failures so it is visible rather than quietly assumed good.
      failedToday: statusCount("failed") + statusCount("unknown"),
      pendingToday: statusCount("pending"),
      sendFailuresToday,
      balance: {
        credits: balanceRow ? balanceRow.credits : null,
        ok: balanceRow?.ok ?? false,
        detail: balanceRow?.detail ?? "",
        checkedAt: iso(balanceRow?.checkedAt),
        belowThreshold: balanceRow?.belowThreshold ?? false,
      },
      circuit: { used, cap, open: used > cap },
    },
  };
});

// --- traffic ------------------------------------------------------------------------------------

export interface Traffic {
  generatedAt: string;
  days: { day: string; views: number; visitors: number }[];
  topPaths: { path: string; views: number }[];
  totals: { views: number; visitors: number };
}

export async function traffic(fromDay: string, toDay: string): Promise<Traffic> {
  return cached<Traffic>(`traffic:${fromDay}:${toDay}`, async () => {
    const [viewsCollection, visitorsCollection] = await Promise.all([pageViews(), visitorDays()]);
    const range = { $gte: fromDay, $lte: toDay };

    const [viewRows, visitorRows, pathRows] = await Promise.all([
      viewsCollection.aggregate<{ _id: string; views: number }>([
        { $match: { day: range } },
        { $group: { _id: "$day", views: { $sum: "$count" } } },
      ]).toArray(),
      visitorsCollection.aggregate<{ _id: string; visitors: number }>([
        { $match: { day: range } },
        { $group: { _id: "$day", visitors: { $sum: 1 } } },
      ]).toArray(),
      viewsCollection.aggregate<{ _id: string; views: number }>([
        { $match: { day: range } },
        { $group: { _id: "$path", views: { $sum: "$count" } } },
        { $sort: { views: -1 } },
        { $limit: 12 },
      ]).toArray(),
    ]);

    const views = new Map(viewRows.map((r) => [r._id, r.views]));
    const visitors = new Map(visitorRows.map((r) => [r._id, r.visitors]));

    const days: Traffic["days"] = [];
    for (let d = new Date(`${fromDay}T00:00:00Z`); day(d) <= toDay; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = day(d);
      days.push({ day: key, views: views.get(key) ?? 0, visitors: visitors.get(key) ?? 0 });
      if (days.length > 400) break;
    }

    return {
      generatedAt: new Date().toISOString(),
      days,
      topPaths: pathRows.map((r) => ({ path: r._id, views: r.views })),
      totals: {
        views: days.reduce((a, b) => a + b.views, 0),
        visitors: days.reduce((a, b) => a + b.visitors, 0),
      },
    };
  });
}

// --- participants -------------------------------------------------------------------------------

export interface ParticipantQuery {
  page: number;
  search: string;
  district: string;
  category: string;
  gender: string;
  divyang: string;
  sort: string;
  direction: 1 | -1;
}

export interface ParticipantListRow {
  id: string;
  name: string;
  district: string;
  category: string;
  score: number | null;
  attemptAt: string | null;
  status: string;
}

export const PAGE_SIZE = 50;
const USER_SORTS: Record<string, string> = {
  name: "fullName", district: "address.district", category: "category", registered: "createdAt",
};

/**
 * Server-side in full: the filter, the sort, the count and the slice all run in Mongo, and only one
 * page of whitelisted fields is serialised. Nothing here can return five lakh rows.
 */
export async function participants(query: ParticipantQuery): Promise<{
  rows: ParticipantListRow[]; total: number; page: number; pageSize: number; sortedByAttempt: boolean;
}> {
  const [usersCollection, attemptsCollection] = await Promise.all([users(), attempts()]);

  const filter: Filter<User> = {};
  if (query.search.trim()) {
    // Escaped: an admin typing a bracket must not become a regex the database has to reason about.
    filter.fullName = { $regex: query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }
  if (query.district) filter["address.district"] = query.district;
  if (query.category) filter.category = query.category as User["category"];
  if (query.gender) filter.gender = query.gender as User["gender"];
  if (query.divyang) filter.isDivyang = query.divyang === "yes";

  const total = await usersCollection.countDocuments(filter);
  const page = Math.max(1, Math.min(query.page, Math.max(1, Math.ceil(total / PAGE_SIZE))));
  const skip = (page - 1) * PAGE_SIZE;

  const userSort = USER_SORTS[query.sort];
  const sortedByAttempt = !userSort;

  // Sorting on a user field pages before the join, which keeps the slice indexed. Sorting on score
  // or attempt date cannot: the value lives in the other collection.
  const pipeline: object[] = [{ $match: filter }];
  if (userSort) {
    pipeline.push({ $sort: { [userSort]: query.direction, _id: 1 } }, { $skip: skip }, { $limit: PAGE_SIZE });
  }
  pipeline.push(
    {
      $lookup: {
        from: "attempts",
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          { $sort: { submittedAt: -1 } },
          { $limit: 1 },
          { $project: { score: 1, status: 1, submittedAt: 1 } },
        ],
        as: "attempt",
      },
    },
    { $unwind: { path: "$attempt", preserveNullAndEmptyArrays: true } },
  );
  if (!userSort) {
    const key = query.sort === "score" ? "attempt.score" : "attempt.submittedAt";
    pipeline.push({ $sort: { [key]: query.direction, _id: 1 } }, { $skip: skip }, { $limit: PAGE_SIZE });
  }
  pipeline.push({
    $project: {
      fullName: 1, category: 1, "address.district": 1,
      "attempt.score": 1, "attempt.status": 1, "attempt.submittedAt": 1,
    },
  });

  const docs = await usersCollection.aggregate<{
    _id: unknown;
    fullName?: string;
    category?: string;
    address?: { district?: string };
    attempt?: { score?: number; status?: string; submittedAt?: Date };
  }>(pipeline, { allowDiskUse: true }).toArray();

  // Field by field. The user document also holds mobile, date of birth, address and consents.
  const rows: ParticipantListRow[] = docs.map((d) => ({
    id: String(d._id),
    name: d.fullName ?? "",
    district: d.address?.district ?? "",
    category: d.category ?? "",
    score: d.attempt?.score ?? null,
    attemptAt: iso(d.attempt?.submittedAt),
    status: d.attempt?.status ?? "not attempted",
  }));

  void attemptsCollection;
  return { rows, total, page, pageSize: PAGE_SIZE, sortedByAttempt };
}

// --- export history -----------------------------------------------------------------------------

export interface ExportRow {
  at: string; username: string; action: string; target: string; ip: string;
}

export const exportHistory = () => cached<{ generatedAt: string; rows: ExportRow[] }>("exportHistory", async () => {
  const collection = await adminAuditLog();
  const docs = await collection
    .find({ action: { $in: ["admin.export.counts", "admin.export.full"] } }, {
      projection: { at: 1, username: 1, action: 1, target: 1, ip: 1 },
      sort: { at: -1 },
      limit: 100,
    })
    .toArray();

  return {
    generatedAt: new Date().toISOString(),
    rows: docs.map((d) => ({
      at: d.at.toISOString(), username: d.username, action: d.action, target: d.target, ip: d.ip,
    })),
  };
});
