"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import OtpStep from "@/components/OtpStep";
import { useLang, useSession, useShell } from "@/components/AppProviders";
import { custom, strings } from "@/lib/i18n";
import type { ErrorCode } from "@/lib/errors";

const MOBILE_RE = /^[6-9]\d{9}$/;

export default function LoginPage() {
  const router = useRouter();
  const { lang, toggle: toggleLang } = useLang();
  const { session, refresh } = useSession();
  const { showError } = useShell();
  const t = strings(lang).Login.S;

  const [mobile, setMobile] = useState("");
  const [touched, setTouched] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [notRegistered, setNotRegistered] = useState(false);
  // 0 while the number is still being typed. Bumping it hands the number to the code step, which
  // does the sending; bumping it again after a "change number" asks for a fresh code.
  const [sendToken, setSendToken] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rot = setInterval(() => setSlideIndex((s) => s + 1), 2000);
    return () => clearInterval(rot);
  }, []);

  const ok = MOBILE_RE.test(mobile);
  const bad = touched && mobile.length > 0 && !ok;
  const i = slideIndex % t.slides.length;
  const awaitingCode = sendToken > 0;

  // Sign-in no longer ends here. This asks for a code; the session is issued by /api/otp/verify
  // once the student proves they hold the number, because the number is the whole account.
  const signIn = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!ok || awaitingCode) return;
    setNotRegistered(false);
    setSendToken((n) => n + 1);
  };

  // An unregistered number is answered without a message being sent, so probing costs the trust
  // nothing and the student is pointed at the right page immediately.
  const onRejected = (code: ErrorCode) => {
    setSendToken(0);
    if (code === "not_registered") setNotRegistered(true);
    else showError(code);
  };

  const onVerified = async () => {
    await refresh();
    router.push("/");
  };

  const slide = t.slides[i];
  const slideAnim = slideIndex % 2 === 0 ? "lg-inA" : "lg-inB";
  const dots = t.slides.map((_, n) => ({
    w: n === i ? "22px" : "8px",
    bg: n === i ? "#E8C173" : "rgba(232,193,115,.32)",
  }));
  const onMobile = (e: React.FormEvent<HTMLInputElement>) => {
    setMobile(e.currentTarget.value.replace(/\D/g, "").slice(0, 10));
    setTouched(true);
    setNotRegistered(false);
  };
  const notRegisteredMsg = custom(lang).errors.notRegistered;
  const notRegisteredDisplay = notRegistered ? "block" : "none";
  const mobileBorder = bad ? "#A03A2B" : "#DCD1BC";
  const mobileMsgDisplay = bad ? "block" : "none";
  const goHref = ok ? "/" : "#";
  const goBg = ok ? "#14203E" : "#EDE6D7";
  const goFg = ok ? "#FDF3DF" : "#161C2E";
  const goEvents = ok ? "auto" : "none";
  const markSignedIn = signIn;
  const signedIn = session.signedIn;
  const hasCerts = session.hasCertificates;
  return (
    <div data-page="Login" style={{ background: "#FBF7F0", color: "#161C2E", fontFamily: "'Noto Sans Devanagari',system-ui,sans-serif", minWidth: "320px", overflowX: "clip" }}>
      <SiteHeader lang={lang} active="home" onToggleLang={toggleLang} signedIn={signedIn} hasCertificates={hasCerts} />

      <section data-e="pad" style={{ maxWidth: "1080px", margin: "0 auto", padding: "40px 30px 80px" }}>
        <div data-e="split" style={{ display: "grid", gridTemplateColumns: "minmax(0,.92fr) minmax(0,1.08fr)", borderRadius: "26px", overflow: "hidden", boxShadow: "0 2px 6px rgba(20,32,62,.06),0 22px 52px rgba(20,32,62,.14)", alignItems: "stretch" }}>

          <aside data-e="aside" style={{ position: "relative", overflow: "hidden", background: "#070B1E", minHeight: "500px", padding: "36px 34px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <img src="/assets/cosmic-halo.png" alt="" width="924" height="540" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 40%", opacity: ".5" }} />
            <div aria-hidden="true" style={{ position: "absolute", inset: "0", background: "linear-gradient(170deg, rgba(7,11,30,.5) 0%, rgba(7,11,30,.87) 54%, rgba(5,8,22,.97) 100%)" }}></div>
            <div aria-hidden="true" style={{ position: "absolute", right: "-14%", top: "-12%", width: "320px", height: "320px", borderRadius: "50%", background: "radial-gradient(circle,rgba(232,193,115,.22) 0%,rgba(232,193,115,0) 70%)", animation: "lg-glow 9s ease-in-out infinite" }}></div>

            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "12px" }}>
              <img src="/uploads/skpn-logo.png" alt="" width="50" height="50" style={{ display: "block", width: "50px", height: "50px", flex: "0 0 auto", borderRadius: "50%" }} />
              <span style={{ fontFamily: "'Noto Serif Devanagari',serif", fontSize: "15.5px", lineHeight: "1.45", color: "#FFF9EC" }}>{t.asideOrg}</span>
            </div>

            <div data-e="asidebody" style={{ position: "relative", marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "16.5px", letterSpacing: ".01em", color: "#E8C173", lineHeight: "1.9" }}>{t.asideKicker}</p>
              <h2 style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(23px,2.5vw,30px)", lineHeight: "1.32", color: "#FFF9EC", textWrap: "balance" }}>{t.asideTitle}</h2>
            </div>

            <div style={{ position: "relative", paddingTop: "20px", borderTop: "1px solid rgba(232,193,115,.24)", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div data-e="asideslide" style={{ minHeight: "64px", display: "flex", flexDirection: "column", gap: "5px", animation: `${slideAnim} .45s cubic-bezier(.22,.61,.36,1)` }}>
                <span data-e="slidevalue" style={{ fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "26px", lineHeight: "1.25", color: "#E8C173", whiteSpace: "nowrap" }}>{slide.value}</span>
                <span style={{ fontSize: "15.5px", lineHeight: "1.7", color: "#E9E4D8" }}>{slide.label}</span>
              </div>
              <div aria-hidden="true" style={{ display: "flex", gap: "6px" }}>
                {dots.map((d, dIndex) => (
                  <span key={dIndex} style={{ width: `${d.w}`, height: "4px", borderRadius: "2px", background: `${d.bg}`, transition: "width .3s ease,background .3s ease" }}></span>
                ))}
              </div>
            </div>
          </aside>

          <div data-e="form" style={{ padding: "38px 36px", background: "#FFFFFF", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <h1 style={{ margin: "0 0 8px", fontFamily: "'Noto Serif Devanagari',serif", fontWeight: "600", fontSize: "clamp(25px,3.2vw,33px)", lineHeight: "1.3", color: "#14203E" }}>{t.title}</h1>
              <p style={{ margin: "0", fontSize: "17px", lineHeight: "1.8", color: "#161C2E" }}>{t.lede}</p>
            </div>

            {awaitingCode ? (
              <OtpStep
                lang={lang}
                mobile={mobile}
                purpose="login"
                sendToken={sendToken}
                mobileLabel={t.mobileLabel}
                onVerified={onVerified}
                onRejected={onRejected}
                onChangeNumber={() => setSendToken(0)}
              />
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.mobileLabel}</span>
                <span style={{ display: "flex", alignItems: "stretch", border: `1px solid ${mobileBorder}`, borderRadius: "14px", background: "#FCFAF4", overflow: "hidden" }}>
                  <span aria-hidden="true" style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: "8px", padding: "0 13px", background: "#F1E9DA", borderRight: "1px solid #E3D9C6" }}>
                    <svg viewBox="0 0 30 20" width="26" height="18" aria-hidden="true" focusable="false" style={{ display: "block", borderRadius: "3px", boxShadow: "0 0 0 1px rgba(20,32,62,.14)" }}>
                      <rect width="30" height="20" fill="#FFFFFF"></rect>
                      <rect width="30" height="6.667" fill="#FF9933"></rect>
                      <rect y="13.333" width="30" height="6.667" fill="#138808"></rect>
                      <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.7"></circle>
                      <circle cx="15" cy="10" r="0.6" fill="#000080"></circle>
                    </svg>
                    <span style={{ fontSize: "16.5px", lineHeight: "1.6", color: "#161C2E", fontVariantNumeric: "tabular-nums" }}>+91</span>
                  </span>
                  <input type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} value={mobile} onInput={onMobile} placeholder="00000 00000" style={{ flex: "1 1 auto", minWidth: "0", minHeight: "58px", padding: "14px 16px", border: "0", background: "transparent", fontSize: "19px", letterSpacing: ".04em", lineHeight: "1.6", color: "#161C2E", fontVariantNumeric: "tabular-nums" }} />
                </span>
                <span style={{ fontSize: "15px", lineHeight: "1.7", color: "#A03A2B", display: `${mobileMsgDisplay}` }}>{t.mobileInvalid}</span>
                <span role="status" style={{ fontSize: "15px", lineHeight: "1.7", color: "#A03A2B", display: `${notRegisteredDisplay}` }}>{notRegisteredMsg} <Link href="/register" style={{ color: "#27408B" }}>{t.register}</Link></span>
              </label>

              <a href={goHref} onClick={markSignedIn} style={{ minHeight: "58px", padding: "16px 28px", borderRadius: "999px", background: `${goBg}`, color: `${goFg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17.5px", fontWeight: "600", lineHeight: "1.5", pointerEvents: `${goEvents}`, textDecoration: "none" }}>{t.continue}</a>
            </div>
            )}

            <p style={{ margin: "auto 0 0", paddingTop: "20px", borderTop: "1px solid #F0EADD", fontSize: "16.5px", lineHeight: "1.8", color: "#161C2E" }}>{t.noAccount} <Link href="/register">{t.register}</Link></p>
          </div>
        </div>
      </section>

      <SiteFooter lang={lang} />
    </div>
  );
}
