"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Loader from "@/components/Loader";
import MotionShell from "@/components/MotionShell";
import Toast, { type ToastItem } from "@/components/Toast";
import { errorMessage, type ErrorCode } from "@/lib/errors";
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
const ShellContext = createContext<{
  busy: <T>(work: Promise<T>) => Promise<T>;
  setBusy: (on: boolean) => void;
  showError: (code: ErrorCode) => void;
}>({ busy: (w) => w, setBusy: () => {}, showError: () => {} });

export const useLang = () => useContext(LangContext);
export const useSession = () => useContext(SessionContext);
export const useShell = () => useContext(ShellContext);

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
  const [pending, setPending] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/session", { cache: "no-store" });
    const data: SessionInfo = res.ok ? await res.json() : SIGNED_OUT;
    setSession(data);
    setLoaded(true);
    return data;
  }, []);

  useEffect(() => {
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

  /*
   * The export's click shim is deliberately not ported. It existed because every link was a full
   * document load between .dc.html files, and the shell hid the white flash. The App Router
   * navigates client-side, so there is no flash to cover — and a click-driven shell cannot tell
   * next/link (which cancels the click to route) from a control that cancels it to run an action,
   * so it stranded the overlay on the sign-in button. AUDIT.md §6.7 reaches the same conclusion.
   *
   * The loader is raised by the async actions themselves instead, which is where a student
   * actually waits.
   */

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const showError = useCallback(
    (code: ErrorCode) => {
      const { message, missingCopy } = errorMessage(lang, code);
      toastId.current += 1;
      setToasts((list) => [...list, { id: toastId.current, message, missingCopy }]);
    },
    [lang],
  );

  const setBusy = useCallback((on: boolean) => setPending((n) => Math.max(0, n + (on ? 1 : -1))), []);

  const busy = useCallback(
    async <T,>(work: Promise<T>): Promise<T> => {
      setBusy(true);
      try {
        return await work;
      } finally {
        setBusy(false);
      }
    },
    [setBusy],
  );

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
        <ShellContext.Provider value={{ busy, setBusy, showError }}>
          {children}
          <MotionShell />
          <Loader lang={lang} visible={pending > 0} />
          <Toast lang={lang} items={toasts} dismiss={dismiss} />
        </ShellContext.Provider>
      </SessionContext.Provider>
    </LangContext.Provider>
  );
}
