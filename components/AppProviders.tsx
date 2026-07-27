"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Lang } from "@/lib/models/types";

export interface SessionInfo {
  signedIn: boolean;
  name: string | null;
  initial: string | null;
  attemptCount: number;
  hasCertificates: boolean;
  lang: Lang;
}

const SIGNED_OUT: SessionInfo = {
  signedIn: false, name: null, initial: null, attemptCount: 0, hasCertificates: false, lang: "hi",
};

const LangContext = createContext<{ lang: Lang; toggle: () => void }>({ lang: "hi", toggle: () => {} });
const SessionContext = createContext<{ session: SessionInfo; loaded: boolean; refresh: () => Promise<void> }>({
  session: SIGNED_OUT, loaded: false, refresh: async () => {},
});

export const useLang = () => useContext(LangContext);
export const useSession = () => useContext(SessionContext);

const readLangCookie = (): Lang | null => {
  const m = document.cookie.match(/(?:^|;\s*)skpn_lang=(hi|en)/);
  return m ? (m[1] as Lang) : null;
};

export default function AppProviders({ children }: { children: React.ReactNode }) {
  // Server-renders in Hindi and corrects on mount, exactly as the export did — that keeps the
  // marketing pages static and CDN-cacheable instead of per-request rendered for one cookie.
  const [lang, setLang] = useState<Lang>("hi");
  const [session, setSession] = useState<SessionInfo>(SIGNED_OUT);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/session", { cache: "no-store" });
    const data: SessionInfo = res.ok ? await res.json() : SIGNED_OUT;
    setSession(data);
    setLoaded(true);
    return data;
  }, []);

  useEffect(() => {
    // The cookie and the session endpoint are both browser-only state the server cannot see, so
    // every setState lands in the promise callback. Calling them from the effect body would
    // cascade a second render on every page in the site.
    const cookieLang = readLangCookie();
    let cancelled = false;
    fetch("/api/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : SIGNED_OUT))
      .then((data: SessionInfo) => {
        if (cancelled) return;
        setSession(data);
        setLoaded(true);
        setLang(cookieLang ?? (data.signedIn ? data.lang : "hi"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(() => {
    setLang((current) => {
      const next: Lang = current === "hi" ? "en" : "hi";
      document.cookie = `skpn_lang=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      void fetch("/api/me/language", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang: next }),
      }).catch(() => {});
      return next;
    });
  }, []);

  return (
    <LangContext.Provider value={{ lang, toggle }}>
      <SessionContext.Provider value={{ session, loaded, refresh: async () => void (await refresh()) }}>
        {children}
      </SessionContext.Provider>
    </LangContext.Provider>
  );
}
