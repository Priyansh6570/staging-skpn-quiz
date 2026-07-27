"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useLang, useSession, useShell } from "@/components/AppProviders";
import { strings } from "@/lib/i18n";
import { codeFromResponse } from "@/lib/errors";

export default function RulesContent({ gated = false }: { gated?: boolean }) {
  const router = useRouter();
  const { lang, toggle: toggleLang } = useLang();
  const { session, refresh } = useSession();
  const { busy, showError } = useShell();
  const [accepted, setAccepted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const t = strings(lang).Rules.S;

  useEffect(() => {
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const secs = Array.from(document.querySelectorAll("[data-e~='rulesec']"));
        let idx = 0;
        secs.forEach((el, i) => {
          if (el.getBoundingClientRect().top < 180) idx = i;
        });
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setActive(idx);
        setProgress(Math.min(100, Math.max(0, (window.scrollY / max) * 100)));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Anchor slugs are structure, not copy, so they stay out of i18n; order matches t.sections.
  const SECTION_IDS = ["eligibility", "application", "format", "selection", "other"];

  const ok = accepted;
  const chips = t.chips;
  const sections = t.sections.map((s, i) => ({
    id: SECTION_IDS[i],
    n: s.n,
    title: s.title,
    points: s.points.map((p, i) => ({ n: String(i + 1), text: p })),
  }));
  const toc = t.sections.map((s, i) => ({
    label: s.title,
    n: s.n,
    href: `#${SECTION_IDS[i]}`,
    bg: i === active ? "#F4EBD8" : "transparent",
    fg: i === active ? "#14203E" : "#161C2E",
    numFg: i === active ? "#8A6015" : "#161C2E",
    mark: i === active ? "#E8C173" : "transparent",
  }));

  // On /rules the acceptance block is the export's own gate. On /quiz/rules the route is already
  // auth-gated, so the block always shows and continuing records acceptance for the attempt.
  const signedIn = gated || (session.signedIn && session.attemptCount === 0);
  const hasCerts = session.hasCertificates;
  const blocked = !ok;
  const q = strings(lang).Quiz.T;
  // The instructions screen is gone; its warnings move above the checkbox so they are still read
  // before the clock starts.
  const warnings = [q.insLede, ...q.instructions, q.insWarning];

  const startAttempt = async () => {
    if (!ok || starting) return;
    setStarting(true);
    const res = await busy(
      fetch("/api/quiz/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rulesAccepted: true }),
      }).catch(() => null),
    );
    setStarting(false);
    if (!res) { showError("network"); return; }
    if (res.status === 409) { showError("already_attempted"); router.push("/quiz"); return; }
    if (!res.ok) { showError(codeFromResponse(res.status, await res.json().catch(() => null))); return; }
    const data = await res.json();
    await refresh();
    router.push(`/quiz/attempt/${data.attemptId}`);
  };

  const continueBg = ok ? "linear-gradient(180deg,#F6E0AC 0%,#E8C173 100%)" : "rgba(255,249,236,.12)";
  const continueFg = ok ? "#1E1503" : "#DBD5C7";
  const continueEvents = ok ? "auto" : "none";
  const continueShadow = ok ? "0 12px 30px rgba(232,193,115,.28)" : "none";
  const checkBorder = ok ? "#E8C173" : "rgba(255,249,236,.28)";
  const checkBg = ok ? "rgba(232,193,115,.12)" : "rgba(255,255,255,.04)";
  const toggleAccept = () => setAccepted((a) => !a);
  return (
    <div data-page="Rules" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "clip" }}>
      <SiteHeader lang={lang} active="rules" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />

      <section style={{ position: "relative", overflow: "hidden", background: "#0B1226", borderBottom: "1px solid rgba(232,193,115,.24)" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: "-10%", backgroundImage: "radial-gradient(1.5px 1.5px at 14% 26%, rgba(255,238,196,.7), transparent 60%),radial-gradient(1.2px 1.2px at 74% 18%, rgba(255,238,196,.55), transparent 60%),radial-gradient(1.5px 1.5px at 42% 72%, rgba(255,238,196,.5), transparent 60%),radial-gradient(1.1px 1.1px at 88% 66%, rgba(255,238,196,.6), transparent 60%)", backgroundSize: "460px 460px", animation: "rl-drift 44s linear infinite alternate", opacity: ".7" }}></div>
        <div aria-hidden="true" style={{ position: "absolute", right: "-8%", top: "-40%", width: "560px", height: "560px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.18) 0%,rgba(232,193,115,0) 68%)", animation: "rl-glow 10s ease-in-out infinite" }}></div>
        <div data-e="pad" style={{ position: "relative", maxWidth: "1220px", margin: "0 auto", padding: "56px 30px 50px" }}>
          <p style={{ margin: "0 0 12px", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "17px", letterSpacing: ".01em", color: "#E8C173", lineHeight: "1.9" }}>{t.kicker}</p>
          <h1 style={{ margin: "0 0 16px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(27px,4vw,44px)", lineHeight: "1.26", color: "#FFF9EC", maxWidth: "26ch", textWrap: "balance" }}>{t.title}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {chips.map((c, cIndex) => (
              <span key={cIndex} style={{ padding: "9px 18px", borderRadius: "999px", border: "1px solid rgba(255,255,255,.5)", background: "rgba(255,255,255,.12)", color: "#FFFFFF", fontSize: "15.5px", lineHeight: "1.6", whiteSpace: "nowrap" }}>{c}</span>
            ))}
          </div>
        </div>
        <div aria-hidden="true" style={{ position: "relative", height: "3px", background: "rgba(255,249,236,.12)" }}>
          <span style={{ display: "block", height: "100%", width: `${progress}`, background: "linear-gradient(90deg,rgba(232,193,115,.3),#E8C173)", transition: "width .12s linear" }}></span>
        </div>
      </section>

      <section data-e="pad section" style={{ maxWidth: "1220px", margin: "0 auto", padding: "48px 30px 72px" }}>
        <div data-g="rules" style={{ display: "grid", gridTemplateColumns: "minmax(0,.3fr) minmax(0,1fr)", gap: "48px", alignItems: "start" }}>
          <nav data-e="toc" aria-label={t.tocLabel} style={{ position: "sticky", top: "92px" }}>
            <p style={{ margin: "0 0 12px", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "15.5px", letterSpacing: ".01em", color: "#161C2E", lineHeight: "1.8" }}>{t.tocLabel}</p>
            <div data-e="toclist" style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {toc.map((s, sIndex) => (
                <a key={sIndex} href={s.href} data-e="tocitem" style={{ display: "flex", alignItems: "center", gap: "11px", padding: "10px 13px", borderRadius: "12px", fontSize: "15.5px", lineHeight: "1.6", background: `${s.bg}`, color: `${s.fg}`, borderLeft: `2px solid ${s.mark}`, transition: "background .2s ease,color .2s ease,border-color .2s ease" }}>
                  <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "12.5px", letterSpacing: ".06em", color: `${s.numFg}` }}>{s.n}</span>
                  {s.label}
                </a>
              ))}
            </div>
          </nav>

          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            {sections.map((s, sIndex) => (
              <section key={sIndex} id={s.id} data-reveal data-e="rulesec" style={{ position: "relative", overflow: "hidden", scrollMarginTop: "100px", padding: "30px 32px 32px", borderRadius: "24px", background: "#FFFFFF", border: "1px solid #EFE5D3", boxShadow: "0 2px 4px rgba(20,32,62,.04),0 16px 40px rgba(20,32,62,.06)" }}>
                <span aria-hidden="true" style={{ position: "absolute", right: "-40px", top: "-46px", width: "180px", height: "180px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.16) 0%,rgba(232,193,115,0) 70%)" }}></span>
                <span aria-hidden="true" style={{ position: "absolute", right: "22px", top: "10px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "700", fontSize: "74px", lineHeight: "1", color: "rgba(20,32,62,.05)", fontVariantNumeric: "tabular-nums" }}>{s.n}</span>
                <div data-e="sechead" style={{ position: "relative", display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", paddingBottom: "18px", borderBottom: "1px solid #F0E8D8" }}>
                  <span style={{ width: "44px", height: "44px", flex: "0 0 auto", borderRadius: "14px", background: "#14203E", color: "#F3DDAE", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "19px", fontVariantNumeric: "tabular-nums" }}>{s.n}</span>
                  <h2 style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(21px,2.5vw,26px)", lineHeight: "1.38", color: "#14203E", textWrap: "pretty" }}>{s.title}</h2>
                </div>
                <ol style={{ position: "relative", margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "14px" }}>
                  {s.points.map((p, pIndex) => (
                    <li key={pIndex} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                      <span aria-hidden="true" style={{ marginTop: "2px", width: "26px", height: "26px", flex: "0 0 auto", borderRadius: "9px", background: "#F7EFDD", border: "1px solid #EADFC5", color: "#8A6015", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "600", fontVariantNumeric: "tabular-nums" }}>{p.n}</span>
                      <span style={{ fontSize: "17px", lineHeight: "1.85", color: "#161C2E", textWrap: "pretty" }}>{p.text}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            {signedIn ? (
            <div data-e="card" data-reveal style={{ position: "relative", overflow: "hidden", padding: "30px 32px", background: "linear-gradient(150deg,#101838 0%,#070B1E 100%)", borderRadius: "24px", boxShadow: "0 18px 44px rgba(20,32,62,.22)" }}>
              <span aria-hidden="true" style={{ position: "absolute", left: "-60px", bottom: "-80px", width: "280px", height: "280px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.18) 0%,rgba(232,193,115,0) 70%)", animation: "rl-glow 9s ease-in-out infinite" }}></span>
              <p style={{ position: "relative", margin: "0 0 10px", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "15.5px", letterSpacing: ".01em", color: "#E8C173", lineHeight: "1.8" }}>{t.endLabel}</p>
              <p style={{ position: "relative", margin: "0 0 18px", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "20px", lineHeight: "1.7", color: "#FFF9EC" }}>{t.declaration}</p>
              <ul data-e="startwarnings" style={{ position: "relative", margin: "0 0 22px", padding: "18px 22px", listStyle: "none", display: "flex", flexDirection: "column", gap: "9px", borderRadius: "16px", background: "rgba(255,249,236,.07)", border: "1px solid rgba(232,193,115,.28)" }}>
                {warnings.map((w, i) => (
                  <li key={i} style={{ fontSize: "16px", lineHeight: "1.8", color: "#F6F2E9" }}>{w}</li>
                ))}
              </ul>

              <label style={{ position: "relative", display: "flex", gap: "14px", alignItems: "flex-start", cursor: "pointer", padding: "16px 18px", border: `1px solid ${checkBorder}`, borderRadius: "14px", background: `${checkBg}`, transition: "border-color .16s ease,background .16s ease" }}>
                <input type="checkbox" checked={accepted} onChange={toggleAccept} style={{ marginTop: "3px", width: "22px", height: "22px", flex: "0 0 auto", accentColor: "#E8C173", cursor: "pointer" }} />
                <span style={{ fontSize: "16.5px", lineHeight: "1.8", color: "#F6F2E9" }}>{t.checkboxLabel}</span>
              </label>

              <div data-e="ctarow" style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginTop: "22px" }}>
                <Link href="/pratiyogita" data-e="cta" style={{ padding: "15px 26px", minHeight: "54px", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,249,236,.36)", borderRadius: "999px", fontSize: "17px", lineHeight: "1.5", color: "#F6F2E9" }}>{t.back}</Link>
                <button type="button" onClick={startAttempt} disabled={blocked || starting} data-e="cta" style={{ padding: "16px 32px", minHeight: "56px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: `${continueBg}`, color: `${continueFg}`, borderRadius: "999px", fontSize: "18px", fontWeight: "600", lineHeight: "1.5", pointerEvents: `${continueEvents}`, boxShadow: `${continueShadow}` }}>{q.begin}</button>
              </div>
            </div>
            ) : null}
          </div>
        </div>
      </section>

      <SiteFooter lang={lang} />
    </div>
  );
}
