// Covers the hide-on-scroll navbar and the composited certificate download.
import { chromium } from "@playwright/test";
import { closeOtp, verifyInPage } from "./otp.mjs";

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

  const pinned = async () => { const b = await bar.boundingBox(); return !!b && b.y > -2 && b.y < 2; };
  check("navbar visible at the top", await shown());
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(400);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(500);
  check("navbar is actually pinned to the viewport", await pinned(), "bar must stay at y=0 when shown");
  await page.mouse.wheel(0, -5000);
  await page.waitForTimeout(400);

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
  await verifyInPage(page, mobile);
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
  check("download is the named PDF", download.suggestedFilename() === "Medhavi Chhatravritti Pratiyogita Pramaan Patra.pdf", download.suggestedFilename());

  const path = await download.path();
  const { readFileSync } = await import("node:fs");
  const bytes = readFileSync(path);
  check("file is a real PDF", bytes.toString("latin1", 0, 5) === "%PDF-");
  const head = bytes.toString("latin1", 0, 2000);
  check("page is A4 landscape", /MediaBox\s*\[\s*0\s+0\s+841\.89\s+595\.28/.test(head) || /\/MediaBox[^\]]*841[^\]]*595/.test(head), head.match(/MediaBox[^\]]*\]/)?.[0] ?? "no MediaBox");

  // The button locks for five seconds and says so.
  const button = page.locator('[data-e~="download"]');
  check("button switches to a downloaded state", (await button.getAttribute("aria-disabled")) === "true");
  await page.waitForTimeout(5600);
  check("button re-enables after five seconds", (await button.getAttribute("aria-disabled")) === "false");

  await page.close();
}

// --- image load: loader, retry, never a blank frame -------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let fail = true;
  await page.route("**/uploads/cert.jpeg**", (route) => (fail ? route.abort() : route.continue()));
  await page.goto(`${BASE}/certificates`, { waitUntil: "domcontentloaded" });
  check("loader covers the frame while the image loads", (await page.locator('[data-e~="certloading"]').count()) === 1);
  await page.waitForSelector('[data-e~="certretry"]', { timeout: 15000 }).catch(() => {});
  check("after retries it offers a control, not a blank frame", (await page.locator('[data-e~="certretry"]').count()) === 1);
  check("download is locked while the image is unavailable", (await page.locator('[data-e~="download"]').getAttribute("aria-disabled")) === "true");
  fail = false;
  await page.locator('[data-e~="certretry"] button').click();
  await page.waitForSelector('[data-e~="certframe"] img', { timeout: 15000 }).catch(() => {});
  check("retry control recovers the image", (await page.locator('[data-e~="certframe"] img').count()) === 1);
  await page.close();
}

// --- 404 and offline ---------------------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const res = await page.goto(`${BASE}/no-such-page`, { waitUntil: "networkidle" });
  check("unknown route returns 404", res.status() === 404, `status ${res.status()}`);
  check("404 uses the design shell", (await page.locator('[data-page="NotFound"]').count()) === 1);
  check("404 links home", (await page.locator('[data-page="NotFound"] a[href="/"]').count()) >= 1);

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  check("no offline banner while online", (await page.locator('[data-e~="offlinebar"]').count()) === 0);
  await page.context().setOffline(true);
  await page.waitForTimeout(600);
  const bar = page.locator('[data-e~="offlinebar"]');
  check("offline raises a banner", (await bar.count()) === 1);
  check("banner cannot intercept a tap", (await bar.evaluate((el) => getComputedStyle(el).pointerEvents)) === "none");
  await page.context().setOffline(false);
  await page.waitForTimeout(600);
  check("banner clears on reconnect", (await bar.count()) === 0);
  await page.close();
}

await browser.close();
await closeOtp();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
