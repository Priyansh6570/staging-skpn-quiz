"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Loader from "@/components/Loader";
import { useLang, useSession, useShell } from "@/components/AppProviders";
import { custom, strings } from "@/lib/i18n";

const CERTIFICATE_SRC = "/uploads/cert.jpeg";
const FILE_NAME = "Medhavi Chhatravritti Pratiyogita Pramaan Patra.pdf";

/**
 * Where the name goes, measured off the artwork itself rather than eyeballed.
 *
 * The template carries a "श्री / सुश्री" line with a dotted rule beneath it. Scanning cert.jpeg's
 * pixels along y = 356 of 601 separates the two: from x = 256 to 301 the dark runs are irregular and
 * widely spaced — the baseline strokes of the label itself — and from x = 308 the pitch becomes a
 * regular 2.7px all the way to x = 584. That periodic stretch is the rule.
 *
 * **The rule is not centred on the page.** Its midpoint is x = 446 of 840, pushed right by the label
 * beside it, so the name centres on the rule rather than on the certificate. The name used to be
 * drawn at 49% of the height — above the rule, over the artwork — at a size that assumed most of the
 * page's width.
 *
 * Everything here is a fraction of the certificate's own dimensions, so replacing the asset with a
 * larger scan needs no new numbers, and the preview and the exported file cannot drift apart.
 */
const CERT_W = 840;
const CERT_H = 601;
const CERT_ASPECT = CERT_W / CERT_H;
const NAME_RULE_Y = 356 / CERT_H;
/** A little inside the first and last dot, so a full-width name does not butt against the ends. */
const NAME_RULE_LEFT = 314 / CERT_W;
const NAME_RULE_RIGHT = 578 / CERT_W;
const NAME_RULE_WIDTH = NAME_RULE_RIGHT - NAME_RULE_LEFT;
/** Resting size, and the floor a long name may shrink to. Fractions of the image width. */
const NAME_SIZE = 0.030;
const NAME_MIN_SIZE = 0.013;
/** The name sits on the rule rather than through it. A fraction of the font size. */
const NAME_BASELINE_LIFT = 0.12;
const NAME_COLOUR = "#8C1A20";

const nameFont = (px: number) => `600 ${px}px "Noto Serif Devanagari", serif`;

/**
 * The fitted size and top edge for a name, both as fractions of the certificate.
 *
 * Text width is linear in font size, so one measurement at a reference size gives the exact fit —
 * no shrink loop. A name wider than the rule comes down until it fits; the overlay used to keep its
 * size and truncate with an ellipsis, and a shortened name on a certificate is worse than a smaller
 * one (AUDIT.md §6.6).
 *
 * The top edge is derived from the font's own ascent and descent rather than a tuned offset: with
 * line-height 1 the baseline sits `(1 - (asc + desc)) / 2 + asc` down the box, and the box is
 * placed so that baseline lands on the rule.
 */
const REF_PX = 100;
function fitName(name: string): { size: number; top: number } {
  const fallback = { size: NAME_SIZE, top: NAME_RULE_Y - 0.9 * NAME_SIZE * CERT_ASPECT };
  if (typeof document === "undefined" || !name) return fallback;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return fallback;
  ctx.font = nameFont(REF_PX);
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${REF_PX * 0.01}px`;
  const metrics = ctx.measureText(name);
  const widthAtRef = metrics.width || 1;
  const size = Math.max(NAME_MIN_SIZE, Math.min(NAME_SIZE, (NAME_RULE_WIDTH * REF_PX) / widthAtRef));
  const asc = metrics.fontBoundingBoxAscent / REF_PX;
  const desc = metrics.fontBoundingBoxDescent / REF_PX;
  const baselineInBox = (1 - (asc + desc)) / 2 + asc;
  return { size, top: NAME_RULE_Y - (baselineInBox + NAME_BASELINE_LIFT) * size * CERT_ASPECT };
}

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
    document.fonts.load(nameFont(64)),
    document.fonts.ready,
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(image, 0, 0);

  // The same fit the preview uses, so the file a student downloads is the frame they were shown.
  const size = fitName(studentName).size * canvas.width;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = NAME_COLOUR;
  ctx.font = nameFont(size);
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${size * 0.01}px`;

  // Centred on the rule, which is centred on the page, and sitting just above it.
  ctx.fillText(
    studentName,
    canvas.width * (NAME_RULE_LEFT + NAME_RULE_WIDTH / 2),
    canvas.height * NAME_RULE_Y - size * NAME_BASELINE_LIFT,
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
    // The certificate endpoint, not the profile: this page needs a name to print and was being
    // served the whole student record to get it.
    fetch("/api/me/certificate", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setName(data.displayName); });
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
  const studentName = name || session.displayName || "";
  // One fit, read by the preview below and by composite() on download.
  const nameFit = useMemo(() => fitName(studentName), [studentName]);
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
          {/* The frame carries the certificate's own aspect ratio. It used to declare 1600/1131
              against an 840x601 image, so objectFit:contain letterboxed it and every percentage
              below addressed the frame rather than the artwork. */}
          <div data-e="certframe" style={{ containerType: "inline-size", position: "relative", overflow: "hidden", borderRadius: "14px", aspectRatio: `${CERT_W}/${CERT_H}`, background: "#FFFDF7" }}>
            {imageState === "ready" ? (
              <>
                <img src={CERTIFICATE_SRC} alt={t.certAlt} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                <p style={{ position: "absolute", left: `${NAME_RULE_LEFT * 100}%`, right: `${(1 - NAME_RULE_RIGHT) * 100}%`, top: `${nameFit.top * 100}%`, margin: "0", textAlign: "center", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: `${nameFit.size * 100}cqw`, lineHeight: "1", letterSpacing: ".01em", color: NAME_COLOUR, whiteSpace: "nowrap" }}>{studentName}</p>
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
