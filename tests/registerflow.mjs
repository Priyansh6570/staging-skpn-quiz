// The registration form end to end: the code step at step 1, the duplicate-number gate in front of
// it, the date wheel, the step loader, and that every refusal renders in the language the navbar is
// set to. /api/otp/send is stubbed throughout — no test spends one of the trust's SMS credits.
import { chromium } from "@playwright/test";
import { CODE, closeOtp, plantOtp } from "./otp.mjs";

const BASE = process.env.BASE ?? "http://localhost:3111";
const HOST = new URL(BASE).hostname;

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const newMobile = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

const browser = await chromium.launch();

/** Language is a cookie, so a locale is set rather than clicked — no dependence on the toggle. */
const openPage = async (lang, sends) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  await ctx.addCookies([{ name: "skpn_lang", value: lang, domain: HOST, path: "/" }]);
  const page = await ctx.newPage();
  await page.route("**/api/otp/send", (route) => {
    if (sends) sends.n++;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, registered: false, resendInSeconds: 60, expiresInSeconds: 600 }),
    });
  });
  return { ctx, page };
};

/** Gives a number an account the way a student would, so the duplicate is real rather than seeded. */
const registerMobile = async (mobile, name) => {
  const page = await browser.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await plantOtp(mobile, "register");
  await page.evaluate(async ([m, c, n]) => {
    await fetch("/api/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobile: m, code: c, purpose: "register" }) });
    await fetch("/api/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      mobile: m, email: "", fullName: n, gender: "male", dateOfBirth: "2009-05-14",
      address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
      category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test School",
      competitiveExam: null, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true }) });
  }, [mobile, CODE, name]);
  await page.close();
};

const continueButton = (page) => page.getByRole("button", { name: "Continue", exact: true });

/** Types a code into the six boxes the way a student does, one digit at a time. */
const typeCode = async (page, code) => {
  await page.locator('[data-e~="otpbox"]').first().click();
  for (const digit of code) await page.keyboard.type(digit);
  await page.waitForTimeout(120);
};

/**
 * Step 1 start to finish: number in, code away, code verified, next step open. Every later block
 * needs a verified number before it can reach a single other field.
 */
const clearStepOne = async (page, mobile) => {
  await page.locator('input[type="tel"]').fill(mobile);
  await continueButton(page).click();
  await page.waitForTimeout(1800);
  await plantOtp(mobile, "register");
  await typeCode(page, CODE);
  await page.getByRole("button", { name: /^(सत्यापित करें|Verify)$/ }).click();
  await page.waitForTimeout(2600);
};

// --- a registered number is refused at step 1, for the right reason ---------------------------------
{
  const taken = newMobile();
  await registerMobile(taken, "Existing Holder");

  const sends = { n: 0 };
  const { ctx, page } = await openPage("en", sends);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  check("the register page renders without a script error", errors.length === 0, errors.join("; "));

  await page.locator('input[type="tel"]').fill(taken);
  await continueButton(page).click();
  await page.waitForTimeout(1200);

  check("a registered number does not advance past step 1", await page.locator('input[type="tel"]').isVisible());
  check("...before any code is requested for it", sends.n === 0, `${sends.n} sends`);

  const note = page.locator('[data-e~="fieldnote"]');
  const text = (await note.count()) ? await note.innerText() : "";
  check("...and the reason given is duplicate registration", /already registered/i.test(text), text.slice(0, 80));
  check("...not the one-attempt message", !/attempt has been recorded|only once/i.test(text), text.slice(0, 80));
  check("...and it offers a way to sign in", (await note.locator('a[href="/login"]').count()) === 1);
  check("the field is marked invalid for assistive tech", (await page.locator('[data-e~="field"][data-invalid="true"]').count()) === 1);
  await ctx.close();
}

// --- the same refusal, Hindi navbar -------------------------------------------------------------------
{
  const taken = newMobile();
  await registerMobile(taken, "Existing Holder Two");

  const { ctx, page } = await openPage("hi", null);
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.locator('input[type="tel"]').fill(taken);
  await page.getByRole("button").filter({ hasText: /\S/ }).last().click().catch(() => {});
  // The label is Hindi here, so the control is found by position in the button row rather than text.
  await page.locator('[data-e~="ctarow"] button').last().click();
  await page.waitForTimeout(1200);

  const text = await page.locator('[data-e~="fieldnote"]').innerText();
  check("the duplicate refusal is in Devanagari when the navbar is Hindi", /[ऀ-ॿ]/.test(text), text.slice(0, 60));
  check("...and carries no English fallback", !/already registered/i.test(text), text.slice(0, 60));
  await ctx.close();
}

// --- an email another account holds is refused at the email field, not the mobile one ------------------
{
  const holder = newMobile();
  const email = `taken-${Date.now()}@example.com`;
  const page0 = await browser.newPage();
  await page0.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await plantOtp(holder, "register");
  await page0.evaluate(async ([m, c, e]) => {
    await fetch("/api/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobile: m, code: c, purpose: "register" }) });
    await fetch("/api/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      mobile: m, email: e, fullName: "Email Holder", gender: "male", dateOfBirth: "2009-05-14",
      address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
      category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test School",
      competitiveExam: null, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true }) });
  }, [holder, CODE, email]);
  await page0.close();

  const fresh = newMobile();
  await plantOtp(fresh, "register");
  const probe = await browser.newPage();
  await probe.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const status = await probe.evaluate(async ([m, c, e]) => {
    await fetch("/api/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobile: m, code: c, purpose: "register" }) });
    const r = await fetch("/api/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      mobile: m, email: e, fullName: "Second Comer", gender: "male", dateOfBirth: "2009-05-14",
      address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
      category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test School",
      competitiveExam: null, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true }) });
    return { code: r.status, body: await r.json().catch(() => null) };
  }, [fresh, CODE, email]);
  await probe.close();

  check("a duplicate email is refused", status.code === 409, String(status.code));
  check("...as email_taken, not as a duplicate mobile number", status.body?.error === "email_taken", JSON.stringify(status.body));
}

// --- the date wheel is a real scroller ------------------------------------------------------------------
{
  const { ctx, page } = await openPage("en", null);
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await clearStepOne(page, newMobile());

  await page.getByRole("button", { name: "Select your date of birth" }).click();
  await page.waitForTimeout(500);

  const wheels = page.locator('[data-e~="wheel"]');
  check("the picker has three columns", (await wheels.count()) === 3, String(await wheels.count()));

  const year = wheels.nth(0);
  const overflow = await year.evaluate((el) => getComputedStyle(el).overflowY);
  const snap = await year.evaluate((el) => getComputedStyle(el).scrollSnapType);
  check("a column is a real scroll container, not a relabelled list", overflow === "scroll", overflow);
  check("...that snaps to its rows", snap.includes("mandatory"), snap);

  const before = await year.evaluate((el) => el.scrollTop);
  await year.evaluate((el) => el.scrollBy({ top: 44 * 6, behavior: "auto" }));
  await page.waitForTimeout(600);
  const after = await year.evaluate((el) => el.scrollTop);
  check("scrolling a column moves it", after > before, `${before} -> ${after}`);
  check("...and it comes to rest on a row", after % 44 === 0, String(after));
  check("...and the centred year follows the scroll", await year.locator('[aria-selected="true"]').count() === 1);
  await ctx.close();
}

// --- the district picker is a short, momentum-scrolling column -------------------------------------------
{
  const { ctx, page } = await openPage("en", null);
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await clearStepOne(page, newMobile());

  await page.getByRole("button", { name: "Select a district" }).click();
  await page.waitForTimeout(400);

  const list = page.locator('[data-e~="pickerlist"]');
  const box = await list.boundingBox();
  const row = await list.locator("button").first().boundingBox();
  check("the picker shows at most six rows at once", box.height <= 6 * (row.height + 4) + 12, `${box.height}px over ${row.height}px rows`);
  check("...and there are more than six to scroll through", (await list.locator("button").count()) > 6);
  check("...so the column really scrolls", await list.evaluate((el) => el.scrollHeight > el.clientHeight));

  const styles = await list.evaluate((el) => {
    const s = getComputedStyle(el);
    return { snap: s.scrollSnapType, overscroll: s.overscrollBehaviorY, size: getComputedStyle(el.querySelector("button")).fontSize };
  });
  // Chromium drops the strictness keyword when it is the default, so "y proximity" reads back "y".
  check("...with the date wheel's snapping", styles.snap.startsWith("y"), styles.snap);
  check("...and a scroll that does not run away into the page", styles.overscroll === "contain", styles.overscroll);
  check("the district labels are set larger than they were", parseFloat(styles.size) >= 19, styles.size);
  await ctx.close();
}

// --- the code step is at step 1 and the whole form completes ---------------------------------------------
{
  const mobile = newMobile();
  const sends = { n: 0 };
  const { ctx, page } = await openPage("en", sends);
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });

  await page.locator('input[type="tel"]').fill(mobile);
  check("no code is asked for while the number is still being typed", sends.n === 0, `${sends.n} sends`);
  await continueButton(page).click();
  await page.waitForTimeout(500);
  check("asking for a code shows a loader inside the form", (await page.locator('[data-e~="verifybusy"]').count()) === 1);

  await page.waitForTimeout(1400);
  check("a code is asked for at step 1, before any other question", sends.n === 1, `${sends.n} sends`);
  check("no dialog is opened for it", (await page.getByRole("dialog", { name: /^(कोड दर्ज करें|Enter the code)$/ }).count()) === 0);
  check("the code field is six separate boxes", (await page.locator('[data-e~="otpbox"]').count()) === 6);
  check("...below a locked mobile number", await page.locator('[data-e~="verify"] input[type="tel"]').isDisabled());
  check("...showing the number the code went to", (await page.locator('[data-e~="verify"] input[type="tel"]').inputValue()) === mobile);
  check("...with a confirmation naming it", (await page.locator('[data-e~="verifynote"]').innerText()).includes(mobile));
  check("the form has not moved past step 1", (await page.getByLabel("Full name").count()) === 0);

  await plantOtp(mobile, "register");
  await typeCode(page, CODE);
  await page.getByRole("button", { name: /^(सत्यापित करें|Verify)$/ }).click();
  await page.waitForTimeout(1400);
  check("verifying shows a loader inside the form", (await page.locator('[data-e~="verifybusy"], [data-e~="stepbusy"]').count()) >= 1);

  await page.waitForTimeout(2000);
  check("a verified code unlocks the rest of the form", (await page.getByLabel("Full name").count()) === 1);

  await page.getByLabel("Full name").fill("Register Flow Probe");
  await page.getByLabel("Email address").fill(`probe-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Male", exact: true }).click();
  await page.getByRole("button", { name: "Select your date of birth" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByLabel("Address", { exact: true }).fill("12 Test Marg");
  await page.getByLabel("City or village", { exact: true }).fill("Sehore");
  await page.getByLabel("PIN code", { exact: true }).fill("466001");
  await page.getByRole("button", { name: "Select a district" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Sehore", exact: true }).click();
  await page.waitForTimeout(300);

  // Moving on marks the change and pulls the form back to its own top, so the next step does not
  // open halfway down a page the student had scrolled to the bottom of.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const scrolledTo = await page.evaluate(() => window.scrollY);
  await continueButton(page).click();
  await page.waitForTimeout(300);
  check("moving to a new step shows a loader", (await page.locator('[data-e~="stepbusy"]').count()) === 1);
  await page.waitForTimeout(1600);
  check("...for about a second, then the next step opens", (await page.locator('[data-e~="stepbusy"]').count()) === 0);
  check("...and the form is scrolled back to its top", (await page.evaluate(() => window.scrollY)) < scrolledTo, `${scrolledTo} -> ${await page.evaluate(() => window.scrollY)}`);

  await page.getByRole("button", { name: /Vidyalaya Star/ }).click();
  await page.getByRole("button", { name: "Select a level" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Class 10", exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByLabel("Name of school or college currently enrolled in").fill("Test Higher Secondary");
  await continueButton(page).click();
  await page.waitForTimeout(1600);

  await page.locator('input[type="checkbox"]').first().check();
  check("no dialog is used anywhere in the form flow", (await page.getByRole("dialog").count()) === 0);
  check("the last step asks for no second code", (await page.locator('[data-e~="otpbox"]').count()) === 0);
  check("...because one code was enough", sends.n === 1, `${sends.n} sends`);

  await page.getByRole("button", { name: "Complete registration" }).click();
  await page.waitForTimeout(500);
  check("submitting shows a loader inside the form", (await page.locator('[data-e~="stepbusy"]').count()) === 1);

  await page.waitForURL(/\/quiz\/rules/, { timeout: 15000 }).catch(() => {});
  const stuck = page.url().includes("/quiz/rules")
    ? ""
    : ` — verify block: ${JSON.stringify(await page.locator('[data-e~="verify"]').innerText().catch(() => "gone"))}`;
  check("a verified code completes registration and redirects", page.url().includes("/quiz/rules"), page.url() + stuck);

  const toast = page.locator('[data-e~="toast"]');
  check("...with a success toast", (await toast.count()) >= 1 && /Registration complete/i.test(await toast.first().innerText()),
    (await toast.count()) ? await toast.first().innerText() : "no toast");
  await ctx.close();
}

await browser.close();
await closeOtp();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log("FAILED:"); for (const f of failed) console.log(`  ${f.name} ${f.detail}`); }
process.exit(failed.length ? 1 : 0);
