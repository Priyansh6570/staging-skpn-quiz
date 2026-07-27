# Shri Krishna Pathey Nyas — Public Website + Scholarship Quiz Platform

## Design & Content Brief for Claude Design

**Prepared for:** Claude Design (visual design + front-end direction)
**Client:** Shri Krishna Pathey Nyas (श्रीकृष्ण पाथेय न्यास), Bhopal — an autonomous public trust of the Department of Culture, Government of Madhya Pradesh
**Build stack (already decided):** Next.js (App Router) + MongoDB
**Status of this document:** Content and functional specification. It deliberately contains **no visual direction** — no colour palettes, no typefaces, no layout ideas. Those are yours to invent.

---

## 0. How to read this brief

| Section | What it gives you |
|---|---|
| 1–3 | Context, hard constraints, brand asset |
| 4–5 | Site map, bilingual rules |
| 6 | Page-by-page content spec |
| 7 | Registration form — full field table |
| 8 | Authentication |
| 9 | Quiz engine — screen by screen |
| 10 | Certificate |
| 11 | Motion, accessibility, performance requirements |
| 12 | Imagery sourcing policy (read this — it constrains what you can put on screen) |
| 13 | Data model sketch |
| 14 | **Open questions the client must answer before launch** |
| A–D | Appendices: districts, education levels, 14 Vidyas, 64 Kalas |

Anything marked **[VERIFY]** is drawn from a scanned government document and must be confirmed against the original before it goes on a live page.

---

## 1. What this is

Two products on one domain:

1. **A public-facing website** for Shri Krishna Pathey Nyas — an institutional presence for a state government trust.
2. **A quiz platform** hosted inside it, running the *Bhagwan Shri Krishna Medhavi Chhatravritti Pratiyogita* (भगवान श्रीकृष्ण मेधावी छात्रवृत्ति प्रतियोगिता) — the qualifying competition for a ₹1,00,000 scholarship awarded to 102 students of Madhya Pradesh.

The two are not separate sites. A visitor lands on the Nyas homepage; the competition is one of the things the Nyas does.

### 1.1 The occasion

The competition launches on **Guru Purnima, 29 July 2026**, which Madhya Pradesh now observes annually as **Maharishi Sandipani Guru Parv** (महर्षि सांदीपनि गुरु पर्व). Maharishi Sandipani was Bhagwan Shri Krishna's guru at Ujjain. The scholarship is themed on the **64 Kalas and 14 Vidyas** that Shri Krishna is traditionally said to have mastered at the Sandipani ashram. That is the intellectual centre of the whole site: *guru–shishya parampara, and the Indian knowledge tradition.*

### 1.2 The scheme, in facts

| Item | Value |
|---|---|
| Scheme name | भगवान श्रीकृष्ण मेधावी छात्रवृत्ति योजना / Bhagwan Shri Krishna Medhavi Chhatravritti Yojana |
| Competition name | भगवान श्रीकृष्ण मेधावी छात्रवृत्ति प्रतियोगिता |
| Launch date | 29 July 2026 (Guru Purnima) |
| Awarding body | Shri Krishna Pathey Nyas, Bhopal |
| Scholarship | ₹1,00,000 — one-time, single instalment |
| Number of awardees | 102 total — 51 from schools, 51 from colleges/universities |
| Award ceremony | MP Sthapana Diwas – Krishi Lokotsav, **1 November 2026, Bhopal** |
| Subject matter | 64 Kalas, 14 Vidyas, Maharishi Sandipani, Indian knowledge tradition |
| Entry fee | None. Free. |
| Eligibility | Resident of Madhya Pradesh, currently enrolled |
| Official email | shrikrishnapatheynyas@gmail.com |
| Legal jurisdiction | Bhopal |

**Source orders (cite these in the footer / About page):**
- Department of Culture, GoMP — कार्यवाही विवरण, क्रमांक 110/अ.मु.स./सं./तीस/2026, dated 21 July 2026 (meeting chaired by the Hon'ble Chief Minister on 20 July 2026)
- General Administration Department, GoMP — क्रमांक एफ 5-8/2026/1/4, dated 22 July 2026
- Department of Culture, GoMP — trust constitution order, क्रमांक एफ 4/1/4/0001/2024/तीस, dated 03 February 2025

### 1.3 About the Nyas (for the About page)

- Constituted by order of the Department of Culture, Government of Madhya Pradesh dated **03 February 2025**, pursuant to a Council of Ministers decision of **20 November 2024**.
- Registered under the **Madhya Pradesh Public Trusts Act, 1951**.
- Headquarters: **Bhopal**. Sub-offices may be opened as required.
- Governed by a body of **28 trustees** — the Hon'ble Chief Minister of MP as Chairperson (अध्यक्ष), the Hon'ble Minister of Culture as Vice-Chairperson (उपाध्यक्ष), 23 ex-officio trustees drawn from state secretaries and directorates, and 5 eminent non-official members from the fields of art, culture, education and Krishna studies.
- Day-to-day administration is run by a **Chief Executive Officer**. **[VERIFY]** The July 2026 record lists **Shri Shriram Tiwari** as CEO, Shri Krishna Pathey Nyas.
- Constitutional basis cited in the trust deed: Articles **25, 26, 29, 49 and 51(A)** of the Constitution of India.

**Objects of the trust** (paraphrase these for the About page; do not present as verbatim legal text):
- Identify, develop, protect and preserve the places in Madhya Pradesh associated with the travels of Bhagwan Shri Krishna, and document them through recording, photography, filming and illustration.
- Protect and manage temples, water structures, forest wealth and gardens within those sites, and promote them nationally and internationally.
- Advise on and work towards establishing a Sandipani Gurukul at Ujjain for formal instruction in the 64 Kalas and 14 Vidyas.
- Build and manage auditoria, community centres and dharmshalas.
- Develop the heritage of education, culture, agriculture, and cow and livestock husbandry in keeping with the concept of Shri Krishna Pathey.
- Connect the younger generation, emotionally and experientially, to the story of Bhagwan Shri Krishna and to the destinations of his journeys, centred on Ujjain.
- Establish libraries, museums and information centres for tourists, researchers, youth and students.
- Document the contribution of the sages, saints, thinkers, poets, writers, artists and scientists who helped establish Shri Krishna as Jagadguru.

---

## 2. Hard constraints — read before designing anything

1. **This is a Government of Madhya Pradesh project.** No invented statistics, no placeholder numbers left in, no aspirational claims ("India's largest…", "10,000+ students"), no fabricated testimonials, no fake press logos, no stock "happy student" photography implying real participants. Every number, date, name and designation on a live page must trace to a source order. If a section needs a number we do not have, the section does not ship.
2. **Hindi is the authoritative language.** English is a courtesy translation. Where the two differ, Hindi governs. Say so in the footer.
3. **No religious instruction, no devotional claim-making.** The framing throughout is cultural, historical and educational — Indian knowledge tradition, guru-shishya parampara, heritage. Not worship.
4. **Minors are the primary audience.** Class 9 students are typically 13–14 years old. See §14.1 — this has legal consequences under the DPDP Act, 2023 and must be resolved before launch.
5. **Accessibility is functional, not cosmetic.** Divyang (disabled) students compete in a dedicated merit category. If the quiz is not operable by screen reader and keyboard, the scheme's own category is unusable. WCAG 2.1 AA is the floor.
6. **The site will be used on cheap Android phones on patchy rural 4G.** Design for that as the primary case, not the exception.
7. **No file uploads anywhere in the product.** Certificates (Divyang, marksheets, Aadhaar, bank details) are collected **offline, after selection**. The website never asks for a document.

---

## 3. Brand asset

One asset exists: **`skpn-logo.png`** — 554×554px, RGBA with transparency. A circular gold medallion with a decorative concentric border and lotus/mandala motifs, carrying the Devanagari wordmark **श्रीकृष्ण पाथेय** in two lines.

That is the entire brand kit. There is no style guide, no secondary mark, no colour spec, no typeface spec, no photography library. You are free to build the visual identity from scratch around this mark. Constraints on the mark itself:

- Do not recolour, distort, crop, rotate or place text inside it.
- It needs a light-background lockup and a dark-background lockup — derive both from the same asset.
- It must render legibly at 32px favicon size; the Devanagari will disappear at that size, so plan a simplified favicon derivation.
- Supply an SVG redraw if you can. The raster will not hold up on large hero placements or in print on certificates.

Alongside the trust mark, the site must carry the **Government of Madhya Pradesh / Department of Culture** attribution in the footer and on the certificate. **[VERIFY]** the exact permitted emblem usage with the department before placing the State Emblem anywhere — emblem use is restricted by the State Emblem of India (Prohibition of Improper Use) Act, 2005. Default to a text attribution unless written permission is on file.

---

## 4. Site map

**Primary navigation (persistent):**

| EN | HI | Route |
|---|---|---|
| Home | मुख्य पृष्ठ | `/` |
| About Us | हमारे बारे में | `/about` |
| Pratiyogita | प्रतियोगिता | `/pratiyogita` |
| Contact Us | संपर्क करें | `/contact` |
| **My Certificates** | **मेरे प्रमाण पत्र** | `/certificates` — *conditional* |

**Conditional nav item:** "My Certificates" appears in the navbar **only** when the signed-in student has at least one submitted attempt. Before that it does not exist in the DOM at all — not disabled, not greyed out. Absent.

**Utility (top-right cluster):** language switch · sign in / account menu

**Account menu (signed in):** My Profile · My Certificates · Sign Out

**Secondary routes (not in main nav):**

| Route | Purpose |
|---|---|
| `/register` | Create account |
| `/login` | Sign in |
| `/profile` | Read-only student profile |
| `/rules` | Full competition rules — publicly readable |
| `/quiz/rules` | Gated rules + acceptance step |
| `/quiz/instructions` | Pre-start instructions |
| `/quiz/attempt/[id]` | Live quiz — chromeless |
| `/quiz/submitted/[id]` | Confirmation |
| `/certificates/[id]` | Single certificate view + download |
| `/privacy` | Privacy notice |
| `/terms` | Terms of use |
| `/results` | Results — publishes later, see §14.4 |

**Footer:** organisation block (name, Bhopal address, official email) · quick links · the three source order references · Government of MP attribution · privacy, terms · language note ("In case of any discrepancy, the Hindi version shall prevail") · last-updated date.

---

## 5. Bilingual behaviour (English / हिन्दी)

- Toggle visible in the header on every page, including inside the quiz.
- **Persistence:** the choice is stored on the user record in MongoDB (`preferredLanguage`) and mirrored to a cookie. A signed-in student sees their language on every device, every session, forever, until they change it. Not localStorage-only.
- **Anonymous visitors:** cookie only; carried into the registration flow so the choice survives account creation.
- Default language: **Hindi**, on first visit, for everyone. This is a Madhya Pradesh government site for Madhya Pradesh students.
- Switching language mid-quiz must **not** reload the page, reset the timer, or lose an answer. Question text and options swap in place.
- Design implications you must plan for:
  - Devanagari runs **taller** and often **longer** than the same English string. Every button, chip, nav item and table header needs to survive a ~30–40% string expansion without wrapping badly. Test every component with the Hindi string, not the English one.
  - Devanagari needs more line-height than Latin. Buttons sized to Latin cap-height will clip matras.
  - Numerals: use **Western Arabic numerals (0–9)** in both languages for scores, timers, question counts, dates and the certificate. Devanagari numerals will confuse a candidate under a 10-minute timer.
  - Pick a font pairing where the Devanagari and Latin faces have compatible weight and x-height. A mismatched pairing will look broken on every page, and half this site is Devanagari.
- Names of persons, institutions and government departments are **not** translated. They are transliterated once and then frozen. Build a glossary and stick to it.

---

## 6. Page-by-page content specification

### 6.1 Home — `/`

The homepage has one job: a Class 10 student in a district town understands within five seconds that *there is a free competition, it leads to a ₹1,00,000 scholarship, and this is the button.*

Sections, in order:

1. **Hero.** Name of the Nyas, the competition name, the launch date (29 July 2026 / Guru Purnima), one line on what it is. Primary CTA: *Register for the Competition / प्रतियोगिता के लिए पंजीकरण करें*. Secondary CTA: *Read the Rules / नियम पढ़ें*. For a signed-in student the primary CTA becomes *Start Quiz / प्रतियोगिता प्रारंभ करें*.
2. **The scheme at a glance.** Four to six facts, scannable: ₹1,00,000 · 102 students · free entry · 30 questions in 10 minutes · open to Class 9–12 and college/ITI/polytechnic students of MP.
3. **About the Nyas — short.** Three or four sentences, link to `/about`.
4. **What the competition covers.** The 64 Kalas, the 14 Vidyas, Maharishi Sandipani, the Indian knowledge tradition. This is the most visually interesting content on the site and deserves the most design attention — see Appendices C and D for the full source lists. Link to `/pratiyogita`.
5. **How it works.** Four steps: Register → Read and accept the rules → Take the 30-question quiz → Download your participation certificate. Then a plain statement of how selection actually happens (district-wise merit lists → committee lottery → results on this website).
6. **Key dates.** 29 July 2026 — competition opens. 1 November 2026 — scholarship distribution at MP Sthapana Diwas / Krishi Lokotsav, Bhopal. Closing date for entries: **[OPEN — see §14.3]**.
7. **Closing CTA.**

**Do not put on the homepage:** participant counters, "trusted by" strips, testimonials, a newsletter signup, social proof of any kind, or a countdown to a date the client has not fixed.

### 6.2 About Us — `/about`

Content is in §1.3. Structure it as:
- What the Nyas is and when it was constituted (with the order reference).
- Why it exists — the Shri Krishna Pathey concept: mapping and developing, within Madhya Pradesh, the places associated with Bhagwan Shri Krishna's journeys, with Ujjain at the centre.
- Objects of the trust — the bulleted list, paraphrased.
- Governance — 28 trustees, chaired by the Hon'ble Chief Minister, with the Hon'ble Minister of Culture as Vice-Chairperson; an Executive Committee; a Chief Executive Officer. Do **not** publish the full name list of trustees or committee members without written clearance — designations only, or a small named list the department signs off on.
- Maharishi Sandipani and the Ujjain connection — the reason this scholarship exists at all.
- The source orders, listed with number and date.

### 6.3 Pratiyogita — `/pratiyogita`

The competition's own landing page. Everything a candidate needs, before they sign up.

- **What it is and why.** One paragraph.
- **Who can participate.**
  - Two categories: **Vidyalaya Star** (विद्यालय स्तर) — students of Classes 9 to 12. **Mahavidyalaya Star** (महाविद्यालय स्तर) — students of colleges, universities, polytechnics or ITIs.
  - The student must be a **resident of Madhya Pradesh**.
  - Participation is **free**.
- **Format.** 30 questions · single correct option each · 10 minutes total · 1 mark per correct answer · **no negative marking** · auto-submits when time expires · answers cannot be changed once an attempt is submitted · **unlimited attempts allowed, and the best attempt is the one that counts**.
- **Syllabus.** The 64 Kalas, the 14 Vidyas, Maharishi Sandipani, and the Indian knowledge tradition. Present the 14 Vidyas and 64 Kalas as browsable, explorable content — this is the page's centrepiece. Full lists in Appendices C and D.
- **How selection works.** State it plainly and completely, because it is unusual and candidates will misread it:
  1. Separate district-wise merit lists are prepared for **male**, **female** and **divyang** candidates, in each of the two categories.
  2. From every district of Madhya Pradesh, the top 50 students in each category — 100 per district — enter the shortlist pool.
  3. From that pool, the adjudicating committee selects the winners **by lottery**.
  4. Results are published on this website, and selected students are informed by email and mobile.
  5. **A high score does not by itself win the scholarship.** Say this explicitly. It prevents a lot of grievance email.
- **What selected students must produce afterwards.** Marksheet, institutional ID, proof of residence, Aadhaar, bank account details — and, for anyone who entered under the divyang category, a **government-issued disability certificate**. Failure to produce these cancels the entry.
- **Award ceremony.** 1 November 2026, Bhopal.
- Prominent link to the full rules.
- CTA: register / start.

### 6.4 Contact Us — `/contact`

- Organisation name, Bhopal.
- Official email: **shrikrishnapatheynyas@gmail.com**.
- **[VERIFY]** postal address and any helpline number before publishing. Do not invent a phone number. If none is provided, ship with email only.
- A contact form: name, email, mobile (optional), subject (dropdown: Registration issue / Technical problem during quiz / Rules and eligibility / Results and selection / Other), message. Anti-spam via honeypot + rate limit, not a puzzle CAPTCHA — CAPTCHAs are a hard barrier for the divyang cohort.
- Expected response time — only if the client commits to one.
- Grievance line: state which office a dispute goes to, and that the decision of Shri Krishna Pathey Nyas is final, with jurisdiction at Bhopal.

### 6.5 Rules — `/rules` (public) and `/quiz/rules` (gated)

**Same content, two contexts.**

`/rules` is a public reference page, readable by anyone, linked from the footer and the Pratiyogita page.

`/quiz/rules` is the mandatory gate. A student who clicks "Start Quiz" lands here every time — not just the first time. It carries an **Accept and Continue / स्वीकार करें और आगे बढ़ें** button that is disabled until the acceptance checkbox is ticked.

**The acceptance declaration** (mandated in the source rules, must appear verbatim in Hindi):

> मैंने सारे नियम पढ़ लिए हैं और मुझे स्वीकार हैं। मेरी दी हुई जानकारी सही है।
>
> *I have read all the rules and accept them. The information I have provided is correct.*

**Rules content, in the source order's own sections:**

1. **Who can participate** — two categories; Class 9–12; college/university/polytechnic/ITI; MP resident; free entry.
2. **What the form asks for** — name, email, mobile, address, district, gender, Educational qualification, name of institution; the category selection; and a warning that false information will cancel the entry.
3. **For divyang students** — a candidate participating on the basis of disability must produce a disability certificate if selected; failure to do so cancels the entry.
4. **Competition format** — the seven points in §6.3 under Format, plus the syllabus statement.
5. **Before you begin** — have a stable internet connection; do not refresh the page or use the back button once the quiz starts; **the timer will not be extended** for a lost connection or any other interruption.
6. **How selection works** — the five points in §6.3.
7. **Prohibited** — do not register using another person's name or documents; do not take help from another person, use any software, or use any unfair method during the quiz.
8. **Other important terms** — documents required on selection; data will be used only for the competition, results and scholarship; the organisers reserve the right to use the names, districts, institutions and event photography/video of selected students; rules and dates may change, with changes published on this website; the decision of Shri Krishna Pathey Nyas is final; jurisdiction is Bhopal.

**Design requirement:** rules run long, and a student is between themselves and the quiz. Make them genuinely readable — sectioned, scannable, navigable — without turning the acceptance into a formality that is clicked blind. A "you have reached the end" signal before the checkbox unlocks is a reasonable pattern. Do not hide the accept button below a scroll trap that keyboard users cannot escape.

### 6.6 Register — `/register`

Full field specification in §7. Structural requirements:

- **Multi-step, not a single wall.** Suggested grouping: (1) sign in with Google **or** verify email by code → (2) personal details → (3) address → (4) education → (5) declaration and consent. A 14-year-old on a phone will abandon a 14-field single-column form.
- **Step 1 gates everything.** No other field is reachable until the identity is established (§8.2). A Google sign-in completes step 1 in one tap and prefills name and email; email OTP completes it with a 6-digit code.
- Visible step indicator with the total step count.
- Validate on blur, per field. Never dump all errors at submit.
- Errors are specific and in the student's language: "Enter a 10-digit mobile number starting with 6, 7, 8 or 9", not "Invalid input".
- All progress survives a back-navigation between steps.
- Every label, hint and error message exists in both languages.
- Final step carries: the rules-acceptance declaration checkbox, the privacy consent, and — see §14.1 — the guardian consent block for under-18 candidates.
- **No file upload control appears anywhere on this form.**

### 6.7 Login — `/login`

- Two paths, presented side by side, Google first: **Continue with Google** and **Sign in with email**. See §8.
- The email path is: enter email → receive a 6-digit code → enter code. Not a magic link (§8.1).
- Link to register for new users; the two screens should be one clearly-toggled surface, not a maze. In practice a returning Google user cannot tell login from registration and should not have to — signing in with a recognised Google account should land them straight in their account, not on an error.
- Visible resend countdown and a "change email address" escape.
- After sign-in, return the user to wherever they were headed.

### 6.8 Profile — `/profile`

Read-only. Everything the student submitted at registration, displayed clearly and **not editable**.

- Personal: name, gender, date of birth (if collected), mobile, and email — with the email labelled as the sign-in address **and** the address results are sent to. Do not badge the mobile number as verified; it is not (§8).
- How the account signs in: Google, or email code. If Google, show which Google account is linked.
- Address: address line, city/village, district, state (Madhya Pradesh), PIN code.
- Education: category (Vidyalaya / Mahavidyalaya), Educational qualification, institution name.
- Divyang declaration: yes/no, with the standing reminder that a government disability certificate must be produced if selected.
- **Participation summary — required by the client:**
  - Number of attempts taken (`x times / x बार`)
  - Best score, and the date of that attempt
  - A list of every attempt: date, time taken, score, and a link to that attempt's certificate
- Language preference — this is the **one** editable control on the page.
- A clear line explaining *why* nothing else is editable: entries are verified against official documents at selection, so details are locked after registration. Give a contact route for genuine corrections (email the Nyas), rather than a silent dead end.

### 6.9 Certificates — `/certificates` and `/certificates/[id]`

See §10.

### 6.10 Privacy — `/privacy`

Must state, plainly and in both languages: what is collected, why, who can see it, how long it is kept, that it is used only for the competition/results/scholarship, the organisers' publicity rights over selected students' names and district and institution, and how to raise a grievance. Given the age of the audience this page needs to be written at a Class 9 reading level, not in legalese. **[OPEN — §14.1]** must be resolved before this page can be finalised.

---

## 7. Registration form — field specification

Two notes before the table:

**Mobile is collected but no longer verified.** Auth is Google Sign-In + email OTP (§8). The mobile number is still required — the rules mandate it and selected students are notified on it — but it carries no OTP step and no verified badge. Email carries the verification instead.

**State is not a dropdown.** The rules require the candidate to be a resident of Madhya Pradesh. Presenting 28 states invites ineligible entries that then have to be rejected by hand. Render the state as a **fixed, disabled field reading "Madhya Pradesh / मध्यप्रदेश"**, with a short note: *This competition is open only to students of Madhya Pradesh.* Keep the full state list in the data layer for future reuse, but do not show it. Country is not needed at all.

**"Education institution name" — better field name.** The requested phrasing ("last study place") conflicts with the eligibility rule, which requires the student to be **currently enrolled**. Recommended label:

- EN: **Name of School / College Currently Enrolled In**
- HI: **वर्तमान अध्ययनरत विद्यालय / महाविद्यालय का नाम**
- Field key: `institutionName`

The Hindi wording matches the source rules exactly (*अध्ययनरत संस्था का नाम*). If a shorter label is needed for layout: EN **Current Institution** / HI **वर्तमान संस्था**, with the full phrasing as helper text.

### 7.1 Field table

| # | Field key | Label (EN) | Label (HI) | Type | Required | Validation & notes |
|---|---|---|---|---|---|---|
| 1 | `mobile` | Mobile Number | मोबाइल नंबर | tel, +91 prefixed | Yes | Exactly 10 digits, first digit 6–9. **Not OTP-verified** (§8). Unique index at the DB level anyway, as a soft duplicate check. Numeric keypad. Helper: *selected students are contacted on this number*. May be a parent's number — say so, do not imply it must be the student's own. |
| 2 | `fullName` | Full Name | पूरा नाम | text | Yes | 3–100 chars. Accept Devanagari and Latin. Helper: *as printed on your marksheet / जैसा आपकी अंकसूची में है*. |
| 3 | `email` | Email Address | ईमेल पता | email | Yes | **The account key and the sign-in identity** (§8.2). Verified at step 1, before the rest of the form opens — by Google Sign-In or by 6-digit code. Unique. Prefilled from Google when that path is used, but editable, because the Google account is often a parent's. Domain typo hint required (`gmial.com`, `gmail.con`). Label it clearly: results are sent here. |
| 4 | `gender` | Gender | लिंग | select | Yes | Male / Female / Other — पुरुष / महिला / अन्य. **[OPEN — §14.2]** |
| 5 | `dateOfBirth` | Date of Birth | जन्म तिथि | date | **[OPEN — §14.1]** | Needed to determine minor status for consent. Native date input; do not build a custom calendar that fails on Android WebView. |
| 6 | `addressLine` | Address | पता | textarea | Yes | House/street/locality. 5–200 chars. |
| 7 | `cityVillage` | City / Village | शहर / गाँव | text | Yes | 2–80 chars. |
| 8 | `district` | District | जिला | searchable select | Yes | **55 MP districts — Appendix A.** Must be type-to-filter; a 55-item scroll on a phone is unusable. Filter must match both Hindi and English input. |
| 9 | `state` | State | राज्य | fixed, disabled | — | Always "Madhya Pradesh / मध्यप्रदेश". Not a dropdown. |
| 10 | `pincode` | PIN Code | पिन कोड | tel | Yes | 6 digits. Numeric keypad. |
| 11 | `category` | Applying As | किस श्रेणी में आवेदन | radio (2 large cards) | Yes | **Vidyalaya Star / विद्यालय स्तर** (Class 9–12) or **Mahavidyalaya Star / महाविद्यालय स्तर** (college, university, polytechnic, ITI). Ask this **before** field 12 — it drives its options. Radio cards, not a dropdown; this is the single most consequential choice on the form. |
| 12 | `educationLevel` | Educational qualification | शैक्षणिक योग्यता | select, dependent on #11 | Yes | Options in **Appendix B**. Must reset if `category` changes, with a visible notice. |
| 13 | `institutionName` | Name of School / College Currently Enrolled In | वर्तमान अध्ययनरत विद्यालय / महाविद्यालय का नाम | text | Yes | 3–150 chars. Free text — do not attempt an institution autocomplete; there is no clean master list and a wrong-but-plausible suggestion is worse than free text. |
| 14 | `isDivyang` | I am participating under the Divyang (disability) category | मैं दिव्यांग श्रेणी में भाग ले रहा/रही हूँ | checkbox | No | On tick, reveal a persistent, non-dismissible notice — see §7.2. |
| 15 | `rulesAccepted` | *(declaration text)* | *(declaration text)* | checkbox | Yes | The verbatim Hindi declaration from §6.5. Gates the submit button. |
| 16 | `privacyConsent` | I consent to my information being used for this competition, its results and the scholarship process | मैं सहमत हूँ कि मेरी जानकारी इस प्रतियोगिता, परिणाम एवं छात्रवृत्ति संबंधी कार्य में उपयोग की जाएगी | checkbox | Yes | Links to `/privacy`. |
| 17 | `guardian*` | *(guardian consent block)* | | conditional group | **[OPEN — §14.1]** | Required if the candidate is under 18. |
| 18 | `preferredLanguage` | — | — | derived | — | Captured from the toggle state at registration; editable later from Profile. |

### 7.2 Divyang notice — required copy

When `isDivyang` is ticked, this must appear immediately, inline, and must **not** be dismissible:

> **EN:** If you are selected, you must produce a government-issued disability certificate. If you do not, your entry will be cancelled.
>
> **HI:** चयन होने पर आपको शासन द्वारा जारी दिव्यांगता प्रमाण पत्र प्रस्तुत करना अनिवार्य होगा। ऐसा न करने पर आपकी प्रविष्टि निरस्त मानी जाएगी।

Nothing is uploaded now. The certificate is produced offline, after selection.

### 7.3 Duplicate mobile numbers — behaviour, copy and recovery

The client's decision: a mobile number may be used for only one registration, and a second attempt to use it shows an error. Unique index on `mobile` at the database level. Implement it — but the *interaction* around it matters more than the constraint itself, because it sits between a real student and a scholarship.

**Validate live, on blur — not at submit.** The mobile field sits at step 2, after identity is already established at step 1. If the duplicate check only fires on final submit, the student has completed four steps and created an account before being told the number is taken. Check it the moment the field loses focus, and show the result inline.

**The error must not be a dead end.** "This number is already registered" answers nothing useful — the student cannot log in, because sign-in is by Google or email (§8), and they may not remember which email they used. Without a recovery path this error message is a support-ticket generator. Required copy:

> **EN:** This mobile number is already registered. If this account is yours, sign in instead. If you do not remember which email you used, write to shrikrishnapatheynyas@gmail.com and we will help you.
>
> **HI:** यह मोबाइल नंबर पहले से पंजीकृत है। यदि यह खाता आपका है, तो कृपया साइन इन करें। यदि आपको याद नहीं कि आपने कौन सा ईमेल उपयोग किया था, तो shrikrishnapatheynyas@gmail.com पर लिखें, हम सहायता करेंगे।

With a **Sign in** action directly in the error state. Never reveal *which* email the number is attached to — that is somebody else's data.

**Handle the orphan account.** Because identity is established at step 1 and the phone is entered at step 2, a blocked student leaves behind an authenticated account with no completed registration. Design for this explicitly:
- The account exists in an `incomplete` state and is not counted as a registration anywhere.
- Returning to the site resumes them at the step they were blocked on, with their earlier answers intact.
- They can change the mobile number and continue.
- Incomplete registrations older than a set window are purged. **[OPEN]** — the client sets the window; 30 days after the competition closes is a reasonable default.

**Rate-limit the check.** An open "is this number registered?" endpoint lets anyone test numbers in bulk to learn who has signed up. It is a small exposure on a scholarship site, not a banking-grade threat, and it is not worth degrading the UX over — but throttle the endpoint per IP and per session so it cannot be enumerated at scale.

**What this actually buys you.** It stops the casual duplicate, which is the great majority. It does not stop a determined one — a second SIM costs less than a bus fare. That is fine and expected: the real deduplication happens offline at document verification, where Aadhaar and marksheet are checked before any money moves (§8.3). Treat the phone constraint as friction, not as a control.

**The case this rule will break:** see §14.12. Read it before implementing a hard block.

---

## 8. Authentication — Google Sign-In + email OTP (Resend)

**Decision taken:** phone OTP is dropped entirely. There is no SMS in this product. Sign-in is **Google Sign-In**, with **email OTP delivered via Resend** as the equal-standing alternative. Mobile number is still collected — the rules require it and selected students are notified on it — but it is **not verified and not an authentication factor**.

This is the right call for a free, state-wide, minor-heavy campaign: no DLT, no per-SMS billing, no carrier deliverability roulette, and most MP students are on Android phones already signed into a Google account.

### 8.1 The two methods

**Google Sign-In — lead with this.**

Most candidates will be on an Android phone with a Google account already active. One tap, no app switching, no code to type, no email to check on a slow connection. Present it first and most prominently on both `/register` and `/login`.

Constraints to design around:
- Google returns `email`, `name`, `picture` and a verified-email flag. **Prefill the name field from it, never accept it as final.** The registered name must match the candidate's marksheet, and Google account names are frequently nicknames, initials, or a parent's name. Show it prefilled, editable, with the helper text *"as printed on your marksheet"*.
- **The Google account may belong to a parent.** On a shared family phone this is the common case, not the edge case. So the email on the Google account is not necessarily the student's. Allow the student to change the email during registration even when they signed in with Google — the sign-in identity and the contact/results email are two different things, and conflating them will lose results emails.
- Google requires account holders in India to be **13 or older**. Class 9 candidates are typically 13–14, so this is workable, but it interacts with §14.1 — a 13-year-old signing in with a parent's account still needs guardian consent recorded.
- Do not request any scope beyond basic profile and email. A government portal asking for Drive or Contacts access is an instant trust failure.
- Do not use Google's avatar image anywhere on the site. It is hosted on Google's CDN, it breaks when the account changes, and it puts a third-party image request on every page of a government portal. Use initials.

**Email OTP via Resend — the equal alternative.**

For candidates without a Google account, or on a phone where Google sign-in fails. Not framed as a fallback in the UI — it is simply the other button.

- **Use a 6-digit code, not a magic link.** This matters more than it sounds. On a phone, a magic link opens inside the mail app's in-app browser, which is a different browser context from the one the student started in — they end up signed in inside Gmail's webview, with their registration progress stranded in Chrome. A 6-digit code is copied across contexts trivially and never breaks. Magic links look more elegant in a demo and fail more in the field.
- Code input must be paste-friendly and autofill-friendly: `inputmode="numeric"`, `autocomplete="one-time-code"`, single-field-per-digit is fine as long as pasting all six at once works.
- Visible resend countdown, a clear "change email address" escape, and an explicit *"this code has expired — request a new one"* state rather than a silent failure.

### 8.2 Email is now the account key — design for that

With phone verification gone, **email is the single identity anchor**, and it is simultaneously the channel on which scholarship results are delivered. A typo now costs the student both their account and their result. Consequences:

- **Verify the email before the rest of the registration form opens.** Same gating pattern the phone OTP had: step 1 is *sign in with Google, or verify your email by code*. Only then do steps 2–5 unlock. This prevents a student from filling fourteen fields and then discovering they mistyped their address.
- Add a **domain typo hint** on manual email entry — `gmial.com`, `gmail.co`, `gmail.con`, `yahoo.co` are the ones that will actually occur.
- On the confirmation and profile screens, display the email prominently with a *"results will be sent here"* label.
- Since the profile is non-editable (§6.8), there must be a **support route for correcting an email address**, handled by the Nyas over its official email. A student locked out of their own account with no path back is a grievance letter to the department.

**Account linking — get this right or the merit list breaks.** A student who registers with Google (`x@gmail.com`) and later signs in with email OTP on the same address must resolve to the **same account**, not a second one. Normalise on lowercase + trim, treat email as the unique key, and link the Google identity to the existing record rather than creating a new one. Duplicate accounts mean duplicate entries in a district merit list, and the selection is a lottery — a duplicated candidate silently gets two tickets.

### 8.3 What is lost, and how to cover it

Phone OTP was quietly doing two jobs. It authenticated, *and* it made duplicate registration mildly expensive — one person, one SIM. Email does not do the second job at all: any student can create five Gmail addresses in ten minutes.

How much this matters, honestly: **for the quiz itself, not at all.** Unlimited attempts are already permitted and the best attempt counts, so multi-accounting buys a candidate nothing. It matters only at the district merit list and the lottery, where one person appearing twice gets two draws.

Cover it like this:
- **Unique index on `mobile`** at the database level even though it is unverified. It will not stop a determined duplicate, but it stops the casual one and it surfaces the pattern.
- **Flag duplicate mobile numbers, duplicate names, and same-name-same-institution clusters for manual review** at the shortlisting stage.
- Accept that the real deduplication happens **offline, at document verification**, where Aadhaar, marksheet and institutional ID are checked before any money moves. Say so in the rules — the deterrent is that a duplicate entry gets cancelled at that point, and the rules already provide for cancellation on false information.

Do not attempt to solve this with device fingerprinting or IP-based blocking. Whole school computer labs share one IP, and blocking a district's only cybercafé on launch day is a worse outcome than a handful of duplicate entries.

### 8.4 Resend — operational requirements

**A sending domain is required, and the client does not currently have one.** The official contact address on record is a **gmail.com** address. You cannot send authenticated mail from a `gmail.com` address through Resend — DMARC will fail and the OTPs will land in spam or be rejected outright. Before launch the Nyas needs a real domain (its own, or a `mp.gov.in` subdomain issued by the department) with SPF, DKIM and DMARC configured. **This is a launch blocker and it has lead time. Raise it now.** See §14.10.

**The free tier will not survive launch day.** Resend's free plan is 3,000 emails per month with a **hard cap of 100 emails per day** on a single domain. A state-wide competition opening on a festival date will blow through 100 sends in the first few minutes, and every subsequent registrant simply cannot sign up. The Pro tier (around $20/month for 50,000 emails, daily cap removed, up to 10 domains) is the minimum viable plan and must be active *before* 29 July, not upgraded in a panic afterwards. Overage beyond plan volume is billed per thousand. **[VERIFY]** current pricing and limits at resend.com/pricing before budgeting — these change.

Other requirements:
- **Warm the domain.** A brand-new sending domain that suddenly emits thousands of messages on day one looks exactly like a spam run. Start sending low-volume real mail from it well before launch.
- **OTP emails must be plain and boring.** Short subject, the six digits large and near the top, minimal imagery, no marketing footer, no tracking pixels. Heavy HTML templates are a spam-filter liability, and this email must arrive.
- Bilingual: send the OTP email in the student's currently selected language. Both templates need testing for Devanagari rendering across Gmail, Outlook and the stock Android mail client.
- Handle bounces and complaints via Resend webhooks. A hard bounce on a registration email means that student will never receive their result — surface it, do not swallow it.
- Sender name must clearly read as the Nyas, not as a generic app name.

### 8.5 Abuse controls — still non-negotiable

Email OTP is cheap, not free, and an open send endpoint is an open relay for harassment.

- 6-digit code, 5-minute expiry, maximum 5 verification attempts per code, then invalidate.
- Resend cooldown starting at 30 seconds, backing off on repeat.
- Hard cap of roughly 5 OTP sends per email address per 24 hours, plus per-IP throttling.
- Codes generated and compared **server-side only**; store a hash, never the code.
- No CAPTCHA puzzle in the funnel (§6.4) — use rate limiting, a honeypot, and Turnstile-style invisible challenges only if genuinely needed.

### 8.6 Sessions

- Long-lived session in an httpOnly, Secure, SameSite cookie. A student who registered on Tuesday should not re-authenticate to take a quiz on Wednesday.
- CSRF protection on every state-changing route, quiz submission included.
- Sign-out clears the session everywhere it can.
- **Implementation note for Claude Code:** Auth.js (NextAuth) in the Next.js App Router supports the Google provider and the Resend provider as first-class adapters, with a MongoDB adapter available. This is the shortest correct path and avoids hand-rolling OTP storage and session handling.

### 8.7 One disclosure requirement

Google Sign-In means a third party receives a request every time a student authenticates on a Government of Madhya Pradesh portal. The privacy notice (§6.10) must say so plainly, in both languages, at a Class 9 reading level. **[VERIFY]** with the department whether they have any standing policy on third-party authentication providers on departmental web properties before this ships.

---

## 9. Quiz engine

### 9.1 Flow

```
Student signs in
   ↓
Clicks "Start Quiz" anywhere on the site
   ↓
/quiz/rules  ── rules + acceptance checkbox → [Accept and Continue]   ← EVERY attempt, not just the first
   ↓
/quiz/instructions  ── what to expect, timer explanation, do-not-refresh warning → [Begin]
   ↓
/quiz/attempt/[id]  ── 30 questions, 10:00 timer, chromeless
   ↓
Last question → [Submit] → confirmation modal → [Confirm Submission]
   ↓
/quiz/submitted/[id]  ── result summary
   ↓
/certificates/[id]  ── view and download participation certificate
```

### 9.2 Instructions screen — `/quiz/instructions`

Short, calm, unmissable. Content:
- 30 questions. 10 minutes. One correct option per question.
- 1 mark per correct answer. **No negative marking** — attempt everything.
- The timer starts the moment you press Begin and does not pause.
- The quiz submits itself automatically when the timer reaches zero.
- Do not refresh the page or use the back button.
- Once submitted, answers in that attempt cannot be changed.
- You may take the competition as many times as you like. **Your best attempt is the one that counts.**
- A visible **Begin / प्रारंभ करें** button, and a way back out that does not consume an attempt.

### 9.3 Quiz screen — `/quiz/attempt/[id]`

**Chrome:** stripped. No site navigation, no footer, no distractions. Exceptions: the logo, the language toggle, and the timer.

**Regions:**

**a) Timer.** Always visible, never scrolls away. Counts down from 10:00. Needs escalating visual states — normal, warning (≈2:00 left), critical (≈0:30 left) — communicated by more than colour alone, for colour-blind and low-vision candidates. It must not be so aggressive that it induces panic in a 14-year-old; this is a scholarship quiz, not a horror game.

**b) Question area.** Question number ("Question 12 of 30" / "प्रश्न 12 / 30"), question text, four options as large tap targets (minimum 44×44px, comfortably more on mobile). Selecting an option is a single tap. A **Clear Response / उत्तर हटाएं** control must exist — students change their minds, and with no negative marking there is never a reason to trap a selection.

**c) Navigation.** Previous / Next. On the last question, Next is replaced by **Submit / जमा करें**.

**d) Question palette — the side panel.** This is the piece the client specified in detail; get it exactly right.

- **30 numbered boxes**, one per question, always reachable.
- Each box carries one of four states:

| State | Meaning | HI |
|---|---|---|
| **Current** | The question on screen right now | वर्तमान |
| **Answered** | Visited and an option is selected | उत्तर दिया गया |
| **Visited, unanswered** | Opened but left blank | देखा गया, उत्तर नहीं दिया |
| **Not visited** | Never opened | नहीं देखा गया |

- The four states must be distinguishable **without relying on colour alone** — shape, fill, border, icon, or a combination. Roughly 8% of male candidates are colour-blind, and this panel is the primary orientation tool during a 10-minute timed exam.
- **Below the boxes, a live count for each state**, with the label and the number. This is a specified requirement, not optional.
- Tapping any box jumps straight to that question. No confirmation, no penalty, instant.
- A legend explaining the four states, in the current language.
- **Mobile:** 30 boxes plus counts will not sit beside the question on a 360px screen. Collapse the palette into a bottom sheet or drawer, opened by a persistent control that itself shows the answered count (e.g. "12 / 30"). The student must be able to reach the palette from any question in one tap, and dismiss it in one tap, without losing their place.

**e) Submit confirmation modal.** Triggered by Submit. Must show, before confirming:
- Answered: *n*
- Not answered: *n*
- Time remaining
- A clear warning: once submitted, answers in this attempt cannot be changed.
- Two actions: **Confirm Submission / जमा करें** and **Go Back / वापस जाएं**. Cancel must be the safer, easier target — an accidental submit at question 22 with four minutes left is the worst outcome the interface can produce.
- Fully keyboard-operable, focus-trapped, Escape closes.

### 9.4 Engineering requirements the design must accommodate

These affect what you draw, so they are here rather than in a separate doc:

- **The timer is server-authoritative.** The client displays it; the server owns it. `startedAt` is written server-side; the submit endpoint rejects anything past `startedAt + 10min + grace`. The UI needs a state for "your time expired while you were submitting" that does not look like a crash.
- **Answers autosave** as they are selected. The rules tell students not to refresh, but students refresh, phones die, and rural 4G drops. A student who returns should resume the *same* attempt with the *same* remaining time. Design the resume state.
- **Offline / reconnecting state.** A visible, non-blocking indicator when the connection drops, and a reassurance that the answer was saved. Do not throw the student out of the quiz.
- **Auto-submit at zero** must be a designed moment — a brief, unmissable transition into the submitted state, not a silent redirect.
- **Correct answers never reach the client.** Questions are served without the answer key; scoring happens server-side at submission. No answer review screen is possible during the attempt, and none is specified.
- **Randomisation.** Unlimited retakes with a fixed 30-question paper is a memorisation exercise. The build needs a large question bank (target 300+) with 30 drawn at random per attempt and options shuffled. Flag to the client if the bank does not exist yet — this is a content dependency, not a code problem, and it is on the critical path for 29 July.
- **Single active attempt** per student. Starting a new attempt while one is live must be handled explicitly, not by racing two tabs.
- **Question text is bilingual.** Every question and every option needs both language versions in the bank, and the toggle swaps them without touching state.

### 9.5 Submitted screen — `/quiz/submitted/[id]`

- Confirmation that the attempt was recorded, with the timestamp.
- Score for this attempt, out of 30.
- Best score across all attempts, and the number of attempts taken.
- A **restatement that a high score alone does not win the scholarship** — selection is by district-wise merit list followed by a committee lottery. This is the single most important expectation-setting line in the entire product. Do not bury it.
- When results will be published, and where.
- Actions: **Download Certificate**, **Take Again**, **Go to Profile**.

---

## 10. Certificate

### 10.1 What it is — and what it must not claim

A **participation certificate** (सहभागिता प्रमाण पत्र). It confirms that the named student took part in the competition on a given date. It must not state or imply selection, ranking, winning, or entitlement to the scholarship.

**[VERIFY — §14.5]** The source orders do not mention participation certificates. The wording, the signature block, and any use of a government emblem must be approved by the Nyas in writing before launch.

### 10.2 Contents

- Nyas logo and name, and the Government of Madhya Pradesh / Department of Culture attribution.
- Competition name and the occasion (Guru Purnima / Maharishi Sandipani Guru Parv, 29 July 2026).
- Student's full name, exactly as registered.
- District and category (Vidyalaya / Mahavidyalaya).
- Date of the attempt.
- A unique certificate number, and a QR code or short URL resolving to a public verification page (`/verify/[certificateNumber]`) showing name, district and date — nothing more. Verifiability is what stops a downloaded PDF from being edited in Canva.
- Signature block — **[VERIFY]** designation and authority.
- Whether the score appears at all: **[OPEN — §14.5]**. Given retakes and lottery selection, a score on a certificate is more likely to mislead than to inform. Default recommendation: omit it, or show only participation.

### 10.3 Certificates page — `/certificates`

- Appears in the navbar only once at least one attempt is submitted (§4).
- Lists every attempt: date, category, score, and a **Download** action per attempt.
- Each certificate opens at `/certificates/[id]` with a preview and download.

### 10.4 Production requirements

- Generated **server-side as a PDF** at a print-safe size (A4 landscape recommended), not by screenshotting a DOM node — that produces low-resolution, unprintable output and breaks entirely on older Android browsers.
- The logo must be vector on the certificate. Another reason to get the SVG redraw (§3).
- Devanagari must embed correctly in the PDF; test a name with conjuncts and a nukta before signing off.
- The on-screen preview and the downloaded PDF must be visually identical.
- Names may be in Devanagari or Latin, and may be long. The layout must handle both without overflow.

---

## 11. Motion, accessibility, performance

### 11.1 Motion — what the client asked for

The client wants parallax, animation, transitions, and a site that feels smooth and conveys the theme. That is your call to make. The constraints on it:

- **The quiz is a no-motion zone.** No parallax, no scroll effects, no decorative animation inside `/quiz/attempt/[id]`. A timed assessment for teenagers, some with disabilities, is not a place for motion design. Transitions there should be functional and fast (state changes, modal entry) and nothing else.
- **`prefers-reduced-motion` must be honoured everywhere**, and it must genuinely disable parallax and scroll-triggered animation — not just shorten them. This is a WCAG requirement and this audience explicitly includes disabled students.
- **Parallax must not break scroll on low-end Android.** Test on a real ₹10,000 phone, not a throttled desktop.
- **Motion never gates content.** Nothing important may be invisible until scrolled into view for a user whose JavaScript is slow or blocked. Fade-in-on-scroll should start visible and enhance, not start hidden and reveal.
- Animation should carry the *theme* — the knowledge tradition, the guru-shishya lineage, the 64 Kalas — rather than being generic web polish. But that is the only steer given; the interpretation is yours.

### 11.2 Accessibility — WCAG 2.1 AA, treated as a functional spec

- Full keyboard operability including the question palette and the submit modal.
- Every quiz state announced to screen readers: question changes, answer selection, timer milestones (announce at 5:00, 2:00, 1:00, 0:30 via a polite live region — not every second).
- The palette's four states distinguishable without colour.
- Minimum 44×44px touch targets; more inside the quiz.
- Contrast ratios met at AA for all text, including on any hero imagery.
- No CAPTCHA puzzles anywhere in the funnel.
- Visible, high-contrast focus indicators throughout.
- Form errors associated programmatically with their fields.
- Test with a screen reader in **Hindi**, not only English. Devanagari screen-reader support is uneven and this is where it will break.

### 11.3 Performance

- Target: usable first paint under 3s on 4G on a mid-range Android.
- The registration form and the quiz must work with a slow connection. The quiz especially — a student mid-attempt cannot afford a 2MB hero image loading in the background.
- Images: modern formats, correct sizing, lazy-loading below the fold. The hero is the one thing that must not be lazy.
- Expect traffic to be extremely spiky — a state-wide launch on a festival date, then again in the final days before close. Design does not fix that, but avoid patterns that multiply requests per pageview.

---

## 12. Imagery — sourcing policy

**Answering the client's question directly:** Claude Design and Claude Code can search the web when the tool is enabled, and can produce **vector and CSS artwork** — SVG illustration, patterns, motifs, iconography, generative decoration. They do **not** produce photographs, and they cannot license someone else's image for you.

For a Government of Madhya Pradesh project, that distinction matters a great deal:

**Do not use:**
- Images pulled from web search results. Almost all are copyrighted, and a government site using an unlicensed image is a real liability, not a theoretical one.
- Any depiction of Bhagwan Shri Krishna, Maharishi Sandipani, or any deity sourced from the internet. Beyond copyright, provenance and appropriateness here are matters for the department, not for a designer.
- Photographs of identifiable people, including students, without written consent.
- Any AI-generated photorealistic image presented as a real place, person or event.

**Do use:**
- **Original SVG and CSS artwork** — motifs derived from the logo's mandala and lotus border, pattern systems, illustrations of the 64 Kalas, iconography for the Vidyas. This is the strongest path: it is unambiguously ours, it scales, it loads fast, and it can carry the theme more distinctively than any stock photograph.
- **Photography supplied by the client.** Veer Bharat Nyas and Maharaja Vikramaditya Shodhpeeth hold archives of Ujjain, the Sandipani Ashram, Vikramotsav and related events. Ask for them. Owned photography of the actual places beats anything else available.
- Public-domain or explicitly CC0 material, **with the licence recorded** in the repo.
- Government-issued imagery where the department has cleared its use in writing.

**Practical recommendation:** build the visual system so it works entirely without photography, then treat any client-supplied photographs as an enhancement. If the archive request comes back empty two days before launch, the site should still look finished.

Every asset that ships needs a line in an `ASSETS.md` file recording its source and licence. On a government project this will eventually be asked for.

---

## 13. Data model sketch (MongoDB)

Indicative, for shared vocabulary — the implementation is Claude Code's.

```
users
  _id,
  email (unique, lowercased, verified — the account key),
  authProviders: [{ provider: "google" | "email_otp", providerAccountId, linkedAt }],
  mobile (unique index, NOT verified),
  fullName, gender, dateOfBirth,
  address: { line, cityVillage, district, state: "MP", pincode },
  category: "vidyalaya" | "mahavidyalaya",
  educationLevel, institutionName,
  isDivyang: boolean,
  preferredLanguage: "hi" | "en",
  consents: { rulesAcceptedAt, privacyAcceptedAt, guardian: {...} },
  createdAt, updatedAt

questions
  _id, text: { hi, en }, options: [{ id, text: { hi, en } }],
  correctOptionId,          // never sent to the client
  topic, difficulty, isActive

attempts
  _id, userId, questionIds[], startedAt, expiresAt,
  answers: [{ questionId, selectedOptionId, answeredAt }],
  status: "in_progress" | "submitted" | "auto_submitted",
  submittedAt, score, timeTakenSeconds

certificates
  _id, userId, attemptId, certificateNumber (unique),
  issuedAt, revokedAt

emailOtpChallenges
  _id, email, codeHash, purpose: "register" | "login",
  expiresAt, attemptCount, consumedAt, requestIp

sessions / accounts
  // if using Auth.js with the MongoDB adapter, these are managed for you —
  // do not hand-roll session storage alongside it
```

Store the questions actually served on the attempt (`questionIds`), so a certificate or a grievance can be reconstructed years later even if the bank changes.

---

## 14. Open questions — client decisions needed before launch

These block content, not layout. Design around placeholders, but flag them.

**14.1 — Consent for minors. Highest priority.**
Class 9 students are typically 13–14. Under India's **Digital Personal Data Protection Act, 2023**, processing a child's personal data requires **verifiable parental/guardian consent**, and tracking/behavioural advertising to children is prohibited. This scheme's primary cohort is minors, and it collects name, address, mobile, email and education details. Before launch the client must decide:
- Is date of birth collected, so minor status can be determined?
- Is a guardian's name and mobile number collected for under-18 registrants?
- What does the guardian consent statement say, and who drafted it?
- Does the privacy notice address children's data specifically?
This is a legal question for the department, not a design decision. Get it in writing.

**14.2 — Gender options versus merit categories.**
The form offers a gender dropdown. The selection rules define separate merit lists for **पुरुष / महिला / दिव्यांग** only. If a candidate selects "Other / अन्य", which merit list are they placed in? The rules do not say. The client must decide before the form ships, because the answer determines whether the third option can exist at all.

**14.3 — Closing date.**
The competition opens 29 July 2026; the award ceremony is 1 November 2026. No closing date for entries appears in any source document. The homepage, the Pratiyogita page and the rules all need it.

**14.4 — Results.**
The rules say results are published on this website. Not specified: the publication date, the format (name + district + institution?), whether a full merit list or only selected students appear, and whether there is a searchable result lookup. This determines whether `/results` is a page or a PDF link. Note that publishing minors' names, districts and institutions is itself a data-protection decision (see 14.1) — though the rules do reserve the organisers' right to use selected students' names, districts, institutions and event photography.

**14.5 — Participation certificate.**
Not mentioned in any source order. Needs written approval of: whether it is issued at all, its exact wording in both languages, the signature block and designation, whether the score appears, and whether the state emblem may be used.

**14.6 — Apparent numerical discrepancy in the source documents.**
The rules state that from **every district**, the top 50 students in each of the two categories — 100 per district — enter the shortlist. Across 55 districts that is a pool of 5,500. The scheme awards **102** scholarships (51 school + 51 college). The reading that reconciles these is that the 100-per-district figure defines the *shortlist pool* and the 102 are drawn from it by lottery — which is consistent with the lottery clause. But 51 does not divide evenly across 55 districts, so the district-level allocation is unclear. **The client must confirm the intended reading before this is described on a public page.** Do not paraphrase it on the site until they do; quote the rules as written.

**14.7 — Question bank.**
Does it exist? 30 questions per attempt with unlimited retakes needs a bank of several hundred, bilingual, vetted for factual accuracy on the 64 Kalas, 14 Vidyas and Maharishi Sandipani. This is the longest-lead-time item in the entire project and it is not a design or engineering task.

**14.8 — Contact details.**
Postal address and helpline number for `/contact`. Email is confirmed; nothing else is.

**14.9 — Accessibility accommodation.**
The rules give everyone 10 minutes and explicitly say the timer will not be extended. Does the Nyas wish to offer extra time, or any other accommodation, to candidates in the divyang category? This is a policy decision with a direct build consequence.

**14.10 — A sending domain for email. Launch blocker.**
The Nyas's official address on record is a gmail.com address. Resend cannot authenticate mail sent from gmail.com — SPF/DKIM/DMARC will fail and sign-in codes will land in spam. The Nyas needs its own domain, or a subdomain issued under mp.gov.in by the department, with DNS records configured and the domain warmed before 29 July. This has procurement and departmental lead time and nothing else in the auth flow works without it. Raise it this week.

**14.11 — Resend plan.**
The free tier caps at 100 emails per day. A state-wide launch will exhaust that within minutes of opening, after which no new candidate can register. A paid plan must be active before launch, not after the first failure. Confirm who holds the billing account — the Nyas, the department, or Swarndesh — before it is set up, because a government project running on a vendor's personal card is an awkward thing to unwind later.

**14.12 — Shared family phones. Decide before the hard block ships.**
In much of Madhya Pradesh one phone serves a whole household. Two siblings — say Class 9 and Class 11 — are both eligible, both in different categories, and both have exactly one number between them. A hard one-account-per-number rule blocks the second child from a state scholarship for owning no phone. That is a real exclusion, it will happen at volume, and it will arrive at the department as a grievance.

The asymmetry matters: blocking a genuine sibling is a letter to the Minister's office; permitting a duplicate is caught downstream at document verification, where Aadhaar and marksheet are checked anyway. The cost of being too strict is higher than the cost of being too loose.

Three options for the client:
1. **Hard block, one account per number.** Simplest. Excludes genuine siblings.
2. **Cap at 2–3 accounts per number**, each with a distinct name and date of birth, all flagged for review at shortlisting. Covers the sibling case, still stops bulk abuse.
3. **Allow duplicates, flag them.** No error at all; the shortlisting stage reviews any number appearing more than once.

**Recommendation: option 2.** If the client insists on option 1, the error copy in §7.3 must at minimum offer a route for a genuine sibling to write in and be registered manually — otherwise the site is quietly enforcing an eligibility rule the competition rules never stated.

---

## Appendix A — Districts of Madhya Pradesh (55)

**[VERIFY]** against the current Madhya Pradesh Revenue Department notification before launch. Chachaura and Nagda were approved in 2020 but are not notified as separate districts; Maihar, Pandhurna and Mauganj were created in 2023 and are included.

| # | English | हिन्दी |
|---|---|---|
| 1 | Agar Malwa | आगर मालवा |
| 2 | Alirajpur | अलीराजपुर |
| 3 | Anuppur | अनूपपुर |
| 4 | Ashoknagar | अशोकनगर |
| 5 | Balaghat | बालाघाट |
| 6 | Barwani | बड़वानी |
| 7 | Betul | बैतूल |
| 8 | Bhind | भिंड |
| 9 | Bhopal | भोपाल |
| 10 | Burhanpur | बुरहानपुर |
| 11 | Chhatarpur | छतरपुर |
| 12 | Chhindwara | छिंदवाड़ा |
| 13 | Damoh | दमोह |
| 14 | Datia | दतिया |
| 15 | Dewas | देवास |
| 16 | Dhar | धार |
| 17 | Dindori | डिंडौरी |
| 18 | Guna | गुना |
| 19 | Gwalior | ग्वालियर |
| 20 | Harda | हरदा |
| 21 | Indore | इंदौर |
| 22 | Jabalpur | जबलपुर |
| 23 | Jhabua | झाबुआ |
| 24 | Katni | कटनी |
| 25 | Khandwa | खंडवा |
| 26 | Khargone | खरगोन |
| 27 | Maihar | मैहर |
| 28 | Mandla | मंडला |
| 29 | Mandsaur | मंदसौर |
| 30 | Mauganj | मऊगंज |
| 31 | Morena | मुरैना |
| 32 | Narmadapuram | नर्मदापुरम |
| 33 | Narsinghpur | नरसिंहपुर |
| 34 | Neemuch | नीमच |
| 35 | Niwari | निवाड़ी |
| 36 | Pandhurna | पांढुर्णा |
| 37 | Panna | पन्ना |
| 38 | Raisen | रायसेन |
| 39 | Rajgarh | राजगढ़ |
| 40 | Ratlam | रतलाम |
| 41 | Rewa | रीवा |
| 42 | Sagar | सागर |
| 43 | Satna | सतना |
| 44 | Sehore | सीहोर |
| 45 | Seoni | सिवनी |
| 46 | Shahdol | शहडोल |
| 47 | Shajapur | शाजापुर |
| 48 | Sheopur | श्योपुर |
| 49 | Shivpuri | शिवपुरी |
| 50 | Sidhi | सीधी |
| 51 | Singrauli | सिंगरौली |
| 52 | Tikamgarh | टीकमगढ़ |
| 53 | Ujjain | उज्जैन |
| 54 | Umaria | उमरिया |
| 55 | Vidisha | विदिशा |

---

## Appendix B — Education level options (dependent on category)

**If category = Vidyalaya Star / विद्यालय स्तर:**

| EN | हिन्दी |
|---|---|
| Class 9 | कक्षा 9 |
| Class 10 | कक्षा 10 |
| Class 11 | कक्षा 11 |
| Class 12 | कक्षा 12 |

**If category = Mahavidyalaya Star / महाविद्यालय स्तर:**

| EN | हिन्दी |
|---|---|
| Undergraduate — 1st Year | स्नातक — प्रथम वर्ष |
| Undergraduate — 2nd Year | स्नातक — द्वितीय वर्ष |
| Undergraduate — 3rd Year | स्नातक — तृतीय वर्ष |
| Undergraduate — 4th Year | स्नातक — चतुर्थ वर्ष |
| Postgraduate — 1st Year | स्नातकोत्तर — प्रथम वर्ष |
| Postgraduate — 2nd Year | स्नातकोत्तर — द्वितीय वर्ष |
| Diploma / Polytechnic | डिप्लोमा / पॉलिटेक्निक |
| ITI | आईटीआई |
| Research / PhD | शोध / पीएच.डी. |

**[VERIFY]** this list with the client. The source rules name only "college, university, polytechnic or ITI" — the year-wise breakdown is a reasonable inference, not a quotation. Confirm whether 4-year UG and research scholars are intended to be eligible.

---

## Appendix C — The 14 Vidyas (14 विद्याएँ)

Source: परिशिष्ट-दो of the Department of Culture order dated 21 July 2026.

**Four Vedas (चार वेद):** Rigveda (ऋग्वेद) · Yajurveda (यजुर्वेद) · Samaveda (सामवेद) · Atharvaveda (अथर्ववेद)

**Six Vedangas (छह वेदांग):** Shiksha / phonetics (शिक्षा — उच्चारण विज्ञान) · Kalpa / ritual (कल्प — कर्मकांड) · Vyakarana / grammar (व्याकरण) · Nirukta / etymology (निरुक्त — शब्द व्युत्पत्ति) · Chhanda / prosody (छंद) · Jyotisha / astronomy (ज्योतिष)

**The other four (अन्य चार):** Mimamsa / philosophy (मीमांसा — दर्शन) · Nyaya / logic (न्याय — तर्कशास्त्र) · Dharmashastra / law and ethics (धर्मशास्त्र — कानून/नीति) · Purana (पुराण)

---

## Appendix D — The 64 Kalas (64 कलाएँ)

Source: परिशिष्ट-दो of the Department of Culture order dated 21 July 2026. Transcribed from a scanned page — **[VERIFY] every entry against the original before publishing.** This is the richest content on the site and the natural anchor for the Pratiyogita page.

| # | Kala | Meaning (as given in the order) |
|---|---|---|
| 1 | गीत | गायन |
| 2 | वाद्य | वाद्ययंत्र बजाना |
| 3 | नृत्यनाट्य | अभिनय |
| 4 | आलेख्य | चित्रकला |
| 5 | विशेषकच्छेद्य | तिलक व शारीरिक सजावट |
| 6 | तंडुल-कुसुमबलि-विकार | चावल और फूलों से आकृतियां बनाना |
| 7 | पुष्पास्तरण | फूलों की सेज सजाना |
| 8 | दशन-वसन-अंगराग | वस्त्र और अंगों को रंगना/सजाना |
| 9 | मणि-भूमिका-कर्म | जवाहरात जड़ना |
| 10 | शयन-रचन | बिस्तर सजाना |
| 11 | उदक-वाद्य | जल तरंग बजाना |
| 12 | उदक-घात | पानी से खेलना/छपछपाना |
| 13 | चित्र-योग | रंगों का मिश्रण |
| 14 | माल्य-ग्रथन-विकल्प | माला गूंथना |
| 15 | शेखरकापीड-योजन | सिर पर मुकुट या फूल सजाना |
| 16 | नेपथ्य-योग | वेशभूषा धारण करना |
| 17 | कर्णपत्र-भंग | कान के आभूषण बनाना |
| 18 | गंध-युक्ति | इत्र और सुगंधित पदार्थ बनाना |
| 19 | भूषण-योजन | गहने पहनना |
| 20 | ऐंद्रजाल | जादूगरी |
| 21 | कौचुमार-योग | छद्म वेश या रूप बदलना |
| 22 | हस्त-लाघव | हाथ की सफाई |
| 23 | विचित्र-शाक-यूष-भक्ष्य-विकार-क्रिया | स्वादिष्ट व्यंजन बनाना |
| 24 | पानक-राग-आसव-योजन | पेय पदार्थ और शर्बत बनाना |
| 25 | सूची-वाण-कर्म | सिलाई और बुनाई |
| 26 | सूत्र-क्रीडा | धागों का खेल |
| 27 | वीणा-डमरू-वाद्य | वीणा और डमरू बजाना |
| 28 | प्रहेलिका | पहेलियां बुझाना |
| 29 | प्रतिमाला | श्लोक या तुकबंदी बनाना |
| 30 | दुर्वाचक-योग | कठिन शब्दों के अर्थ समझना |
| 31 | पुस्तक-वाचन | ग्रंथों का वाचन |
| 32 | नाट्याख्यायिका-दर्शन | नाटक और कहानियों की रचना |
| 33 | काव्य-समस्या-पूरण | अधूरी कविता को पूरा करना |
| 34 | पत्तिका-वेत्र-वाण-विकल्प | चटाई और टोकरी बुनना |
| 35 | तर्क-कर्म | कताई और कढ़ाई |
| 36 | तक्षण-कर्म | बढ़ईगिरी / लकड़ी का काम |
| 37 | वास्तु-विद्या | भवन निर्माण और वास्तुकला |
| 38 | रूप्य-परीक्षा | चांदी और रत्नों की पहचान |
| 39 | धातु-वाद | धातुओं को पिघलाना / धातु विज्ञान |
| 40 | मणि-राग-ज्ञान | रत्नों के रंग की पहचान |
| 41 | आकर-ज्ञान | खदानों की पहचान |
| 42 | वृक्ष-आयुर्वेद-योग | पेड़-पौधों की चिकित्सा |
| 43 | मेष-कुक्कुट-लावक-युद्ध-विधि | पशु-पक्षियों के युद्ध का ज्ञान |
| 44 | शुक-सारिका-प्रलापन | तोता-मैना को बोलना सिखाना |
| 45 | उत्सादन | मालिश करना |
| 46 | केश-मार्जन-कौशल | बाल संवारना |
| 47 | अक्षर-मुष्टिका-कथन | इशारों में बात करना |
| 48 | म्लेच्छित-विकल्प | विदेशी भाषाएं सीखना |
| 49 | देश-भाषा-ज्ञान | क्षेत्रीय बोलियों का ज्ञान |
| 50 | पुष्प-शकटिका-निमित्त-ज्ञान | शकुन-अपशकुन का ज्ञान |
| 51 | यंत्र-मातृका | मशीनों का संचालन |
| 52 | धारण-मातृका | स्मरण शक्ति बढ़ाना |
| 53 | संपाठ्य | साथ मिलकर पढ़ना |
| 54 | मानसी-काव्य | मन में कविता रचना |
| 55 | क्रिया-विकल्प | दूसरों का काम पूरा करना |
| 56 | छलित-योग | छल-कपट का ज्ञान |
| 57 | अभिधान-कोश-छंदो-ज्ञान | शब्दकोश और छंदों का ज्ञान |
| 58 | वस्त्र-गोपना | वस्त्र छिपाना |
| 59 | द्यूत-विशेष | शतरंज का ज्ञान |
| 60 | आकर्ष-क्रीडा | चुंबक का खेल |
| 61 | बालक्रीडा | बच्चों के खेल |
| 62 | वैनायिकी | विनय और अनुशासन |
| 63 | वैजयिकी | विजय प्राप्त करने की कला |

**[VERIFY]** The order's list is titled "64 कलाएँ". This transcription yields 63 discrete entries; one may have been lost in the scanned page fold. Obtain a clean copy of परिशिष्ट-दो and reconcile before publishing — a government page titled "64 Kalas" listing 63 items is exactly the kind of error that gets noticed.

---

## Appendix E — Copy glossary (freeze these)

| Concept | EN | हिन्दी |
|---|---|---|
| The trust | Shri Krishna Pathey Nyas | श्रीकृष्ण पाथेय न्यास |
| The scheme | Bhagwan Shri Krishna Medhavi Chhatravritti Yojana | भगवान श्रीकृष्ण मेधावी छात्रवृत्ति योजना |
| The competition | Bhagwan Shri Krishna Medhavi Chhatravritti Pratiyogita | भगवान श्रीकृष्ण मेधावी छात्रवृत्ति प्रतियोगिता |
| The occasion | Maharishi Sandipani Guru Parv | महर्षि सांदीपनि गुरु पर्व |
| School category | Vidyalaya Star | विद्यालय स्तर |
| College category | Mahavidyalaya Star | महाविद्यालय स्तर |
| Disability category | Divyang | दिव्यांग |
| Department | Department of Culture, Government of Madhya Pradesh | संस्कृति विभाग, मध्यप्रदेश शासन |
