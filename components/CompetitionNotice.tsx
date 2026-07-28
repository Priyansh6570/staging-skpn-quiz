"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCompetitionOpen, useLang } from "@/components/AppProviders";
import { custom, strings } from "@/lib/i18n";

/**
 * The one place the closed state is stated in words, so no page carries an inline notice that has
 * to be found and removed again when DLT lands.
 *
 * The collapsed flag is the only sessionStorage key in the product. It is a UI preference and
 * nothing more: losing it shows the notice again, and forging it hides a sentence. No gate reads it.
 */
const STORAGE_KEY = "skpn_notice_collapsed";

/** Long enough that the notice arrives after the page has settled rather than competing with it. */
const APPEAR_AFTER_MS = 900;

export default function CompetitionNotice() {
  const competitionOpen = useCompetitionOpen();
  const pathname = usePathname();
  const { lang } = useLang();
  const [shown, setShown] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // The admin surface is a separate product with its own chrome, and its operators know the state.
  const active = !competitionOpen && !pathname.startsWith("/admin");

  // Both reads happen in the timer rather than in the effect body: the notice has nothing to say
  // until it is due, and a synchronous setState here would cascade a render on every page.
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      setCollapsed(sessionStorage.getItem(STORAGE_KEY) === "1");
      setShown(true);
    }, APPEAR_AFTER_MS);
    return () => clearTimeout(timer);
  }, [active]);

  const collapse = useCallback(() => {
    setCollapsed(true);
    sessionStorage.setItem(STORAGE_KEY, "1");
  }, []);

  const expand = useCallback(() => {
    setCollapsed(false);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!shown || collapsed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") collapse();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shown, collapsed, collapse]);

  if (!active || !shown) return null;

  const banner = custom(lang).competitionNoticeBanner;
  const close = strings(lang).Quiz.T.close;

  return (
    <div data-e="noticedock" style={{ position: "fixed", right: "16px", bottom: "16px", zIndex: 55, display: "flex", justifyContent: "flex-end", pointerEvents: "none", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif" }}>
      {collapsed ? (
        // The banner text is the label: an icon with no name is unreachable by voice control and
        // meaningless to a screen reader.
        <button type="button" onClick={expand} aria-label={banner} data-e="noticepill" style={{ width: "48px", height: "48px", flex: "0 0 auto", border: "0", borderRadius: "999px", background: "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: "#1E1503", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px rgba(232,193,115,.28)", animation: "skpn-notice-in .34s cubic-bezier(.22,.61,.36,1) both", fontFamily: "inherit", padding: "0" }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1E1503" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5.2"></path><path d="M12 7.6v.1"></path></svg>
        </button>
      ) : (
        <div role="status" aria-live="polite" data-e="noticecard card" style={{ maxWidth: "min(90vw,368px)", display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px 18px", borderRadius: "16px", background: "#FFFFFF", border: "1px solid #E3D9C6", borderLeft: "4px solid #E8C173", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 18px 40px rgba(20,32,62,.14)", animation: "skpn-notice-in .42s cubic-bezier(.22,.61,.36,1) both" }}>
          <p style={{ margin: "0", flex: "1 1 auto", fontSize: "16px", lineHeight: "1.7", color: "#161C2E", textWrap: "pretty" }}>{banner}</p>
          <button type="button" onClick={collapse} aria-label={close} data-e="noticeclose" style={{ width: "32px", height: "32px", flex: "0 0 auto", border: "1px solid #DCD1BC", borderRadius: "10px", background: "#FCFAF4", color: "#161C2E", cursor: "pointer", fontSize: "17px", lineHeight: "1", fontFamily: "inherit", padding: "0" }}>×</button>
        </div>
      )}
    </div>
  );
}
