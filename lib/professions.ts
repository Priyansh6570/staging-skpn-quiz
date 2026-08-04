import { strings, type Lang } from "@/lib/i18n";
import { PROFESSIONS, professionCopy } from "@/lib/i18n/professions";

/**
 * The professions section's data: for each profession, the Vidyas and Kalas it shares a domain with,
 * each carrying its own name and its gloss from the book.
 *
 * Client-safe, and that is the point of the file. This resolution used to live in lib/vidyakala.ts,
 * which imports the 1.3MB book JSON at module scope — so anything that wanted a profession card
 * dragged the whole book with it. Nothing here needs the book: a card is a label plus the name and
 * gloss already extracted into lib/i18n. The home section is rendered from a client component and
 * could not have called the old one at all.
 *
 * The gloss is the payoff. A student who opens "चिकित्सा" is not shown a list of words — they are
 * shown that वृक्षायुर्वेद योग is "पेड़-पौधों की चिकित्सा", and the link takes them to what the book says.
 *
 * Throws on a key that no longer resolves. The section is a set of promises about what the reader
 * will find; a silently dropped link is worse than a failed build. `npm run professions` makes the
 * same check ahead of time, so this should never be what reports it.
 */
export type ProfessionEntry = {
  key: string;
  name: string;
  gloss: string | null;
  glossIsHindi: boolean;
  n: number;
  section: "vidya" | "kala";
};
export type ProfessionCard = { key: string; label: string; entries: ProfessionEntry[] };

export function professionCards(lang: Lang): ProfessionCard[] {
  const vidyas = strings(lang).Home_v5.VIDYAS as unknown as (string | null)[][];
  const kalas = strings(lang).Home_v5.KALAS as unknown as (string | null)[][];

  const entryOf = (t: (string | null)[], n: number, section: "vidya" | "kala"): ProfessionEntry => ({
    key: t[2] as string,
    name: ((lang === "hi" ? t[0] : t[2]) ?? t[0] ?? "") as string,
    gloss: (lang === "hi" ? t[1] : (t[3] ?? t[1])) ?? null,
    glossIsHindi: lang === "en" && !t[3],
    n,
    section,
  });

  const find = (key: string): ProfessionEntry => {
    const vi = vidyas.findIndex((t) => t[2] === key);
    if (vi >= 0) return entryOf(vidyas[vi], vi + 1, "vidya");
    const ki = kalas.findIndex((t) => t[2] === key);
    if (ki >= 0) return entryOf(kalas[ki], ki + 1, "kala");
    throw new Error(`professions: no Vidya or Kala with key "${key}" — see lib/i18n/professions.ts`);
  };

  return PROFESSIONS.map(({ key, entries }) => ({
    key,
    label: professionCopy[lang].labels[key as keyof (typeof professionCopy)["hi"]["labels"]],
    entries: entries.map(find),
  }));
}
