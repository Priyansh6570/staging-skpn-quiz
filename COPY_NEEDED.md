# Copy needed from the Nyas

Two sets, both blocking. Part 1 is the date. Part 2 is the SMS code screen, which is live and
currently renders in English on the Hindi site.

---

# Part 1 — the date

Competition opening moves to **5 August 2026**. Guru Purnima 2026 is 29 July and does not
move; the scheme launches on Guru Purnima per the government order, the competition opens
separately on 5 August. Where the copy below ties the two together the framing has to change,
not only the number.

Six keys. Write the approved replacement into each `NEW` line, leaving the surrounding quotes
in place. Do not edit the `CURRENT` lines. Unrelated dates — Janmashtami 4 September, the
1 November ceremony — are untouched and are not listed.

---

## Home.S.heroDate

Home hero, under the title. `lib/i18n/hi.ts:618` and `lib/i18n/en.ts:618`.

```
hi CURRENT  "गुरु पूर्णिमा, 29 जुलाई 2026 से प्रारंभ"
hi NEW      ""

en CURRENT  "Opens on Guru Purnima, 29 July 2026"
en NEW      ""
```

---

## Home.DATES[0].when

Home key-dates timeline, first row. `lib/i18n/hi.ts:672` and `lib/i18n/en.ts:672`.

```
hi CURRENT  "29 जुलाई 2026"
hi NEW      ""

en CURRENT  "29 July 2026"
en NEW      ""
```

---

## Pratiyogita.S.heroDateRange

Pratiyogita hero kicker. `lib/i18n/hi.ts:689` and `lib/i18n/en.ts:689`.

```
hi CURRENT  "गुरु पूर्णिमा, 29 जुलाई से श्रीकृष्ण जन्माष्टमी 4 सितम्बर तक"
hi NEW      ""

en CURRENT  "Opens on Guru Purnima, 29 July to Shri Krishna Janmashtami, 4 September"
en NEW      ""
```

---

## Login.S.asideKicker

Login page aside. `lib/i18n/hi.ts:818` and `lib/i18n/en.ts:818`.

```
hi CURRENT  "गुरु पूर्णिमा, 29 जुलाई 2026"
hi NEW      ""

en CURRENT  "Guru Purnima, 29 July 2026"
en NEW      ""
```

---

## Pratiyogita.DATES[0].when

Pratiyogita key-dates timeline, first row. `lib/i18n/hi.ts:890` and `lib/i18n/en.ts:890`.

```
hi CURRENT  "29 जुलाई 2026"
hi NEW      ""

en CURRENT  "29 July 2026"
en NEW      ""
```

---

## Register.S.asideKicker

Register page aside. `lib/i18n/hi.ts:1393` and `lib/i18n/en.ts:1393`.

```
hi CURRENT  "गुरु पूर्णिमा, 29 जुलाई से श्रीकृष्ण जन्माष्टमी 4 सितम्बर तक"
hi NEW      ""

en CURRENT  "Opens on Guru Purnima, 29 July to Shri Krishna Janmashtami, 4 September"
en NEW      ""
```

---

## Also affected: the design sources

`tests/baseline/` is generated from the `.dc.html` design exports, and the definition of done is a
pixel match against it. Changing the copy in `lib/i18n/` alone will make Home, Login and Register
fail that comparison, so the same approved strings have to land in the exports and the baselines be
regenerated:

```
design/Home v5.dc.html   331 (hi)   370 (en)   heroDate
design/Login.dc.html     124 (hi)   142 (en)   asideKicker
design/Register.dc.html  396 (hi)   474 (en)   asideKicker
```

Two of the six keys have no design counterpart and need no export edit:
`Pratiyogita.S.heroDateRange` does not exist in `design/Pratiyogita.dc.html`, and
`Register.S.asideKicker` already differs from `design/Register.dc.html:396` — both were changed
after the export, in `1f0d59e`.

---

# Part 2 — the SMS code screen

New since the design export, so there is no source copy for any of it. It sits in the middle of
both registration and sign-in, at the one point a student cannot skip.

The values below are **English placeholders standing in for Hindi**, in `lib/i18n/custom.ts` under
`otp`. Nothing was invented in Devanagari. Until Hindi is supplied, a Hindi-reading student meets an
English screen to get into the competition.

Write the Hindi against each line. `{s}` in `resendIn` is replaced with a number of seconds and must
survive into the Hindi.

```
title        "Enter the code"
codeLabel    "Six-digit code"
verify       "Verify"
resend       "Send it again"
resendIn     "Send it again in {s}s"
changeNumber "Change number"
wrongCode    "That code is not correct."
expired      "That code has expired. Ask for a new one."
exhausted    "Too many incorrect attempts. Ask for a new code."
sendFailed   "The code could not be sent. Please try again in a moment."
unavailable  "Codes cannot be sent at the moment. Please try again later."
quotaExceeded "Too many codes have been requested for this number. Please try again later."
verificationExpired "The verification timed out. Please request a new code."
sending      "Sending the code"
verifying    "Checking the code"
sentTo       "Code sent to"                                  (the number follows, rendered separately)
verified     "Verified"                                      (the number follows, rendered separately)
```

One more, in `custom.ts` under `errors` rather than `otp`. It is shown at the email field when a
different account already holds that address — a refusal the form could not previously tell apart
from a duplicate mobile number:

```
emailTaken   "This email address is already registered to another account."
```

The English column is final and needs no review — only the Hindi is missing.

Separately, four older placeholders in the same file are still outstanding from a previous session:
`vidyaKala.searchLabel`, `hindiOnly`, `bookHeadingLabel`, and the `TODO(hi)` on them.

---

Delete this file once both parts are applied.
