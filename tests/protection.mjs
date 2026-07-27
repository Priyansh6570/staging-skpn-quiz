// Asset paths resolve on nested routes, and the content protection behaves on the public site
// without breaking form fields or the admin password.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:4900";
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const browser = await chromium.launch();

// --- images resolve on every depth of route ------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const broken = [];
  page.on("response", (r) => {
    if (r.status() === 404 && /\.(png|jpe?g|webp|svg)$/i.test(new URL(r.url()).pathname)) {
      broken.push(new URL(r.url()).pathname);
    }
  });

  const mobile = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(async (m) => {
    await fetch("/api/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      mobile: m, email: "", fullName: "Asset Probe", gender: "male", dateOfBirth: "2009-05-14",
      address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
      category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test School",
      competitiveExam: null, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true }) });
  }, mobile);

  const attemptId = await page.evaluate(async () => {
    const r = await fetch("/api/quiz/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rulesAccepted: true }) });
    return (await r.json()).attemptId;
  });

  const routes = ["/", "/about", "/pratiyogita", "/rules", "/login", "/register", "/quiz/rules", `/quiz/attempt/${attemptId}`, "/certificates"];
  for (const path of routes) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
  }
  check("no image 404s on any route, including nested quiz routes", broken.length === 0, broken.join(", ") || "none");

  // The reported symptom: alt text instead of the mark.
  await page.goto(`${BASE}/quiz/attempt/${attemptId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const logo = await page.locator('img[src*="skpn-logo"]').first().evaluate((el) => ({
    src: el.getAttribute("src"),
    loaded: el.complete && el.naturalWidth > 0,
  }));
  check("SKPN mark loads on the quiz attempt screen", logo.loaded, `${logo.src} naturalWidth>0=${logo.loaded}`);
  check("asset path is absolute", logo.src.startsWith("/"), logo.src);
  await page.close();
}

// --- content protection on the public site --------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const prevented = (type) => page.evaluate((t) => {
    const el = document.querySelector("h1, p");
    const e = new Event(t, { bubbles: true, cancelable: true });
    el.dispatchEvent(e);
    return e.defaultPrevented;
  }, type);

  check("right-click menu is blocked", await prevented("contextmenu"));
  check("copy is blocked", await prevented("copy"));
  check("cut is blocked", await prevented("cut"));
  check("selection is blocked", await prevented("selectstart"));
  check("image drag is blocked", await prevented("dragstart"));

  const bodySelect = await page.evaluate(() => getComputedStyle(document.body).userSelect);
  check("body is not selectable", bodySelect === "none", bodySelect);
  await page.close();
}

// --- form fields must stay usable -------------------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const input = page.locator('input[type="tel"]');
  await input.fill("9876500099");
  const inputSelect = await input.evaluate((el) => getComputedStyle(el).userSelect);
  check("form fields remain selectable", inputSelect === "text", inputSelect);

  const canSelectInInput = await input.evaluate((el) => {
    el.setSelectionRange(0, 4);
    return el.selectionEnd - el.selectionStart === 4;
  });
  check("text inside an input can still be selected for correction", canSelectInInput);

  const copyInInput = await page.evaluate(() => {
    const el = document.querySelector('input[type="tel"]');
    const e = new Event("copy", { bubbles: true, cancelable: true });
    el.dispatchEvent(e);
    return e.defaultPrevented;
  });
  check("copy from a form field is allowed", !copyInInput);
  await page.close();
}

// --- admin stays selectable so the export password can be copied ---------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const adminSelect = await page.evaluate(() => getComputedStyle(document.querySelector(".adm-login")).userSelect);
  // No style is injected on /admin at all, so this is the browser default, which is selectable.
  check("admin surface remains selectable", adminSelect === "text" || adminSelect === "auto", adminSelect);

  const adminContext = await page.evaluate(() => {
    const e = new Event("contextmenu", { bubbles: true, cancelable: true });
    document.querySelector(".adm-login h1").dispatchEvent(e);
    return e.defaultPrevented;
  });
  check("right-click still works in admin", !adminContext);
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
