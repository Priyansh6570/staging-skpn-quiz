// Folds one batch file into vidya-kala.json and advances vk-progress.json.
//
//   node scripts/vk-merge-batch.mjs <batch-file.json>
//
// A batch either opens an entry or extends one that an earlier batch left open, so the merge is by
// key: blocks, shloka, pages, figures, flags and subheadings append in page order. Re-running the
// same batch is refused rather than duplicated — that is what makes the job resumable.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const batchPath = process.argv[2];
if (!batchPath) { console.error("usage: vk-merge-batch.mjs <batch-file.json>"); process.exit(1); }

const batch = JSON.parse(readFileSync(batchPath, "utf8"));
const doc = JSON.parse(readFileSync(join(ROOT, "vidya-kala.json"), "utf8"));
const prog = JSON.parse(readFileSync(join(ROOT, "vk-progress.json"), "utf8"));
const map = JSON.parse(readFileSync(join(ROOT, "vk-map.json"), "utf8"));

const already = batch.files.filter((f) => prog.completedFiles.includes(f));
if (already.length) {
  console.error(`refusing: these files are already recorded as done: ${already.join(", ")}`);
  process.exit(1);
}

const expected = map.extractionPlan.order.slice(prog.completedFiles.length, prog.completedFiles.length + batch.files.length);
if (JSON.stringify(expected) !== JSON.stringify(batch.files)) {
  console.error(`refusing: batch files do not match the plan.\n  plan:  ${expected.join(" ")}\n  batch: ${batch.files.join(" ")}`);
  process.exit(1);
}

for (const incoming of batch.entries ?? []) {
  const existing = doc.entries.find((e) => e.key !== null && e.key === incoming.key);
  if (!existing) {
    doc.entries.push({ nameHi: null, glossHi: null, shloka: [], figures: [], flags: [], subheadingsSeen: [], ...incoming });
    continue;
  }
  existing.descriptionHi.push(...(incoming.descriptionHi ?? []));
  existing.shloka.push(...(incoming.shloka ?? []));
  existing.figures.push(...(incoming.figures ?? []));
  existing.flags.push(...(incoming.flags ?? []));
  existing.subheadingsSeen.push(...(incoming.subheadingsSeen ?? []));
  existing.sourcePages = [...new Set([...existing.sourcePages, ...incoming.sourcePages])].sort((a, b) => a - b);
  if (incoming.complete !== undefined) existing.complete = incoming.complete;
  // The flag noting the entry was cut off is stale once the rest of the section arrives.
  if (existing.complete) existing.flags = existing.flags.filter((f) => !/continues past printed/.test(f.detail ?? ""));
}

doc.structuralPages.push(...(batch.structuralPages ?? []));
doc.unmatched.push(...(batch.unmatched ?? []));
doc.pageLog.push(...batch.pageLog);

prog.completedFiles.push(...batch.files);
prog.batchesDone = batch.batch;
prog.contentPagesDone = prog.completedFiles.length;
prog.lastCompletedFile = batch.files.at(-1);
prog.lastCompletedPrintedPage = Number(batch.files.at(-1)) + 27;
prog.openEntries = doc.entries.filter((e) => !e.complete).map((e) => ({ key: e.key, reason: "section continues into a later batch" }));
const done = prog.completedFiles.length;
prog.nextBatch = done >= map.extractionPlan.order.length
  ? null
  : { batch: batch.batch + 1, files: map.extractionPlan.order.slice(done, done + 10), note: `Slice of vk-map.json extractionPlan.order at offset ${done}. Generated, not hand-written.` };
prog.status = prog.nextBatch ? `batch ${batch.batch} merged` : "all batches merged";

writeFileSync(join(ROOT, "vidya-kala.json"), `${JSON.stringify(doc, null, 2)}\n`);
writeFileSync(join(ROOT, "vk-progress.json"), `${JSON.stringify(prog, null, 2)}\n`);

console.log(`batch ${batch.batch} merged: ${batch.files.length} files, printed ${Number(batch.files[0]) + 27}-${prog.lastCompletedPrintedPage}`);
console.log(`entries now ${doc.entries.length}, open: ${prog.openEntries.map((e) => e.key).join(", ") || "none"}`);
console.log(`progress ${prog.contentPagesDone}/${prog.contentPagesTotal} content pages, next batch: ${prog.nextBatch ? prog.nextBatch.files.join(" ") : "none"}`);
