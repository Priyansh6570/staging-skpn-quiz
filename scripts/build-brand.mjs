// Generates the browser icons and the social share card from public/uploads/skpn-logo.png and the
// hero artwork. Run with: npm run brand
//
// Chromium does the rendering because it is already a dev dependency (Playwright) and because it is
// the only thing here that can lay out Devanagari with the site's own webfonts. Nothing is generated
// at request time: the outputs are committed files, so 5 lakh students cost the server zero work.
//
// The seal ships as a square with an opaque black plate behind the gold ring, so every size is
// clipped to a circle — the same 50% clip the components use.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hi } from "../lib/i18n/hi.ts";

const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Inlined rather than linked: a page built with setContent has an opaque origin, and Chromium
// refuses to load file:// subresources into it. The MIME comes from the magic number because the
// seal currently ships as JPEG bytes under a .png name.
const inline = (...parts) => {
  const bytes = readFileSync(join(ROOT, ...parts));
  const mime = bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${bytes.toString("base64")}`;
};

const seal = inline("public", "uploads", "skpn-logo.png");
const heroArt = inline("public", "assets", "newbg.jpg");

const FONTS = "https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap";

// The gold ring stops just short of the artwork's edge; 1.04 pushes it out to the clip so the icon
// reads as a gold coin rather than a gold coin with a dark halo.
const SEAL_FILL = 1.04;

const browser = await chromium.launch();

// --- icons ----------------------------------------------------------------------------------------
const iconPage = await browser.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 1 });

const renderIcon = async (size) => {
  await iconPage.setContent(`<body style="margin:0;background:transparent">
    <div id="m" style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden">
      <img src="${seal}" style="width:100%;height:100%;display:block;transform:scale(${SEAL_FILL})">
    </div>
  </body>`);
  await iconPage.locator("#m img").evaluate((el) => (el.complete ? null : new Promise((r) => (el.onload = r))));
  return iconPage.locator("#m").screenshot({ omitBackground: true });
};

// 192, not 512: without a web manifest nothing asks for a large icon, and the seal is dense gold
// filigree that PNG cannot compress — a 512 costs 400KB to serve a 32px tab.
const icon = await renderIcon(192);
writeFileSync(join(ROOT, "app", "icon.png"), icon);
writeFileSync(join(ROOT, "app", "apple-icon.png"), await renderIcon(180));

// ICO is a directory of images; entries may be PNG-compressed, so the rendered PNGs go in as-is.
// 16/32/48 covers the tab, the retina tab and the Windows shortcut.
const icoSizes = [16, 32, 48];
const icoImages = [];
for (const size of icoSizes) icoImages.push(await renderIcon(size));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(icoImages.length, 4);

let offset = 6 + icoImages.length * 16;
const entries = icoImages.map((png, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(icoSizes[i], 0);
  e.writeUInt8(icoSizes[i], 1);
  e.writeUInt8(0, 2); // palette size: not palettised
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
writeFileSync(join(ROOT, "app", "favicon.ico"), Buffer.concat([header, ...entries, ...icoImages]));
await iconPage.close();

// --- share card -----------------------------------------------------------------------------------
// 1200x630 is the size every crawler agrees on. The composition mirrors the hero — same artwork,
// same overlay, same type — so a shared link and the page it opens read as one thing. Strings come
// from lib/i18n; no Devanagari is authored here.
const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await card.setContent(`<head><link rel="stylesheet" href="${FONTS}"></head>
<body style="margin:0;width:1200px;height:630px;overflow:hidden;background:#070B1E;font-family:'Noto Sans Devanagari',system-ui,sans-serif">
  <div style="position:relative;width:1200px;height:630px;overflow:hidden">
    <img src="${heroArt}" style="position:absolute;left:38%;top:0;transform:translateX(-50%);width:150%;height:100%;object-fit:cover;object-position:50% 34%;opacity:.72">
    <div style="position:absolute;inset:0;background:radial-gradient(72% 58% at 50% 40%, rgba(7,11,30,.58) 0%, rgba(7,11,30,.84) 62%, rgba(5,8,22,.94) 100%)"></div>
    <div style="position:relative;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:0 90px;text-align:center">
      <div style="position:relative;width:168px;height:168px;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;inset:-46%;border-radius:50%;background:radial-gradient(circle, rgba(232,193,115,.5) 0%, rgba(232,193,115,.15) 42%, rgba(232,193,115,0) 70%)"></div>
        <div style="position:absolute;inset:-3%;border-radius:50%;box-shadow:0 0 28px 7px rgba(232,193,115,.45)"></div>
        <img src="${seal}" style="position:relative;width:100%;height:100%;border-radius:50%;display:block;transform:scale(${SEAL_FILL});filter:drop-shadow(0 14px 40px rgba(0,0,0,.6))">
      </div>
      <p id="org" style="margin:0;font-family:'Noto Serif Devanagari',serif;font-size:25px;line-height:1.6;color:#E8C173;letter-spacing:.02em"></p>
      <h1 id="title" style="margin:0;font-family:'Noto Serif Devanagari',serif;font-weight:600;font-size:56px;line-height:1.26;color:#FFF9EC;max-width:20ch;text-wrap:balance;text-shadow:0 2px 30px rgba(0,0,0,.4)"></h1>
      <div style="display:flex;align-items:center;gap:16px">
        <span style="width:46px;height:1px;background:rgba(232,193,115,.7)"></span>
        <span id="dept" style="font-size:22px;line-height:1.6;color:#E9E4D8"></span>
        <span style="width:46px;height:1px;background:rgba(232,193,115,.7)"></span>
      </div>
    </div>
  </div>
</body>`);
await card.evaluate(
  ([org, title, dept]) => {
    document.getElementById("org").textContent = org;
    document.getElementById("title").textContent = title;
    document.getElementById("dept").textContent = dept;
  },
  [hi.Home_v5.S.org, hi.Home_v5.S.heroTitle, hi.SiteHeader.T.deptShort],
);
await card.evaluate(() => document.fonts.ready);
await card.waitForTimeout(400);

// JPEG, not PNG: the card is mostly photograph, and WhatsApp drops previews over ~300KB.
writeFileSync(join(ROOT, "public", "og.jpg"), await card.screenshot({ type: "jpeg", quality: 90 }));
await card.close();

await browser.close();

const kb = (b) => `${(b / 1024).toFixed(0)}KB`;
console.log(`app/favicon.ico    ${icoSizes.join("/")}px`);
console.log(`app/icon.png       192px  ${kb(icon.length)}`);
console.log(`app/apple-icon.png 180px`);
console.log(`public/og.jpg      1200x630`);
