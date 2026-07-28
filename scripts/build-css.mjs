// Rebuilds app/globals.css from the <style> blocks in design/*.dc.html.
//
// The export scopes CSS per page, and the same [data-e~="..."] selectors carry different values on
// different pages. Concatenated into one stylesheet the last file silently wins, so every rule that
// belongs to exactly one page is prefixed with [data-page="<Slug>"]. Declarations are copied
// verbatim: only selectors change.
//
// Run:  node scripts/build-css.mjs

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESIGN = join(ROOT, "design");
const OUT = join(ROOT, "app", "globals.css");

// Rendered inside other pages, so their rules can never carry a [data-page] prefix.
const COMPONENTS = new Set(["SiteHeader", "SiteFooter", "CtaBox", "Leadership"]);

// The one place the seven per-page reduced-motion blocks are unified. Text is copied from the
// Home v5 / Rules variant, which is the superset of the two that exist in the export.
const REDUCED_MOTION_BODY = " animation: none !important; transition: none !important; ";

// components/CompetitionNotice.tsx has no design source — it exists only while the competition is
// closed. Everything that cannot be an inline style lives here: keyframes, the pointer-events
// discipline that keeps the dock from swallowing taps, the focus ring, and the mobile geometry.
// The entry animation is declared with `both`, so the reduced-motion block below (animation: none)
// leaves the notice at its final, visible state rather than hiding it.
const NOTICE_CSS = `
@keyframes skpn-notice-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
[data-e~="noticedock"] > * { pointer-events: auto; }
[data-e~="noticedock"] :focus-visible, [data-e~="noticedock"]:focus-visible { outline: 2px solid #14203E; outline-offset: 2px; }
@media (max-width: 700px) {
  [data-e~="noticedock"] { left: 12px; right: 12px; bottom: 12px; }
  [data-e~="noticecard"] { max-width: none; }
  [data-e~="noticeroom"] { padding-bottom: 104px !important; }
}
`;

// components/PageAura.tsx — the light field behind the plain body sections. The blob motion is
// deliberately slow and small: it should register as the page breathing, not as something moving.
// The veil reuses the hero's own star-field idea in warm ink, and is dropped on small screens where
// a 460px tile is too dense to read as texture and the paint cost lands on the weakest devices.
const AURA_CSS = `
@keyframes skpn-aura-a { 0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: .88; } 50% { transform: translate3d(3%,4%,0) scale(1.09); opacity: 1; } }
@keyframes skpn-aura-b { 0%, 100% { transform: translate3d(0,0,0) scale(1.05); opacity: .72; } 50% { transform: translate3d(-4%,3%,0) scale(1); opacity: 1; } }
@keyframes skpn-aura-c { 0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: .78; } 50% { transform: translate3d(2%,-3%,0) scale(1.08); opacity: 1; } }
@keyframes skpn-aura-drift { from { transform: translate3d(0,0,0); } to { transform: translate3d(-38px,-26px,0); } }
[data-e~="auraveil"] {
  background-image:
    radial-gradient(1.6px 1.6px at 14% 22%, rgba(138,96,21,.22), transparent 60%),
    radial-gradient(1.4px 1.4px at 72% 14%, rgba(138,96,21,.18), transparent 60%),
    radial-gradient(1.8px 1.8px at 38% 68%, rgba(138,96,21,.16), transparent 60%),
    radial-gradient(1.3px 1.3px at 86% 76%, rgba(138,96,21,.20), transparent 60%),
    radial-gradient(1.5px 1.5px at 58% 42%, rgba(138,96,21,.14), transparent 60%),
    radial-gradient(1.4px 1.4px at 24% 88%, rgba(138,96,21,.18), transparent 60%);
  background-size: 460px 460px;
}
@media (max-width: 700px) {
  [data-e~="aurablob"] { width: 112vw !important; height: 112vw !important; }
  [data-e~="auraveil"] { display: none !important; }
}
`;

// The About page's trustee board (components/Leadership.tsx, LeadershipBoard). Four portrait cards
// on a wide screen; below 980px each card turns on its side so the photograph stays large and the
// Devanagari names keep a full-width column instead of wrapping to four lines in a narrow one.
// !important throughout because these override inline styles, exactly as the export's own
// responsive rules do.
const BOARD_CSS = `
@media (max-width: 980px) {
  [data-e~="boardgrid"] { grid-template-columns: minmax(0,1fr) !important; gap: 16px !important; }
  [data-e~="boardcard"] { flex-direction: row !important; align-items: center !important; gap: 20px !important; padding: 18px !important; }
  [data-e~="boardphoto"] { width: 136px !important; flex: 0 0 auto !important; aspect-ratio: 1 !important; }
}
@media (max-width: 560px) {
  [data-e~="boardcard"] { gap: 14px !important; padding: 14px !important; }
  [data-e~="boardphoto"] { width: 96px !important; border-radius: 14px !important; }
  [data-e~="boardphoto"] > span { border-radius: 14px !important; }
}
`;

const slug = (file) => file.replace(/\.dc\.html$/, "").replace(/\s+/g, "-");

// --- parse ------------------------------------------------------------------------------------

function parseRules(css, file) {
  const rules = [];
  (function walk(text, context) {
    let depth = 0;
    let start = 0;
    let selector = null;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === "{") {
        if (depth === 0) {
          selector = text.slice(start, i).trim();
          start = i + 1;
        }
        depth++;
      } else if (c === "}") {
        depth--;
        if (depth === 0) {
          const body = text.slice(start, i);
          if (/^@(media|supports)/.test(selector)) {
            walk(body, context ? `${context} && ${selector}` : selector);
          } else {
            rules.push({ file, context, selector, body, atRule: selector.startsWith("@") });
          }
          start = i + 1;
        }
      }
    }
  })(css, null);
  return rules;
}

const files = readdirSync(DESIGN).filter((f) => f.endsWith(".dc.html")).sort();
const sources = new Map(files.map((f) => [f, readFileSync(join(DESIGN, f), "utf8")]));

const all = [];
for (const [file, src] of sources) {
  const block = src.match(/<style>([\s\S]*?)<\/style>/);
  if (block) all.push(...parseRules(block[1], file));
}

// --- classify ---------------------------------------------------------------------------------

const norm = (s) => s.replace(/\s+/g, " ").trim();
const keyOf = (r) => `${r.context ?? ""}||${norm(r.selector)}`;

const byKey = new Map();
for (const r of all) {
  if (!byKey.has(keyOf(r))) byKey.set(keyOf(r), []);
  byKey.get(keyOf(r)).push(r);
}

// A rule is shared if the identical (context, selector, declarations) triple appears in more than
// one design file. Those are the reset, the header/footer chrome and the shared layout switches.
const sharedKeys = new Set();
const duplicates = [];
for (const [key, rs] of byKey) {
  if (rs.length < 2) continue;
  const bodies = new Set(rs.map((r) => norm(r.body)));
  if (bodies.size !== 1) continue;
  if (new Set(rs.map((r) => r.file)).size < 2) continue;
  sharedKeys.add(key);
  duplicates.push({ key, files: rs.map((r) => slug(r.file)) });
}

const isReducedMotion = (r) => (r.context ?? "").includes("prefers-reduced-motion");
const isShared = (r) =>
  COMPONENTS.has(slug(r.file)) || sharedKeys.has(keyOf(r)) || r.atRule;

// --- prefix -----------------------------------------------------------------------------------

function splitSelectors(list) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      out.push(list.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(list.slice(start).trim());
  return out.filter(Boolean);
}

const prefix = (selectorList, page) =>
  splitSelectors(selectorList)
    .map((s) => `[data-page="${page}"] ${s}`)
    .join(", ");

// --- emit -------------------------------------------------------------------------------------

function renderGroup(rules, page) {
  // Preserve source order, and re-nest anything that came out of an @media block.
  const lines = [];
  let openContext = null;
  const close = () => {
    if (openContext) {
      for (let i = openContext.split(" && ").length; i > 0; i--) lines.push(`${"  ".repeat(i - 1)}}`);
      openContext = null;
    }
  };
  for (const r of rules) {
    if ((r.context ?? null) !== openContext) {
      close();
      if (r.context) {
        openContext = r.context;
        r.context.split(" && ").forEach((q, i) => lines.push(`${"  ".repeat(i)}${q} {`));
      }
    }
    const indent = "  ".repeat(r.context ? r.context.split(" && ").length : 0);
    const selector = r.atRule || !page ? r.selector : prefix(r.selector, page);
    lines.push(`${indent}${selector} {${r.body}}`);
  }
  close();
  return lines.join("\n");
}

const shared = all.filter((r) => !isReducedMotion(r) && isShared(r));
const seenShared = new Set();
const sharedOnce = shared.filter((r) => {
  const k = `${keyOf(r)}||${norm(r.body)}`;
  if (seenShared.has(k)) return false;
  seenShared.add(k);
  return true;
});

const pages = [...new Set(all.map((r) => slug(r.file)))]
  .filter((p) => !COMPONENTS.has(p))
  .sort();

let out = `/* Generated by scripts/build-css.mjs from design/*.dc.html. Do not edit by hand.
   Declarations are copied verbatim from the export; page-specific rules gain a [data-page]
   prefix because the same [data-e~="..."] selectors carry different values on different pages.
   Every page wrapper must therefore set data-page to its design-file slug:
${pages.map((p) => `     ${p}`).join("\n")}
   Rules for SiteHeader, SiteFooter, CtaBox and Leadership stay unprefixed — those components
   render inside other pages. @keyframes cannot be scoped and are global by definition. */

/* ---------- shared ---------- */
`;
out += `${renderGroup(sharedOnce, null)}\n`;

// The boot loader's keyframes are design CSS too — they just live in assets/site.js, which the
// export injects at parse time rather than declaring in a <helmet>.
const shellJs = readFileSync(join(DESIGN, "assets", "site.js"), "utf8");
const shellCss = [...shellJs.matchAll(/"((?:[^"\\]|\\.)*)"/g)]
  .map((m) => m[1])
  .filter((s) => /^(@keyframes|#skpn-loader|@media)/.test(s.trim()))
  .join("");
if (shellCss) {
  out += `\n/* ---------- shell (assets/site.js) ---------- */\n`;
  out += `${renderGroup(parseRules(shellCss, "site.js"), null)}\n`;
}

for (const page of pages) {
  const rules = all.filter((r) => slug(r.file) === page && !isReducedMotion(r) && !isShared(r));
  if (!rules.length) continue;
  out += `\n/* ---------- ${page} ---------- */\n`;
  out += `${renderGroup(rules, page)}\n`;
}

out += `\n/* ---------- competition notice (no design source) ---------- */\n`;
out += `${renderGroup(parseRules(NOTICE_CSS, "CompetitionNotice"), null)}\n`;

out += `\n/* ---------- page aura (no design source) ---------- */\n`;
out += `${renderGroup(parseRules(AURA_CSS, "PageAura"), null)}\n`;

out += `\n/* ---------- About trustee board (no design source) ---------- */\n`;
out += `${renderGroup(parseRules(BOARD_CSS, "LeadershipBoard"), null)}\n`;

out += `\n/* ---------- reduced motion, last so it wins ---------- */\n`;
out += `@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after {${REDUCED_MOTION_BODY}}\n}\n`;

writeFileSync(OUT, out, "utf8");

// --- verification -----------------------------------------------------------------------------

const rebuilt = parseRules(readFileSync(OUT, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""), "globals.css");
const wanted = new Map();
for (const r of all) {
  if (isReducedMotion(r)) continue;
  for (const s of r.atRule ? [r.selector] : splitSelectors(r.selector)) {
    const page = COMPONENTS.has(slug(r.file)) || sharedKeys.has(keyOf(r)) || r.atRule ? null : slug(r.file);
    wanted.set(`${r.context ?? ""}||${page ? `[data-page="${page}"] ` : ""}${norm(s)}`, norm(r.body));
  }
}
const got = new Map();
for (const r of rebuilt) {
  for (const s of r.atRule ? [r.selector] : splitSelectors(r.selector)) {
    got.set(`${r.context ?? ""}||${norm(s)}`, norm(r.body));
  }
}
let missing = 0;
let changed = 0;
for (const [k, body] of wanted) {
  if (!got.has(k)) { missing++; console.log(`MISSING  ${k}`); }
  else if (got.get(k) !== body) { changed++; console.log(`CHANGED  ${k}\n   was ${body}\n   now ${got.get(k)}`); }
}
console.log(`\n${all.length} source rules -> ${rebuilt.length} emitted`);
console.log(`declaration check: ${wanted.size} selector/context pairs, ${missing} missing, ${changed} value changes`);

// --- report -----------------------------------------------------------------------------------

const markupOf = (file) => (sources.get(file).match(/<x-dc>([\s\S]*?)<\/x-dc>/) ?? ["", ""])[1];
const tokensIn = (selector) => [...selector.matchAll(/\[data-(?:e~|g)="([^"]+)"\]/g)].map((m) => m[1]);
const usesToken = (file, token) => {
  const m = markupOf(file);
  return m.includes(`data-e="${token}"`) || m.includes(`data-e="${token} `) || m.includes(` ${token}"`)
    || m.includes(`data-g="${token}"`);
};

console.log(`\nhoisted to shared (identical in >1 file): ${duplicates.length}`);
const widened = [];
for (const d of duplicates) {
  const declaredBy = new Set(d.files);
  const tokens = tokensIn(d.key.split("||")[1]);
  if (!tokens.length) continue;
  for (const file of files) {
    const s = slug(file);
    if (declaredBy.has(s) || COMPONENTS.has(s)) continue;
    if (tokens.some((t) => usesToken(file, t))) widened.push({ rule: d.key, page: s });
  }
}
if (widened.length) {
  console.log(`\nSCOPE WIDENED — page uses the attribute but never declared the rule:`);
  for (const w of widened) console.log(`  ${w.page.padEnd(14)} ${w.rule}`);
} else {
  console.log(`\nno page gains a hoisted attribute rule it did not already declare`);
}

const pageSlugs = files.map(slug).filter((s) => !COMPONENTS.has(s));
console.log(`\nhoisted rules that now reach pages which never declared them:`);
let anyGain = false;
for (const d of duplicates) {
  if (tokensIn(d.key.split("||")[1]).length) continue; // attribute rules already checked above
  const gains = pageSlugs.filter((p) => !d.files.includes(p));
  if (!gains.length) continue;
  anyGain = true;
  console.log(`  ${d.key.split("||")[1].padEnd(42)} + ${gains.join(", ")}`);
}
if (!anyGain) console.log(`  none`);

const rmFiles = [...new Set(all.filter(isReducedMotion).map((r) => slug(r.file)))].sort();
const rmGains = files.map(slug).filter((s) => !rmFiles.includes(s));
console.log(`\nreduced-motion declared by: ${rmFiles.join(", ")}`);
console.log(`now also applies to:        ${rmGains.join(", ")}`);
