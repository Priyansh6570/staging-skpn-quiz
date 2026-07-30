import book from "@/vidya-kala.json";
import { hi as hiStrings, type Lang, strings } from "@/lib/i18n";

// Server-only. The JSON is ~400KB; nothing here may be imported by a client component.
// Callers pass the narrow shapes below across the boundary instead.

type Para = { printed: number; kind: string; text: string };
type Shloka = { printed: number; text: string; attribution: string | null };
type Figure = { printed: number; position: string; subject: string; pdfPage: number; file: string | null };

type RawEntry = {
  key: string | null;
  section: "vidya" | "kala";
  nameHi: string | null;
  glossHi: string | null;
  descriptionHi: Para[];
  shloka: Shloka[];
  figures: Figure[];
  variantHi?: string[];
  bookHeading: { printed: number; bookNum?: number | null; note?: string | null };
};

const raw = book.entries as unknown as RawEntry[];

// Three reconciliations between the book file and the i18n keys, all consequences of the
// book-authority pass:
//   - the three sections with no canonical name still carry key:null in the JSON;
//   - Chhando-jnana has no JSON entry of its own. The book splits one canonical kala across
//     sections 54 and 55, so both halves live in the Abhidhana-kosha entry and are separated
//     here by printed page — 227 for the first, 229 for the second.
const KEY_BY_PAGE: Record<number, string> = { 185: "Takshakarma", 217: "Nimitta-jnana", 247: "Vyayamiki" };
const PAGE_SCOPED: Record<string, number[]> = { "Abhidhana-kosha": [227], "Chhando-jnana": [229] };
const SOURCE_KEY: Record<string, string> = { "Chhando-jnana": "Abhidhana-kosha" };

const keyOf = (e: RawEntry) => e.key ?? KEY_BY_PAGE[e.bookHeading.printed] ?? null;

export type IndexRow = { key: string; name: string; gloss: string | null; glossIsHindi: boolean; n: number };
export type VidyaGroup = { label: string; rows: IndexRow[] };

const i18nList = (lang: Lang, which: "VIDYAS" | "KALAS") =>
  strings(lang).Home_v5[which] as unknown as (string | null)[][];

const rowOf = (t: (string | null)[], lang: Lang, n: number): IndexRow => {
  const name = (lang === "hi" ? t[0] : t[2]) ?? t[0] ?? "";
  const gloss = lang === "hi" ? t[1] : (t[3] ?? t[1]);
  return { key: t[2] as string, name, gloss: gloss ?? null, glossIsHindi: lang === "en" && !t[3], n };
};

/**
 * Vidyas grouped 4/6/4. The label comes from groupHi on the book entry, written there once by a
 * derivation over two sources (see the group-migration script). It cannot be inferred from the
 * i18n array alone: शिक्षा and धर्म शास्त्र each lead a group while carrying a real gloss rather
 * than a category label, so any scan that inherits the previous label misfiles both.
 */
export function vidyaGroups(lang: Lang): VidyaGroup[] {
  const rows = i18nList(lang, "VIDYAS");
  const groupOf = new Map(raw.filter((e) => e.section === "vidya").map((e) => [e.key, (e as RawEntry & { groupHi?: string }).groupHi]));
  const out: VidyaGroup[] = [];
  rows.forEach((t, i) => {
    const label = groupOf.get(t[2] as string);
    if (!label) throw new Error(`vidya ${t[2]} has no groupHi in vidya-kala.json`);
    if (!out.length || out[out.length - 1].label !== label) out.push({ label, rows: [] });
    out[out.length - 1].rows.push(rowOf(rows[i], lang, i + 1));
  });
  return out;
}

export const kalaIndex = (lang: Lang): IndexRow[] => i18nList(lang, "KALAS").map((t, i) => rowOf(t, lang, i + 1));

export type EntryDetail = {
  key: string;
  name: string;
  gloss: string | null;
  glossIsHindi: boolean;
  /** Set for vidyas only. A gloss equal to this is a category label, not a gloss. */
  groupHi: string | null;
  section: "vidya" | "kala";
  n: number | null;
  bookHeading: string | null;
  variants: string[];
  paras: Para[];
  shlokas: Shloka[];
  figures: Figure[];
  pages: number[];
  prev: { key: string; name: string } | null;
  next: { key: string; name: string } | null;
};

/** Book order across both lists: the 14 vidyas, then the 64 kalas. */
export function allKeys(): string[] {
  return [...i18nList("hi", "VIDYAS"), ...i18nList("hi", "KALAS")].map((t) => t[2] as string);
}

export function entry(key: string, lang: Lang): EntryDetail | null {
  const sourceKey = SOURCE_KEY[key] ?? key;
  const e = raw.find((x) => keyOf(x) === sourceKey);
  if (!e) return null;

  const scope = PAGE_SCOPED[key];
  const inScope = <T extends { printed: number }>(xs: T[]) => (scope ? xs.filter((x) => scope.includes(x.printed)) : xs);

  const order = allKeys();
  const i = order.indexOf(key);
  const isVidya = (i18nList("hi", "VIDYAS") as (string | null)[][]).some((t) => t[2] === key);
  const list = i18nList(lang, isVidya ? "VIDYAS" : "KALAS");
  const hiList = i18nList("hi", isVidya ? "VIDYAS" : "KALAS");
  const pos = hiList.findIndex((t) => t[2] === key);
  const tuple = list[pos];
  const row = rowOf(tuple, lang, pos + 1);

  const nameOf = (k: string) => {
    const inV = (i18nList(lang, "VIDYAS") as (string | null)[][]).find((t) => t[2] === k);
    const inK = (i18nList(lang, "KALAS") as (string | null)[][]).find((t) => t[2] === k);
    const t = inV ?? inK;
    return ((lang === "hi" ? t?.[0] : t?.[2]) ?? t?.[0] ?? k) as string;
  };

  // The full book heading is element 5 of the tuple. Surface it only where it differs from the
  // display name — that difference is the scholarly detail, an identical string is noise.
  const heading = (tuple[4] as string | undefined) ?? null;

  return {
    key,
    name: row.name,
    gloss: row.gloss,
    glossIsHindi: row.glossIsHindi,
    groupHi: (e as RawEntry & { groupHi?: string }).groupHi ?? null,
    section: e.section,
    n: isVidya ? null : pos + 1,
    bookHeading: heading && heading !== row.name ? heading : null,
    variants: e.variantHi ?? [],
    paras: inScope(e.descriptionHi),
    shlokas: inScope(e.shloka),
    figures: inScope(e.figures),
    pages: [...new Set(inScope(e.descriptionHi).map((p) => p.printed))].sort((a, b) => a - b),
    prev: i > 0 ? { key: order[i - 1], name: nameOf(order[i - 1]) } : null,
    next: i >= 0 && i < order.length - 1 ? { key: order[i + 1], name: nameOf(order[i + 1]) } : null,
  };
}

/** Hindi name for metadata, which is generated server-side and always ships Hindi. */
export const hiName = (key: string): string => {
  const t = [...(hiStrings.Home_v5.VIDYAS as unknown as string[][]), ...(hiStrings.Home_v5.KALAS as unknown as string[][])].find((x) => x[2] === key);
  return t?.[0] ?? key;
};
