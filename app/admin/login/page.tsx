"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);
    setBusy(false);

    if (res?.ok) {
      router.push("/admin");
      router.refresh();
      return;
    }
    if (!res) { setError("Could not reach the server. Check the connection and try again."); return; }
    // Unknown user and wrong password read identically. A locked account is called out separately,
    // because otherwise the admin keeps retrying and extends the lock.
    setError(
      res.status === 423
        ? "This account is locked after too many failed attempts. Try again in 15 minutes."
        : res.status === 429
          ? "Too many attempts from this address. Wait a minute and try again."
          : "Incorrect username or password.",
    );
  };

  return (
    <div className="adm-login">
      <form className="adm-login-card" onSubmit={submit} noValidate>
        <div className="adm-login-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uploads/skpn-logo.png" alt="" />
          <span>
            <b>Shri Krishna Pathey Nyas</b>
            <span>Administration</span>
          </span>
        </div>

        <h1>Sign in</h1>
        <p className="adm-login-lede">This area is restricted to authorised departmental staff.</p>

        {error ? (
          <p className="adm-login-error" role="alert">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flex: "0 0 auto", marginTop: 1 }}>
              <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" />
            </svg>
            {error}
          </p>
        ) : null}

        <label htmlFor="adm-username">
          Username
          <input
            id="adm-username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </label>

        <label htmlFor="adm-password">
          Password
          <input
            id="adm-password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" className="adm-btn adm-btn-gold" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="adm-login-foot">Sessions last four hours. Every sign-in is recorded.</p>
      </form>
    </div>
  );
}
