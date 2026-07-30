// Fills nameHi and glossHi on every entry in vidya-kala.json from lib/i18n, and fails loudly on any
// key that is not in the canonical list.
//
// This exists so no agent ever types a canonical name. The book is a different enumeration and is
// never the source for a name — only for descriptionHi and shloka, which are transcribed. Re-run
// after each batch; it is idempotent.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const src = readFileSync(join(ROOT, "lib", "i18n", "hi.ts"), "utf8");
const hi = eval(`(${src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1).replace(/,(\s*[}\]])/g, "$1")})`);

const canonical = new Map();
for (const [section, list] of [["vidya", hi.Home_v5.VIDYAS], ["kala", hi.Home_v5.KALAS]]) {
  list.forEach(([nameHi, glossHi, key], i) => canonical.set(key, { nameHi, glossHi, section, index: i + 1 }));
}

const path = join(ROOT, "vidya-kala.json");
const doc = JSON.parse(readFileSync(path, "utf8"));

const bad = [];
for (const entry of doc.entries) {
  if (entry.key === null) continue; // unmatched headings carry no canonical name by design
  const c = canonical.get(entry.key);
  if (!c) { bad.push(entry.key); continue; }
  entry.nameHi = c.nameHi;
  entry.glossHi = c.glossHi;
  if (entry.section !== c.section) bad.push(`${entry.key} (section says ${entry.section}, canonical says ${c.section})`);
  entry.canonicalIndex = c.index;
}

if (bad.length) {
  console.error(`Not in lib/i18n: ${bad.join(", ")}`);
  process.exit(1);
}

writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);

const pages = doc.entries.flatMap((e) => e.sourcePages);
console.log(`filled ${doc.entries.length} entries from lib/i18n`);
for (const e of doc.entries) {
  const paras = e.descriptionHi.filter((b) => b.kind === "para" || b.kind === "deflist-item").length;
  console.log(`  ${e.key.padEnd(12)} ${e.complete ? "complete" : "partial "} pages ${e.sourcePages.join(",")}  ${paras} blocks, ${e.shloka.length} shloka, ${e.flags.length} flags`);
}
console.log(`pages covered: ${pages.length}, distinct: ${new Set(pages).size}`);
