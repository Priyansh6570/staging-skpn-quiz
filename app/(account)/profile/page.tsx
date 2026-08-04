"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLang, useSession } from "@/components/AppProviders";
import { custom, strings, en as enStrings } from "@/lib/i18n";
import { EXAM_KEYS } from "@/lib/registration";

/** Mirrors `profileDetail` in lib/serialize.ts, field for field. No score, no raw duration. */
interface Me {
  displayName: string;
  mobile: string;
  email: string | null;
  gender: "male" | "female" | "other";
  dateOfBirth: string | null;
  address: { line: string; cityVillage: string; district: string; pincode: string };
  category: "vidyalaya" | "mahavidyalaya";
  educationLevel: string;
  institutionName: string;
  competitiveExam: string | null;
  isDivyang: boolean;
  attempt: { submittedAt: string | null; durationLabel: string | null } | null;
}

const DASH = "-";

export default function ProfilePage() {
  const router = useRouter();
  const { lang, toggle: toggleLang } = useLang();
  const { session, refresh } = useSession();
  const s = strings(lang).Profile.S;
  const inline = strings(lang).Profile.inline;
  const months = strings(lang).Quiz.inline.slice(4);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setMe(data); });
    return () => { cancelled = true; };
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    await refresh();
    router.push("/");
  };

  const hi = lang === "hi";
  const t = s;
  const k = s.keys;

  const districtIndex = me ? enStrings.Register.DISTRICTS.findIndex((d) => d[0] === me.address.district) : -1;
  const districtLabel = districtIndex >= 0 ? strings(lang).Register.DISTRICTS[districtIndex][hi ? 1 : 0] : DASH;
  const levelIndex = me ? enStrings.Register.LEVELS[me.category].indexOf(me.educationLevel) : -1;
  const levelLabel = me && levelIndex >= 0 ? strings(lang).Register.LEVELS[me.category][levelIndex] : DASH;
  const genderLabel = me ? strings(lang).Register.S.genders[["male", "female", "other"].indexOf(me.gender)] ?? DASH : DASH;
  // Stored as the English key, read back as the label, exactly like district and level above.
  const examIndex = me?.competitiveExam ? EXAM_KEYS.indexOf(me.competitiveExam) : -1;
  const examLabel = examIndex >= 0
    ? [...custom(lang).pratiyogita.examNames, strings(lang).Register.S.examOther, strings(lang).Register.S.examNone][examIndex]
    : me?.competitiveExam || inline[0];
  const dobLabel = me?.dateOfBirth
    ? (() => { const d = new Date(me.dateOfBirth); return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`; })()
    : DASH;

  const name = me?.displayName ?? session.displayName ?? DASH;
  const attemptDate = me?.attempt?.submittedAt
    ? (() => { const d = new Date(me.attempt!.submittedAt!); return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`; })()
    : DASH;
  const attemptClock = me?.attempt?.submittedAt
    ? (() => { const d = new Date(me.attempt!.submittedAt!); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; })()
    : DASH;
  // Formatted server-side. The raw second count is not sent: see lib/serialize.ts.
  const attemptTaken = me?.attempt?.durationLabel ?? DASH;

  const student = { fullName: name, district: districtLabel };
  const initials = name.trim().charAt(0);
  const categoryLabel = me ? s.categories[me.category] : DASH;
  const stats = [
    { label: s.stats[0], value: attemptDate },
    { label: s.stats[1], value: attemptTaken },
  ];
  /**
   * The one condition the participation card turns on. `me.attempt` is a submitted paper and
   * nothing else — see app/api/me/route.ts. Having an account is not completion, and neither is
   * having opened a paper; the green "competition completed" panel used to render for every
   * student who reached this page, including one who had only just registered.
   *
   * `null` while /api/me is in flight, so neither state is shown before the answer arrives: a
   * student who has finished must not be told to start, and one who has not must not be
   * congratulated, even for a frame.
   */
  const completed = me === null ? null : me.attempt !== null;
  const attempts = me?.attempt
    ? [{ date: `${attemptDate}, ${attemptClock}`, time: `${inline[2]}${attemptTaken}`, status: inline[3] }]
    : [];
  const groups = [
    { title: s.groups[0], note: s.mobileNote, noteDisplay: "block", rows: [
      { k: k.name, v: name },
      { k: k.gender, v: genderLabel },
      { k: k.dob, v: dobLabel },
      { k: k.mobile, v: me ? `+91 ${me.mobile}` : DASH },
    ] },
    { title: s.groups[1], note: "", noteDisplay: "none", rows: [
      { k: k.email, v: me?.email || DASH },
      { k: k.provider, v: s.mobileSignIn },
    ] },
    { title: s.groups[2], note: "", noteDisplay: "none", rows: [
      { k: k.address, v: me?.address.line ?? DASH },
      { k: k.city, v: me?.address.cityVillage ?? DASH },
      { k: k.district, v: districtLabel },
      { k: k.state, v: s.stateValue },
      { k: k.pin, v: me?.address.pincode ?? DASH },
    ] },
    { title: s.groups[3], note: me?.isDivyang ? s.divyangNote : "", noteDisplay: me?.isDivyang ? "block" : "none", rows: [
      { k: k.category, v: categoryLabel },
      { k: k.level, v: levelLabel },
      { k: k.institution, v: me?.institutionName ?? DASH },
      { k: k.exam, v: examLabel },
      { k: k.divyang, v: me?.isDivyang ? s.divyangYes : s.divyangNo },
    ] },
  ];

  const hiOn = hi, enOn = !hi;
  const hiBg = hi ? "#14203E" : "#FCFAF4", hiFg = hi ? "#FDF3DF" : "#161C2E", hiBorder = hi ? "#14203E" : "#DCD1BC";
  const enBg = hi ? "#FCFAF4" : "#14203E", enFg = hi ? "#161C2E" : "#FDF3DF", enBorder = hi ? "#DCD1BC" : "#14203E";
  const setHi = () => { if (!hi) toggleLang(); };
  const setEn = () => { if (hi) toggleLang(); };
  const signedIn = session.signedIn;
  const hasCerts = session.hasCertificates;
  return (
    <div data-page="Profile" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "hidden" }}>
      <SiteHeader lang={lang} active="home" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />

      <section data-e="pad" style={{ maxWidth: "1060px", margin: "0 auto", padding: "48px 30px 76px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "12px" }}>
          <span aria-hidden="true" style={{ width: "64px", height: "64px", flex: "0 0 auto", borderRadius: "50%", background: "#14203E", color: "#FDF3DF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "24px", fontWeight: "600" }}>{initials}</span>
          <div>
            <h1 style={{ margin: "0 0 4px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(24px,3.4vw,32px)", lineHeight: "1.3", color: "#14203E" }}>{student.fullName}</h1>
            <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.7", color: "#161C2E" }}>{student.district} · {categoryLabel}</p>
          </div>
        </div>
        <p style={{ margin: "0 0 32px", maxWidth: "64ch", fontSize: "16.5px", lineHeight: "1.85", color: "#161C2E" }}>{t.lockNote} <a href="mailto:shrikrishnapatheynyas@gmail.com">shrikrishnapatheynyas@gmail.com</a></p>

        <div data-e="card" style={{ padding: "28px 30px", background: "#FFFFFF", borderRadius: "20px", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 14px 32px rgba(20,32,62,.06)", marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 18px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "21px", lineHeight: "1.4", color: "#14203E" }}>{t.participation}</h2>
          <div data-e="attempt" style={{ display: completed ? "grid" : "none", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "16px", marginBottom: "24px" }}>
            {stats.map((s, sIndex) => (
              <div key={sIndex} style={{ padding: "18px 20px", borderRadius: "16px", background: "#F6F0E4", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "15px", lineHeight: "1.6", color: "#161C2E" }}>{s.label}</span>
                <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "25px", lineHeight: "1.3", color: "#14203E", fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
              </div>
            ))}
          </div>
          <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column" }}>
            {attempts.map((a, aIndex) => (
              <li key={aIndex} data-e="row" style={{ display: "flex", alignItems: "baseline", gap: "20px", padding: "16px 2px", borderTop: "1px solid #F0EADD" }}>
                <span style={{ minWidth: "180px", fontSize: "16.5px", lineHeight: "1.7", color: "#161C2E", fontVariantNumeric: "tabular-nums" }}>{a.date}</span>
                <span style={{ fontSize: "16px", lineHeight: "1.7", color: "#161C2E" }}>{a.time}</span>
                <span style={{ fontSize: "16.5px", lineHeight: "1.7", color: "#8A6015" }}>{a.status}</span>
                <Link data-e="rowval" href="/certificates" style={{ marginLeft: "auto", fontSize: "16px", lineHeight: "1.7" }}>{t.viewCertificate} <span aria-hidden="true">→</span></Link>
              </li>
            ))}
          </ul>
          {completed === true ? (
            <div data-e="donepanel" style={{ margin: "20px 0 0", padding: "18px 20px", borderRadius: "14px", background: "#EAF3ED", border: "1px solid #CFE3D6", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "9px", padding: "8px 16px", borderRadius: "999px", background: "#2E6B4B", color: "#F2FBF5", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "16.5px", lineHeight: "1.5" }}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#F2FBF5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}><path d="M4.5 12.5 9.5 17.5 19.5 7"></path></svg>
                {t.status}
              </span>
              <span style={{ fontSize: "16px", lineHeight: "1.8", color: "#161C2E" }}>{t.bestNote}</span>
            </div>
          ) : null}

          {/* Not yet sat. The invite, in the page's own approved copy — Profile.S.startQuiz was
              already written for this state and had never been rendered. */}
          {completed === false ? (
            <div data-e="startpanel" style={{ margin: "20px 0 0", padding: "18px 20px", borderRadius: "14px", background: "#F6F0E4", border: "1px solid #E3D9C6", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "16px", lineHeight: "1.8", color: "#161C2E" }}>{t.bestNote}</span>
              <Link href="/quiz" data-e="cta" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "48px", padding: "12px 24px", borderRadius: "999px", background: "#14203E", color: "#FDF3DF", fontSize: "16.5px", fontWeight: "600", lineHeight: "1.5" }}>{t.startQuiz}</Link>
            </div>
          ) : null}
        </div>

        <div data-g="two" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "20px", alignItems: "start" }}>
          {groups.map((g, gIndex) => (
            <div key={gIndex} data-e="card" style={{ padding: "28px 30px", background: "#FFFFFF", borderRadius: "20px", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 14px 32px rgba(20,32,62,.06)" }}>
              <h2 style={{ margin: "0 0 16px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "20px", lineHeight: "1.4", color: "#14203E" }}>{g.title}</h2>
              <dl style={{ margin: "0", display: "flex", flexDirection: "column" }}>
                {g.rows.map((r, rIndex) => (
                  <div key={rIndex} data-e="row" style={{ display: "flex", alignItems: "baseline", gap: "18px", padding: "13px 0", borderTop: "1px solid #F0EADD" }}>
                    <dt style={{ minWidth: "150px", fontSize: "15.5px", lineHeight: "1.7", color: "#161C2E" }}>{r.k}</dt>
                    <dd data-e="rowval" style={{ margin: "0 0 0 auto", fontSize: "16.5px", lineHeight: "1.7", color: "#161C2E", textAlign: "right" }}>{r.v}</dd>
                  </div>
                ))}
              </dl>
              <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: "1.75", color: "#161C2E", display: `${g.noteDisplay}` }}>{g.note}</p>
            </div>
          ))}
        </div>

        <div data-e="card" style={{ marginTop: "20px", padding: "28px 30px", background: "#FFFFFF", borderRadius: "20px", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 14px 32px rgba(20,32,62,.06)" }}>
          <h2 style={{ margin: "0 0 8px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "20px", lineHeight: "1.4", color: "#14203E" }}>{t.langTitle}</h2>
          <p style={{ margin: "0 0 16px", fontSize: "16px", lineHeight: "1.8", color: "#161C2E" }}>{t.langNote}</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" onClick={setHi} aria-pressed={hiOn} style={{ minHeight: "50px", padding: "13px 24px", border: `1px solid ${hiBorder}`, borderRadius: "999px", background: `${hiBg}`, color: `${hiFg}`, cursor: "pointer", fontSize: "16.5px", lineHeight: "1.6" }}>हिन्दी</button>
            <button type="button" onClick={setEn} aria-pressed={enOn} style={{ minHeight: "50px", padding: "13px 24px", border: `1px solid ${enBorder}`, borderRadius: "999px", background: `${enBg}`, color: `${enFg}`, cursor: "pointer", fontSize: "16.5px", lineHeight: "1.6" }}>English</button>
          </div>
        </div>

        <div style={{ marginTop: "26px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <button type="button" onClick={signOut} style={{ minHeight: "54px", padding: "15px 26px", border: "1px solid #DCD1BC", borderRadius: "999px", background: "#FFFFFF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "16.5px", lineHeight: "1.5", color: "#161C2E", fontFamily: "inherit" }}>{t.signOut}</button>
        </div>
      </section>

      <SiteFooter lang={lang} />
    </div>
  );
}
