// Drives the real UI through register -> rules -> quiz -> submit in a browser.
// Must be reached over the same host the dev server binds (localhost), or Next 16 blocks the
// /_next chunks cross-origin and nothing hydrates.
//
//   node tests/journey.mjs
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:4100";
const mobile = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: "no-preference" });
page.on("pageerror", (e) => console.log(`  [pageerror] ${e.message.slice(0, 200)}`));

const ENABLED = "rgb(20, 32, 62)";
const cta = () => page.locator('button[data-e~="cta"]').last();
const ctaBg = () => cta().evaluate((el) => getComputedStyle(el).backgroundColor);
const labelled = (re) => page.locator("label").filter({ hasText: re }).first();

await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
check("register hydrates", await page.evaluate(() => !!Object.keys(document.querySelector("nav a") ?? {}).find((k) => k.startsWith("__react"))));

// --- step 1: mobile alone gates -----------------------------------------------------------------
check("step 1 starts gated", (await ctaBg()) !== ENABLED);

// Pressing the gated button explains what is missing rather than doing nothing.
await cta().click();
await page.waitForTimeout(400);
const gateToast = await page.locator('[data-e~="toast"]').first().textContent().catch(() => "");
check("gated step names the missing field", /[ऀ-ॿ]/.test(gateToast ?? "") && (gateToast ?? "").includes("मोबाइल"), JSON.stringify((gateToast ?? "").slice(0, 40)));
await page.locator('[data-e~="toast"] button').first().click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('input[type="tel"]').fill(mobile);
await page.waitForTimeout(150);
check("step 1 opens on a valid mobile alone (no DOB needed)", (await ctaBg()) === ENABLED, await ctaBg());
await cta().click();
await page.waitForTimeout(300);
check("advanced to step 2", (await page.locator("body").textContent()).includes("चरण 2"));

// --- step 2 ---------------------------------------------------------------------------------------
await labelled(/^पूरा नाम/).locator("input").fill("Journey Test Student");
await page.getByRole("button", { name: "पुरुष", exact: true }).click();
await page.getByRole("button", { name: "जन्म तिथि चुनें" }).click();
await page.waitForTimeout(250);
await page.getByRole("button", { name: /पुष्टि|सुनिश्चित/ }).first().click();
await page.waitForTimeout(250);
await labelled(/^पता/).locator("textarea, input").first().fill("12 Test Marg, Ward 4");
await labelled(/^शहर/).locator("input").fill("Sehore");
await labelled(/^पिन/).locator("input").fill("466001");
await page.getByRole("button", { name: "जिला चुनें" }).click();
await page.waitForTimeout(250);
await page.locator('[data-e~="pickerlist"], [role="dialog"]').locator("input").first().fill("Sehore");
await page.waitForTimeout(250);
await page.getByRole("button", { name: "सीहोर", exact: true }).first().click();
await page.waitForTimeout(300);
check("step 2 complete", (await ctaBg()) === ENABLED, await ctaBg());
check("a confirmed date of birth is not reported missing", !((await page.locator('[data-e~="toast"]').first().textContent().catch(() => "")) ?? "").includes("जन्म"));
await cta().click();
await page.waitForTimeout(300);

// --- step 3 ---------------------------------------------------------------------------------------
await page.getByText("विद्यालय स्तर", { exact: true }).first().click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "स्तर चुनें" }).click();
await page.waitForTimeout(250);
await page.getByRole("button", { name: "कक्षा 10", exact: true }).first().click();
await page.waitForTimeout(250);
await labelled(/^वर्तमान अध्ययनरत/).locator("input").first().fill("Test Higher Secondary School");
await page.waitForTimeout(200);
check("step 3 complete", (await ctaBg()) === ENABLED, await ctaBg());
await cta().click();
await page.waitForTimeout(300);

// --- step 4 ---------------------------------------------------------------------------------------
const boxes = page.locator('input[type="checkbox"]');
for (let i = 0; i < (await boxes.count()); i++) await boxes.nth(i).check();
await page.waitForTimeout(200);
check("step 4 complete", (await ctaBg()) === ENABLED, await ctaBg());
await cta().click();

await page.waitForURL(/\/quiz\/rules/, { timeout: 30000 }).catch(() => {});
check("registration lands on /quiz/rules", page.url().includes("/quiz/rules"), page.url());

// --- rules -> instructions --------------------------------------------------------------------------
await page.locator('input[type="checkbox"]').first().check();
await page.waitForTimeout(200);
await page.getByRole("link", { name: /आगे बढ़ें/ }).first().click();
await page.waitForURL(/\/quiz\/instructions/, { timeout: 20000 }).catch(() => {});
check("rules acceptance reaches /quiz/instructions", page.url().includes("/quiz/instructions"), page.url());

// --- attempt -----------------------------------------------------------------------------------------
await page.locator('button[data-e~="cta"]').last().click();
await page.waitForURL(/\/quiz\/attempt\//, { timeout: 30000 }).catch(() => {});
check("attempt starts", /\/quiz\/attempt\//.test(page.url()), page.url());
await page.locator("button[aria-pressed]").first().waitFor({ timeout: 25000 }).catch(() => {});

const optionButtons = () => page.locator("button[aria-pressed]");
check("options render", (await optionButtons().count()) >= 2, `${await optionButtons().count()} options`);

const modal = page.locator('[role="dialog"][aria-label="प्रयास जमा करें?"]');
let answered = 0;
for (let i = 0; i < 30; i++) {
  if (await modal.isVisible().catch(() => false)) break;
  const opts = optionButtons();
  if (!(await opts.count())) break;
  await opts.first().click();
  answered++;
  await page.waitForTimeout(60);
  // "जमा करें" also labels the palette sheet's submit, so take the first match, which is the
  // question-navigation button, not the sheet's.
  const forward = page.getByRole("button", { name: "अगला", exact: true }).first();
  const next = (await forward.count()) ? forward : page.getByRole("button", { name: "जमा करें", exact: true }).first();
  if (!(await next.count())) break;
  await next.click();
  await page.waitForTimeout(80);
}
check("answered the whole paper", answered === 30, `${answered}/30`);
check("submit confirmation opens after the last question", await modal.isVisible().catch(() => false));

const confirm = modal.getByRole("button", { name: "हाँ, जमा करें" });
const startedAt = Date.now();
if (await confirm.count()) await confirm.click();

// The shell must be up while the submit runs.
await page.waitForTimeout(400);
check("loader covers the submit", (await page.locator("#skpn-loader").evaluate((el) => getComputedStyle(el).opacity)) !== "0");

await page.waitForURL(/\/certificates/, { timeout: 40000 }).catch(() => {});
const elapsed = Date.now() - startedAt;
check("submit lands on /certificates", /\/certificates/.test(page.url()), page.url());
check("submitting state is held at least 3s", elapsed >= 3000, `${elapsed}ms`);
check("and is not held far beyond it", elapsed < 9000, `${elapsed}ms`);

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
