// The OTP screen on the two pages that use it. /api/otp/send is intercepted throughout: this
// exercises the UI, and no test should ever spend one of the trust's SMS credits to do it.
import { chromium } from "@playwright/test";
import { CODE, closeOtp, plantOtp, verifyInPage } from "./otp.mjs";

const BASE = process.env.BASE ?? "http://localhost:3111";
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const stubSend = (page) =>
  page.route("**/api/otp/send", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, registered: true, resendInSeconds: 60, expiresInSeconds: 600 }),
    }),
  );

const browser = await chromium.launch();
const mobile = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

// --- an account to sign back in to ---------------------------------------------------------------
{
  const page = await browser.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await verifyInPage(page, mobile);
  await page.evaluate(async (m) => {
    await fetch("/api/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      mobile: m, email: "", fullName: "Otp Ui Probe", gender: "male", dateOfBirth: "2009-05-14",
      address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
      category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test School",
      competitiveExam: null, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true }) });
  }, mobile);
  await page.close();
}

/** Types a code into the six boxes the way a student does, one digit at a time. */
const typeCode = async (page, code) => {
  const boxes = page.locator('[data-e~="otpbox"]');
  await boxes.first().click();
  for (const digit of code) await page.keyboard.type(digit);
  await page.waitForTimeout(120);
};

// --- sign-in asks for a code before it issues anything ------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await stubSend(page);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });

  await page.locator('input[type="tel"]').fill(mobile);
  await page.waitForTimeout(120);
  await page.getByRole("link", { name: /साइन इन|Sign in/ }).last().click();
  await page.waitForTimeout(1600);

  const panel = page.locator('[data-e~="verify"]');
  check("entering a number opens the code step, not a session", (await panel.count()) === 1, `${await panel.count()} panels`);
  check("...inline, not in a dialog", (await page.getByRole("dialog").count()) === 0);
  check("the code step names the number it sent to", (await panel.innerText()).includes(mobile), (await panel.innerText()).slice(0, 80));

  const session = await page.evaluate(async () => (await (await fetch("/api/session")).json()).signedIn);
  check("no session exists before the code is entered", session === false);

  const boxes = page.locator('[data-e~="otpbox"]');
  check("the code is six separate boxes", (await boxes.count()) === 6, `${await boxes.count()} boxes`);
  check("...each asking the phone for the SMS code", (await boxes.first().getAttribute("autocomplete")) === "one-time-code");

  const verify = panel.getByRole("button", { name: /^Verify$/ });
  check("verify is disabled until six digits are in", await verify.isDisabled());

  // Pasting the whole code has to land in all six, which is what a student does with a code they
  // copied out of the message.
  await boxes.nth(2).click();
  await page.evaluate(() => navigator.clipboard.writeText("123456")).catch(() => {});
  await boxes.nth(2).evaluate((el) => {
    const data = new DataTransfer();
    data.setData("text", "123456");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(150);
  const pasted = await boxes.evaluateAll((els) => els.map((e) => e.value).join(""));
  check("pasting a six-digit code fills all six boxes", pasted === "123456", pasted);
  check("...and enables verify", await verify.isEnabled());

  // Backspace walks back through the boxes rather than emptying the field.
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(100);
  check("backspace clears one digit and steps back", (await boxes.evaluateAll((els) => els.map((e) => e.value).join(""))) === "12345");

  // Focus is left on the box backspace emptied, so this types into it without being told where.
  await page.keyboard.type("0");
  await page.waitForTimeout(120);
  check("typing lands in the box focus was left on", (await boxes.evaluateAll((els) => els.map((e) => e.value).join(""))) === "123450");

  // A wrong code has to be refused by the server, so this one is not stubbed.
  await plantOtp(mobile, "login");
  await verify.click();
  await page.waitForTimeout(1600);
  check("a wrong code is refused in the reader's language", (await panel.locator('[data-e~="verifynote"]').innerText()).length > 0);
  check("...and the code step stays open", (await panel.count()) === 1);

  const stillOut = await page.evaluate(async () => (await (await fetch("/api/session")).json()).signedIn);
  check("a wrong code still issues no session", stillOut === false);

  check("resend is held shut by the countdown", await panel.getByRole("button", { name: /Send it again in/ }).isDisabled());

  await typeCode(page, CODE);
  await verify.click();
  await page.waitForTimeout(2500);

  const signedIn = await page.evaluate(async () => (await (await fetch("/api/session")).json()).signedIn);
  check("the right code signs the student in", signedIn === true);
  await page.close();
}

// --- an unregistered number is answered without a message ---------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let sends = 0;
  await page.route("**/api/otp/send", (route) => {
    sends++;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, registered: false }) });
  });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="tel"]').fill("9000000002");
  await page.waitForTimeout(120);
  await page.getByRole("link", { name: /साइन इन|Sign in/ }).last().click();
  await page.waitForTimeout(1800);
  check("an unregistered number is left with no code field", (await page.locator('[data-e~="otpbox"]').count()) === 0);
  check("...and is told so once", sends === 1, `${sends} sends`);
  check("...and the number is still editable", await page.locator('input[type="tel"]').isEditable());
  await page.close();
}

await browser.close();
await closeOtp();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log("FAILED:"); for (const f of failed) console.log(`  ${f.name} ${f.detail}`); }
process.exit(failed.length ? 1 : 0);
