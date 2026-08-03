import { attempts, users } from "@/lib/models";
import { en } from "@/lib/i18n";
import { districts as districtStats, integrity, overview } from "@/lib/admin/queries";

/** Synchronous generation holds the whole workbook in memory; past this it needs a job queue. */
export const SYNC_ROW_LIMIT = 50_000;

const DISTRICT_LABEL = new Map(en.Register.DISTRICTS.map((d) => [d[0], d[0]]));

type Sheet = { name: string; header: string[]; rows: (string | number)[][] };

const iso = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/**
 * Counts only. Every sheet here is an aggregate, so there is nothing in this workbook that could
 * identify a student and it can be circulated without a password.
 */
export async function buildCountsSheets(): Promise<Sheet[]> {
  const [stats, districtRows, usersCollection] = await Promise.all([overview(), districtStats(), users()]);

  const [category, gender] = await Promise.all([
    usersCollection.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } },
    ]).toArray(),
    usersCollection.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$gender", count: { $sum: 1 } } }, { $sort: { count: -1 } },
    ]).toArray(),
  ]);

  const daily = await usersCollection
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return [
    {
      name: "District Summary",
      header: ["District", "Registrations"],
      rows: districtRows.rows.map((d) => [d.district, d.registrations]),
    },
    {
      name: "Category Summary",
      header: ["Category", "Registrations"],
      rows: category.map((c) => [String(c._id ?? "-"), c.count]),
    },
    {
      name: "Gender Summary",
      header: ["Gender", "Registrations"],
      rows: gender.map((g) => [String(g._id ?? "-"), g.count]),
    },
    {
      name: "Score Distribution",
      header: ["Score", "Attempts"],
      rows: stats.scores.histogram.map((h) => [h.score, h.count]),
    },
    {
      name: "Daily Registrations",
      header: ["Date", "Registrations"],
      rows: daily.map((d) => [d._id, d.count]),
    },
  ];
}

interface ParticipantRow {
  fullName: string;
  mobile: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  district: string;
  cityVillage: string;
  pincode: string;
  category: string;
  educationLevel: string;
  institutionName: string;
  competitiveExam: string;
  isDivyang: string;
  registeredOn: string;
  score: string | number;
  attemptStatus: string;
  submittedAt: string;
}

const PARTICIPANT_HEADER = [
  "Full name", "Mobile", "Email", "Gender", "Date of birth", "District", "City or village",
  "PIN", "Category", "Education level", "Institution", "Competitive exam", "Divyang",
  "Registered on", "Score", "Attempt status", "Submitted on",
];

const toRow = (p: ParticipantRow): (string | number)[] => [
  p.fullName, p.mobile, p.email, p.gender, p.dateOfBirth, p.district, p.cityVillage, p.pincode,
  p.category, p.educationLevel, p.institutionName, p.competitiveExam, p.isDivyang,
  p.registeredOn, p.score, p.attemptStatus, p.submittedAt,
];

/**
 * Explicit field-by-field construction. No spread of a Mongo document anywhere in this file — the
 * user row also carries consents, sessionVersion and internal ids that must never reach a
 * spreadsheet sitting in someone's inbox.
 */
export async function buildParticipantRows(): Promise<{ rows: ParticipantRow[]; truncated: boolean }> {
  const [usersCollection, attemptsCollection] = await Promise.all([users(), attempts()]);

  const docs = await usersCollection
    .find(
      {},
      {
        projection: {
          fullName: 1, mobile: 1, email: 1, gender: 1, dateOfBirth: 1, address: 1, category: 1,
          educationLevel: 1, institutionName: 1, competitiveExam: 1, isDivyang: 1, createdAt: 1,
        },
        sort: { createdAt: 1 },
        limit: SYNC_ROW_LIMIT + 1,
      },
    )
    .toArray();

  const truncated = docs.length > SYNC_ROW_LIMIT;
  const page = truncated ? docs.slice(0, SYNC_ROW_LIMIT) : docs;

  const attemptRows = await attemptsCollection
    .find(
      { userId: { $in: page.map((u) => u._id) } },
      { projection: { userId: 1, score: 1, status: 1, submittedAt: 1 } },
    )
    .toArray();
  const byUser = new Map(attemptRows.map((a) => [String(a.userId), a]));

  const rows = page.map((u) => {
    const attempt = byUser.get(String(u._id));
    return {
      fullName: u.fullName ?? "",
      mobile: u.mobile ?? "",
      email: u.email ?? "",
      gender: u.gender ?? "",
      dateOfBirth: iso(u.dateOfBirth),
      district: DISTRICT_LABEL.get(u.address?.district ?? "") ?? u.address?.district ?? "",
      cityVillage: u.address?.cityVillage ?? "",
      pincode: u.address?.pincode ?? "",
      category: u.category ?? "",
      educationLevel: u.educationLevel ?? "",
      institutionName: u.institutionName ?? "",
      competitiveExam: u.competitiveExam ?? "",
      isDivyang: u.isDivyang ? "Yes" : "No",
      registeredOn: iso(u.createdAt),
      score: attempt?.score ?? "",
      attemptStatus: attempt?.status ?? "not attempted",
      submittedAt: iso(attempt?.submittedAt),
    };
  });

  return { rows, truncated };
}

export async function buildFullSheets(): Promise<{ sheets: Sheet[]; rowCount: number; truncated: boolean }> {
  const [{ rows, truncated }, flags] = await Promise.all([buildParticipantRows(), integrity()]);

  const flaggedMobiles = new Set(flags.duplicateMobiles.map((d) => d.mobile));
  const flaggedClusters = new Set(
    flags.nameInstitutionClusters.map((c) => `${c.name} ${c.institution}`),
  );

  const sheets: Sheet[] = [
    { name: "All Participants", header: PARTICIPANT_HEADER, rows: rows.map(toRow) },
    {
      name: "Vidyalaya",
      header: PARTICIPANT_HEADER,
      rows: rows.filter((r) => r.category === "vidyalaya").map(toRow),
    },
    {
      name: "Mahavidyalaya",
      header: PARTICIPANT_HEADER,
      rows: rows.filter((r) => r.category === "mahavidyalaya").map(toRow),
    },
    {
      name: "District-wise",
      header: ["District", ...PARTICIPANT_HEADER],
      rows: [...rows]
        .sort((a, b) => a.district.localeCompare(b.district))
        .map((r) => [r.district, ...toRow(r)]),
    },
    {
      name: "Divyang",
      header: PARTICIPANT_HEADER,
      rows: rows.filter((r) => r.isDivyang === "Yes").map(toRow),
    },
    {
      name: "Flagged Duplicates",
      header: ["Reason", ...PARTICIPANT_HEADER],
      rows: rows
        .filter((r) => flaggedMobiles.has(r.mobile) || flaggedClusters.has(`${r.fullName} ${r.institutionName}`))
        .map((r) => [
          flaggedMobiles.has(r.mobile) ? "duplicate mobile" : "same name, same institution",
          ...toRow(r),
        ]),
    },
  ];

  return { sheets, rowCount: rows.length, truncated };
}

/** xlsx-populate writes real AES encryption, not sheet protection, which strips in seconds. */
export async function writeWorkbook(sheets: Sheet[], password?: string): Promise<Buffer> {
  const XlsxPopulate = (await import("xlsx-populate")).default;
  const workbook = await XlsxPopulate.fromBlankAsync();

  sheets.forEach((sheet, index) => {
    const target = index === 0 ? workbook.sheet(0).name(sheet.name) : workbook.addSheet(sheet.name);
    sheet.header.forEach((label, column) => {
      target.cell(1, column + 1).value(label).style({ bold: true });
    });
    sheet.rows.forEach((row, rowIndex) => {
      row.forEach((value, column) => target.cell(rowIndex + 2, column + 1).value(value));
    });
    target.freezePanes(0, 1);
  });

  return workbook.outputAsync(password ? { password } : undefined) as Promise<Buffer>;
}
