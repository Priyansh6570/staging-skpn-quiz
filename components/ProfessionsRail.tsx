"use client";

import Link from "next/link";
import { professionCopy } from "@/lib/i18n/professions";
import { professionCards } from "@/lib/professions";
import images from "@/professions.json";
import type { Lang } from "@/lib/i18n";

type Manifest = Record<string, { width: number; height: number; sources: { width: number; src: string }[] }>;
const IMAGES = images.images as Manifest;

/**
 * The home page's opening onto the professions — ported from
 * design/profession section claude design files/Home Section - 14 Vidyas.dc.html.
 *
 * **Domain correspondence and nothing more.** Neither the copy here nor anything that may be added
 * to it says one age produced the other. See lib/i18n/professions.ts.
 *
 * Every string the mockup carried was improvised and none of it survives: the eyebrow and the
 * headline are the trust's own, the lede is the professions section's existing subtitle, and each
 * tile is labelled from lib/i18n — its profession's name over the first Vidya or Kala under it.
 *
 * The rail holds its 19 tiles twice so the -50% keyframe loops with no seam. The second pass is
 * aria-hidden and out of the tab order: it is the same 19 links again, and a screen reader or a
 * keyboard should meet each one once. Hovering pauses the track, so a tile that catches the eye can
 * be read — and under prefers-reduced-motion the global animation:none rule stops it outright,
 * leaving the strip at translateX(0), which is a full row rather than a half-empty one.
 */
export default function ProfessionsRail({ lang }: { lang: Lang }) {
  const copy = professionCopy[lang];
  const cards = professionCards(lang);

  // Two passes over the same list, exactly as the export's renderVals does: the first is the real
  // one, the second is the seam filler.
  const tiles = [0, 1].flatMap((pass) =>
    cards.map((card, i) => ({
      card,
      i,
      dupe: pass === 1,
      offset: i % 2 ? "18px" : "0px",
      delay: `${(i * 0.9).toFixed(1)}s`,
    })),
  );

  return (
    <section data-page="Vyavasaya-Section" style={{ position: "relative", background: "#0a090c", overflow: "hidden", padding: "clamp(54px,10vh,118px) 0" }}>
      <div style={{ position: "absolute", left: "-12%", top: "-10%", width: "70vw", height: "70vw", maxWidth: "700px", maxHeight: "700px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,185,92,.16),transparent 66%)", filter: "blur(28px)", animation: "vs-orb 18s ease-in-out infinite", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", right: "-10%", bottom: "-14%", width: "60vw", height: "60vw", maxWidth: "600px", maxHeight: "600px", borderRadius: "50%", background: "radial-gradient(circle,rgba(122,104,232,.18),transparent 66%)", filter: "blur(32px)", animation: "vs-orb 24s ease-in-out infinite", pointerEvents: "none" }}></div>

      <div style={{ position: "relative", maxWidth: "1320px", margin: "0 auto", padding: "0 clamp(18px,5vw,60px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: "clamp(32px,5vw,64px)", alignItems: "center" }}>

        <div>
          <p style={{ margin: "0 0 clamp(12px,2vh,18px)", fontSize: "clamp(.98rem,4vw,1.2rem)", fontWeight: "400", lineHeight: "1.85", color: "#e8b95c", animation: "vs-fadeUp .85s .06s both" }}>{copy.eyebrow}</p>
          <h2 style={{ margin: "0", fontSize: "clamp(2rem,8.6vw,3.5rem)", fontWeight: "600", lineHeight: "1.34", color: "#fffdf9", maxWidth: "16em", textWrap: "balance", animation: "vs-fadeUp .9s .14s both" }}>{copy.headline}</h2>
          <p style={{ margin: "clamp(18px,3vh,28px) 0 0", fontSize: "clamp(1rem,4vw,1.14rem)", fontWeight: "300", lineHeight: "1.95", color: "#a99f92", maxWidth: "28em", animation: "vs-fadeUp .9s .28s both" }}>{copy.subtitle}</p>
          <Link href="/vyavasaya" style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginTop: "clamp(24px,4vh,36px)", color: "#e8b95c", fontSize: "1.06rem", fontWeight: "600", lineHeight: "1.7", borderBottom: "1px solid rgba(232,185,92,.4)", paddingBottom: "4px", animation: "vs-fadeUp .9s .38s both" }}>{copy.title}<span>→</span></Link>
        </div>

        <div data-rail style={{ position: "relative", overflow: "hidden", padding: "14px 0", maskImage: "linear-gradient(to right,transparent,#000 7%,#000 93%,transparent)", WebkitMaskImage: "linear-gradient(to right,transparent,#000 7%,#000 93%,transparent)", animation: "vs-fadeUp 1s .3s both" }}>
          <div data-track style={{ display: "flex", width: "max-content", animation: "vs-railScroll 34s linear infinite", willChange: "transform" }}>
            {tiles.map((t, ti) => {
              const img = IMAGES[t.card.key];
              return (
                <Link key={ti} href="/vyavasaya" aria-hidden={t.dupe} tabIndex={t.dupe ? -1 : 0} style={{ width: "clamp(200px,58vw,268px)", flex: "0 0 auto", marginRight: "clamp(10px,1.5vw,16px)", position: "relative", borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(255,255,255,.09)", background: "#15141a", transition: "border-color .4s,transform .5s", transform: `translateY(${t.offset})`, animation: "vs-tileFloat 6s ease-in-out infinite alternate", animationDelay: t.delay }}>
                  <div style={{ aspectRatio: "3 / 4", overflow: "hidden", minWidth: "0", width: "100%" }}>
                    <img src={img.sources.at(-1)?.src} srcSet={img.sources.map((s) => `${s.src} ${s.width}w`).join(", ")} sizes="(max-width: 460px) 58vw, 268px" width={img.width} height={img.height} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%", transition: "transform 1.4s cubic-bezier(.2,.7,.2,1)" }} />
                  </div>
                  <div style={{ position: "absolute", inset: "0", pointerEvents: "none", background: "linear-gradient(to top,rgba(10,9,12,.94) 0%,rgba(10,9,12,.34) 44%,transparent 70%)" }}></div>
                  <div style={{ position: "absolute", left: "16px", right: "16px", bottom: "14px", pointerEvents: "none" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: "600", lineHeight: "1.55", color: "#fffdf9" }}>{t.card.label}</div>
                    <div style={{ fontSize: ".92rem", fontWeight: "300", lineHeight: "1.75", color: "#bfb5a8" }}>{t.card.entries[0].name}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
