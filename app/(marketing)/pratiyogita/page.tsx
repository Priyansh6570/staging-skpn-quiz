"use client";

import Link from "next/link";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CtaBox from "@/components/CtaBox";
import PageAura from "@/components/PageAura";
import { useCompetitionOpen, useLang, useSession } from "@/components/AppProviders";
import { custom, strings } from "@/lib/i18n";

const CAT_STYLE = {
  school: { bg: "linear-gradient(150deg,#FFFFFF 0%,#FDF6E8 100%)", border: "#EFE0C4", blob: "radial-gradient(circle,rgba(232,193,115,.24) 0%,rgba(232,193,115,0) 70%)", iconBg: "#F4EBD8", iconFg: "#8A6015", pillBg: "#F4EBD8", pillFg: "#6B4A10" },
  college: { bg: "linear-gradient(150deg,#FFFFFF 0%,#F0F3FB 100%)", border: "#DDE3F2", blob: "radial-gradient(circle,rgba(39,64,139,.16) 0%,rgba(39,64,139,0) 70%)", iconBg: "#E7ECF8", iconFg: "#27408B", pillBg: "#E7ECF8", pillFg: "#22366F" },
};
const F_ACCENTS = ["#E8C173", "#27408B", "#8A6015", "#3F6B58", "#B4483A"];

// prizeLine breaks after the count clause on narrow screens. Hindi opens with the count, so the
// clause is its first four words; English closes with it, and breaks after "each" instead.
const PRIZE_BREAK = { hi: 4, en: 7 };

export default function PratiyogitaPage() {
  const { lang, toggle: toggleLang } = useLang();
  const { session } = useSession();
  const competitionOpen = useCompetitionOpen();
  const s = strings(lang).Pratiyogita.S;
  const c = custom(lang);
  const signedIn = session.signedIn;
  const hasCerts = session.hasCertificates;
  const hasSat = session.hasCertificates;

  const t = { ...s, ctaPrimary: signedIn ? (hasSat ? s.ctaAgain : s.ctaTake) : s.ctaPrimary };
  const primaryHref = signedIn ? (hasSat ? "/certificates" : "/quiz") : "/register";
  const categories = s.categories.map((c, i) => ({
    ...c,
    ...CAT_STYLE[i === 0 ? "school" : "college"],
    isSchool: i === 0,
    isCollege: i !== 0,
  }));
  // The head keeps the space it ends on: the <br> is display:none above 980px, and without it the
  // clause and the amount would run together on one line.
  const prizeCut = t.prizeLine.split(" ", PRIZE_BREAK[lang]).join(" ").length + 1;
  const prizeHead = t.prizeLine.slice(0, prizeCut);
  const prizeTail = t.prizeLine.slice(prizeCut);
  const format = s.format.map((f, i) =>
    i === 0
      ? { value: s.formatFirstValue, label: s.formatFirstLabel, accent: F_ACCENTS[0] }
      : { ...f, accent: F_ACCENTS[i % F_ACCENTS.length] });
  // The opening row has no separate occasion to name any more — the competition's own start is the
  // occasion — so `what` and `note` carry the same words there. Printed once, not twice.
  const dates = s.dates.map((d, i) => ({
    ...d,
    what: d.what === d.note ? "" : d.what,
    dotBg: i === 0 ? "#E8C173" : "#FBF7F0",
    dotBorder: i === 0 ? "#B98F3C" : "#DCD1BC",
    line: i === s.dates.length - 1 ? "transparent" : "#E3D9C6",
  }));
  return (
    <div data-page="Pratiyogita" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "hidden", isolation: "isolate" }}>
      <PageAura />
      <SiteHeader lang={lang} active="pratiyogita" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />

      <section style={{ position: "relative", overflow: "hidden", background: "#070B1E" }}>
        <img src="/assets/cosmic-spiral.png" alt="" width="924" height="540" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 40%", opacity: ".55" }} />
        <div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg, rgba(7,11,30,.62) 0%, rgba(7,11,30,.93) 100%)" }}></div>
        <div data-e="pad hero" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "76px 30px 62px" }}>
          <p style={{ margin: "0 0 14px", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "17px", letterSpacing: ".01em", color: "#E8C173", lineHeight: "1.9" }}>{t.kicker}</p>
          <h1 style={{ margin: "0 0 18px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(29px,4.4vw,50px)", lineHeight: "1.26", color: "#FFF9EC", maxWidth: "22ch", textWrap: "balance" }}>{t.title}</h1>
          <p style={{ margin: "0 0 30px", maxWidth: "54ch", fontSize: "clamp(16.5px,1.9vw,19px)", lineHeight: "1.85", color: "#E9E4D8" }}>{t.lede}</p>
          {/* Both calls to action lead to closed routes — register and rules — so the row goes. */}
          {competitionOpen ? (
          <div data-e="ctarow" style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <a href={primaryHref} data-e="cta" style={{ padding: "16px 32px", minHeight: "56px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: "#1E1503", borderRadius: "999px", fontSize: "18px", fontWeight: "600", lineHeight: "1.5", whiteSpace: "nowrap", transition: "transform .2s ease" }}>{t.ctaPrimary}</a>
            <Link href="/rules" data-e="cta" style={{ padding: "16px 28px", minHeight: "56px", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,249,236,.4)", borderRadius: "999px", fontSize: "18px", lineHeight: "1.5", whiteSpace: "nowrap", color: "#FFF9EC" }}>{t.ctaSecondary}</Link>
          </div>
          ) : null}
        </div>
      </section>

      <section style={{ position: "relative", overflow: "hidden", background: "#0B1226", borderBottom: "1px solid rgba(232,193,115,.22)" }}>
        <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "-60%", width: "640px", height: "640px", transform: "translateX(-50%)", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.16) 0%,rgba(232,193,115,0) 68%)", animation: "pr-glow 9s ease-in-out infinite" }}></div>
        <div data-e="pad" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "56px 30px" }}>
          <p style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(26px,3.6vw,40px)", lineHeight: "1.35", color: "#E8C173", textWrap: "balance" }}>{prizeHead}<br data-e="prizebreak" />{prizeTail}</p>
        </div>
      </section>

      <section data-e="pad section" style={{ maxWidth: "1220px", margin: "0 auto", padding: "80px 30px" }}>
        <h2 data-reveal style={{ margin: "0 0 30px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(24px,3.2vw,32px)", lineHeight: "1.35", color: "#14203E" }}>{t.whoTitle}</h2>
        <div data-g="two" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "20px" }}>
          {categories.map((c, cIndex) => (
            <div key={cIndex} data-e="card" style={{ position: "relative", overflow: "hidden", padding: "34px", background: `${c.bg}`, borderRadius: "24px", border: `1px solid ${c.border}`, boxShadow: "0 2px 4px rgba(20,32,62,.05),0 16px 36px rgba(20,32,62,.07)", display: "flex", flexDirection: "column", gap: "16px", transition: "transform .18s ease" }}>
              <span aria-hidden="true" style={{ position: "absolute", right: "-30px", top: "-30px", width: "150px", height: "150px", borderRadius: "50%", background: `${c.blob}` }}></span>
              <span style={{ position: "relative", width: "52px", height: "52px", borderRadius: "16px", background: `${c.iconBg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke={c.iconFg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}>
                  {c.isSchool ? (
                    <g><path d="M4 13 16 6l12 7-12 7z"></path><path d="M9 16v7c0 1.6 3.1 3 7 3s7-1.4 7-3v-7"></path></g>
                  ) : null}
                  {c.isCollege ? (
                    <g><rect x="5" y="12" width="22" height="15" rx="2"></rect><path d="M11 27v-6h4v6M20 17h3M20 21h3M9 12V7h14v5"></path></g>
                  ) : null}
                </svg>
              </span>
              <h3 style={{ position: "relative", margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "25px", lineHeight: "1.4", color: "#14203E" }}>{c.name}</h3>
              <p style={{ position: "relative", margin: "0", fontSize: "17.5px", lineHeight: "1.8", color: "#161C2E" }}>{c.who}</p>
              <span style={{ position: "relative", marginTop: "6px", alignSelf: "flex-start", padding: "9px 18px", borderRadius: "999px", background: `${c.pillBg}`, color: `${c.pillFg}`, fontSize: "16px", lineHeight: "1.6", fontWeight: "600" }}>{c.count}</span>
            </div>
          ))}
        </div>
            <div data-reveal data-e="card" style={{ position: "relative", overflow: "hidden", marginTop: "30px", padding: "34px", borderRadius: "24px", background: "linear-gradient(150deg,#FFFFFF 0%,#FDF6E8 100%)", border: "1px solid #EFE0C4", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 16px 36px rgba(20,32,62,.07)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center" }}>
          <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "-70%", width: "620px", height: "620px", transform: "translateX(-50%)", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.3) 0%,rgba(232,193,115,0) 68%)", animation: "pr-glow 10s ease-in-out infinite" }}></div>
          <span style={{ position: "relative", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "16.5px", letterSpacing: ".01em", color: "#8A6015", lineHeight: "1.8" }}>{t.examEyebrow}</span>
          <p style={{ position: "relative", margin: "0", maxWidth: "34ch", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(20px,2.6vw,28px)", lineHeight: "1.45", color: "#14203E", textWrap: "balance" }}>{c.pratiyogita.examTitle}</p>
          <div style={{ position: "relative", marginTop: "14px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
            {c.pratiyogita.examNames.map((e, eIndex) => (
              <span key={eIndex} style={{ padding: "11px 22px", borderRadius: "999px", border: "1px solid #E7D6B2", background: "#F7EEDA", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "18px", lineHeight: "1.5", color: "#6B4A10", whiteSpace: "nowrap" }}>{e}</span>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "#F6F0E4", borderTop: "1px solid #EFE5D3", borderBottom: "1px solid #EFE5D3" }}>
        <div data-e="pad section" style={{ maxWidth: "1220px", margin: "0 auto", padding: "76px 30px" }}>
          <h2 data-reveal style={{ margin: "0 0 32px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(24px,3.2vw,32px)", lineHeight: "1.35", color: "#14203E" }}>{t.formatTitle}</h2>
          <dl style={{ margin: "0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "16px" }}>
            {format.map((f, fIndex) => (
              <div key={fIndex} data-e="card" style={{ padding: "26px 28px", background: "#FFFFFF", borderRadius: "20px", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 12px 26px rgba(20,32,62,.05)", display: "flex", flexDirection: "column", gap: "10px", borderTop: `3px solid ${f.accent}` }}>
                <dt style={{ fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "29px", lineHeight: "1.25", color: "#14203E" }}>{f.value}</dt>
                <dd style={{ margin: "0", fontSize: "16px", lineHeight: "1.75", color: "#161C2E" }}>{f.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The तिथियाँ timeline. No date is announced, so the whole section goes. */}
      {competitionOpen ? (
      <section data-e="pad section" style={{ maxWidth: "1220px", margin: "0 auto", padding: "80px 30px" }}>
        <h2 data-reveal style={{ margin: "0 0 34px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(24px,3.2vw,32px)", lineHeight: "1.35", color: "#14203E", textAlign: "center" }}>{t.datesTitle}</h2>
        <ol style={{ margin: "0 auto", padding: "0", maxWidth: "420px", listStyle: "none", display: "flex", flexDirection: "column" }}>
          {dates.map((d, dIndex) => (
            <li key={dIndex} data-reveal style={{ position: "relative", padding: "0 0 30px 40px", display: "flex", flexDirection: "column", gap: "5px" }}>
              <span aria-hidden="true" style={{ position: "absolute", left: "9px", top: "24px", bottom: "0", width: "1px", background: `${d.line}` }}></span>
              <span aria-hidden="true" style={{ position: "absolute", left: "0", top: "7px", width: "19px", height: "19px", borderRadius: "50%", background: `${d.dotBg}`, border: `2px solid ${d.dotBorder}` }}></span>
              <span style={{ fontSize: "17px", lineHeight: "1.6", color: "#8A6015" }}>{d.note}</span>
              {d.what ? <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "500", fontSize: "21px", lineHeight: "1.5", color: "#161C2E" }}>{d.what}</span> : null}
              <span style={{ fontSize: "16px", lineHeight: "1.75", color: "#161C2E", fontVariantNumeric: "tabular-nums" }}>{d.when}</span>
            </li>
          ))}
        </ol>
      </section>
      ) : null}

      {competitionOpen ? <CtaBox lang={lang} signedIn={signedIn} hasSat={hasSat} /> : null}

      <SiteFooter lang={lang} />
    </div>
  );
}
