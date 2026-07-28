"use client";

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageAura from "@/components/PageAura";
import { useLang, useSession } from "@/components/AppProviders";
import { custom, strings } from "@/lib/i18n";

export default function NotFound() {
  const { lang, toggle: toggleLang } = useLang();
  const { session } = useSession();
  const s = strings(lang);
  const copy = custom(lang).notFound;

  return (
    <div data-page="NotFound" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "clip", isolation: "isolate" }}>
      <PageAura />
      <SiteHeader lang={lang} onToggleLang={toggleLang} signedIn={session.signedIn} hasCertificates={session.hasCertificates} />

      <section data-e="pad section" style={{ maxWidth: "1220px", margin: "0 auto", padding: "96px 30px 110px" }}>
        <div data-e="card" style={{ maxWidth: "640px", margin: "0 auto", padding: "42px 38px", background: "#FFFFFF", borderRadius: "24px", border: "1px solid #EFE0C4", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 18px 40px rgba(20,32,62,.08)", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
          <span aria-hidden="true" style={{ fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(44px,7vw,64px)", lineHeight: "1.1", color: "#E8C173" }}>404</span>
          <h1 style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(23px,3vw,30px)", lineHeight: "1.35", color: "#14203E", textWrap: "balance" }}>{copy.title}</h1>
          <p style={{ margin: "0", maxWidth: "44ch", fontSize: "17px", lineHeight: "1.85", color: "#161C2E" }}>{copy.body}</p>
          <Link href="/" data-e="cta" style={{ minHeight: "56px", padding: "16px 30px", borderRadius: "999px", background: "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: "#1E1503", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "17.5px", fontWeight: "600", lineHeight: "1.5", textDecoration: "none", boxShadow: "0 10px 26px rgba(232,193,115,.28)" }}>{s.SiteHeader.NAV[0].label}</Link>
        </div>
      </section>

      <SiteFooter lang={lang} />
    </div>
  );
}
