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

// The registration form's field, step-indicator and date-wheel states. The export drew the form's
// resting appearance and nothing else, so focus, invalid, disabled and completed-step all had to be
// authored. Every colour is one the Register export already uses — #14203E ink, #A03A2B error,
// #E8C173 gold, #DCD1BC rule — so this adds states, not a new palette. The selectors already carry
// their own [data-page] prefix, so renderGroup is given no page to add one.
const REGISTER_FORM_CSS = `
[data-page="Register"] [data-e~="field"] input,
[data-page="Register"] [data-e~="field"] button,
[data-page="Register"] [data-e~="control"] { transition: border-color .16s ease, box-shadow .16s ease, background-color .16s ease; }
[data-page="Register"] [data-e~="control"]:focus-within,
[data-page="Register"] [data-e~="field"] > input:focus,
[data-page="Register"] [data-e~="field"] > button:focus { border-color: #14203E; box-shadow: 0 0 0 3px rgba(20,32,62,.10); }
[data-page="Register"] [data-e~="field"][data-invalid="true"] [data-e~="control"],
[data-page="Register"] [data-e~="field"][data-invalid="true"] > input { border-color: #A03A2B; background: #FDF6F3; }
[data-page="Register"] [data-e~="field"][data-invalid="true"] [data-e~="control"]:focus-within { box-shadow: 0 0 0 3px rgba(160,58,43,.12); }
[data-page="Register"] [data-e~="field"] input:disabled { color: #7A6B4E; cursor: not-allowed; }
[data-page="Register"] [data-e~="control"]:has(input:disabled) { background: #F4F1EA; }
[data-page="Register"] [data-e~="fieldlink"] { color: #27408B; }
[data-page="Register"] [data-e~="stepsep"][data-done="true"] { background: #E8C173; }
[data-page="Register"] [data-e~="stepdot"] { transition: background-color .2s ease, color .2s ease, border-color .2s ease; }
[data-page="Register"] [data-e~="stepdot"][data-state="current"] { box-shadow: 0 0 0 4px rgba(20,32,62,.10); }
[data-page="Register"] [data-e~="wheel"] { scrollbar-width: none; -ms-overflow-style: none; }
[data-page="Register"] [data-e~="wheel"]::-webkit-scrollbar { width: 0; height: 0; }
[data-page="Register"] [data-e~="wheelfade"] { background: linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0) 24%, rgba(255,255,255,0) 76%, #FFFFFF 100%); }
[data-page="Register"] [data-e~="resend"]:disabled { cursor: default; }
`;

// components/OtpStep.tsx and components/OtpBoxes.tsx — the code screen, inline on both the sign-in
// and the registration page. Unprefixed because it is the same control on two pages, and scoped to
// its own tokens so it cannot reach either page's own field rules.
const OTP_CSS = `
[data-e~="otpbox"] { transition: border-color .16s ease, box-shadow .16s ease; }
[data-e~="otpbox"]:focus { outline: 0; border-color: #14203E; box-shadow: 0 0 0 3px rgba(20,32,62,.10); }
[data-e~="otpbox"]:disabled { color: #7A6B4E; background: #F4F1EA; cursor: not-allowed; }
[data-e~="verify"] [data-e~="control"]:has(input:disabled) { background: #F2ECE0; }
[data-e~="verify"] [data-e~="resend"]:disabled { cursor: default; }
/* Six boxes across a 320px phone leaves each one narrower than a fingertip at the resting size. */
@media (max-width: 420px) {
  [data-e~="otpboxes"] { gap: 6px; }
  [data-e~="otpbox"] { min-height: 52px; padding: 12px 2px; border-radius: 12px; font-size: 21px; }
}
`;

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

// components/VidyaKalaTeaser.tsx, VidyaKalaIndex.tsx, VidyaKalaDrawer.tsx and VidyaKalaEntry.tsx —
// the home section and the /vidya-kala surfaces. No design source: the export never had them, so
// this block is authored rather than copied, and it is the only place these four components get
// their geometry. Inline styles cannot express what any of it needs — keyframes, media queries,
// :hover, ::before, and the mask that makes the scrolling rows fade at their edges.
//
// Three constraints shape everything below.
//
// First, no letter-spacing anywhere a Devanagari string can land. Tracking splits conjuncts: the
// letters of a cluster are drawn apart and the word reads as fragments. The only tracked rules here
// are on numerals and Latin, and each says so at the point of use.
//
// Second, long-form Devanagari. The measure is set by measurement, not by eye: at 19px this font
// averages ~7.75px per Devanagari cluster, so a 66ch cap rendered 77 characters per line. 48ch
// lands it at ~65, inside the 60-70 the brief asks for — `ch` is defined from the font's "0" and
// badly overestimates Devanagari. line-height is 1.95 because matras above and conjuncts below need
// more leading than Latin at the same size; the 15,922-character Samaveda entry is the case that
// proves it, and 1.6 makes that page unreadable.
//
// Third, zero figures. None of the 78 entries has an extracted image yet, so every surface has to
// look finished without one and take one later without being rebuilt. The rule throughout is that
// an image is an extra layer over a background that already stands on its own: the home backdrop
// paints its own field, and the entry hero needs no plate. Nothing reserves empty space.
const VIDYAKALA_CSS = `
/* ================= home section: three rows of names, scrolling ================= */

/* The rows run in opposite directions so the block reads as motion rather than as a slideshow, and
   so no two rows ever line up into a column the eye tracks. Rightward rows are the same keyframe
   played from -50%: the track holds its list twice, so both directions loop seamlessly, and either
   end state is a full row of names. That is what makes the reduced-motion fallback free — the
   global animation:none rule leaves every track at translateX(0), which is a complete row in both
   cases, not a half-empty one. */
@keyframes vk-row-left { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
@keyframes vk-row-right { from { transform: translate3d(-50%,0,0); } to { transform: translate3d(0,0,0); } }

[data-e~="vkteaser"] { --vk-pad: 30px; position: relative; overflow: hidden; background: #070B1E; }

/* The soft field behind the rows. It is painted, not photographed: with figures[].file still null
   across all 78 entries, a section that waits for a plate shows a hole instead. An image later
   becomes one absolutely-positioned layer over this field — the field is what carries the section
   either way, so nothing here reserves space for one or has to move when one arrives. */
[data-e~="vkbackdrop"] {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(46% 58% at 74% 44%, rgba(47,69,110,.55) 0%, rgba(47,69,110,0) 70%),
    radial-gradient(38% 46% at 88% 78%, rgba(72,136,123,.20) 0%, rgba(72,136,123,0) 72%),
    radial-gradient(52% 62% at 12% 8%, rgba(160,43,45,.13) 0%, rgba(160,43,45,0) 68%);
}

[data-e~="vkteaserwrap"] {
  position: relative; display: grid; align-items: center; gap: 54px;
  grid-template-columns: minmax(0,46%) minmax(0,1fr);
}
[data-e~="vkteasercopy"] { max-width: 46ch; }

/* Two counts, side by side. The numeral is the headline and the caption underneath is real data —
   the vidya group labels from the book file, the first and last kala from the i18n list — so the
   card states something true rather than restating its own number in words. */
[data-e~="vkstats"] { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0,1fr)); margin: 30px 0 32px; }
[data-e~="vkstat"] {
  padding: 20px 22px 22px; border-radius: 16px;
  border: 1px solid rgba(255,249,236,.10);
  background: linear-gradient(160deg, rgba(255,249,236,.055) 0%, rgba(255,249,236,.015) 100%);
}
/* Digits only — the tracking here can never reach a Devanagari cluster. */
[data-e~="vkstatnum"] {
  display: block; font-family: 'Noto Serif Devanagari', serif; font-weight: 600;
  font-size: clamp(34px, 4.4vw, 46px); line-height: 1.1; letter-spacing: .01em;
  font-variant-numeric: tabular-nums;
}
[data-e~="vkstat"][data-vks="vidya"] [data-e~="vkstatnum"] { color: #E8C173; }
[data-e~="vkstat"][data-vks="kala"] [data-e~="vkstatnum"] { color: #7FB8AB; }
[data-e~="vkstatlabel"] { display: block; margin-top: 9px; font-size: 15px; line-height: 1.75; color: #B9C0D2; }

[data-e~="vkctas"] { display: flex; flex-wrap: wrap; gap: 14px; }
[data-e~="vkcta"] {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  min-height: 54px; padding: 15px 30px; border-radius: 999px; text-decoration: none;
  font-family: 'Noto Serif Devanagari', serif; font-size: 17.5px; line-height: 1.5;
  transition: transform .2s ease, box-shadow .2s ease, background .2s ease, border-color .2s ease;
}
[data-e~="vkcta"][data-vkc="primary"] {
  background: linear-gradient(140deg, #F0CE86 0%, #D9A94F 100%); color: #241703;
  box-shadow: 0 12px 34px rgba(232,193,115,.24);
}
[data-e~="vkcta"][data-vkc="primary"]:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(232,193,115,.32); }
[data-e~="vkcta"][data-vkc="ghost"] { border: 1px solid rgba(255,249,236,.30); color: #FFF9EC; }
[data-e~="vkcta"][data-vkc="ghost"]:hover { background: rgba(255,249,236,.07); border-color: rgba(255,249,236,.52); }
[data-e~="vkcta"]:focus-visible { outline: 2px solid #E8C173; outline-offset: 3px; }

/* The rows stay inside their own grid column. They used to be set to calc(100% + 14vw) so the strip
   would read as continuing past the section — but the section clips its overflow, so on a wide
   screen that resolved to chips sliced off against a hard right edge with no fade to explain it.
   The fade is what carries "this continues", and it works at the column's own width. */
[data-e~="vkrows"] {
  position: relative; display: grid; gap: 14px; width: 100%;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%);
}
[data-e~="vkrow"] { overflow: hidden; }
[data-e~="vktrack"] { display: flex; width: max-content; gap: 14px; will-change: transform; }
/* Slow. These are names to be read in passing, not a ticker: at the old durations a chip crossed
   the column faster than a reader could finish the word on it. */
[data-e~="vktrack"][data-vkr="0"] { animation: vk-row-right 150s linear infinite; }
[data-e~="vktrack"][data-vkr="1"] { animation: vk-row-left 128s linear infinite; margin-left: -110px; }
[data-e~="vktrack"][data-vkr="2"] { animation: vk-row-right 176s linear infinite; margin-left: -52px; }
/* Hovering pauses the row under the pointer, so a name that catches the eye can be read. */
[data-e~="vkrow"]:hover [data-e~="vktrack"] { animation-play-state: paused; }

[data-e~="vkchip"] {
  display: inline-flex; align-items: baseline; gap: 12px; flex: 0 0 auto;
  padding: 15px 22px; border-radius: 14px; text-decoration: none;
  border: 1px solid rgba(255,249,236,.09);
  background: linear-gradient(158deg, rgba(23,31,56,.94) 0%, rgba(11,16,34,.94) 100%);
  transition: border-color .2s ease, background .2s ease;
}
/* Digits only. */
[data-e~="vkchipn"] { font-size: 12.5px; line-height: 1; letter-spacing: .07em; color: #C79A46; font-variant-numeric: tabular-nums; }
[data-e~="vkchipname"] { font-family: 'Noto Serif Devanagari', serif; font-size: 19px; line-height: 1.45; color: #F4EFE2; white-space: nowrap; }

@media (max-width: 1080px) {
  [data-e~="vkteaserwrap"] { grid-template-columns: minmax(0,1fr); gap: 38px; }
  [data-e~="vkteasercopy"] { max-width: 60ch; }
  /* Stacked, the rows become the full width of the screen rather than a column beside the text.
     Bleeding them past the section padding is what keeps them reading as a strip that continues
     past the edge, which is the whole point of the row — a phone must not get a boxed-in copy of
     the desktop panel. */
  [data-e~="vkrows"] {
    width: auto; margin-inline: calc(-1 * var(--vk-pad));
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 7%, #000 93%, transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0%, #000 7%, #000 93%, transparent 100%);
  }
}
@media (max-width: 700px) {
  [data-e~="vkchip"] { padding: 13px 18px; gap: 10px; }
  [data-e~="vkchipname"] { font-size: 17.5px; }
  [data-e~="vkstats"] { gap: 12px; }
  [data-e~="vkstat"] { padding: 16px 18px 18px; }
  [data-e~="vkcta"] { flex: 1 1 auto; }
}
/* Tracks [data-page="Home-v5"] [data-e~="pad"], which drops to 18px at this width. The rows bleed
   by exactly the section padding, so the two values cannot be allowed to drift apart. */
@media (max-width: 640px) {
  [data-e~="vkteaser"] { --vk-pad: 18px; }
}
@media (max-width: 380px) {
  [data-e~="vkstats"] { grid-template-columns: minmax(0,1fr); }
}

/* ================= /vidya-kala: the listing ================= */

[data-e~="vkback"] { display: inline-block; font-size: 15px; line-height: 1.7; color: #8FA8C4; text-decoration: none; }
[data-e~="vkback"]:hover { color: #E8C173; }
[data-e~="vkkicker"] { display: flex; align-items: center; gap: 14px; }
[data-e~="vkkicker"]::before { content: ""; width: 42px; height: 1px; flex: 0 0 auto; background: #C79A46; }

[data-e~="vkcontrols"] { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }

/* The tab is a link, not a button: the view lives in the query string, so it is addressable,
   survives a reload and gives back/forward the behaviour a reader expects. */
[data-e~="vktabs"] {
  display: inline-flex; gap: 4px; padding: 6px; border-radius: 999px;
  border: 1px solid rgba(255,249,236,.09);
  background: linear-gradient(150deg, rgba(255,249,236,.07) 0%, rgba(255,249,236,.02) 100%);
}
[data-e~="vktab"] {
  display: inline-flex; align-items: center; justify-content: center; text-decoration: none;
  min-height: 46px; padding: 11px 26px; border: 0; border-radius: 999px; cursor: pointer;
  font-family: 'Noto Serif Devanagari', serif; font-size: 17px; line-height: 1.4;
  background: transparent; color: #C3C9D8; transition: background .2s ease, color .2s ease, box-shadow .2s ease;
}
[data-e~="vktab"][aria-selected="true"] {
  background: linear-gradient(140deg, #F0CE86 0%, #D9A94F 100%); color: #241703;
  box-shadow: 0 8px 26px rgba(232,193,115,.28);
}
[data-e~="vktab"]:focus-visible { outline: 2px solid #E8C173; outline-offset: 3px; }

[data-e~="vksearch"] {
  position: relative; display: flex; align-items: center; flex: 1 1 320px; max-width: 470px;
}
[data-e~="vksearch"] svg { position: absolute; left: 20px; pointer-events: none; }
[data-e~="vksearchinput"] {
  width: 100%; min-height: 58px; padding: 14px 22px 14px 50px; border-radius: 999px;
  border: 1px solid rgba(255,249,236,.11); background: rgba(255,249,236,.045);
  color: #FFF9EC; font-family: inherit; font-size: 16.5px; line-height: 1.6;
  transition: border-color .2s ease, background .2s ease;
}
[data-e~="vksearchinput"]::placeholder { color: #8790A6; }
[data-e~="vksearchinput"]:focus { outline: 0; border-color: rgba(232,193,115,.55); background: rgba(255,249,236,.07); }

[data-e~="vkmeta"] { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }
[data-e~="vkmetacount"] { font-size: 14.5px; line-height: 1.7; color: #8790A6; font-variant-numeric: tabular-nums; }

/* ---- vidya taxonomy: the one real hierarchy, so it gets the strongest structure ---- */
[data-e~="vkband"] { position: relative; padding: 30px 0 26px; }
[data-e~="vkband"][data-vkg="0"] { --vk-accent: #E8C173; }
[data-e~="vkband"][data-vkg="1"] { --vk-accent: #7FB8AB; }
[data-e~="vkband"][data-vkg="2"] { --vk-accent: #D0797A; }
[data-e~="vkbandhead"] { position: relative; display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 20px; margin-bottom: 20px; }
[data-e~="vkglabel"] { margin: 0; font-family: 'Noto Serif Devanagari', serif; font-weight: 600; font-size: clamp(24px,3.2vw,34px); line-height: 1.28; color: #FFF9EC; }
[data-e~="vkgmembers"] { margin: 8px 0 0; font-size: 15px; line-height: 1.85; color: #98A0B4; }
/* Digits only. */
[data-e~="vkghost"] {
  font-family: 'Noto Serif Devanagari', serif; font-size: clamp(58px, 8vw, 108px); line-height: .8;
  color: #FFF9EC; opacity: .055; font-variant-numeric: tabular-nums; user-select: none; letter-spacing: .02em;
}
[data-e~="vkbandgrid"] { display: grid; gap: 14px; grid-template-columns: repeat(4, minmax(0,1fr)); }
[data-e~="vkbandgrid"][data-vkg="1"] { grid-template-columns: repeat(5, minmax(0,1fr)); }

/* Both card kinds share a surface; only the accents differ, so a switch between tabs does not read
   as a switch between two designs. */
[data-e~="vkvcard"], [data-e~="vkkcard"] {
  position: relative; display: block; width: 100%; text-align: start; overflow: hidden;
  border-radius: 16px; border: 1px solid rgba(255,249,236,.085); cursor: pointer;
  background: linear-gradient(158deg, rgba(23,31,56,.92) 0%, rgba(10,15,32,.92) 100%);
  color: inherit; font: inherit;
  transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;
}
[data-e~="vkvcard"]:hover, [data-e~="vkkcard"]:hover {
  border-color: rgba(232,193,115,.40); transform: translateY(-3px); box-shadow: 0 16px 36px rgba(0,0,0,.36);
}
[data-e~="vkvcard"]:focus-visible, [data-e~="vkkcard"]:focus-visible { outline: 2px solid #E8C173; outline-offset: 3px; }

[data-e~="vkvcard"] { padding: 18px 20px 20px 22px; }
[data-e~="vkvcard"]::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--vk-accent); opacity: .62; transition: opacity .2s ease;
}
[data-e~="vkvcard"]:hover::before { opacity: 1; }

[data-e~="vkkcard"] { padding: 18px 20px 20px; }
/* Digits only. */
[data-e~="vkcardghost"] {
  position: absolute; top: 6px; right: 16px; font-family: 'Noto Serif Devanagari', serif;
  font-size: 40px; line-height: 1; color: #FFF9EC; opacity: .07; user-select: none;
  font-variant-numeric: tabular-nums; letter-spacing: .01em; pointer-events: none;
}
/* Digits only. */
[data-e~="vknum"] { display: block; margin-bottom: 9px; font-size: 12.5px; line-height: 1; color: #C79A46; font-variant-numeric: tabular-nums; letter-spacing: .07em; }
[data-e~="vkcardname"] { display: block; font-family: 'Noto Serif Devanagari', serif; font-weight: 600; font-size: 20px; line-height: 1.4; color: #F7F2E6; }
[data-e~="vkcardgloss"] { display: block; margin-top: 7px; font-size: 14.5px; line-height: 1.7; color: #98A0B4; }
[data-e~="vkonly"] { margin-left: 8px; font-style: normal; font-size: 11.5px; text-transform: uppercase; color: #7C8398; }

[data-e~="vkgrid"] { display: grid; gap: 13px; grid-template-columns: repeat(6, minmax(0,1fr)); }
[data-e~="vkempty"] { padding: 54px 0; font-size: 16.5px; line-height: 1.8; color: #8790A6; }

@media (max-width: 1280px) {
  [data-e~="vkgrid"] { grid-template-columns: repeat(4, minmax(0,1fr)); }
  [data-e~="vkbandgrid"][data-vkg="1"] { grid-template-columns: repeat(3, minmax(0,1fr)); }
}
@media (max-width: 900px) {
  [data-e~="vkgrid"] { grid-template-columns: repeat(3, minmax(0,1fr)); }
  [data-e~="vkbandgrid"], [data-e~="vkbandgrid"][data-vkg="1"] { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 700px) {
  /* Two across on a phone, which keeps the numeral and the gloss legible where one-across wastes
     the width and three-across truncates every name. The vidya card goes full width instead: it
     leads with a group accent and a longer gloss, and two of those to a row read as noise. */
  [data-e~="vkgrid"] { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 11px; }
  [data-e~="vkbandgrid"], [data-e~="vkbandgrid"][data-vkg="1"] { grid-template-columns: minmax(0,1fr); }
  [data-e~="vkcontrols"] { gap: 14px; }
  [data-e~="vksearch"] { flex: 1 1 100%; max-width: none; }
  [data-e~="vktabs"] { width: 100%; }
  [data-e~="vktab"] { flex: 1 1 0; padding: 11px 14px; }
  [data-e~="vkcardghost"] { font-size: 34px; right: 12px; }
  [data-e~="vkkcard"] { padding: 15px 16px 17px; }
  [data-e~="vkcardname"] { font-size: 18px; }
}

/* ================= the drawer ================= */

@keyframes vk-scrim-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes vk-drawer-in { from { transform: translate3d(100%,0,0); } to { transform: translate3d(0,0,0); } }

[data-e~="vkscrim"] {
  position: fixed; inset: 0; z-index: 80; border: 0; padding: 0; cursor: pointer;
  background: rgba(3,6,16,.62); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  animation: vk-scrim-in .2s ease both;
}
[data-e~="vkdrawer"] {
  position: fixed; z-index: 81; top: 0; right: 0; bottom: 0; width: min(620px, 100%);
  display: flex; flex-direction: column; overflow-y: auto; overscroll-behavior: contain;
  padding: 30px 40px 40px; background: #0A0F22; border-left: 1px solid rgba(255,249,236,.08);
  box-shadow: -30px 0 70px rgba(0,0,0,.5);
  animation: vk-drawer-in .26s cubic-bezier(.22,.61,.36,1) both;
}
[data-e~="vkdrawerclose"] {
  position: absolute; top: 24px; right: 30px; width: 44px; height: 44px; padding: 0;
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
  border-radius: 50%; border: 1px solid rgba(255,249,236,.14); background: rgba(255,249,236,.05);
  color: #F4EFE2; transition: background .2s ease, border-color .2s ease;
}
[data-e~="vkdrawerclose"]:hover { background: rgba(255,249,236,.11); border-color: rgba(255,249,236,.3); }
[data-e~="vkdrawerclose"]:focus-visible { outline: 2px solid #E8C173; outline-offset: 3px; }
[data-e~="vkdeyebrow"] { margin: 0 0 26px; font-size: 13.5px; line-height: 1.7; color: #C79A46; max-width: 60%; }
/* Digits only. */
[data-e~="vkdnum"] {
  display: block; margin: 0 0 6px; font-family: 'Noto Serif Devanagari', serif; font-weight: 600;
  font-size: 46px; line-height: 1; color: #FFF9EC; opacity: .3; font-variant-numeric: tabular-nums; letter-spacing: .02em;
}
[data-e~="vkdname"] { margin: 0; font-family: 'Noto Serif Devanagari', serif; font-weight: 600; font-size: clamp(30px,5vw,42px); line-height: 1.24; color: #FFF9EC; }
[data-e~="vkdgloss"] { margin: 14px 0 0; font-size: 16.5px; line-height: 1.8; color: #C79A46; }
[data-e~="vkdrule"] { margin: 28px 0; border: 0; border-top: 1px solid rgba(232,193,115,.28); }
[data-e~="vkdprose"] { margin: 0 0 30px; max-width: 42ch; font-size: 17px; line-height: 1.95; color: #D6D2C8; }
[data-e~="vkdcta"] {
  display: inline-flex; align-items: center; gap: 10px; align-self: flex-start;
  min-height: 54px; padding: 15px 30px; border-radius: 999px; text-decoration: none;
  font-family: 'Noto Serif Devanagari', serif; font-size: 17.5px; line-height: 1.5;
  background: linear-gradient(140deg, #F0CE86 0%, #D9A94F 100%); color: #241703;
  box-shadow: 0 12px 34px rgba(232,193,115,.22); transition: transform .2s ease, box-shadow .2s ease;
}
[data-e~="vkdcta"]:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(232,193,115,.3); }
[data-e~="vkdcta"]:focus-visible { outline: 2px solid #E8C173; outline-offset: 3px; }

@media (max-width: 700px) {
  /* Full screen on a phone. A 620px panel over a 390px viewport is a modal pretending to be a
     drawer; at this width the panel is the screen, and the close button is inside thumb reach. */
  [data-e~="vkdrawer"] { width: 100%; border-left: 0; padding: 26px 22px 40px; }
  [data-e~="vkdrawerclose"] { top: 18px; right: 18px; }
  [data-e~="vkdeyebrow"] { margin-bottom: 22px; }
}

/* ================= /vidya-kala/[key]: the reading surface ================= */

[data-e~="vkhero"] { position: relative; overflow: hidden; background: #070B1E; }
[data-e~="vkheroline"] { display: flex; align-items: baseline; gap: 20px; flex-wrap: wrap; }
/* Digits only. */
[data-e~="vkheronum"] {
  font-family: 'Noto Serif Devanagari', serif; font-weight: 600; font-size: clamp(34px,5.6vw,60px);
  line-height: 1.1; color: #FFF9EC; opacity: .34; font-variant-numeric: tabular-nums; letter-spacing: .02em;
}
[data-e~="vkheroname"] { margin: 0; font-family: 'Noto Serif Devanagari', serif; font-weight: 600; font-size: clamp(34px,5.6vw,60px); line-height: 1.16; color: #FFF9EC; text-wrap: balance; }
[data-e~="vkherogloss"] { margin: 20px 0 0; max-width: 52ch; font-size: 17px; line-height: 1.85; color: #C79A46; }

[data-e~="vkbody"] { background: #F1ECE1; color: #1B2233; }
[data-e~="vkread"] { display: grid; gap: 56px; grid-template-columns: minmax(0,1fr) 340px; align-items: start; }

/* The opening paragraph is set larger than the rest. It is the only typographic hierarchy the
   source gives — the book has no standfirst — and it is what lets a reader who taps in from the
   drawer know within one line whether this is the entry they wanted. */
[data-e~="vklede"] {
  margin: 0 0 30px; max-width: 34ch; font-family: 'Noto Serif Devanagari', serif;
  font-size: clamp(21px,2.5vw,26px); line-height: 1.75; color: #14203E; text-wrap: pretty;
}
[data-e~="vkprose"] { max-width: 48ch; font-size: 19px; line-height: 1.95; color: #2A3145; }
[data-e~="vkprose"] p { margin: 0 0 1.35em; text-wrap: pretty; }
[data-e~="vkprose"] p:last-child { margin-bottom: 0; }
[data-e~="vksubhead"] { margin: 40px 0 18px; max-width: 44ch; font-family: 'Noto Serif Devanagari', serif; font-weight: 600; font-size: 22px; line-height: 1.45; color: #14203E; }
[data-e~="vkpage"] { scroll-margin-top: 96px; }
[data-e~="vkconnector"] { margin: 26px 0; max-width: 48ch; text-align: center; font-family: 'Noto Serif Devanagari', serif; font-size: 18px; line-height: 1.7; color: #6B6558; }

/* Shlokas carry these pages, so they leave the prose column's rhythm entirely: their own face,
   their own tint, and a rule down the side that marks them as quoted rather than written. */
[data-e~="vkshloka"] {
  margin: 40px 0; padding: 26px 30px; max-width: 48ch;
  border-left: 3px solid #D9A94F; border-radius: 0 14px 14px 0;
  background: linear-gradient(120deg, rgba(232,193,115,.18) 0%, rgba(232,193,115,.07) 100%);
}
[data-e~="vkshloka"] q { quotes: none; }
[data-e~="vkverse"] {
  display: block; font-family: 'Noto Serif Devanagari', serif; font-weight: 600; font-style: italic;
  font-size: clamp(19px,2.2vw,23px); line-height: 1.85; color: #14203E; white-space: pre-line;
}
[data-e~="vkcite"] { display: block; margin-top: 16px; font-size: 14px; line-height: 1.7; color: #7A6E52; font-variant-numeric: tabular-nums; }

/* The rail is the entry's place in its own list, not a table of contents for the page: 64 numbered
   siblings is the structure a reader actually holds in mind here. */
[data-e~="vkrailcard"] {
  position: sticky; top: 96px; padding: 22px 22px 18px; border-radius: 20px;
  background: #FFFDF8; border: 1px solid rgba(20,32,62,.07); box-shadow: 0 18px 44px rgba(20,32,62,.09);
}
[data-e~="vkrailhead"] { display: block; margin: 0 0 14px; padding: 0 14px; font-size: 13.5px; line-height: 1.6; color: #8A6015; }
[data-e~="vkraillink"] {
  display: grid; grid-template-columns: 34px minmax(0,1fr); align-items: baseline; gap: 8px;
  padding: 11px 14px; border-radius: 11px; text-decoration: none; color: #2A3145;
  transition: background .18s ease, color .18s ease;
}
[data-e~="vkraillink"]:hover { background: rgba(232,193,115,.15); }
[data-e~="vkraillink"][aria-current="page"] { background: #F6E8C9; color: #14203E; }
/* Digits only. */
[data-e~="vkrailn"] { font-size: 12.5px; line-height: 1.6; color: #A08A5A; font-variant-numeric: tabular-nums; letter-spacing: .06em; }
[data-e~="vkrailname"] { font-family: 'Noto Serif Devanagari', serif; font-size: 17px; line-height: 1.5; }
[data-e~="vkraillink"][aria-current="page"] [data-e~="vkrailname"] { font-weight: 600; }
[data-e~="vkrailcard"] :focus-visible { outline: 2px solid #8A6015; outline-offset: 2px; }

[data-e~="vkprogress"] { position: fixed; left: 0; top: 0; right: 0; height: 3px; z-index: 60; background: transparent; }
[data-e~="vkprogress"] span { display: block; height: 100%; background: linear-gradient(90deg, #E8C173, #48887B); transform-origin: 0 50%; }

@media (max-width: 1080px) {
  /* The rail drops below the prose rather than squeezing beside it. Sticky positioning goes with
     it: a card that follows the scroll is helpful beside a column and is in the way under one. */
  [data-e~="vkread"] { grid-template-columns: minmax(0,1fr); gap: 34px; }
  [data-e~="vkrailcard"] { position: static; }
}
@media (max-width: 700px) {
  [data-e~="vklede"] { max-width: none; }
  [data-e~="vkprose"] { font-size: 18px; line-height: 1.9; }
  [data-e~="vkshloka"] { padding: 20px 20px; margin: 32px 0; }
  [data-e~="vkheroline"] { gap: 14px; }
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

out += `\n/* ---------- register form states (no design source) ---------- */\n`;
out += `${renderGroup(parseRules(REGISTER_FORM_CSS, "RegisterForm"), null)}\n`;

out += `\n/* ---------- OTP code step (no design source) ---------- */\n`;
out += `${renderGroup(parseRules(OTP_CSS, "OtpStep"), null)}\n`;

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

