"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CtaBox from "@/components/CtaBox";
import Leadership from "@/components/Leadership";
import { useLang, useSession } from "@/components/AppProviders";
import { strings } from "@/lib/i18n";

const DATE_STYLE = [
  { bg: "linear-gradient(150deg,#FFFFFF 0%,#FDF4E2 100%)", border: "#EFDFBE", blob: "radial-gradient(circle,rgba(232,193,115,.3) 0%,rgba(232,193,115,0) 70%)", dotBg: "#E8C173", dotHalo: "rgba(232,193,115,.28)", rule: "rgba(138,96,21,.45)", stepFg: "#8A6015", pillBg: "#F7EEDA", pillBorder: "#E7D6B2", pillFg: "#6B4A10" },
  { bg: "linear-gradient(150deg,#FFFFFF 0%,#F1F4FC 100%)", border: "#DDE3F2", blob: "radial-gradient(circle,rgba(39,64,139,.16) 0%,rgba(39,64,139,0) 70%)", dotBg: "#27408B", dotHalo: "rgba(39,64,139,.18)", rule: "rgba(39,64,139,.4)", stepFg: "#27408B", pillBg: "#E9EEF9", pillBorder: "#D6DEF2", pillFg: "#22366F" },
  { bg: "linear-gradient(150deg,#FFFFFF 0%,#EDF4F0 100%)", border: "#D9E7DF", blob: "radial-gradient(circle,rgba(63,107,88,.16) 0%,rgba(63,107,88,0) 70%)", dotBg: "#3F6B58", dotHalo: "rgba(63,107,88,.18)", rule: "rgba(63,107,88,.4)", stepFg: "#2E5142", pillBg: "#E7F1EC", pillBorder: "#D3E4DA", pillFg: "#2E5142" },
];

// s.steps carries only copy; the icon each step draws is structure and keeps the export's order.
const STEP_ICONS = ["user", "doc", "clock", "cert"];

export default function HomePage() {
  const { lang, toggle: toggleLang } = useLang();
  const { session } = useSession();
  const s = strings(lang).Home_v5.S;
  const inline = strings(lang).Home_v5.inline;
  const VIDYAS = strings(lang).Home_v5.VIDYAS;
  const KALAS = strings(lang).Home_v5.KALAS;

  const [tab, setTab] = useState<"vidyas" | "kalas">("vidyas");
  const [index, setIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sylP, setSylP] = useState(0);
  const [sylRatio, setSylRatio] = useState(0.35);
  const sylRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLElement | null>(null);

  const signedIn = session.signedIn;
  const attempts = session.attemptCount;
  const hasCerts = session.hasCertificates || attempts > 0;
  const hi = lang === "hi";
  const isVidyas = tab === "vidyas";
  const list = isVidyas ? VIDYAS : KALAS;
  const current = index % list.length;
  const cur = list[current];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    parallaxRef.current = document.querySelector("[data-parallax]");
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const y = window.scrollY || 0;
        if (parallaxRef.current && y < 1400) {
          parallaxRef.current.style.transform = `translateX(-50%) translate3d(0,${(y * 0.06).toFixed(1)}px,0)`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
      setTick((n) => n + 1);
    }, 3800);
    return () => clearInterval(timer);
  }, [paused, list.length]);

  const onSylScroll = () => {
    const el = sylRef.current;
    if (!el) return;
    const max = Math.max(1, el.scrollWidth - el.clientWidth);
    setSylP(Math.min(1, Math.max(0, el.scrollLeft / max)));
    setSylRatio(Math.min(1, el.clientWidth / Math.max(1, el.scrollWidth)));
  };
  const nudgeSyl = (dir: number) => {
    const el = sylRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(208, el.clientWidth * 0.8), behavior: "smooth" });
  };
  const pick = (i: number) => { setIndex(i); setPaused(true); setTick((n) => n + 1); };

  const groupOf = (i: number) =>
    (isVidyas ? inline[0] : inline[1]) + String(i + 1).padStart(2, "0");

  const t = { ...s, ctaPrimary: signedIn ? (attempts > 0 ? s.ctaCert : s.ctaTake) : s.ctaPrimaryOut };
  const facts = s.facts;
  const steps = s.steps.map((step, i) => ({
    title: step.title,
    n: String(i + 1).padStart(2, "0"),
    isUser: STEP_ICONS[i] === "user",
    isDoc: STEP_ICONS[i] === "doc",
    isClock: STEP_ICONS[i] === "clock",
    isCert: STEP_ICONS[i] === "cert",
  }));
  const dates = s.dates.map((d, i) => ({ ...d, ...DATE_STYLE[i % 3], step: s.dateSteps[i] }));
  const feature = { group: groupOf(current), name: hi ? cur[0] : cur[2], meaning: hi ? cur[1] : cur[3] };
  const featureAnim = tick % 2 === 0 ? "v5-inA" : "v5-inB";
  const items = list.map((it, i) => ({
    name: hi ? it[0] : it[2],
    n: String(i + 1).padStart(2, "0"),
    select: () => pick(i),
    bg: i === current ? "rgba(232,193,115,.16)" : "rgba(255,255,255,.045)",
    fg: i === current ? "#FFF9EC" : "#F2EEE4",
    border: i === current ? "#E8C173" : "rgba(232,193,115,.22)",
    numFg: i === current ? "#E8C173" : "rgba(232,193,115,.55)",
  }));
  const vidyaSelected = isVidyas;
  const kalaSelected = !isVidyas;
  const vidyaBg = isVidyas ? "#E8C173" : "transparent";
  const vidyaFg = isVidyas ? "#1E1503" : "#E8DFCE";
  const vidyaBorder = isVidyas ? "#E8C173" : "rgba(232,193,115,.4)";
  const kalaBg = isVidyas ? "transparent" : "#E8C173";
  const kalaFg = isVidyas ? "#E8DFCE" : "#1E1503";
  const kalaBorder = isVidyas ? "rgba(232,193,115,.4)" : "#E8C173";
  const showVidyas = () => { setTab("vidyas"); setIndex(0); setPaused(true); setTick((n) => n + 1); };
  const showKalas = () => { setTab("kalas"); setIndex(0); setPaused(true); setTick((n) => n + 1); };
  const sylThumbW = `${Math.max(12, sylRatio * 100).toFixed(1)}%`;
  const sylThumbX = `${(sylP * (100 / Math.max(0.12, sylRatio) - 100)).toFixed(1)}%`;
  const sylCount = `${current + 1} / ${list.length}`;
  const sylPrev = () => nudgeSyl(-1);
  const sylNext = () => nudgeSyl(1);
  const primaryHref = signedIn ? (attempts > 0 ? "/certificates" : "/quiz") : "/register";
  return (
    <div data-page="Home-v5" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "clip" }}>

      <SiteHeader lang={lang} active="home" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />

      <section id="top" style={{ position: "relative", overflow: "hidden", background: "#070B1E" }}>
        <Image src="/assets/pathey.png" alt="" width={2560} height={1440} sizes="116vw" priority data-parallax="0.06" style={{ position: "absolute", left: "50%", top: "0", transform: "translateX(-50%)", width: "116%", height: "100%", objectFit: "cover", objectPosition: "50% 32%", opacity: ".6" }} />
        <div style={{ position: "absolute", inset: "0", background: "radial-gradient(72% 58% at 50% 40%, rgba(7,11,30,.66) 0%, rgba(7,11,30,.92) 62%, rgba(5,8,22,.98) 100%)" }}></div>
        <div aria-hidden="true" style={{ position: "absolute", inset: "-10%", backgroundImage: "radial-gradient(1.5px 1.5px at 12% 22%, rgba(255,238,196,.85), transparent 60%),radial-gradient(1.2px 1.2px at 78% 16%, rgba(255,238,196,.7), transparent 60%),radial-gradient(1.6px 1.6px at 34% 68%, rgba(255,238,196,.6), transparent 60%),radial-gradient(1.1px 1.1px at 88% 74%, rgba(255,238,196,.7), transparent 60%),radial-gradient(1.4px 1.4px at 60% 40%, rgba(255,238,196,.5), transparent 60%),radial-gradient(1.2px 1.2px at 22% 86%, rgba(255,238,196,.55), transparent 60%)", backgroundSize: "520px 520px", animation: "v5-drift 46s linear infinite alternate", opacity: ".7" }}></div>

        <div data-e="pad hero-body" style={{ position: "relative", maxWidth: "1000px", margin: "0 auto", padding: "88px 30px 66px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "22px" }}>
          <div data-reveal style={{ position: "relative", width: "clamp(132px,17vw,186px)", height: "clamp(132px,17vw,186px)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "6px" }}>
            <div style={{ position: "absolute", inset: "-52%", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,193,115,.4) 0%, rgba(232,193,115,.12) 42%, rgba(232,193,115,0) 70%)", animation: "v5-glow 8s ease-in-out infinite" }}></div>
            <svg viewBox="-100 -100 200 200" width="100%" height="100%" aria-hidden="true" focusable="false" style={{ position: "absolute", inset: "-30%", width: "160%", height: "160%" }}>
              <circle r="94" fill="none" stroke="rgba(232,193,115,.55)" strokeWidth="1.4" strokeDasharray="1.5 7.3" strokeLinecap="round" style={{ transformOrigin: "0 0", animation: "v5-spin 240s linear infinite" }}></circle>
              <circle r="76" fill="none" stroke="rgba(232,193,115,.35)" strokeWidth="3.2" strokeDasharray="5 29.1" strokeLinecap="round" style={{ transformOrigin: "0 0", animation: "v5-spin-rev 300s linear infinite" }}></circle>
            </svg>
            <img src="uploads/skpn-logo.png" alt="श्रीकृष्ण पाथेय न्यास" style={{ position: "relative", width: "100%", height: "auto", display: "block", filter: "drop-shadow(0 14px 40px rgba(0,0,0,.6))" }} />
          </div>

          <p data-reveal style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "clamp(16px,1.9vw,19px)", lineHeight: "1.6", color: "#E8C173", letterSpacing: ".02em" }}>{t.org}</p>

          <h1 data-reveal style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(32px,5vw,58px)", lineHeight: "1.24", color: "#FFF9EC", maxWidth: "20ch", textWrap: "balance", textShadow: "0 2px 30px rgba(0,0,0,.4)" }}>{t.heroTitle}</h1>

          <div data-reveal style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ width: "38px", height: "1px", background: "rgba(232,193,115,.7)" }}></span>
            <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontSize: "clamp(16px,2vw,20px)", lineHeight: "1.6", color: "#F5E5C2" }}>{t.heroDate}</span>
            <span style={{ width: "38px", height: "1px", background: "rgba(232,193,115,.7)" }}></span>
          </div>

          <p data-reveal style={{ margin: "0", maxWidth: "44ch", fontSize: "clamp(16.5px,1.9vw,19px)", lineHeight: "1.85", color: "#E9E4D8" }}>{t.heroLede}</p>

          <div data-reveal data-e="ctarow" style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", width: "100%", maxWidth: "540px", marginTop: "8px" }}>
            <a href={primaryHref} data-e="cta" style={{ padding: "17px 34px", minHeight: "58px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: "#1E1503", borderRadius: "999px", fontSize: "18px", fontWeight: "600", lineHeight: "1.5", boxShadow: "0 14px 36px rgba(232,193,115,.28)", transition: "transform .2s ease,box-shadow .2s ease" }}>{t.ctaPrimary}</a>
            <a href="Rules.dc.html" data-e="cta" style={{ padding: "17px 30px", minHeight: "58px", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,249,236,.42)", borderRadius: "999px", fontSize: "18px", lineHeight: "1.5", color: "#FFF9EC", transition: "background .2s ease" }}>{t.ctaSecondary}</a>
          </div>
        </div>

        <div style={{ position: "relative", borderTop: "1px solid rgba(255,247,225,.14)", background: "rgba(5,8,20,.82)" }}>
          <div data-e="pad" style={{ maxWidth: "1220px", margin: "0 auto", padding: "0 30px" }}>
            <dl data-e="facts" style={{ margin: "0", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
              {facts.map((f, fIndex) => (
                <div key={fIndex} data-e="fact" data-reveal style={{ padding: "26px 24px 30px", borderLeft: "1px solid rgba(255,247,225,.14)", display: "flex", flexDirection: "column", gap: "5px" }}>
                  <dt style={{ fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(26px,3vw,34px)", lineHeight: "1.25", color: "#E8C173" }}>{f.value}</dt>
                  <dd style={{ margin: "0", fontSize: "15.5px", lineHeight: "1.7", color: "#F2EEE4" }}>{f.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section style={{ position: "relative", overflow: "hidden", background: "#070B1E" }}>
        <img src="assets/cosmic-spiral.png" alt="" width="924" height="540" loading="lazy" decoding="async" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 38%", opacity: ".5" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: "0", background: "radial-gradient(80% 60% at 50% 22%, rgba(7,11,30,.62) 0%, rgba(7,11,30,.9) 58%, rgba(4,7,18,.98) 100%)" }}></div>
        <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "-18%", width: "720px", height: "720px", transform: "translateX(-50%)", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.16) 0%,rgba(232,193,115,0) 66%)", animation: "v5-glow 11s ease-in-out infinite" }}></div>

        <div data-e="pad section" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "92px 30px 96px" }}>
          <div data-reveal style={{ maxWidth: "64ch", margin: "0 0 34px" }}>
            <p style={{ margin: "0 0 12px", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "17px", letterSpacing: ".01em", color: "#E8C173", lineHeight: "1.9" }}>{t.sylKicker}</p>
            <h2 style={{ margin: "0 0 14px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(27px,3.6vw,42px)", lineHeight: "1.3", color: "#FFF9EC", textWrap: "pretty" }}>{t.sylTitle}</h2>
            <p style={{ margin: "0", fontSize: "17.5px", lineHeight: "1.9", color: "#E9E4D8" }}>{t.sylLede}</p>
          </div>

          <div data-reveal role="tablist" style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
            <button type="button" role="tab" aria-selected={vidyaSelected} onClick={showVidyas} style={{ minHeight: "50px", padding: "13px 26px", border: `1px solid ${vidyaBorder}`, borderRadius: "999px", background: `${vidyaBg}`, color: `${vidyaFg}`, cursor: "pointer", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "18px", lineHeight: "1.5", transition: "background .2s ease,color .2s ease,border-color .2s ease" }}>{t.tabVidyas}</button>
            <button type="button" role="tab" aria-selected={kalaSelected} onClick={showKalas} style={{ minHeight: "50px", padding: "13px 26px", border: `1px solid ${kalaBorder}`, borderRadius: "999px", background: `${kalaBg}`, color: `${kalaFg}`, cursor: "pointer", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "18px", lineHeight: "1.5", transition: "background .2s ease,color .2s ease,border-color .2s ease" }}>{t.tabKalas}</button>
          </div>

          <div data-reveal style={{ position: "relative", overflow: "hidden", borderRadius: "24px", border: "1px solid rgba(232,193,115,.28)", background: "linear-gradient(140deg, rgba(24,34,70,.78) 0%, rgba(8,12,28,.86) 100%)", padding: "30px 32px", marginBottom: "22px", minHeight: "150px", display: "flex", flexDirection: "column", gap: "10px", animation: `${featureAnim} .45s cubic-bezier(.22,.61,.36,1)` }}>
            <div aria-hidden="true" style={{ position: "absolute", right: "-60px", top: "-60px", width: "260px", height: "260px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.22) 0%,rgba(232,193,115,0) 70%)" }}></div>
            <span style={{ position: "relative", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "16.5px", letterSpacing: ".01em", color: "#E8C173", lineHeight: "1.9" }}>{feature.group}</span>
            <span style={{ position: "relative", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(28px,4vw,44px)", lineHeight: "1.22", color: "#FFF9EC" }}>{feature.name}</span>
            <span style={{ position: "relative", fontSize: "18px", lineHeight: "1.8", color: "#E9E4D8", maxWidth: "52ch" }}>{feature.meaning}</span>
          </div>

          <div data-e="sylrail" ref={sylRef} onScroll={onSylScroll} style={{ display: "grid", gridAutoFlow: "column", gridTemplateRows: "repeat(2,minmax(0,1fr))", gridAutoColumns: "198px", gap: "10px", overflowX: "auto", scrollSnapType: "x proximity", padding: "2px 2px 16px", overscrollBehaviorX: "contain" }}>
            {items.map((it, itIndex) => (
              <button key={itIndex} type="button" onClick={it.select} onMouseEnter={it.select} onFocus={it.select} style={{ scrollSnapAlign: "start", position: "relative", minHeight: "68px", padding: "12px 14px 12px 42px", textAlign: "left", cursor: "pointer", fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: "15.5px", lineHeight: "1.55", border: `1px solid ${it.border}`, borderRadius: "14px", background: `${it.bg}`, color: `${it.fg}`, transition: "border-color .18s ease,background .18s ease,transform .18s ease" }}>
              <span aria-hidden="true" style={{ position: "absolute", left: "12px", top: "12px", fontSize: "11.5px", lineHeight: "1.6", color: `${it.numFg}`, fontVariantNumeric: "tabular-nums" }}>{it.n}</span>
              {it.name}
            </button>
            ))}
          </div>

          <div data-e="sylbar" style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" onClick={sylPrev} aria-label={t.prevLabel} style={{ width: "48px", height: "48px", border: "1px solid rgba(232,193,115,.4)", borderRadius: "50%", background: "rgba(255,255,255,.05)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .18s ease,border-color .18s ease" }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#E8C173" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: "block" }}><path d="M14.5 5.5 8 12l6.5 6.5"></path></svg>
              </button>
              <button type="button" onClick={sylNext} aria-label={t.nextLabel} style={{ width: "48px", height: "48px", border: "1px solid rgba(232,193,115,.4)", borderRadius: "50%", background: "rgba(255,255,255,.05)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .18s ease,border-color .18s ease" }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#E8C173" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: "block" }}><path d="M9.5 5.5 16 12l-6.5 6.5"></path></svg>
              </button>
            </div>
            <div aria-hidden="true" style={{ flex: "1 1 160px", height: "3px", borderRadius: "3px", background: "rgba(255,249,236,.14)", overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", borderRadius: "3px", background: "linear-gradient(90deg,rgba(232,193,115,.35),#E8C173)", width: `${sylThumbW}`, transform: `translateX(${sylThumbX})`, transition: "width .2s ease" }}></span>
            </div>
            <span style={{ fontSize: "14.5px", lineHeight: "1.7", color: "#DBD5C7", fontVariantNumeric: "tabular-nums" }}>{sylCount}</span>
          </div>
        </div>
      </section>

      <Leadership lang={lang} />

      <section style={{ background: "#F6F0E4", borderTop: "1px solid #EFE5D3", borderBottom: "1px solid #EFE5D3" }}>
        <div data-e="pad section" style={{ maxWidth: "1220px", margin: "0 auto", padding: "80px 30px" }}>
          <h2 data-reveal style={{ margin: "0 0 48px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(26px,3.4vw,36px)", lineHeight: "1.35", color: "#14203E" }}>{t.howTitle}</h2>
          <div data-reveal style={{ position: "relative" }}>
            <div data-e="track-line" aria-hidden="true" style={{ position: "absolute", left: "10%", right: "10%", top: "38px", height: "1px", background: "linear-gradient(90deg, rgba(138,96,21,0) 0%, rgba(138,96,21,.34) 12%, rgba(138,96,21,.34) 88%, rgba(138,96,21,0) 100%)" }}></div>
            <span data-e="travel" aria-hidden="true" style={{ position: "absolute", top: "33px", width: "11px", height: "11px", borderRadius: "50%", background: "#E8C173", boxShadow: "0 0 0 5px rgba(232,193,115,.28),0 0 18px rgba(232,193,115,.9)", animation: "v5-travel 5.6s cubic-bezier(.4,0,.2,1) infinite" }}></span>
            <span data-e="vline" aria-hidden="true" style={{ display: "none", position: "absolute", left: "46px", top: "20px", bottom: "20px", width: "2px", background: "linear-gradient(180deg, rgba(138,96,21,0) 0%, rgba(138,96,21,.32) 10%, rgba(138,96,21,.32) 90%, rgba(138,96,21,0) 100%)" }}></span>
            <span data-e="vtravel" aria-hidden="true" style={{ display: "none", position: "absolute", left: "41px", width: "12px", height: "12px", borderRadius: "50%", background: "#E8C173", boxShadow: "0 0 0 5px rgba(232,193,115,.28),0 0 18px rgba(232,193,115,.9)", animation: "v5-travel-y 5.6s cubic-bezier(.4,0,.2,1) infinite" }}></span>
            <ol data-e="steps" style={{ position: "relative", margin: "0", padding: "0", listStyle: "none", display: "flex", justifyContent: "space-between", gap: "24px" }}>
              {steps.map((s, sIndex) => (
                <li key={sIndex} data-e="step" data-reveal style={{ position: "relative", flex: "1 1 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px" }}>
                  <span data-e="ring" style={{ width: "76px", height: "76px", flex: "0 0 auto", borderRadius: "50%", background: "#FFFFFF", border: "1px solid #E5D9C2", boxShadow: "0 8px 22px rgba(20,32,62,.09)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="#8A6015" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: "block" }}>
                      {s.isUser ? (
                        <g><circle cx="16" cy="11" r="5"></circle><path d="M6 27c1.6-5.4 5.3-8 10-8s8.4 2.6 10 8"></path></g>
                      ) : null}
                      {s.isDoc ? (
                        <g><rect x="7" y="4" width="18" height="24" rx="2.5"></rect><path d="M12 11h8M12 16h8M12 21h5"></path></g>
                      ) : null}
                      {s.isClock ? (
                        <g><circle cx="16" cy="16" r="11"></circle><path d="M16 9.5V16l4.5 3"></path></g>
                      ) : null}
                      {s.isCert ? (
                        <g><rect x="5" y="6" width="22" height="15" rx="2"></rect><circle cx="16" cy="24" r="3.4"></circle><path d="M10 11h12M10 15h7"></path></g>
                      ) : null}
                    </svg>
                  </span>
                  <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "500", fontSize: "20px", lineHeight: "1.5", color: "#14203E" }}>{s.title}</span>
                  <span data-e="stepn" aria-hidden="true" style={{ display: "none", marginLeft: "auto", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "26px", lineHeight: "1", color: "rgba(20,32,62,.12)", fontVariantNumeric: "tabular-nums" }}>{s.n}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section data-e="pad section" style={{ maxWidth: "1220px", margin: "0 auto", padding: "88px 30px" }}>
        <h2 data-reveal style={{ margin: "0 0 34px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(26px,3.4vw,36px)", lineHeight: "1.35", color: "#14203E" }}>{t.datesTitle}</h2>
        <ol data-e="datesgrid" style={{ margin: "0", padding: "0", listStyle: "none", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "20px" }}>
          {dates.map((d, dIndex) => (
            <li key={dIndex} data-reveal style={{ position: "relative", overflow: "hidden", padding: "30px 30px 32px", borderRadius: "24px", background: `${d.bg}`, border: `1px solid ${d.border}`, boxShadow: "0 2px 4px rgba(20,32,62,.04),0 16px 38px rgba(20,32,62,.07)", display: "flex", flexDirection: "column", gap: "14px" }}>
              <span aria-hidden="true" style={{ position: "absolute", right: "-46px", top: "-46px", width: "170px", height: "170px", borderRadius: "50%", background: `${d.blob}` }}></span>
              <span style={{ position: "relative", display: "flex", alignItems: "center", gap: "12px" }}>
                <span aria-hidden="true" style={{ width: "13px", height: "13px", flex: "0 0 auto", borderRadius: "50%", background: `${d.dotBg}`, boxShadow: `0 0 0 4px ${d.dotHalo}` }}></span>
                <span aria-hidden="true" style={{ flex: "1 1 auto", height: "1px", background: `linear-gradient(90deg, ${d.rule} 0%, rgba(138,96,21,0) 100%)` }}></span>
                <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontSize: "20px", fontWeight: "600", letterSpacing: ".02em", fontVariantNumeric: "tabular-nums", color: `${d.stepFg}` }}>{d.step}</span>
              </span>
              <span style={{ position: "relative", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(25px,3vw,32px)", lineHeight: "1.24", color: "#14203E", fontVariantNumeric: "tabular-nums", textWrap: "balance" }}>{d.when}</span>
              <span style={{ position: "relative", fontSize: "18px", lineHeight: "1.6", color: "#161C2E" }}>{d.what}</span>
              <span style={{ position: "relative", marginTop: "2px", alignSelf: "flex-start", padding: "8px 16px", borderRadius: "999px", background: `${d.pillBg}`, border: `1px solid ${d.pillBorder}`, fontSize: "15px", lineHeight: "1.7", color: `${d.pillFg}` }}>{d.note}</span>
            </li>
          ))}
        </ol>
      </section>

      <CtaBox lang={lang} signedIn={signedIn} attempts={attempts} />

      <SiteFooter lang={lang} />
    </div>
  );
}
