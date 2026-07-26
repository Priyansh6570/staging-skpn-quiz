# AUDIT — Shri Krishna Pathey Nyas Quiz Platform

Read-only audit of the Claude Design export against `uploads/SKPN_Quiz_Platform_Design_Brief.md`
(the spec of record), ahead of a Next.js (App Router) + MongoDB rebuild on a Hostinger VPS.

**Sources read:** the brief in full; all 12 `.dc.html` files; `assets/site.js`; `support.js`;
`ASSETS.md`; `uploads/questions.json`; `uploads/quiz-questions.json`.

No files were modified. No code was written.

---

## 0. The one thing to read first

**The HTML implements a materially different product from the brief in three places, and each
difference is load-bearing.** Everything downstream — schema, API surface, security model,
question-bank sizing — forks on which of the two is authoritative. This must be resolved with the
client *before* any code is written, not discovered during the port.

| | Brief says | HTML does |
|---|---|---|
| **Identity / auth** | Email is the account key. Google Sign-In + email OTP via Resend (§8). Mobile collected but *not* an auth factor. | Mobile number is the identity and the sign-in credential. No Google, no OTP, no email verification, no password. `Login.dc.html` accepts any well-formed `[6-9]\d{9}` and sets `localStorage.skpn_signed_in = "1"`. Email is an **optional** field. |
| **Attempts** | Unlimited attempts, **best attempt counts** (§6.3, §9.2, §9.5, §6.8). | "प्रत्येक विद्यार्थी केवल एक बार" — one attempt only, hard-blocked, stated in `Quiz.dc.html`, `Profile.dc.html` and `Legal.dc.html` (terms). |
| **Question bank** | Target **300+**, 30 drawn at random per attempt, options shuffled (§9.4). | 50 questions exist. 30 drawn at random per attempt. Options never shuffled. |

These are not oversights in the design — they are consistent across every page, which suggests the
client changed the requirement after the brief was written. **My reading:** the HTML is the newer
statement of intent, and the one-attempt rule is what makes a 50-question bank survivable. But that
is an inference, and it is the client's call. Get it in writing.

A fourth, smaller fork: the brief specifies `/contact` as its own page with a form; the HTML folds
contact into `About.dc.html#sampark` as a mailto card with a **phone number the brief explicitly
told us not to invent** (§14.8).

---

## 1. PAGE INVENTORY

### 1.1 Genuine pages

| File | Route | Auth | Rendering strategy | Notes |
|---|---|---|---|---|
| `Home v5.dc.html` | `/` | Public | **SSG** + client session hydration | Hero CTA, nav "My Certificates" and `CtaBox` all branch on `signedIn`/`attempts`. Do **not** make the page dynamic for this — keep the HTML CDN-cacheable and swap the CTA client-side from a small session endpoint. At 5 lakh users on a launch-day spike, a per-request render of the homepage is the first thing that falls over. |
| `About.dc.html` | `/about` | Public | **SSG** | Carries `#sampark` contact block. Imports `Leadership`. |
| `Pratiyogita.dc.html` | `/pratiyogita` | Public | **SSG** + client session hydration | Same CTA-branching pattern as Home. |
| `Rules.dc.html` | `/rules` **and** `/quiz/rules` | Mixed — see note | **SSG** for `/rules`; **dynamic (auth)** for `/quiz/rules` | One file serves both. The acceptance block renders only when `signedIn && attempts === 0`. In Next.js this should be **two routes sharing one content component**: `/rules` static and public, `/quiz/rules` auth-gated with the acceptance POST. |
| `Register.dc.html` | `/register` | Public | **Static shell**, client-interactive, POSTs to route handlers | 4 steps: mobile → applicant details → education → declaration. |
| `Login.dc.html` | `/login` | Public | **Static shell**, client-interactive | Currently authenticates nothing (see §4.5). |
| `Profile.dc.html` | `/profile` | **Required** | **Dynamic**, server-rendered, `no-store` | Reads `localStorage.skpn_profile` / `skpn_attempt`; falls back to a hardcoded `STUDENT` fixture. |
| `Quiz.dc.html` | **four routes** — see 1.2 | **Required** | Dynamic | Single file, four phases driven by `state.phase`. |
| `Certificates.dc.html` | `/certificates` **and** `/certificates/[id]` | **Required** | **Dynamic**, auth | Conflated: shows exactly one certificate, a static `uploads/cert.jpeg` with the name overlaid in CSS. No list, no per-attempt certificate, no certificate number. |
| `Legal.dc.html` | `/privacy` **and** `/terms` | Public | **SSG** ×2 | One file, tab-switched, deep-linked via `?doc=terms`. In Next.js these must be two real routes — the footer already links `Legal.dc.html` and `Legal.dc.html?doc=terms` separately, and a query-string legal notice is not something a government site should ship. |

### 1.2 `Quiz.dc.html` unpacked

One component, four mutually-exclusive `sc-if` blocks. Each becomes its own route:

| Phase flag | Brief route | Auth | Rendering | Notes |
|---|---|---|---|---|
| `isInstructions` | `/quiz/instructions` | Required | Dynamic (auth) | Full site chrome (header + footer). Content is static; only the gate is dynamic. |
| `isAttempt` | `/quiz/attempt/[id]` | Required | Dynamic, `no-store`, client-interactive | **Chromeless** — logo, language toggle, timer only. Correct per §9.3. |
| `isSubmitted` | `/quiz/submitted/[id]` | Required | Dynamic | Header shows `has-certificates="true"`. |
| `isDone` | *(no brief route)* | Required | Dynamic | "Your attempt is already recorded." Exists only because of the one-attempt rule. Needs a route — suggest `/quiz` resolving to this or to `/quiz/rules` depending on attempt state. |

### 1.3 Shared components

| File | Used by | Props consumed | Notes |
|---|---|---|---|
| `SiteHeader.dc.html` | Every page except the quiz-attempt phase | `lang`, `active`, `signedIn`, `hasCertificates`, `onToggleLang` | Sticky bar, desktop nav, mobile drawer with focus-adjacent behaviour (Escape closes, `body.overflow` locked). Conditional "My Certificates" item is filtered out of the array — **correctly absent from the DOM**, matching §4. |
| `SiteFooter.dc.html` | Every page except the quiz-attempt phase | `lang` | |
| `CtaBox.dc.html` | Home, Pratiyogita | `lang`, `signedIn` | Reads `localStorage` directly on mount and overrides its own prop. Three states: out / pending / done. |
| `Leadership.dc.html` | **Home and About** | `lang` | **Not mentioned in your list and not in the brief.** Four named office-holders with photographs. See §6.3 — this is a clearance problem, not a code problem. |

### 1.4 In the brief, no HTML yet

| Brief route | Status | Consequence |
|---|---|---|
| `/contact` (§6.4) | **Missing.** Folded into `/about#sampark` as a mailto card. | The specified contact **form** (name / email / mobile / subject dropdown / message, honeypot, rate limit, no CAPTCHA) does not exist. Needs design or an explicit client decision to ship email-only. |
| `/results` (§4, §14.4) | **Missing entirely.** | Blocked on §14.4 anyway. Reserve the route. |
| `/verify/[certificateNumber]` (§10.2) | **Missing entirely.** | Without it the certificate is a JPEG anyone can edit. This is the single control that makes the certificate mean anything. |
| `/quiz/rules` as a distinct route | Folded into `Rules.dc.html`. | Splittable; low risk. |
| `/certificates/[id]` | Folded into `Certificates.dc.html`. | Under the one-attempt rule this is nearly moot, but the route is still needed for a stable, shareable certificate URL. |
| Registration step 1 = identity verification (§6.6, §8.2) | **Missing.** Step 1 is a mobile-number field with no verification of any kind. | The entire auth model is absent from the design. |
| Guardian consent block (§7 field 17, §14.1) | **Partially present** — a single always-visible "Guardian's name" text input on step 4, not conditional on age, not required, no consent statement. | DPDP exposure. See §4.10. |
| 64 Kalas / 14 Vidyas as browsable content on `/pratiyogita` (§6.3 — "the page's centrepiece") | **On the homepage instead.** `/pratiyogita` has none of it. | Content move, not a rebuild blocker, but the brief's intent is inverted. |
| "How selection works" on `/pratiyogita` (§6.3) | **Missing** from that page. Present on `/rules` §5. | The "a high score does not by itself win" line (§6.3.5, §9.5 — *"the single most important expectation-setting line in the entire product"*) appears **nowhere in the entire export**. |
| Score on the submitted screen (§9.5) | **Missing.** | See §6.5. |

### 1.5 In the HTML, not in the brief

| Thing | Where | Assessment |
|---|---|---|
| `Leadership` component — 4 named officials + photographs | Home, About | §6.2: *"Do not publish the full name list of trustees … without written clearance."* Needs sign-off before it ships. |
| Competitive-exam field (`exam`, 34-item list + Other/None) | Register step 3 | Not in the §7.1 field table. Also drives the exam marquee on Pratiyogita. Needs a schema field and a stated purpose. |
| Closing date **4 September 2026 (Janmashtami)** | Home, Pratiyogita | §14.3 lists the closing date as **OPEN**. A specific date is now on two public pages. Confirm or remove. |
| Phone **0755 4535064** | About, SiteFooter | §14.8 / §6.4: *"Do not invent a phone number."* Confirm it is real and staffed. |
| Postal address, Ravindra Bhawan, Bhopal 462003 | About, SiteFooter | §14.8 `[VERIFY]`. |
| Social links (Instagram / Facebook / X / YouTube) | SiteHeader drawer, SiteFooter | All point at the **bare platform root URLs** — `https://www.instagram.com/`, etc. Placeholders. Either supply real handles or delete the block. |
| `assets/site.js` boot loader + SPA click shim | Every page | Delete in the rebuild. See §6.7. |
| Eligibility clauses in `Rules.dc.html` §1 | `/rules` | The rules page carries a **richer and apparently more source-faithful** ruleset than the brief's paraphrase — see §6.2. Treat the rules page as the newer source, not the brief. |

---

## 2. API SURFACE

Derived strictly from what the markup and JS actually do. Nothing invented beyond the auth
endpoints, which are required by the brief and have no HTML counterpart yet.

**Convention below:** `🔥` marks the quiz hot path — the four endpoints that carry launch-day
concurrency and must be treated as a performance budget, not a feature.

### 2.1 Auth

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| `GET` | `/api/session` | Public | — | `{ signedIn, name?, initial?, attemptCount, hasCertificates, lang }` | **Called on every page** to hydrate header, CTA and CtaBox. Must be tiny, `no-store`, and must not touch the users collection on every hit — read it from the session cookie payload. Currently `localStorage`. |
| `POST` | `/api/auth/otp/request` | Public | `{ email, purpose }` | `{ ok, cooldownSeconds }` | Brief §8.1/§8.5. **No HTML exists.** |
| `POST` | `/api/auth/otp/verify` | Public | `{ email, code }` | `{ ok }` + session cookie | 6-digit, 5-min expiry, max 5 tries. |
| `GET/POST` | `/api/auth/[...nextauth]` | Public | Auth.js | — | Google provider. Brief §8.6 recommends Auth.js + MongoDB adapter; agreed. |
| `POST` | `/api/auth/signout` | Session | — | `204` | `Profile.dc.html` `signOut()` currently just clears 4 `localStorage` keys. |

*If the client confirms the mobile-only model instead, this whole block collapses to a mobile-OTP
pair — but then SMS/DLT comes back and §8.4/§14.10/§14.11 change completely. Another reason the
fork in §0 must close first.*

### 2.2 Registration

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| `POST` | `/api/register/check-mobile` | Public (throttled) | `{ mobile }` | `{ available: boolean }` | Fires on blur at step 1 (`onMobileBlur`). **Currently hardcoded**: `mobileProblem()` returns `"duplicate"` iff the number is literally `9876543210`. Must never reveal *which* account holds the number (§7.3). Rate-limit per IP **and** per session or it becomes a "who has registered?" oracle. |
| `POST` | `/api/register` | Identity established (per brief) | Full profile object — see 3.1 | `{ ok, userId }` → redirect `/quiz/rules` | The design's `next()` at step 3 writes the whole object to `localStorage.skpn_profile`, fakes a 1.8s spinner, then hard-navigates to `Rules.dc.html`. That fake latency is a real UX decision the design made — keep the loading state, drop the `setTimeout`. |
| `GET` | `/api/register/draft` / `PATCH` | Session | partial | `{ step, values }` | Not in the HTML, but required by §7.3's "orphan account" handling — a blocked student must resume where they stopped. Only needed under the brief's identity-first model. |

Districts (55), education levels (dependent on category), and the exam list are **client-side
constants** in `Register.dc.html`. Keep them as bundled constants or a build-time import — they do
not warrant an endpoint, and a network round-trip for a district list on rural 4G is exactly the
pattern §11.3 warns against.

### 2.3 Quiz — the hot path

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| 🔥 `POST` | `/api/quiz/attempts` | Session | `{ rulesAcceptedAt }` | `{ attemptId, questions: [{ id, text:{hi,en}, options:[{id,text:{hi,en}}] }], serverNow, expiresAt }` | Replaces `fetch("uploads/quiz-questions.json")` in `componentDidMount`. **Answer keys must not appear in this payload.** Returns the 30 drawn questions in one shot — this is correct for a 10-minute paper on patchy 4G; do not paginate it. Enforces single-active-attempt (§9.4) and, under the current HTML rule, one-attempt-ever. |
| 🔥 `GET` | `/api/quiz/attempts/[id]` | Session + ownership | — | same shape + `answers`, `serverNow`, `expiresAt` | Resume path. §9.4: *"A student who returns should resume the same attempt with the same remaining time."* The design has **no resume state at all** — a refresh loses everything. |
| 🔥 `PATCH` | `/api/quiz/attempts/[id]/answers` | Session + ownership | `{ questionId, selectedOptionId \| null, clientSeq }` | `{ ok, serverNow }` | Autosave on every selection and every Clear Response. Currently answers live only in React state. **Highest request volume in the product** — 30 questions × ~1.3 changes × 5 lakh students. Must be a single indexed upsert, idempotent on `clientSeq`, no read-modify-write of the whole answers array. |
| 🔥 `POST` | `/api/quiz/attempts/[id]/submit` | Session + ownership | `{ reason: "manual" \| "auto" }` | `{ score, total, answered, timeTakenSeconds, submittedAt, certificateId }` | Scores server-side. Idempotent — the auto-submit timer and a manual submit **will** race. Rejects anything past `startedAt + 600s + grace`, and must return a designed "your time expired while submitting" state rather than a 4xx the UI renders as a crash (§9.4). |
| `GET` | `/api/quiz/attempts/[id]/heartbeat` | Session + ownership | — | `{ serverNow, expiresAt, status }` | Not in the HTML but required to make the timer honest. Poll ~every 20–30s; on a spike this is cheaper than trusting `setInterval`, which mobile browsers throttle hard in background tabs. |

### 2.4 Profile, certificates, misc

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| `GET` | `/api/me` | Session | — | Full read-only profile + attempt summary | Feeds `/profile`. Replaces `localStorage.skpn_profile` + the hardcoded `STUDENT` fixture. |
| `PATCH` | `/api/me/language` | Session | `{ lang: "hi" \| "en" }` | `204` + `Set-Cookie` | The **only** editable control on `/profile` (§6.8). Must write `preferredLanguage` to the user record *and* mirror to a cookie (§5) — the design only writes `localStorage`. |
| `GET` | `/api/certificates` | Session | — | `[{ id, attemptId, issuedAt, certificateNumber }]` | `/certificates` list. |
| `GET` | `/api/certificates/[id]` | Session + ownership | — | metadata for preview | |
| `GET` | `/api/certificates/[id]/download` | Session + ownership | — | `application/pdf` | §10.4: server-side PDF, A4 landscape, embedded Devanagari, vector logo. The design ships a **static JPEG with a CSS name overlay** — see §6.6. Cache aggressively; the PDF is immutable once issued. |
| `GET` | `/api/verify/[certificateNumber]` | **Public** | — | `{ name, district, date }` — **nothing more** | §10.2. Backs `/verify/[n]`. Rate-limit: it is a public name lookup keyed by a guessable number, so certificate numbers must be non-sequential. |
| `POST` | `/api/contact` | Public | `{ name, email, mobile?, subject, message, honeypot }` | `{ ok }` | §6.4. No HTML exists. Honeypot + rate limit, **no CAPTCHA**. |

### 2.5 Performance-critical set

Rank order for load testing, worst first:

1. `PATCH /api/quiz/attempts/[id]/answers` — highest write volume in the system.
2. `POST /api/quiz/attempts` — thundering herd at 00:00 on 29 July. Every call draws 30 questions and writes an attempt document.
3. `POST /api/quiz/attempts/[id]/submit` — spiky and bursty; 10 minutes after every start spike, plus a tail of auto-submits.
4. `GET /api/session` — lowest cost per call, highest call count overall (every page, every visitor).
5. `POST /api/register` — one per student for the life of the competition, but all of them in the first 72 hours.

The question bank is small and immutable during the competition: **hold all active questions in
process memory** and draw from that. Do not run `$sample` against MongoDB on the start path.

---

## 3. MONGODB SCHEMA

### 3.1 `users`

| Field | Type | Source | Notes |
|---|---|---|---|
| `_id` | ObjectId | | |
| `email` | string, lowercased+trimmed | Register step 2 | Brief §13/§8.2: **unique, the account key**. HTML: **optional, unvalidated, not unique**. Direct conflict — see 3.7. |
| `authProviders` | `[{ provider, providerAccountId, linkedAt }]` | — | Brief only. `providerAccountId` **never leaves the server**. |
| `mobile` | string, 10 digits | Register step 1 | `^[6-9]\d{9}$`. **Unique index** (§7.3, §8.3) — but read §14.12 before shipping a hard block. HTML treats this as the identity. |
| `fullName` | string 3–100 | Register step 2 | Devanagari and Latin both accepted. |
| `gender` | enum `male\|female\|other` | Register step 2 | Stored as a key, **not** the localised label — the design writes the display string (`"पुरुष"` / `"Male"`) straight into the profile object. That breaks the merit lists (§14.2). |
| `dateOfBirth` | Date | Register step 2 | **Bug:** the field is displayed without an "optional" chip, but `canAdvance()` for step 1 never checks it — a student can register with no DOB. Under DPDP that is the field that determines minor status. |
| `address` | `{ line, cityVillage, district, state:"MP", pincode }` | Register step 2 | Store `district` as the **English key** (`"Sehore"`); the design already does this correctly and derives the Hindi label at render. |
| `category` | enum `vidyalaya\|mahavidyalaya` | Register step 3 | Stored as key. Correct in the design. |
| `educationLevel` | string | Register step 3 | **Stored as the localised label** (`"कक्षा 10"` vs `"Class 10"`). Must become a stable key. |
| `institutionName` | string 3–150 | Register step 3 | Free text, per §7.1. |
| `competitiveExam` | string \| null | Register step 3 | **Not in brief §13.** Design-only field. |
| `isDivyang` | boolean | Register step 3 | |
| `preferredLanguage` | enum `hi\|en` | Header toggle | §5 requires it on the user record **and** mirrored to a cookie. Design: `localStorage` only. |
| `consents` | `{ rulesAcceptedAt, privacyAcceptedAt, guardian: { name, mobile?, statementVersion, acceptedAt } }` | Register step 4 | Design collects **guardian name only**, unconditionally, not required, with no consent statement. |
| `registrationStatus` | enum `incomplete\|complete` | — | Required by §7.3's orphan-account handling. Absent from the design. |
| `bestScore`, `bestAttemptId`, `bestAttemptAt`, `attemptCount` | number / ObjectId / Date / number | denormalised | See 3.6 — do not compute merit lists by aggregating `attempts` at 5 lakh scale. |
| `createdAt`, `updatedAt` | Date | | |

**Indexes**

| Index | Serves |
|---|---|
| `{ email: 1 }` unique, partial on `{ email: { $exists: true, $ne: null } }` | Account lookup on sign-in; the §8.2 account-linking rule (Google `x@gmail.com` and email-OTP `x@gmail.com` must resolve to **one** record). Partial because the HTML model makes email optional. |
| `{ mobile: 1 }` unique | Duplicate check on blur; sign-in under the mobile model. |
| `{ category: 1, district: 1, gender: 1, bestScore: -1, bestAttemptAt: 1 }` | **The merit list.** "Top 50 per category per district, per gender/divyang class." The tiebreak on `bestAttemptAt` ascending is the fair one — earlier submission wins on equal score — and it must be decided by the client, not by index order. |
| `{ isDivyang: 1, category: 1, district: 1, bestScore: -1 }` partial on `isDivyang: true` | The divyang merit list, which is a separate list per §6.3/rules §5. |
| `{ registrationStatus: 1, createdAt: 1 }` | Purging incomplete registrations (§7.3, window `[OPEN]`). |
| `{ createdAt: 1 }` | Ops/reporting. |

### 3.2 `questions`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `externalId` | number | The `id` from `quiz-questions.json` (1–50). Keep it for traceability back to the source file. |
| `text` | `{ hi, en }` | Both required. |
| `options` | `[{ id, text: { hi, en } }]` | **Give options stable IDs.** Both JSON files key the answer by *array position*. Once options are shuffled per §9.4, positional keys are a correctness bug waiting to happen. |
| `correctOptionId` | string | **Never sent to the client. Ever.** Exclude it by projection at the repository layer, not at the serialiser — a projection you can forget is how it leaks. |
| `topic`, `difficulty` | string | Brief §13. Neither JSON file has them. |
| `isActive` | boolean | |

**Indexes:** `{ isActive: 1 }` (the draw pool); `{ externalId: 1 }` unique (import idempotency);
`{ topic: 1, difficulty: 1 }` (only if the client ever wants stratified draws — not needed at n=50).

### 3.3 `attempts`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Becomes `[id]` in `/quiz/attempt/[id]`. Use a non-enumerable id. |
| `userId` | ObjectId | |
| `questionIds` | `[ObjectId]` | §13: *"Store the questions actually served … so a grievance can be reconstructed years later."* Also store the **served option order** per question, or a shuffled paper cannot be reconstructed. |
| `startedAt`, `expiresAt` | Date | **Written server-side.** `expiresAt = startedAt + 600s`. The client never supplies either. |
| `answers` | `[{ questionId, selectedOptionId, answeredAt }]` | |
| `status` | enum `in_progress\|submitted\|auto_submitted\|expired` | |
| `submittedAt`, `score`, `timeTakenSeconds` | Date / number / number | |
| `district`, `category`, `gender`, `isDivyang` | snapshot | Denormalised at start. Merit lists must not depend on a profile edited after the fact — and the profile is meant to be immutable anyway (§6.8), so this is cheap insurance. |
| `rulesAcceptedAt` | Date | §6.5: the gate fires on **every** attempt, so the acceptance timestamp belongs on the attempt, not only on the user. |

**Indexes**

| Index | Serves |
|---|---|
| `{ userId: 1, status: 1 }` | Single-active-attempt check on start (§9.4); the one-attempt-ever gate. |
| `{ userId: 1, score: -1, submittedAt: 1 }` | Best-attempt lookup for `/profile` and `/quiz/submitted`. |
| `{ status: 1, expiresAt: 1 }` partial on `status: "in_progress"` | **The auto-submit sweeper.** A student who closes the tab at 04:00 leaves an `in_progress` attempt forever; a background job must expire and score it. Nothing in the design does this — the timer dies with the tab. |
| `{ _id: 1, userId: 1 }` | Ownership check on every hot-path call. |

### 3.4 `certificates`

`_id`, `userId`, `attemptId`, `certificateNumber` (**unique**, non-sequential), `issuedAt`,
`revokedAt`, `pdfKey`.

**Indexes:** `{ certificateNumber: 1 }` unique — backs `/verify/[n]`;
`{ userId: 1, issuedAt: -1 }` — the `/certificates` list;
`{ attemptId: 1 }` unique — one certificate per attempt, and idempotent issuance on submit retry.

### 3.5 `emailOtpChallenges` (brief model only)

`_id`, `email`, `codeHash`, `purpose`, `expiresAt`, `attemptCount`, `consumedAt`, `requestIp`.

**Indexes:** `{ email: 1, createdAt: -1 }` — cooldown and the 5-per-24h cap;
`{ expiresAt: 1 }` **TTL** — automatic cleanup;
`{ requestIp: 1, createdAt: -1 }` — per-IP throttle.

`codeHash` is a hash. The plaintext code exists only in the outbound email. Never logged.

### 3.6 `sessions` / `accounts`

Auth.js + MongoDB adapter manages these. **Do not hand-roll session storage alongside it** (§13).

### 3.7 Where the brief's §13 sketch and the HTML disagree

| # | Brief §13 | HTML | Recommendation |
|---|---|---|---|
| 1 | `email` unique, verified, **the account key** | `email` optional, unvalidated, non-unique; `mobile` is the key | **Blocking.** Resolve per §0. Whichever wins, the unique index on the *other* field still ships as a duplicate-detection aid. |
| 2 | `mobile` unique but **not** an auth factor | `mobile` **is** the auth factor | As above. |
| 3 | No `competitiveExam` field | Collected, with a 34-item list | Add to schema. Ask what it is for — if nothing uses it, collecting it from minors is a DPDP data-minimisation problem, not a harmless extra. |
| 4 | `consents.guardian: {...}` conditional on age | One optional `guardianName` text box, always shown | §14.1 is unresolved. The schema should be built for the full conditional block now so it does not need a migration in August. |
| 5 | `dateOfBirth` marked `[OPEN]` | Collected via a custom wheel picker, effectively optional | If DOB is not required, minor status cannot be determined and the guardian gate cannot function. |
| 6 | `attempts` plural, `score`, best-of | One attempt; **`score` is never computed, stored or displayed anywhere** | See §6.5 — this is the largest single functional gap in the export. |
| 7 | `certificateNumber` unique + verification route | Static JPEG, no number, no record | Certificates need a real collection from day one. |
| 8 | `gender` / `educationLevel` as values | Stored as **localised display strings** | Store keys. A merit list that groups on `"पुरुष"` and `"Male"` as different values is a silent correctness failure. |

### 3.8 Fields that must never reach the client

- `questions.correctOptionId` — the entire integrity of the competition rests on this one.
- `emailOtpChallenges.codeHash` and everything else in that collection.
- `users.authProviders[].providerAccountId`.
- Any other user's `mobile`, `email`, `dateOfBirth`, `address`, or attempt data — including via the duplicate-mobile check, which must answer only `available: true|false` (§7.3: *"Never reveal which email the number is attached to — that is somebody else's data."*).
- `attempts.answers` of anyone but the owner.
- Internal merit ranks and shortlist flags, before publication.

---

## 4. SECURITY REQUIREMENTS

Specific to this application. For each: what breaks if it is missing.

### 4.1 Answer keys must live server-side only — **highest severity**

**Current state:** `Quiz.dc.html` does
`fetch("uploads/quiz-questions.json").then(r => r.json())` and reads `row.answerIndex` directly in
the browser. **The complete answer key for all 50 questions is a public static file.**

**Required:** `correctOptionId` never appears in any response. The start endpoint projects it out.
Scoring happens only in `POST /submit`, by re-reading the question documents server-side and
comparing against the stored `answers` array.

**If missing:** anyone who opens DevTools — or simply visits `/uploads/quiz-questions.json` —
scores 30/30. With 102 scholarships of ₹1,00,000 decided from these merit lists, this is not a
theoretical exposure. It is a scandal with a URL. Note that the file must also be *removed from the
public asset path*, not merely unused: leaving it deployed but unreferenced is the same leak.

### 4.2 Scoring integrity

**Current state:** no score is computed anywhere. The submitted screen shows answered / not
answered / attempts / time taken. `recordAttempt()` writes a `localStorage` blob.

**Required:** score computed exclusively in the submit handler from the persisted `answers` and the
persisted `questionIds`. The client's reported score is never trusted, never accepted as input, and
never used to write `attempts.score`. Submission is idempotent — first write wins, subsequent calls
return the stored result.

**If missing:** a `POST` with `{score: 30}` in the body wins a lottery ticket. Any client-computed
score is a client-controlled score.

### 4.3 Timer authority

**Current state:** `setInterval(..., 1000)` decrementing `state.left`, started by `begin()`.
Nothing server-side exists. Consequences visible in the code: closing the tab stops the clock;
mobile browsers throttle background intervals so the displayed time drifts from real time; the
accessibility announcements at 5:00 / 2:00 / 1:00 / 0:30 fire off the same drifting counter; and on
auto-submit, `recordAttempt()` reads a stale `state.left`, so the recorded "time taken" is wrong.

**Required (§9.4):** `startedAt` and `expiresAt` written server-side at attempt creation. The client
renders a countdown seeded from `serverNow` and reconciled on every autosave response and on a
~30-second heartbeat. Submit rejects past `expiresAt + grace` (suggest 10–15s to absorb rural 4G
latency — a student on a dropping connection should not lose a paper to a 3-second round trip). A
background sweeper expires abandoned `in_progress` attempts.

**If missing:** the timer is advisory. Pause it by suspending the tab, or by editing one variable in
the console, and the 10-minute rule is decoration.

### 4.4 Session handling

**Current state:** `localStorage.skpn_signed_in = "1"`. That is the entire session model. It is
readable and writable by any script on the origin and by the student themselves.

**Required (§8.6):** httpOnly, Secure, SameSite=Lax session cookie; long-lived, so a student who
registered on Tuesday is not re-authenticated on Wednesday; sign-out invalidates server-side, not
just client-side. Auth.js with the MongoDB adapter.

**If missing:** every gate in the product is bypassed by typing one line in the console. Note that
`Rules.dc.html` gates the accept button, `Quiz.dc.html` gates the whole attempt, and `Profile` and
`Certificates` gate personal data — all on the same `localStorage` flag.

### 4.5 Authentication actually existing

**Current state:** `Login.dc.html` validates `^[6-9]\d{9}$` client-side and, on click, sets the
signed-in flag and navigates home. **It never checks whether the account exists.** There is no
second factor, no OTP, no password, no Google.

**Required:** whichever model wins §0, sign-in must prove control of something. Under the brief:
Google OAuth or a 6-digit email code with 5-minute expiry, max 5 verification attempts per code,
30s resend cooldown backing off, ~5 sends per address per 24h, per-IP throttling, codes hashed at
rest and compared server-side (§8.5).

**If missing:** knowing a classmate's mobile number is enough to enter their account, see their
address and date of birth, and take the quiz as them — under a one-attempt rule, burning their only
attempt. That last consequence is worth stating plainly to the client.

### 4.6 CSRF

**Current state:** no state-changing requests exist, so nothing to protect yet.

**Required (§8.6):** CSRF protection on every state-changing route — registration, language change,
**quiz submission included**. With `SameSite=Lax` cookies plus an Origin check on every mutating
route handler, plus Auth.js's own CSRF token on auth routes, this is cheap.

**If missing:** a link a student is tricked into opening can submit their attempt at question 4.
Under one-attempt-ever, that is unrecoverable.

### 4.7 Input validation

**Current state:** client-side only, and thin. Notable gaps in `canAdvance()`: no length bound on
`address` (§7.1 says 5–200), no bound on `cityVillage` (2–80), no check that `institutionName` is
under 150, no DOB requirement, no server anything.

**Required:** every field re-validated server-side against §7.1 — a schema validator (Zod or
equivalent) at the route boundary, rejecting on the first failure, with the bilingual error catalogue
shared between client and server so the messages match. Bound every string. Reject unknown keys —
the registration handler must not accept `{ role: "admin" }` or `{ bestScore: 30 }` because the
document is spread into an insert.

**If missing:** mass assignment on the registration insert; unbounded strings from 5 lakh users as a
storage and rendering problem; garbage in the merit lists that has to be cleaned by hand at
shortlisting.

### 4.8 Rate limiting, per route

Not one global limit — the routes have genuinely different risk profiles.

| Route | Limit | Rationale |
|---|---|---|
| `POST /api/auth/otp/request` | 5 / email / 24h; 30s cooldown backing off; per-IP cap | §8.5. An open send endpoint is a harassment relay and a direct bill on the Resend plan. |
| `POST /api/auth/otp/verify` | 5 attempts per code, then invalidate | Brute-forcing 6 digits. |
| `POST /api/register/check-mobile` | Tight, per IP **and** per session | §7.3: enumeration would reveal who has registered. |
| `POST /api/register` | Low per IP, generous per session | **Do not block hard on IP** — §8.3: *"Whole school computer labs share one IP, and blocking a district's only cybercafé on launch day is a worse outcome than a handful of duplicate entries."* Prefer a soft limit that queues rather than rejects. |
| `POST /api/quiz/attempts` | 1 active per user, enforced in the DB | Race between two tabs (§9.4). |
| `PATCH .../answers` | Generous — this is normal traffic | Limit only absurd rates (>10/s/user). Throttling a student's autosave loses their answers. |
| `POST .../submit` | Idempotent, so limiting is about cost not correctness | |
| `POST /api/contact` | Honeypot + per-IP limit | §6.4 — **no CAPTCHA puzzle**, it is a hard barrier for the divyang cohort. |
| `GET /api/verify/[n]` | Per IP | Public PII lookup; needs non-sequential numbers as the primary control. |

**If missing:** launch-day OTP costs blow past the plan cap and *no further student can register*
(§14.11); the mobile endpoint becomes a registration census; the contact form becomes a spam relay
on a government domain.

### 4.9 Duplicate-account controls

**Current state:** a hardcoded string comparison against `"9876543210"`.

**Required:** unique index on `mobile` (§8.3), plus flagging — duplicate mobiles, duplicate names,
same-name-same-institution clusters — surfaced for manual review at shortlisting. **Read §14.12
before implementing a hard block.** The brief recommends option 2 (cap at 2–3 accounts per number,
distinct names and DOBs, all flagged) and the reasoning is sound: blocking a genuine sibling in a
one-phone household is a letter to the Minister's office, while a duplicate is caught downstream at
Aadhaar verification. **This is a client decision that changes the unique index into a partial
count constraint, so it must be settled before the schema ships.**

Explicitly **do not** implement device fingerprinting or IP blocking (§8.3).

**If missing:** duplicate entries get multiple lottery tickets, which is the one place multi-accounting
actually pays (§8.3) — or, with too strict a rule, real eligible students are excluded at volume.

### 4.10 DPDP Act 2023 — most candidates are minors

Class 9 students are typically 13–14. The Act requires **verifiable parental/guardian consent** for
processing a child's personal data, and prohibits tracking and behavioural advertising directed at
children.

**Current state of the export:**
- `dateOfBirth` is collected but not required, so **minor status cannot be determined**.
- The guardian block is one optional free-text name field with no consent statement, shown to everyone.
- `Legal.dc.html` (privacy notice) has **no children's-data section**, **no retention period**, and — because the design has no Google Sign-In — **no third-party authentication disclosure** (§8.7 requires one).
- The privacy notice lists what is collected but omits `competitiveExam`, which the form does collect.

**Required before launch:**
1. DOB required, so the under-18 branch can fire.
2. Guardian name **and** mobile, plus a versioned consent statement drafted by the department, stored with a timestamp and the statement version (`consents.guardian.statementVersion`).
3. A children's-data section in the privacy notice, written at a Class 9 reading level in both languages (§6.10).
4. A stated retention period, and a purge job that honours it.
5. If Google Sign-In ships: the §8.7 disclosure, plus `[VERIFY]` with the department whether they have a standing policy on third-party auth on departmental properties.
6. No analytics or advertising pixels of any kind. Related: the pages currently load **Google Fonts from `fonts.googleapis.com` on every request** — that is a third-party request carrying IP addresses of minors on a government portal. Self-host the two Noto families. This also removes a render-blocking third-party dependency on rural 4G, so it is a performance win as well.

**If missing:** the department is processing the personal data of hundreds of thousands of minors
without a lawful consent basis, on a scheme announced by the Chief Minister. §14.1 is correctly
flagged as *"Highest priority"* and it is still open.

### 4.11 Secrets handling

Nothing in the export handles secrets — there is no backend. For the rebuild on a Hostinger VPS:

- MongoDB connection string, Auth.js secret, Google OAuth client secret, Resend API key: environment variables only, never in the repo, never in `NEXT_PUBLIC_*`. Anything prefixed `NEXT_PUBLIC_` is compiled into the client bundle.
- The Google OAuth client secret must be a **web application** credential with the production redirect URI registered; request **only** basic profile and email scopes (§8.1).
- Bind MongoDB to localhost or a private interface. A VPS with 27017 open to the internet is the most common way a project like this leaks. Authentication enabled, a dedicated application user with `readWrite` on one database — not `root`.
- TLS terminated at the reverse proxy with HSTS. Secure cookies require it.
- Rotate on personnel change. §14.11 flags a related governance point: confirm whether the Nyas, the department, or the vendor holds the Resend and Google Cloud accounts. *"A government project running on a vendor's personal card is an awkward thing to unwind later"* — the same applies to who can read the OAuth secret.
- Backups of the `users` collection contain minors' addresses and dates of birth. Encrypt them; keep them off the same host.

### 4.12 Two smaller ones worth naming

**Certificate forgery.** The design serves `uploads/cert.jpeg` with the student's name painted over
it in CSS, downloadable via `<a download>`. There is no certificate number, no record, and no
verification route. Anyone can produce a certificate for any name by editing one text node — or by
downloading the blank JPEG, which is a public asset. §10.2 identifies the fix: unique non-sequential
number, server-rendered PDF, public `/verify/[n]` page. **What breaks without it:** a participation
certificate from a Government of MP trust that can be forged in a browser inspector.

**IDOR on attempt and certificate routes.** `/quiz/attempt/[id]` and `/certificates/[id]` take an id
in the path. Every handler must check `attempt.userId === session.userId` before returning anything,
and the ids must not be enumerable. **What breaks:** incrementing an integer walks the whole
attempt table.

---

## 5. QUIZ DATA AUDIT

### 5.1 What the two files are

| | `uploads/questions.json` | `uploads/quiz-questions.json` |
|---|---|---|
| Size | 22.6 KB | 43.8 KB |
| Shape | Bare array | `{ "questions": [...] }` |
| Count | **50** | **50** |
| Keys | `n`, `q`, `opts`, `ans` | `id`, `answer`, `answerIndex`, `hi{question,options}`, `en{question,options}` |
| Languages | **Hindi only** | **Hindi and English** |
| Answer key | `ans`, 0-based | `answer` (1-based) **and** `answerIndex` (0-based), both present |
| Referenced by | **Nothing** | `Quiz.dc.html` line 361 |

### 5.2 Findings

**Count: 50 questions.** Not 30, not 300. The quiz draws 30 at random from the 50 via a
Fisher–Yates shuffle in `pickOrder()`.

**Both files are not needed.** `quiz-questions.json` is a strict superset — same 50 items, same
order, plus English. `questions.json` is referenced by nothing. It is a stale Hindi-only export.
**Import `quiz-questions.json`, delete both from the public path after import.**

**Answer keys are present in both, and the one the browser downloads is the one with the keys.**
`quiz-questions.json` carries `answer` and `answerIndex` on every item, and `Quiz.dc.html` fetches it
client-side. See §4.1 — this is the audit's top finding.

`answer` and `answerIndex` are internally consistent across all 50 items (`answer - 1 === answerIndex`,
zero mismatches). Keep exactly one on import.

**Bilingual coverage is complete in `quiz-questions.json`.** All 50 have both `hi` and `en`
question text; all 50 have exactly 4 options in each language; no empty or whitespace-only options;
no Devanagari leaking into `en` fields and no Latin-only `hi` questions. This is genuinely good and
is the strongest reason to treat this file as the import source.

**No duplicate questions.** No duplicated question text in either language, and no duplicated option
within any question.

**The two files have diverged — 5 items differ.** Someone edited one and not the other:

| Q | Divergence |
|---|---|
| **6** | **Different question entirely.** `questions.json`: *"how many kalas did Krishna study"* → options `32/48/64/72`, key **64**. `quiz-questions.json`: *"how many vidyas and kalas"* → options are vidya+kala pairs, key **"14 vidyas and 64 kalas"**. Substantively consistent, but this is the only item where the two files' answer indices differ (2 vs 3), so a naive merge would corrupt it. |
| **20** | Options rewritten. `questions.json` option B: *"गुरु का आश्रम और समाज का सहयोग"*; `quiz-questions.json`: *"सामाजिक सहयोग से"*. Same key index. |
| **23** | `quiz-questions.json` adds *"और कालगणना"* (time-reckoning) to the correct option. |
| **35** | *"प्रभास क्षेत्र"* → *"प्रभास पाटन क्षेत्र"*. |
| **40** | Option C reworded — see the defect below. |

**One item is defective and should be pulled or rewritten — Q40.** The options are:

- B: *"That their fame would endure forever in the world"*
- C: *"That their fame would endure forever in the world **and** that they would be long-lived"* ← keyed correct

C is a strict superset of B. A student who reads carefully and picks B is marked wrong for choosing
a statement the key itself asserts is true. On a paper where 102 scholarships turn on the merit list,
that is a grievance letter with a screenshot attached. Same pattern, milder, in the `questions.json`
version of Q40, whose option C is a mangled concatenation (*"…चिरस्थायी होने का दीर्घायु होने का"*)
— evidence the item was edited badly at some point.

**The answer key is skewed enough to be exploitable.** Distribution of `answerIndex` across 50
items: `A: 12 · B: 22 · C: 8 · D: 8`. **44% of correct answers are option B.** A student who
answers B to all 30 questions expects ~13/30 without reading a single one, against a field where the
median honest score is unlikely to be far above that. Two independent fixes, both needed:
shuffle option order per attempt (§9.4 already requires it, and the design does not do it), and
rebalance the key toward 25% each on any future authoring.

**Transliteration is inconsistent — the glossary in Appendix E is not being applied.**
`सांदीपनि` in 30 items, `संदीपनि` in Q6 (one item). `श्रीकृष्ण` in 16 items, `श्री कृष्ण` in Q6.
Q6 is the same item that diverged between the files — it was clearly authored separately. English is
clean: `Sandipani` in all 31 items that mention the name. Fix Q6 to match the frozen glossary.

**Structural cleanliness:** ids are sequential 1–50 with no gaps in both files; every item has
exactly 4 options; no "all/none of the above" items; no malformed JSON.

**Missing metadata:** neither file has `topic`, `difficulty` or `isActive` (brief §13). Add them at
import — `isActive` in particular, so a defective item like Q40 can be retired without a
redeployment or a hole in the id sequence.

### 5.3 The bank is the critical-path risk (§14.7)

At 50 questions the bank is workable **only** under the one-attempt rule. If the client restores
unlimited attempts per the brief, 50 questions with 30 drawn means the third attempt has seen almost
the whole bank, and the competition becomes a memorisation exercise decided by who retook it most.
The brief calls the bank *"the longest-lead-time item in the entire project"* and *"not a design or
engineering task"* — 250 more bilingual, factually-vetted questions cannot be produced by the
rebuild team, and 29 July is the deadline.

**Raise this with the client in the same conversation as the §0 attempts question. They are the
same decision.**

---

## 6. RISKS AND GAPS

### 6.1 Hardcoded values that must not survive the port

| Value | Location | Consequence |
|---|---|---|
| `if (v === "9876543210") return "duplicate"` | `Register.dc.html:583` | The entire duplicate-mobile control is one string comparison. |
| `const STUDENT = { fullName: "अनन्या वर्मा", email: "ananya.verma@gmail.com", mobile: "98XXXXXX21", … }` | `Profile.dc.html:115–132` | Full fake profile rendered whenever `localStorage.skpn_profile` is absent — i.e. **the default state**. Ship this and every signed-out visitor to `/profile` meets Ananya Verma. |
| `const ATTEMPTS = [{ date: "24 जुलाई 2026, 10:42", score: "23 / 30" }]` | `Profile.dc.html:134` | Fake attempt history. |
| `studentName` fallback `"अनन्या वर्मा"` / `"Ananya Verma"` | `Certificates.dc.html:91` | Fake name painted onto the certificate. |
| `results[2].value = "1"` (attempts taken) | `Quiz.dc.html:579` | Literal string, not a count. |
| `YEARS = 1900…2013` in the DOB picker | `Register.dc.html:369` | Hard cutoff at 2013 — a student born in 2014 (turning 12 in 2026, plausible in Class 9 in some districts) cannot register. Also silently encodes an eligibility rule the competition rules never stated. |
| `uploads/cert.jpeg` as the certificate | `Certificates.dc.html:42` | See §6.6. |
| Social links to bare platform roots | SiteHeader, SiteFooter | |
| Phone `0755 4535064`, address, closing date `4 Sep 2026` | About, Footer, Home, Pratiyogita | Not in any source order — see §1.5. |

### 6.2 The HTML contradicts the brief on content, and sometimes the HTML is right

`Rules.dc.html` carries a **fuller and more source-faithful ruleset** than the brief's §6.5
paraphrase. Three clauses appear only in the HTML and each changes the build:

1. **Eligibility is wider than "currently enrolled."** The rules admit *"मान्यता प्राप्त प्रशिक्षण संस्थाओं के प्रशिक्षार्थी"* (trainees of recognised training institutions), and explicitly say entrance-exam candidates (CAT/JEE/CLAT/NEET) **need not currently be enrolled in a school** and may name the school where they passed Class 12. The brief's §7 recommendation to rename the institution field *because* the student must be currently enrolled is therefore built on a premise the rules contradict.
2. **Residency is broader.** *"मध्यप्रदेश का मूल निवासी होकर मध्यप्रदेश में अध्ययनरत हो अथवा पाँच वर्षों से निरंतर मध्यप्रदेश में अध्ययनरत हो"* — native resident studying in MP **or** five years' continuous study in MP. The brief says only "resident of Madhya Pradesh." Neither the form nor the schema captures which limb applies.
3. **Selection wording is more precise** than the brief's §6.3 and partly resolves the §14.6 arithmetic worry: separate male/female/divyang district lists are prepared **first**, then combined, then top 50 per category per district; district lists are consolidated into two **state-level** lists; the lottery draws from the state-level list. The brief's reading was that 100-per-district defines the pool — the rules confirm it, and add the state-level consolidation step the brief did not have.

**Treat `Rules.dc.html` as the newer source of record for rules content**, and reconcile the brief
against it rather than the other way round.

Contradictions where the HTML is simply wrong or incomplete:

- **The "a high score does not by itself win" statement appears nowhere in the export.** §6.3.5 and §9.5 both mandate it, and §9.5 calls it *"the single most important expectation-setting line in the entire product. Do not bury it."* It is not buried; it is absent.
- `/pratiyogita` is missing: the 64 Kalas / 14 Vidyas browsable content (its specified centrepiece), the selection process, the documents-required-on-selection list, and the divyang certificate notice.
- `Legal.dc.html` privacy notice says *"मोबाइल नंबर, जो आपकी पहचान है"* — consistent with the HTML auth model, inconsistent with the brief's. Whichever wins, this page must match the shipped reality.
- The privacy notice omits the retention period, the children's-data section, and `competitiveExam` from the list of what is collected.
- **`/rules` acceptance renders only when `signedIn && attempts === 0`.** An anonymous visitor sees the rules with no declaration block at all — fine for the public reference page, but it means there is no `/quiz/rules` gate for a signed-out user to be redirected through, and no acceptance is recorded per attempt.

### 6.3 Asset clearances — already documented as blockers

`ASSETS.md` is honest and should be read in full by whoever ships this. Summary of what is
**not cleared**:

- `uploads/images.jpg` — the **Government of MP emblem**, in `SiteHeader` and `SiteFooter`, i.e. on **every page**. Flagged as a blocker under the State Emblem of India (Prohibition of Improper Use) Act, 2005. §3 says default to text attribution unless written permission is on file.
- Three Pinterest-sourced images (`6c2fe7...webp`, `img2.jpg`, `730962...jpg`) — unknown author, unknown licence. §12: *"a government site using an unlicensed image is a real liability, not a theoretical one."*
- `assets/pathey.png`, `assets/teaching.png`, `assets/cosmic-*.png` and `Krishna Clip.mp4` — AI-generated, uncleared, and several are depictions of Bhagwan Shri Krishna, which §12 says is a departmental decision and not a designer's.
- `Krishna Clip.mp4` is listed in `ASSETS.md` at **~15 MB** but is **not present in the repo** — the file is missing from `uploads/`. Either it was never delivered or it was pruned. The three `cosmic-*.png` files are described as frames extracted from it, and they *are* present and *are* used on Home, Pratiyogita, Login and the CtaBox.

Additionally, `Leadership.dc.html` publishes photographs of four named officials on the homepage and
About page. §6.2 requires written clearance for named trustees; §12 prohibits photographs of
identifiable people without written consent.

**None of this is a code problem, and all of it has departmental lead time.** It belongs in the same
email as §14.10 (the sending domain).

### 6.4 Client-side logic that must move server-side

| Currently client-side | Must become |
|---|---|
| Answer key lookup (`row.answerIndex`) | Server-only field, projected out of every response |
| Scoring | `POST /submit` handler |
| The 10-minute timer | `startedAt`/`expiresAt` server-written, client reconciles from `serverNow` |
| Question draw (`pickOrder()` Fisher–Yates in the browser) | Server-side draw at attempt creation, stored in `attempts.questionIds` |
| Attempt counting (`localStorage.skpn_attempts++`) | `attempts` collection |
| Session (`localStorage.skpn_signed_in`) | httpOnly cookie |
| Profile storage (`localStorage.skpn_profile`) | `users` document |
| Duplicate-mobile check | `POST /api/register/check-mobile`, rate-limited |
| Language preference (`localStorage.skpn_lang`) | `users.preferredLanguage` + cookie (§5 requires cross-device persistence) |
| The "already attempted" gate | Server-enforced on the start endpoint, not a rendering branch |

Note the `localStorage` inventory is exactly five keys — `skpn_lang`, `skpn_signed_in`,
`skpn_attempts`, `skpn_profile`, `skpn_attempt` — and **four of the five are security state**.
That is the whole application's server in five string values.

### 6.5 The scoring gap

Worth isolating because it is easy to miss: **the export never computes, stores, or displays a
score.** The submit modal summarises answered / not answered / time remaining. The submitted screen
shows answered / not answered / attempts taken / time taken. `Profile.dc.html` shows date and time
taken. The only "23 / 30" anywhere is in the hardcoded `ATTEMPTS` fixture, and it is never rendered
(the attempts row renders `date`, `time`, `status`, not `score`).

The brief requires the score on `/quiz/submitted` (§9.5) and best-score-plus-date on `/profile`
(§6.8). Under the one-attempt rule, "best score" collapses to "score" — but the score itself still
has to exist. **There is no UI for it, so the design work is genuinely incomplete here**, not merely
unwired. Flag it to the designer rather than inventing a layout.

Related open question for the client: §10.2 / §14.5 asks whether the score appears on the
certificate. Default recommendation in the brief is to omit it. The design omits it, which is
consistent — but by accident rather than decision.

### 6.6 Certificate generation

`Certificates.dc.html` renders `uploads/cert.jpeg` inside a container-query box and absolutely
positions the student's name over it at `top: 49%`, `font-size: 4.2cqw`, `white-space: nowrap` with
`text-overflow: ellipsis`. Download is `<a href="uploads/cert.jpeg" download>` — **it downloads the
blank certificate, without the name**.

Against §10.4 this needs to become: server-side PDF at A4 landscape, vector logo, embedded
Devanagari (test a name with conjuncts and a nukta before sign-off), on-screen preview visually
identical to the download, and a layout that survives long names in either script — the current
`nowrap` + ellipsis will silently truncate *"श्री रामचंद्र विश्वकर्मा"*-length names, which on a
certificate is worse than wrapping.

Plus: no certificate number, no `/verify/[n]`, no `certificates` collection. And §14.5 remains open
— **the source orders do not mention participation certificates at all**, so the wording, the
signature block, the designation, and any emblem use all need written departmental approval before
this ships.

### 6.7 Animation and client code that will break under SSR

**`assets/site.js` must be deleted wholesale, not ported.** Specific problems:

- It injects a full-screen `#skpn-loader` overlay into `document.body` at parse time and removes it 420ms after `load`, with a 4200ms hard fallback. Under Next.js streaming SSR this fights the framework's own paint and adds ~0.5s of deliberate blank screen to a page the brief wants painting in under 3s on 4G (§11.3).
- The `[data-reveal]` scroll-reveal **sets `opacity: 0` from JavaScript after the element has rendered**. Server-rendered HTML paints the content, then JS hides it, then reveals it on scroll — a visible flash-then-hide on every page. §11.1 is explicit: *"Fade-in-on-scroll should start visible and enhance, not start hidden and reveal."* The intent is right (it degrades correctly with JS off) but the execution produces the worst artifact of both approaches. Replace with CSS-driven `IntersectionObserver` reveals that are opt-in via a class applied before paint, or drop the effect.
- `scan()` runs on a `setInterval` every 250ms, 40 times — 10 seconds of DOM polling after every navigation. In a React tree this is redundant with the render cycle.
- The SPA click interceptor matches `/\.dc\.html/i`, calls `preventDefault()`, and does `setTimeout(() => location.href = href, 300)` — a hand-rolled 300ms navigation delay that will fight the App Router's client-side router and break `next/link` prefetching. Delete it.

**`Home v5.dc.html` parallax:** `componentDidMount` does
`document.querySelector("[data-parallax]")` and writes `.style.transform` directly on a
React-rendered node from a capture-phase `scroll` listener. That is an imperative DOM write against
an element React owns; on re-render React will clobber it. It also runs unconditionally on mobile,
where §11.1 warns parallax must not break scroll on low-end Android. It does correctly bail on
`prefers-reduced-motion`, and it caps at `y < 1400` — keep both behaviours, move to a `ref` + `rAF`.

**`React.createRef()` at class-field scope** in `Home v5.dc.html` (`_rail`, `_syl`) — `_rail` is
created and never used; `_syl` is passed through the DC template's `ref="{{ sylRef }}"` binding,
which has no direct App Router equivalent. Straightforward to port, but it is the kind of thing that
compiles and silently does nothing.

**Auto-rotating carousels with `setInterval`:** the Home syllabus feature (3.8s), and the
Login/Register aside stat rotator (2.0s). Both correctly bail on `prefers-reduced-motion`. Both need
cleanup on unmount in the port (the design does clean up) and both should pause on hover/focus — the
Home one pauses on interaction (`paused: true`) and never resumes, which is reasonable; the
Login/Register one never pauses at all.

**`Register.dc.html` DOB wheel picker.** A custom three-column wheel driven by `onWheel`,
`onTouchStart`, `onTouchMove` with `touch-action: none` and manual `preventDefault`. §7.1 says
plainly: *"Native date input; do not build a custom calendar that fails on Android WebView."*
The design built the custom calendar. It is also the least accessible control in the export — the
columns are `<div onClick>`, not buttons; there is no keyboard path; there are no ARIA roles. Against
§11.2 (full keyboard operability, WCAG 2.1 AA as a floor, divyang students competing in a dedicated
category) this needs a native `<input type="date">` fallback at minimum. **This is the one place I
would push back on "render identically"** — not on the visual design, but because the control is not
operable by keyboard at all, and the scheme has a disability merit category.

**`lockScroll()`** in `Register.dc.html` sets `body { position: fixed; top: -scrollY }` and restores
on close. It is called from `openPicker`/`closePicker` and `openDob`/`closeDob`, but **not** from the
Escape key — because there is no Escape handler on those modals, unlike the quiz modals which do
handle it. A student who opens the district picker and presses Escape is stuck.

**Google Fonts** loaded from `fonts.googleapis.com` on every page — render-blocking third-party
request on rural 4G, and a third-party data flow involving minors (§4.10). Self-host via
`next/font/local`.

### 6.8 Quiz interaction gaps

Several behaviours in `Quiz.dc.html` contradict §9.3 outright:

- **Forced-answer navigation.** `next()` refuses to advance unless the current question is answered; `goTo()` refuses to jump for the same reason and shows a guard message. This makes the palette's **"visited, unanswered"** state *unreachable in normal use* — the very state §9.3 mandates and the design draws a legend entry for. §9.3 is also explicit that tapping a palette box jumps *"straight to that question. No confirmation, no penalty, instant."*
- **The palette count labelled "Current" shows `s.index + 1`** — the current question *number*, not a count. Reads as "Current: 17".
- **No resume.** Refresh at question 22 and the attempt restarts at question 1 with a fresh 10:00. §9.4 requires resuming the same attempt with the same remaining time, and the design has no state for it.
- **The offline indicator is `navigator.onLine` only.** It flags airplane mode; it does not detect a failed autosave, because there are no autosaves. The reassurance it displays — *"आपके उत्तर सुरक्षित हैं"* / "Your answers are saved" — is currently false.
- **`recordAttempt()` on auto-submit reads stale state.** It runs inside the `setState` updater and reads `this.state.left` before the update commits, so the recorded "time taken" is off by a tick.
- **`pickOrder()` is called twice** — once in `componentDidMount` and again in `begin()` — so the paper is drawn, discarded, and redrawn. Harmless client-side; a real double-write once this moves to the server.
- **Option letters in Hindi are अ / ब / स / द** — a phonetic transliteration of A/B/C/D rather than the Devanagari sequence (अ आ इ ई) or the conventional क/ख/ग/घ used in Hindi-medium papers. Not a layout question; worth one line to the client, since MP board students will read क/ख/ग/घ as the natural convention.

### 6.9 Operational and scale risks

- **§14.10 — a sending domain is a launch blocker with departmental lead time.** The official address on record is `shrikrishnapatheynyas@gmail.com`. Resend cannot authenticate mail from `gmail.com`; SPF/DKIM/DMARC will fail and sign-in codes will land in spam. Nothing in the auth flow works without it. *If the mobile-only model wins §0 this evaporates — but then DLT registration for SMS replaces it, which has comparable lead time.* Either way something must be procured now.
- **§14.11 — Resend free tier caps at 100 emails/day.** A state-wide launch on a festival date exhausts that in minutes, after which **no new candidate can register**.
- **Single VPS, 5 lakh users, spiky.** The brief expects *"extremely spiky"* traffic twice: launch day and the final days before close. A single Hostinger VPS running Next.js and MongoDB on the same box will be memory-bound on the Mongo working set at exactly the moment Node needs headroom. Minimum viable posture: separate the database, put static assets and all SSG pages behind a CDN, connection-pool carefully (MongoDB driver default pool size is 100 — with multiple Node processes that will exhaust `maxIncomingConnections`), and load-test §2.5's top three before 29 July, not after.
- **No auto-submit sweeper means orphaned attempts accumulate**, and under a one-attempt rule a student whose browser crashed is locked out of the competition entirely with an `in_progress` row and no recourse. This needs both the sweeper *and* a support path.
- **Content dependencies on the critical path** and outside the build team's control: the question bank (§14.7), the closing date (§14.3), gender/merit-list reconciliation (§14.2 — the form offers "Other" and the merit lists have no third list), certificate approval (§14.5), the Appendix D count (§14.6 / the 63-vs-64 Kalas problem — the design resolved it to 64 by splitting नृत्यनाट्य into नृत्य and नाट्य, which is a reasonable inference but *is an inference*, and a government page titled "64 Kalas" must not rest on one), and the divyang accommodation policy (§14.9).

---

## 7. MIGRATION ORDER

Ordered by risk, not by convenience. Each phase is shippable and verifiable before the next begins.

**Phase 0 — Close the forks. Before any code.**
Resolve §0 with the client in writing: identity model, attempts model, bank size. Then §14.12
(sibling / duplicate-mobile policy) and §14.1 (DOB required, guardian consent statement), because
both change the `users` schema. In parallel, and on the same day, start the long-lead items that
nothing else can unblock: the sending domain (§14.10), the Resend plan and its billing owner
(§14.11), emblem and imagery clearance (§6.3), certificate approval (§14.5), and the question bank
(§14.7). *Reason: every one of these has external lead time, and four of them change the schema. A
schema migration in mid-August, against live registrations, is the failure mode this phase exists to
prevent.*

**Phase 1 — Auth and session.**
Auth.js with the MongoDB adapter, the chosen provider(s), httpOnly session cookie, CSRF on every
mutating route, `GET /api/session`, sign-out. *Reason: it is the highest-severity gap after the
answer key, and every subsequent phase depends on knowing who the user is. Building the quiz first
and retrofitting auth is how the `localStorage` model gets accidentally kept.*

**Phase 2 — Quiz engine, server-authoritative.**
The four hot-path endpoints; server-side draw with option shuffling and stable option ids;
server-side scoring; the auto-submit sweeper; answer autosave with resume; the expiry/grace UI
state. Import `quiz-questions.json` **with the keys stripped from anything client-facing**, fix Q6's
transliteration, retire or rewrite Q40, and delete both JSON files from the public path. *Reason:
this is where the money is. Answer-key exposure (§4.1), scoring integrity (§4.2) and timer authority
(§4.3) are the three findings that would invalidate the competition, and they are one subsystem.*

**Phase 3 — Registration.**
Multi-step form, server-side validation of every §7.1 rule, rate-limited duplicate-mobile check with
the §7.3 recovery copy, orphan/incomplete-account handling, guardian block wired to the DOB branch,
native date input alongside (or instead of) the wheel picker. *Reason: it is the front door on 29
July, it writes the records the merit list is built from, and it carries the DPDP surface.*

**Phase 4 — Static content pages.**
Home, About, Pratiyogita, Rules (split into `/rules` and `/quiz/rules`), Legal (split into `/privacy`
and `/terms`), plus the missing `/contact` and the missing content noted in §6.2 — the 64 Kalas /
14 Vidyas on `/pratiyogita`, the selection process, and the "a high score does not by itself win"
statement. Self-host fonts. Rebuild the reveal/parallax behaviour without `site.js`. *Reason: high
volume, low risk, fully CDN-cacheable — and it is where the launch-day traffic actually lands, so it
should be the fastest thing on the box.*

**Phase 5 — Profile and certificates.**
`/profile` from real data, language preference persisted to the user record and cookie,
`/certificates` list, server-rendered PDF with embedded Devanagari, certificate numbers, and the
public `/verify/[n]` route. *Reason: it depends on Phase 2's attempt records existing, and the
certificate wording is blocked on §14.5 anyway.*

**Phase 6 — Hardening and scale.**
Per-route rate limits (§4.8), the security review of §4 end to end, accessibility pass in **Hindi**
with a screen reader (§11.2 — this is where Devanagari support breaks, and the divyang category makes
it functional not cosmetic), load-test the §2.5 top three at realistic launch concurrency, and the
merit-list batch job with its flagging rules (§8.3). *Reason: it must be a named phase with time on
the calendar. Folded into other phases, it does not happen.*

**Deleted, not ported:** `assets/site.js`, `support.js` (the Claude Design React runtime),
`uploads/questions.json`, `uploads/quiz-questions.json` (after import), `uploads/cert.jpeg` as a
served asset, and every `localStorage` key.

---

## Appendix — quick reference

**Top five findings, in severity order:**

1. The complete answer key is a public static file that the quiz downloads into the browser. (§4.1)
2. There is no authentication — any well-formed 10-digit number signs you in as anybody. (§4.5)
3. No score is computed anywhere; scoring, the timer, the question draw and the session are all client-side. (§4.2, §4.3, §4.4)
4. The HTML and the brief describe different products on identity, attempts and bank size. (§0)
5. DPDP consent for minors is unresolved and the form cannot currently determine who is a minor. (§4.10)

**Top five things that need a client decision, not a build decision:**

1. Identity model, attempts model, bank size. (§0)
2. Guardian consent — statement text, DOB requirement, who drafted it. (§14.1)
3. Duplicate mobile — hard block, cap at 2–3, or flag-only. (§14.12)
4. Closing date, currently published as 4 September 2026 with no source order. (§14.3, §1.5)
5. Emblem, imagery and certificate clearances. (§6.3, §14.5)
