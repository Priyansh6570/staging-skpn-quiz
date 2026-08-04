# Handoff

State of the platform, what changed last, and what the next person has to know before touching it.

Last updated 3 August 2026.

---

## 1. The competition is open

`COMPETITION_OPEN=true` in `.env.local`. That one variable is the whole gate — `lib/competition.ts`
reads it and nothing else does. Everything downstream is derived:

| Surface | Where |
| --- | --- |
| Page redirects for `/login`, `/register`, `/quiz`, `/profile`, `/certificates`, `/rules` | `proxy.ts:108` |
| Header links, footer links, CTA boxes, the pending notice | `app/layout.tsx:97` → `AppProviders` → context |
| Sitemap entries | `app/sitemap.ts` |
| `403 competition_closed` on register, check-mobile, otp send/verify, attempt start, answers, submit | each route, first line |

**There is no date anywhere in the gating, and that is deliberate.** Opening on a clock comparison
across five lakh clients in different timezones opens the paper early for some of them. To close the
platform, set the variable to anything other than `true` — it fails shut — and restart. Do not add a
date check.

Verified after the change: all six routes serve rather than redirect, `/api/register/check-mobile`
answers `{"available":true}`, and the sitemap lists `/register` and `/rules`.

## 2. The date is changed — 5 August 2026

Applied 4 August 2026 from client-supplied copy. Six keys in each of `lib/i18n/hi.ts` and `en.ts`,
and the four design exports that feed them. Guru Purnima no longer appears anywhere in either.
Two open questions about the framing are in `COPY_NEEDED.md` part 1 — the hero line lost its "से
प्रारंभ" tail, and the first timeline row still names the Guru Parv against the new date.

**`lib/i18n/hi.ts` and `en.ts` are generated but are no longer reproducible from a bare
`npm run i18n`.** The vidya-kala work hand-edited the `VIDYAS`/`KALAS` tables in them, and
`scripts/vk-fill-canonical.mjs` now reads `hi.ts` as the canonical source for those names. Re-running
extraction wipes that work — it was tried during this change and reverted. The date keys were
therefore edited in place, and the same edits were made to the design exports and to
`scripts/i18n-transforms.mjs` so a future extraction reproduces them rather than reverting them.
Before anyone runs `npm run i18n` again, the vidya-kala content has to be folded back into the
exports or into the transform. Until then, treat those two files as hand-maintained.

`scripts/i18n-transforms.mjs` no longer builds the hero range out of `heroDate` — it opens on
`dates[0].when` and closes on `dates[1]`. It used to lift the festival name off `heroDate`, which
would now date the range to the wrong day.

`scripts/baseline.mjs:59` pins the Playwright clock to `2026-07-29T00:00:00Z`. **Leave it.** It is
there to freeze carousels and marquees so screenshots hash identically run to run; it carries no
meaning about the competition, and moving it would shift every carousel and invalidate all of
`tests/baseline/`.

---

## 3. Registration and sign-in are SMS OTP

`CLAUDE.md`'s auth section is rewritten. It previously said "mobile number only, no OTP, do not add
a second factor" — that was written while DLT approval was pending and there was no way to send an
SMS. DLT is approved and the decision is reversed.

**`app/api/auth/login/route.ts` is deleted.** It issued a session for a bare mobile number. Leaving
it would have made the whole OTP gate decorative. `POST /api/otp/verify` is now the only route in
the codebase that issues a student session.

### The flow

```
register:  number -> /api/register/check-mobile -> /api/otp/send {purpose:"register"}
                  -> code -> /api/otp/verify
                  -> sets skpn_mobile_verified (45 min, bound to that one number)
                  -> steps 2-4 of the form
                  -> /api/register requires the proof, spends it, issues the session

sign in:   number -> /api/otp/send {purpose:"login"} -> code -> /api/otp/verify
                  -> issues the session directly
```

**The code is asked for at step 1, not at the end.** A student who cannot use a number finds out
before filling in an address, a school and a declaration. `skpn_mobile_verified` was raised from
15 minutes to 45 for exactly this reason: the proof is now taken before the form rather than after
it, so its window has to cover the whole form. It is still single-use and still bound to the one
number it was issued for. If it does expire, `/api/register` answers `mobile_not_verified` and the
form returns to step 1 with the number unverified rather than stranding the student on step 4.

`purpose` is stored on the OTP row and re-checked at verify, so a code minted to prove ownership of
a new number cannot be turned round and used to sign in to an account that already holds it.

Sessions stay at 7 days, so a returning student does not trigger a second SMS.

### What protects the credit balance

Every send is real money from a government trust's balance, so the caps come before the send, not
after. Counters live in `otpCounters`, keyed by scope + subject + time bucket, with their own TTL —
they cannot live on the OTP row, which dies with its code after ten minutes.

| Limit | Value | Where |
| --- | --- | --- |
| Per mobile, per hour | 5 | `lib/otp.ts` |
| Per mobile, per day | 10 | `lib/otp.ts` |
| Per IP, per hour | 20 | `lib/otp.ts` |
| Global, per day | `OTP_GLOBAL_DAILY_CAP`, default 50,000 | `lib/otp.ts` |
| Resend interval | 60s, server-enforced | `app/api/otp/send/route.ts` |
| Wrong guesses per code | 5, then the code is dead | `app/api/otp/verify/route.ts` |

Sends are also refused *before* the provider call when the number cannot use the code at all — an
unregistered number signing in, an already-registered number registering. Neither answer tells the
caller anything `/api/register/check-mobile` did not already.

**`OTP_GLOBAL_DAILY_CAP` is a guess and needs a real number.** Set it against the credits actually
purchased. Too high and it protects nothing; too low and it stops launch day. When it trips,
sending stops until the UTC day turns and one `otp.circuit_breaker_open` row is written to
`adminAuditLog` — once, on the crossing, not per blocked request.

### The send call cannot tell you whether a message arrived

Verified against the live API during this work, not assumed:

```
POST /api/v5/otp   with authkey: invalid-key-for-failure-path-test
-> HTTP 200  {"request_id":"...","type":"success"}
```

**A plainly invalid auth key comes back as a success.** The endpoint is queue-accepted, not
delivered, so an expired key, an exhausted balance or a suspended sender will very likely read as a
successful send. What the send call *does* catch is a timeout, a DNS or TLS failure, a 5xx, and a
malformed reply.

Everything in section 4 exists because of this. Do not treat `otp_sent` in `authEvents` as proof a
student received anything — `smsDeliveries` is the only place a real outcome is recorded.

---

## 4. Knowing whether SMS actually works

### Delivery reports

`POST /api/webhooks/msg91/delivery?token=…` — MSG91 posts a report per message; the row opened at
send time (keyed by their `request_id`) is closed with a real status.

- **The token is a credential.** MSG91 calls this, so there is no session and no Origin worth
  checking, and `MSG91_WEBHOOK_SECRET` in the query string is the entire authentication. The URL
  configured in MSG91's dashboard has to be handled and rotated like a password. Unset means the
  endpoint refuses everything, which is the right way round.
- **Configure the URL in MSG91's dashboard.** Nothing arrives until someone does. If the panel shows
  sends today but nothing confirmed delivered, that is almost certainly why, and the panel says so.
- The body shape is parsed defensively across the variants MSG91 has used, because this build could
  not pin their contract to a live report. An unreadable body returns **400 on purpose** so MSG91
  retries and the log line gets seen, rather than losing every report quietly.
- An unrecognised status is stored as `unknown` with the provider's own code and text kept verbatim,
  never guessed into "delivered". `unknown` counts as undelivered on the dashboard and means
  `classifyDelivery` in `lib/msg91.ts` needs a line adding — the log names the codes to add it from.
- Idempotent: MSG91 re-posts until it gets a 2xx, and `requestId` is uniquely indexed.

### Balance

`npm run balance` (`scripts/poll-msg91-balance.mjs`) — **needs a cron entry, every 15 minutes.**
Writes `providerHealth`, alerts once on crossing below `MSG91_BALANCE_ALERT_THRESHOLD` (default
5000) and once on recovery. `checkedAt` is what the dashboard uses to tell you the poller itself has
stopped, which matters as much as the number.

**The balance currently reads 0.** Probed during this work:

```
balance.php?type=1    -> 0
balance.php?type=4    -> 0          (transactional, what the poller uses)
balance.php?type=106  -> 0
balance.php?type=2    -> {"msg":"Invalid Route","msgType":"error"}
/api/v5/user|wallet/balance -> {"type":"error","msg":"Route Missing"}
```

The key and endpoint work — invalid routes error, valid ones answer — so this is not a
misconfiguration on our side and not a parse failure. Either the account genuinely has no credits,
or it bills in a way `balance.php` does not report. **Someone with access to the MSG91 dashboard has
to settle which before launch.** If it turns out to be the latter, set
`MSG91_BALANCE_ALERT_THRESHOLD=0` — the number is still collected and shown, only the alert is
silenced, so the panel does not sit on a permanent red that teaches people to ignore it. Point
`MSG91_BALANCE_URL` / `MSG91_BALANCE_ROUTE` at the right API if one exists for the account.

Note this also means the live test send verified on Jio and Airtel was made under different
conditions than today's, and it is worth re-verifying one delivery end to end before launch.

### The panel

`/admin/operations` now carries: codes sent today, undelivered today, credits remaining, daily cap
used, a full delivery breakdown, and the circuit breaker state — plus alerts when the breaker is
open or near, when credits are low, when the balance poller has gone quiet, and when a day's sends
have produced no confirmed deliveries at all.

`smsDeliveries` deliberately holds **no mobile number**. `authEvents` already maps mobile to
`providerRef`, so support walks student → message in one hop and this collection never becomes a
second copy of five lakh minors' phone numbers. 90-day TTL; it is operational data, not an audit
trail.

### Operator fallback

`POST /api/admin/otp/issue` mints a code without touching MSG91 and returns it to the admin to read
to the student over the phone. Operator and owner only — a code for a registered number signs
whoever holds it into that account, so it is an impersonation tool and viewers must not have it.
Every use writes `otp.manual_issue` to `adminAuditLog` with the mobile. The code is in the response
and nowhere else: not in the audit row, not in `authEvents`, not in the process log.

The route also refuses a student session explicitly. In this deployment `proxy.ts` gates
`/api/admin/*` first, so that branch is shadowed — it is there because the route-level check is the
guarantee and the proxy gate is a courtesy, which is how every other admin route in this codebase
is written.

### Storage

`otpRequests` holds one row per number, `mobile` uniquely indexed. That index is load-bearing: it is
what makes "one live code per number" a property of the database rather than of the send handler
remembering to clean up, and it is what makes the resend gate atomic under two taps at once. TTL on
`expiresAt` clears abandoned rows.

The code is stored only as `HMAC-SHA256(code, OTP_PEPPER)`, generated with `crypto.randomInt`, and
compared with `timingSafeEqual`. No endpoint returns it in any environment, and no test flag exists
to make one — see `tests/otp.mjs` for how the tests get a known code without one.

---

## 5. The registration form

Reworked after launch review, then reworked again when the code step moved to the front. Everything
below is on `app/(auth)/register/page.tsx` unless noted.

**The code step is step 1, and it is inline on both pages.** No dialog anywhere in either flow.
`components/OtpStep.tsx` is now that inline panel and sign-in uses the same one — it was a modal
over the sign-in form and is not any more. It owns the send, the resend, the verify and its own
loaders; the parent page owns only the decision that a code may be asked for, because only the page
knows what has to be true first (a free number for registration, a registered one for sign-in) and
every send is real money. `sendToken` is that decision: bumping it asks for a code, and the effect
that acts on it is guarded on the token value rather than on mount, because React remounts
components in development and a second send there is a second SMS off the trust's balance.

**The code field is six boxes,** `components/OtpBoxes.tsx`. Paste of a whole code fills all six
wherever it is dropped, typing auto-advances, backspace steps back, and every box carries
`autocomplete="one-time-code"`. The value stays a plain string and the boxes are positions in it, so
there is no way to leave a gap in the middle — which is also what makes paste and the platform's SMS
autofill work without a special case.

**Duplicate numbers are caught before the send.** `/api/register/check-mobile` is awaited when
Continue is pressed, and only then is a code asked for. The blur handler no longer fires its own
copy of that check: it raced the awaited one and left `checkingMobile` true, so Continue appeared to
do nothing. Blur now only marks the field as read.

**Every step change shows a one-second loader and pulls the form back to its own top.** A four-step
form scrolled to the bottom otherwise opens the next step halfway down it, which reads as nothing
having happened. The scroll checks `prefers-reduced-motion` itself — the rule in `globals.css` kills
CSS transitions but cannot reach a scroll asked for from script.

**The district picker shows at most six rows,** at 19px, with the date wheel's snapping and
`overscroll-behavior: contain`. It was a wall of 17px rows that scrolled the page behind it.

**Two refusals that shared one message now have their own.** `lib/errors.ts` dispatches on the body's
error code and only falls back to the status:

| Server | Code | Message | Shown at |
| --- | --- | --- | --- |
| `/api/register`, `/api/otp/send` | `already_registered` | `Register.S.mobileDuplicate` + a sign-in link | the mobile field, step 1 |
| `/api/register` | `email_taken` | `custom.errors.emailTaken` | the email field, step 2 |
| `/api/quiz/attempts` | `already_attempted` | `Quiz.T.onceBody` | toast |

Reading the status alone was the bug: **409 meant all three**, so a first-time registrant was told
"Each student may take the competition only once. Your attempt has been recorded."

`email_taken` was found while fixing this. `/api/register` has two unique indexes, and a duplicate
**email** also raised `already_registered` — so the form blamed the mobile number and threw the
student back to a step where nothing was wrong. The route now reads `keyPattern` to say which index
refused. It surfaced as an intermittent test failure, not a report, and it would have hit any two
students sharing an email address.

**The date picker scrolls.** `components/DobWheel.tsx` — a native `overflow-y` column with
`scroll-snap-type: y mandatory` rather than a list that relabelled itself in place. The momentum is
the platform's, so a flick on a handset behaves like every other list on the device. Rows report
their value only once the column comes to rest, so a flick past forty years fires one change, not
forty. The parent remounts the three columns with a `key` when the picker opens; that is what puts
each on its current value without animating, and it keeps the jump out of an effect.

**Field, step and error states are authored.** `REGISTER_FORM_CSS` in `scripts/build-css.mjs`, not
hand-edited into `app/globals.css` — that file is generated and says so at the top, so anything
written directly into it is lost at the next `npm run css`. Every colour is one the Register export
already uses, so this adds states rather than a palette.

### Authored CSS states were inert until 4 August 2026

`REGISTER_FORM_CSS` and `OTP_CSS` in `scripts/build-css.mjs` had no `!important`, and **every control
on this form carries its resting border and background as an inline style.** An inline declaration
outranks any selector in a stylesheet however specific, so the focus ring, the invalid treatment, the
completed-step separator and the sub-420px sizing of the six code boxes were all being written and
all being ignored. The two error states that did work — the mobile field and the email field — worked
because the page computes their border colour in JavaScript and sets it inline.

Those rules now carry `!important`, the same way the export's own responsive rules and `BOARD_CSS`
do, and for the same reason. The transitions deliberately do **not**, so the reduced-motion block at
the end of `globals.css` still wins over them.

If you add a state rule to this page, either give it `!important` or take the resting value out of
the inline style. Writing it plainly and assuming it applies is the trap.

### This diverges from tests/baseline

CLAUDE.md's definition of done for a page is a pixel match against `tests/baseline/`. Three pages now
diverge, each because a change was asked for explicitly: **Register** (field grouping, step track,
focus and error states), **Login** and **Register** again (the aside artwork is no longer at .46
opacity under a heavy scrim), and **Rules** (the acceptance card is light and the instructions list
above the checkbox is gone). None of that lives in the `.dc.html` exports, so no regeneration can
reconcile it — the baselines are a record of the approved design, and the client has moved it.

**`npm run baseline` was run on 4 August 2026 and the result was reverted.** All 39 images changed,
including nine pages whose exports had not been touched at all, which means the committed baselines
were produced in a different rendering environment (browser build, font rasterisation) than this
machine. Regenerating here would swap a known-good reference for an unverified one and mix two
environments in one set. Regenerate on whatever produced the originals, or re-approve the whole set
deliberately — not as a side effect of a copy change.

### Language

Audited again on 4 August 2026, screenshotting the whole of registration and sign-in in both
languages. Everything with a design source renders from `lib/i18n` in the navbar's language. What is
left in English on a Hindi site is exactly: eleven `custom.otp.*` strings and
`custom.errors.emailTaken`, all in `COPY_NEEDED.md`. Nothing else in either flow is hard-coded
English. `pratiyogita.examNames` is identical in both tables on purpose — NEET, JEE, CLAT, CAT are
proper nouns; `name@gmail.com` and the digit placeholders are the same in both for the same reason.

The suites used to assert on the English OTP labels, which broke the moment Hindi landed. They now
match bilingually (`/^(सत्यापित करें|Verify)$/`), which is the convention the rest of the suite
already used, and the resend control is located by `[data-e~="resend"]` rather than by its label,
because its label is one of the eleven still waiting for Hindi.

---

## 5a. Em dashes are out of the UI, with one exception

Every em dash rendered by a component is gone — the empty-value placeholders in the profile,
participants, integrity and exports tables are now a hyphen, the prose ones are commas or colons,
and the two `vidya-kala` separators are the middot the rest of the site already uses.

**One is left, deliberately:** `lib/i18n/en.ts:11`, the About page lede, which carries two. That
file is generated by `npm run i18n` from the design exports and the string is approved government
copy, so editing it would be both reverted at the next extraction and a rewrite of content
`CLAUDE.md` says is final. Changing it needs the Nyas, and the `.dc.html` source has to change with
it or the baseline comparison fails. Reported, not fixed.

Comments and one server-side `console.warn` still contain em dashes; none of that reaches a reader.

## 5b. Vidya-kala entries render in the book's order — 4 August 2026

`vidya-kala.json` stored prose and shlokas in two parallel arrays keyed only by printed page, so the
sequence *within* a page was never represented. `VidyaKalaEntry.tsx` grouped by page and emitted all
the prose then all the verse, which put **182 of the 192 shlokas in the wrong place** — detached
from the sentence that introduces them, which in this book is usually the line directly above.

**The order was not recoverable from what was stored.** No element carried an index, an ordinal or
any positional field; every one of the 89 shloka-bearing pages also carries prose; the batch files
the merge was assembled from no longer exist; and a colon/dash handoff heuristic matched on only 38
of 89 page-slices. It was re-read from the page images in `split/` instead — sequence only, no text
re-transcribed.

- `entries[].content` is the new ordered array: `para`, `subhead`, `deflist-item`, `quote`,
  `connector`, `shloka`, interleaved as printed. **This is what the site reads.**
- `descriptionHi` and `shloka` are still in the JSON as the provenance `content` was assembled from.
  Nothing reads them. Do not add a second reader.
- `vk-order.json` holds the re-read sequence as positions only (`d0`, `s0`, …, per page).
  `scripts/vk-order.mjs` rebuilds `content` from it and **asserts** every source text is still
  byte-identical, none lost, none duplicated, and that page order never runs backwards.
  `node scripts/vk-order.mjs verify` re-runs those assertions without writing; it should always say
  `701 blocks across 77 entries`.
- Re-run `apply` after any edit to `vidya-kala.json`'s two source arrays, or `content` goes stale.

Three entries carry `key: null` (book headings with no canonical match). `slices()` groups on the
entry's **index**, not its key — grouping on the key hands all three every one of the others' blocks.

On printed 239 (`Akarsha-krida`) the phrase `पाशक क्रीड़ा ।` was stored both inline in the prose and
as a standalone shloka, so it rendered twice. The book sets it in red mid-sentence: emphasis inside
the paragraph, not a verse. The standalone copy was dropped on the client's instruction. **191
shlokas, 700 blocks.**

### Book-internal references are stripped

Seven cross-references that only mean anything inside the printed book were removed from the prose,
each as an exact substring deletion with the surrounding punctuation left closing the sentence
properly. Nothing was rephrased and no Devanagari was typed.

| Where | Cut | Why |
| --- | --- | --- |
| `Yajurveda` p42 | `इसका प्रमाण इसी पुस्तक में … आगे किया गया है।` | forward pointer into this book |
| `Yajurveda` p42 | `, यह पूर्व में कहा जा चुका है` | back-reference to an earlier section |
| `Kalpa` p80 | `, जो इस ग्रंथ में यथास्थान संसूचित किए जायेंगे` | forward pointer into this book |
| `Kalpa` p81 | `शेष अंग यथास्थान सूचित किए जाएँगे।` | forward pointer into this book |
| `Karnapatra-bhanga` p141 | `, जिसे पूर्वोक्त सोलहवीं कला के श्लोकों में देखा जा सकता है` | cross-reference to this book's 16th kala |
| `Takshakarma` p185 | ` ( 36 )` | this book's own section number |
| `Vrikshayurveda` p201 | `इस सबंध में … वर्णन पूर्व में किया जा चुका है।` | back-reference to the Vastu-vidya section |

**Deliberately kept**, because they are content rather than navigation: every scripture citation
(`( ऋग्वेद 1/32/1 )`, `भाग.पु. 11/23/45–58`, `द्रष्टव्य` pointing at a sukta of the Atharvaveda),
every bracketed gloss (`शिक्षा ( उच्चारण विज्ञान )`), and `उपरोक्त तीनों वेद मंत्र` on p65, which
points at the three shlokas immediately above it — those are still immediately above it in
`content`, so it reads correctly on the site.

### One plate per entry

`design/image` holds 78 commissioned illustrations named `  (1).png` … `  (78).png`, numbered in
book order. There are exactly 78 entries — 14 vidyas then 64 kalas — and the mapping is **1:1**:
plate 3 is captioned SAMAVEDA and Samaveda is the third vidya; plate 15 is Krishna with the gopis
and Geet is the first kala; plate 78 is club-swinging and Vyayamiki is the last. They are not the
book's own figures.

`node scripts/vk-plates.mjs` re-encodes them into `public/vk/<key>.webp` and writes `vk-plates.json`.
**42.8MB of PNG became 4.2MB of WebP, 90% smaller**, at native size — the only resize is a 1200px
cap on the handful above it, and sharp is passed `withoutEnlargement`, so nothing is upscaled.
The script refuses to run if the plate count and the entry count ever stop matching, because the
mapping is positional and means nothing once they diverge.

Because the mapping is 1:1, **there is no second plate to place inline** in any entry. Each renders
once, in the entry header, with `alt=""` — it illustrates the heading directly above it, and there
is no approved caption for any of the 78 in either language.

## 5c. Two lists, one flag — both collapsed, 4 August 2026

Two bugs with the same shape: a value that had two sources of truth, and a state that had none.

### The exam enum validated against a different list than the form offered

`lib/registration.ts` built `EXAM_KEYS` from `en.Register.EXAMS`, the design export's 34-entry list.
Item 13 narrowed the *form* to four exams without narrowing the enum, and the export has "NEET UG",
"NEET PG", "JEE Main" and "JEE Advanced" but no bare "NEET" or "JEE". So two of the four options the
form offered were refused at submit with `{"error":"invalid","issues":["competitiveExam"]}`.

Worse than reported: the form also sent the **display label** for Other and None, so on a Hindi
navbar `अन्य` and `कोई नहीं` were refused too. Four of the six selectable options were broken in
Hindi, two in English. District and level already did this correctly — English key as the value,
localised string as the label — and the exam picker simply had not been converted.

`EXAM_KEYS` now derives from `customEn.pratiyogita.examNames`, the same array the form renders, and
the picker sends the key. `en.Register.EXAMS` is no longer read by validation.

**`npm run smoke` registers one student per option** — all six plus `null` — and asserts the stored
value comes back unchanged, plus one case proving the enum still refuses a value the form does not
offer, so widening it to `z.string()` cannot silently un-cover the rest.

### "Competition completed" rendered for everyone

The green completion panel on `/profile` was inside no conditional at all. Every student who reached
the page was told they had finished, including one who had registered minutes earlier. `/api/me`
also returned the newest attempt row **without filtering on status**, so a paper merely opened read
as a completed one.

This is the third time this exact conflation has been found. `app/quiz/page.tsx` carries a comment
about the first ("it used to render 'your attempt is already recorded' unconditionally"), and
`lib/errors.ts` about the second (409 meaning both "number already registered" and "already sat").

**`SAT_STATUSES` in `lib/models/types.ts` is now the single definition** of "has taken the
competition": `submitted`, `auto_submitted`, `expired`. `expired` belongs in it because
`scripts/sweep-attempts.mjs` scores those rows and increments `attemptCount` — filtering it out
would have let a swept student be invited to start a paper the gate then refuses. Read the set;
do not test statuses inline.

Audited, all four readers:

| Reader | Derives completion from | Verdict |
| --- | --- | --- |
| `/profile` | `me.attempt`, now `SAT_STATUSES` only | **fixed** — panel was unconditional |
| `/api/me` | attempt row, now `SAT_STATUSES` only | **fixed** — was any row |
| registration | `lib/errors.ts` code dispatch | already correct |
| quiz entry gate | `status === "in_progress"` → resume, else 409 | already correct |
| certificates nav | `session.hasCertificates` (+ `attemptCount > 0` on Home and vidya-kala) | already correct — both move only on submit or sweep |

A student with no sat paper now gets the invite, using `Profile.S.startQuiz`
("प्रतियोगिता प्रारंभ करें" / "Start the quiz") — approved copy that had been written for this state
and never rendered. While `/api/me` is in flight neither panel shows, so nobody is briefly
congratulated or briefly told to start.

## 5d. Responses are whitelists — 4 August 2026

`lib/serialize.ts` is the only place a student-facing field is named. Every route builds its body
from a serialiser there, key by key. **No spread of a document, no `delete`, no projection standing
in for a contract.** Reviewing what a student can see means reading one file.

**`score` is in none of them and must not be added.** Selection is by district merit list and
committee lottery and the results are published by the Nyas; a score in the network tab pre-empts
that, and scores correlated across attempts are a path to inferring the answer key.

What was leaking, all of it visible in the network tab on an ordinary page load:

| Route | Was returning |
| --- | --- |
| `/api/me` | the whole user document, plus the whole attempt including `score`, on every profile load — and the certificate page called it just to read a name |
| `/api/certificates` | joined each row back to its attempt to attach `score`, which nothing rendered |
| `/api/quiz/attempts/[id]` | spread `score` and `timeTakenSeconds` in for a finished attempt — the client redirects away and never read them |
| `/api/quiz/attempts/[id]/submit` | `score`, `answered`, `timeTakenSeconds`, on all three code paths |
| `/api/register` | `userId` — the Mongo `_id` — and, on a 400, every failing field path |
| `/api/session` | `attemptCount` and `initial`, neither of which the client needed |

Consumers now: `/api/me` is the profile's alone, `/api/me/certificate` is the certificate page's,
`/api/session` carries `signedIn`, `displayName`, `hasCertificates`, `lang`. The quiz screen's
"answered" and "time taken" are computed from its own state, which is where they came from; the
profile is given a formatted `durationLabel` rather than a second count.

`attemptCount` left the session because `hasCertificates` says the same thing — a certificate is
issued for every paper sat, including one swept at expiry — and one flag cannot drift from itself.

Mongo `_id` is not an identifier a student is given. A certificate is addressed by the
`certificateNumber` printed on it. **The one ObjectId still crossing the boundary is an attempt's**,
because it is the URL the student is already on and every read is ownership-checked; giving attempts
an opaque public id needs a field, a unique index and a backfill, so it is a migration to schedule
rather than a serialiser change.

`errorResponse` no longer rethrows. An unrecognised error is logged server-side and answered with a
bare 500 `server_error`; rethrowing rendered a stack in development, and a driver error would have
put Mongo's own message and index names into a body.

### The Server-to-Client trap

Props handed from a Server Component to a Client Component are serialised into the RSC flight
payload and ship inline in the HTML, so **a document passed across that boundary is as public as an
API response**. Audited: the root layout passes only `competitionOpen`, `/quiz/attempt/[id]` passes
the id from its own URL, `/quiz` passes a phase string, and the vidya-kala pages pass book content.
No user document crosses it. Do not start.

Verified rather than assumed — every server-rendered page fetched as a signed-in student who had
sat a paper, and the raw HTML scanned for `score`, `correctOptionId`, `answered`,
`timeTakenSeconds`, `sessionVersion`, `_id` and the student's own email. Eight pages, all clean.

### The guard

`npm run smoke` walks one student — registered, mid-paper, then finished — and greps **fifteen**
response bodies for those four keys, for the bare word "score" in any casing, for `"_id"`, and for a
400 that names a field. It scans the serialised body rather than checking named fields, so a
serialiser that starts spreading a document fails there.

## 5e. The certificate name is placed off the artwork — 4 August 2026

The name was drawn at 49% of the height, above the template's dotted rule and over the artwork, at a
size derived from the page width rather than the rule's.

**Where the rule actually is, measured from cert.jpeg's pixels rather than eyeballed.** Scanning
along y = 356 of 601 separates the label from the rule: x = 256–301 carries irregular, widely spaced
dark runs — the baseline strokes of "श्री / सुश्री" — and from x = 308 the pitch becomes a regular
2.7px through to x = 584. That periodic stretch is the rule.

**The rule is not centred on the page.** Its midpoint is x = 446 of 840, pushed right by the label
beside it. Centring the name on the certificate instead of on the rule is what put it over "सुश्री"
on the first attempt at this fix.

Everything in the block at the top of `app/(account)/certificates/page.tsx` is a fraction of the
certificate's own dimensions, so a larger scan of the same artwork needs no new numbers.

`fitName()` returns the size and top edge, and **both the preview and the exported file read it**.
They used to disagree twice over: the preview truncated a long name with an ellipsis while the export
shrank it, and the preview drew in Noto **Sans** while the export used Noto Sans too but the frame
declared `aspect-ratio: 1600/1131` against an 840x601 image — so `object-fit: contain` letterboxed
the artwork and every percentage addressed the frame rather than the image. Both are fixed.

Text width is linear in font size, so one measurement at a reference size gives the exact fit; there
is no shrink loop. Verified at native scale: `राम कुमार` and `Ram Kumar` sit at the resting 25.2px,
a 36-character Devanagari name comes down to 23.7px, a 44-character one to 17.5px, and a
40-character Latin one to 11.5px — all inside the 264px rule, all with the baseline 1.4–3.0px above
it.

## 5f. Two alignment fixes with a shared cause

**The quiz's "उत्तर हटाएँ" sat against the left edge of its button.** It is the only one of the three
nav buttons with a `display` that toggles — `"none"` / `"inline-flex"` — and a flex container with no
`justify-content` lays its child out from `flex-start`. `पिछला` and `अगला` were fine only because,
being `inline-block`, they got the button element's own centring. All three now carry the same
`inline-flex` + `align-items` + `justify-content`, measured at 0.00px offset each.

**The home page's Browse label rode ~5px high while its chevron sat dead centre.** Not padding, and
not fixable with `line-height`: `Noto Serif Devanagari` declares a descent of 11px at 17.5px for
conjuncts most labels never reach, while the ink descent of these two is 2px in Hindi and 1px in
Latin. The baseline is therefore set low in the line box, and the ink centre lands above the box
centre. **Flex centring can only see the line box, never the ink**, so `align-items` cannot reach it,
a symmetric `line-height` preserves the same offset exactly, and padding would carry the chevron with
it. The correction rides on the label alone (`[data-e~="vkctalabel"]`), in `em` so it holds at any
size. Measured after: 0.13px in Hindi, 0.88px in Latin, identical at 390, 768, 1280 and 1440.

`text-box-trim` would do this properly and is not available on the handsets this platform targets.
If another Devanagari label ever looks high in a pill, this is the cause.

## 5g. The professions section — 4 August 2026

At the foot of `/vidya-kala`: eight approved illustrations, each a doorway into the Vidyas and Kalas
that share its domain. `components/ProfessionBridge.tsx`.

**The framing is domain correspondence and nothing else.** These entries belong to the same field of
study as the modern subject beside them. Nothing in the section says, or may be written to imply,
that one came first or produced the other. The title and subtitle are the trust's own words, copied
verbatim; no prose was written for this section in either language.

### One mapping name has no entry, and is left out

The supplied mapping gives `space` three names: ज्योतिष, यंत्रमात्रिका and **आकरज्ञान**. The first two
resolve. **आकरज्ञान does not exist as a Vidya or a Kala.** The only entry carrying आकर in the sense of
a source or a mine is मणिरागाकर ज्ञान (`Mani-raga-jnana`), which the same mapping already assigns to
`lab` as मणिरागज्ञान; the only other आकर is आकर्षक्रीड़ा (`Akarsha-krida`), a game with magnets.

It is **omitted rather than guessed at**, so `space` currently shows two entries. Supply the intended
name and it is one line in `lib/i18n/professions.ts`.

Seven names differ from the book's own spelling and were matched on the romanised key, which is this
codebase's canonical identifier. Worth confirming, though each is unambiguous:

| Supplied | Book heading | Key |
| --- | --- | --- |
| यंत्रमात्रिका | यन्त्रमातृका | `Yantra-matrika` |
| धारणमात्रिका | धारणमातृका | `Dharana-matrika` |
| वृक्षायुर्वेद | वृक्षायुर्वेद योग | `Vrikshayurveda` |
| उत्सादन | उत्सादन-संवाहन-केशमर्दन कुशलता | `Utsadana` |
| रूप्यरत्नपरीक्षा | रूप्यरत्न परीक्षा | `Rupya-ratna-pariksha` |
| चित्रयोग | चित्राश्चयोग | `Chitra-yoga` |
| मणिरागज्ञान | मणिरागाकर ज्ञान | `Mani-raga-jnana` |

`professionCards()` in `lib/vidyakala.ts` **throws** on a key that stops resolving, so a renamed entry
fails the build rather than rendering a dead link. The keys live once, in `lib/i18n/professions.ts`,
not under `hi` and `en` separately — they are structure, not copy.

### Assets

`npm run professions` → `public/professions/<key>-<width>.webp` at 480, 768 and native, plus
`professions.json` for the srcset. **Nothing is upscaled**: sharp is passed `withoutEnlargement`, any
requested width past the source is dropped, and a native width within 16px of one already emitted is
skipped — the sources are 1074 or 1075 wide, and appending the native width blindly wrote a second
near-identical file for three of them. The widest variant of each is 48% smaller than its JPEG
(3.4MB → 1.7MB); the 3.1MB on disk is every size, of which a phone loads one.

The artwork is used as it is — no crop, no recolour, no overlay. `alt=""`: the illustration restates
the label beside it, and there is no approved caption for any of the eight.

### Layout

Mobile-first — the base rules are the phone layout and the wider grids are additive. One card open at
a time. On a phone the open card expands in place; **at 1100px and up the plate and its links sit side
by side**, because a full-row 3:2 illustration is over 700px tall and pushes every link below the
fold, and the links are the point of the section rather than the picture. Between 720 and 1100 the
open card spans the row with its links in two columns.

Palette #2F456E, #A02B2D, #48887B: resting, open, and the link rail inside an open card. Every
transition is caught by the reduced-motion block at the end of `globals.css`, and nothing depends on
one having run — the panel is `hidden` when shut, so motion-off gets the same content instantly.

## 6. Copy that is still English on a Hindi site

`lib/i18n/custom.ts` `otp.*` — six of the seventeen were supplied on 4 August 2026 and are in.
**Eleven are still English**, live on both the registration and sign-in paths, and listed in
`COPY_NEEDED.md` part 2. `resendIn` is the one to fix first: it is shown for sixty seconds after
every single send, sitting between two controls that are now Devanagari.

The Hindi strings live in `OTP_HI`; the eleven without Hindi read their value from `OTP_EN` rather
than repeating its text, so each becomes Hindi in exactly one place and there is no second English
copy to drift. No Devanagari was invented for any of them.

Field placeholders were asked for on the same day and none exist. The five that need copy written,
the one to decide on and the three that need nothing are in `COPY_NEEDED.md` part 3.

---

## 7. Tests

```
npm run smoke        63/63   registration, OTP, the whole quiz path, sign-in
npm run delivery     13/13   the webhook: auth, shapes, idempotency, unmapped statuses
npm run otpui        19/19   the sign-in code step: inline, six boxes, paste, backspace
npm run registerflow 43/43   the form: code at step 1, duplicate gates, date wheel, district
                             picker, step loader and scroll-to-top
npm run quizentry     9/9
npm run protection   14/14
npm run shell        12/12   the flaky reveal assertion below passed on this run
npm run certificate  24/24
npm run admin         --     needs ADMIN_PASS; not run this session
npm run journey       --     stale and unsafe to run; see the end of this section
```

Re-run in full on 4 August 2026 against one dev server on 3111, after the copy, form and modal
changes. The counts above are that run.

All suites take `BASE`; the three that default to a port of their own were run with
`BASE=http://localhost:3111` against one dev server.

**`shell` has one flaky assertion, and it is not new.** "below-the-fold reveal starts hidden then
reveals on scroll" compares the opacity to exactly `"1"` after a 900ms wait and intermittently
reads `0.9997` — the reveal transition simply has not landed. It passes on a re-run. Left as found:
loosening the comparison without knowing it is only timing would hide a real regression.

The shell suite's loader and toast checks were repointed from sign-in to `/quiz/rules`. They used
`/api/otp/send` as their probe, and sign-in no longer routes that through the global loader or the
toast stack — it has an inline loader and an inline message now. `components/RulesContent.tsx` is
the remaining caller of both.

`tests/otp.mjs` plants a verifiable code by computing the same HMAC the server does, so the suites
walk the real `/api/otp/verify` route without any endpoint ever returning an OTP. `tests/otpui.mjs`
stubs `/api/otp/send` throughout — **no test should ever spend one of the trust's credits.**

The manual-issue checks added to `tests/admin.mjs` have not been run; that suite needs credentials
this session did not have.

Run `npm run indexes` after pulling: `otpRequests`, `otpCounters`, `smsDeliveries` and
`providerHealth` are new.

Two cron entries are required and neither is installed by anything in the repo:

```
* * * * *      npm run sweep      # pre-existing
*/15 * * * *   npm run balance    # new
```

---

**`npm run journey` is stale and it spends credits.** It was last touched in `1f0d59e`, before the
OTP work landed in `0f0bca3`, so it still expects step 1 to advance straight to step 2 and fails at
"advanced to step 2". Worse, it is the one suite that does **not** stub `/api/otp/send`, and it fills
in a randomly generated mobile number — running it puts a real send on the wire. One went out on
4 August 2026 before this was understood. `tests/registerflow.mjs` covers the same ground properly
and stubs the send. Either rewrite `journey` against the OTP flow or delete it; leaving it runnable
is a live hazard.

## 8. Live sends made during this work

Two requests reached MSG91, both while testing the failure path, both carrying
`authkey: invalid-key-for-failure-path-test`:

- one to `9533080863` (a randomly generated number) via `/api/otp/send`
- one to `9999999999` via curl

Both returned `type:"success"` — which, per section 3, is what MSG91 says regardless. They almost
certainly were not delivered and cost nothing, but that cannot be confirmed from the response.
Check the MSG91 dashboard for those two `request_id`s if the balance looks off.

Generating a real-looking number for a send test was a mistake; use a number the trust controls.

---

## 9. Things deliberately not done

- **Login rate limits are still per Node worker.** `lib/api.ts` holds buckets in process. With
  several workers behind the reverse proxy the effective ceiling is (workers × limit). The OTP
  quotas are in Mongo and do not have this problem, but the in-process limiter in front of them
  does. Redis is the fix when the box grows past one process.
- **The per-IP send cap will hit school computer labs.** 20 sends an hour per IP, and a lab of forty
  students registering together shares one address. `app/api/register/route.ts` already carries a
  comment about exactly this hazard for a different limit. Watch `otp_quota_ip` in `authEvents` on
  the first day; it is the number most likely to need raising.
- Everything in `DEFERRED.md` still stands.
