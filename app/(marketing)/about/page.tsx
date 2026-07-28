"use client";

import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { LeadershipBoard } from "@/components/Leadership";
import PageAura from "@/components/PageAura";
import { useLang, useSession } from "@/components/AppProviders";
import { strings } from "@/lib/i18n";

const ACCENTS = [
  ["#E8C173", "#FAF1DC", "#7A5412"],
  ["#27408B", "#E7ECF8", "#22366F"],
  ["#8A6015", "#F6EBD6", "#6B4A10"],
  ["#3F6B58", "#E7F1EC", "#2E5142"],
];

export default function AboutPage() {
  const { lang, toggle: toggleLang } = useLang();
  const { session } = useSession();
  const t = strings(lang).About.S;
  const objects = t.objects.map((text, i) => {
    const a = ACCENTS[i % ACCENTS.length];
    return { text, n: String(i + 1).padStart(2, "0"), accent: a[0], tint: a[1], ink: a[2] };
  });
  const signedIn = session.signedIn;
  const hasCerts = session.hasCertificates;
  return (
    <div data-page="About" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "hidden", isolation: "isolate" }}>
      <PageAura />
      <SiteHeader lang={lang} active="about" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />

      <section style={{ position: "relative", overflow: "hidden", background: "#070B1E" }}>
        <Image src="/assets/teaching.png" alt="" width={2560} height={1440} sizes="100vw" loading="eager" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 28%", opacity: ".55" }} />
        <div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg, rgba(7,11,30,.66) 0%, rgba(7,11,30,.92) 100%)" }}></div>
        <div data-e="pad hero" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "76px 30px 66px" }}>
          <p style={{ margin: "0 0 14px", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "17px", letterSpacing: ".01em", color: "#E8C173", lineHeight: "1.9" }}>{t.kicker}</p>
          <h1 style={{ margin: "0 0 18px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(30px,4.6vw,52px)", lineHeight: "1.26", color: "#FFF9EC", maxWidth: "22ch", textWrap: "balance" }}>{t.title}</h1>
          <p style={{ margin: "0", maxWidth: "56ch", fontSize: "clamp(16.5px,1.9vw,19px)", lineHeight: "1.85", color: "#E9E4D8" }}>{t.lede}</p>
        </div>
      </section>

      <LeadershipBoard lang={lang} />

      <section style={{ background: "#F6F0E4", borderTop: "1px solid #EFE5D3", borderBottom: "1px solid #EFE5D3" }}>
        <div data-e="pad section" style={{ maxWidth: "1220px", margin: "0 auto", padding: "76px 30px" }}>
          <h2 data-reveal style={{ margin: "0 0 34px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(24px,3.2vw,32px)", lineHeight: "1.35", color: "#14203E" }}>{t.objectsTitle}</h2>
          <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "16px" }}>
            {objects.map((o, oIndex) => (
              <li key={oIndex} data-reveal data-e="card" style={{ position: "relative", overflow: "hidden", padding: "26px 28px", background: "#FFFFFF", borderRadius: "20px", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 12px 28px rgba(20,32,62,.06)", display: "flex", flexDirection: "column", gap: "14px", transition: "transform .18s ease,box-shadow .18s ease" }}>
                <span aria-hidden="true" style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: "4px", background: `${o.accent}` }}></span>
                <span style={{ width: "38px", height: "38px", flex: "0 0 auto", borderRadius: "12px", background: `${o.tint}`, color: `${o.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "16px" }}>{o.n}</span>
                <span style={{ fontSize: "16.5px", lineHeight: "1.8", color: "#161C2E" }}>{o.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section data-e="pad section" data-g="two" style={{ maxWidth: "1220px", margin: "0 auto", padding: "80px 30px", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "44px", alignItems: "center" }}>
        <div>
          <h2 data-reveal style={{ margin: "0 0 16px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(24px,3.2vw,32px)", lineHeight: "1.35", color: "#14203E" }}>{t.sandipaniTitle}</h2>
          <p style={{ margin: "0 0 16px", fontSize: "17.5px", lineHeight: "1.9", color: "#161C2E" }}>{t.sandipaniP1}</p>
          <p style={{ margin: "0", fontSize: "17.5px", lineHeight: "1.9", color: "#161C2E" }}>{t.sandipaniP2}</p>
        </div>
        <div style={{ position: "relative", overflow: "hidden", borderRadius: "24px", boxShadow: "0 18px 44px rgba(20,32,62,.18)" }}>
          <img src="/assets/cosmic-spiral.png" alt={t.illoAlt} width="924" height="540" loading="lazy" decoding="async" style={{ display: "block", width: "100%", height: "auto", aspectRatio: "16/10", objectFit: "cover" }} />
        </div>
      </section>

      <section id="sampark" data-e="pad section" style={{ maxWidth: "1220px", margin: "0 auto", padding: "80px 30px", scrollMarginTop: "96px" }}>
        <div data-e="card" style={{ position: "relative", overflow: "hidden", maxWidth: "760px", padding: "34px", borderRadius: "24px", background: "linear-gradient(150deg,#FFFFFF 0%,#FDF7EA 100%)", border: "1px solid #EFE0C4", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 18px 40px rgba(20,32,62,.08)", display: "flex", flexDirection: "column", gap: "22px" }}>
          <div aria-hidden="true" style={{ position: "absolute", right: "-40px", top: "-40px", width: "180px", height: "180px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.28) 0%,rgba(232,193,115,0) 70%)" }}></div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontSize: "15.5px", letterSpacing: ".01em", color: "#161C2E", lineHeight: "1.8" }}>{t.officeLabel}</span>
            <span style={{ fontSize: "18px", lineHeight: "1.7", color: "#161C2E" }}>{t.officeValue}</span>
          </div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontSize: "15.5px", letterSpacing: ".01em", color: "#161C2E", lineHeight: "1.8" }}>{t.phoneLabel}</span>
            <a href="tel:+917554535064" style={{ fontFamily: "'Noto Serif Devanagari',serif", fontSize: "clamp(19px,2.4vw,25px)", lineHeight: "1.5", color: "#14203E", textDecoration: "none" }}>{t.phoneValue}</a>
          </div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontSize: "15.5px", letterSpacing: ".01em", color: "#161C2E", lineHeight: "1.8" }}>{t.emailLabel}</span>
            <a href="mailto:shrikrishnapatheynyas@gmail.com" style={{ fontFamily: "'Noto Serif Devanagari',serif", fontSize: "clamp(19px,2.4vw,25px)", lineHeight: "1.5", color: "#14203E", wordBreak: "break-word" }}>shrikrishnapatheynyas@gmail.com</a>
          </div>
          <a href="mailto:shrikrishnapatheynyas@gmail.com" style={{ position: "relative", minHeight: "56px", padding: "16px 30px", borderRadius: "999px", background: "#14203E", color: "#FDF3DF", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "17.5px", fontWeight: "600", lineHeight: "1.5", textDecoration: "none", alignSelf: "flex-start" }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FDF3DF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}><rect x="3" y="5" width="18" height="14" rx="2.5"></rect><path d="M3.5 6.5 12 13l8.5-6.5"></path></svg>
            {t.writeToUs}
          </a>
        </div>
      </section>

      <SiteFooter lang={lang} />
    </div>
  );
}
