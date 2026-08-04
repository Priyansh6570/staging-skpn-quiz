# Copy needed from the Nyas

The date is settled and applied. What is left is the SMS code screen, which is live and still renders
partly in English on the Hindi site, and a set of field placeholders that do not exist yet.

---

# Part 1 — the date — APPLIED 4 August 2026

The competition opens **5 August 2026**. All six keys carry it, in both languages, and the four
design exports carry it too:

```
Home_v5.S.heroDate        "5 अगस्त 2026"                                        / "5 August 2026"
Home_v5.S.dates[0].when   "5 अगस्त 2026"                                        / "5 August 2026"
Home_v5.S.heroDateRange   "5 अगस्त 2026 से श्रीकृष्ण जन्माष्टमी 4 सितम्बर तक"  / "5 August 2026 to Shri Krishna Janmashtami, 4 September"
Login.S.asideKicker       "5 अगस्त 2026"                                        / "5 August 2026"
Pratiyogita.S.dates[0].when "5 अगस्त 2026"                                      / "5 August 2026"
Register.S.asideKicker    (derived from heroDateRange, same string)
```

Guru Purnima no longer appears anywhere in `lib/i18n` or in `design/`.

## One thing to confirm

**`Home_v5.S.heroDate` lost its tail.** It read "गुरु पूर्णिमा, 29 जुलाई 2026 से प्रारंभ" /
"Opens on Guru Purnima, 29 July 2026" and is now the bare date, because the bare date is what was
supplied and composing "5 अगस्त 2026 से प्रारंभ" would have meant writing Devanagari. If the hero
should still say "opens on", supply the whole line and it goes in verbatim.

**Resolved 4 August 2026:** `dates[0].what` no longer names the Guru Parv. The first timeline row on
Home and Pratiyogita now reads `प्रतियोगिता प्रारंभ · 5 अगस्त 2026` — the words copied from the
`note` beside it, which already said exactly that, so no Devanagari was written. Both pages print
the line once: where `what` and `note` are the same words, only one is rendered.

---

# Part 2 — the SMS code screen

New since the design export, so there is no source copy for any of it. It sits in the middle of both
registration and sign-in, at the one point a student cannot skip. Values live in `lib/i18n/custom.ts`
under `otp`.

## Supplied 4 August 2026 and applied

```
title        "कोड दर्ज करें"
codeLabel    "छह अंकों का कोड"
verify       "सत्यापित करें"
resend       "पुनः भेजें"
changeNumber "नंबर बदलें"
sentTo       "कोड भेजा गया"        (the number follows, rendered separately)
```

## Still English on a Hindi site — eleven strings

Every one of these is reachable in the live flow. Write the Hindi against each line. `{s}` in
`resendIn` is replaced with a number of seconds and must survive into the Hindi.

```
resendIn     "Send it again in {s}s"     shown on the resend control for 60s after every send —
                                         the most-seen of the eleven, it sits beside the two
                                         Hindi controls and reads as a fault
sending      "Sending the code"          status line while the send is in flight
verifying    "Checking the code"         status line while the code is being checked
verified     "Verified"                  (the number follows) — shown at step 1 once the code is in
wrongCode    "That code is not correct."
expired      "That code has expired. Ask for a new one."
exhausted    "Too many incorrect attempts. Ask for a new code."
sendFailed   "The code could not be sent. Please try again in a moment."
unavailable  "Codes cannot be sent at the moment. Please try again later."
quotaExceeded "Too many codes have been requested for this number. Please try again later."
verificationExpired "The verification timed out. Please request a new code."
```

One more, in `custom.ts` under `errors` rather than `otp`. It is shown at the email field when a
different account already holds that address:

```
emailTaken   "This email address is already registered to another account."
```

The English column is final and needs no review — only the Hindi is missing.

Separately, two older placeholders in the same file are still outstanding from a previous session:
`vidyaKala.searchLabel` and `hindiOnly`. `bookHeadingLabel` is gone — the label it printed
("Book heading") was removed from the page on 4 August 2026, so the string had no reader left.

---

# Part 3 — field placeholders

Asked for on 4 August 2026: every input field should carry a placeholder in the selected language.
None of these exist in the design export or in `lib/i18n`, so none were written.

## Five need Hindi and English written

All on the registration form. The label is given so the placeholder can be pitched against it.

| Field | Label (hi / en) | Notes |
| --- | --- | --- |
| `name` | पूरा नाम / Full name | step 2, full width |
| `address` | पता / Address | step 2, two-row textarea |
| `city` | शहर या गाँव / City or village | step 2 |
| `institution` | वर्तमान अध्ययनरत विद्यालय या महाविद्यालय का नाम / Name of school or college currently enrolled in | step 3 |
| `guardianName` | अभिभावक का नाम / Guardian's name | step 4, only under 18 |

## One to decide on

| Field | Label | Current placeholder |
| --- | --- | --- |
| `email` | ईमेल पता / Email address | `name@gmail.com` — a sample address, identical in both languages. Say whether it should be localised or left. |

## Three already carry one and need nothing

| Field | Current placeholder | Why it needs no translation |
| --- | --- | --- |
| `mobile` (register step 1 and sign-in) | `00000 00000` | digits only |
| `pin` | `000000` | digits only |
| picker search (district / exam) | `Register.S.searchPlaceholder` — खोजें / Search | already in `lib/i18n` |

## Not inputs

`dob`, `district`, `level` and `exam` are buttons that open a picker, not fields. Each already shows
a localised prompt in place of a value — जन्म तिथि चुनें, जिला चुनें, स्तर चुनें, परीक्षा चुनें — and
they are now inked in the same muted tone a placeholder uses, which they were not before. The six
code boxes take one character each and take no placeholder.

Outside the form: the `/vidya-kala` search field uses `custom.vidyaKala.searchLabel`, one of the
two older outstanding strings above.

---

Delete this file once every part is applied.
