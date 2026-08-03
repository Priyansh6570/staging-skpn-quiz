import type { Collection } from "mongodb";
import { getDb } from "@/lib/db";
import type {
  Admin, AdminAuditEvent, Attempt, AuthEvent, Certificate, OtpCounter, OtpRequest, PageView,
  ProviderHealth, Question, SmsDelivery, User, VisitorDay,
} from "./types";

export * from "./types";
export { COLLECTIONS, INDEXES, type IndexSpec, type CollectionName } from "./indexes";

export const users = async (): Promise<Collection<User>> => (await getDb()).collection<User>("users");
export const questions = async (): Promise<Collection<Question>> => (await getDb()).collection<Question>("questions");
export const attempts = async (): Promise<Collection<Attempt>> => (await getDb()).collection<Attempt>("attempts");
export const certificates = async (): Promise<Collection<Certificate>> => (await getDb()).collection<Certificate>("certificates");
export const authEvents = async (): Promise<Collection<AuthEvent>> => (await getDb()).collection<AuthEvent>("authEvents");
export const admins = async (): Promise<Collection<Admin>> => (await getDb()).collection<Admin>("admins");
export const adminAuditLog = async (): Promise<Collection<AdminAuditEvent>> => (await getDb()).collection<AdminAuditEvent>("adminAuditLog");
export const pageViews = async (): Promise<Collection<PageView>> => (await getDb()).collection<PageView>("pageViews");
export const visitorDays = async (): Promise<Collection<VisitorDay>> => (await getDb()).collection<VisitorDay>("visitorDays");
export const otpRequests = async (): Promise<Collection<OtpRequest>> => (await getDb()).collection<OtpRequest>("otpRequests");
export const otpCounters = async (): Promise<Collection<OtpCounter>> => (await getDb()).collection<OtpCounter>("otpCounters");
export const smsDeliveries = async (): Promise<Collection<SmsDelivery>> => (await getDb()).collection<SmsDelivery>("smsDeliveries");
export const providerHealth = async (): Promise<Collection<ProviderHealth>> => (await getDb()).collection<ProviderHealth>("providerHealth");
