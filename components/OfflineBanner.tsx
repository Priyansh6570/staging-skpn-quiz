"use client";

import { useEffect, useState } from "react";
import { strings, type Lang } from "@/lib/i18n";

/**
 * Non-blocking by construction: a strip pinned to the bottom with pointer-events off, so it can
 * never sit over a question, an option or the timer. A student mid-paper keeps answering, and the
 * autosave retries on its own once the connection returns. It clears itself on reconnect.
 */
export default function OfflineBanner({ lang }: { lang: Lang }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-e="offlinebar"
      style={{
        position: "fixed", left: "0", right: "0", bottom: "0", zIndex: 80,
        pointerEvents: "none",
        padding: "12px 18px",
        background: "#F7EEDA", borderTop: "1px solid #C9A24A",
        color: "#7A5412", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif",
        fontSize: "15.5px", lineHeight: "1.7", textAlign: "center",
      }}
    >
      {strings(lang).Quiz.T.offline}
    </div>
  );
}
