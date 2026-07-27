"use client";

import { strings, type Lang } from "@/lib/i18n";

/**
 * The boot loader from design/assets/site.js, ported node for node. The original injected it into
 * document.body at parse time and removed it 420ms after load; here it is a React node driven by
 * the busy counter, so the same shell covers route changes and every async action.
 */
export default function Loader({ lang, visible }: { lang: Lang; visible: boolean }) {
  const s = strings(lang);
  return (
    <div
      id="skpn-loader"
      role="status"
      aria-label={s.Shell.inline[0]}
      aria-hidden={!visible}
      data-hidden={visible ? undefined : "1"}
      style={{
        position: "fixed", inset: "0", zIndex: 99999,
        background: "radial-gradient(78% 62% at 50% 42%,#101838 0%,#070B1E 62%,#04060F 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "26px",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        visibility: visible ? "visible" : "hidden",
        transition: "opacity .46s cubic-bezier(.22,.61,.36,1), visibility .46s",
      }}
    >
      <div style={{ position: "relative", width: "132px", height: "132px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: "-40%", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.38) 0%,rgba(232,193,115,.1) 44%,rgba(232,193,115,0) 70%)", animation: "skpnBreathe 2.6s ease-in-out infinite" }}></div>
        <svg viewBox="-100 -100 200 200" width="152" height="152" aria-hidden="true" style={{ position: "absolute", left: "-10px", top: "-10px" }}>
          <circle r="92" fill="none" stroke="rgba(232,193,115,.55)" strokeWidth="1.6" strokeDasharray="2 8" strokeLinecap="round" style={{ transformOrigin: "0 0", animation: "skpnSpin 9s linear infinite" }}></circle>
          <circle r="74" fill="none" stroke="rgba(232,193,115,.3)" strokeWidth="3.4" strokeDasharray="6 30" strokeLinecap="round" style={{ transformOrigin: "0 0", animation: "skpnSpinRev 14s linear infinite" }}></circle>
        </svg>
        <span style={{ position: "relative", width: "88px", height: "88px", borderRadius: "50%", background: "#04060F", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px rgba(232,193,115,.3),0 12px 40px rgba(0,0,0,.6)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uploads/skpn-logo.png" alt="" style={{ width: "66px", height: "auto", display: "block" }} />
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", animation: "skpnRise .5s ease both" }}>
        <p style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "19px", lineHeight: "1.5", color: "#FFF9EC", letterSpacing: ".01em" }}>{s.SiteHeader.T.orgShort}</p>
        <p style={{ margin: "0", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", fontSize: "12.5px", letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(232,193,115,.8)" }}>{s.SiteHeader.T.deptShort}</p>
        <span style={{ marginTop: "6px", position: "relative", width: "150px", height: "2px", borderRadius: "2px", background: "rgba(255,249,236,.14)", overflow: "hidden", display: "block" }}>
          <span style={{ position: "absolute", inset: "0", width: "32%", borderRadius: "2px", background: "linear-gradient(90deg,rgba(232,193,115,0),#E8C173,rgba(232,193,115,0))", animation: "skpnBar 1.15s ease-in-out infinite" }}></span>
        </span>
      </div>
    </div>
  );
}
