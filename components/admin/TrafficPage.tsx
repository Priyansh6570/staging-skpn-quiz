"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Traffic } from "@/lib/admin/queries";
import { Card, Empty, ErrorState, PageHead, Skeleton, inr, usePanel } from "@/components/admin/ui";

const dayString = (offset: number) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

export default function TrafficPage() {
  const [from, setFrom] = useState(dayString(29));
  const [to, setTo] = useState(dayString(0));
  const url = useMemo(() => `/api/admin/traffic?from=${from}&to=${to}`, [from, to]);
  const { data, error, loading } = usePanel<Traffic>(url);

  const preset = (days: number) => { setFrom(dayString(days - 1)); setTo(dayString(0)); };
  const empty = !!data && !data.days.some((d) => d.views > 0 || d.visitors > 0);

  return (
    <>
      <PageHead title="Traffic" lede="First-party counting only. No third-party analytics runs on this site.">
        <button type="button" className="adm-btn adm-btn-quiet" onClick={() => preset(7)}>7 days</button>
        <button type="button" className="adm-btn adm-btn-quiet" onClick={() => preset(30)}>30 days</button>
        <button type="button" className="adm-btn adm-btn-quiet" onClick={() => preset(90)}>90 days</button>
      </PageHead>

      {error ? <ErrorState message={error} /> : null}

      <Card
        title="Pageviews and unique visitors"
        sub={data ? `${inr(data.totals.views)} views · ${inr(data.totals.visitors)} uniques over ${inr(data.days.length)} days` : undefined}
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" className="adm-input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            <span style={{ color: "var(--ink-3)", fontSize: 13 }}>to</span>
            <input type="date" className="adm-input" value={to} min={from} max={dayString(0)} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          </div>
        }
      >
        {loading ? <Skeleton variant="chart" /> : empty ? (
          <Empty title="No traffic in this range">Counting began when this build was deployed. Try a wider range.</Empty>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data?.days ?? []} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="admViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B98F3C" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#B98F3C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="admUniques" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F6B4F" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#2F6B4F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEEE9" vertical={false} />
              <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11.5, fill: "#79808F" }} interval="preserveStartEnd" minTickGap={28} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11.5, fill: "#79808F" }} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => inr(Number(v ?? 0))} />
              <Legend wrapperStyle={{ fontSize: 12.5 }} />
              <Area type="monotone" dataKey="views" name="Pageviews" stroke="#B98F3C" strokeWidth={2} fill="url(#admViews)" />
              <Area type="monotone" dataKey="visitors" name="Unique visitors" stroke="#2F6B4F" strokeWidth={2} fill="url(#admUniques)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div style={{ height: 14 }} />

      <Card title="Most visited pages" sub="Within the selected range">
        {loading ? <Skeleton variant="table" /> : !data ? null : data.topPaths.length === 0 ? (
          <Empty title="No pages recorded">Nothing was visited in this range.</Empty>
        ) : (
          <table className="adm-table">
            <thead><tr><th>Path</th><th className="adm-num">Views</th></tr></thead>
            <tbody>
              {data.topPaths.map((p) => (
                <tr key={p.path}><td>{p.path}</td><td className="adm-num">{inr(p.views)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
