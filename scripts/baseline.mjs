// Screenshots every design/*.dc.html at 390 / 768 / 1440 into tests/baseline/.
// Names match playwright.config.ts's snapshotPathTemplate, so a Stage B page test asserting
//   await expect(page).toHaveScreenshot("Home-v5.png")
// under project w390 compares against tests/baseline/Home-v5-w390.png.
//
// Run:  node scripts/baseline.mjs

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readdir, mkdir, stat } from "node:fs/promises";
import { extname, join, resolve, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESIGN = join(ROOT, "design");
const OUT = join(ROOT, "tests", "baseline");
const WIDTHS = [390, 768, 1440];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4",
};

// The export is served over http rather than file:// because support.js re-fetches location.href.
const server = createServer(async (req, res) => {
  const rel = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^[/\\]+/, "");
  const path = join(DESIGN, rel);
  if (!path.startsWith(DESIGN)) return res.writeHead(403).end();
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": MIME[extname(path).toLowerCase()] ?? "application/octet-stream" });
  createReadStream(path).pipe(res);
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

await mkdir(OUT, { recursive: true });
const files = (await readdir(DESIGN)).filter((f) => f.endsWith(".dc.html")).sort();

const browser = await chromium.launch();
for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  for (const file of files) {
    const slug = file.replace(/\.dc\.html$/, "").replace(/\s+/g, "-");
    const page = await context.newPage();
    // Home, About, Login and Pratiyogita drive carousels and marquees off setInterval, and the
    // Home parallax writes a transform from a scroll listener that fullPage capture triggers.
    // Without a frozen clock the same page hashes differently on every run.
    await page.clock.install({ time: new Date("2026-07-29T00:00:00Z") });
    await page.goto(`${origin}/${encodeURIComponent(file)}`, { waitUntil: "networkidle" });
    // fullPage capture does not reliably decode loading="lazy" images below the fold, which is the
    // rest of the run-to-run variance. Force them eager and wait for the pixels.
    await page.evaluate(async () => {
      const images = Array.from(document.images);
      for (const img of images) img.loading = "eager";
      await Promise.all(
        images.map(async (img) => {
          if (!img.complete) {
            await new Promise((done) => {
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
            });
          }
          await img.decode().catch(() => {});
        }),
      );
    });
    await page.evaluate(() => document.fonts.ready);
    await page.clock.runFor(1500);
    await page.screenshot({
      path: join(OUT, `${slug}-w${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.close();
    console.log(`${slug}-w${width}.png`);
  }
  await context.close();
}
await browser.close();
server.close();
