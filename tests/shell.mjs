// Covers the shell rebuilt from design/assets/site.js: loader, reveal, parallax, toast, and the
// minimum submit display. Run against a dev server on localhost.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:4200";
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const browser = await chromium.launch();

// --- reveal + parallax ----------------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "no-preference" });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Anything actually inside the viewport at load must never have been hidden.
  const onScreen = await page.locator("[data-reveal]").evaluateAll((els) =>
    els.filter((e) => { const b = e.getBoundingClientRect(); return b.top < window.innerHeight * 0.94 && b.bottom > -40; })
       .map((e) => getComputedStyle(e).opacity));
  check("reveals already on screen are never hidden (no flash)", onScreen.length > 0 && onScreen.every((o) => o === "1"), `${onScreen.length} on screen, hidden: ${onScreen.filter((o) => o !== "1").length}`);

  const below = page.locator("[data-reveal]").last();
  const hiddenBefore = await below.evaluate((el) => getComputedStyle(el).opacity);
  await below.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const shownAfter = await below.evaluate((el) => getComputedStyle(el).opacity);
  check("below-the-fold reveal starts hidden then reveals on scroll", hiddenBefore !== "1" && shownAfter === "1", `${hiddenBefore} -> ${shownAfter}`);

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const before = await page.locator("[data-parallax]").evaluate((el) => el.style.transform);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(400);
  const after = await page.locator("[data-parallax]").evaluate((el) => el.style.transform);
  check("parallax moves the hero on scroll", before !== after, `${before || "(none)"} -> ${after}`);
  await page.close();
}

// --- reduced motion is honoured ---------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const opacities = await page.locator("[data-reveal]").evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
  check("prefers-reduced-motion leaves everything visible", opacities.every((o) => o === "1"), `${opacities.filter((o) => o !== "1").length} hidden`);
  await page.close();
}

// --- loader ------------------------------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const loader = page.locator("#skpn-loader");
  check("loader is present and hidden at rest", (await loader.count()) === 1 && (await loader.evaluate((el) => getComputedStyle(el).opacity)) === "0");
  check("loader is a live status region", (await loader.getAttribute("role")) === "status" && !!(await loader.getAttribute("aria-label")));

  // A slow login keeps the shell up for the whole request.
  await page.route("**/api/auth/login", async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, registered: false }) });
  });
  await page.locator('input[type="tel"]').fill("9000000123");
  await page.waitForTimeout(120);
  await page.getByRole("link", { name: /साइन इन|Sign in/ }).last().click();
  await page.waitForTimeout(600);
  const during = Number(await loader.evaluate((el) => getComputedStyle(el).opacity));
  check("loader shows during an async action", during > 0.5, `opacity ${during}`);
  await page.waitForTimeout(2200);
  const after = Number(await loader.evaluate((el) => getComputedStyle(el).opacity));
  check("loader hides when the action finishes", after === 0, `opacity ${after}`);
  await page.close();
}

// --- toast --------------------------------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("**/api/auth/login", (route) => route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"server"}' }));
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="tel"]').fill("9000000123");
  await page.waitForTimeout(120);
  await page.getByRole("link", { name: /साइन इन|Sign in/ }).last().click();
  await page.waitForTimeout(700);

  const stack = page.locator('[data-e~="toaststack"]');
  const toast = stack.locator('[data-e~="toast"]');
  check("a failed request raises a toast", (await toast.count()) === 1, `${await toast.count()} toasts`);
  check("toast stack is an assertive live region", (await stack.getAttribute("aria-live")) === "assertive");
  await toast.locator("button").click();
  await page.waitForTimeout(300);
  check("toast is dismissible", (await toast.count()) === 0);
  await page.close();
}

// --- error language --------------------------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("**/api/quiz/attempts", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 409, contentType: "application/json", body: '{"error":"already_attempted"}' })
      : route.continue());
  await page.goto(`${BASE}/quiz/instructions`, { waitUntil: "networkidle" });
  await page.locator('button[data-e~="cta"]').last().click();
  await page.waitForTimeout(800);
  const text = await page.locator('[data-e~="toast"]').first().textContent().catch(() => "");
  check("error copy renders in Hindi, not English", /[ऀ-ॿ]/.test(text ?? ""), JSON.stringify((text ?? "").slice(0, 60)));
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
