"use client";

import { useEffect } from "react";
import { strings, type Lang } from "@/lib/i18n";

export interface ToastItem {
  id: number;
  message: string;
  /** null when the export carries no copy for this failure yet. */
  missingCopy?: boolean;
}

const DISMISS_AFTER_MS = 7000;

/**
 * The export has no toast, so this is built from the same vocabulary the cards use: the card
 * surface, the divyang-notice accent and the picker's close button.
 */
export default function Toast({
  lang,
  items,
  dismiss,
}: {
  lang: Lang;
  items: ToastItem[];
  dismiss: (id: number) => void;
}) {
  const close = strings(lang).Quiz.T.close;

  useEffect(() => {
    if (!items.length) return;
    const timers = items.map((t) => setTimeout(() => dismiss(t.id), DISMISS_AFTER_MS));
    return () => timers.forEach(clearTimeout);
  }, [items, dismiss]);

  return (
    <div
      role="region"
      aria-live="assertive"
      aria-atomic="false"
      data-e="toaststack"
      style={{
        position: "fixed", left: "50%", bottom: "24px", transform: "translateX(-50%)",
        zIndex: 90, display: "flex", flexDirection: "column", gap: "10px",
        width: "min(92vw,520px)", pointerEvents: "none",
        fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif",
      }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          data-e="toast card"
          style={{
            pointerEvents: "auto",
            display: "flex", alignItems: "flex-start", gap: "12px",
            padding: "16px 18px", borderRadius: "16px",
            background: "#FFFFFF", border: "1px solid #E3D9C6",
            borderLeft: "4px solid #B4483A",
            boxShadow: "0 2px 4px rgba(20,32,62,.05),0 18px 40px rgba(20,32,62,.14)",
            animation: "skpnRise .28s ease both",
          }}
        >
          <span style={{ flex: "1 1 auto", fontSize: "16px", lineHeight: "1.7", color: "#161C2E" }}>{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label={close}
            style={{
              width: "32px", height: "32px", flex: "0 0 auto", border: "1px solid #DCD1BC",
              borderRadius: "10px", background: "#FCFAF4", color: "#161C2E", cursor: "pointer",
              fontSize: "17px", lineHeight: "1", fontFamily: "inherit",
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
