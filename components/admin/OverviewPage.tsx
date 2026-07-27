"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import Link from "next/link";
import type { Overview } from "@/lib/admin/queries";
import { Card, Empty, ErrorState, PageHead, Skeleton, Stat, inr, usePanel } from "@/components/admin/ui";

const ICONS = {
  users: "M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7",
  check: "M20 6L9 17l-5-5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  spark: "M13 2L4.5 13H11l-1 9 8.5-11H12z",
};

const delta = (now: number, before: number) => {
  if (!before) return { value: now ? 1 : 0, label: now ? `+${inr(now)} vs previous` : "no change" };
  const diff = now - before;
  return { value: diff, label: `${diff >= 0 ? "+" : ""}${inr(diff)} vs previous hour` };
};

export default function OverviewPage() {
  const { data, error, loading } = usePanel<Overview>("/api/admin/overview");
  const hour = data ? delta(data.counters.lastHour, data.counters.prevHour) : { value: 0, label: "" };

  return (
    <>
      <PageHead
        title="Overview"
        lede={data ? `Aggregates cached for 60 seconds · generated ${new Date(data.generatedAt).toLocaleTimeString("en-IN")}` : "Loading…"}
      />

      {error ? <ErrorState message={error} /> : null}

      <div className="adm-grid adm-g4" style={{ marginBottom: 14 }}>
        <Stat label="Total registrations" value={data?.counters.registrations ?? 0} icon={ICONS.users} loading={loading} />
        <Stat label="Submitted attempts" value={data?.counters.submitted ?? 0} icon={ICONS.check} loading={loading} />
        <Stat label="In progress now" value={data?.counters.inProgress ?? 0} icon={ICONS.clock} loading={loading} />
        <Stat
          label="Registered this hour"
          value={data?.counters.lastHour ?? 0}
          icon={ICONS.spark}
          loading={loading}
          delta={hour.value}
          deltaLabel={hour.label}
        />
      </div>

      <div className="adm-grid adm-g21" style={{ marginBottom: 14 }}>
        <Card
          title="Score distribution"
          sub={data ? `Mean ${data.scores.mean} · median ${data.scores.median} · ${inr(data.scores.total)} papers scored` : undefined}
        >
          {loading ? <Skeleton variant="chart" /> : !data?.scores.total ? (
            <Empty title="No papers scored yet">Scores appear here once students begin submitting.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.scores.histogram} margin={{ top: 4, right: 6, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEEEE9" vertical={false} />
                <XAxis dataKey="score" tick={{ fontSize: 11.5, fill: "#79808F" }} interval={2} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11.5, fill: "#79808F" }} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "#F7F7F5" }} formatter={(v) => inr(Number(v ?? 0))} labelFormatter={(l) => `Score ${l}`} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#B98F3C" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Traffic" sub="Pageviews, last 14 days" action={<Link href="/admin/traffic" className="adm-btn adm-btn-quiet">Open</Link>}>
          {loading ? <Skeleton variant="chart" /> : !data?.sparkline.some((s) => s.views > 0) ? (
            <Empty title="No traffic recorded yet">Counting began when this build was deployed.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.sparkline} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="admGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B98F3C" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#B98F3C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEEEE9" vertical={false} />
                <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11.5, fill: "#79808F" }} interval={3} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11.5, fill: "#79808F" }} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => inr(Number(v ?? 0))} />
                <Area type="monotone" dataKey="views" stroke="#B98F3C" strokeWidth={2} fill="url(#admGold)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card
        title="Districts with no registrations"
        sub="The gap the Nyas has to close before the closing date"
        action={<Link href="/admin/districts" className="adm-btn adm-btn-quiet">All districts</Link>}
      >
        {loading ? <Skeleton rows={2} /> : !data ? null : data.zeroDistricts.length === 0 ? (
          <div className="adm-alert adm-alert-warn" style={{ background: "var(--ok-soft)", color: "var(--ok)", borderColor: "#C8E2D4" }}>
            Every one of the 55 districts has at least one registration.
          </div>
        ) : (
          <>
            <div className="adm-alert adm-alert-warn" style={{ marginBottom: 12 }}>
              {inr(data.zeroDistricts.length)} of 55 districts have no registrations at all.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {data.zeroDistricts.map((d) => <span key={d} className="adm-pill adm-pill-bad">{d}</span>)}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
