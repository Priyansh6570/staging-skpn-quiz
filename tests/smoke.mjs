// End-to-end smoke test against a running dev server.
const BASE = process.env.BASE ?? "http://127.0.0.1:3991";
const ORIGIN = BASE;
let cookie = "";

const call = async (path, init = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      origin: ORIGIN,
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...init.headers,
    },
    redirect: "manual",
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const [pair] = c.split(";");
    if (pair.startsWith("skpn_session=")) cookie = pair;
  }
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 120); }
  return { status: res.status, body };
};

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const mobile = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

// --- pages render -------------------------------------------------------------------------------
for (const path of ["/", "/about", "/pratiyogita", "/rules", "/privacy", "/terms", "/login", "/register"]) {
  const r = await call(path);
  check(`GET ${path}`, r.status === 200, `status ${r.status}`);
}

const quizSignedOut = await call("/quiz");
check("GET /quiz signed out redirects rather than rendering", quizSignedOut.status === 307 || quizSignedOut.status === 302, `status ${quizSignedOut.status}`);

// --- session is signed out ----------------------------------------------------------------------
let r = await call("/api/session");
check("session signed out", r.status === 200 && r.body.signedIn === false);

// --- origin enforcement --------------------------------------------------------------------------
r = await call("/api/register", { method: "POST", headers: { origin: "https://evil.example" }, body: "{}" });
check("register rejects foreign Origin", r.status === 403, `status ${r.status}`);

r = await call("/api/quiz/attempts", { method: "POST", headers: { origin: "https://evil.example" }, body: "{}" });
check("attempt-start rejects foreign Origin before auth leak", r.status === 401 || r.status === 403, `status ${r.status}`);

// --- check-mobile ----------------------------------------------------------------------------------
r = await call("/api/register/check-mobile", { method: "POST", body: JSON.stringify({ mobile }) });
check("check-mobile available", r.status === 200 && r.body.available === true, JSON.stringify(r.body));
check("check-mobile returns only a boolean", r.status === 200 && Object.keys(r.body).join() === "available");

// --- registration validation ------------------------------------------------------------------------
r = await call("/api/register", { method: "POST", body: JSON.stringify({ mobile, fullName: "x" }) });
check("register rejects short name / missing fields", r.status === 400, `status ${r.status}`);

r = await call("/api/register", {
  method: "POST",
  body: JSON.stringify({
    mobile, email: "", fullName: "Smoke Test Student", gender: "male", dateOfBirth: "2009-05-14",
    address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
    category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test Higher Secondary",
    competitiveExam: null, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true,
    role: "admin", bestScore: 30,
  }),
});
check("register rejects unknown keys (mass assignment)", r.status === 400, `status ${r.status}`);

r = await call("/api/register", {
  method: "POST",
  body: JSON.stringify({
    mobile, email: "", fullName: "Smoke Test Student", gender: "male", dateOfBirth: "2009-05-14",
    address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
    category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test Higher Secondary",
    competitiveExam: null, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true,
  }),
});
check("register succeeds", r.status === 200 && r.body.ok === true, JSON.stringify(r.body).slice(0, 100));

r = await call("/api/session");
check("session signed in after register", r.body.signedIn === true, JSON.stringify(r.body));

r = await call("/api/register/check-mobile", { method: "POST", body: JSON.stringify({ mobile }) });
check("check-mobile now taken", r.body.available === false);

// --- nothing before Begin may write an attempt --------------------------------------------------------
r = await call("/quiz/instructions");
check("instructions page loads", r.status === 200, `status ${r.status}`);
r = await call("/quiz");
check("GET /quiz with no attempt redirects to the rules gate", r.status === 307 || r.status === 302, `status ${r.status}`);
r = await call("/api/session");
check("loading instructions writes no attempt", r.body.attemptCount === 0, `attemptCount ${r.body.attemptCount}`);
await call("/");
await call("/quiz/instructions");
r = await call("/api/session");
check("away-and-back still writes no attempt", r.body.attemptCount === 0, `attemptCount ${r.body.attemptCount}`);

// --- attempt ----------------------------------------------------------------------------------------
r = await call("/api/quiz/attempts", { method: "POST", body: JSON.stringify({ rulesAccepted: true }) });
const attemptId = r.body.attemptId;
check("attempt starts", r.status === 200 && !!attemptId, `status ${r.status}`);
check("paper has 30 questions", r.body.questions?.length === 30, `got ${r.body.questions?.length}`);

const raw = JSON.stringify(r.body);
check("no correctOptionId in start payload", !raw.includes("correctOptionId"));
check("no answerIndex in start payload", !raw.includes("answerIndex") && !/"answer"/.test(raw));

const started = Date.parse(r.body.serverNow);
const expires = Date.parse(r.body.expiresAt);
check("expiresAt = startedAt + 600s", expires - started === 600_000, `${(expires - started) / 1000}s`);

const questions = r.body.questions;

// --- resume -------------------------------------------------------------------------------------------
r = await call(`/api/quiz/attempts/${attemptId}`);
check("resume returns the same paper", r.status === 200 && r.body.questions.length === 30);
check("no correctOptionId in resume payload", !JSON.stringify(r.body).includes("correctOptionId"));

// --- autosave -------------------------------------------------------------------------------------------
const changes = questions.slice(0, 10).map((q, i) => ({
  questionId: q.id, selectedOptionId: q.options[i % 4].id, clientSeq: i + 1,
}));
r = await call(`/api/quiz/attempts/${attemptId}/answers`, { method: "PATCH", body: JSON.stringify({ changes }) });
check("autosave accepted", r.status === 200 && r.body.ok === true, JSON.stringify(r.body));

r = await call(`/api/quiz/attempts/${attemptId}/answers`, { method: "PATCH", body: JSON.stringify({ changes }) });
r = await call(`/api/quiz/attempts/${attemptId}`);
check("autosave is idempotent (10 answers, not 20)", r.body.answers.length === 10, `got ${r.body.answers.length}`);

// a stale clientSeq must not roll the answer back
const stale = [{ questionId: questions[0].id, selectedOptionId: questions[0].options[3].id, clientSeq: 0 }];
await call(`/api/quiz/attempts/${attemptId}/answers`, { method: "PATCH", body: JSON.stringify({ changes: stale }) });
r = await call(`/api/quiz/attempts/${attemptId}`);
const first = r.body.answers.find((a) => a.questionId === questions[0].id);
check("stale clientSeq is ignored", first.selectedOptionId === questions[0].options[0].id, `got ${first.selectedOptionId}`);

// --- ownership -------------------------------------------------------------------------------------------
const savedCookie = cookie;
cookie = "";
r = await call(`/api/quiz/attempts/${attemptId}`);
check("resume requires a session", r.status === 401, `status ${r.status}`);
cookie = savedCookie;

// --- submit races -------------------------------------------------------------------------------------------
const [a, b] = await Promise.all([
  call(`/api/quiz/attempts/${attemptId}/submit`, { method: "POST", body: JSON.stringify({ reason: "manual" }) }),
  call(`/api/quiz/attempts/${attemptId}/submit`, { method: "POST", body: JSON.stringify({ reason: "auto" }) }),
]);
check("both racing submits return 200", a.status === 200 && b.status === 200, `${a.status}/${b.status}`);
check("racing submits agree on the score", a.body.score === b.body.score, `${a.body.score} vs ${b.body.score}`);
check("score is server-computed and in range", a.body.score >= 0 && a.body.score <= 30, `score ${a.body.score}`);
check("certificate issued", !!a.body.certificateId || !!b.body.certificateId);

r = await call(`/api/quiz/attempts/${attemptId}/submit`, { method: "POST", body: JSON.stringify({ reason: "manual" }) });
check("third submit is idempotent", r.status === 200 && r.body.alreadySubmitted === true);

// --- one attempt ever -------------------------------------------------------------------------------------------
r = await call("/api/quiz/attempts", { method: "POST", body: JSON.stringify({ rulesAccepted: true }) });
check("second attempt refused", r.status === 409, `status ${r.status}`);

// --- an unfinished attempt resumes rather than locking the student out ---------------------------------
{
  const other = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  const saved = cookie;
  cookie = "";
  await call("/api/register", { method: "POST", body: JSON.stringify({
    mobile: other, email: "", fullName: "Resume Probe", gender: "male", dateOfBirth: "2009-05-14",
    address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
    category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test School",
    competitiveExam: null, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true }) });
  const first = await call("/api/quiz/attempts", { method: "POST", body: JSON.stringify({ rulesAccepted: true }) });
  await call("/");
  await call("/quiz/instructions");
  const again = await call("/api/quiz/attempts", { method: "POST", body: JSON.stringify({ rulesAccepted: true }) });
  check("returning to instructions resumes the same attempt", again.status === 200 && again.body.attemptId === first.body.attemptId, `${again.status} ${again.body.attemptId} vs ${first.body.attemptId}`);
  cookie = saved;
}

// --- me / certificates -------------------------------------------------------------------------------------------
r = await call("/api/me");
check("/api/me returns the profile", r.status === 200 && r.body.fullName === "Smoke Test Student");
check("/api/me never returns sessionVersion", !JSON.stringify(r.body).includes("sessionVersion"));

r = await call("/api/certificates");
check("/api/certificates lists one", r.status === 200 && r.body.length === 1, JSON.stringify(r.body).slice(0, 120));

// --- sign-out revokes everywhere -------------------------------------------------------------------------------------------
const stolen = cookie;
await call("/api/auth/signout", { method: "POST" });
cookie = stolen;
r = await call("/api/session");
check("sign-out revokes an already-issued cookie", r.body.signedIn === false, JSON.stringify(r.body));

cookie = "";
r = await call("/api/auth/login", { method: "POST", body: JSON.stringify({ mobile }) });
check("login succeeds for a known number", r.status === 200 && r.body.ok === true);
r = await call("/api/session");
check("login issues a working session", r.body.signedIn === true);

cookie = "";
const unknown = await call("/api/auth/login", { method: "POST", body: JSON.stringify({ mobile: "9000000001" }) });
check("login reports an unregistered number", unknown.status === 200 && unknown.body.registered === false, JSON.stringify(unknown.body));
check("...and issues no session", (await call("/api/session")).body.signedIn === false);

r = await call("/api/auth/login", { method: "POST", body: JSON.stringify({ mobile }) });
check("login reports a registered number", r.body.registered === true, JSON.stringify(r.body));

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log("FAILED:"); for (const f of failed) console.log(`  ${f.name} ${f.detail}`); }
process.exit(failed.length ? 1 : 0);
