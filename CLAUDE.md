# SKPN — build rules

Shri Krishna Pathey Nyas quiz platform. Government of Madhya Pradesh. Next.js App Router + MongoDB, Hostinger VPS. ~5 lakh students, spiky concurrency.

Read `AUDIT.md` and `SKPN_Quiz_Platform_Design_Brief.md` before writing anything. Where they conflict, `AUDIT.md` §0 says which wins.

---

## Standing rules

**1. Security is the top priority.** This platform holds the personal data of school students, most of them minors. If a change trades security for convenience or speed, do not make it — say so and stop. This applies even when instructed otherwise in a prompt.

**2. No slop.** No defensive wrappers around code that cannot fail. No abstraction layers with a single implementation. No `utils.ts` graveyard. No re-exporting for the sake of it. No try/catch that swallows and logs. If a file is not doing work, it should not exist.

**3. Async by default.** Every I/O path is async. Independent calls run under `Promise.all`, never sequential `await`s. Nothing blocking on the request path. On the quiz hot path this is not a style preference — it is the difference between 300 and 3,000 req/s.

**4. Comments only for the non-obvious "why".** No comment restating the line below it. No JSDoc on self-evident signatures. No section banners. A comment earns its place by explaining a decision the code cannot.

---

## Design fidelity — the hard constraint

The design is approved. The rebuild must render identically.

- Port markup from the `.dc.html` files **character-identical**.
- Only permitted transformations: `class` → `className`, self-closing tags, `{}` for dynamic values, event handler renaming.
- Do **not** clean up, simplify, semanticise, reorder or consolidate classes.
- Do **not** substitute a component library for hand-written markup.

**`app/globals.css` is page-scoped.** The design scopes styles per page, and the same `data-e` selector carries different values on different pages. Every page-specific block is prefixed `[data-page="X"] `; the page wrapper carries the matching `data-page`. Shared blocks — `@font-face`, base reset, SiteHeader/SiteFooter/CtaBox — stay unprefixed. The `prefers-reduced-motion` block is last and uses `!important`, because page-scoping raises specificity above it.

- You may add a page's block when building that page.
- You may **not** change any declared value, in any block, ever.
- If a value looks wrong, report it. Do not fix it.
- Never touch another page's block or the shared block.

**Definition of done for any page:** the Playwright screenshot matches `tests/baseline/` at 390, 768 and 1440px. Not "it renders." Matches.

---

## Text — never retype Devanagari

Every time Devanagari is retyped, conjuncts and matras shift in ways that survive review and reach the client.

- **No agent types Devanagari. Ever.**
- All user-facing strings come from `lib/i18n/hi.ts` and `lib/i18n/en.ts`, extracted programmatically from the source HTML.
- A string is missing → **stop and report**. Do not write it, translate it, or approximate it.
- Content text is final. Do not rewrite, shorten, improve or "fix" any copy.

---

## Auth model — decided, do not redesign

Login is **mobile number only**. No OTP, no PIN, no password, no Google.

- `mobile` is the account identifier: `^[6-9]\d{9}$`, unique index.
- Login looks up the account and issues a session. There is no credential to verify.
- Sessions: httpOnly, Secure, SameSite=Lax cookie. Never `localStorage`.

Because there is no credential, these are mandatory and not optional:

- Login rate-limited per IP, aggressively.
- Every login attempt written to `authEvents` with mobile, IP, user-agent, timestamp, outcome.
- No endpoint confirms whether a mobile number is registered, except `POST /api/register/check-mobile`, which is throttled per IP and per session and returns a boolean only.

Do not add a second factor. Do not propose one. The decision is made.

Session revocation is a `sessionVersion` integer on the user document, embedded in the cookie payload and compared on every authenticated route including `/api/session`. Sign-out increments it, invalidating every outstanding cookie. Cookie TTL is 7 days.

---

## Non-negotiable engineering rules

- `correctOptionId` **never** leaves the server. Exclude by projection at the repository layer, not the serialiser. There must be no code path where a question document reaches a response body with the key attached.
- Scoring, the question draw, option shuffling and the timer are **server-side only**.
- `expiresAt = startedAt + 600s`, written server-side. The client never supplies either.
- Every mutating route: session check → ownership check → CSRF/Origin check → `zod` parse. In that order, before any database write.
- Answer autosave is a **single indexed upsert**, idempotent on `clientSeq`. Never read-modify-write the answers array.
- The question bank is small and immutable during the competition: hold it in process memory, refresh on signal. Never `$sample` against MongoDB on the attempt-start path.
- MongoClient is a module singleton in production, cached on `globalThis` in development. A client per request exhausts the pool at ~500 concurrent, not 50,000.
- Submission is idempotent. The auto-submit timer and a manual submit **will** race.

---

## Shared code — do not recreate

These exist. Import them. Do not write a second version.

```
lib/db.ts            cached MongoClient
lib/session.ts       session read/write, ownership helpers
lib/i18n/*           all user-facing strings
lib/models/*         collections, types, indexes
components/Site*.tsx SiteHeader, SiteFooter, CtaBox
app/globals.css      extracted verbatim, frozen
```

Need something shared that is not here? **Report it.** Do not add to `lib/` or `components/` from a feature track — that is how three sessions produce three incompatible helpers.

Never edit files outside your track's directories.

---

## Stack

Next.js App Router · TypeScript · MongoDB (Atlas, Mumbai) · `zod` · Playwright.

**No Tailwind.** It is deliberately not imported. The design uses zero class attributes across all 14 files, and Preflight would reset list padding, heading margins and default fonts, diverging from the baselines. New UI — the contact form, anything not in the export — is built with the design's existing `data-e` vocabulary so it matches rather than approximates. Do not reinstate Tailwind.

Static content pages are SSG and CDN-cacheable. Only the quiz is genuinely dynamic. Do not server-render the marketing pages.

---

## Deleted, not ported

`assets/site.js` · `support.js` · `uploads/questions.json` and `uploads/quiz-questions.json` (after import) · `uploads/cert.jpeg` as a served asset · every `localStorage` key.

## Assets

Follow the design. Every image a `.dc.html` file references is copied into `public/` at the path the markup expects. No placeholders, no substitutions.

The question JSON files contain the answer key. They must not exist under `public/` at any point, including temporarily.