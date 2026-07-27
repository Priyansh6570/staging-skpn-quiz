"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { strings, type Lang } from "@/lib/i18n";

/** Below this the bar is always shown, so the top of a page never hides it. */
const ALWAYS_VISIBLE_ABOVE = 90;
/** Ignore anything smaller, so a trackpad twitch or rubber-banding cannot flicker the bar. */
const SCROLL_THRESHOLD = 10;

export type NavKey = "home" | "about" | "pratiyogita" | "rules" | "certificates";

// Order and keys mirror NAV in design/SiteHeader.dc.html; the labels live in lib/i18n and the
// hrefs are the Next routes from AUDIT.md §1.1 rather than the export's .dc.html filenames.
const NAV: { key: NavKey; href: string }[] = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "pratiyogita", href: "/pratiyogita" },
  { key: "rules", href: "/rules" },
  { key: "certificates", href: "/certificates" },
];

type Props = {
  lang: Lang;
  active?: NavKey;
  signedIn?: boolean;
  hasCertificates?: boolean;
  onToggleLang?: () => void;
};

export default function SiteHeader({
  lang,
  active = "home",
  signedIn = false,
  hasCertificates = false,
  onToggleLang,
}: Props) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const s = strings(lang);
  const t = s.SiteHeader.T;
  const m = s.SiteHeader.markup;

  // Hides on the way down, returns on any upward movement. Sliding a nav bar out of view is
  // motion, so under prefers-reduced-motion it simply never hides.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    lastY.current = window.scrollY;
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (Math.abs(delta) < SCROLL_THRESHOLD) return;
        lastY.current = y;
        setHidden(y > ALWAYS_VISIBLE_ABOVE && delta > 0);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The drawer is anchored to the bar, so the bar cannot slide away while it is open.
  const barHidden = hidden && !open;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const items = NAV.map((i, idx) => ({ ...i, label: s.SiteHeader.NAV[idx].label }))
    .filter((i) => i.key !== "certificates" || hasCertificates)
    .map((i) => ({
      ...i,
      color: i.key === active ? "#14203E" : "#333C50",
      weight: i.key === active ? "600" : "400",
      underline: i.key === active ? "#E8C173" : "transparent",
      drawerBg: i.key === active ? "rgba(232,193,115,.14)" : "transparent",
      drawerFg: i.key === active ? "#FFF9EC" : "#F2EEE4",
    }));

  const accountHref = signedIn ? "/profile" : "/login";
  const accountLabel = signedIn ? t.account : t.signIn;
  const hiBg = lang === "hi" ? "#14203E" : "transparent";
  const hiFg = lang === "hi" ? "#FDF3DF" : "#161C2E";
  const enBg = lang === "en" ? "#14203E" : "transparent";
  const enFg = lang === "en" ? "#FDF3DF" : "#161C2E";
  const drawerTransform = open ? "translateX(0)" : "translateX(102%)";
  const drawerVis = open ? "visible" : "hidden";
  const scrimOpacity = open ? "1" : "0";

  return (
<div style={{ fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", position: "sticky", top: "0", zIndex: "60" }}>

  <div data-e="topbar" style={{ position: "sticky", top: "0", zIndex: "60", background: "rgba(251,247,240,.94)", backdropFilter: "blur(14px)", borderBottom: "1px solid #E8DFCE", transform: barHidden ? "translateY(-100%)" : "translateY(0)", transition: "transform .28s cubic-bezier(.22,.61,.36,1)" }}>
  <div data-e="pad" style={{ maxWidth: "1220px", margin: "0 auto", padding: "10px 30px", display: "flex", alignItems: "center", gap: "14px" }}>
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", color: "inherit", textDecoration: "none", flex: "0 1 auto", minWidth: "0" }}>
      <img src="/uploads/images.jpg" alt={m.alt0} width="38" height="38" style={{ display: "block", width: "38px", height: "38px", borderRadius: "50%", flex: "0 0 auto" }} />
      <span style={{ width: "1px", height: "28px", background: "#E1D6C0", flex: "0 0 auto" }}></span>
      <span style={{ width: "44px", height: "44px", flex: "0 0 auto", borderRadius: "50%", background: "radial-gradient(circle at 32% 28%,#1B2544 0%,#080C1E 72%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px rgba(232,193,115,.42),0 6px 16px rgba(7,11,30,.28)" }}>
        <img src="/uploads/skpn-logo.png" alt={m.alt1} width="34" height="34" style={{ display: "block", width: "34px", height: "34px" }} />
      </span>
      <span data-e="brandtext" style={{ display: "flex", flexDirection: "column", lineHeight: "1.25", minWidth: "0" }}>
        <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "16.5px", color: "#14203E" }}>{t.orgShort}</span>
        <span style={{ fontSize: "11px", color: "#161C2E" }}>{t.deptShort}</span>
      </span>
    </Link>
    <nav data-e="nav" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "2px" }}>
      {items.map((item) => (
        <Link key={item.key} href={item.href} style={{ position: "relative", padding: "10px 13px", borderRadius: "10px", fontSize: "16px", lineHeight: "1.7", color: item.color, fontWeight: item.weight, whiteSpace: "nowrap", textDecoration: "none", transition: "background .16s ease" }}>{item.label}<span aria-hidden="true" style={{ position: "absolute", left: "13px", right: "13px", bottom: "5px", height: "2px", borderRadius: "2px", background: item.underline }}></span></Link>
      ))}
    </nav>
    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "9px", flex: "0 0 auto" }}>
      <button type="button" onClick={onToggleLang} aria-label={m.ariaLabel0} style={{ display: "flex", alignItems: "center", border: "1px solid #DCD1BC", background: "#FFFFFF", borderRadius: "999px", padding: "3px", cursor: "pointer", fontFamily: "inherit" }}>
        <span style={{ padding: "5px 11px", fontSize: "14px", lineHeight: "1.5", borderRadius: "999px", background: hiBg, color: hiFg }}>{m.text0}</span>
        <span style={{ padding: "5px 11px", fontSize: "14px", lineHeight: "1.5", borderRadius: "999px", background: enBg, color: enFg }}>{m.text1}</span>
      </button>
      <Link href={accountHref} data-e="signin-top" style={{ padding: "10px 18px", border: "1px solid #14203E", borderRadius: "999px", fontSize: "15.5px", lineHeight: "1.6", color: "#14203E", whiteSpace: "nowrap", textDecoration: "none", transition: "background .16s ease,color .16s ease" }}>{accountLabel}</Link>
      <button type="button" data-e="menu-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="skpn-menu" aria-label={t.menuLabel} style={{ display: "none", width: "46px", height: "46px", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "5px", border: "1px solid #DCD1BC", background: "#FFFFFF", borderRadius: "14px", cursor: "pointer", padding: "0" }}>
        <span aria-hidden="true" style={{ display: "block", width: "18px", height: "1.6px", background: "#14203E" }}></span>
        <span aria-hidden="true" style={{ display: "block", width: "18px", height: "1.6px", background: "#14203E" }}></span>
        <span aria-hidden="true" style={{ display: "block", width: "18px", height: "1.6px", background: "#14203E" }}></span>
      </button>
    </div>
  </div>
  </div>

  <div onClick={() => setOpen(false)} aria-hidden="true" style={{ position: "fixed", inset: "0", zIndex: "70", background: "rgba(7,11,30,.5)", backdropFilter: "blur(2px)", opacity: scrimOpacity, visibility: drawerVis, transition: "opacity .32s ease,visibility .32s ease" }}></div>

  <aside id="skpn-menu" role="dialog" aria-modal="true" aria-label={t.menuLabel} style={{ position: "fixed", top: "0", right: "0", bottom: "0", zIndex: "80", width: "min(86vw,340px)", background: "linear-gradient(180deg,#0B1226 0%,#070B1E 100%)", boxShadow: "-24px 0 60px rgba(4,6,15,.5)", display: "flex", flexDirection: "column", transform: drawerTransform, visibility: drawerVis, transition: "transform .36s cubic-bezier(.32,.72,.24,1),visibility .36s" }}>
    <div style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(232,193,115,.2)" }}>
      <span style={{ width: "42px", height: "42px", flex: "0 0 auto", borderRadius: "50%", background: "#04060F", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px rgba(232,193,115,.4)" }}>
        <img src="/uploads/skpn-logo.png" alt="" width="32" height="32" style={{ display: "block", width: "32px", height: "32px" }} />
      </span>
      <span style={{ flex: "1 1 auto", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "16px", lineHeight: "1.4", color: "#FFF9EC" }}>{t.orgShort}</span>
      <button type="button" onClick={() => setOpen(false)} aria-label={t.close} style={{ width: "44px", height: "44px", flex: "0 0 auto", border: "1px solid rgba(255,249,236,.24)", borderRadius: "12px", background: "rgba(255,255,255,.05)", color: "#FFF9EC", cursor: "pointer", fontSize: "20px", lineHeight: "1", fontFamily: "inherit" }}>{m.text2}</button>
    </div>

    <nav style={{ flex: "1 1 auto", overflow: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "2px" }}>
      {items.map((item) => (
        <Link key={item.key} href={item.href} style={{ padding: "15px 14px", minHeight: "54px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", borderRadius: "14px", background: item.drawerBg, fontFamily: "'Noto Serif Devanagari',serif", fontSize: "18.5px", color: item.drawerFg, textDecoration: "none" }}>{item.label}<span aria-hidden="true" style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: "16px", color: "#E8C173" }}>{m.text3}</span></Link>
      ))}
    </nav>

    <div style={{ padding: "16px 22px 26px", display: "flex", flexDirection: "column", gap: "16px", borderTop: "1px solid rgba(232,193,115,.2)" }}>
      <Link href={accountHref} style={{ padding: "16px", minHeight: "54px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: "#1E1503", borderRadius: "999px", fontSize: "17.5px", fontWeight: "600", textDecoration: "none" }}>{accountLabel}</Link>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "12px", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,249,236,.55)", lineHeight: "1.8" }}>{t.follow}</span>
        <span style={{ flex: "1 1 auto", height: "1px", background: "rgba(232,193,115,.22)" }}></span>
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <a href="https://www.instagram.com/" target="_blank" rel="noopener" aria-label={m.ariaLabel1} style={{ width: "46px", height: "46px", borderRadius: "14px", border: "1px solid rgba(232,193,115,.34)", background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="#F1DFB6" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" style={{ display: "block" }}><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"></rect><circle cx="12" cy="12" r="4.1"></circle><circle cx="17.1" cy="6.9" r="1.1" fill="#F1DFB6" stroke="none"></circle></svg>
        </a>
        <a href="https://www.facebook.com/" target="_blank" rel="noopener" aria-label={m.ariaLabel2} style={{ width: "46px", height: "46px", borderRadius: "14px", border: "1px solid rgba(232,193,115,.34)", background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" style={{ display: "block" }}><path d="M13.6 21v-7.7h2.7l.4-3.1h-3.1V8.2c0-.9.3-1.5 1.6-1.5h1.6V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H7.6v3.1h2.8V21z" fill="#F1DFB6"></path></svg>
        </a>
        <a href="https://twitter.com/" target="_blank" rel="noopener" aria-label={m.ariaLabel3} style={{ width: "46px", height: "46px", borderRadius: "14px", border: "1px solid rgba(232,193,115,.34)", background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" style={{ display: "block" }}><path d="M3.3 3h4.4l4 5.6L16.6 3H21l-6.2 7.4L21.4 21h-4.4l-4.3-6-4.9 6H3.4l6.6-7.9z" fill="#F1DFB6"></path></svg>
        </a>
        <a href="https://www.youtube.com/" target="_blank" rel="noopener" aria-label={m.ariaLabel4} style={{ width: "46px", height: "46px", borderRadius: "14px", border: "1px solid rgba(232,193,115,.34)", background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" style={{ display: "block" }}><path d="M21.3 8.2a2.6 2.6 0 00-1.8-1.8C17.8 6 12 6 12 6s-5.8 0-7.5.4A2.6 2.6 0 002.7 8.2C2.3 9.9 2.3 12 2.3 12s0 2.1.4 3.8a2.6 2.6 0 001.8 1.8C6.2 18 12 18 12 18s5.8 0 7.5-.4a2.6 2.6 0 001.8-1.8c.4-1.7.4-3.8.4-3.8s0-2.1-.4-3.8zM10.2 15V9l5.2 3z" fill="#F1DFB6"></path></svg>
        </a>
      </div>
      <a href={`mailto:${m.text4}`} style={{ fontSize: "14.5px", lineHeight: "1.7", color: "#E9E4D8", textDecoration: "none" }}>{m.text4}</a>
    </div>
  </aside>
</div>
  );
}
