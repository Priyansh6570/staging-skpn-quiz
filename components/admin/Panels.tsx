"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

/** Indian grouping: 1,00,000 rather than 100,000. */
export const inr = (n: number) => new Intl.NumberFormat("en-IN").format(n);

export function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="adm-card">
      <h2>{title}</h2>
      {note ? <p className="adm-note">{note}</p> : null}
      {children}
    </section>
  );
}

export function Metric({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <section className="adm-card">
      <h2>{label}</h2>
      <div className="adm-metric">{inr(value)}</div>
      {sub ? <div className="adm-metric-sub">{sub}</div> : null}
    </section>
  );
}

export function Skeleton({ variant = "line" }: { variant?: "line" | "metric" | "chart" }) {
  return <div className={`adm-skel adm-skel-${variant}`} />;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="adm-empty">{children}</p>;
}

export function CountTable({
  rows, keyLabel, ascending = false, height = true,
}: {
  rows: { key: string; count: number }[];
  keyLabel: string;
  ascending?: boolean;
  height?: boolean;
}) {
  if (!rows.length) return <Empty>Nothing recorded yet.</Empty>;
  const ordered = ascending ? [...rows].sort((a, b) => a.count - b.count) : rows;
  return (
    <div className={height ? "adm-scroll" : undefined}>
      <table className="adm-table">
        <thead>
          <tr><th>{keyLabel}</th><th className="adm-num">Count</th></tr>
        </thead>
        <tbody>
          {ordered.map((r) => (
            <tr key={r.key}><td>{r.key}</td><td className="adm-num">{inr(r.count)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ScoreHistogram({ data }: { data: { score: number; count: number }[] }) {
  if (!data.some((d) => d.count > 0)) return <Empty>No papers scored yet.</Empty>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 6, right: 6, bottom: 4, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E7F0" vertical={false} />
        <XAxis dataKey="score" tick={{ fontSize: 12, fill: "#5B6780" }} interval={2} />
        <YAxis tick={{ fontSize: 12, fill: "#5B6780" }} allowDecimals={false} />
        <Tooltip formatter={(v) => inr(Number(v ?? 0))} labelFormatter={(l) => `Score ${l}`} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#27408B" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DistrictBars({ data }: { data: { district: string; count: number }[] }) {
  if (!data.length) return <Empty>No districts loaded.</Empty>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(320, data.length * 17)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E7F0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#5B6780" }} allowDecimals={false} />
        <YAxis type="category" dataKey="district" width={116} tick={{ fontSize: 11, fill: "#5B6780" }} interval={0} />
        <Tooltip formatter={(v) => inr(Number(v ?? 0))} />
        {/* minPointSize gives a zero a visible stub — without it an empty district draws nothing
            at all and the red never appears, which is the whole point of the panel. */}
        <Bar dataKey="count" radius={[0, 3, 3, 0]} minPointSize={3}>
          {data.map((d) => (
            // Empty districts are the reason this panel exists, so they read differently.
            <Cell key={d.district} fill={d.count === 0 ? "#B4483A" : "#27408B"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrafficLine({ data }: { data: { day: string; views: number; visitors: number }[] }) {
  if (!data.some((d) => d.views > 0 || d.visitors > 0)) return <Empty>No traffic recorded yet.</Empty>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E7F0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5B6780" }} tickFormatter={(d: string) => d.slice(5)} interval={4} />
        <YAxis tick={{ fontSize: 12, fill: "#5B6780" }} allowDecimals={false} />
        <Tooltip formatter={(v) => inr(Number(v ?? 0))} />
        <Line type="monotone" dataKey="views" stroke="#27408B" strokeWidth={2} dot={false} name="Pageviews" />
        <Line type="monotone" dataKey="visitors" stroke="#B98F3C" strokeWidth={2} dot={false} name="Unique visitors" />
      </LineChart>
    </ResponsiveContainer>
  );
}
