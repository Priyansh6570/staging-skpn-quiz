"use client";

import { useEffect, useRef, useState } from "react";
import OtpBoxes, { CODE_LENGTH } from "@/components/OtpBoxes";
import { custom } from "@/lib/i18n";
import { codeFromResponse, otpMessage, type ErrorCode } from "@/lib/errors";
import type { Lang } from "@/lib/models/types";

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

interface Props {
  lang: Lang;
  mobile: string;
  purpose: "register" | "login";
  /**
   * The parent decides when a code may be asked for — only it knows what has to be true first, and
   * every send is real money. Bumping the number asks for one; bumping it again asks for a fresh
   * code without the component being torn down and losing its countdown.
   */
  sendToken: number;
  mobileLabel: string;
  onVerified: () => void | Promise<void>;
  /** The send was answered without a credit being spent: this number cannot use a code here. */
  onRejected: (code: ErrorCode) => void;
  onChangeNumber: () => void;
}

/**
 * The code screen, inline on both the sign-in and the registration page.
 *
 * It is inline rather than a dialog on purpose: it is a step in a flow, not an interruption of one,
 * and a modal over a form the student has just filled in reads as an error. The one-second floor on
 * both requests is not a fake delay — they usually return faster than a loader can be read, and a
 * control that flickers between two states reads as a fault.
 */
export default function OtpStep({
  lang, mobile, purpose, sendToken, mobileLabel, onVerified, onRejected, onChangeNumber,
}: Props) {
  const c = custom(lang);
  const t = c.otp;

  const [phase, setPhase] = useState<"sending" | "sent" | "verifying" | "failed">("sending");
  const [code, setCode] = useState("");
  const [note, setNote] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const sentFor = useRef(-1);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const tick = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(tick);
  }, [secondsLeft]);

  const send = async () => {
    setPhase("sending");
    setNote(null);
    setCode("");

    const [res] = await Promise.all([
      fetch("/api/otp/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mobile, purpose }),
      }).catch(() => null),
      wait(1000),
    ]);

    if (!res) {
      setPhase("failed");
      setNote({ tone: "bad", text: c.errors.network });
      return;
    }
    const body = (await res.json().catch(() => null)) as
      | { error?: string; registered?: boolean; retryAfterSeconds?: number; resendInSeconds?: number }
      | null;

    if (!res.ok) {
      // A number that cannot register is not a failure of this screen — it belongs beside the
      // mobile field the parent owns, so the parent is told and this unmounts.
      const refusal = codeFromResponse(res.status, body);
      if (refusal === "mobile_registered") { onRejected(refusal); return; }
      // The server is the clock. A refused resend hands back what it is still waiting for, so a
      // reloaded page resynchronises instead of arguing with it.
      if (typeof body?.retryAfterSeconds === "number") setSecondsLeft(body.retryAfterSeconds);
      setPhase("failed");
      setNote({ tone: "bad", text: otpMessage(lang, body?.error) });
      return;
    }

    // Answered without a message being sent, so probing an unregistered number costs nothing.
    if (purpose === "login" && !body?.registered) { onRejected("not_registered"); return; }

    setSecondsLeft(body?.resendInSeconds ?? 60);
    setPhase("sent");
    setNote({ tone: "good", text: `${t.sentTo} +91 ${mobile}` });
  };

  // Guarded on the token rather than on mount alone: React remounts this component in development
  // to surface effect bugs, and a second send here is a second SMS off a government trust's balance.
  useEffect(() => {
    if (sentFor.current === sendToken) return;
    sentFor.current = sendToken;
    void send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendToken]);

  const verify = async () => {
    if (code.length !== CODE_LENGTH || phase !== "sent") return;
    setPhase("verifying");
    setNote(null);

    const [res] = await Promise.all([
      fetch("/api/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mobile, code, purpose }),
      }).catch(() => null),
      wait(1000),
    ]);

    if (!res) {
      setPhase("sent");
      setNote({ tone: "bad", text: c.errors.network });
      return;
    }
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setPhase("sent");
      setCode("");
      setNote({ tone: "bad", text: otpMessage(lang, body?.error) });
      return;
    }
    await onVerified();
  };

  const resend = async () => {
    if (secondsLeft > 0 || phase === "sending" || phase === "verifying") return;
    await send();
  };

  const onCode = (next: string) => {
    setCode(next);
    if (note?.tone === "bad") setNote(null);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); void verify(); }
  };

  const busy = phase === "sending" || phase === "verifying";
  const showCode = phase === "sent" || phase === "verifying";
  const ready = code.length === CODE_LENGTH && phase === "sent";
  const verifyBg = ready ? "#14203E" : "#EDE6D7";
  const verifyFg = ready ? "#FDF3DF" : "#161C2E";
  const resendIdle = secondsLeft <= 0 && !busy;
  const resendLabel = secondsLeft > 0 ? t.resendIn.replace("{s}", String(secondsLeft)) : t.resend;

  return (
    <div data-e="verify" style={{ padding: "20px", borderRadius: "16px", border: "1px solid #DCD1BC", background: "#FCFAF4", display: "flex", flexDirection: "column", gap: "14px" }}>
      <p style={{ margin: "0", fontFamily: "'Noto Serif Devanagari',serif", fontSize: "18px", lineHeight: "1.5", color: "#14203E" }}>{t.title}</p>

      {busy ? (
        <p role="status" aria-live="polite" data-e="verifybusy" style={{ margin: "0", display: "flex", alignItems: "center", gap: "12px", fontSize: "16px", lineHeight: "1.7", color: "#161C2E" }}>
          <span aria-hidden="true" data-e="spinner" style={{ width: "22px", height: "22px", flex: "0 0 auto", borderRadius: "50%", border: "2px solid rgba(20,32,62,.18)", borderTopColor: "#14203E", animation: "rg-spin 1s linear infinite" }}></span>
          {phase === "sending" ? t.sending : t.verifying}
        </p>
      ) : null}

      {!busy && note ? (
        <p role="status" aria-live="polite" data-e="verifynote" style={{ margin: "0", fontSize: "15.5px", lineHeight: "1.7", color: note.tone === "bad" ? "#A03A2B" : "#7A5412" }}>{note.text}</p>
      ) : null}

      {/* The number the code is going to, shown where the code is entered and locked: changing it
          here would invalidate the code that is already on its way. */}
      <label data-e="field" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <span data-e="fieldlabel" style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{mobileLabel}</span>
        <span data-e="control" style={{ display: "flex", alignItems: "stretch", border: "1px solid #E8DFCE", borderRadius: "14px", background: "#F2ECE0", overflow: "hidden" }}>
          <span aria-hidden="true" style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: "8px", padding: "0 13px", background: "#EDE5D6", borderRight: "1px solid #E3D9C6" }}>
            <svg viewBox="0 0 30 20" width="26" height="18" aria-hidden="true" focusable="false" style={{ display: "block", borderRadius: "3px", boxShadow: "0 0 0 1px rgba(20,32,62,.14)" }}>
              <rect width="30" height="20" fill="#FFFFFF"></rect>
              <rect width="30" height="6.667" fill="#FF9933"></rect>
              <rect y="13.333" width="30" height="6.667" fill="#138808"></rect>
              <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.7"></circle>
              <circle cx="15" cy="10" r="0.6" fill="#000080"></circle>
            </svg>
            <span style={{ fontSize: "16.5px", lineHeight: "1.6", color: "#161C2E", fontVariantNumeric: "tabular-nums" }}>+91</span>
          </span>
          <input type="tel" value={mobile} disabled readOnly style={{ flex: "1 1 auto", minWidth: "0", minHeight: "54px", padding: "14px 16px", border: "0", background: "transparent", fontSize: "18px", letterSpacing: ".04em", lineHeight: "1.6", color: "#161C2E", fontVariantNumeric: "tabular-nums" }} />
        </span>
      </label>

      {showCode ? (
        <div onKeyDown={onKeyDown} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span data-e="fieldlabel" style={{ fontSize: "16px", lineHeight: "1.6", color: "#161C2E" }}>{t.codeLabel}</span>
            <OtpBoxes label={t.codeLabel} value={code} onChange={onCode} disabled={phase === "verifying"} invalid={note?.tone === "bad"} autoFocus />
          </div>

          <button type="button" onClick={verify} disabled={!ready} data-e="cta" style={{ minHeight: "56px", padding: "16px 30px", border: "0", borderRadius: "999px", background: `${verifyBg}`, color: `${verifyFg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17.5px", fontWeight: "600", lineHeight: "1.5", cursor: ready ? "pointer" : "not-allowed", fontFamily: "inherit" }}>{t.verify}</button>
        </div>
      ) : null}

      {busy ? null : (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <button type="button" onClick={resend} disabled={!resendIdle} data-e="resend" aria-live="polite" style={{ padding: "0", border: "0", background: "transparent", fontSize: "16px", lineHeight: "1.7", color: resendIdle ? "#27408B" : "#7A6B4E", cursor: resendIdle ? "pointer" : "default", fontFamily: "inherit" }}>{resendLabel}</button>
          <button type="button" onClick={onChangeNumber} style={{ padding: "0", border: "0", background: "transparent", fontSize: "16px", lineHeight: "1.7", color: "#27408B", cursor: "pointer", fontFamily: "inherit" }}>{t.changeNumber}</button>
        </div>
      )}
    </div>
  );
}
