import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import { applyTransforms } from "./i18n-transforms.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESIGN = join(ROOT, "design");
const OUT_DIR = join(ROOT, "lib", "i18n");

// Strings are never re-typed: each design file's <script type="text/x-dc"> block is evaluated in a
// sandbox and the resulting values are serialised straight out. Nothing here reads a string by eye.

// AUDIT.md §6.1 — fake profile and attempt data that must not survive the port.
const FIXTURES = new Set(["Profile.STUDENT", "Profile.ATTEMPTS"]);

// Keys whose values are styling or routing, not copy.
const NON_COPY_KEYS = new Set([
  "href", "key", "id", "img", "src", "icon", "style",
  "bg", "fg", "border", "color", "blob", "rule", "accent", "tone", "shadow", "halo", "ring",
  "dotBg", "dotHalo", "stepFg", "pillBg", "pillBorder", "pillFg", "iconBg", "iconFg",
]);

const isCopy = (s) => {
  if (!s.trim()) return false;
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return false;
  if (/^(https?:|mailto:|tel:|data:|\.\/|\/)/.test(s)) return false;
  if (/\.dc\.html/.test(s)) return false;
  if (/^(uploads|assets)\//.test(s)) return false;
  if (/(linear-gradient|radial-gradient|conic-gradient|translate3d|rgba?\(|cubic-bezier|var\(--)/.test(s)) return false;
  // A bare number is copy ("102" scholarships, "30" questions); a number with a CSS unit is not.
  if (/^-?[\d.]+(px|%|em|rem|vw|vh|vmin|vmax|deg|s|ms|fr|cqw|ch)$/.test(s)) return false;
  return true;
};

const EMPTY = Symbol("empty");
const isEmpty = (v) => v === EMPTY || v === undefined
  || (Array.isArray(v) && v.length === 0)
  || (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);

const dropped = [];
const forkConflicts = [];

function project(node, lang, path) {
  if (typeof node === "string") {
    if (isCopy(node)) return node;
    dropped.push({ path, value: node });
    return EMPTY;
  }
  if (typeof node === "number" || typeof node === "boolean" || node == null) return EMPTY;
  if (typeof node === "function") return EMPTY;

  if (Array.isArray(node)) {
    const out = node.map((n, i) => project(n, lang, `${path}[${i}]`));
    if (out.every(isEmpty)) return EMPTY;
    return out.map((v) => (isEmpty(v) ? null : v));
  }

  const keys = Object.keys(node);
  if (keys.includes("hi") && keys.includes("en")) {
    const forked = project(node[lang], lang, `${path}.${lang}`);
    const rest = {};
    for (const k of keys) {
      if (k === "hi" || k === "en" || NON_COPY_KEYS.has(k)) continue;
      const v = project(node[k], lang, `${path}.${k}`);
      if (!isEmpty(v)) rest[k] = v;
    }
    if (Object.keys(rest).length === 0) return forked;
    if (forked && typeof forked === "object" && !Array.isArray(forked)) return { ...rest, ...forked };
    forkConflicts.push(path);
    return { ...rest, value: isEmpty(forked) ? null : forked };
  }

  const out = {};
  for (const k of keys) {
    if (NON_COPY_KEYS.has(k)) { dropped.push({ path: `${path}.${k}`, value: "(non-copy key)" }); continue; }
    const v = project(node[k], lang, `${path}.${k}`);
    if (!isEmpty(v)) out[k] = v;
  }
  return isEmpty(out) ? EMPTY : out;
}

// --- literal copy sitting in the markup rather than in the logic block ------------------------

const ATTR_KINDS = { alt: "alt", "aria-label": "ariaLabel", title: "title", placeholder: "placeholder" };

// The export has no English for these two. Supplied by the client, and applied to alt attributes
// only — the same Devanagari string is rendered body copy in Leadership, and substituting English
// there would change published copy rather than assistive text.
const EN_ALT_OVERRIDES = {
  "मध्यप्रदेश शासन": "Government of Madhya Pradesh",
  "श्रीकृष्ण पाथेय न्यास": "Shri Krishna Pathey Nyas",
};

const overridesApplied = [];

function markupLiterals(markup, lang, component) {
  const body = markup
    .replace(/<helmet[\s\S]*?<\/helmet>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");

  const counters = {};
  const out = {};
  const put = (kind, value) => {
    counters[kind] = counters[kind] ?? 0;
    const key = `${kind}${counters[kind]++}`;
    if (lang === "en" && kind === "alt" && value in EN_ALT_OVERRIDES) {
      overridesApplied.push(`${component}.markup.${key}`);
      out[key] = EN_ALT_OVERRIDES[value];
      return;
    }
    out[key] = value;
  };

  for (const m of body.matchAll(/\s(alt|aria-label|title|placeholder)="([^"]*)"/g)) {
    const value = m[2];
    if (value.includes("{{") || !value.trim()) continue;
    put(ATTR_KINDS[m[1]], value);
  }
  for (const m of body.matchAll(/>([^<>]*)</g)) {
    const text = m[1].replace(/\{\{[^}]*\}\}/g, "").trim();
    if (!text || !isCopy(text)) continue;
    put("text", text);
  }
  return out;
}

// --- copy that sits inside renderVals() rather than in a top-level table ----------------------

// AUDIT.md §6.1 fixtures: a fake student and a fake attempt date, which must not reach i18n.
const FIXTURE_VALUES = new Set(["अनन्या वर्मा", "Ananya Verma", "24 जुलाई 2026", "24 July 2026"]);

const STR = String.raw`"((?:[^"\\]|\\.)*)"`;
const HI_TEST = String.raw`(?:lang === "hi"|hi)`;
const PAIR_RE = new RegExp(String.raw`${HI_TEST}\s*\?\s*${STR}[^:?]*?:\s*${STR}`, "g");
const ARRAY_PAIR_RE = new RegExp(String.raw`${HI_TEST}\s*\?\s*\[([^\]]*)\]\s*:\s*\[([^\]]*)\]`, "g");
const BARE_ARRAY_RE = /\[((?:\s*"(?:[^"\\]|\\.)*"\s*,?)+)\]/g;

const parseList = (inner) => [...inner.matchAll(new RegExp(STR, "g"))].map((m) => m[1]);

const DEVANAGARI_RE = /[ऀ-ॿ]/;

/**
 * Returns { hi, en } pairs so both files stay index-aligned by construction. Only pairs whose
 * Hindi side is actually Devanagari are kept — the same ternary shape carries the language toggle
 * and a lot of colour switching, none of which is copy.
 */
function inlinePairs(script) {
  const found = [];
  const claimed = [];
  const claim = (m) => claimed.push([m.index, m.index + m[0].length]);
  const taken = (m) => claimed.some(([a, b]) => m.index >= a && m.index < b);
  const keep = (hi, en) => {
    if (!DEVANAGARI_RE.test(hi) || FIXTURE_VALUES.has(hi)) return;
    found.push({ index: found.length, hi, en });
  };

  for (const m of script.matchAll(ARRAY_PAIR_RE)) {
    claim(m);
    const [hiList, enList] = [parseList(m[1]), parseList(m[2])];
    hiList.forEach((hi, i) => keep(hi, enList[i] ?? hi));
  }
  for (const m of script.matchAll(PAIR_RE)) {
    if (taken(m)) continue;
    claim(m);
    keep(m[1], m[2]);
  }
  // A Devanagari array with no English sibling — the month names. Copied unchanged into both.
  for (const m of script.matchAll(BARE_ARRAY_RE)) {
    if (taken(m)) continue;
    for (const v of parseList(m[1])) keep(v, v);
  }
  return found.map(({ hi, en }) => ({ hi, en }));
}

// --- per-file extraction ---------------------------------------------------------------------

const componentName = (file) => file.replace(/\.dc\.html$/, "").replace(/[^A-Za-z0-9]+/g, "_");

function extract(file) {
  const src = readFileSync(join(DESIGN, file), "utf8");
  const name = componentName(file);

  const markupMatch = src.match(/<x-dc>([\s\S]*?)<\/x-dc>/);
  const scriptMatch = src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);

  const globals = {};
  if (scriptMatch) {
    const code = scriptMatch[1].replace(/^(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm, "globalThis.$2 =");
    const sandbox = {
      DCLogic: class {},
      console: { log() {}, warn() {}, error() {} },
      localStorage: { getItem: () => null, setItem() {} },
      document: { addEventListener() {}, removeEventListener() {} },
      window: {}, fetch: () => Promise.resolve({ json: () => ({}) }),
    };
    const ctx = createContext(sandbox);
    runInContext(code, ctx, { filename: file, timeout: 5000 });
    for (const [k, v] of Object.entries(sandbox)) {
      if (k in { DCLogic: 1, console: 1, localStorage: 1, document: 1, window: 1, fetch: 1 }) continue;
      globals[k] = v;
    }
  }

  const build = (lang) => {
    const out = {};
    for (const [varName, value] of Object.entries(globals)) {
      if (FIXTURES.has(`${name}.${varName}`)) continue;
      const projected = project(value, lang, `${name}.${varName}`);
      if (!isEmpty(projected)) out[varName] = projected;
    }
    if (markupMatch) {
      const lits = markupLiterals(markupMatch[1], lang, name);
      if (Object.keys(lits).length) out.markup = lits;
    }
    if (scriptMatch) {
      const pairs = inlinePairs(scriptMatch[1].slice(scriptMatch[1].indexOf("class Component")));
      if (pairs.length) out.inline = pairs.map((p) => p[lang]);
    }
    return out;
  };

  return { name, src, hi: build("hi"), en: build("en") };
}

// --- run -------------------------------------------------------------------------------------

const files = readdirSync(DESIGN).filter((f) => f.endsWith(".dc.html")).sort();
const extracted = files.map(extract);

const hi = {}, en = {};
for (const e of extracted) {
  if (Object.keys(e.hi).length) hi[e.name] = e.hi;
  if (Object.keys(e.en).length) en[e.name] = e.en;
}

// The boot loader lives in assets/site.js rather than a .dc.html, and its label is the one string
// the shell needs that no template carries. Copied out the same way, never re-typed.
const shellSource = readFileSync(join(DESIGN, "assets", "site.js"), "utf8");
const shellStrings = [...new Set(
  [...shellSource.matchAll(/'([^'\n\\]*(?:\\.[^'\n\\]*)*)'|"([^"\n\\]*(?:\\.[^"\n\\]*)*)"/g)]
    .map((m) => m[1] ?? m[2])
    // The loader's org and department lines are already extracted from SiteHeader; what is left
    // here is the one bare label. Markup fragments are not copy.
    .filter((s) => DEVANAGARI_RE.test(s) && !/[<>{}]/.test(s)),
)];
if (shellStrings.length) {
  hi.Shell = { inline: shellStrings };
  en.Shell = { inline: shellStrings };
}

// Client-requested copy edits, all derived from the strings above so nothing is re-typed.
const hiFinal = applyTransforms(hi, "hi");
const enFinal = applyTransforms(en, "en");

const banner = "// Generated by scripts/extract-strings.mjs from design/*.dc.html.\n"
  + "// Values are copied byte-for-byte out of the design export, then passed through\n"
  + "// scripts/i18n-transforms.mjs for the client's copy edits. Do not edit by hand,\n"
  + "// do not re-type Devanagari, and do not translate a missing string — re-run the script.\n\n";

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "hi.ts"), `${banner}export const hi = ${JSON.stringify(hiFinal, null, 2)};\n`, "utf8");
writeFileSync(join(OUT_DIR, "en.ts"), `${banner}export const en = ${JSON.stringify(enFinal, null, 2)};\n`, "utf8");

// --- verification ----------------------------------------------------------------------------

const parseBack = (f) => {
  const text = readFileSync(join(OUT_DIR, f), "utf8");
  return JSON.parse(text.slice(text.indexOf("= ") + 2, text.lastIndexOf(";")));
};
const hiBack = hi;   // pre-transform: the round-trip proves extraction, not the copy edits
const enBack = en;
const hiWritten = parseBack("hi.ts");
const enWritten = parseBack("en.ts");

const srcByName = new Map([...extracted.map((e) => [e.name, e.src]), ["Shell", shellSource]]);
const leaves = (node, path, acc = []) => {
  if (typeof node === "string") acc.push({ path, value: node });
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) leaves(v, `${path}.${k}`, acc);
  }
  return acc;
};

const DEVANAGARI = /[ऀ-ॿ]/;
const failures = [];
let hiChecked = 0;
for (const [name, tree] of Object.entries(hiBack)) {
  const src = srcByName.get(name);
  for (const { path, value } of leaves(tree, name)) {
    if (!DEVANAGARI.test(value)) continue;
    hiChecked++;
    if (src.includes(value)) continue;
    if (src.includes(JSON.stringify(value).slice(1, -1))) continue;
    failures.push({ path, value });
  }
}

const keyPaths = (node, path, acc = []) => {
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) keyPaths(v, `${path}.${k}`, acc);
  } else acc.push(path);
  return acc;
};
const hiKeys = new Set(keyPaths(hiBack, ""));
const enKeys = new Set(keyPaths(enBack, ""));
const hiOnly = [...hiKeys].filter((k) => !enKeys.has(k));
const enOnly = [...enKeys].filter((k) => !hiKeys.has(k));

const sameInBoth = [...hiKeys].filter((k) => enKeys.has(k)).filter((k) => {
  const get = (o) => k.split(".").slice(1).reduce((a, p) => a?.[p], o);
  const v = get(hiBack);
  return typeof v === "string" && DEVANAGARI.test(v) && v === get(enBack);
});

console.log(`files            ${files.length}`);
console.log(`hi leaf strings  ${leaves(hiWritten, "").length}`);
console.log(`en leaf strings  ${leaves(enWritten, "").length}`);
{
  const before = leaves(hi, "").map((l) => l.value);
  const after = leaves(hiWritten, "").map((l) => l.value);
  const changed = after.filter((v, i) => v !== before[i]).length;
  console.log(`copy edits applied by i18n-transforms: ${Math.abs(after.length - before.length)} new key(s), ${changed} string(s) rewritten`);
}
console.log(`devanagari verified byte-identical against source: ${hiChecked - failures.length}/${hiChecked}`);
if (failures.length) {
  console.log(`\nROUND-TRIP FAILURES (${failures.length}):`);
  for (const f of failures) console.log(`  ${f.path}\n    ${JSON.stringify(f.value)}`);
}
if (hiOnly.length || enOnly.length) {
  console.log(`\nKEY MISMATCH  hi-only ${hiOnly.length}, en-only ${enOnly.length}:`);
  for (const k of [...hiOnly, ...enOnly].slice(0, 60)) console.log(`  ${k}`);
}
if (overridesApplied.length) {
  console.log(`\nEN ALT OVERRIDES APPLIED (${overridesApplied.length}): ${overridesApplied.join(", ")}`);
}
if (sameInBoth.length) {
  const markupGaps = sameInBoth.filter((k) => k.includes(".markup."));
  const structural = sameInBoth.length - markupGaps.length;
  console.log(`\nNO ENGLISH IN SOURCE — Devanagari copied unchanged into en.ts (${sameInBoth.length}):`);
  console.log(`  ${structural} in mixed-language positional tables (KALAS / VIDYAS / DISTRICTS) — structural, not a gap`);
  console.log(`  ${markupGaps.length} markup literal(s) still unresolved:`);
  const get = (o, k) => k.split(".").slice(1).reduce((a, p) => a?.[p], o);
  const byValue = new Map();
  for (const k of markupGaps) {
    const v = get(hiBack, k);
    if (!byValue.has(v)) byValue.set(v, []);
    byValue.get(v).push(k.slice(1));
  }
  for (const [v, keys] of byValue) console.log(`    ${JSON.stringify(v)}  <- ${keys.join(", ")}`);
}
if (forkConflicts.length) console.log(`\nFORK CONFLICTS: ${forkConflicts.join(", ")}`);

const droppedCopyish = dropped.filter((d) => d.value !== "(non-copy key)" && /[A-Za-zऀ-ॿ]/.test(d.value));
console.log(`\ndropped values: ${dropped.length} (${droppedCopyish.length} contained letters — review):`);
for (const d of droppedCopyish.slice(0, 40)) console.log(`  ${d.path} = ${JSON.stringify(d.value)}`);
if (droppedCopyish.length > 40) console.log(`  … ${droppedCopyish.length - 40} more`);
