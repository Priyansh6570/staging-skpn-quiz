"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExportRow } from "@/lib/admin/queries";
import { Card, Empty, ErrorState, PageHead, Skeleton, dateTime, inr } from "@/components/admin/ui";

const ACTION_LABEL: Record<string, string> = {
  "admin.export.counts": "Counts",
  "admin.export.full": "Participants",
};

export default function ExportsPage() {
  const [history, setHistory] = useState<{ rows: ExportRow[] } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "counts" | "full">("");
  const [secret, setSecret] = useState<{ password: string; rowCount: number; truncated: boolean } | null>(null);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/admin/exports", { cache: "no-store" }).catch(() => null);
    if (res?.status === 401) { window.location.href = "/admin/login"; return; }
    if (!res?.ok) { setError("Could not load export history."); setLoaded(true); return; }
    setHistory(await res.json());
    setLoaded(true);
  }, []);

  useEffect(() => {
    // Inlined rather than calling loadHistory(): the compiler cannot see past the await, and a
    // call into a setState-bearing function reads as a synchronous setState in the effect body.
    let cancelled = false;
    fetch("/api/admin/exports", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) { window.location.href = "/admin/login"; return; }
        if (!res.ok) { setError("Could not load export history."); setLoaded(true); return; }
        setHistory(await res.json());
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) { setError("Could not reach the server."); setLoaded(true); } });
    return () => { cancelled = true; };
  }, []);

  const save = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportCounts = async () => {
    setBusy("counts"); setSecret(null); setError("");
    const res = await fetch("/api/admin/export/counts", { method: "POST" }).catch(() => null);
    setBusy("");
    if (!res?.ok) { setError(res?.status === 429 ? "One export a minute per admin. Try again shortly." : "Export failed."); return; }
    save(await res.blob(), "SKPN Counts.xlsx");
    await loadHistory();
  };

  const exportFull = async () => {
    setBusy("full"); setSecret(null); setError("");
    const res = await fetch("/api/admin/export/full", { method: "POST" }).catch(() => null);
    setBusy("");
    if (!res?.ok) { setError(res?.status === 429 ? "One export a minute per admin. Try again shortly." : "Export failed."); return; }
    const data = await res.json();
    const bytes = Uint8Array.from(atob(data.workbook), (c) => c.charCodeAt(0));
    save(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), data.fileName);
    // Shown once, here. Never in the URL and never written to the audit log.
    setSecret({ password: data.password, rowCount: data.rowCount, truncated: data.truncated });
    await loadHistory();
  };

  return (
    <>
      <PageHead title="Exports" lede="Every export is written to the audit log with the admin who ran it." />
      {error ? <ErrorState message={error} /> : null}

      <div className="adm-grid adm-g2" style={{ marginBottom: 14 }}>
        <Card title="Counts" sub="Aggregates only, no personal data. Safe to circulate.">
          <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--ink-2)" }}>
            District, category, gender, score distribution and daily registrations. No password needed.
          </p>
          <button type="button" className="adm-btn adm-btn-quiet" onClick={exportCounts} disabled={!!busy}>
            {busy === "counts" ? "Preparing…" : "Download counts workbook"}
          </button>
        </Card>

        <Card title="Participants" sub="Personal data. Encrypted with a one-time password.">
          <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--ink-2)" }}>
            Names, mobile numbers, dates of birth and addresses of students who are mostly minors.
            The file is open-password encrypted; the password is shown once and never stored.
          </p>
          <button type="button" className="adm-btn adm-btn-gold" onClick={exportFull} disabled={!!busy}>
            {busy === "full" ? "Preparing…" : "Download participant workbook"}
          </button>
        </Card>
      </div>

      {secret ? (
        <Card title="Workbook password, shown once" sub={`${inr(secret.rowCount)} participants${secret.truncated ? " · truncated at the synchronous row limit, see DEFERRED.md" : ""}`}>
          <p className="adm-secret">{secret.password}</p>
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--ink-3)" }}>
            Store it now. It is not recoverable, is not in the download URL, and is not in the audit log.
          </p>
        </Card>
      ) : null}

      <div style={{ height: 14 }} />

      <Card title="Export history" sub="Last 100 exports from adminAuditLog">
        {!loaded ? <Skeleton variant="table" /> : !history || history.rows.length === 0 ? (
          <Empty title="No exports yet">Downloads are recorded here with who ran them and when.</Empty>
        ) : (
          <div className="adm-scroll">
            <table className="adm-table">
              <thead>
                <tr><th>When</th><th>Admin</th><th>Export</th><th>Detail</th><th>Source</th></tr>
              </thead>
              <tbody>
                {history.rows.map((r, i) => (
                  <tr key={`${r.at}-${i}`}>
                    <td>{dateTime(r.at)}</td>
                    <td>{r.username}</td>
                    <td>
                      <span className={r.action === "admin.export.full" ? "adm-pill adm-pill-warn" : "adm-pill adm-pill-mute"}>
                        {ACTION_LABEL[r.action] ?? r.action}
                      </span>
                    </td>
                    <td>{r.target}</td>
                    <td>{r.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
