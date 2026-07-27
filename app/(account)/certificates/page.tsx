"use client";

import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLang, useSession } from "@/components/AppProviders";
import { strings } from "@/lib/i18n";

export default function CertificatesPage() {
  const { lang, toggle: toggleLang } = useLang();
  const { session } = useSession();
  const t = strings(lang).Certificates.S;
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setName(data.fullName); });
    return () => { cancelled = true; };
  }, []);

  const studentName = name || session.name || "";
  const fileName = "shri-krishna-pathey-nyas-certificate.jpeg";
  const signedIn = session.signedIn;
  const hasCerts = session.hasCertificates;
  return (
    <div data-page="Certificates" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "hidden" }}>
      <SiteHeader lang={lang} active="certificates" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />

      <section data-e="pad" style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 30px 78px" }}>
        <h1 style={{ margin: "0 0 26px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(25px,3.6vw,34px)", lineHeight: "1.3", color: "#14203E" }}>{t.title}</h1>

        <div data-e="card" style={{ padding: "26px", background: "#FFFFFF", borderRadius: "22px", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 16px 34px rgba(20,32,62,.07)" }}>
          <div style={{ containerType: "inline-size", position: "relative", overflow: "hidden", borderRadius: "14px", aspectRatio: "1600/1131", background: "#FFFDF7" }}>
            <img src="uploads/cert.jpeg" alt={t.certAlt} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            <p style={{ position: "absolute", left: "12%", right: "12%", top: "49%", margin: "0", textAlign: "center", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "4.2cqw", lineHeight: "1.55", letterSpacing: ".01em", color: "#8C1A20", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{studentName}</p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "22px" }}>
            <a href="uploads/cert.jpeg" download={fileName} style={{ minHeight: "54px", padding: "15px 28px", border: "0", borderRadius: "999px", background: "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: "#1E1503", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "17px", fontWeight: "600", lineHeight: "1.5", textDecoration: "none", boxShadow: "0 10px 26px rgba(232,193,115,.28)", transition: "transform .2s ease" }}>
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#1E1503" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}><path d="M12 4v11m0 0-4.2-4.2M12 15l4.2-4.2M4.5 19.5h15"></path></svg>
              {t.download}
            </a>
          </div>
        </div>
      </section>

      <SiteFooter lang={lang} />
    </div>
  );
}
