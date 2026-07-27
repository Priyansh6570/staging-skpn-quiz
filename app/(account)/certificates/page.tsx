"use client";

import { useCallback, useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Loader from "@/components/Loader";
import { useLang, useSession, useShell } from "@/components/AppProviders";
import { custom, strings } from "@/lib/i18n";

const CERTIFICATE_SRC = "/uploads/cert.jpeg";
const FILE_NAME = "Medhavi Chhatravritti Pratiyogita Pramaan Patra.pdf";

// The on-screen overlay's geometry, as fractions of the certificate rather than container query
// units, so the exported file and the preview place the name identically.
const NAME_TOP = 0.49;          // top: 49%
const NAME_SIZE = 0.042;        // font-size: 4.2cqw, and the container is the image width
const NAME_LINE_HEIGHT = 1.55;
const NAME_SIDE_INSET = 0.12;   // left/right: 12%
const NAME_COLOUR = "#8C1A20";

const A4_LANDSCAPE = { width: 297, height: 210 }; // mm
const DOWNLOAD_LOCK_MS = 5000;
const MAX_IMAGE_RETRIES = 2;

/** Draws the certificate with the name composited, at the source image's own resolution. */
async function composite(studentName: string, src: string): Promise<HTMLCanvasElement> {
  const image = new Image();
  image.src = src;

  // fonts.ready alone can resolve before a face this canvas has never painted is available, and
  // Devanagari then silently falls back to a Latin one.
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

  const base = canvas.width * NAME_SIZE;
  let size = base;
  const maxWidth = canvas.width * (1 - NAME_SIDE_INSET * 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = NAME_COLOUR;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${size * 0.01}px`;

  // The overlay truncates with an ellipsis; on a certificate a shortened name is worse than a
  // slightly smaller one, so a long name shrinks to fit instead (AUDIT.md §6.6).
  ctx.font = `600 ${size}px "Noto Sans Devanagari", sans-serif`;
  while (ctx.measureText(studentName).width > maxWidth && size > base * 0.5) {
    size -= 1;
    ctx.font = `600 ${size}px "Noto Sans Devanagari", sans-serif`;
  }

  ctx.fillText(
    studentName,
    canvas.width / 2,
    canvas.height * NAME_TOP + (size * NAME_LINE_HEIGHT) / 2,
    maxWidth,
  );
  return canvas;
}

export default function CertificatesPage() {
  const { lang, toggle: toggleLang } = useLang();
  const { session } = useSession();
  const { busy, showError } = useShell();
  const t = strings(lang).Certificates.S;
  const c = custom(lang).certificate;
  const [name, setName] = useState("");
  const [imageState, setImageState] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);
  const [justDownloaded, setJustDownloaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setName(data.fullName); });
    return () => { cancelled = true; };
  }, []);

  // Two retries with backoff before the frame admits defeat, and even then it offers a control
  // rather than leaving a blank box.
  useEffect(() => {
    if (imageState !== "loading") return;
    let cancelled = false;
    const image = new Image();
    image.src = attempt ? `${CERTIFICATE_SRC}?retry=${attempt}` : CERTIFICATE_SRC;
    image
      .decode()
      .then(() => { if (!cancelled) setImageState("ready"); })
      .catch(() => {
        if (cancelled) return;
        if (attempt < MAX_IMAGE_RETRIES) {
          setTimeout(() => { if (!cancelled) setAttempt((n) => n + 1); }, 400 * 2 ** attempt);
        } else {
          setImageState("failed");
        }
      });
    return () => { cancelled = true; };
  }, [imageState, attempt]);

  const retryImage = useCallback(() => {
    setAttempt(0);
    setImageState("loading");
  }, []);

  useEffect(() => {
    if (!justDownloaded) return;
    const timer = setTimeout(() => setJustDownloaded(false), DOWNLOAD_LOCK_MS);
    return () => clearTimeout(timer);
  }, [justDownloaded]);

  // Always the signed-in student. Never a query parameter — a name that can be typed into the URL
  // is a certificate generator for any name at all.
  const studentName = name || session.name || "";
  const fileName = FILE_NAME;
  const signedIn = session.signedIn;
  const hasCerts = session.hasCertificates;

  const download = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!studentName || justDownloaded) return;

    await busy(
      (async () => {
        const canvas = await composite(studentName, CERTIFICATE_SRC);
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

        // Fit the certificate inside the page without distorting it.
        const scale = Math.min(A4_LANDSCAPE.width / canvas.width, A4_LANDSCAPE.height / canvas.height);
        const width = canvas.width * scale;
        const height = canvas.height * scale;
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.92),
          "JPEG",
          (A4_LANDSCAPE.width - width) / 2,
          (A4_LANDSCAPE.height - height) / 2,
          width,
          height,
        );
        pdf.save(fileName);
        setJustDownloaded(true);
      })().catch(() => showError("server")),
    );
  };

  const locked = justDownloaded || imageState !== "ready";

  return (
    <div data-page="Certificates" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "hidden" }}>
      <SiteHeader lang={lang} active="certificates" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />

      <section data-e="pad" style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 30px 78px" }}>
        <h1 style={{ margin: "0 0 26px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(25px,3.6vw,34px)", lineHeight: "1.3", color: "#14203E" }}>{t.title}</h1>

        <div data-e="card" style={{ padding: "26px", background: "#FFFFFF", borderRadius: "22px", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 16px 34px rgba(20,32,62,.07)" }}>
          <div data-e="certframe" style={{ containerType: "inline-size", position: "relative", overflow: "hidden", borderRadius: "14px", aspectRatio: "1600/1131", background: "#FFFDF7" }}>
            {imageState === "ready" ? (
              <>
                <img src={CERTIFICATE_SRC} alt={t.certAlt} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                <p style={{ position: "absolute", left: "12%", right: "12%", top: "49%", margin: "0", textAlign: "center", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "4.2cqw", lineHeight: "1.55", letterSpacing: ".01em", color: "#8C1A20", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{studentName}</p>
              </>
            ) : null}

            {imageState === "loading" ? (
              <div data-e="certloading" style={{ position: "absolute", inset: "0", borderRadius: "14px", overflow: "hidden" }}>
                <Loader lang={lang} visible />
              </div>
            ) : null}

            {imageState === "failed" ? (
              <div data-e="certretry" style={{ position: "absolute", inset: "0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px", background: "#FFFDF7", textAlign: "center" }}>
                <p style={{ margin: "0", fontSize: "16.5px", lineHeight: "1.8", color: "#161C2E", maxWidth: "36ch" }}>{c.loadFailed}</p>
                <button type="button" onClick={retryImage} data-e="cta" style={{ minHeight: "54px", padding: "15px 28px", border: "1px solid #14203E", borderRadius: "999px", background: "#FCFAF4", color: "#14203E", cursor: "pointer", fontSize: "17px", fontWeight: "600", lineHeight: "1.5", fontFamily: "inherit" }}>{c.retry}</button>
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "22px" }}>
            <a href={CERTIFICATE_SRC} download={fileName} onClick={download} aria-disabled={locked} data-e="download" style={{ minHeight: "54px", padding: "15px 28px", border: "0", borderRadius: "999px", background: locked ? "#EDE6D7" : "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: locked ? "#7A6B4E" : "#1E1503", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "17px", fontWeight: "600", lineHeight: "1.5", textDecoration: "none", boxShadow: locked ? "none" : "0 10px 26px rgba(232,193,115,.28)", pointerEvents: locked ? "none" : "auto", cursor: locked ? "not-allowed" : "pointer", transition: "transform .2s ease" }}>
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke={locked ? "#7A6B4E" : "#1E1503"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}><path d="M12 4v11m0 0-4.2-4.2M12 15l4.2-4.2M4.5 19.5h15"></path></svg>
              {justDownloaded ? c.downloaded : t.download}
            </a>
          </div>
        </div>
      </section>

      <SiteFooter lang={lang} />
    </div>
  );
}
