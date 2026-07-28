"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageAura from "@/components/PageAura";
import { useLang, useSession } from "@/components/AppProviders";
import { strings } from "@/lib/i18n";

export default function LegalDocument({ which }: { which: "privacy" | "terms" }) {
  const router = useRouter();
  const { lang, toggle: toggleLang } = useLang();
  const { session } = useSession();
  const t = strings(lang).Legal.S;

  // The export tab-switched in place behind ?doc=terms. A government legal notice needs a real
  // URL, so the tabs navigate between two routes instead.
  const isPrivacy = which !== "terms";
  const doc = isPrivacy ? t.privacy : t.terms;
  const privacyOn = isPrivacy;
  const termsOn = !isPrivacy;
  const privacyFg = isPrivacy ? "#14203E" : "#161C2E";
  const termsFg = isPrivacy ? "#161C2E" : "#14203E";
  const privacyLine = isPrivacy ? "#8A6015" : "transparent";
  const termsLine = isPrivacy ? "transparent" : "#8A6015";
  const showPrivacy = () => router.push("/privacy");
  const showTerms = () => router.push("/terms");
  const signedIn = session.signedIn;
  const hasCerts = session.hasCertificates;
  return (
    <div data-page="Legal" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "clip", isolation: "isolate" }}>
      <PageAura />
      <SiteHeader lang={lang} active="home" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />

      <section data-e="pad" style={{ maxWidth: "880px", margin: "0 auto", padding: "48px 30px 78px" }}>
        <div role="tablist" style={{ display: "flex", gap: "24px", borderBottom: "1px solid #E8DFCE", marginBottom: "34px" }}>
          <button type="button" role="tab" aria-selected={privacyOn} onClick={showPrivacy} style={{ padding: "10px 2px 14px", minHeight: "48px", background: "none", border: "0", borderBottom: `2px solid ${privacyLine}`, cursor: "pointer", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "18.5px", lineHeight: "1.5", color: `${privacyFg}` }}>{t.privacyTab}</button>
          <button type="button" role="tab" aria-selected={termsOn} onClick={showTerms} style={{ padding: "10px 2px 14px", minHeight: "48px", background: "none", border: "0", borderBottom: `2px solid ${termsLine}`, cursor: "pointer", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "18.5px", lineHeight: "1.5", color: `${termsFg}` }}>{t.termsTab}</button>
        </div>

        <h1 style={{ margin: "0 0 12px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(25px,3.6vw,34px)", lineHeight: "1.3", color: "#14203E" }}>{doc.title}</h1>
        <p style={{ margin: "0 0 32px", maxWidth: "60ch", fontSize: "17.5px", lineHeight: "1.85", color: "#161C2E" }}>{doc.lede}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          {doc.sections.map((s, sIndex) => (
            <section key={sIndex} data-e="card" style={{ padding: "26px 30px", background: "#FFFFFF", borderRadius: "20px", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 12px 28px rgba(20,32,62,.05)" }}>
              <h2 data-reveal style={{ margin: "0 0 12px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "20px", lineHeight: "1.45", color: "#14203E" }}>{s.title}</h2>
              <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                {s.points.map((p, pIndex) => (
                  <li key={pIndex} data-reveal style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <span aria-hidden="true" style={{ marginTop: "9px", width: "7px", height: "7px", flex: "0 0 auto", borderRadius: "50%", background: "#E8C173" }}></span>
                    <span style={{ fontSize: "17px", lineHeight: "1.85", color: "#161C2E" }}>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p style={{ margin: "24px 0 0", fontSize: "16.5px", lineHeight: "1.8", color: "#161C2E" }}>{t.questions} <Link href="/about#sampark">{t.contactLink}</Link></p>
      </section>

      <SiteFooter lang={lang} />
    </div>
  );
}
