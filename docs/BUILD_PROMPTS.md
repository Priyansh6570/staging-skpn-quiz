# SKPN — Claude Code build prompts

Run in order. Stage A is one session, sequential. Stage B is three sessions in parallel. Stage C is one session again.

Put `CLAUDE.md` in the repo root before the first prompt.

---

## Stage A — Foundation

One session. Nothing parallelises until this merges.

```
Read CLAUDE.md, AUDIT.md and SKPN_Quiz_Platform_Design_Brief.md before starting.

Build Stage A only — the shared foundation. Do not build any page or API route
beyond what is listed here.

1. Extract all CSS from the .dc.html files into app/globals.css, byte-identical.
   Do not reformat, dedupe, minify or optimise. If two files define the same
   rule, keep both and report the collision.

2. Write a Node script (scripts/extract-strings.mjs) that walks the .dc.html
   files and extracts every user-facing Hindi and English string into
   lib/i18n/hi.ts and lib/i18n/en.ts with matching keys. Strings must be copied
   programmatically. Do not retype any Devanagari. After running it, verify
   every Hindi string round-trips byte-identical against the source and report
   any that do not.

3. Port SiteHeader, SiteFooter and CtaBox into components/, markup verbatim,
   props per AUDIT.md §1.3. These consume i18n keys, never inline text.

4. lib/db.ts — MongoClient, module singleton in production, cached on globalThis
   in development.

5. lib/models/ — collections and TypeScript types per AUDIT.md §3, with the auth
   model below. Plus scripts/ensure-indexes.mjs, idempotent, creating every
   index in AUDIT.md §3 including the merit-list compound indexes.

   Auth model, final:
   - mobile: string, ^[6-9]\d{9}$, UNIQUE index, the account identifier
   - no pinHash, no OTP, no password, no OAuth fields
   - email: optional per the HTML design
   - add an authEvents collection: { mobile, ip, userAgent, outcome, at }
     with index { mobile: 1, at: -1 } and { ip: 1, at: -1 }

6. lib/session.ts — httpOnly + Secure + SameSite=Lax session cookie, signed.
   Helpers: getSession, requireSession, requireOwnership. No localStorage
   anywhere in the codebase.

7. Playwright config plus scripts/baseline.mjs that screenshots every .dc.html
   at 390, 768 and 1440px into tests/baseline/.

Do not implement login, registration, quiz or any page route. Report anything
ambiguous instead of deciding it.
```

Merge to `main` before opening the tracks.

---

## Stage B — three parallel tracks

```
git worktree add ../skpn-auth    feat/auth
git worktree add ../skpn-quiz    feat/quiz
git worktree add ../skpn-content feat/content
```

One Claude Code session per directory. Merge order: **auth → quiz → content**.

### Track 1 — Auth, registration, profile

```
Read CLAUDE.md and AUDIT.md. You own only:
  app/(auth)/*, app/api/auth/*, app/api/register/*, app/api/me/*, app/profile/*

Do not touch lib/, components/, app/globals.css, or any other app/ directory.
Need something shared that does not exist? Report it, do not add it.

Build:

1. POST /api/auth/login — mobile only, no credential. Look up the account,
   issue a session. Same generic response whether or not the account exists.
   Rate-limited per IP. Every attempt written to authEvents.

2. POST /api/auth/signout, GET /api/session per AUDIT.md §2.1. /api/session is
   called on every page — it must be tiny, no-store, and must read from the
   session cookie payload rather than hitting the users collection per request.

3. Register — 4 steps, markup ported verbatim from Register.dc.html. Every
   §7.1 rule validated server-side with zod, not only client-side. Districts,
   education levels and the exam list stay as bundled constants, not endpoints.

4. POST /api/register/check-mobile — throttled per IP and per session, returns
   a boolean only, never reveals which account holds the number. Replace the
   hardcoded 9876543210 fixture.

5. Store enums as stable keys, not localised labels. AUDIT.md §3.1 lists the
   three fields the design currently gets wrong: gender, educationLevel, and
   district. Fix all three.

6. /profile and GET /api/me — real data, no fixture, no localStorage.
   PATCH /api/me/language writes preferredLanguage to the user record AND
   mirrors to a cookie.

Registration writes the records the merit list is built from. Validate
everything server-side. Screenshot-diff each page against tests/baseline/.
```

### Track 2 — Quiz engine

**Supervise this one yourself.** It carries every finding that could invalidate the competition.

```
Read CLAUDE.md and AUDIT.md, especially §2.3, §3.2, §3.3, §4.1, §4.2, §4.3.
You own only: app/quiz/*, app/api/quiz/*, scripts/import-questions.mjs

Do not touch lib/, components/, app/globals.css, or any other app/ directory.

Build:

1. scripts/import-questions.mjs — import quiz-questions.json into the questions
   collection. Give every option a stable id; the source keys answers by array
   position and that becomes a correctness bug the moment options shuffle.
   Fix the Q6 transliteration and flag Q40 per AUDIT.md §5.2. After import,
   delete both JSON files from any public path.

2. Split Quiz.dc.html into four routes per AUDIT.md §1.2, markup verbatim.

3. The four hot-path endpoints from AUDIT.md §2.3:
   - POST /api/quiz/attempts — draws 30 from the in-memory bank, shuffles
     options, writes questionIds AND the served option order, sets startedAt
     and expiresAt server-side, enforces one-attempt-ever. Returns all 30
     questions in one payload. No correctOptionId in that payload, ever.
   - GET  /api/quiz/attempts/[id] — resume with the same remaining time.
     The design has no resume path at all; this is new.
   - PATCH /api/quiz/attempts/[id]/answers — single indexed upsert, idempotent
     on clientSeq, no read-modify-write of the answers array. Highest write
     volume in the product.
   - POST /api/quiz/attempts/[id]/submit — scores server-side, idempotent,
     rejects past expiry with grace, returns a designed expiry state rather
     than a 4xx the UI renders as a crash.

4. Client-side autosave batching: hold answers in state, flush a compact diff
   every 10-15s and on navigation. Not one request per tap.

5. The auto-submit sweeper — a background job expiring in_progress attempts
   past expiresAt and scoring them. Without it, a closed tab leaves an attempt
   open forever.

6. Keep the design's refresh block, back-button block and copy block as-is.
   They are UX friction, not a save mechanism — the server-side autosave in
   step 4 is what actually protects a student on a dropped connection.

correctOptionId must not appear in any response body on any code path. Exclude
it by projection at the repository layer. Write a test that asserts this.
```

### Track 3 — Static pages

```
Read CLAUDE.md and AUDIT.md §1.1, §1.4, §6.2, §6.7.
You own only: app/(marketing)/*

Do not touch lib/, components/, app/globals.css, or any other app/ directory.

Build, all SSG and CDN-cacheable, markup ported verbatim:

1. / (Home), /about, /pratiyogita
2. /rules and /quiz/rules — one content component, two routes. /rules public
   and static; /quiz/rules auth-gated with the acceptance POST.
3. /privacy and /terms — two real routes, not the query-string tab switch.
   A government legal notice behind ?doc= is not acceptable.
4. /contact — does not exist in the export. Build per brief §6.4: name, email,
   mobile (optional), subject dropdown, message. Honeypot plus rate limit.
   No CAPTCHA.

Session-dependent UI (nav "My Certificates", hero CTA, CtaBox) hydrates client-
side from /api/session. Do not make these pages dynamic for it — at launch-day
spike, a per-request render of the homepage is the first thing that falls over.

Rebuild the reveal and parallax behaviour without assets/site.js. Anything
touching window goes in useEffect with cleanup, or dynamic() with ssr: false.
Honour prefers-reduced-motion. Self-host Noto Sans Devanagari via next/font.

Content gaps in AUDIT.md §1.4 — the 64 Kalas on /pratiyogita, the selection
process, the "a high score does not by itself win" line — report them. Do not
write the copy yourself.

Screenshot-diff every page against tests/baseline/ at all three widths.
```

---

## Stage C — Certificates and hardening

One session, after all three tracks merge.

```
Read CLAUDE.md and AUDIT.md §4, §6.6, §2.5.

1. Certificates: /certificates list, /certificates/[id], server-rendered PDF
   (A4 landscape, embedded Devanagari, vector logo), non-sequential certificate
   numbers. Replace the static JPEG with a CSS name overlay.

2. Per-route rate limits per AUDIT.md §4.8.

3. Security review of AUDIT.md §4 end to end. Report findings; do not silently
   fix design-level decisions.

4. Accessibility pass in HINDI with a screen reader. Devanagari support is
   where this breaks, and the divyang category makes it functional rather
   than cosmetic.

5. Load test the top three endpoints from AUDIT.md §2.5 with k6 at 5k, 15k and
   30k virtual users. Report where it breaks before the client finds out.

6. Merit-list batch job with the flagging rules from brief §8.3.
```

---

## Notes

- Track 1 merges first — the other two import `lib/session.ts` helpers it exercises.
- If two tracks both report needing the same shared helper, add it to `lib/` yourself between merges rather than letting either track write it.
- Screenshot diffs are the acceptance gate. A track is not done until they pass.
