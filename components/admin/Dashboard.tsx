"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardStats } from "@/lib/admin/stats";
import {
  Card, CountTable, DistrictBars, Empty, Metric, ScoreHistogram, Skeleton, TrafficLine, inr,
} from "@/components/admin/Panels";

const CATEGORY_LABEL: Record<string, string> = {
  vidyalaya: "Vidyalaya", mahavidyalaya: "Mahavidyalaya",
};
const GENDER_LABEL: Record<string, string> = { male: "Male", female: "Female", other: "Other" };
const DIVYANG_LABEL: Record<string, string> = { true: "Divyang", false: "Not divyang" };

const relabel = (rows: { key: string; count: number }[], map: Record<string, string>) =>
  rows.map((r) => ({ key: map[r.key] ?? r.key, count: r.count }));

export default function Dashboard({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"" | "counts" | "full">("");
  const [secret, setSecret] = useState<{ password: string; rowCount: number; truncated: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetch("/api/admin/stats", { cache: "no-store" })
        .then(async (res) => {
          if (cancelled) return;
          if (res.status === 401) { router.push("/admin/login"); return; }
          if (!res.ok) { setError("Could not load the dashboard."); return; }
          setError("");
          setStats(await res.json());
        })
        .catch(() => { if (!cancelled) setError("Could not load the dashboard."); });
    };
    poll();
    const timer = setInterval(poll, 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [router]);

  const signOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const download = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportCounts = async () => {
    setExporting("counts");
    setSecret(null);
    const res = await fetch("/api/admin/export/counts", { method: "POST" }).catch(() => null);
    setExporting("");
    if (!res?.ok) { setError(res?.status === 429 ? "One export a minute. Try again shortly." : "Export failed."); return; }
    download(await res.blob(), "SKPN Counts.xlsx");
  };

  const exportFull = async () => {
    setExporting("full");
    setSecret(null);
    const res = await fetch("/api/admin/export/full", { method: "POST" }).catch(() => null);
    setExporting("");
    if (!res?.ok) { setError(res?.status === 429 ? "One export a minute. Try again shortly." : "Export failed."); return; }
    const data = await res.json();
    const bytes = Uint8Array.from(atob(data.workbook), (c) => c.charCodeAt(0));
    download(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), data.fileName);
    // Shown once, here only. It is not in the URL and is never written to the audit log.
    setSecret({ password: data.password, rowCount: data.rowCount, truncated: data.truncated });
  };

  const health = stats?.health;
  const unhealthy = (health?.stuckInProgress ?? 0) > 0;

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uploads/skpn-logo.png" alt="" />
          <strong>SKPN Admin<span>{displayName}</span></strong>
        </div>
        <nav className="adm-nav">
          <a href="/admin" aria-current="page">Dashboard</a>
          <a href="/" target="_blank" rel="noopener">Open public site</a>
          <button type="button" onClick={signOut}>Sign out</button>
        </nav>
        <div className="adm-side-foot">
          {stats ? `Updated ${new Date(stats.generatedAt).toLocaleTimeString("en-IN")}` : "Loading…"}
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-head">
          <div>
            <h1>Competition dashboard</h1>
            <p>Counters refresh every minute. Aggregates are cached server-side for 60 seconds.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="adm-btn adm-btn-quiet" onClick={exportCounts} disabled={!!exporting}>
              {exporting === "counts" ? "Preparing…" : "Export counts"}
            </button>
            <button type="button" className="adm-btn" onClick={exportFull} disabled={!!exporting}>
              {exporting === "full" ? "Preparing…" : "Export participants"}
            </button>
          </div>
        </header>

        {error ? <p className="adm-error" style={{ marginBottom: 16 }}>{error}</p> : null}

        {secret ? (
          <div className="adm-card" style={{ marginBottom: 16, borderColor: "#B98F3C" }}>
            <h2>Workbook password — shown once</h2>
            <p className="adm-note">
              {inr(secret.rowCount)} participants. The file is encrypted; without this password it cannot be opened.
              {secret.truncated ? " Truncated at the synchronous row limit — see DEFERRED.md." : ""}
            </p>
            <p className="adm-secret">{secret.password}</p>
          </div>
        ) : null}

        <div className="adm-grid adm-grid-4" style={{ marginBottom: 16 }}>
          {stats ? (
            <>
              <Metric label="Total registrations" value={stats.counters.registrations} />
              <Metric label="Submitted attempts" value={stats.counters.submitted} />
              <Metric label="In progress now" value={stats.counters.inProgress} />
              <Metric label="Registered in the last hour" value={stats.counters.lastHour} />
            </>
          ) : (
            [0, 1, 2, 3].map((i) => (
              <section className="adm-card" key={i}><h2>Loading</h2><Skeleton variant="metric" /></section>
            ))
          )}
        </div>

        <div className="adm-grid adm-grid-2" style={{ marginBottom: 16 }}>
          <Card title="District coverage" note="All 55 districts, fewest first. Districts in red have no registrations at all.">
            {stats ? <DistrictBars data={stats.districts} /> : <Skeleton variant="chart" />}
          </Card>
          <div className="adm-grid" style={{ gap: 16 }}>
            <Card title="Score distribution" note={stats ? `Mean ${stats.scores.mean} · median ${stats.scores.median} · ${inr(stats.scores.total)} scored` : undefined}>
              {stats ? <ScoreHistogram data={stats.scores.histogram} /> : <Skeleton variant="chart" />}
            </Card>
            <Card title="Traffic — last 30 days" note="First-party only. No third-party analytics on this site.">
              {stats ? <TrafficLine data={stats.traffic} /> : <Skeleton variant="chart" />}
            </Card>
          </div>
        </div>

        <div className="adm-grid adm-grid-4" style={{ marginBottom: 16 }}>
          <Card title="Category">{stats ? <CountTable rows={relabel(stats.splits.category, CATEGORY_LABEL)} keyLabel="Category" height={false} /> : <Skeleton />}</Card>
          <Card title="Gender">{stats ? <CountTable rows={relabel(stats.splits.gender, GENDER_LABEL)} keyLabel="Gender" height={false} /> : <Skeleton />}</Card>
          <Card title="Divyang">{stats ? <CountTable rows={relabel(stats.splits.divyang, DIVYANG_LABEL)} keyLabel="Status" height={false} /> : <Skeleton />}</Card>
          <Card title="Education level">{stats ? <CountTable rows={stats.splits.educationLevel} keyLabel="Level" /> : <Skeleton />}</Card>
        </div>

        <div className="adm-grid adm-grid-3">
          <Card title="Operational health">
            {stats && health ? (
              <table className="adm-table">
                <tbody>
                  <tr>
                    <td>Attempts stuck past expiry</td>
                    <td className="adm-num">
                      <span className={unhealthy ? "adm-pill adm-pill-bad" : "adm-pill adm-pill-ok"}>{inr(health.stuckInProgress)}</span>
                    </td>
                  </tr>
                  <tr><td>Unknown-number sign-ins, last hour</td><td className="adm-num">{inr(health.failedLoginsLastHour)}</td></tr>
                  <tr><td>Malformed sign-in attempts, last hour</td><td className="adm-num">{inr(health.malformedLoginsLastHour)}</td></tr>
                </tbody>
              </table>
            ) : <Skeleton />}
          </Card>

          <Card title="Duplicate mobile numbers" note="Flagged for review at shortlisting, never auto-blocked.">
            {!stats ? <Skeleton /> : stats.flags.duplicateMobiles.length === 0 ? <Empty>No duplicates.</Empty> : (
              <div className="adm-scroll">
                <table className="adm-table">
                  <thead><tr><th>Mobile</th><th className="adm-num">Accounts</th></tr></thead>
                  <tbody>
                    {stats.flags.duplicateMobiles.map((d) => (
                      <tr key={d.value}><td>{d.value}</td><td className="adm-num">{d.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Same name, same institution">
            {!stats ? <Skeleton /> : stats.flags.nameInstitutionClusters.length === 0 ? <Empty>No clusters.</Empty> : (
              <div className="adm-scroll">
                <table className="adm-table">
                  <thead><tr><th>Name</th><th>Institution</th><th className="adm-num">Accounts</th></tr></thead>
                  <tbody>
                    {stats.flags.nameInstitutionClusters.map((c) => (
                      <tr key={`${c.name}|${c.institution}`}><td>{c.name}</td><td>{c.institution}</td><td className="adm-num">{c.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
