// Copies every image the design markup actually references from design/ into public/, at the exact
// path the markup asks for. Percent-encoded references (uploads/dr%20mohan%20yadav.jpg) are decoded
// to the real filename so the URL resolves.
//
// Run:  node scripts/copy-assets.mjs

import { readdir, readFile, mkdir, copyFile, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESIGN = join(ROOT, "design");
const PUBLIC = join(ROOT, "public");

const MEDIA = /\.(png|jpe?g|webp|gif|svg|mp4|webm|avif|ico)$/i;

// The answer key ships as uploads/quiz-questions.json and Quiz.dc.html fetches it. Nothing that is
// not an image is copied, so it cannot reach a served path by accident.
const isMedia = (path) => MEDIA.test(path);

const files = (await readdir(DESIGN)).filter((f) => f.endsWith(".dc.html"));
const markup = await Promise.all(files.map((f) => readFile(join(DESIGN, f), "utf8")));

const candidates = [];
for (const dir of ["uploads", "assets"]) {
  for (const name of await readdir(join(DESIGN, dir))) {
    if (isMedia(name)) candidates.push(`${dir}/${name}`);
  }
}

const referenced = candidates.filter((asset) => {
  const encoded = asset.split("/").map(encodeURIComponent).join("/");
  return markup.some((m) => m.includes(asset) || m.includes(encoded));
});

let bytes = 0;
for (const asset of referenced.sort()) {
  const from = join(DESIGN, asset);
  const to = join(PUBLIC, asset);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
  const size = (await stat(to)).size;
  bytes += size;
  console.log(`${asset.padEnd(38)} ${(size / 1024).toFixed(0).padStart(6)} KB`);
}

console.log(`\n${referenced.length} asset(s), ${(bytes / 1024 / 1024).toFixed(1)} MB total`);

const unreferenced = candidates.filter((a) => !referenced.includes(a));
if (unreferenced.length) {
  console.log(`\nnot copied — present in design/ but referenced by no .dc.html:`);
  for (const a of unreferenced.sort()) console.log(`  ${a}`);
}
