"use client";

import Link from "next/link";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLang, useSession, useShell } from "@/components/AppProviders";
import { custom, strings, en } from "@/lib/i18n";
import { CATEGORY_KEYS, GENDER_KEYS } from "@/lib/registration";
import { codeFromResponse } from "@/lib/errors";

const ITEM = 44;
const TODAY = Date.now();
const YEARS = Array.from({ length: 2013 - 1900 + 1 }, (_, i) => 1900 + i);
const daysInMonth = (m: number, y: number) =>
  [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

const wheelStyle = (d: number) => {
  const a = Math.abs(d);
  if (a === 0) return { size: "26px", weight: "600", ink: "#14203E", op: "1" };
  if (a === 1) return { size: "20px", weight: "400", ink: "#161C2E", op: ".9" };
  if (a === 2) return { size: "18px", weight: "400", ink: "#161C2E", op: ".6" };
  return { size: "16px", weight: "400", ink: "#161C2E", op: ".38" };
};

const windowRows = (center: number, count: number, labelAt: (i: number) => string, pickAt: (i: number) => void) => {
  const rows = [];
  for (let d = -3; d <= 3; d++) {
    const i = center + d;
    const inRange = i >= 0 && i < count;
    rows.push({
      label: inRange ? labelAt(i) : "",
      pick: inRange ? () => pickAt(i) : () => {},
      ...(inRange ? wheelStyle(d) : { size: "16px", weight: "400", ink: "#161C2E", op: "0" }),
    });
  }
  return rows;
};

type CategoryKey = (typeof CATEGORY_KEYS)[number];

export default function RegisterPage() {
  const router = useRouter();
  const { lang, toggle: toggleLang } = useLang();
  const { session, refresh } = useSession();
  const { showError, showMessage } = useShell();
  const t = strings(lang).Register.S;
  const c = custom(lang).register;
  const DISTRICTS = strings(lang).Register.DISTRICTS;
  const LEVELS = strings(lang).Register.LEVELS;
  const MONTHS = strings(lang).Register.MONTHS;
  // Item 13: the client narrowed the list to these four.
  const EXAMS = custom(lang).pratiyogita.examNames;

  const [step, setStep] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [form, setForm] = useState({
    email: "", name: "", mobile: "", gender: "", address: "", city: "", pin: "",
    district: "", category: "" as "" | CategoryKey, level: "", institution: "",
    divyang: false, exam: "", guardianName: "",
  });
  const [mobileTouched, setMobileTouched] = useState(false);
  const [mobileTaken, setMobileTaken] = useState(false);
  const [dob, setDob] = useState({ y: 0, m: 0, d: 0 });
  const [pick, setPick] = useState({ y: 2005, m: 6, d: 15 });
  const [dobOpen, setDobOpen] = useState(false);
  const [picker, setPicker] = useState("");
  const [pickerQuery, setPickerQuery] = useState("");
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const scrollYRef = useRef(0);
  const accRef = useRef(0);
  const dragRef = useRef<{ y: number | null; i: number }>({ y: null, i: 0 });

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rot = setInterval(() => setSlideIndex((s) => s + 1), 2000);
    return () => clearInterval(rot);
  }, []);

  const lockScroll = (on: boolean) => {
    const b = document.body;
    if (on) {
      scrollYRef.current = window.scrollY;
      Object.assign(b.style, { position: "fixed", top: `${-scrollYRef.current}px`, left: "0", right: "0", overflow: "hidden" });
    } else {
      Object.assign(b.style, { position: "", top: "", left: "", right: "", overflow: "" });
      window.scrollTo(0, scrollYRef.current);
    }
  };

  // The export had no Escape handler on these modals, so a student who opened the district picker
  // and pressed Escape was stuck with a locked page.
  useEffect(() => {
    if (!picker && !dobOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      lockScroll(false);
      setPicker("");
      setDobOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [picker, dobOpen]);

  const emailProblem = () => {
    const v = form.email.trim();
    if (!v) return "";
    if (/(gmial\.com|gmail\.con|gmail\.co$|yahoo\.co$)/i.test(v)) return "typo";
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v)) return "invalid";
    return "";
  };
  const mobileProblem = () => {
    if (!form.mobile) return "";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return "invalid";
    if (mobileTaken) return "duplicate";
    return "";
  };

  // A date is valid only if the whole value is, not if some flag says it was touched. dob starts
  // at {0,0,0}, and the picker's defaults are only committed by Confirm.
  const dobValid =
    dob.y > 0 && dob.m >= 1 && dob.m <= 12 && dob.d >= 1 && dob.d <= daysInMonth(dob.m, dob.y);

  /** The labels of everything the current step still needs, in the reader's language. */
  const missingFields = (): string[] => {
    if (step === 0) {
      return mobileProblem() || form.mobile.length !== 10 ? [t.mobileLabel] : [];
    }
    if (step === 1) {
      const missing: string[] = [];
      if (form.name.trim().length < 3) missing.push(t.nameLabel);
      if (emailProblem()) missing.push(t.emailLabel);
      if (!form.gender) missing.push(t.genderLabel);
      if (!dobValid) missing.push(t.dobLabel);
      if (form.address.trim().length < 5) missing.push(t.addressLabel);
      if (form.city.trim().length < 2) missing.push(t.cityLabel);
      if (!/^\d{6}$/.test(form.pin)) missing.push(t.pinLabel);
      if (!form.district) missing.push(t.districtLabel);
      return missing;
    }
    if (step === 2) {
      const missing: string[] = [];
      if (!form.category) missing.push(t.categoryLabel);
      if (!form.level) missing.push(t.levelLabel);
      if (form.institution.trim().length < 3) missing.push(t.institutionLabel);
      return missing;
    }
    const missing: string[] = [];
    if (!rulesAccepted || !privacyAccepted) missing.push(t.rulesLink);
    if (needsGuardian && form.guardianName.trim().length < 3) missing.push(t.guardianName);
    return missing;
  };

  const canAdvance = () => missingFields().length === 0;

  // Item 15: derived from the date itself, so editing the date re-evaluates it immediately.
  const ageYears = dobValid
    ? Math.floor((TODAY - Date.UTC(dob.y, dob.m - 1, dob.d)) / (365.2425 * 86_400_000))
    : null;
  const needsGuardian = ageYears !== null && ageYears < 18;

  const ep = emailProblem();
  const mp = mobileProblem();
  const dimPick = daysInMonth(pick.m, pick.y);
  const si = slideIndex % t.slides.length;
  const ok = canAdvance();
  const mobileMsg = mobileTouched && mp === "invalid" ? t.mobileInvalid : (mobileTouched && mp === "duplicate" ? t.mobileDuplicate : "");
  const districtRow = DISTRICTS.find((_, i) => en.Register.DISTRICTS[i][0] === form.district);

  const wheelStep = (e: React.WheelEvent, key: "y" | "m" | "d", count: number, toValue: (i: number) => number, current: number) => {
    accRef.current += e.deltaY;
    if (Math.abs(accRef.current / 40) < 1) return;
    const dir = accRef.current > 0 ? 1 : -1;
    accRef.current = 0;
    setPick((p) => ({ ...p, [key]: toValue(Math.max(0, Math.min(count - 1, current + dir))) }));
  };
  const dragStart = (e: React.TouchEvent | React.MouseEvent, current: number) => {
    const p = "touches" in e ? e.touches[0] : e;
    dragRef.current = { y: p.clientY, i: current };
  };
  const dragMove = (e: React.TouchEvent | React.MouseEvent, key: "y" | "m" | "d", count: number, toValue: (i: number) => number) => {
    if (dragRef.current.y == null) return;
    const p = "touches" in e ? e.touches[0] : e;
    const delta = Math.round((dragRef.current.y - p.clientY) / ITEM);
    setPick((prev) => ({ ...prev, [key]: toValue(Math.max(0, Math.min(count - 1, dragRef.current.i + delta))) }));
  };

  const pickerOptions = (() => {
    if (picker === "district") {
      return DISTRICTS.map((d, i) => ({
        value: en.Register.DISTRICTS[i][0],
        label: lang === "hi" ? d[1] : d[0],
        on: form.district === en.Register.DISTRICTS[i][0],
      }));
    }
    if (picker === "level" && form.category) {
      const key = form.category;
      return LEVELS[key].map((l, i) => ({ value: en.Register.LEVELS[key][i], label: l, on: form.level === en.Register.LEVELS[key][i] }));
    }
    if (picker === "exam") {
      return [...EXAMS, t.examOther, t.examNone].map((x) => ({ value: x, label: x, on: form.exam === x }));
    }
    return [];
  })();

  const pq = pickerQuery.trim().toLowerCase();
  const options = pickerOptions.filter((o) => !pq || o.label.toLowerCase().includes(pq) || o.value.toLowerCase().includes(pq));

  const choose = (value: string) => {
    lockScroll(false);
    set(picker === "district" ? "district" : picker === "level" ? "level" : "exam", value);
    setPicker("");
    setPickerQuery("");
  };

  const submit = async () => {
    setSubmitting(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mobile: form.mobile,
        email: form.email.trim(),
        fullName: form.name.trim(),
        gender: GENDER_KEYS[t.genders.indexOf(form.gender)] ?? "other",
        dateOfBirth: `${dob.y}-${String(dob.m).padStart(2, "0")}-${String(dob.d).padStart(2, "0")}`,
        address: { line: form.address.trim(), cityVillage: form.city.trim(), district: form.district, pincode: form.pin },
        category: form.category,
        educationLevel: form.level,
        institutionName: form.institution.trim(),
        competitiveExam: form.exam || null,
        isDivyang: form.divyang,
        guardianName: needsGuardian ? form.guardianName.trim() : "",
        rulesAccepted: true,
        privacyAccepted: true,
      }),
    }).catch(() => null);

    if (!res || !res.ok) {
      setSubmitting(false);
      showError(res ? codeFromResponse(res.status, await res.json().catch(() => null)) : "network");
      return;
    }
    setSubmitted(true);
    await refresh();
    router.push("/quiz/rules");
  };

  const steps = t.stepLabels.map((label, i) => ({
    n: String(i + 1), label,
    bg: i === step ? "#14203E" : i < step ? "#F4EBD8" : "#FFFFFF",
    fg: i === step ? "#FDF3DF" : i < step ? "#7A5412" : "#161C2E",
    border: i === step ? "#14203E" : "#DCD1BC",
    labelFg: i === step ? "#14203E" : "#161C2E",
    sepDisplay: i === t.stepLabels.length - 1 ? "none" : "block",
  }));
  const stepCounter = `${t.stepOf} ${step + 1} ${t.of} 4 · ${t.stepTitles[step]}`;
  const isIdentity = step === 0, isStudent = step === 1, isEducation = step === 2, isDeclare = step === 3;
  const slide = t.slides[si];
  const slideAnim = slideIndex % 2 === 0 ? "rg-inA" : "rg-inB";
  const dots = t.slides.map((_, n) => ({ w: n === si ? "22px" : "8px", bg: n === si ? "#E8C173" : "rgba(232,193,115,.32)" }));

  const email = form.email;
  const onEmail = (e: React.FormEvent<HTMLInputElement>) => set("email", e.currentTarget.value);
  const emailBorder = ep ? "#A03A2B" : "#DCD1BC";
  const emailMsg = ep === "typo" ? t.emailTypo : ep === "invalid" ? t.emailInvalid : "";
  const emailMsgDisplay = ep ? "block" : "none";
  const name = form.name;
  const onName = (e: React.FormEvent<HTMLInputElement>) => set("name", e.currentTarget.value);
  const mobile = form.mobile;
  const onMobile = (e: React.FormEvent<HTMLInputElement>) => { set("mobile", e.currentTarget.value.replace(/\D/g, "").slice(0, 10)); setMobileTaken(false); };
  const onMobileBlur = async () => {
    setMobileTouched(true);
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return;
    const res = await fetch("/api/register/check-mobile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mobile: form.mobile }),
    });
    if (res.ok) setMobileTaken(!(await res.json()).available);
  };
  const mobileBorder = mobileMsg ? "#A03A2B" : "#DCD1BC";
  const mobileMsgDisplay = mobileMsg ? "block" : "none";

  const dobDisplay = dob.y ? `${dob.d} ${MONTHS[dob.m - 1]} ${dob.y}` : t.dobPlaceholder;
  const dobInk = "#161C2E";
  const openDob = () => { lockScroll(true); setPick({ y: dob.y || 2005, m: dob.m || 6, d: dob.d || 15 }); setDobOpen(true); };
  const closeDob = () => { lockScroll(false); setDobOpen(false); };
  const confirmDob = () => {
    lockScroll(false);
    setDobOpen(false);
    const chosen = { y: pick.y, m: pick.m, d: Math.min(pick.d, daysInMonth(pick.m, pick.y)) };
    setDob(chosen);
    // A new date can take the student over 18, and a guardian name must not survive that.
    const age = Math.floor((TODAY - Date.UTC(chosen.y, chosen.m - 1, chosen.d)) / (365.2425 * 86_400_000));
    if (age >= 18) setForm((f) => ({ ...f, guardianName: "" }));
  };
  const dobModalDisplay = dobOpen ? "flex" : "none";
  const blockScroll = (e: React.SyntheticEvent) => { if (e.cancelable) e.preventDefault(); };
  const onYearWheel = (e: React.WheelEvent) => wheelStep(e, "y", YEARS.length, (i) => YEARS[i], YEARS.indexOf(pick.y));
  const onMonthWheel = (e: React.WheelEvent) => wheelStep(e, "m", 12, (i) => i + 1, pick.m - 1);
  const onDayWheel = (e: React.WheelEvent) => wheelStep(e, "d", dimPick, (i) => i + 1, Math.min(pick.d, dimPick) - 1);
  const onYearDown = (e: React.TouchEvent | React.MouseEvent) => dragStart(e, YEARS.indexOf(pick.y));
  const onMonthDown = (e: React.TouchEvent | React.MouseEvent) => dragStart(e, pick.m - 1);
  const onDayDown = (e: React.TouchEvent | React.MouseEvent) => dragStart(e, Math.min(pick.d, dimPick) - 1);
  const onYearMove = (e: React.TouchEvent | React.MouseEvent) => dragMove(e, "y", YEARS.length, (i) => YEARS[i]);
  const onMonthMove = (e: React.TouchEvent | React.MouseEvent) => dragMove(e, "m", 12, (i) => i + 1);
  const onDayMove = (e: React.TouchEvent | React.MouseEvent) => dragMove(e, "d", dimPick, (i) => i + 1);
  const yearItems = windowRows(YEARS.indexOf(pick.y), YEARS.length, (i) => String(YEARS[i]), (i) => setPick((p) => ({ ...p, y: YEARS[i] })));
  const monthItems = windowRows(pick.m - 1, 12, (i) => MONTHS[i], (i) => setPick((p) => ({ ...p, m: i + 1 })));
  const dayItems = windowRows(Math.min(pick.d, dimPick) - 1, dimPick, (i) => String(i + 1), (i) => setPick((p) => ({ ...p, d: i + 1 })));

  const genders = t.genders.map((g) => ({
    label: g, on: form.gender === g,
    select: () => set("gender", g),
    bg: form.gender === g ? "#14203E" : "#FCFAF4",
    fg: form.gender === g ? "#FFF9EC" : "#161C2E",
    border: form.gender === g ? "#14203E" : "#DCD1BC",
  }));

  const districtDisplay = districtRow ? (lang === "hi" ? districtRow[1] : districtRow[0]) : t.districtPlaceholder;
  const districtInk = form.district ? "#161C2E" : "#7A6B4E";
  const openPicker = (kind: string) => { lockScroll(true); setPicker(kind); setPickerQuery(""); };
  const openDistrict = () => openPicker("district");
  const levelIndex = form.category ? en.Register.LEVELS[form.category].indexOf(form.level) : -1;
  const levelDisplay = form.category && levelIndex >= 0 ? LEVELS[form.category][levelIndex] : t.levelPlaceholder;
  const levelInk = form.level ? "#161C2E" : "#7A6B4E";
  const openLevel = () => openPicker("level");
  // Item 13: only school-level entrants are asked about entrance exams.
  const showExam = form.category === "vidyalaya";
  const examDisplay = form.exam || t.examPlaceholder;
  const examInk = form.exam ? "#161C2E" : "#7A6B4E";
  const openExam = () => openPicker("exam");
  const pickerDisplay = picker ? "flex" : "none";
  const pickerTitle = picker === "district" ? t.districtModalTitle : picker === "level" ? t.levelModalTitle : t.examModalTitle;
  const pickerSearchDisplay = picker === "level" ? "none" : "block";
  const onPickerQuery = (e: React.FormEvent<HTMLInputElement>) => setPickerQuery(e.currentTarget.value);
  const closePicker = () => { lockScroll(false); setPicker(""); setPickerQuery(""); };
  const pickerEmptyDisplay = picker && options.length === 0 ? "block" : "none";
  const pickerItems = options.map((o) => ({
    label: o.label, on: o.on, tick: o.on ? "inline" : "none",
    bg: o.on ? "#F4EBD8" : "transparent",
    fg: o.on ? "#14203E" : "#161C2E",
    select: () => choose(o.value),
  }));

  const submitDisplay = submitting ? "flex" : "none";
  const spinnerDisplay = submitted ? "none" : "block";
  const successDisplay = submitted ? "flex" : "none";
  const submitTitle = submitted ? t.submitDoneTitle : t.submitWorkTitle;
  const submitBody = submitted ? t.submitDoneBody : t.submitWorkBody;

  const address = form.address;
  const onAddress = (e: React.FormEvent<HTMLTextAreaElement>) => set("address", e.currentTarget.value);
  const city = form.city;
  const onCity = (e: React.FormEvent<HTMLInputElement>) => set("city", e.currentTarget.value);
  const pin = form.pin;
  const onPin = (e: React.FormEvent<HTMLInputElement>) => set("pin", e.currentTarget.value.replace(/\D/g, "").slice(0, 6));

  const categories = t.categories.map((c, i) => ({
    name: c.name, who: c.who, on: form.category === CATEGORY_KEYS[i],
    // Changing category clears the level and the exam, which only applies to vidyalaya.
    select: () => setForm((f) => ({ ...f, category: CATEGORY_KEYS[i], level: "", exam: "" })),
    bg: form.category === CATEGORY_KEYS[i] ? "#F7F2E6" : "#FCFAF4",
    border: form.category === CATEGORY_KEYS[i] ? "#14203E" : "#DCD1BC",
    radioBorder: form.category === CATEGORY_KEYS[i] ? "#14203E" : "#B6BCC9",
    radioDot: form.category === CATEGORY_KEYS[i] ? "#14203E" : "transparent",
  }));
  const institution = form.institution;
  const onInstitution = (e: React.FormEvent<HTMLInputElement>) => set("institution", e.currentTarget.value);
  const divyang = form.divyang;
  const toggleDivyang = () => set("divyang", !form.divyang);
  const divyangBorder = divyang ? "#14203E" : "#DCD1BC";
  const divyangBg = divyang ? "#F7F2E6" : "#FCFAF4";
  const divyangNoticeDisplay = divyang ? "block" : "none";

  // One checkbox now stands for both, so they flip together.
  const toggleBothConsents = () => {
    const next = !(rulesAccepted && privacyAccepted);
    setRulesAccepted(next);
    setPrivacyAccepted(next);
  };
  const toggleRules = () => setRulesAccepted((v) => !v);
  const rulesBorder = rulesAccepted ? "#14203E" : "#DCD1BC";
  const rulesBg = rulesAccepted ? "#F7F2E6" : "#FCFAF4";
  const togglePrivacy = () => setPrivacyAccepted((v) => !v);
  const privacyBorder = privacyAccepted ? "#14203E" : "#DCD1BC";
  const privacyBg = privacyAccepted ? "#F7F2E6" : "#FCFAF4";
  const guardianName = form.guardianName;
  const onGuardianName = (e: React.FormEvent<HTMLInputElement>) => set("guardianName", e.currentTarget.value);

  const prevDisplay = step === 0 ? "none" : "inline-flex";
  const prev = () => setStep((p) => Math.max(0, p - 1));
  const next = () => {
    const missing = missingFields();
    if (missing.length) {
      showMessage(missing.join(", "));
      return;
    }
    if (step === 3) { void submit(); return; }
    setStep((p) => p + 1);
  };
  const nextLabel = step === 3 ? t.finish : t.next;
  const nextBg = ok ? "#14203E" : "#EDE6D7";
  const nextFg = ok ? "#FDF3DF" : "#161C2E";
  const nextEvents = ok ? "auto" : "none";
  const nextCursor = ok ? "pointer" : "not-allowed";
  const signedIn = session.signedIn;
  const hasCerts = session.hasCertificates;
  return (
    <div data-page="Register" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "hidden" }}>
      <SiteHeader lang={lang} active="pratiyogita" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />

      <section data-e="pad" style={{ maxWidth: "1180px", margin: "0 auto", padding: "40px 30px 76px" }}>
        <div data-e="split" style={{ display: "grid", gridTemplateColumns: "minmax(0,.8fr) minmax(0,1.2fr)", borderRadius: "26px", overflow: "hidden", boxShadow: "0 2px 6px rgba(20,32,62,.06),0 22px 52px rgba(20,32,62,.14)", alignItems: "stretch" }}>

          <aside data-e="aside" style={{ position: "relative", overflow: "hidden", background: "#070B1E", minHeight: "560px", padding: "36px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <Image src="/assets/pathey.png" alt="" width={2560} height={1440} sizes="100vw" loading="eager" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 34%", opacity: ".46" }} />
            <div aria-hidden="true" style={{ position: "absolute", inset: "0", background: "linear-gradient(170deg, rgba(7,11,30,.5) 0%, rgba(7,11,30,.87) 52%, rgba(5,8,22,.97) 100%)" }}></div>
            <div aria-hidden="true" style={{ position: "absolute", left: "-12%", top: "-14%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.22) 0%,rgba(232,193,115,0) 70%)", animation: "rg-glow 9s ease-in-out infinite" }}></div>

            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ width: "46px", height: "46px", flex: "0 0 auto", borderRadius: "50%", background: "#04060F", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px rgba(232,193,115,.4)" }}>
                <img src="/uploads/skpn-logo.png" alt="" width="34" height="34" style={{ display: "block", width: "34px", height: "34px" }} />
              </span>
              <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontSize: "15.5px", lineHeight: "1.45", color: "#FFF9EC" }}>{t.asideOrg}</span>
            </div>

            <div data-e="asidebody" style={{ position: "relative", marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "16.5px", letterSpacing: ".01em", color: "#E8C173", lineHeight: "1.9" }}>{t.asideKicker}</p>
              <h2 style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(23px,2.5vw,30px)", lineHeight: "1.32", color: "#FFF9EC", textWrap: "balance" }}>{t.asideTitle}</h2>
            </div>

            <div style={{ position: "relative", paddingTop: "20px", borderTop: "1px solid rgba(232,193,115,.24)", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div data-e="asideslide" style={{ minHeight: "64px", display: "flex", flexDirection: "column", gap: "5px", animation: `${slideAnim} .45s cubic-bezier(.22,.61,.36,1)` }}>
                <span data-e="slidevalue" style={{ fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "26px", lineHeight: "1.25", color: "#E8C173", whiteSpace: "nowrap" }}>{slide.value}</span>
                <span style={{ fontSize: "15.5px", lineHeight: "1.7", color: "#E9E4D8" }}>{slide.label}</span>
              </div>
              <div aria-hidden="true" style={{ display: "flex", gap: "6px" }}>
                {dots.map((d, dIndex) => (
                  <span key={dIndex} style={{ width: `${d.w}`, height: "4px", borderRadius: "2px", background: `${d.bg}`, transition: "width .3s ease,background .3s ease" }}></span>
                ))}
              </div>
            </div>
          </aside>

          <div data-e="form" style={{ padding: "36px 34px 40px", background: "#FFFFFF", display: "flex", flexDirection: "column" }}>
            <h1 style={{ margin: "0 0 20px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(25px,3.2vw,33px)", lineHeight: "1.3", color: "#14203E" }}>{t.title}</h1>

            <ol data-e="steps" style={{ margin: "0 0 8px", padding: "0", listStyle: "none", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", minWidth: "0" }}>
              {steps.map((s, sIndex) => (
                <li key={sIndex} style={{ display: "flex", alignItems: "center", gap: "10px", flex: "0 1 auto" }}>
                  <span style={{ width: "32px", height: "32px", flex: "0 0 auto", borderRadius: "50%", background: `${s.bg}`, color: `${s.fg}`, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: "600" }}>{s.n}</span>
                  <span data-e="steplabel" style={{ fontSize: "15.5px", lineHeight: "1.6", color: `${s.labelFg}`, whiteSpace: "nowrap" }}>{s.label}</span>
                  <span aria-hidden="true" style={{ width: "18px", height: "1px", background: "#DCD1BC", display: `${s.sepDisplay}` }}></span>
                </li>
              ))}
            </ol>
            <p style={{ margin: "0 0 26px", fontSize: "15px", lineHeight: "1.7", color: "#161C2E" }}>{stepCounter}</p>

            {isIdentity ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.mobileLabel}</span>
                  <span style={{ display: "flex", alignItems: "stretch", border: `1px solid ${mobileBorder}`, borderRadius: "14px", background: "#FCFAF4", overflow: "hidden" }}>
                    <span aria-hidden="true" style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: "8px", padding: "0 13px", background: "#F1E9DA", borderRight: "1px solid #E3D9C6" }}>
                      <svg viewBox="0 0 30 20" width="26" height="18" aria-hidden="true" focusable="false" style={{ display: "block", borderRadius: "3px", boxShadow: "0 0 0 1px rgba(20,32,62,.14)" }}>
                        <rect width="30" height="20" fill="#FFFFFF"></rect>
                        <rect width="30" height="6.667" fill="#FF9933"></rect>
                        <rect y="13.333" width="30" height="6.667" fill="#138808"></rect>
                        <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.7"></circle>
                        <circle cx="15" cy="10" r="0.6" fill="#000080"></circle>
                      </svg>
                      <span style={{ fontSize: "16.5px", lineHeight: "1.6", color: "#161C2E", fontVariantNumeric: "tabular-nums" }}>+91</span>
                    </span>
                    <input type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} value={mobile} onInput={onMobile} onBlur={onMobileBlur} placeholder="00000 00000" style={{ flex: "1 1 auto", minWidth: "0", minHeight: "58px", padding: "14px 16px", border: "0", background: "transparent", fontSize: "19px", letterSpacing: ".04em", lineHeight: "1.6", color: "#161C2E", fontVariantNumeric: "tabular-nums" }} />
                  </span>
                  <span style={{ fontSize: "15px", lineHeight: "1.7", color: "#A03A2B", display: `${mobileMsgDisplay}` }}>{mobileMsg}</span>
                </label>
                <p style={{ margin: "0", fontSize: "15.5px", lineHeight: "1.8", color: "#161C2E" }}>{t.mobileHelp}</p>
              </div>
            ) : null}

            {isStudent ? (
              <div data-g="two" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "18px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "7px", gridColumn: "1 / -1" }}>
                  <span style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.nameLabel}</span>
                  <input type="text" maxLength={100} value={name} onInput={onName} style={{ minHeight: "54px", padding: "14px 16px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FCFAF4", fontSize: "17px", lineHeight: "1.6", color: "#161C2E" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.emailLabel} <span style={{ padding: "3px 11px", borderRadius: "999px", background: "#F1E9DA", border: "1px solid #E3D9C6", fontSize: "14.5px", lineHeight: "1.6", color: "#161C2E" }}>{t.optional}</span></span>
                  <input type="email" inputMode="email" autoComplete="email" value={email} onInput={onEmail} placeholder="name@gmail.com" style={{ minHeight: "54px", padding: "14px 16px", border: `1px solid ${emailBorder}`, borderRadius: "14px", background: "#FCFAF4", fontSize: "17px", lineHeight: "1.6", color: "#161C2E" }} />
                  <span style={{ fontSize: "15px", lineHeight: "1.7", color: "#A03A2B", display: `${emailMsgDisplay}` }}>{emailMsg}</span>
                </label>
                <div style={{ minWidth: "0", display: "flex", flexDirection: "column", gap: "7px" }}>
                  <span style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.dobLabel}</span>
                  <button type="button" onClick={openDob} style={{ minHeight: "54px", padding: "14px 16px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FCFAF4", fontSize: "17px", lineHeight: "1.6", color: `${dobInk}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <span>{dobDisplay}</span>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8A6015" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}><rect x="3.3" y="4.8" width="17.4" height="15.9" rx="3"></rect><path d="M3.3 9.6h17.4M8 3.3v3M16 3.3v3"></path></svg>
                  </button>
                </div>
                <fieldset style={{ gridColumn: "1 / -1", margin: "0", padding: "0", border: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <legend style={{ padding: "0", fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.genderLabel}</legend>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {genders.map((g, gIndex) => (
                      <button key={gIndex} type="button" onClick={g.select} aria-pressed={g.on} style={{ minHeight: "48px", padding: "12px 22px", border: `1px solid ${g.border}`, borderRadius: "999px", background: `${g.bg}`, color: `${g.fg}`, cursor: "pointer", fontSize: "16.5px", lineHeight: "1.6" }}>{g.label}</button>
                    ))}
                  </div>
                </fieldset>

                <span aria-hidden="true" style={{ gridColumn: "1 / -1", height: "1px", marginTop: "6px", background: "#EFE5D3" }}></span>

                <label style={{ display: "flex", flexDirection: "column", gap: "7px", gridColumn: "1 / -1" }}>
                  <span style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.addressLabel}</span>
                  <textarea rows={2} value={address} onInput={onAddress} style={{ padding: "14px 16px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FCFAF4", fontSize: "17px", lineHeight: "1.7", color: "#161C2E", resize: "vertical" }}></textarea>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  <span style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.cityLabel}</span>
                  <input type="text" value={city} onInput={onCity} style={{ minHeight: "54px", padding: "14px 16px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FCFAF4", fontSize: "17px", lineHeight: "1.6", color: "#161C2E" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  <span style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.pinLabel}</span>
                  <input type="text" inputMode="numeric" maxLength={6} value={pin} onInput={onPin} placeholder="000000" style={{ minHeight: "54px", padding: "14px 16px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FCFAF4", fontSize: "17px", lineHeight: "1.6", color: "#161C2E", fontVariantNumeric: "tabular-nums" }} />
                </label>
                <div style={{ minWidth: "0", display: "flex", flexDirection: "column", gap: "7px" }}>
                  <span style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.districtLabel}</span>
                  <button type="button" onClick={openDistrict} style={{ minHeight: "54px", padding: "14px 16px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FCFAF4", fontSize: "17px", lineHeight: "1.6", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", color: `${districtInk}` }}>
                    <span>{districtDisplay}</span>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8A6015" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}><path d="M6 9.5 12 15.5l6-6"></path></svg>
                  </button>
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  <span style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.stateLabel}</span>
                  <input type="text" value={t.stateValue} disabled={true} style={{ minHeight: "54px", padding: "14px 16px", border: "1px solid #E8DFCE", borderRadius: "14px", background: "#F2ECE0", fontSize: "17px", lineHeight: "1.6", color: "#161C2E" }} />
                </label>
              </div>
            ) : null}

            {isEducation ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <fieldset style={{ margin: "0", padding: "0", border: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <legend style={{ padding: "0 0 2px", fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.categoryLabel}</legend>
                  <div data-g="two" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "14px" }}>
                    {categories.map((c, cIndex) => (
                      <button key={cIndex} type="button" onClick={c.select} aria-pressed={c.on} style={{ textAlign: "left", padding: "20px", border: `1.5px solid ${c.border}`, borderRadius: "18px", background: `${c.bg}`, cursor: "pointer", display: "flex", gap: "14px", alignItems: "flex-start", minHeight: "104px", transition: "border-color .16s ease,background .16s ease" }}>
                        <span aria-hidden="true" style={{ marginTop: "2px", width: "24px", height: "24px", flex: "0 0 auto", borderRadius: "50%", border: `2px solid ${c.radioBorder}`, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: `${c.radioDot}` }}></span>
                        </span>
                        <span style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "20px", lineHeight: "1.4", color: "#14203E" }}>{c.name}</span>
                          <span style={{ fontSize: "16px", lineHeight: "1.7", color: "#161C2E" }}>{c.who}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div style={{ minWidth: "0", display: "flex", flexDirection: "column", gap: "7px" }}>
                  <span style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.levelLabel}</span>
                  <button type="button" onClick={openLevel} style={{ minHeight: "54px", padding: "14px 16px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FCFAF4", fontSize: "17px", lineHeight: "1.6", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", color: `${levelInk}` }}>
                    <span>{levelDisplay}</span>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8A6015" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}><path d="M6 9.5 12 15.5l6-6"></path></svg>
                  </button>
                </div>
                {showExam ? (
                <div style={{ minWidth: "0", display: "flex", flexDirection: "column", gap: "7px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.examLabel} <span style={{ padding: "3px 11px", borderRadius: "999px", background: "#F1E9DA", border: "1px solid #E3D9C6", fontSize: "14.5px", lineHeight: "1.6", color: "#161C2E" }}>{t.optional}</span></span>
                  <button type="button" onClick={openExam} style={{ minHeight: "54px", padding: "14px 16px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FCFAF4", fontSize: "17px", lineHeight: "1.6", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", color: `${examInk}` }}>
                    <span>{examDisplay}</span>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8A6015" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}><path d="M6 9.5 12 15.5l6-6"></path></svg>
                  </button>
                </div>
                ) : null}
                <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  <span style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.institutionLabel}</span>
                  <input type="text" value={institution} onInput={onInstitution} style={{ minHeight: "54px", padding: "14px 16px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FCFAF4", fontSize: "17px", lineHeight: "1.6", color: "#161C2E" }} />
                </label>
                <label style={{ display: "flex", gap: "14px", alignItems: "flex-start", cursor: "pointer", padding: "16px 18px", border: `1px solid ${divyangBorder}`, borderRadius: "14px", background: `${divyangBg}`, transition: "border-color .16s ease,background .16s ease" }}>
                  <input type="checkbox" checked={divyang} onChange={toggleDivyang} style={{ marginTop: "3px", width: "22px", height: "22px", flex: "0 0 auto", accentColor: "#14203E", cursor: "pointer" }} />
                  <span style={{ fontSize: "16.5px", lineHeight: "1.8", color: "#161C2E" }}>{t.divyangLabel}</span>
                </label>
                <p style={{ margin: "0", display: `${divyangNoticeDisplay}`, padding: "18px 22px", borderLeft: "3px solid #8A6015", borderRadius: "0 14px 14px 0", background: "#F4EBD8", fontSize: "16.5px", lineHeight: "1.8", color: "#161C2E" }}>{t.divyangNotice}</p>
              </div>
            ) : null}

            {isDeclare ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <label style={{ display: "flex", gap: "14px", alignItems: "flex-start", cursor: "pointer", padding: "16px 18px", borderRadius: "16px", border: `1px solid ${rulesBorder}`, background: `${rulesBg}` }}>
                  <input type="checkbox" checked={rulesAccepted && privacyAccepted} onChange={toggleBothConsents} style={{ marginTop: "3px", width: "22px", height: "22px", flex: "0 0 auto", accentColor: "#14203E", cursor: "pointer" }} />
                  <span style={{ fontSize: "16.5px", lineHeight: "1.8", color: "#161C2E" }}>
                    {c.consent}{" "}
                    <a href="/rules" target="_blank" rel="noopener noreferrer">{c.consentRulesLink}</a>
                    {" · "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer">{c.consentPrivacyLink}</a>
                  </span>
                </label>
                {needsGuardian ? (
                <div style={{ padding: "22px", borderRadius: "16px", background: "#F6F0E4", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <p style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "18px", lineHeight: "1.5", color: "#14203E" }}>{t.guardianTitle}</p>
                  <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    <span style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.guardianName}</span>
                    <input type="text" value={guardianName} onInput={onGuardianName} style={{ minHeight: "54px", padding: "14px 16px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FFFFFF", fontSize: "17px", lineHeight: "1.6", color: "#161C2E" }} />
                  </label>
                </div>
                ) : null}
              </div>
            ) : null}

            <div data-e="ctarow" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginTop: "30px", paddingTop: "24px", borderTop: "1px solid #F0EADD" }}>
              <button type="button" onClick={prev} data-e="cta" style={{ minHeight: "54px", padding: "15px 26px", border: "1px solid #DCD1BC", borderRadius: "999px", background: "#FFFFFF", cursor: "pointer", fontSize: "17px", lineHeight: "1.5", color: "#161C2E", alignItems: "center", justifyContent: "center", textAlign: "center", display: `${prevDisplay}` }}>{t.prev}</button>
              <button type="button" onClick={next} data-e="cta" style={{ minHeight: "56px", padding: "16px 30px", border: "0", borderRadius: "999px", background: `${nextBg}`, color: `${nextFg}`, cursor: `${nextCursor}`, fontSize: "18px", fontWeight: "600", lineHeight: "1.5" }}>{nextLabel}</button>
            </div>

            <p style={{ margin: "22px 0 0", fontSize: "15.5px", lineHeight: "1.8", color: "#161C2E" }}>{t.haveAccount} <Link href="/login">{t.signIn}</Link></p>
          </div>
        </div>
      </section>

      <div role="dialog" aria-modal="true" aria-label={pickerTitle} style={{ display: `${pickerDisplay}`, position: "fixed", inset: "0", zIndex: "72", background: "rgba(11,18,38,.55)", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "460px", background: "#FFFFFF", borderRadius: "22px", boxShadow: "0 30px 70px rgba(11,18,38,.35)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "78vh" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "18px 18px 16px", borderBottom: "1px solid #F0EADD" }}>
            <p style={{ margin: "0", flex: "1 1 auto", textAlign: "center", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "19px", lineHeight: "1.5", letterSpacing: ".02em", color: "#14203E" }}>{pickerTitle}</p>
            <button type="button" onClick={closePicker} aria-label={t.dobCancel} style={{ width: "42px", height: "42px", flex: "0 0 auto", border: "0", borderRadius: "12px", background: "#FCFAF4", cursor: "pointer", fontSize: "20px", lineHeight: "1", color: "#161C2E" }}>×</button>
          </div>
          <div style={{ display: `${pickerSearchDisplay}`, padding: "14px 18px 4px" }}>
            <input type="search" value={pickerQuery} onInput={onPickerQuery} placeholder={t.searchPlaceholder} style={{ width: "100%", minHeight: "52px", padding: "13px 16px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FCFAF4", fontSize: "16.5px", lineHeight: "1.6", color: "#161C2E" }} />
          </div>
          <div data-e="pickerlist" style={{ flex: "1 1 auto", overflowY: "auto", padding: "10px 12px 18px", scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}>
            {pickerItems.map((o, oIndex) => (
              <button key={oIndex} type="button" onClick={o.select} aria-pressed={o.on} style={{ width: "100%", minHeight: "52px", padding: "13px 16px", marginBottom: "4px", border: "0", borderRadius: "14px", background: `${o.bg}`, color: `${o.fg}`, cursor: "pointer", textAlign: "left", fontSize: "17px", lineHeight: "1.6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <span>{o.label}</span>
                <span aria-hidden="true" style={{ display: `${o.tick}`, fontSize: "17px", lineHeight: "1" }}>✓</span>
              </button>
            ))}
            <p style={{ margin: "14px 6px", display: `${pickerEmptyDisplay}`, fontSize: "16px", lineHeight: "1.7", color: "#161C2E" }}>{t.noMatch}</p>
          </div>
        </div>
      </div>

      <div role="status" aria-live="polite" style={{ display: `${submitDisplay}`, position: "fixed", inset: "0", zIndex: "80", background: "rgba(7,11,30,.9)", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "22px", maxWidth: "420px" }}>
          <span style={{ display: `${spinnerDisplay}`, position: "relative", width: "104px", height: "104px" }}>
            <span aria-hidden="true" style={{ position: "absolute", inset: "0", borderRadius: "50%", border: "3px solid rgba(232,193,115,.22)" }}></span>
            <span aria-hidden="true" style={{ position: "absolute", inset: "0", borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#E8C173", animation: "rg-spin 1s linear infinite" }}></span>
            <img src="/uploads/skpn-logo.png" alt="" width="52" height="52" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "52px", height: "52px" }} />
          </span>
          <span style={{ display: `${successDisplay}`, width: "104px", height: "104px", borderRadius: "50%", background: "#E8C173", alignItems: "center", justifyContent: "center", animation: "rg-pop .5s cubic-bezier(.22,1.2,.36,1)" }}>
            <svg viewBox="0 0 24 24" width="50" height="50" fill="none" stroke="#1E1503" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}><path d="M4.5 12.5 9.5 17.5 19.5 7"></path></svg>
          </span>
          <p style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(22px,3vw,28px)", lineHeight: "1.4", color: "#FFF9EC" }}>{submitTitle}</p>
          <p style={{ margin: "0", fontSize: "17px", lineHeight: "1.8", color: "#E9E4D8" }}>{submitBody}</p>
        </div>
      </div>

      <div role="dialog" aria-modal="true" aria-label={t.dobModalTitle} onWheel={blockScroll} onTouchMove={blockScroll} style={{ display: `${dobModalDisplay}`, position: "fixed", inset: "0", zIndex: "70", background: "rgba(11,18,38,.55)", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "430px", background: "#FFFFFF", borderRadius: "22px", boxShadow: "0 30px 70px rgba(11,18,38,.35)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "18px 18px 16px", borderBottom: "1px solid #F0EADD" }}>
            <p style={{ margin: "0", flex: "1 1 auto", textAlign: "center", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "19px", lineHeight: "1.5", letterSpacing: ".02em", color: "#14203E" }}>{t.dobModalTitle}</p>
            <button type="button" onClick={closeDob} aria-label={t.dobCancel} style={{ width: "42px", height: "42px", flex: "0 0 auto", border: "0", borderRadius: "12px", background: "#FCFAF4", cursor: "pointer", fontSize: "20px", lineHeight: "1", color: "#161C2E" }}>×</button>
          </div>
          <div style={{ position: "relative", padding: "14px 12px 4px" }}>
            <div aria-hidden="true" style={{ position: "absolute", left: "12px", right: "12px", top: "146px", height: "44px", borderRadius: "12px", background: "#F5F1E7", pointerEvents: "none" }}></div>
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
              <div onWheel={onYearWheel} onTouchStart={onYearDown} onTouchMove={onYearMove} style={{ height: "308px", overflow: "hidden", position: "relative", touchAction: "none", cursor: "ns-resize" }}>
                {yearItems.map((y, yIndex) => (
                  <div key={yIndex} onClick={y.pick} style={{ height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: `${y.size}`, lineHeight: "1.2", fontWeight: `${y.weight}`, color: `${y.ink}`, opacity: `${y.op}`, fontVariantNumeric: "tabular-nums" }}>{y.label}</div>
                ))}
              </div>
              <div onWheel={onMonthWheel} onTouchStart={onMonthDown} onTouchMove={onMonthMove} style={{ height: "308px", overflow: "hidden", position: "relative", touchAction: "none", cursor: "ns-resize" }}>
                {monthItems.map((m, mIndex) => (
                  <div key={mIndex} onClick={m.pick} style={{ height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: `${m.size}`, lineHeight: "1.2", fontWeight: `${m.weight}`, color: `${m.ink}`, opacity: `${m.op}` }}>{m.label}</div>
                ))}
              </div>
              <div onWheel={onDayWheel} onTouchStart={onDayDown} onTouchMove={onDayMove} style={{ height: "308px", overflow: "hidden", position: "relative", touchAction: "none", cursor: "ns-resize" }}>
                {dayItems.map((d, dIndex) => (
                  <div key={dIndex} onClick={d.pick} style={{ height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: `${d.size}`, lineHeight: "1.2", fontWeight: `${d.weight}`, color: `${d.ink}`, opacity: `${d.op}`, fontVariantNumeric: "tabular-nums" }}>{d.label}</div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding: "8px 18px 20px" }}>
            <button type="button" onClick={confirmDob} style={{ width: "100%", minHeight: "56px", border: "0", borderRadius: "16px", background: "#14203E", color: "#FDF3DF", fontSize: "17.5px", fontWeight: "600", lineHeight: "1.5", cursor: "pointer", letterSpacing: ".04em" }}>{t.dobConfirm}</button>
          </div>
        </div>
      </div>

      <SiteFooter lang={lang} />
    </div>
  );
}
