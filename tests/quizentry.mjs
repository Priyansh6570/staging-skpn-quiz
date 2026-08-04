// The route the student actually walks: register -> rules -> "back" -> Pratiyogita -> "take part".
// /quiz used to be a fixed "already recorded" screen, so this path lied to every new registrant.
import { chromium } from "@playwright/test";
import { closeOtp, verifyInPage } from "./otp.mjs";

const BASE = process.env.BASE ?? "http://localhost:4600";
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const register = async (page) => {
  const mobile = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await verifyInPage(page, mobile);
  await page.evaluate(async (m) => {
    await fetch("/api/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      mobile: m, email: "", fullName: "Entry Probe", gender: "male", dateOfBirth: "2009-05-14",
      address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
      category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test School",
      competitiveExam: null, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true }) });
  }, mobile);
};

const alreadyRecorded = async (page) =>
  (await page.locator("body").innerText()).includes("आपका प्रयास पहले ही दर्ज है");

const browser = await chromium.launch();

// --- the reported path -------------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await register(page);

  await page.goto(`${BASE}/quiz/rules`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /वापस|वापिस/ }).first().click();
  await page.waitForURL(/\/pratiyogita/, { timeout: 15000 }).catch(() => {});
  check("rules 'back' reaches Pratiyogita", page.url().includes("/pratiyogita"), page.url());

  await page.getByRole("link", { name: /भाग लें/ }).first().click();
  await page.waitForTimeout(2500);
  check("'take part' does not claim the attempt is recorded", !(await alreadyRecorded(page)), page.url());
  check("'take part' lands on the rules gate", page.url().includes("/quiz/rules"), page.url());
  await page.close();
}

// --- /quiz resolves against real state ------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await register(page);

  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
  check("/quiz with no attempt goes to the rules gate", page.url().includes("/quiz/rules"), page.url());

  const started = await page.evaluate(async () => {
    const r = await fetch("/api/quiz/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rulesAccepted: true }) });
    return (await r.json()).attemptId;
  });
  const session = async () => page.evaluate(async () => (await (await fetch("/api/session", { cache: "no-store" })).json()));

  // The session no longer carries a count — a certificate exists for every paper sat, so that
  // boolean is the whole signal. See lib/serialize.ts.
  check("starting a paper does not count as having sat it", (await session()).hasCertificates === false, JSON.stringify(await session()));

  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
  check("/quiz with a paper in progress resumes it", page.url().includes(`/quiz/attempt/${started}`), page.url());

  await page.evaluate(async (id) => {
    await fetch(`/api/quiz/attempts/${id}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason: "manual" }) });
  }, started);

  check("submitting counts as having sat it", (await session()).hasCertificates === true, JSON.stringify(await session()));

  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
  check("/quiz after submitting shows the recorded screen", await alreadyRecorded(page), page.url());
  await page.close();
}

// --- signed out ------------------------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
  check("/quiz signed out goes to login", page.url().includes("/login"), page.url());
  await page.close();
}

await browser.close();
await closeOtp();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
