// Covers the hide-on-scroll navbar and the composited certificate download.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:4300";
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const browser = await chromium.launch();

// --- navbar ---------------------------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "no-preference" });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const bar = page.locator('[data-e~="topbar"]').first();
  const shown = async () => !(await bar.evaluate((el) => getComputedStyle(el).transform)).includes("-");

  check("navbar visible at the top", await shown());

  await page.mouse.wheel(0, 60);
  await page.waitForTimeout(300);
  check("small movement near the top does not hide it", await shown());

  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(500);
  check("hides on scroll down", !(await shown()));

  await page.mouse.wheel(0, -5);
  await page.waitForTimeout(400);
  check("a 5px twitch is below the threshold", !(await shown()));

  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(500);
  check("returns on upward scroll", await shown());

  await page.mouse.wheel(0, -5000);
  await page.waitForTimeout(500);
  check("visible again at the top", await shown());
  await page.close();
}

// --- reduced motion --------------------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const bar = page.locator('[data-e~="topbar"]').first();
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(500);
  const transform = await bar.evaluate((el) => getComputedStyle(el).transform);
  check("prefers-reduced-motion keeps the navbar put", !transform.includes("-"), transform);
  await page.close();
}

// --- certificate download ----------------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const mobile = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  const name = "परीक्षा विद्यार्थी";

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(async ([m, n]) => {
    await fetch("/api/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      mobile: m, email: "", fullName: n, gender: "male", dateOfBirth: "2009-05-14",
      address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
      category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test School",
      competitiveExam: null, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true }) });
  }, [mobile, name]);

  await page.goto(`${BASE}/certificates`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.getByRole("link", { name: /डाउनलोड|Download/ }).first().click(),
  ]);
  check("download is a PNG, not the bare jpeg", download.suggestedFilename().endsWith(".png"), download.suggestedFilename());

  const path = await download.path();
  const { readFileSync } = await import("node:fs");
  const bytes = readFileSync(path);
  check("file is a real PNG", bytes[0] === 0x89 && bytes.toString("latin1", 1, 4) === "PNG");

  // Compare the exported pixels against the untouched source: the name region must differ.
  const probe = await page.evaluate(async (dataUrl) => {
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const [made, original] = await Promise.all([load(dataUrl), load("/uploads/cert.jpeg")]);
    const px = (img) => { const c = new OffscreenCanvas(img.width, img.height); c.getContext("2d").drawImage(img, 0, 0); return c.getContext("2d").getImageData(0, 0, img.width, img.height).data; };
    if (made.width !== original.width || made.height !== original.height) return { sizeMismatch: `${made.width}x${made.height} vs ${original.width}x${original.height}` };
    const [a, b] = [px(made), px(original)];
    const band = { top: Math.floor(made.height * 0.47), bottom: Math.ceil(made.height * 0.58) };
    let inBand = 0, outsideBand = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2]) continue;
      const y = Math.floor(i / 4 / made.width);
      if (y >= band.top && y <= band.bottom) inBand++; else outsideBand++;
    }
    return { w: made.width, h: made.height, inBand, outsideBand };
  }, `data:image/png;base64,${bytes.toString("base64")}`);

  check("export keeps the certificate's own dimensions", !probe.sizeMismatch, JSON.stringify(probe));
  check("name is painted into the design's band", (probe.inBand ?? 0) > 500, `${probe.inBand} px changed in band`);
  check("nothing else on the certificate is touched", (probe.outsideBand ?? 1) === 0, `${probe.outsideBand} px changed elsewhere`);
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
