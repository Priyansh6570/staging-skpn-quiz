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
// The card floats clear of the bar rather than inside it, so a collapsed notice cannot thicken the
// chrome: the top offset clears the 69px bar and leaves a gap, and the dock is inert to pointers
// except over the card itself. The ring keeps pulsing after the drop-in because the date
// announcement is the one thing every visitor arrives looking for; it animates box-shadow only, so
// it composes with the entry keyframe rather than fighting it.
const NOTICE_CSS = `
@keyframes skpn-notice-in { from { opacity: 0; transform: translateY(-20px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes skpn-notice-ring {
  0%, 100% { box-shadow: 0 2px 4px rgba(20,32,62,.06), 0 18px 40px rgba(20,32,62,.2), 0 0 0 0 rgba(232,193,115,0); }
  50% { box-shadow: 0 2px 4px rgba(20,32,62,.06), 0 18px 40px rgba(20,32,62,.2), 0 0 0 9px rgba(232,193,115,.26); }
}
@keyframes skpn-notice-beat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.14); } }
[data-e~="noticedock"] {
  position: fixed; left: 0; right: 0; top: 84px; z-index: 55;
  display: flex; justify-content: center; padding: 0 30px; pointer-events: none;
}
[data-e~="noticedock"] > * { pointer-events: auto; }
[data-e~="noticedock"] :focus-visible { outline: 2px solid #14203E; outline-offset: 2px; }
[data-e~="noticecard"] { width: min(100%, 720px); }
@media (max-width: 700px) {
  [data-e~="noticedock"] { top: 80px; padding: 0 14px; }
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

// components/VidyaKalaIndex.tsx and components/VidyaKalaEntry.tsx — the /vidya-kala pages. No design
// source: the export never had them. Two things here cannot be inline styles.
//
// First, long-form Devanagari. The measure is set by measurement, not by eye: at 19px this font
// averages ~7.75px per Devanagari cluster, so a 66ch cap rendered 77 characters per line. 48ch
// lands it at ~65, inside the 60-70 the brief asks for — `ch` is defined from the font's "0" and
// badly overestimates Devanagari. line-height is 1.95 because matras above and conjuncts below need
// more leading than Latin at the same size; the 15,922-character Samaveda entry is the case that
// proves it, and 1.6 makes that page unreadable.
//
// Second, the taxonomy. The 4/6/4 grouping is the only real hierarchy in the content, so each group
// gets its own accent from the logo palette and its own column count: the four Vedas sit widest,
// the six Vedangas tighten to three, the other four return to the Veda rhythm. The accent is keyed
// off data-vkg rather than a class per group so the markup stays in the export's attribute idiom.
//
// The plate grid is built on the figures' true 865x865 — aspect-ratio:1 on the frame means a
// missing image collapses the frame to nothing instead of leaving a ragged hole, which is what
// renders today while figures[].file is null throughout.
const VIDYAKALA_CSS = `
/* ---- home: the drifting name columns ---- */
@keyframes vk-drift { from { transform: translate3d(0,0,0); } to { transform: translate3d(0,-50%,0); } }
[data-e~="vkmarquee"] {
  position: relative; display: grid; gap: 18px; grid-template-columns: repeat(3, minmax(0,1fr));
  height: 420px; overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 16%, #000 84%, transparent);
  mask-image: linear-gradient(180deg, transparent, #000 16%, #000 84%, transparent);
}
[data-e~="vkcol"] { will-change: transform; animation: vk-drift linear infinite; }
[data-e~="vkcol"][data-vkc="0"] { animation-duration: 58s; }
[data-e~="vkcol"][data-vkc="1"] { animation-duration: 74s; animation-direction: reverse; }
[data-e~="vkcol"][data-vkc="2"] { animation-duration: 66s; }
[data-e~="vkname"] {
  display: block; padding: 9px 0; font-family: 'Noto Serif Devanagari', serif;
  font-size: 20px; line-height: 1.5; color: rgba(255,249,236,.44); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
[data-e~="vkname"][data-vkhi="1"] { color: #FFF9EC; }
/* Without motion the columns stand still, which is the intended fallback: the names are the point. */
@media (prefers-reduced-motion: reduce) {
  [data-e~="vkmarquee"] { height: 300px; }
}
@media (max-width: 900px) {
  [data-e~="vkmarquee"] { grid-template-columns: repeat(2, minmax(0,1fr)); height: 330px; }
}
@media (max-width: 560px) {
  [data-e~="vkmarquee"] { grid-template-columns: minmax(0,1fr); height: 260px; }
  [data-e~="vkname"] { font-size: 18px; }
}

/* ---- tabs ---- */
[data-e~="vktabs"] { display: inline-flex; gap: 6px; padding: 6px; border-radius: 999px; background: rgba(47,69,110,.07); }
[data-e~="vktab"] {
  display: inline-flex; align-items: center; text-decoration: none;
  min-height: 46px; padding: 11px 26px; border: 0; border-radius: 999px; cursor: pointer;
  font-family: 'Noto Serif Devanagari', serif; font-size: 17.5px; line-height: 1.4;
  background: transparent; color: #46506A; transition: background .2s ease, color .2s ease;
}
[data-e~="vktab"][aria-selected="true"] { background: #2F456E; color: #FFF9EC; }
[data-e~="vktab"]:focus-visible { outline: 2px solid #2F456E; outline-offset: 3px; }

/* ---- vidya taxonomy: the one real hierarchy, so it gets the strongest structure ---- */
[data-e~="vkband"] { position: relative; padding: 34px 0 38px; border-top: 1px solid rgba(47,69,110,.14); }
[data-e~="vkband"]:first-child { border-top: 0; }
[data-e~="vkband"][data-vkg="0"] { --vk-accent: #2F456E; }
[data-e~="vkband"][data-vkg="1"] { --vk-accent: #48887B; }
[data-e~="vkband"][data-vkg="2"] { --vk-accent: #A02B2D; }
[data-e~="vkbandhead"] { display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 20px; margin-bottom: 22px; }
[data-e~="vkglabel"] { color: var(--vk-accent); }
[data-e~="vkghost"] {
  font-family: 'Noto Serif Devanagari', serif; font-size: clamp(56px, 8vw, 104px); line-height: .82;
  color: var(--vk-accent); opacity: .13; font-variant-numeric: tabular-nums; user-select: none;
}
[data-e~="vkbandgrid"] { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0,1fr)); }
[data-e~="vkbandgrid"][data-vkg="1"] { grid-template-columns: repeat(3, minmax(0,1fr)); }
[data-e~="vkvcard"] {
  position: relative; display: block; padding: 22px 24px 24px; border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--vk-accent) 22%, transparent);
  background: #FFFDF8; text-decoration: none; color: inherit; overflow: hidden;
  transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;
}
[data-e~="vkvcard"]::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--vk-accent);
  opacity: .5; transition: opacity .2s ease;
}
[data-e~="vkvcard"]:hover { border-color: var(--vk-accent); transform: translateY(-3px); box-shadow: 0 14px 30px rgba(20,32,62,.09); }
[data-e~="vkvcard"]:hover::before { opacity: 1; }
[data-e~="vkvcard"]:focus-visible { outline: 2px solid var(--vk-accent); outline-offset: 3px; }

/* ---- kala index: no images, so the numeral and the type do the work ---- */
@keyframes vk-rise { from { opacity: 0; transform: translate3d(0,10px,0); } to { opacity: 1; transform: none; } }
[data-e~="vkgrid"] { display: grid; gap: 12px; grid-template-columns: repeat(4, minmax(0,1fr)); }
[data-e~="vkkcard"] {
  position: relative; display: block; padding: 18px 18px 20px; border-radius: 16px;
  border: 1px solid rgba(47,69,110,.15); background: #FFFDF8; text-decoration: none; color: inherit;
  animation: vk-rise .32s cubic-bezier(.22,.61,.36,1) both;
  transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;
}
[data-e~="vkkcard"]:hover { border-color: #2F456E; transform: translateY(-3px); box-shadow: 0 14px 30px rgba(20,32,62,.09); }
[data-e~="vkkcard"]:focus-visible { outline: 2px solid #2F456E; outline-offset: 3px; }
[data-e~="vknum"] {
  display: block; margin-bottom: 10px; font-family: 'Noto Serif Devanagari', serif;
  font-size: 15px; line-height: 1; color: #A02B2D; font-variant-numeric: tabular-nums; letter-spacing: .06em;
}
[data-e~="vkempty"] { padding: 44px 0; font-size: 17px; line-height: 1.8; color: #6B6558; }

/* ---- entry: long-form reading ---- */
[data-e~="vkread"] { display: grid; gap: 44px; grid-template-columns: minmax(0,1fr) 148px; align-items: start; }
[data-e~="vkprose"] { max-width: 48ch; font-size: 19px; line-height: 1.95; }
[data-e~="vkprose"] p { margin: 0 0 1.35em; text-wrap: pretty; }
[data-e~="vkprose"] p:last-child { margin-bottom: 0; }
[data-e~="vkpage"] { scroll-margin-top: 96px; }

[data-e~="vkrail"] { position: sticky; top: 96px; display: flex; flex-direction: column; gap: 2px; }
[data-e~="vkraillink"] {
  display: block; padding: 7px 12px; border-left: 2px solid rgba(47,69,110,.16);
  font-size: 14.5px; line-height: 1.6; color: #7A7466; text-decoration: none;
  font-variant-numeric: tabular-nums; transition: color .18s ease, border-color .18s ease;
}
[data-e~="vkraillink"]:hover { color: #2F456E; border-left-color: #2F456E; }
[data-e~="vkraillink"][aria-current="true"] { color: #2F456E; border-left-color: #2F456E; font-weight: 600; }

[data-e~="vkprogress"] { position: fixed; left: 0; top: 0; right: 0; height: 3px; z-index: 60; background: transparent; }
[data-e~="vkprogress"] span { display: block; height: 100%; background: linear-gradient(90deg, #2F456E, #48887B); transform-origin: 0 50%; }

/* Shlokas carry these pages. Distinct face, distinct colour, never in the prose flow. */
[data-e~="vkshloka"] { margin: 46px 0; padding: 30px 0 0; border: 0; text-align: center; }
[data-e~="vkshloka"] q { quotes: none; }
[data-e~="vkrule"] { display: block; width: 58px; height: 2px; margin: 0 auto 24px; border-radius: 2px; background: #A02B2D; opacity: .55; }
[data-e~="vkverse"] {
  display: block; margin: 0 auto; max-width: 30em;
  font-family: 'Noto Serif Devanagari', serif; font-weight: 600;
  font-size: clamp(21px, 2.6vw, 28px); line-height: 1.9; color: #2F456E;
  white-space: pre-line; text-wrap: balance;
}
[data-e~="vkcite"] { display: block; margin-top: 16px; font-size: 14.5px; line-height: 1.7; color: #8A8474; font-variant-numeric: tabular-nums; }

[data-e~="vknav"] { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0,1fr)); }
[data-e~="vknavlink"] {
  display: block; padding: 20px 22px; border-radius: 16px; border: 1px solid rgba(47,69,110,.16);
  background: #FFFDF8; text-decoration: none; color: inherit;
  transition: border-color .2s ease, transform .2s ease;
}
[data-e~="vknavlink"]:hover { border-color: #2F456E; transform: translateY(-2px); }
[data-e~="vknavlink"]:focus-visible { outline: 2px solid #2F456E; outline-offset: 2px; }

@media (max-width: 1180px) {
  [data-e~="vkgrid"] { grid-template-columns: repeat(3, minmax(0,1fr)); }
}
@media (max-width: 1080px) {
  [data-e~="vkread"] { grid-template-columns: minmax(0,1fr); gap: 26px; }
  [data-e~="vkrail"] { position: static; flex-direction: row; flex-wrap: wrap; gap: 6px; }
  [data-e~="vkraillink"] { border-left: 0; border-bottom: 2px solid rgba(47,69,110,.16); }
  [data-e~="vkraillink"][aria-current="true"] { border-bottom-color: #2F456E; }
  [data-e~="vkbandgrid"][data-vkg="1"] { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 820px) {
  [data-e~="vkgrid"] { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 620px) {
  [data-e~="vkprose"] { font-size: 18px; line-height: 1.9; }
  [data-e~="vkgrid"] { grid-template-columns: minmax(0,1fr); }
  [data-e~="vkbandgrid"], [data-e~="vkbandgrid"][data-vkg="1"] { grid-template-columns: minmax(0,1fr); }
  [data-e~="vknav"] { grid-template-columns: minmax(0,1fr); }
  [data-e~="vkbandhead"] { grid-template-columns: minmax(0,1fr); }
  [data-e~="vkghost"] { display: none; }
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

out += `\n/* ---------- vidya-kala pages (no design source) ---------- */\n`;
out += `${renderGroup(parseRules(VIDYAKALA_CSS, "VidyaKala"), null)}\n`;

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
