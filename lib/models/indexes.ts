// Index definitions per AUDIT.md §3, adjusted for the final mobile-only auth model.
// No imports: scripts/ensure-indexes.mjs loads this file directly under Node's type stripping.

export type IndexSpec = {
  name: string;
  key: Record<string, 1 | -1>;
  unique?: boolean;
  partialFilterExpression?: Record<string, unknown>;
  expireAfterSeconds?: number;
};

export const COLLECTIONS = ["users", "questions", "attempts", "certificates", "authEvents"] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

export const INDEXES: Record<CollectionName, IndexSpec[]> = {
  users: [
    { name: "mobile_unique", key: { mobile: 1 }, unique: true },
    // AUDIT.md §3.1 writes the partial filter as { $exists: true, $ne: null }; $ne is not a legal
    // partialFilterExpression operator, so the equivalent $type check is used instead.
    {
      name: "email_unique_partial",
      key: { email: 1 },
      unique: true,
      partialFilterExpression: { email: { $type: "string" } },
    },
    {
      name: "merit_list",
      key: { category: 1, district: 1, gender: 1, bestScore: -1, bestAttemptAt: 1 },
    },
    {
      name: "merit_list_divyang",
      key: { isDivyang: 1, category: 1, district: 1, bestScore: -1 },
      partialFilterExpression: { isDivyang: true },
    },
    { name: "registration_purge", key: { registrationStatus: 1, createdAt: 1 } },
    { name: "created_at", key: { createdAt: 1 } },
  ],
  questions: [
    { name: "draw_pool", key: { isActive: 1 } },
    { name: "external_id_unique", key: { externalId: 1 }, unique: true },
  ],
  attempts: [
    { name: "user_status", key: { userId: 1, status: 1 } },
    { name: "user_best", key: { userId: 1, score: -1, submittedAt: 1 } },
    {
      name: "sweeper",
      key: { status: 1, expiresAt: 1 },
      partialFilterExpression: { status: "in_progress" },
    },
  ],
  certificates: [
    { name: "certificate_number_unique", key: { certificateNumber: 1 }, unique: true },
    { name: "user_issued", key: { userId: 1, issuedAt: -1 } },
    { name: "attempt_unique", key: { attemptId: 1 }, unique: true },
  ],
  authEvents: [
    { name: "mobile_recent", key: { mobile: 1, at: -1 } },
    { name: "ip_recent", key: { ip: 1, at: -1 } },
    // Holds the mobile number and IP of accounts that are mostly minors. 365 days.
    { name: "retention_ttl", key: { at: 1 }, expireAfterSeconds: 365 * 24 * 60 * 60 },
  ],
};
