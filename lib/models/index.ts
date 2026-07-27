import type { Collection } from "mongodb";
import { getDb } from "@/lib/db";
import type { Attempt, AuthEvent, Certificate, Question, User } from "./types";

export * from "./types";
export { COLLECTIONS, INDEXES, type IndexSpec, type CollectionName } from "./indexes";

export const users = async (): Promise<Collection<User>> => (await getDb()).collection<User>("users");
export const questions = async (): Promise<Collection<Question>> => (await getDb()).collection<Question>("questions");
export const attempts = async (): Promise<Collection<Attempt>> => (await getDb()).collection<Attempt>("attempts");
export const certificates = async (): Promise<Collection<Certificate>> => (await getDb()).collection<Certificate>("certificates");
export const authEvents = async (): Promise<Collection<AuthEvent>> => (await getDb()).collection<AuthEvent>("authEvents");
