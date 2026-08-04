"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLang, useSession } from "@/components/AppProviders";
import { strings } from "@/lib/i18n";
import { professionCopy } from "@/lib/i18n/professions";
import { professionCards } from "@/lib/professions";
import images from "@/professions.json";

type Manifest = Record<string, { width: number; height: number; sources: { width: number; src: string }[] }>;
const IMAGES = images.images as Manifest;

/**
 * /vyavasaya — ported from
 * design/profession section claude design files/14 Vidyas 64 Kalas.dc.html.
 *
 * **Domain correspondence and nothing more.** Nineteen modern fields, each opening onto the Vidyas
 * and Kalas that belong to the same domain. Nothing on this page claims one age produced the other,
 * and no copy that would imply it may be added — see lib/i18n/professions.ts.
 *
 * The images lead and the links are the payoff: opening a card reveals its entries as real links,
 * each carrying its own gloss from the book, every one of them landing on /vidya-kala/[key].
 *
 * Three things the mockup drew are not here, because all three were text it invented and there is no
 * source for any of them: the domain filter above the grid (सभी / विज्ञान / शिल्प / कला / जीवन), and
 * the pill and the blurb inside an open card. The design's other elements all survive.
 *
 * `[data-reveal]` is handled by MotionShell, mounted globally in AppProviders — it degrades better
 * than the mockup's own observer, never hiding an element that has already painted. The hero
 * parallax stays local because it is this hero's alone; MotionShell's is bound to the home page's
 * artwork and its translateX(-50%).
 */
export default function ProfessionsPage() {
  const { lang, toggle: toggleLang } = useLang();
  const { session } = useSession();
  const copy = professionCopy[lang];
  const cards = professionCards(lang);
  const vidyaNames = (strings(lang).Home_v5.VIDYAS as unknown as string[][]).map((t) => (lang === "hi" ? t[0] : t[2]));

  const [open, setOpen] = useState<number | null>(0);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mq = matchMedia("(min-width: 860px)");
    const onMq = () => setWide(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    if (!wide) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const hero = document.querySelector<HTMLElement>("[data-hero-img]");
    if (!hero) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        hero.style.translate = `0 ${(Math.min(scrollY, 900) * 0.16).toFixed(1)}px`;
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [wide]);

  const hero = IMAGES.performance;

  return (
    <div data-page="Vyavasaya" style={{ background: "#0a090c", overflowX: "clip", minWidth: "320px", isolation: "isolate" }}>

      <SiteHeader lang={lang} active="vyavasaya" onToggleLang={toggleLang} signedIn={session.signedIn} hasCertificates={session.hasCertificates} />

      <section style={{ position: "relative", minHeight: "min(94svh,880px)", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: "0" }}>
          <img data-hero-img src={hero.sources.at(-1)?.src} srcSet={hero.sources.map((s) => `${s.src} ${s.width}w`).join(", ")} sizes="100vw" width={hero.width} height={hero.height} alt="" fetchPriority="high" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "34% 42%", animation: "vy-slowZoom 30s ease-in-out infinite alternate", willChange: "transform" }} />
          <div style={{ position: "absolute", inset: "0", background: "linear-gradient(to top,#0a090c 2%,rgba(10,9,12,.92) 26%,rgba(10,9,12,.35) 58%,rgba(10,9,12,.6) 100%)" }}></div>
          <div style={{ position: "absolute", left: "-15%", bottom: "-10%", width: "70vw", height: "70vw", maxWidth: "760px", maxHeight: "760px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,185,92,.20),transparent 68%)", filter: "blur(20px)", animation: "vy-orb 16s ease-in-out infinite" }}></div>
        </div>
        <div style={{ position: "relative", padding: "0 clamp(20px,6vw,72px) clamp(44px,8vh,88px)", width: "100%", maxWidth: "1240px" }}>
          <p style={{ margin: "0 0 clamp(14px,2.4vh,20px)", fontSize: "clamp(1rem,4.2vw,1.35rem)", fontWeight: "400", lineHeight: "1.85", color: "#e8b95c", animation: "vy-fadeUp .9s .06s both" }}>{copy.eyebrow}</p>
          <h1 style={{ margin: "0", fontSize: "clamp(2.4rem,10.5vw,6rem)", lineHeight: "1.32", fontWeight: "600", color: "#fffdf9", letterSpacing: "0", maxWidth: "20em", animation: "vy-fadeUp 1s .16s both" }}>{copy.headline}</h1>
        </div>
        <span style={{ position: "absolute", right: "clamp(18px,4vw,44px)", bottom: "clamp(44px,8vh,88px)", width: "1px", height: "56px", background: "linear-gradient(#e8b95c,transparent)", animation: "vy-bob 2.4s ease-in-out infinite alternate" }}></span>
      </section>

      <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "clamp(16px,3vh,26px) 0", overflow: "hidden", background: "#0d0c10" }}>
        <div style={{ display: "flex", width: "max-content", animation: "vy-marquee 52s linear infinite", willChange: "transform" }}>
          <div style={{ display: "flex", gap: "clamp(28px,5vw,60px)", paddingRight: "clamp(28px,5vw,60px)", alignItems: "center" }}>
            {vidyaNames.map((v, i) => (<span key={i} style={{ fontSize: "clamp(1.05rem,4vw,1.5rem)", fontWeight: "300", lineHeight: "1.7", color: "rgba(242,238,234,.34)", whiteSpace: "nowrap" }}>{v}</span>))}
          </div>
          <div style={{ display: "flex", gap: "clamp(28px,5vw,60px)", paddingRight: "clamp(28px,5vw,60px)", alignItems: "center" }} aria-hidden="true">
            {vidyaNames.map((v, i) => (<span key={i} style={{ fontSize: "clamp(1.05rem,4vw,1.5rem)", fontWeight: "300", lineHeight: "1.7", color: "rgba(242,238,234,.34)", whiteSpace: "nowrap" }}>{v}</span>))}
          </div>
        </div>
      </div>

      <section id="suchi" style={{ position: "relative", padding: "clamp(46px,8vh,96px) clamp(12px,4vw,72px) clamp(74px,12vh,140px)" }}>
        <div style={{ position: "absolute", top: "8%", right: "-10%", width: "60vw", height: "60vw", maxWidth: "640px", maxHeight: "640px", borderRadius: "50%", background: "radial-gradient(circle,rgba(122,104,232,.16),transparent 66%)", filter: "blur(30px)", animation: "vy-orb 22s ease-in-out infinite", pointerEvents: "none" }}></div>
        <div style={{ position: "relative", maxWidth: "1360px", margin: "0 auto" }}>

          <div data-reveal style={{ marginBottom: "clamp(22px,4vh,38px)", padding: "0 clamp(6px,2vw,0px)" }}>
            <h2 style={{ margin: "0", fontSize: "clamp(1.9rem,7.5vw,3.4rem)", fontWeight: "600", lineHeight: "1.4", color: "#fffdf9" }}>{copy.title}</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" : "1fr", gap: "clamp(12px,2vw,24px)", alignItems: "start" }}>
            {cards.map((p, i) => {
              const isOpen = open === i;
              const img = IMAGES[p.key];
              const panelId = `vy-panel-${p.key}`;
              return (
                <article key={p.key} data-reveal style={{ gridColumn: isOpen && wide ? "1 / -1" : "auto", background: "#15141a", border: `1px solid ${isOpen ? "rgba(232,185,92,.42)" : "rgba(255,255,255,.08)"}`, borderRadius: "22px", overflow: "hidden", transition: "border-color .45s,box-shadow .45s,transform .45s", boxShadow: isOpen ? "0 40px 90px -50px rgba(232,185,92,.55)" : "0 20px 50px -40px rgba(0,0,0,.9)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: isOpen && wide ? "minmax(0,1.1fr) minmax(0,1fr)" : "1fr" }}>
                    <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} aria-controls={panelId} style={{ all: "unset", display: "block", position: "relative", width: "100%", cursor: "pointer", background: "#100f14" }}>
                      <div style={{ position: "relative", aspectRatio: isOpen && wide ? "4 / 3" : "3 / 2", overflow: "hidden" }}>
                        <img src={img.sources.at(-1)?.src} srcSet={img.sources.map((s) => `${s.src} ${s.width}w`).join(", ")} sizes="(max-width: 860px) 100vw, (max-width: 1400px) 50vw, 33vw" width={img.width} height={img.height} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 1.2s cubic-bezier(.2,.7,.2,1)", transform: `scale(${isOpen ? "1.04" : "1"})` }} />
                        <div style={{ position: "absolute", inset: "0", pointerEvents: "none", background: "linear-gradient(to top,rgba(10,9,12,.94) 0%,rgba(10,9,12,.4) 40%,transparent 72%)" }}></div>
                        <span aria-hidden="true" style={{ position: "absolute", top: "14px", left: "16px", padding: "4px 11px", borderRadius: "999px", background: "rgba(10,9,12,.55)", border: "1px solid rgba(255,255,255,.14)", backdropFilter: "blur(8px)", fontSize: ".82rem", fontWeight: "500", color: "#e8b95c", lineHeight: "1.6", fontVariantNumeric: "tabular-nums" }}><span data-e="vynum">{String(i + 1).padStart(2, "0")}</span></span>
                        {/* The export set a ＋ character here and rotated it to make the ×. A glyph
                            cannot be centred in a 34px circle by flex alone — it is positioned off
                            the baseline, and Anek Devanagari puts its ink 3.6px above the box centre
                            at this size. Two lines centred on the viewBox have no baseline to be off,
                            so they are exactly centred at every size and rotate about the true
                            middle. Same mark, drawn rather than typeset. */}
                        <span aria-hidden="true" style={{ position: "absolute", top: "14px", right: "16px", width: "34px", height: "34px", borderRadius: "50%", display: "grid", placeItems: "center", background: isOpen ? "#e8b95c" : "rgba(10,9,12,.55)", color: isOpen ? "#0a090c" : "#f2eeea", transition: "background .3s,transform .4s", transform: `rotate(${isOpen ? "135deg" : "0deg"})` }}>
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" focusable="false" style={{ display: "block" }}><path d="M12 5v14M5 12h14" /></svg>
                        </span>
                        <div style={{ position: "absolute", left: "16px", right: "16px", bottom: "14px", pointerEvents: "none" }}>
                          <h3 style={{ margin: "0", fontSize: "clamp(1.3rem,5.4vw,1.9rem)", fontWeight: "600", lineHeight: "1.5", color: "#fffdf9" }}>{p.label}</h3>
                          <span aria-hidden="true" style={{ display: "inline-block", marginTop: "6px", fontSize: ".9rem", fontWeight: "400", lineHeight: "1.7", color: "#d9c9a5", fontVariantNumeric: "tabular-nums" }}>{String(p.entries.length).padStart(2, "0")}</span>
                        </div>
                      </div>
                    </button>

                    {/* The export unmounts this panel when shut, which is what replays the reveal
                        on every open. It stays mounted here so aria-controls always resolves, so
                        the key does the same job: toggling it remounts the subtree and the fade and
                        the staggered rows run again. */}
                    <div key={isOpen ? "open" : "shut"} id={panelId} hidden={!isOpen} style={{ padding: "clamp(20px,4.5vw,40px)", animation: "vy-fadeUp .5s both" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {p.entries.map((r, ri) => (
                          // ?from= so the entry's back link returns here rather than to the index.
                          // It is in the URL and not in history on purpose: a refresh, a shared link
                          // or a search result all have to resolve, and history has nothing to say
                          // about any of them. See components/VidyaKalaBackLink.tsx.
                          <Link key={r.key} href={`/vidya-kala/${r.key}?from=vyavasaya`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 14px", alignItems: "center", padding: "14px 16px", borderRadius: "14px", background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.06)", transition: "background .3s,border-color .3s,transform .3s", animation: "vy-rowIn .5s both", animationDelay: `${(0.06 + ri * 0.07).toFixed(2)}s` }}>
                            <span>
                              <span style={{ display: "block", fontSize: "clamp(1.08rem,4.4vw,1.3rem)", fontWeight: "500", lineHeight: "1.7", color: "#fffdf9" }}>{r.name}</span>
                              {r.gloss ? <span lang={r.glossIsHindi ? "hi" : undefined} style={{ display: "block", fontSize: "clamp(.94rem,3.7vw,1.04rem)", fontWeight: "300", lineHeight: "1.85", color: "#a99f92", marginTop: "1px" }}>{r.gloss}</span> : null}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "10px", whiteSpace: "nowrap" }}>
                              <span aria-hidden="true" style={{ color: "#e8b95c", fontSize: "1.1rem" }}>→</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <SiteFooter lang={lang} />
    </div>
  );
}
