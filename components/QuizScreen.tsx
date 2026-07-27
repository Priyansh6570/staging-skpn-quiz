"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLang, useSession, useShell } from "@/components/AppProviders";
import { strings } from "@/lib/i18n";
import { codeFromResponse } from "@/lib/errors";

const TOTAL = 30;
// Display-only: the submit request is already in flight while these run.
const MIN_SUBMIT_MS = 3000;
const SUCCESS_HOLD_MS = 900;

interface ServedQuestion {
  id: string;
  text: { hi: string; en: string };
  options: { id: string; text: { hi: string; en: string } }[];
}

type Phase = "done" | "instructions" | "attempt";

interface Props {
  phase: Phase;
  attemptId?: string;
}

const mmss = (sec: number) => {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
};

export default function QuizScreen({ phase, attemptId }: Props) {
  const router = useRouter();
  const { lang, toggle: toggleLang } = useLang();
  const { session, refresh } = useSession();
  const { busy, setBusy, showError } = useShell();
  const t = strings(lang).Quiz.T;
  const letters = strings(lang).Quiz.inline.slice(0, 4);

  const [questions, setQuestions] = useState<ServedQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [visited, setVisited] = useState<Record<number, boolean>>({ 0: true });
  const [guard, setGuard] = useState(false);
  const [left, setLeft] = useState(600);
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [offline, setOffline] = useState(false);
  const [auto, setAuto] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [stamp, setStamp] = useState("");
  const [succeeded, setSucceeded] = useState(false);
  const [result, setResult] = useState<{ score: number; answered: number; timeTakenSeconds: number; expired: boolean } | null>(null);

  const expiresAtRef = useRef<number>(0);
  const seqRef = useRef(0);
  const pendingRef = useRef<Map<string, { selectedOptionId: string | null; clientSeq: number }>>(new Map());
  const submittingRef = useRef(false);

  // --- load / resume ---------------------------------------------------------------------------

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/quiz/attempts/${attemptId}`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      // A finished attempt has no screen of its own any more.
      if (data.status !== "in_progress") {
        router.replace("/certificates");
        return;
      }
      setQuestions(data.questions);
      const restored: Record<string, string> = {};
      for (const a of data.answers) if (a.selectedOptionId) restored[a.questionId] = a.selectedOptionId;
      setAnswers(restored);
      seqRef.current = data.answers.reduce((max: number, a: { clientSeq: number }) => Math.max(max, a.clientSeq), 0) + 1;
      // The clock is seeded from the server's clock and its own expiry, never from a local start.
      expiresAtRef.current = Date.parse(data.expiresAt);
      setLeft(Math.max(0, Math.round((expiresAtRef.current - Date.parse(data.serverNow)) / 1000)));
    })();
    return () => { cancelled = true; };
  }, [attemptId, router]);

  useEffect(() => {
    const onNetwork = () => setOffline(!navigator.onLine);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (modal) setModal(false);
      else if (sheet) setSheet(false);
    };
    window.addEventListener("online", onNetwork);
    window.addEventListener("offline", onNetwork);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("online", onNetwork);
      window.removeEventListener("offline", onNetwork);
      document.removeEventListener("keydown", onKey);
    };
  }, [modal, sheet]);

  // --- autosave --------------------------------------------------------------------------------

  const flush = useCallback(async () => {
    if (!attemptId || pendingRef.current.size === 0) return;
    const changes = [...pendingRef.current.entries()].map(([questionId, v]) => ({ questionId, ...v }));
    pendingRef.current.clear();
    const res = await fetch(`/api/quiz/attempts/${attemptId}/answers`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ changes }),
      keepalive: true,
    }).catch(() => null);
    if (!res || !res.ok) {
      // Put the diff back so the next flush retries it, and say so rather than failing silently.
      for (const c of changes) if (!pendingRef.current.has(c.questionId)) pendingRef.current.set(c.questionId, c);
      showError(res ? codeFromResponse(res.status, null) : "save_failed");
    }
  }, [attemptId, showError]);

  // A compact diff every 12s and on unload, not one request per tap: 30 questions times 5 lakh
  // students is the highest write volume in the product.
  useEffect(() => {
    if (phase !== "attempt") return;
    const timer = setInterval(() => void flush(), 12_000);
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [phase, flush]);

  const submit = useCallback(
    async (reason: "manual" | "auto") => {
      if (!attemptId || submittingRef.current) return;
      submittingRef.current = true;
      setBusy(true);

      // The request goes out now; the three seconds run alongside it, never after it. A slow
      // network adds its own latency and nothing on top.
      const request = (async () => {
        await flush();
        return fetch(`/api/quiz/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason }),
        }).catch(() => null);
      })();
      const [res] = await Promise.all([request, new Promise((r) => setTimeout(r, MIN_SUBMIT_MS))]);

      setBusy(false);
      if (!res || !res.ok) {
        submittingRef.current = false;
        showError(res ? codeFromResponse(res.status, await res.json().catch(() => null)) : "network");
        return;
      }

      const data = await res.json();
      setResult(data);
      setStamp(new Date(data.submittedAt).toLocaleString());
      setSucceeded(true);
      await refresh();
      setTimeout(() => router.push("/certificates"), SUCCESS_HOLD_MS);
    },
    [attemptId, flush, refresh, router, setBusy, showError],
  );

  // --- timer -----------------------------------------------------------------------------------

  useEffect(() => {
    if (phase !== "attempt" || !expiresAtRef.current) return;
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.round((expiresAtRef.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 300) setAnnouncement(t.ann5);
      else if (remaining === 120) setAnnouncement(t.ann2);
      else if (remaining === 60) setAnnouncement(t.ann1);
      else if (remaining === 30) setAnnouncement(t.ann30);
      if (remaining <= 0) {
        clearInterval(tick);
        setAuto(true);
        void submit("auto");
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [phase, questions.length, submit, t]);

  // --- derived ---------------------------------------------------------------------------------

  const q = questions[index];
  const currentId = q?.id ?? "";
  const answeredCount = Object.keys(answers).length;
  const visitedUnanswered = Object.keys(visited).filter(
    (k) => answers[questions[Number(k)]?.id ?? ""] === undefined && Number(k) !== index,
  ).length;
  const notVisited = TOTAL - Object.keys(visited).length;
  const level = left <= 30 ? "critical" : left <= 120 ? "warning" : "normal";
  const timer = {
    normal: { fg: "#14203E", bg: "#FCFAF4", border: "#DCD1BC", label: t.normal },
    warning: { fg: "#7A5412", bg: "#F7EEDA", border: "#C9A24A", label: t.warning },
    critical: { fg: "#8C2F1F", bg: "#F7E4E0", border: "#B4483A", label: t.critical },
  }[level];

  const record = (questionId: string, selectedOptionId: string | null) => {
    seqRef.current += 1;
    pendingRef.current.set(questionId, { selectedOptionId, clientSeq: seqRef.current });
  };

  const goTo = (i: number) => {
    if (i !== index && answers[currentId] === undefined) { setGuard(true); return; }
    setVisited((v) => ({ ...v, [i]: true }));
    setIndex(i);
    setGuard(false);
  };

  const paletteStyle = (i: number) => {
    if (i === index) return { bg: "#14203E", fg: "#FFF9EC", border: "2px solid #14203E", radius: "12px", mark: "", markFg: "#FFF9EC", state: t.states[0] };
    if (answers[questions[i]?.id ?? ""] !== undefined) return { bg: "#E8C173", fg: "#1E1503", border: "1.5px solid #B98F3C", radius: "12px", mark: "✓", markFg: "#1E1503", state: t.states[1] };
    if (visited[i]) return { bg: "#FCFAF4", fg: "#161C2E", border: "1.5px dashed #A9B0BE", radius: "12px", mark: "–", markFg: "#161C2E", state: t.states[2] };
    return { bg: "#F2ECE0", fg: "#161C2E", border: "1px solid #E3D9C6", radius: "50%", mark: "", markFg: "#161C2E", state: t.states[3] };
  };

  const isDone = phase === "done";
  const isInstructions = phase === "instructions";
  const isAttempt = phase === "attempt" && !succeeded;
  const isSubmitted = succeeded;

  const begin = async () => {
    const res = await busy(
      fetch("/api/quiz/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rulesAccepted: true }),
      }).catch(() => null),
    );
    if (!res) {
      showError("network");
      return;
    }
    if (res.status === 409) {
      showError("already_attempted");
      router.push("/quiz");
      return;
    }
    if (!res.ok) {
      showError(codeFromResponse(res.status, await res.json().catch(() => null)));
      return;
    }
    const data = await res.json();
    await refresh();
    router.push(`/quiz/attempt/${data.attemptId}`);
  };

  const clock = mmss(left);
  const progressLine = `${t.questionOf} ${index + 1} ${t.of} ${TOTAL}`;
  const progressPct = `${Math.round(((index + 1) / TOTAL) * 100)}%`;
  const questionCounter = `${t.questionOf} ${index + 1} / ${TOTAL}`;
  const question = { text: q ? q.text[lang] : "", options: q ? q.options.map((o) => o.text[lang]) : [] };
  const offlineDisplay = offline ? "block" : "none";
  const hiBg = lang === "hi" ? "#14203E" : "transparent";
  const hiFg = lang === "hi" ? "#FDF3DF" : "#161C2E";
  const enBg = lang === "en" ? "#14203E" : "transparent";
  const enFg = lang === "en" ? "#FDF3DF" : "#161C2E";

  const options = (q?.options ?? []).map((option, i) => {
    const on = answers[currentId] === option.id;
    return {
      text: option.text[lang],
      letter: letters[i],
      on,
      select: () => {
        setAnswers((a) => ({ ...a, [currentId]: option.id }));
        record(currentId, option.id);
        setGuard(false);
      },
      bg: on ? "#F7F2E6" : "#FCFAF4",
      fg: "#161C2E",
      border: on ? "#14203E" : "#E3D9C6",
      markBg: on ? "#14203E" : "#FFFFFF",
      markFg: on ? "#FFF9EC" : "#161C2E",
      markBorder: on ? "#14203E" : "#DCD1BC",
    };
  });

  const guardDisplay = guard && answers[currentId] === undefined ? "inline-flex" : "none";
  const prev = () => { if (index > 0) goTo(index - 1); };
  const prevCursor = index === 0 ? "not-allowed" : "pointer";
  const prevFg = index === 0 ? "#9AA2B1" : "#161C2E";
  const next = () => {
    if (answers[currentId] === undefined) { setGuard(true); return; }
    if (index < TOTAL - 1) goTo(index + 1);
    else { setModal(true); setGuard(false); }
  };
  const nextLabel = index === TOTAL - 1 ? t.submit : t.nextLabel;
  const nextBg = "#14203E";
  const nextFg = "#FDF3DF";
  const clearAnswer = () => {
    setAnswers((a) => {
      const copy = { ...a };
      delete copy[currentId];
      return copy;
    });
    record(currentId, null);
  };
  const clearDisplay = answers[currentId] === undefined ? "none" : "inline-flex";

  const palette = Array.from({ length: TOTAL }, (_, i) => {
    const st = paletteStyle(i);
    return {
      n: String(i + 1), bg: st.bg, fg: st.fg, border: st.border, radius: st.radius, mark: st.mark, markFg: st.markFg,
      current: (i === index ? "true" : "false") as "true" | "false",
      aria: `${t.questionOf} ${i + 1}, ${st.state}`,
      go: () => goTo(i),
      goClose: () => { goTo(i); setSheet(false); },
    };
  });

  const counts = [
    { label: t.states[1], value: String(answeredCount), bg: "#E8C173", fg: "#1E1503", border: "1.5px solid #B98F3C", radius: "8px", mark: "✓" },
    { label: t.states[2], value: String(visitedUnanswered), bg: "#FCFAF4", fg: "#161C2E", border: "1.5px dashed #A9B0BE", radius: "8px", mark: "–" },
    { label: t.states[3], value: String(notVisited < 0 ? 0 : notVisited), bg: "#F2ECE0", fg: "#161C2E", border: "1px solid #E3D9C6", radius: "50%", mark: "" },
    { label: t.states[0], value: String(index + 1), bg: "#14203E", fg: "#FFF9EC", border: "2px solid #14203E", radius: "8px", mark: "" },
  ];
  const answeredOf = `${answeredCount} / ${TOTAL}`;

  const sheetOpen = sheet;
  const sheetDisplay = sheet ? "flex" : "none";
  const openSheet = () => setSheet(true);
  const closeSheet = () => setSheet(false);
  const modalDisplay = modal ? "flex" : "none";
  const askSubmit = () => { setModal(true); setSheet(false); };
  const closeModal = () => setModal(false);
  const confirmSubmit = () => { setModal(false); void submit("manual"); };

  const summary = [
    { label: t.summary[0], value: String(answeredCount) },
    { label: t.summary[1], value: String(TOTAL - answeredCount) },
    { label: t.summary[2], value: mmss(left) },
  ];

  const submittedKind = auto || result?.expired ? t.submittedAuto : t.submittedManual;
  const stampLine = `${t.stamp}: ${stamp}`;
  const results = [
    { label: t.results[0], value: String(result?.answered ?? answeredCount) },
    { label: t.results[1], value: String(TOTAL - (result?.answered ?? answeredCount)) },
    { label: t.results[2], value: "1" },
    { label: t.results[3], value: mmss(result?.timeTakenSeconds ?? 600 - left) },
  ];

  const signedIn = session.signedIn;
  const hasCerts = session.hasCertificates;
  return (
    <div data-page="Quiz" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "hidden" }}>

      {isDone ? (
        <div>
          <SiteHeader lang={lang} active="certificates" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />
          <section data-e="pad" style={{ maxWidth: "780px", margin: "0 auto", padding: "66px 30px 96px" }}>
            <span aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "74px", height: "74px", borderRadius: "50%", background: "#F4EBD8", border: "1px solid #E5D3AC", marginBottom: "26px" }}>
              <svg viewBox="0 0 32 32" width="34" height="34" fill="none" stroke="#8A6015" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: "block" }}><circle cx="16" cy="16" r="11"></circle><path d="M11 16.4l3.4 3.3L21 12.6"></path></svg>
            </span>
            <h1 style={{ margin: "0 0 14px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(26px,3.8vw,38px)", lineHeight: "1.3", color: "#14203E" }}>{t.onceTitle}</h1>
            <p style={{ margin: "0 0 32px", maxWidth: "56ch", fontSize: "17.5px", lineHeight: "1.85", color: "#161C2E" }}>{t.onceBody}</p>
            <div data-e="ctarow" style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <a href="Certificates.dc.html" data-e="cta" style={{ minHeight: "58px", padding: "17px 32px", borderRadius: "999px", background: "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: "#1E1503", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "600", lineHeight: "1.5" }}>{t.download}</a>
              <a href="Home v5.dc.html" data-e="cta" style={{ minHeight: "56px", padding: "16px 28px", border: "1px solid #DCD1BC", borderRadius: "999px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "17px", lineHeight: "1.5", color: "#161C2E" }}>{t.home}</a>
            </div>
          </section>
          <SiteFooter lang={lang} />
        </div>
      ) : null}

      {isInstructions ? (
        <div>
          <SiteHeader lang={lang} active="pratiyogita" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />
          <section data-e="pad" style={{ maxWidth: "860px", margin: "0 auto", padding: "52px 30px 76px" }}>
            <h1 style={{ margin: "0 0 12px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(26px,3.8vw,38px)", lineHeight: "1.3", color: "#14203E" }}>{t.insTitle}</h1>
            <p style={{ margin: "0 0 30px", maxWidth: "56ch", fontSize: "17.5px", lineHeight: "1.85", color: "#161C2E" }}>{t.insLede}</p>
            <ul data-e="card" style={{ margin: "0 0 26px", padding: "30px", listStyle: "none", background: "#FFFFFF", borderRadius: "20px", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 16px 34px rgba(20,32,62,.07)", display: "flex", flexDirection: "column", gap: "14px" }}>
              {t.instructions.map((i, iIndex) => (
                <li key={iIndex} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <span aria-hidden="true" style={{ marginTop: "8px", width: "8px", height: "8px", flex: "0 0 auto", borderRadius: "50%", background: "#E8C173" }}></span>
                  <span style={{ fontSize: "17px", lineHeight: "1.85", color: "#161C2E" }}>{i}</span>
                </li>
              ))}
            </ul>
            <p style={{ margin: "0 0 28px", padding: "20px 24px", borderLeft: "3px solid #8A6015", borderRadius: "0 16px 16px 0", background: "#F4EBD8", fontSize: "17px", lineHeight: "1.85", color: "#161C2E" }}>{t.insWarning}</p>
            <div data-e="ctarow" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              <button type="button" onClick={begin} data-e="cta" style={{ minHeight: "58px", padding: "17px 34px", border: "0", borderRadius: "999px", background: "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: "#1E1503", cursor: "pointer", fontSize: "18.5px", fontWeight: "600", lineHeight: "1.5" }}>{t.begin}</button>
              <a href="Pratiyogita.dc.html" data-e="cta" style={{ minHeight: "56px", padding: "16px 28px", border: "1px solid #DCD1BC", borderRadius: "999px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "17px", lineHeight: "1.5", color: "#161C2E" }}>{t.exit}</a>
            </div>
          </section>
          <SiteFooter lang={lang} />
        </div>
      ) : null}

      {isAttempt ? (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#FBF7F0" }}>
          <header style={{ position: "sticky", top: "0", zIndex: "40", background: "#FFFFFF", borderBottom: "1px solid #E8DFCE" }}>
            <div data-e="pad" style={{ maxWidth: "1220px", margin: "0 auto", padding: "10px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
              <img src="uploads/skpn-logo.png" alt="श्रीकृष्ण पाथेय न्यास" width="38" height="38" style={{ display: "block", width: "38px", height: "38px", flex: "0 0 auto" }} />
              <span style={{ fontSize: "15.5px", lineHeight: "1.6", color: "#161C2E", whiteSpace: "nowrap" }}>{progressLine}</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
                <button type="button" onClick={toggleLang} aria-label="Switch language" style={{ display: "flex", alignItems: "center", border: "1px solid #DCD1BC", background: "#FCFAF4", borderRadius: "999px", padding: "3px", cursor: "pointer" }}>
                  <span style={{ padding: "5px 11px", fontSize: "14px", lineHeight: "1.5", borderRadius: "999px", background: `${hiBg}`, color: `${hiFg}` }}>हिं</span>
                  <span style={{ padding: "5px 11px", fontSize: "14px", lineHeight: "1.5", borderRadius: "999px", background: `${enBg}`, color: `${enFg}` }}>EN</span>
                </button>
                <div role="timer" aria-label={t.timeLeft} style={{ display: "flex", alignItems: "center", gap: "9px", padding: "9px 16px", border: `1.5px solid ${timer.border}`, borderRadius: "999px", background: `${timer.bg}` }}>
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke={timer.fg} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false" style={{ display: "block" }}><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3.5 2.2"></path></svg>
                  <span style={{ fontSize: "19px", fontWeight: "600", lineHeight: "1.4", color: `${timer.fg}`, fontVariantNumeric: "tabular-nums" }}>{clock}</span>
                  <span style={{ fontSize: "14px", lineHeight: "1.5", color: `${timer.fg}` }}>{timer.label}</span>
                </div>
              </div>
            </div>
            <div aria-hidden="true" style={{ height: "3px", background: "#F0EADD" }}><div style={{ height: "3px", width: `${progressPct}`, background: "#E8C173", transition: "width .2s linear" }}></div></div>
          </header>

          <p aria-live="polite" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{announcement}</p>

          <div style={{ display: `${offlineDisplay}`, background: "#F4EBD8", borderBottom: "1px solid #E5D3AC" }}>
            <p data-e="pad" style={{ margin: "0", maxWidth: "1220px", padding: "12px 24px", fontSize: "15.5px", lineHeight: "1.7", color: "#161C2E" }}>{t.offline}</p>
          </div>

          <div data-g="quiz" data-e="pad qpad" style={{ flex: "1 1 auto", maxWidth: "1220px", width: "100%", margin: "0 auto", padding: "28px 24px 40px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: "26px", alignItems: "start" }}>
            <main data-e="card" style={{ padding: "30px", background: "#FFFFFF", borderRadius: "20px", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 14px 30px rgba(20,32,62,.06)" }}>
              <p style={{ margin: "0 0 14px", fontSize: "15px", letterSpacing: ".06em", textTransform: "uppercase", color: "#161C2E", lineHeight: "1.8" }}>{questionCounter}</p>
              <h1 style={{ margin: "0 0 24px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "500", fontSize: "clamp(21px,2.6vw,27px)", lineHeight: "1.6", color: "#161C2E" }}>{question.text}</h1>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {options.map((o, oIndex) => (
                  <button key={oIndex} type="button" onClick={o.select} aria-pressed={o.on} style={{ minHeight: "60px", padding: "16px 20px", textAlign: "left", display: "flex", alignItems: "center", gap: "14px", border: `1.5px solid ${o.border}`, borderRadius: "16px", background: `${o.bg}`, cursor: "pointer", fontSize: "17.5px", lineHeight: "1.7", color: `${o.fg}`, transition: "border-color .14s ease,background .14s ease" }}>
                    <span aria-hidden="true" style={{ width: "30px", height: "30px", flex: "0 0 auto", borderRadius: "50%", border: `1.5px solid ${o.markBorder}`, background: `${o.markBg}`, color: `${o.markFg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: "600" }}>{o.letter}</span>
                    <span>{o.text}</span>
                  </button>
                ))}
              </div>
              <div role="status" style={{ display: `${guardDisplay}`, alignItems: "center", gap: "10px", marginTop: "18px", padding: "12px 18px", borderRadius: "999px", background: "#FBEEDC", border: "1px solid #E4C48A", fontSize: "16px", lineHeight: "1.6", color: "#7A4B0C", width: "fit-content" }}>
                <span aria-hidden="true" style={{ width: "22px", height: "22px", flex: "0 0 auto", borderRadius: "50%", background: "#E8C173", color: "#3A2703", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700" }}>!</span>
                <span>{t.guardMsg}</span>
              </div>
              <div data-e="ctarow" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginTop: "26px", paddingTop: "22px", borderTop: "1px solid #F0EADD" }}>
                <button type="button" onClick={prev} style={{ minHeight: "52px", padding: "14px 22px", border: "1px solid #DCD1BC", borderRadius: "999px", background: "#FCFAF4", cursor: `${prevCursor}`, fontSize: "16.5px", lineHeight: "1.5", color: `${prevFg}` }}>{t.prev}</button>
                <button type="button" onClick={clearAnswer} style={{ minHeight: "52px", padding: "14px 22px", border: "1px solid #DCD1BC", borderRadius: "999px", background: "#FCFAF4", cursor: "pointer", fontSize: "16.5px", lineHeight: "1.5", color: "#161C2E", display: `${clearDisplay}` }}>{t.clear}</button>
                <button type="button" onClick={next} style={{ marginLeft: "auto", minHeight: "54px", padding: "15px 30px", border: "0", borderRadius: "999px", background: `${nextBg}`, color: `${nextFg}`, cursor: "pointer", fontSize: "17.5px", fontWeight: "600", lineHeight: "1.5" }}>{nextLabel}</button>
              </div>
            </main>

            <aside data-e="palette-desktop card" style={{ padding: "24px", background: "#FFFFFF", borderRadius: "20px", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 14px 30px rgba(20,32,62,.06)", position: "sticky", top: "96px" }}>
              <p style={{ margin: "0 0 14px", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "15.5px", letterSpacing: ".01em", color: "#161C2E", lineHeight: "1.8" }}>{t.paletteTitle}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: "8px", marginBottom: "20px" }}>
                {palette.map((p, pIndex) => (
                  <button key={pIndex} type="button" onClick={p.go} aria-label={p.aria} aria-current={p.current} style={{ aspectRatio: "1/1", minWidth: "38px", minHeight: "38px", border: `${p.border}`, borderRadius: `${p.radius}`, background: `${p.bg}`, color: `${p.fg}`, cursor: "pointer", fontSize: "14.5px", fontWeight: "600", lineHeight: "1", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", fontVariantNumeric: "tabular-nums" }}>{p.n}<span aria-hidden="true" style={{ position: "absolute", right: "2px", bottom: "1px", fontSize: "11px", lineHeight: "1", color: `${p.markFg}` }}>{p.mark}</span></button>
                ))}
              </div>
              <dl style={{ margin: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
                {counts.map((c, cIndex) => (
                  <div key={cIndex} style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                    <span aria-hidden="true" style={{ width: "26px", height: "26px", flex: "0 0 auto", border: `${c.border}`, borderRadius: `${c.radius}`, background: `${c.bg}`, color: `${c.fg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "600" }}>{c.mark}</span>
                    <dt style={{ flex: "1 1 auto", fontSize: "15.5px", lineHeight: "1.6", color: "#161C2E" }}>{c.label}</dt>
                    <dd style={{ margin: "0", fontSize: "16px", fontWeight: "600", lineHeight: "1.5", color: "#161C2E", fontVariantNumeric: "tabular-nums" }}>{c.value}</dd>
                  </div>
                ))}
              </dl>
              <button type="button" onClick={askSubmit} style={{ marginTop: "22px", width: "100%", minHeight: "54px", padding: "15px", border: "0", borderRadius: "999px", background: "#14203E", color: "#FDF3DF", cursor: "pointer", fontSize: "17.5px", fontWeight: "600", lineHeight: "1.5" }}>{t.submit}</button>
            </aside>
          </div>

          <div data-e="palette-bar" style={{ display: "none", position: "fixed", left: "0", right: "0", bottom: "0", zIndex: "45", background: "#FFFFFF", borderTop: "1px solid #E8DFCE", padding: "12px 16px", gap: "12px", alignItems: "center", boxShadow: "0 -6px 24px rgba(20,32,62,.1)" }}>
            <button type="button" onClick={openSheet} aria-expanded={sheetOpen} style={{ flex: "1 1 auto", minHeight: "52px", padding: "14px 18px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FCFAF4", cursor: "pointer", fontSize: "16.5px", lineHeight: "1.5", color: "#161C2E", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <span>{t.paletteTitle}</span>
              <span style={{ fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>{answeredOf}</span>
            </button>
            <button type="button" onClick={askSubmit} style={{ flex: "0 0 auto", minHeight: "52px", padding: "14px 22px", border: "0", borderRadius: "14px", background: "#14203E", color: "#FDF3DF", cursor: "pointer", fontSize: "16.5px", fontWeight: "600", lineHeight: "1.5" }}>{t.submit}</button>
          </div>

          <div role="dialog" aria-modal="true" aria-label={t.paletteTitle} style={{ display: `${sheetDisplay}`, position: "fixed", inset: "0", zIndex: "60", background: "rgba(11,18,38,.5)", alignItems: "flex-end" }}>
            <div style={{ width: "100%", maxHeight: "80vh", overflow: "auto", background: "#FFFFFF", borderRadius: "22px 22px 0 0", padding: "22px 18px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
                <p style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "19px", lineHeight: "1.5", color: "#14203E" }}>{t.paletteTitle}</p>
                <button type="button" onClick={closeSheet} aria-label={t.close} style={{ width: "46px", height: "46px", border: "1px solid #DCD1BC", borderRadius: "14px", background: "#FCFAF4", cursor: "pointer", fontSize: "19px", lineHeight: "1", color: "#161C2E" }}>×</button>
              </div>
              <div role="status" style={{ display: `${guardDisplay}`, alignItems: "center", gap: "10px", marginBottom: "16px", padding: "12px 16px", borderRadius: "14px", background: "#FBEEDC", border: "1px solid #E4C48A", fontSize: "15.5px", lineHeight: "1.6", color: "#7A4B0C" }}>
                <span aria-hidden="true" style={{ width: "22px", height: "22px", flex: "0 0 auto", borderRadius: "50%", background: "#E8C173", color: "#3A2703", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700" }}>!</span>
                <span>{t.guardMsg}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: "8px", marginBottom: "20px" }}>
                {palette.map((p, pIndex) => (
                  <button key={pIndex} type="button" onClick={p.goClose} aria-label={p.aria} style={{ aspectRatio: "1/1", minWidth: "44px", minHeight: "44px", border: `${p.border}`, borderRadius: `${p.radius}`, background: `${p.bg}`, color: `${p.fg}`, cursor: "pointer", fontSize: "15px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", fontVariantNumeric: "tabular-nums" }}>{p.n}<span aria-hidden="true" style={{ position: "absolute", right: "3px", bottom: "1px", fontSize: "11px", lineHeight: "1", color: `${p.markFg}` }}>{p.mark}</span></button>
                ))}
              </div>
              <dl style={{ margin: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
                {counts.map((c, cIndex) => (
                  <div key={cIndex} style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                    <span aria-hidden="true" style={{ width: "26px", height: "26px", flex: "0 0 auto", border: `${c.border}`, borderRadius: `${c.radius}`, background: `${c.bg}`, color: `${c.fg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "600" }}>{c.mark}</span>
                    <dt style={{ flex: "1 1 auto", fontSize: "15.5px", lineHeight: "1.6", color: "#161C2E" }}>{c.label}</dt>
                    <dd style={{ margin: "0", fontSize: "16px", fontWeight: "600", lineHeight: "1.5", color: "#161C2E", fontVariantNumeric: "tabular-nums" }}>{c.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div role="dialog" aria-modal="true" aria-label={t.confirmTitle} style={{ display: `${modalDisplay}`, position: "fixed", inset: "0", zIndex: "70", background: "rgba(11,18,38,.55)", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div data-e="card" style={{ width: "100%", maxWidth: "700px", background: "#FFFFFF", borderRadius: "22px", padding: "30px", boxShadow: "0 30px 70px rgba(11,18,38,.4)" }}>
              <h2 style={{ margin: "0 0 18px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "23px", lineHeight: "1.4", color: "#14203E" }}>{t.confirmTitle}</h2>
              <dl style={{ margin: "0 0 20px", display: "flex", flexDirection: "column" }}>
                {summary.map((r, rIndex) => (
                  <div key={rIndex} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px", padding: "13px 0", borderTop: "1px solid #F0EADD" }}>
                    <dt style={{ fontSize: "16.5px", lineHeight: "1.6", color: "#161C2E" }}>{r.label}</dt>
                    <dd style={{ margin: "0", fontSize: "18px", fontWeight: "600", lineHeight: "1.5", color: "#161C2E", fontVariantNumeric: "tabular-nums" }}>{r.value}</dd>
                  </div>
                ))}
              </dl>
              <p data-e="cwarn" style={{ margin: "0 0 24px", padding: "16px 20px", borderRadius: "14px", background: "#F4EBD8", fontSize: "16px", lineHeight: "1.8", color: "#161C2E" }}>{t.confirmWarn1} <br />{t.confirmWarn2}</p>
              <div data-e="ctarow" style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                <button type="button" onClick={closeModal} style={{ flex: "1 1 auto", minHeight: "56px", maxHeight: "56px", padding: "0 26px", border: "0", borderRadius: "999px", background: "#14203E", color: "#FDF3DF", cursor: "pointer", fontSize: "17.5px", fontWeight: "600", lineHeight: "1.5" }}>{t.goBack}</button>
                <button type="button" onClick={confirmSubmit} style={{ flex: "1 1 auto", minHeight: "54px", maxHeight: "54px", padding: "0 24px", border: "1px solid #DCD1BC", borderRadius: "999px", background: "#FCFAF4", cursor: "pointer", fontSize: "16.5px", lineHeight: "1.5", color: "#161C2E" }}>{t.confirm}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isSubmitted ? (
        <div>
          <SiteHeader lang={lang} active="certificates" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />
          <section data-e="pad" style={{ maxWidth: "900px", margin: "0 auto", padding: "52px 30px 76px" }}>
            <p style={{ margin: "0 0 12px", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "17px", letterSpacing: ".01em", color: "#161C2E", lineHeight: "1.9" }}>{submittedKind}</p>
            <h1 style={{ margin: "0 0 10px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(26px,3.8vw,38px)", lineHeight: "1.3", color: "#14203E" }}>{t.doneTitle}</h1>
            <p style={{ margin: "0 0 30px", fontSize: "17px", lineHeight: "1.8", color: "#161C2E" }}>{stampLine}</p>

            <div data-g="two" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "18px", marginBottom: "26px" }}>
              {results.map((r, rIndex) => (
                <div key={rIndex} data-e="card" style={{ padding: "26px 28px", background: "#FFFFFF", borderRadius: "20px", boxShadow: "0 2px 4px rgba(20,32,62,.05),0 14px 30px rgba(20,32,62,.06)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "15.5px", lineHeight: "1.6", color: "#161C2E" }}>{r.label}</span>
                  <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "30px", lineHeight: "1.3", color: "#14203E", fontVariantNumeric: "tabular-nums" }}>{r.value}</span>
                </div>
              ))}
            </div>

            <p style={{ margin: "0 0 30px", fontSize: "16.5px", lineHeight: "1.85", color: "#161C2E", maxWidth: "66ch" }}>{t.resultsNote}</p>

            <div data-e="ctarow" style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <a href="Certificates.dc.html" data-e="cta" style={{ minHeight: "58px", padding: "17px 32px", borderRadius: "999px", background: "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)", color: "#1E1503", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "600", lineHeight: "1.5" }}>{t.download}</a>
              <a href="Profile.dc.html" data-e="cta" style={{ minHeight: "56px", padding: "16px 28px", border: "1px solid #DCD1BC", borderRadius: "999px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "17px", lineHeight: "1.5", color: "#161C2E" }}>{t.profile}</a>
            </div>
          </section>
          <SiteFooter lang={lang} />
        </div>
      ) : null}
    </div>
  );
}
