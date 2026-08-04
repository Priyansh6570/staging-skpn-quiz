import type { ObjectId } from "mongodb";

export type Lang = "hi" | "en";
export type Gender = "male" | "female" | "other";
export type Category = "vidyalaya" | "mahavidyalaya";
export type RegistrationStatus = "incomplete" | "complete";

export const MOBILE_RE = /^[6-9]\d{9}$/;

export interface LocalisedText {
  hi: string;
  en: string;
}

// --- users -----------------------------------------------------------------------------------

export interface Address {
  line: string;
  cityVillage: string;
  /** English key, e.g. "Sehore". The Hindi label is derived at render. */
  district: string;
  state: "MP";
  pincode: string;
}

export interface GuardianConsent {
  name: string;
  mobile?: string;
  statementVersion: string;
  acceptedAt: Date;
}

export interface Consents {
  rulesAcceptedAt?: Date;
  privacyAcceptedAt?: Date;
  guardian?: GuardianConsent;
}

export interface User {
  _id: ObjectId;
  /** The account identifier. MOBILE_RE, unique index. There is no credential beside it. */
  mobile: string;
  email?: string;
  fullName: string;
  gender: Gender;
  /** Required: DPDP minor status cannot be determined without it, and the guardian gate depends on it. */
  dateOfBirth: Date;
  address: Address;
  category: Category;
  /** Stable key, never the localised label — a merit list cannot group on "कक्षा 10" and "Class 10". */
  educationLevel: string;
  institutionName: string;
  competitiveExam: string | null;
  isDivyang: boolean;
  preferredLanguage: Lang;
  consents: Consents;
  registrationStatus: RegistrationStatus;
  /**
   * Bumped on sign-out, which invalidates every cookie already issued to this account on every
   * device. A stateless signed cookie is otherwise unrevocable for its whole lifetime.
   */
  sessionVersion: number;
  bestScore?: number;
  bestAttemptId?: ObjectId;
  bestAttemptAt?: Date;
  attemptCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- questions -------------------------------------------------------------------------------

export interface QuestionOption {
  /** Stable id. The source JSON keys the answer by array position; shuffling would break that. */
  id: string;
  text: LocalisedText;
}

export interface Question {
  _id: ObjectId;
  externalId: number;
  text: LocalisedText;
  options: QuestionOption[];
  correctOptionId: string;
  topic?: string;
  difficulty?: string;
  isActive: boolean;
}

export type PublicQuestion = Omit<Question, "correctOptionId">;

/**
 * The single place `correctOptionId` is excluded. Every read that can reach a response body goes
 * through this projection at the repository layer — not through a serialiser that can be bypassed.
 */
export const PUBLIC_QUESTION_PROJECTION = { correctOptionId: 0 } as const;

// --- attempts --------------------------------------------------------------------------------

export type AttemptStatus = "in_progress" | "submitted" | "auto_submitted" | "expired";

/**
 * A paper that was sat: handed in by the student, auto-submitted at the bell, or swept and scored
 * at expiry. `expired` belongs here — scripts/sweep-attempts.mjs scores those rows and increments
 * attemptCount, so they are a used attempt in every other reader and must be one here too.
 *
 * This is the only definition of "has taken the competition". Having an account is not it, and
 * neither is having a row in `attempts`: a paper merely opened is `in_progress`. Read this set
 * rather than testing statuses inline, so the profile, /quiz and the attempt gate cannot drift into
 * disagreeing about whether a given student is finished.
 */
export const SAT_STATUSES: AttemptStatus[] = ["submitted", "auto_submitted", "expired"];

export interface AttemptAnswer {
  questionId: ObjectId;
  selectedOptionId: string | null;
  answeredAt: Date;
  /** Monotonic per attempt. Makes the autosave upsert idempotent when a retry arrives out of order. */
  clientSeq: number;
}

export interface ServedQuestion {
  questionId: ObjectId;
  /** The option order actually shown, so a shuffled paper can be reconstructed years later. */
  optionIds: string[];
}

export interface Attempt {
  _id: ObjectId;
  userId: ObjectId;
  questionIds: ObjectId[];
  served: ServedQuestion[];
  /** Both written server-side: expiresAt = startedAt + 600s. The client supplies neither. */
  startedAt: Date;
  expiresAt: Date;
  answers: AttemptAnswer[];
  status: AttemptStatus;
  submittedAt?: Date;
  score?: number;
  timeTakenSeconds?: number;
  /** Snapshotted at start so a merit list cannot be moved by a later profile edit. */
  district: string;
  category: Category;
  gender: Gender;
  isDivyang: boolean;
  rulesAcceptedAt: Date;
}

// --- certificates ----------------------------------------------------------------------------

export interface Certificate {
  _id: ObjectId;
  userId: ObjectId;
  attemptId: ObjectId;
  /** Unique and non-sequential — /verify/[n] is a public name lookup keyed by this. */
  certificateNumber: string;
  issuedAt: Date;
  revokedAt?: Date;
  pdfKey?: string;
}

// --- otp -------------------------------------------------------------------------------------

/**
 * Bound at send and re-checked at verify, so a code minted to prove ownership of a new number
 * cannot be turned round and used to sign in to an account that already holds it.
 */
export type OtpPurpose = "register" | "login";

/** "admin" rows are the manual fallback: identical to verify, but no SMS was ever sent. */
export type OtpChannel = "msg91" | "admin";

export interface OtpRequest {
  _id: ObjectId;
  /** Unique. One live code per number at a time — a superseded code stops existing, it does not linger. */
  mobile: string;
  purpose: OtpPurpose;
  /** HMAC-SHA256 under OTP_PEPPER, hex. The code itself is never stored, logged or returned. */
  otpHash: string;
  /** startedAt + 600s, written server-side. TTL index, so an abandoned code cleans itself up. */
  expiresAt: Date;
  attempts: number;
  consumed: boolean;
  lastSentAt: Date;
  sendCount: number;
  channel: OtpChannel;
  ip: string;
  createdAt: Date;
}

export type DeliveryStatus = "pending" | "delivered" | "failed" | "unknown";

/**
 * One row per message actually handed to MSG91, keyed by their request_id, created at send and
 * completed by the delivery webhook. It exists because the send call answers "success" to a request
 * carrying an invalid auth key — this is the only place a real delivery outcome is recorded.
 *
 * It deliberately holds no mobile number. `authEvents` already maps mobile to providerRef, so
 * support can walk from a student to their message in one hop, and this collection never becomes a
 * second copy of five lakh minors' phone numbers.
 */
export interface SmsDelivery {
  _id: ObjectId;
  /** MSG91's request_id. Unique — reports arrive more than once and must be idempotent. */
  requestId: string;
  /** UTC "YYYY-MM-DD" of the send, so a day's counts are one indexed group rather than a range scan. */
  day: string;
  sentAt: Date;
  status: DeliveryStatus;
  /** MSG91's numeric code and text, kept verbatim so an unmapped value is still readable. */
  providerCode?: string;
  providerDesc?: string;
  reportedAt?: Date;
}

/**
 * Whatever the last scheduled check of a provider found. One row per key, overwritten each run —
 * this is current state, not history, and `checkedAt` is what tells the dashboard the poller is
 * alive without a heartbeat row per run in the audit log.
 */
export interface ProviderHealth {
  _id: ObjectId;
  /** "msg91_balance" is the only key today. */
  key: string;
  ok: boolean;
  /** Credits, not currency. Can be fractional, so the paise-as-integers rule does not apply. */
  credits: number;
  raw: string;
  detail: string;
  checkedAt: Date;
  /** Set while the balance is under the alert threshold, so the crossing is alerted once. */
  belowThreshold: boolean;
}

export type OtpCounterScope = "mobile" | "ip" | "global";

/**
 * Send quotas, kept off the OTP record because that record dies with its code after ten minutes and
 * an hourly cap has to outlive it. One row per subject per window; the bucket string is the window,
 * so a new hour is a new row rather than a reset anyone has to run.
 */
export interface OtpCounter {
  _id: ObjectId;
  scope: OtpCounterScope;
  /** The mobile, the IP, or "all" for the global breaker. */
  key: string;
  /** UTC "YYYY-MM-DDTHH" for an hour window, "YYYY-MM-DD" for a day. */
  bucket: string;
  count: number;
  expiresAt: Date;
}

// --- authEvents ------------------------------------------------------------------------------

export type AuthOutcome =
  | "success"
  | "unknown_mobile"
  | "malformed_mobile"
  | "rate_limited"
  | "otp_sent"
  | "otp_send_failed"
  | "otp_resend_too_soon"
  | "otp_quota_mobile"
  | "otp_quota_ip"
  | "otp_circuit_open"
  | "otp_already_registered"
  | "otp_verified"
  | "otp_wrong_code"
  | "otp_expired"
  | "otp_consumed"
  | "otp_not_found"
  | "otp_purpose_mismatch"
  | "otp_attempts_exhausted"
  | "otp_admin_issued";

export type AuthAction = "login" | "otp_send" | "otp_verify" | "otp_admin_issue";

export interface AuthEvent {
  _id: ObjectId;
  mobile: string;
  ip: string;
  userAgent: string;
  /** Absent on rows written before OTP landed, every one of which was a sign-in. */
  action?: AuthAction;
  outcome: AuthOutcome;
  /** MSG91's HTTP status. Absent when no request was made — a quota refusal never calls out. */
  providerStatus?: number;
  /**
   * MSG91's request_id. Support's only way to ask them what happened to one message when a student
   * says nothing arrived, which matters because the send call itself cannot tell us.
   */
  providerRef?: string;
  at: Date;
}

// --- admin ------------------------------------------------------------------------------------

export type AdminRole = "viewer" | "operator" | "owner";

export interface Admin {
  _id: ObjectId;
  username: string;
  /** argon2id. Never leaves the server, never appears in a serialiser. */
  passwordHash: string;
  displayName: string;
  role: AdminRole;
  failedAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  /** Bumped on sign-out; the admin cookie is dead the moment it stops matching. */
  sessionVersion: number;
  createdAt: Date;
}

export interface AdminAuditEvent {
  _id: ObjectId;
  adminId: ObjectId | null;
  username: string;
  action: string;
  target: string;
  ip: string;
  at: Date;
}

/** One row per path per day. Written by proxy.ts, never carries anything about a person. */
export interface PageView {
  _id: ObjectId;
  day: string;   // YYYY-MM-DD
  path: string;
  count: number;
}

/**
 * One row per unique visitor per day. The hash is over ip + user agent + a salt that rotates
 * daily, so yesterday's rows cannot be re-derived from today's traffic and nothing identifying is
 * stored at any point.
 */
export interface VisitorDay {
  _id: ObjectId;
  day: string;
  hash: string;
  at: Date;
}
