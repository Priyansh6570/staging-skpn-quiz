// Index definitions per AUDIT.md §3, adjusted for the final mobile-only auth model.
// No imports: scripts/ensure-indexes.mjs loads this file directly under Node's type stripping.

export type IndexSpec = {
  name: string;
  key: Record<string, 1 | -1>;
  unique?: boolean;
  partialFilterExpression?: Record<string, unknown>;
  expireAfterSeconds?: number;
};

export const COLLECTIONS = [
  "users", "questions", "attempts", "certificates", "authEvents",
  "admins", "adminAuditLog", "pageViews", "visitorDays",
  "otpRequests", "otpCounters", "smsDeliveries", "providerHealth",
] as const;

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
  admins: [
    { name: "username_unique", key: { username: 1 }, unique: true },
  ],
  adminAuditLog: [
    { name: "admin_recent", key: { adminId: 1, at: -1 } },
    { name: "action_recent", key: { action: 1, at: -1 } },
    { name: "retention_ttl", key: { at: 1 }, expireAfterSeconds: 365 * 24 * 60 * 60 },
  ],
  pageViews: [
    { name: "day_path_unique", key: { day: 1, path: 1 }, unique: true },
    { name: "day", key: { day: 1 } },
  ],
  visitorDays: [
    { name: "day_hash_unique", key: { day: 1, hash: 1 }, unique: true },
    { name: "retention_ttl", key: { at: 1 }, expireAfterSeconds: 365 * 24 * 60 * 60 },
  ],
  otpRequests: [
    // Unique, and load-bearing rather than tidiness: it is what makes one live code per number a
    // property of the database instead of a property of the send handler remembering to clean up,
    // and it is what makes the resend gate atomic under two taps at once.
    { name: "mobile_unique", key: { mobile: 1 }, unique: true },
    // expireAfterSeconds 0 means "expire at the time in the field", not "expire immediately".
    { name: "expiry_ttl", key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ],
  otpCounters: [
    { name: "scope_key_bucket_unique", key: { scope: 1, key: 1, bucket: 1 }, unique: true },
    { name: "expiry_ttl", key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ],
  smsDeliveries: [
    // Unique because MSG91 re-posts a report until it gets a 2xx, and a retry must update the row
    // it already wrote rather than add a second one.
    { name: "request_id_unique", key: { requestId: 1 }, unique: true },
    { name: "day_status", key: { day: 1, status: 1 } },
    // Operational data, not an audit trail: 90 days is long past the competition, and the shorter
    // the window the less there is to lose.
    { name: "retention_ttl", key: { sentAt: 1 }, expireAfterSeconds: 90 * 24 * 60 * 60 },
  ],
  providerHealth: [
    { name: "key_unique", key: { key: 1 }, unique: true },
  ],
};
