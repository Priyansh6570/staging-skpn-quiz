"use client";

import { useEffect, useState } from "react";

export const inr = (n: number) => new Intl.NumberFormat("en-IN").format(n);

export const dateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

export const dateOnly = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";

/** Every admin page loads through this: one endpoint, one cache key, one set of states. */
export function usePanel<T>(url: string) {
  const [state, setState] = useState<{ url: string; data: T | null; error: string }>({
    url: "", data: null, error: "",
  });

  useEffect(() => {
    let cancelled = false;
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) { window.location.href = "/admin/login"; return; }
        if (!res.ok) { setState({ url, data: null, error: "Could not load this panel." }); return; }
        setState({ url, data: await res.json(), error: "" });
      })
      .catch(() => { if (!cancelled) setState({ url, data: null, error: "Could not reach the server." }); });
    return () => { cancelled = true; };
  }, [url]);

  // Derived, not stored: a setState in the effect body would cascade a render on every panel.
  return { data: state.data, error: state.error, loading: state.url !== url };
}

export function PageHead({ title, lede, children }: { title: string; lede?: string; children?: React.ReactNode }) {
  return (
    <header className="adm-head">
      <div>
        <h1>{title}</h1>
        {lede ? <p>{lede}</p> : null}
      </div>
      {children ? <div className="adm-actions">{children}</div> : null}
    </header>
  );
}

export function Card({
  title, sub, action, children,
}: {
  title?: string; sub?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="adm-card">
      {title ? (
        <header>
          <div>
            <h2>{title}</h2>
            {sub ? <p className="adm-sub">{sub}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({
  label, value, icon, delta, deltaLabel, loading,
}: {
  label: string; value: number; icon: string; delta?: number; deltaLabel?: string; loading?: boolean;
}) {
  const tone = delta === undefined || delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  return (
    <section className="adm-card adm-stat">
      <div className="adm-stat-top">
        <span className="adm-stat-label">{label}</span>
        <span className="adm-stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg>
        </span>
      </div>
      {loading ? <div className="adm-skel adm-skel-value" /> : <div className="adm-stat-value">{inr(value)}</div>}
      {!loading && deltaLabel ? (
        <span className={`adm-delta adm-delta-${tone}`}>
          {tone === "up" ? "▲" : tone === "down" ? "▼" : "•"} {deltaLabel}
        </span>
      ) : null}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="adm-empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="adm-alert adm-alert-bad" role="alert">{message}</div>;
}

export function Skeleton({ variant = "line", rows = 1 }: { variant?: "line" | "chart" | "table" | "value"; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => <div key={i} className={`adm-skel adm-skel-${variant}`} />)}
    </>
  );
}

export function SortHeader({
  label, field, sort, direction, onSort, numeric,
}: {
  label: string; field: string; sort: string; direction: "asc" | "desc";
  onSort: (field: string) => void; numeric?: boolean;
}) {
  const active = sort === field;
  return (
    <th className={numeric ? "adm-num" : undefined} aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}>
      <button type="button" className="adm-sortable" onClick={() => onSort(field)}>
        {label}{active ? (direction === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}

export function Bar({ value, max, zero }: { value: number; max: number; zero?: boolean }) {
  // A zero still paints a sliver, otherwise the row that matters most renders as nothing at all.
  const pct = max > 0 ? Math.max(value === 0 ? 3 : 6, (value / max) * 100) : 3;
  return (
    <div className={zero ? "adm-bar adm-bar-zero" : "adm-bar"}>
      <span style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}
