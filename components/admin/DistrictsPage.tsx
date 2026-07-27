"use client";

import { useState } from "react";
import type { DistrictRow } from "@/lib/admin/queries";
import {
  Bar, Card, Empty, ErrorState, PageHead, Skeleton, SortHeader, inr, usePanel,
} from "@/components/admin/ui";

type Payload = { generatedAt: string; rows: DistrictRow[]; total: number };
type Field = "district" | "registrations" | "submitted" | "share";

export default function DistrictsPage() {
  const { data, error, loading } = usePanel<Payload>("/api/admin/districts");
  const [sort, setSort] = useState<Field>("registrations");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  const onSort = (field: string) => {
    if (sort === field) setDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(field as Field); setDirection(field === "district" ? "asc" : "desc"); }
  };

  const rows = [...(data?.rows ?? [])].sort((a, b) => {
    const dir = direction === "asc" ? 1 : -1;
    if (sort === "district") return a.district.localeCompare(b.district) * dir;
    return (a[sort] - b[sort]) * dir || a.district.localeCompare(b.district);
  });

  const max = Math.max(1, ...(data?.rows ?? []).map((r) => r.registrations));
  const zero = (data?.rows ?? []).filter((r) => r.registrations === 0).length;

  return (
    <>
      <PageHead
        title="District coverage"
        lede="All 55 districts. A table rather than a chart, because one outlier flattens 54 bars into nothing."
      />

      {error ? <ErrorState message={error} /> : null}

      {!loading && data ? (
        <div className={zero ? "adm-alert adm-alert-warn" : "adm-alert adm-alert-warn"} style={{ marginBottom: 14, ...(zero ? {} : { background: "var(--ok-soft)", color: "var(--ok)", borderColor: "#C8E2D4" }) }}>
          {zero
            ? `${inr(zero)} of 55 districts have no registrations. They are listed first by default.`
            : "Every district has at least one registration."}
        </div>
      ) : null}

      <Card sub={data ? `${inr(data.total)} registrations across ${inr(data.rows.length)} districts` : undefined} title="Districts">
        {loading ? <Skeleton variant="table" /> : !data ? null : data.rows.length === 0 ? (
          <Empty title="No district data">Districts appear once registrations begin.</Empty>
        ) : (
          <div className="adm-scroll" style={{ maxHeight: 620 }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <SortHeader label="District" field="district" sort={sort} direction={direction} onSort={onSort} />
                  <SortHeader label="Registrations" field="registrations" sort={sort} direction={direction} onSort={onSort} numeric />
                  <th style={{ width: "34%" }}>Relative</th>
                  <SortHeader label="Submitted" field="submitted" sort={sort} direction={direction} onSort={onSort} numeric />
                  <SortHeader label="Share" field="share" sort={sort} direction={direction} onSort={onSort} numeric />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.district}>
                    <td>
                      {r.district}
                      {r.registrations === 0 ? <span className="adm-pill adm-pill-bad" style={{ marginLeft: 8 }}>none</span> : null}
                    </td>
                    <td className="adm-num">{inr(r.registrations)}</td>
                    <td><Bar value={r.registrations} max={max} zero={r.registrations === 0} /></td>
                    <td className="adm-num">{inr(r.submitted)}</td>
                    <td className="adm-num">{r.share}%</td>
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
