import { hi } from "./hi";
import { en } from "./en";

export type Lang = "hi" | "en";

// `hi` is the canonical shape. scripts/extract-strings.mjs fails loudly if en.ts drifts from it,
// so a plain Record is safe here and keeps callers free of union-of-two-object-literals noise.
export type Strings = typeof hi;

const table: Record<Lang, Strings> = { hi, en };

export const strings = (lang: Lang): Strings => table[lang];

export { hi, en };
