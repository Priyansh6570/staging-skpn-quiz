// End-to-end smoke test against a running dev server.
import { CODE, closeOtp, plantOtp } from "./otp.mjs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3991";
const ORIGIN = BASE;
let cookie = "";
// The proof of mobile ownership rides separately from the session: registration needs it before
// there is an account to have a session for.
let proof = "";

const call = async (path, init = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      origin: ORIGIN,
      "content-type": "application/json",
      ...([cookie, proof].filter(Boolean).length ? { cookie: [cookie, proof].filter(Boolean).join("; ") } : {}),
      ...init.headers,
    },
    redirect: "manual",
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const [pair] = c.split(";");
    if (pair.startsWith("skpn_session=")) cookie = pair;
    if (pair.startsWith("skpn_mobile_verified=")) proof = pair;
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

const registration = {
  mobile, email: "", fullName: "Smoke Test Student", gender: "male", dateOfBirth: "2009-05-14",
  address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
  category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test Higher Secondary",
  competitiveExam: null, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true,
};

r = await call("/api/register", { method: "POST", body: JSON.stringify(registration) });
check("register refuses an unverified mobile", r.status === 403 && r.body.error === "mobile_not_verified", `status ${r.status}`);

// --- otp ---------------------------------------------------------------------------------------------
await plantOtp(mobile, "register");

r = await call("/api/otp/verify", { method: "POST", body: JSON.stringify({ mobile, code: "000000", purpose: "register" }) });
check("otp rejects a wrong code", r.status === 400 && r.body.error === "wrong_code", JSON.stringify(r.body));
check("...and says how many tries are left", r.body.attemptsRemaining === 4, JSON.stringify(r.body));

r = await call("/api/otp/verify", { method: "POST", body: JSON.stringify({ mobile, code: CODE, purpose: "login" }) });
check("otp refuses a register code used to sign in", r.status === 400 && r.body.error === "otp_purpose_mismatch", JSON.stringify(r.body));

r = await call("/api/otp/verify", { method: "POST", body: JSON.stringify({ mobile, code: CODE, purpose: "register" }) });
check("otp accepts the right code", r.status === 200 && r.body.ok === true, JSON.stringify(r.body));
check("...and issues no session on its own", (await call("/api/session")).body.signedIn === false);
check("...and never echoes the code", !JSON.stringify(r.body).includes(CODE), JSON.stringify(r.body));

r = await call("/api/otp/verify", { method: "POST", body: JSON.stringify({ mobile, code: CODE, purpose: "register" }) });
check("a spent code cannot be replayed", r.status === 400 && r.body.error === "otp_consumed", JSON.stringify(r.body));

r = await call("/api/otp/send", { method: "POST", body: JSON.stringify({ mobile: "12345", purpose: "register" }) });
check("otp send rejects a non-Indian mobile before spending a credit", r.status === 400, `status ${r.status}`);

r = await call("/api/register", { method: "POST", body: JSON.stringify(registration) });
check("register succeeds", r.status === 200 && r.body.ok === true, JSON.stringify(r.body).slice(0, 100));

r = await call("/api/session");
check("session signed in after register", r.body.signedIn === true, JSON.stringify(r.body));

r = await call("/api/register/check-mobile", { method: "POST", body: JSON.stringify({ mobile }) });
check("check-mobile now taken", r.body.available === false);

// --- nothing before Begin may write an attempt --------------------------------------------------------
r = await call("/quiz/rules");
check("rules gate loads", r.status === 200, `status ${r.status}`);
r = await call("/quiz");
check("GET /quiz with no attempt redirects to the rules gate", r.status === 307 || r.status === 302, `status ${r.status}`);
r = await call("/api/session");
check("loading instructions writes no attempt", r.body.hasCertificates === false, JSON.stringify(r.body));
await call("/");
await call("/quiz/rules");
r = await call("/api/session");
check("away-and-back still writes no attempt", r.body.hasCertificates === false, JSON.stringify(r.body));

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
check("racing submits agree on the outcome", a.body.submittedAt === b.body.submittedAt, `${a.body.submittedAt} vs ${b.body.submittedAt}`);
// The score is computed and stored server-side; the proof it happened is the certificate, not a
// number in the body. Neither racer may learn it — see the leak sweep at the end of this file.
check("neither racing submit returns a score", !("score" in a.body) && !("score" in b.body), JSON.stringify(a.body));
check("certificate issued", !!a.body.certificateNumber || !!b.body.certificateNumber, JSON.stringify(a.body.certificateNumber ?? b.body.certificateNumber));

r = await call(`/api/quiz/attempts/${attemptId}/submit`, { method: "POST", body: JSON.stringify({ reason: "manual" }) });
check("third submit is idempotent", r.status === 200 && r.body.alreadySubmitted === true);

// --- one attempt ever -------------------------------------------------------------------------------------------
r = await call("/api/quiz/attempts", { method: "POST", body: JSON.stringify({ rulesAccepted: true }) });
check("second attempt refused", r.status === 409, `status ${r.status}`);

// --- every competitive-exam option the form can offer clears validation -------------------------------
//
// The form and the server used to hold two different lists. The server validated against the design
// export's 34-entry EXAMS, which has "JEE Main" and "NEET UG" but no bare "JEE" or "NEET", so two of
// the four options the form offered came back 400 invalid; the Hindi labels for Other and None were
// refused for the same reason.
//
// zod runs before the mobile-proof check, so each option is probed with an unverified number:
// 403 mobile_not_verified means the body cleared the schema, 400 means the enum refused it. That
// spends no OTP, which matters here — the per-IP verify limit is 30 a minute and this file now
// walks several students.
{
  // Must equal EXAM_KEYS in lib/registration.ts.
  const EXAM_OPTIONS = ["NEET", "JEE", "CLAT", "CAT", "Other", "None"];
  const saved = cookie;
  const savedProof = proof;
  const probe = async (exam) => {
    cookie = "";
    proof = "";
    return call("/api/register", { method: "POST", body: JSON.stringify({
      mobile: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`,
      email: "", fullName: "Exam Option Probe", gender: "male", dateOfBirth: "2009-05-14",
      address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
      category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test School",
      competitiveExam: exam, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true }) });
  };
  for (const exam of [...EXAM_OPTIONS, null]) {
    const res = await probe(exam);
    check(`competitiveExam ${JSON.stringify(exam)} clears validation`,
      res.status === 403 && res.body.error === "mobile_not_verified", `${res.status} ${JSON.stringify(res.body)}`);
  }
  // The enum is still an enum. Without this, replacing it with z.string() would make every case
  // above pass while accepting anything at all.
  const bad = await probe("JEE Main");
  check("an exam the form does not offer is refused", bad.status === 400, `${bad.status} ${JSON.stringify(bad.body)}`);
  cookie = saved;
  proof = savedProof;
}

// --- a student who has registered but never sat a paper is not reported as finished -------------------
//
// This one registers for real, because it also proves JEE round-trips through storage.
{
  const m = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  const saved = cookie;
  const savedProof = proof;
  cookie = "";
  proof = "";
  await plantOtp(m, "register");
  await call("/api/otp/verify", { method: "POST", body: JSON.stringify({ mobile: m, code: CODE, purpose: "register" }) });
  const reg = await call("/api/register", { method: "POST", body: JSON.stringify({
    mobile: m, email: "", fullName: "Fresh Registrant", gender: "male", dateOfBirth: "2009-05-14",
    address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
    category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test School",
    competitiveExam: "JEE", isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true }) });
  check("registering with JEE succeeds", reg.status === 200 && reg.body.ok === true, JSON.stringify(reg.body));
  check("...and returns no Mongo id", !JSON.stringify(reg.body).includes("userId"), JSON.stringify(reg.body));

  let me = await call("/api/me");
  check("...and JEE is stored unchanged", me.body.competitiveExam === "JEE", JSON.stringify(me.body.competitiveExam));
  check("a fresh registrant has no attempt", me.body.attempt === null, JSON.stringify(me.body.attempt));
  check("...and the session shows none sat", (await call("/api/session")).body.hasCertificates === false, "");

  // Opening a paper is still not completion: it is in_progress until it is handed in.
  const started = await call("/api/quiz/attempts", { method: "POST", body: JSON.stringify({ rulesAccepted: true }) });
  me = await call("/api/me");
  check("an open paper is still not an attempt", me.body.attempt === null, JSON.stringify(me.body.attempt));

  await call(`/api/quiz/attempts/${started.body.attemptId}/submit`, { method: "POST", body: JSON.stringify({ reason: "manual" }) });
  me = await call("/api/me");
  check("a submitted paper is an attempt", me.body.attempt !== null && !!me.body.attempt.submittedAt, JSON.stringify(me.body.attempt));
  check("...and the session flips to sat", (await call("/api/session")).body.hasCertificates === true, "");
  cookie = saved;
  proof = savedProof;
}

// --- an unfinished attempt resumes rather than locking the student out ---------------------------------
{
  const other = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  const saved = cookie;
  cookie = "";
  proof = "";
  await plantOtp(other, "register");
  await call("/api/otp/verify", { method: "POST", body: JSON.stringify({ mobile: other, code: CODE, purpose: "register" }) });
  await call("/api/register", { method: "POST", body: JSON.stringify({
    mobile: other, email: "", fullName: "Resume Probe", gender: "male", dateOfBirth: "2009-05-14",
    address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
    category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test School",
    competitiveExam: null, isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true }) });
  const first = await call("/api/quiz/attempts", { method: "POST", body: JSON.stringify({ rulesAccepted: true }) });
  await call("/");
  await call("/quiz/rules");
  const again = await call("/api/quiz/attempts", { method: "POST", body: JSON.stringify({ rulesAccepted: true }) });
  check("returning to instructions resumes the same attempt", again.status === 200 && again.body.attemptId === first.body.attemptId, `${again.status} ${again.body.attemptId} vs ${first.body.attemptId}`);
  cookie = saved;
}

// --- me / certificates -------------------------------------------------------------------------------------------
r = await call("/api/me");
check("/api/me returns the profile", r.status === 200 && r.body.displayName === "Smoke Test Student", JSON.stringify(r.body).slice(0, 80));
check("/api/me never returns sessionVersion", !JSON.stringify(r.body).includes("sessionVersion"));

r = await call("/api/certificates");
check("/api/certificates lists one", r.status === 200 && r.body.length === 1, JSON.stringify(r.body).slice(0, 120));

// --- sign-out revokes everywhere -------------------------------------------------------------------------------------------
const stolen = cookie;
await call("/api/auth/signout", { method: "POST" });
cookie = stolen;
r = await call("/api/session");
check("sign-out revokes an already-issued cookie", r.body.signedIn === false, JSON.stringify(r.body));

// --- sign-in is the code, not the number ------------------------------------------------------------
cookie = "";
proof = "";
r = await call("/api/otp/send", { method: "POST", body: JSON.stringify({ mobile: "9000000001", purpose: "login" }) });
check("sign-in reports an unregistered number without sending", r.status === 200 && r.body.registered === false, JSON.stringify(r.body));
check("...and issues no session", (await call("/api/session")).body.signedIn === false);

await plantOtp(mobile, "login");
r = await call("/api/otp/verify", { method: "POST", body: JSON.stringify({ mobile, code: "999999", purpose: "login" }) });
check("sign-in refuses a wrong code", r.status === 400, `status ${r.status}`);
check("a wrong code issues no session", (await call("/api/session")).body.signedIn === false);

r = await call("/api/otp/verify", { method: "POST", body: JSON.stringify({ mobile, code: CODE, purpose: "login" }) });
check("sign-in succeeds on the right code", r.status === 200 && r.body.registered === true, JSON.stringify(r.body));
check("sign-in issues a working session", (await call("/api/session")).body.signedIn === true);

// Five wrong tries kill the code outright rather than leaving it guessable.
cookie = "";
await plantOtp(mobile, "login");
for (let i = 0; i < 4; i++) {
  await call("/api/otp/verify", { method: "POST", body: JSON.stringify({ mobile, code: "111111", purpose: "login" }) });
}
r = await call("/api/otp/verify", { method: "POST", body: JSON.stringify({ mobile, code: "111111", purpose: "login" }) });
check("the fifth wrong try exhausts the code", r.status === 429 && r.body.error === "attempts_exhausted", JSON.stringify(r.body));
r = await call("/api/otp/verify", { method: "POST", body: JSON.stringify({ mobile, code: CODE, purpose: "login" }) });
check("...and the correct code no longer works after that", r.status === 400, JSON.stringify(r.body));
check("...and no session was issued", (await call("/api/session")).body.signedIn === false);

// --- nothing a student route returns carries a score, or the primitives it correlates with -----------
//
// score never reaches the client: selection is by district merit list and committee lottery, the
// results are published by the Nyas, and scores correlated across attempts are a path to inferring
// the answer key. correctOptionId must never leave the repository layer at all. `answered` and
// `timeTakenSeconds` are the raw per-attempt measures, which the quiz screen computes for itself.
//
// This walks one student — registered, mid-paper, then finished — and greps every body it gets.
// Deliberately a scan of the serialised response rather than a check of named fields: a serialiser
// that starts spreading a document fails here.
{
  const BANNED = ["score", "correctOptionId", "answered", "timeTakenSeconds"];
  const m = `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  cookie = "";
  proof = "";
  await plantOtp(m, "register");
  await call("/api/otp/verify", { method: "POST", body: JSON.stringify({ mobile: m, code: CODE, purpose: "register" }) });
  await call("/api/register", { method: "POST", body: JSON.stringify({
    mobile: m, email: "", fullName: "Leak Probe", gender: "male", dateOfBirth: "2009-05-14",
    address: { line: "12 Test Marg", cityVillage: "Sehore", district: "Sehore", pincode: "466001" },
    category: "vidyalaya", educationLevel: "Class 10", institutionName: "Test School",
    competitiveExam: "NEET", isDivyang: false, guardianName: "", rulesAccepted: true, privacyAccepted: true }) });

  const seen = [];
  const sweep = async (label, path, init) => {
    const res = await call(path, init);
    seen.push([label, JSON.stringify(res.body ?? "")]);
    return res;
  };

  await sweep("session", "/api/session");
  await sweep("me", "/api/me");
  await sweep("me/certificate", "/api/me/certificate");
  await sweep("certificates (none yet)", "/api/certificates");
  const open = await sweep("attempts POST", "/api/quiz/attempts", { method: "POST", body: JSON.stringify({ rulesAccepted: true }) });
  const id = open.body.attemptId;
  const paper = await sweep("attempt GET (in progress)", `/api/quiz/attempts/${id}`);
  await sweep("answers", `/api/quiz/attempts/${id}/answers`, {
    method: "POST",
    body: JSON.stringify({ answers: [{ questionId: paper.body.questions[0].id, selectedOptionId: paper.body.questions[0].options[0].id, clientSeq: 1 }] }),
  });
  await sweep("submit", `/api/quiz/attempts/${id}/submit`, { method: "POST", body: JSON.stringify({ reason: "manual" }) });
  await sweep("submit (replayed)", `/api/quiz/attempts/${id}/submit`, { method: "POST", body: JSON.stringify({ reason: "manual" }) });
  await sweep("attempt GET (finished)", `/api/quiz/attempts/${id}`);
  await sweep("certificates (issued)", "/api/certificates");
  await sweep("me (finished)", "/api/me");
  await sweep("me/certificate (finished)", "/api/me/certificate");
  await sweep("session (finished)", "/api/session");
  await sweep("register 400", "/api/register", { method: "POST", body: JSON.stringify({ mobile: "x" }) });

  for (const key of BANNED) {
    const leaks = seen.filter(([, body]) => body.includes(`"${key}"`)).map(([label]) => label);
    check(`no student route body carries ${key}`, leaks.length === 0, leaks.join(", ") || `${seen.length} bodies scanned`);
  }
  // The bare word, not only the JSON key: a value echoed into a message would slip a key check.
  const rawScore = seen.filter(([, body]) => /score/i.test(body)).map(([label]) => label);
  check("no student route body mentions score at all", rawScore.length === 0, rawScore.join(", "));
  check("...and no body carries a Mongo _id", seen.every(([, body]) => !body.includes('"_id"')), "");
  // A 400 must not enumerate the schema back to whoever posted the bad body.
  const bad = seen.find(([label]) => label === "register 400")[1];
  check("...and a 400 names no fields", bad === JSON.stringify({ error: "invalid" }), bad);
}

await closeOtp();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log("FAILED:"); for (const f of failed) console.log(`  ${f.name} ${f.detail}`); }
process.exit(failed.length ? 1 : 0);
