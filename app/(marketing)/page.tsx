"use client";

import Link from "next/link";

import { useEffect, useRef } from "react";
import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CtaBox from "@/components/CtaBox";
import Leadership from "@/components/Leadership";
import PageAura from "@/components/PageAura";
import VidyaKalaTeaser from "@/components/VidyaKalaTeaser";
import ProfessionsRail from "@/components/ProfessionsRail";
import { useCompetitionOpen, useLang, useSession } from "@/components/AppProviders";
import { custom, strings } from "@/lib/i18n";

const DATE_STYLE = [
  { bg: "linear-gradient(150deg,#FFFFFF 0%,#FDF4E2 100%)", border: "#EFDFBE", blob: "radial-gradient(circle,rgba(232,193,115,.3) 0%,rgba(232,193,115,0) 70%)", dotBg: "#E8C173", dotHalo: "rgba(232,193,115,.28)", rule: "rgba(138,96,21,.45)", stepFg: "#8A6015" },
  { bg: "linear-gradient(150deg,#FFFFFF 0%,#F1F4FC 100%)", border: "#DDE3F2", blob: "radial-gradient(circle,rgba(39,64,139,.16) 0%,rgba(39,64,139,0) 70%)", dotBg: "#27408B", dotHalo: "rgba(39,64,139,.18)", rule: "rgba(39,64,139,.4)", stepFg: "#27408B" },
  { bg: "linear-gradient(150deg,#FFFFFF 0%,#EDF4F0 100%)", border: "#D9E7DF", blob: "radial-gradient(circle,rgba(63,107,88,.16) 0%,rgba(63,107,88,0) 70%)", dotBg: "#3F6B58", dotHalo: "rgba(63,107,88,.18)", rule: "rgba(63,107,88,.4)", stepFg: "#2E5142" },
];

// s.steps carries only copy; the icon each step draws is structure and keeps the export's order.
const STEP_ICONS = ["user", "doc", "clock", "cert"];

export default function HomePage() {
  const { lang, toggle: toggleLang } = useLang();
  const { session } = useSession();
  const competitionOpen = useCompetitionOpen();
  const s = strings(lang).Home_v5.S;
  const c = custom(lang);

  const parallaxRef = useRef<HTMLElement | null>(null);

  const signedIn = session.signedIn;
  const hasSat = session.hasCertificates;
  const hasCerts = hasSat;

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


  const t = { ...s, ctaPrimary: signedIn ? (hasSat ? s.ctaCert : s.ctaTake) : s.ctaPrimaryOut };

  // heroDateRange is one string, and narrow screens have to break it before the closing date. That
  // date is the only point inside it that also exists as a string of its own, so the cut is found
  // rather than spelled out — in either language. The head keeps its trailing space: the
  // <br> is display:none above 640px, and without the space the two halves would run together.
  const dateCut = t.heroDateRange.indexOf(s.dates[1].when);
  const heroDateHead = t.heroDateRange.slice(0, dateCut);
  const heroDateTail = t.heroDateRange.slice(dateCut);

  const facts = s.facts.map((f, i) =>
    i === 0 ? { ...f, label: c.home.perStudent }
      : i === 3 ? { value: t.factTimeValue, label: t.factTimeLabel }
        : f);
  const steps = s.steps.map((step, i) => ({
    title: step.title,
    n: String(i + 1).padStart(2, "0"),
    isUser: STEP_ICONS[i] === "user",
    isDoc: STEP_ICONS[i] === "doc",
    isClock: STEP_ICONS[i] === "clock",
    isCert: STEP_ICONS[i] === "cert",
  }));
  // The opening row has no separate occasion to name any more — the competition's own start is the
  // occasion — so `what` and `note` carry the same words there. Printed once, not twice.
  const dates = s.dates.map((d, i) => ({ ...d, what: d.what === d.note ? "" : d.what, ...DATE_STYLE[i % 3], step: s.dateSteps[i] }));
  const primaryHref = signedIn ? (hasSat ? "/certificates" : "/quiz") : "/register";
  return (
    <div data-page="Home-v5" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "clip", isolation: "isolate" }}>
      <PageAura />

      <SiteHeader lang={lang} active="home" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />

      <section id="top" style={{ position: "relative", overflow: "hidden", background: "#070B1E" }}>
        {/* Wider than the hero and anchored left of centre: the artwork puts Shri Krishna on the
            left and the light on the right, so this clears the medallion and the title off his face
            and leaves him looking up towards them. */}
        <Image src="/assets/newbg.jpg" alt="" width={1791} height={1007} sizes="150vw" priority data-parallax="0.06" style={{ position: "absolute", left: "38%", top: "0", transform: "translateX(-50%)", width: "150%", height: "100%", objectFit: "cover", objectPosition: "50% 34%", opacity: ".72" }} />
        <div style={{ position: "absolute", inset: "0", background: "radial-gradient(72% 58% at 50% 40%, rgba(7,11,30,.58) 0%, rgba(7,11,30,.84) 62%, rgba(5,8,22,.94) 100%)" }}></div>
        <div aria-hidden="true" style={{ position: "absolute", inset: "-10%", backgroundImage: "radial-gradient(1.5px 1.5px at 12% 22%, rgba(255,238,196,.85), transparent 60%),radial-gradient(1.2px 1.2px at 78% 16%, rgba(255,238,196,.7), transparent 60%),radial-gradient(1.6px 1.6px at 34% 68%, rgba(255,238,196,.6), transparent 60%),radial-gradient(1.1px 1.1px at 88% 74%, rgba(255,238,196,.7), transparent 60%),radial-gradient(1.4px 1.4px at 60% 40%, rgba(255,238,196,.5), transparent 60%),radial-gradient(1.2px 1.2px at 22% 86%, rgba(255,238,196,.55), transparent 60%)", backgroundSize: "520px 520px", animation: "v5-drift 46s linear infinite alternate", opacity: ".7" }}></div>

        <div data-e="pad hero-body" style={{ position: "relative", maxWidth: "1000px", margin: "0 auto", padding: "88px 30px 66px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "22px" }}>
          <div data-reveal style={{ position: "relative", width: "clamp(148px,19vw,208px)", height: "clamp(148px,19vw,208px)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "6px" }}>
            <div style={{ position: "absolute", inset: "-52%", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,193,115,.52) 0%, rgba(232,193,115,.16) 42%, rgba(232,193,115,0) 70%)", animation: "v5-glow 5s ease-in-out infinite" }}></div>
            {/* A tight rim that breathes out of phase with the wide halo, so the seal reads as lit
                from behind rather than pasted onto the artwork. */}
            <div aria-hidden="true" style={{ position: "absolute", inset: "-3%", borderRadius: "50%", boxShadow: "0 0 28px 7px rgba(232,193,115,.5)", animation: "v5-glow 3.4s ease-in-out infinite" }}></div>
            <svg viewBox="-100 -100 200 200" width="100%" height="100%" aria-hidden="true" focusable="false" style={{ position: "absolute", inset: "-30%", width: "160%", height: "160%" }}>
              <circle r="94" fill="none" stroke="rgba(232,193,115,.55)" strokeWidth="1.4" strokeDasharray="1.5 7.3" strokeLinecap="round" style={{ transformOrigin: "0 0", animation: "v5-spin 28s linear infinite" }}></circle>
              <circle r="76" fill="none" stroke="rgba(232,193,115,.35)" strokeWidth="3.2" strokeDasharray="5 29.1" strokeLinecap="round" style={{ transformOrigin: "0 0", animation: "v5-spin-rev 44s linear infinite" }}></circle>
            </svg>
            {/* A spark riding each dotted ring, counter-rotating. The insets put each carrier's
                half-width on its ring's radius — the svg maps 200 viewBox units onto 160% of the
                medallion, so r=94 lands at 75.2% and r=76 at 60.8% of the medallion's width. */}
            <div aria-hidden="true" style={{ position: "absolute", inset: "-25.2%", animation: "v5-spin 16s linear infinite" }}>
              <div style={{ position: "absolute", left: "50%", top: "0", width: "9%", height: "9%", transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,245,220,.95) 0%, rgba(232,193,115,.5) 42%, rgba(232,193,115,0) 72%)" }}></div>
            </div>
            <div aria-hidden="true" style={{ position: "absolute", inset: "-10.8%", animation: "v5-spin-rev 11s linear infinite" }}>
              <div style={{ position: "absolute", left: "50%", top: "0", width: "10%", height: "10%", transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,248,230,1) 0%, rgba(232,193,115,.55) 40%, rgba(232,193,115,0) 70%)" }}></div>
            </div>
            <img src="/uploads/skpn-logo.png" alt="श्रीकृष्ण पाथेय न्यास" style={{ position: "relative", width: "100%", height: "auto", borderRadius: "50%", display: "block", filter: "drop-shadow(0 14px 40px rgba(0,0,0,.6))" }} />
          </div>

          <p data-reveal style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "clamp(16px,1.9vw,19px)", lineHeight: "1.6", color: "#E8C173", letterSpacing: ".02em" }}>{t.org}</p>

          <h1 data-reveal style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(32px,5vw,58px)", lineHeight: "1.24", color: "#FFF9EC", maxWidth: "20ch", textWrap: "balance", textShadow: "0 2px 30px rgba(0,0,0,.4)" }}>{t.heroTitle}</h1>

          {/* The dates are final, so the hero states them whether or not registration is open. */}
          <div data-reveal style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ width: "38px", height: "1px", background: "rgba(232,193,115,.7)" }}></span>
            <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontSize: "clamp(16px,2vw,20px)", lineHeight: "1.6", color: "#F5E5C2" }}>{heroDateHead}<br data-e="datebreak" />{heroDateTail}</span>
            <span style={{ width: "38px", height: "1px", background: "rgba(232,193,115,.7)" }}></span>
          </div>

          <p data-reveal style={{ margin: "0", maxWidth: "44ch", fontSize: "clamp(16.5px,1.9vw,19px)", lineHeight: "1.85", color: "#E9E4D8" }}>{t.heroLede}</p>

          {/* Both calls to action lead to closed routes — register and rules — so the row goes. */}
          {competitionOpen ? (
          <div data-reveal data-e="ctarow" style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", width: "100%", maxWidth: "540px", marginTop: "8px" }}>
            <a href={primaryHref} data-e="cta" style={{ padding: "17px 34px", minHeight: "58px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: "#1E1503", borderRadius: "999px", fontSize: "18px", fontWeight: "600", lineHeight: "1.5", boxShadow: "0 14px 36px rgba(232,193,115,.28)", transition: "transform .2s ease,box-shadow .2s ease" }}>{t.ctaPrimary}</a>
            <Link href="/rules" data-e="cta" style={{ padding: "17px 30px", minHeight: "58px", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,249,236,.42)", borderRadius: "999px", fontSize: "18px", lineHeight: "1.5", color: "#FFF9EC", transition: "background .2s ease" }}>{t.ctaSecondary}</Link>
          </div>
          ) : null}
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

      <VidyaKalaTeaser lang={lang} />

      <ProfessionsRail lang={lang} />

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

      {/* The three-date timeline. The dates are final, so it shows whether or not registration is
          open: before the CTAs come back it is the most useful thing on the page. */}
      <section data-e="pad section" style={{ maxWidth: "1220px", margin: "0 auto", padding: "88px 30px" }}>
        <ol data-e="datesgrid" style={{ margin: "0", padding: "0", listStyle: "none", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "20px" }}>
          {dates.map((d, dIndex) => (
            <li key={dIndex} data-reveal style={{ position: "relative", overflow: "hidden", padding: "30px 30px 32px", borderRadius: "24px", background: `${d.bg}`, border: `1px solid ${d.border}`, boxShadow: "0 2px 4px rgba(20,32,62,.04),0 16px 38px rgba(20,32,62,.07)", display: "flex", flexDirection: "column", gap: "14px" }}>
              <span aria-hidden="true" style={{ position: "absolute", right: "-46px", top: "-46px", width: "170px", height: "170px", borderRadius: "50%", background: `${d.blob}` }}></span>
              <span style={{ position: "relative", display: "flex", alignItems: "center", gap: "12px" }}>
                <span aria-hidden="true" style={{ width: "13px", height: "13px", flex: "0 0 auto", borderRadius: "50%", background: `${d.dotBg}`, boxShadow: `0 0 0 4px ${d.dotHalo}` }}></span>
                <span aria-hidden="true" style={{ flex: "1 1 auto", height: "1px", background: `linear-gradient(90deg, ${d.rule} 0%, rgba(138,96,21,0) 100%)` }}></span>
                <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontSize: "20px", fontWeight: "600", letterSpacing: ".02em", fontVariantNumeric: "tabular-nums", color: `${d.stepFg}` }}>{d.step}</span>
              </span>
              {/* The section heading is gone, so each card's own heading is the top level here. */}
              <h2 style={{ position: "relative", margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "20px", lineHeight: "1.5", color: `${d.stepFg}` }}>{d.note}</h2>
              <span style={{ position: "relative", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(25px,3vw,32px)", lineHeight: "1.24", color: "#14203E", fontVariantNumeric: "tabular-nums", textWrap: "balance" }}>{d.when}</span>
              {d.what ? <span style={{ position: "relative", fontSize: "18px", lineHeight: "1.6", color: "#161C2E" }}>{d.what}</span> : null}
            </li>
          ))}
        </ol>
      </section>

      {competitionOpen ? <CtaBox lang={lang} signedIn={signedIn} hasSat={hasSat} /> : null}

      <SiteFooter lang={lang} />
    </div>
  );
}
