/**
 * Client-requested copy edits, applied to the extracted strings after extraction.
 *
 * Almost everything in here is derived from strings that already exist in the design export —
 * reordered, split, or recombined — so no Devanagari is re-typed and a re-run reproduces it exactly.
 * Copy that genuinely has no source in the export lives in lib/i18n/custom.ts instead, where it is
 * marked as authored rather than extracted.
 *
 * The one exception is VIRTUE below: a single word the client supplied in a change request, which
 * has to be spliced into an extracted paragraph rather than stand on its own, so it cannot live in
 * custom.ts. Like everything in custom.ts it has NOT been through the designer or the department
 * and needs a native proofread before launch.
 */

import { readFileSync } from "node:fs";

const dropYear = (s) => s.replace(/\s*\d{4}\s*$/, "").trim();

// The client replaced the rules wholesale and supplied them as a text file. It is read, never
// re-typed: a heading line opens a section, "N<tab>text" lines are its points, and the two title
// lines above the first heading are skipped because Rules.S.title already carries them. The file's
// own byte sequences reach hi.ts untouched, ZWJ and all.
const RULES_HI = new URL("../content/rules-hi.txt", import.meta.url);

function parseRules(text) {
  const sections = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const point = line.match(/^\d+\.\s*(.+)$/);
    if (point) sections[sections.length - 1]?.points.push(point[1].trim());
    else sections.push({ title: line, points: [] });
  }
  return sections
    .filter((s) => s.points.length)
    .map((s, i) => ({ n: String(i + 1), title: s.title, points: s.points }));
}

/** "A, B" -> "B, A" for the two Kala/Vidya orderings the client asked to swap. */
function swapKalaVidya(text) {
  return text
    // Hindi: nominative and oblique forms, and the "X एवं Y" join used in About.
    .replace(/64 (कला(?:एँ|ओं))(\s*(?:,|एवं)\s*)14 (विद्या(?:एँ|ओं))/g,
      (_, kala, join, vidya) => `14 ${vidya}${join}64 ${kala}`)
    // English, including "the 64 Kalas, the 14 Vidyas" and "the 64 Kalas and 14 Vidyas".
    .replace(/(the\s+)?64 (Kalas)(,\s*(?:the\s+)?|\s+and\s+)(the\s+)?14 (Vidyas)/g,
      (_, t1, kalas, join, t2, vidyas) => `${t1 ?? ""}14 ${vidyas}${join}${t2 ?? ""}64 ${kalas}`);
}

// Client change request: one more virtue in the Sandipani paragraph's list, which appears verbatim
// on home and about. English is empty because the client has not supplied it — translating it here
// is exactly what the copy rules forbid, so English keeps the approved list until they do.
const VIRTUE = { hi: "राष्ट्र-भक्ति", en: "" };

/** Inserts the virtue after the item that follows the paragraph's last comma, before "और X". */
function addVirtue(text, lang) {
  const word = VIRTUE[lang];
  if (!word || text.includes(word)) return text;
  const at = text.lastIndexOf(", ");
  if (at < 0) return text;
  const rest = text.slice(at + 2);
  const end = rest.indexOf(" ");
  return end < 0 ? text : `${text.slice(0, at + 2)}${rest.slice(0, end)}, ${word}${rest.slice(end)}`;
}

const ADDRESS = {
  hi: [["सभागार", "सभागम"], ["–", "-"]],
  en: [["Sabhagar", "Sabhagam"], ["–", "-"]],
};

function fixAddress(text, lang) {
  if (!/रवीन्द्र|Ravindra/.test(text)) return text;
  return ADDRESS[lang].reduce((acc, [from, to]) => acc.split(from).join(to), text);
}

/** Walks every string leaf and rewrites it in place. */
function mapStrings(node, fn) {
  if (typeof node === "string") return fn(node);
  if (Array.isArray(node)) return node.map((v) => mapStrings(v, fn));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = mapStrings(v, fn);
    return out;
  }
  return node;
}

/** Moves "polytechnic or ITI" out of the college card and into the school card. */
function movePolytechnic(categories, lang) {
  if (!Array.isArray(categories) || categories.length < 2) return categories;
  const marker = lang === "hi" ? "पॉलिटेक्निक अथवा आईटीआई" : "polytechnic or ITI";
  const college = categories[1]?.who ?? "";
  if (!college.includes(marker)) return categories;

  const stripped = college
    .replace(new RegExp(`[,\\s]*(?:अथवा\\s*)?${marker}`), "")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();

  const joiner = lang === "hi" ? ", " : ", ";
  return categories.map((c, i) =>
    i === 0 ? { ...c, who: `${c.who}${joiner}${marker}` } : { ...c, who: stripped },
  );
}

export function applyTransforms(tree, lang) {
  const next = mapStrings(tree, (s) => fixAddress(swapKalaVidya(s), lang));

  const about = next.About?.S;
  if (about?.sandipaniP1) about.sandipaniP1 = addVirtue(about.sandipaniP1, lang);

  // --- derived keys, composed from strings already present ------------------------------------
  const home = next.Home_v5?.S;
  if (home) {
    home.sylLede = addVirtue(home.sylLede, lang);
    const start = dropYear(home.dates[0].when);                       // "29 जुलाई"
    const end = dropYear(home.dates[1].when);                         // "4 सितम्बर"
    const [festival, connector] = home.heroDate.split(/\s+(?=\d)/);   // "गुरु पूर्णिमा," | rest
    void connector;
    const seTak = lang === "hi"
      ? { se: "से", tak: (next.Register?.S?.categories?.[0]?.who ?? "").match(/तक/)?.[0] ?? "तक" }
      : { se: "to", tak: "" };

    home.heroDateRange = lang === "hi"
      ? `${festival} ${start} ${seTak.se} ${home.dates[1].what} ${end} ${seTak.tak}`
      : `${festival} ${start} to ${home.dates[1].what}, ${end}`;

    // Fourth stat card: "10 मिनट" over "समय".
    const minutes = next.Pratiyogita?.S?.format?.[1];
    home.factTimeValue = minutes?.value ?? `${home.facts[3].value} ${home.facts[3].label}`;
    home.factTimeLabel = (minutes?.label ?? "").split(/[,，]/)[0].split(" ").slice(-1)[0]
      || home.facts[3].label;

    // The hero heading names the scheme, not the competition. The scheme name is not spelled out
    // here: the last word of the hero title is swapped for the word the rules title carries after
    // the same stem, which is where the export already writes the name — in both languages.
    const title = home.heroTitle.split(" ");
    const rulesTitle = (next.Rules?.S?.title ?? "").split(" ");
    const stem = rulesTitle.indexOf(title[title.length - 2]);
    if (stem >= 0 && rulesTitle[stem + 1]) {
      home.heroTitle = [...title.slice(0, -1), rulesTitle[stem + 1]].join(" ");
    }
  }

  const prat = next.Pratiyogita?.S;
  if (prat) {
    prat.categories = movePolytechnic(prat.categories, lang);
    // "30" + "प्रश्न, ..." -> "30 प्रश्न" over the remainder.
    const first = prat.format?.[0];
    if (first) {
      const [head, ...rest] = first.label.split(/,\s*/);
      prat.formatFirstValue = `${first.value} ${head}`;
      prat.formatFirstLabel = rest.join(", ");
    }
  }

  // Hindi rules come from the client's file. English keeps the approved wording of the sections
  // that survive and loses the divyang section, which the new rules drop: publishing a rule in
  // English that Hindi no longer carries is worse than English wording being out of date.
  const rules = next.Rules?.S;
  if (rules?.sections) {
    if (lang === "hi") {
      const parsed = parseRules(readFileSync(RULES_HI, "utf8"));
      if (parsed.length) rules.sections = parsed;
    } else {
      rules.sections = rules.sections
        .filter((s) => !/divyang/i.test(s.title))
        .map((s, i) => ({ ...s, n: String(i + 1) }));
    }
  }

  const reg = next.Register?.S;
  if (reg) reg.categories = movePolytechnic(reg.categories, lang);

  // The school category covers polytechnic and ITI, so the education-level list has to offer it as
  // a choice. The label is the tail the category line gains just above — not typed here.
  const levels = next.Register?.LEVELS?.vidyalaya;
  const who = reg?.categories?.[0]?.who ?? "";
  const tail = who.includes(", ") ? who.split(", ").pop() : "";
  if (levels && tail && !levels.includes(tail)) {
    levels.push(lang === "en" ? tail[0].toUpperCase() + tail.slice(1) : tail);
  }

  // And the same two leave the college list, which no longer offers what the school category
  // absorbed. The words to drop on are the tail's first and last, skipping the conjunction between
  // them — matching that conjunction would take "Research or PhD" with them.
  const absorbed = tail ? [tail.split(" ")[0], tail.split(" ").pop()] : [];
  const college = next.Register?.LEVELS?.mahavidyalaya;
  if (college && absorbed.length) {
    next.Register.LEVELS.mahavidyalaya = college.filter((level) =>
      !level.split(/[\s,]+/).some((w) => absorbed.some((a) => a.toLowerCase() === w.toLowerCase())));
  }

  // The register aside repeats the home hero, so it carries the same two edits.
  if (reg && home) {
    reg.asideKicker = home.heroDateRange;
    reg.asideTitle = home.heroTitle;
  }

  // The date-of-birth wheel carries the export's abbreviated Hindi months. The client wants them
  // written out, and the full twelve are already in the export: the quiz result date formatter
  // spells them in order, and extraction lifts them into Quiz.inline. English keeps its
  // abbreviations, which is what the client asked for and what a date wheel usually shows.
  const spelled = next.Quiz?.inline?.slice(-12);
  if (lang === "hi" && next.Register?.MONTHS?.length === 12 && spelled?.length === 12) {
    next.Register.MONTHS = spelled;
  }

  return next;
}
