/**
 * Client-requested copy edits, applied to the extracted strings after extraction.
 *
 * Everything in here is derived from strings that already exist in the design export — reordered,
 * split, or recombined — so no Devanagari is re-typed and a re-run reproduces it exactly. Copy that
 * genuinely has no source in the export lives in lib/i18n/custom.ts instead, where it is marked as
 * authored rather than extracted.
 */

const dropYear = (s) => s.replace(/\s*\d{4}\s*$/, "").trim();

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

  // --- derived keys, composed from strings already present ------------------------------------
  const home = next.Home_v5?.S;
  if (home) {
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

  const reg = next.Register?.S;
  if (reg) reg.categories = movePolytechnic(reg.categories, lang);

  return next;
}
