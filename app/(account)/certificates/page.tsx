"use client";

import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLang, useSession, useShell } from "@/components/AppProviders";
import { strings } from "@/lib/i18n";

const CERTIFICATE_SRC = "/uploads/cert.jpeg";

// The on-screen overlay's geometry, as fractions of the certificate rather than container query
// units, so the exported file and the preview place the name identically.
const NAME_TOP = 0.49;          // top: 49%
const NAME_SIZE = 0.042;        // font-size: 4.2cqw, and the container is the image width
const NAME_LINE_HEIGHT = 1.55;
const NAME_SIDE_INSET = 0.12;   // left/right: 12%
const NAME_COLOUR = "#8C1A20";

export default function CertificatesPage() {
  const { lang, toggle: toggleLang } = useLang();
  const { session } = useSession();
  const { busy, showError } = useShell();
  const t = strings(lang).Certificates.S;
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setName(data.fullName); });
    return () => { cancelled = true; };
  }, []);

  // Always the signed-in student. Never a query parameter — a name that can be typed into the URL
  // is a certificate generator for any name at all.
  const studentName = name || session.name || "";
  const fileName = "shri-krishna-pathey-nyas-certificate.png";
  const signedIn = session.signedIn;
  const hasCerts = session.hasCertificates;

  const download = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!studentName) return;

    await busy(
      (async () => {
        const image = new Image();
        image.src = CERTIFICATE_SRC;
        const fontSizeFor = (width: number) => width * NAME_SIZE;

        // Both waits matter: fonts.ready alone can resolve before a face this canvas has never
        // painted is available, and Devanagari silently falls back to a Latin face if it is not.
        await Promise.all([
          image.decode(),
          document.fonts.load('600 64px "Noto Sans Devanagari"'),
          document.fonts.ready,
        ]);

        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");

        ctx.drawImage(image, 0, 0);

        let size = fontSizeFor(canvas.width);
        const maxWidth = canvas.width * (1 - NAME_SIDE_INSET * 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = NAME_COLOUR;
        if ("letterSpacing" in ctx) ctx.letterSpacing = `${size * 0.01}px`;

        // The overlay truncates with an ellipsis; on a certificate a shortened name is worse than
        // a slightly smaller one, so a long name shrinks to fit instead (AUDIT.md §6.6).
        ctx.font = `600 ${size}px "Noto Sans Devanagari", sans-serif`;
        while (ctx.measureText(studentName).width > maxWidth && size > fontSizeFor(canvas.width) * 0.5) {
          size -= 1;
          ctx.font = `600 ${size}px "Noto Sans Devanagari", sans-serif`;
        }

        const y = canvas.height * NAME_TOP + (size * NAME_LINE_HEIGHT) / 2;
        ctx.fillText(studentName, canvas.width / 2, y, maxWidth);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("canvas export failed");

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      })().catch(() => showError("server")),
    );
  };
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
            <a href={CERTIFICATE_SRC} download={fileName} onClick={download} style={{ minHeight: "54px", padding: "15px 28px", border: "0", borderRadius: "999px", background: "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: "#1E1503", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "17px", fontWeight: "600", lineHeight: "1.5", textDecoration: "none", boxShadow: "0 10px 26px rgba(232,193,115,.28)", transition: "transform .2s ease" }}>
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
