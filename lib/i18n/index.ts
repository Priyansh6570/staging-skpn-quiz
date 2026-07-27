import { hi } from "./hi";
import { en } from "./en";
import { customEn, customHi, type CustomStrings } from "./custom";

export type Lang = "hi" | "en";

// `hi` is the canonical shape. scripts/extract-strings.mjs fails loudly if en.ts drifts from it,
// so a plain Record is safe here and keeps callers free of union-of-two-object-literals noise.
export type Strings = typeof hi;

const table: Record<Lang, Strings> = { hi, en };
const customTable: Record<Lang, CustomStrings> = { hi: customHi, en: customEn };

/** Copy with no source in the design export. See lib/i18n/custom.ts. */
export const custom = (lang: Lang): CustomStrings => customTable[lang];

export const strings = (lang: Lang): Strings => table[lang];

export { hi, en, customHi, customEn };
export type { CustomStrings };
