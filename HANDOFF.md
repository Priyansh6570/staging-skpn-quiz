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

## 2. The date copy is NOT changed — see COPY_NEEDED.md

The competition now opens **5 August 2026**. The site still says 29 July in six places.

This is not an oversight. The date is welded to "Guru Purnima" in the approved copy, and Guru
Purnima 2026 *is* 29 July — the scheme launches on Guru Purnima per the government order, the
competition opens separately on 5 August. Changing the number alone would make the sentence false,
and rewriting the framing is the Nyas's call, not the build's. The six keys, with their current
Hindi and English, are laid out in `COPY_NEEDED.md`.

`scripts/baseline.mjs:59` pins the Playwright clock to `2026-07-29T00:00:00Z`. **Leave it.** It is
there to freeze carousels and marquees so screenshots hash identically run to run; it carries no
meaning about the competition, and moving it would shift every carousel and invalidate all of
`tests/baseline/`.

When the approved strings land, they also have to go into three `.dc.html` design exports or the
baseline comparison will fail. Line numbers are in `COPY_NEEDED.md`.

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

### This diverges from tests/baseline

CLAUDE.md's definition of done for a page is a pixel match against `tests/baseline/`. Changing the
form's visual design necessarily breaks that for Register, and it was asked for explicitly. **The
Register baselines need regenerating and re-approving** — `npm run baseline` — and until that is
done a baseline run will report Register as failing. No other page is affected.

### Language

Audited. Everything with a design source renders from `lib/i18n` in the navbar's language, verified
in both — the duplicate-number refusal was checked rendering in Devanagari under a Hindi navbar. The
only English-on-a-Hindi-site strings left in the flow are the `custom.otp.*` placeholders and
`custom.errors.emailTaken`, all listed in `COPY_NEEDED.md`. `pratiyogita.examNames` is identical in
both tables on purpose — NEET, JEE, CLAT, CAT are proper nouns.

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

## 6. Copy that is still English on a Hindi site

`lib/i18n/custom.ts` `otp.*` — fourteen strings, live on both the registration and sign-in paths.
Listed in `COPY_NEEDED.md` part 2. No Devanagari was invented for them; they are English in both
locales, following the `vidyaKala` precedent already in that file.

This is the most user-visible thing outstanding.

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
npm run shell        11/12   see below
npm run certificate  24/24
npm run admin         --     needs ADMIN_PASS; not run this session
```

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
