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

// --- authEvents ------------------------------------------------------------------------------

export type AuthOutcome = "success" | "unknown_mobile" | "malformed_mobile" | "rate_limited";

export interface AuthEvent {
  _id: ObjectId;
  mobile: string;
  ip: string;
  userAgent: string;
  outcome: AuthOutcome;
  at: Date;
}
