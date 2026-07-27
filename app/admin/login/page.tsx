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
    // Deliberately the same for unknown user and wrong password; the locked state is separate
    // because a locked-out admin needs to know to wait rather than keep trying.
    setError(res?.status === 423 ? "Account locked. Try again in 15 minutes." : "Incorrect username or password.");
  };

  return (
    <div className="adm-login">
      <form onSubmit={submit}>
        <h1>SKPN Administration</h1>
        {error ? <p className="adm-error">{error}</p> : null}
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        <button type="submit" className="adm-btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
