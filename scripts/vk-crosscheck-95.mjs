// Diffs the book's boxed list of 64 kalas (printed 95) against Home_v5.KALAS in lib/i18n.
//
// Report only. This script never writes to lib/i18n and never edits vidya-kala.json. Matching is
// deliberately conservative: an exact match after normalising whitespace and danda is a match, a
// containment relation is reported as a compound-boundary difference, and everything else is left
// unresolved for a human rather than guessed at by edit distance.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const src = readFileSync(join(ROOT, "lib", "i18n", "hi.ts"), "utf8");
const hi = eval(`(${src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1).replace(/,(\s*[}\]])/g, "$1")})`);
const KALAS = hi.Home_v5.KALAS.map(([nameHi, glossHi, key], i) => ({ idx: i + 1, nameHi, glossHi, key }));

const doc = JSON.parse(readFileSync(join(ROOT, "vidya-kala.json"), "utf8"));
const page95 = doc.structuralPages.find((p) => p.printed === 95);
if (!page95) { console.error("printed 95 not yet extracted"); process.exit(1); }
const raw = page95.descriptionHi.map((b) => b.text).join(" ");

// Items are "N. name" runs; the last is closed by a danda and the 64th is preceded by एवं.
const items = [];
const re = /(\d{1,2})\.\s*([^0-9]+?)(?=\s*\d{1,2}\.|$)/g;
let m;
while ((m = re.exec(raw)) !== null) {
  items.push({ num: Number(m[1]), nameHi: m[2].replace(/एवं\s*$/, "").replace(/[।\s]+$/, "").trim() });
}

// Normalisation for comparison only — never written back anywhere.
const norm = (s) => s
  .replace(/[‌‍]/g, "")
  .replace(/[\s\-–—]/g, "")
  .replace(/[।॥.]/g, "")
  .replace(/(विद्या|कला|क्रिया|कर्म|योग)$/u, "");
const bare = (s) => s.replace(/[‌‍]/g, "").replace(/[\s\-–—]/g, "").replace(/[।॥.]/g, "");

console.log("=".repeat(78));
console.log("PRINTED-95 CROSS-CHECK  —  book's boxed 64 vs lib/i18n Home_v5.KALAS");
console.log("=".repeat(78));

// --- 1. is the book's list exactly 64 discrete entries? -------------------------------------------
const nums = items.map((i) => i.num);
const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
const missingNums = Array.from({ length: 64 }, (_, i) => i + 1).filter((n) => !nums.includes(n));
const outOfOrder = nums.some((n, i) => i > 0 && n < nums[i - 1]);
console.log(`\n1. DISCRETENESS`);
console.log(`   items parsed              : ${items.length}`);
console.log(`   numbering                 : ${nums[0]}..${nums.at(-1)}${outOfOrder ? " (NOT ascending)" : " ascending"}`);
console.log(`   duplicate numbers         : ${dupes.length ? dupes.join(", ") : "none"}`);
console.log(`   missing numbers 1-64      : ${missingNums.length ? missingNums.join(", ") : "none"}`);
console.log(`   lib/i18n KALAS length     : ${KALAS.length}`);
const discrete = items.length === 64 && !dupes.length && !missingNums.length && !outOfOrder;
console.log(`   => exactly 64 discrete    : ${discrete ? "YES" : "NO"}`);

// Items whose printed name is itself a compound of two arts joined by a hyphen or a slash.
const internallyCompound = items.filter((i) => /[-–—\/]/.test(i.nameHi));
if (internallyCompound.length) {
  console.log(`   note: ${internallyCompound.length} item(s) name more than one art inside a single number:`);
  for (const i of internallyCompound) console.log(`         ${i.num}. ${i.nameHi}`);
}

// Levenshtein over Unicode code points. Used only to PROPOSE a candidate for a human to confirm —
// a near miss is reported as a spelling difference awaiting confirmation, never asserted as a match.
const dist = (a, b) => {
  const x = [...a], y = [...b];
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[y.length];
};
// Anything looser than this is not proposed at all; it goes to the truly-absent list.
const NEAR = 0.34;

// --- 2. match each book item to lib/i18n ----------------------------------------------------------
const usedCanon = new Set();
const firmRows = items.map((it) => {
  const exact = KALAS.find((k) => bare(k.nameHi) === bare(it.nameHi));
  if (exact) { usedCanon.add(exact.idx); return { it, canon: exact, kind: "exact" }; }
  const stem = KALAS.find((k) => norm(k.nameHi) === norm(it.nameHi));
  if (stem) { usedCanon.add(stem.idx); return { it, canon: stem, kind: "suffix-only" }; }
  const contains = KALAS.filter((k) => bare(k.nameHi).startsWith(bare(it.nameHi)) || bare(it.nameHi).startsWith(bare(k.nameHi)));
  if (contains.length) { contains.forEach((c) => usedCanon.add(c.idx)); return { it, canon: contains, kind: "boundary" }; }
  return { it, canon: null, kind: "pending" };
});

// Second pass: propose candidates for the leftovers, preferring canonical entries nothing has
// claimed yet, and breaking ties by how close the index is to the book's own number.
const rows = firmRows.map((r) => {
  if (r.kind !== "pending") return r;
  const scored = KALAS
    .filter((k) => !usedCanon.has(k.idx))
    .map((k) => {
      const a = bare(r.it.nameHi), b = bare(k.nameHi);
      return { k, ratio: dist(a, b) / Math.max([...a].length, [...b].length), gap: Math.abs(k.idx - r.it.num) };
    })
    .sort((p, q) => p.ratio - q.ratio || p.gap - q.gap);
  const best = scored[0];
  if (best && best.ratio <= NEAR) {
    usedCanon.add(best.k.idx);
    return { it: r.it, canon: best.k, kind: "near", ratio: best.ratio };
  }
  return { it: r.it, canon: null, kind: "absent", nearest: best ?? null };
});

const byKind = (k) => rows.filter((r) => r.kind === k);

console.log(`\n2. MATCH SUMMARY`);
console.log(`   exact (ignoring spaces/danda)         : ${byKind("exact").length}`);
console.log(`   differ only by a trailing कला/विद्या  : ${byKind("suffix-only").length}`);
console.log(`   compound-boundary difference          : ${byKind("boundary").length}`);
console.log(`   spelling differs, candidate proposed  : ${byKind("near").length}`);
console.log(`   no canonical name resembles it        : ${byKind("absent").length}`);

console.log(`\n3. COMPOUND-BOUNDARY DIFFERENCES`);
if (!byKind("boundary").length) console.log("   none");
for (const r of byKind("boundary")) {
  const list = r.canon.map((c) => `${c.idx} ${c.nameHi} (${c.key})`).join("  +  ");
  const rel = r.canon.length > 1 ? "book merges" : bare(r.canon[0].nameHi).length > bare(r.it.nameHi).length ? "book shortens" : "book extends";
  console.log(`   book ${String(r.it.num).padStart(2)}. ${r.it.nameHi}`);
  console.log(`        ${rel} -> canonical ${list}`);
}

console.log(`\n4a. SPELLING DIFFERENCES — same word, differs only by spacing or a trailing suffix`);
const spelling = rows.filter((r) => (r.kind === "suffix-only" || r.kind === "exact") && r.it.nameHi !== r.canon.nameHi);
if (!spelling.length) console.log("   none");
for (const r of spelling) {
  console.log(`   book ${String(r.it.num).padStart(2)}. ${r.it.nameHi.padEnd(34)} lib/i18n ${String(r.canon.idx).padStart(2)} ${r.canon.nameHi.padEnd(28)} ${r.canon.key}`);
}

console.log(`\n4b. SPELLING DIFFERENCES — candidate proposed, NEEDS CONFIRMATION`);
console.log(`    These differ by one or more characters. The candidate is the closest unclaimed`);
console.log(`    canonical name; it is a proposal for the proofreader, not a decision.`);
if (!byKind("near").length) console.log("   none");
for (const r of byKind("near").sort((a, b) => a.ratio - b.ratio)) {
  console.log(`   book ${String(r.it.num).padStart(2)}. ${r.it.nameHi.padEnd(34)} lib/i18n ${String(r.canon.idx).padStart(2)} ${r.canon.nameHi.padEnd(28)} ${r.canon.key}   (differs ${(r.ratio * 100).toFixed(0)}%)`);
}

console.log(`\n5. IN THE BOOK, NOTHING IN lib/i18n RESEMBLES IT`);
if (!byKind("absent").length) console.log("   none");
for (const r of byKind("absent")) {
  const n = r.nearest ? `closest was ${r.nearest.k.idx} ${r.nearest.k.nameHi} at ${(r.nearest.ratio * 100).toFixed(0)}% difference` : "no candidate left";
  console.log(`   book ${String(r.it.num).padStart(2)}. ${r.it.nameHi.padEnd(34)} ${n}`);
}

console.log(`\n6. IN lib/i18n, NOT MATCHED BY ANY BOOK ITEM`);
const orphans = KALAS.filter((k) => !usedCanon.has(k.idx));
if (!orphans.length) console.log("   none");
for (const k of orphans) console.log(`   lib/i18n ${String(k.idx).padStart(2)} ${k.nameHi.padEnd(30)} ${k.key}`);

console.log(`\n7. NUMBERING DRIFT (book number vs lib/i18n index, matched items only)`);
let drift = 0;
for (const r of rows) {
  if (!r.canon || Array.isArray(r.canon)) continue;
  if (r.canon.idx !== r.it.num) { drift++; console.log(`   book ${String(r.it.num).padStart(2)} -> lib/i18n ${String(r.canon.idx).padStart(2)}   ${r.canon.key}`); }
}
console.log(`   items whose number differs: ${drift} of ${rows.filter((r) => r.canon && !Array.isArray(r.canon)).length} matched`);

// --- 8. caveats on sections 5 and 6 ---------------------------------------------------------------
// The NEAR threshold is a judgement, not a fact, and matching is greedy: once a canonical entry is
// claimed, a later book item that also relates to it is pushed into section 5. Both effects inflate
// sections 5 and 6, so they are called out rather than left for the reader to notice.
console.log(`\n8. CAVEATS ON SECTIONS 5 AND 6`);
console.log(`   The ${(NEAR * 100).toFixed(0)}% similarity cut-off is arbitrary. Where an item in section 5 sits next to an`);
console.log(`   unclaimed lib/i18n entry of almost the same name, it is very likely the same art and`);
console.log(`   only just failed the cut-off:`);
let flagged = 0;
for (const r of byKind("absent")) {
  if (r.nearest && !usedCanon.has(r.nearest.k.idx) && Math.abs(r.nearest.k.idx - r.it.num) <= 3) {
    flagged++;
    console.log(`     book ${String(r.it.num).padStart(2)} ${r.it.nameHi}  ~  lib/i18n ${r.nearest.k.idx} ${r.nearest.k.nameHi} (${r.nearest.k.key}) at ${(r.nearest.ratio * 100).toFixed(0)}%`);
  }
}
if (!flagged) console.log("     none");
console.log(`   Matching is greedy, so where the book SPLITS one canonical compound into two numbers`);
console.log(`   the first number claims the canonical entry and the second falls into section 5.`);
console.log(`   Cross-read section 5 against section 3 before concluding anything is missing.`);
console.log(`\n   lib/i18n is unchanged by this script.`);
