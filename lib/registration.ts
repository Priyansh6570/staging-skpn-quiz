import { z } from "zod";
import { en } from "@/lib/i18n";
import { MOBILE_RE } from "@/lib/models/types";

// The English tables are the canonical keys: a merit list that groups on "कक्षा 10" and "Class 10"
// as different values is a silent correctness failure (AUDIT.md §3.7).
export const DISTRICT_KEYS = en.Register.DISTRICTS.map((d) => d[0]);
export const LEVEL_KEYS = en.Register.LEVELS;
export const EXAM_KEYS = [...en.Register.EXAMS, en.Register.S.examOther, en.Register.S.examNone];
export const GENDER_KEYS = ["male", "female", "other"] as const;
export const CATEGORY_KEYS = ["vidyalaya", "mahavidyalaya"] as const;

export const RegistrationInput = z
  .object({
    mobile: z.string().regex(MOBILE_RE),
    email: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal("")),
    fullName: z.string().trim().min(3).max(100),
    gender: z.enum(GENDER_KEYS),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    address: z.object({
      line: z.string().trim().min(5).max(200),
      cityVillage: z.string().trim().min(2).max(80),
      district: z.enum(DISTRICT_KEYS as [string, ...string[]]),
      pincode: z.string().regex(/^\d{6}$/),
    }),
    category: z.enum(CATEGORY_KEYS),
    educationLevel: z.string().min(1).max(80),
    institutionName: z.string().trim().min(3).max(150),
    competitiveExam: z.enum(EXAM_KEYS as [string, ...string[]]).nullable(),
    // The form no longer asks. Kept on the document so the flag rows registered before the change
    // carry still means what it meant, and so a client that still sends it is not rejected.
    isDivyang: z.boolean().default(false),
    guardianName: z.string().trim().max(100).optional().or(z.literal("")),
    rulesAccepted: z.literal(true),
    privacyAccepted: z.literal(true),
  })
  .strict() // reject unknown keys: the document is spread into an insert (AUDIT.md §4.7)
  .refine((v) => LEVEL_KEYS[v.category].includes(v.educationLevel), {
    path: ["educationLevel"],
    message: "level does not belong to category",
  })
  .refine((v) => !Number.isNaN(Date.parse(v.dateOfBirth)) && new Date(v.dateOfBirth) < new Date(), {
    path: ["dateOfBirth"],
    message: "date of birth must be in the past",
  });

export type RegistrationPayload = z.infer<typeof RegistrationInput>;
