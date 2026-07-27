"use client";

import { useEffect, useMemo, useState } from "react";
import { en } from "@/lib/i18n";
import type { ParticipantListRow } from "@/lib/admin/queries";
import {
  Card, Empty, ErrorState, PageHead, Skeleton, SortHeader, dateOnly, inr,
} from "@/components/admin/ui";

const DISTRICTS = en.Register.DISTRICTS.map((d) => d[0]);

interface Payload {
  rows: ParticipantListRow[];
  total: number;
  page: number;
  pageSize: number;
  sortedByAttempt: boolean;
}

const STATUS_PILL: Record<string, string> = {
  submitted: "adm-pill-ok",
  auto_submitted: "adm-pill-ok",
  expired: "adm-pill-warn",
  in_progress: "adm-pill-warn",
  "not attempted": "adm-pill-mute",
};

export default function ParticipantsPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [divyang, setDivyang] = useState("");
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [state, setState] = useState<{ url: string; data: Payload | null; error: string }>({
    url: "", data: null, error: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const url = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), sort, direction });
    if (debounced) params.set("search", debounced);
    if (district) params.set("district", district);
    if (category) params.set("category", category);
    if (gender) params.set("gender", gender);
    if (divyang) params.set("divyang", divyang);
    return `/api/admin/participants?${params}`;
  }, [page, sort, direction, debounced, district, category, gender, divyang]);

  useEffect(() => {
    let cancelled = false;
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) { window.location.href = "/admin/login"; return; }
        if (!res.ok) { setState({ url, data: null, error: "Could not load participants." }); return; }
        setState({ url, data: await res.json(), error: "" });
      })
      .catch(() => { if (!cancelled) setState({ url, data: null, error: "Could not reach the server." }); });
    return () => { cancelled = true; };
  }, [url]);

  // Derived: the previous page stays on screen, dimmed, while the next one loads.
  const data = state.data;
  const error = state.error;
  const loading = state.url !== url;

  const onSort = (field: string) => {
    if (sort === field) setDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(field); setDirection("asc"); }
    setPage(1);
  };

  const reset = () => {
    setSearch(""); setDistrict(""); setCategory(""); setGender(""); setDivyang(""); setPage(1);
  };

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const filtered = !!(debounced || district || category || gender || divyang);
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <>
      <PageHead
        title="Participants"
        lede="Search, filter and sort run in the database. One page of 50 rows is serialised at a time."
      />

      <Card>
        <div className="adm-filters">
          <input
            className="adm-input"
            style={{ flex: "1 1 220px" }}
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search participants by name"
          />
          <select className="adm-select" value={district} onChange={(e) => { setDistrict(e.target.value); setPage(1); }} aria-label="Filter by district">
            <option value="">All districts</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="adm-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Filter by category">
            <option value="">All categories</option>
            <option value="vidyalaya">Vidyalaya</option>
            <option value="mahavidyalaya">Mahavidyalaya</option>
          </select>
          <select className="adm-select" value={gender} onChange={(e) => { setGender(e.target.value); setPage(1); }} aria-label="Filter by gender">
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <select className="adm-select" value={divyang} onChange={(e) => { setDivyang(e.target.value); setPage(1); }} aria-label="Filter by divyang status">
            <option value="">Divyang: any</option>
            <option value="yes">Divyang only</option>
            <option value="no">Not divyang</option>
          </select>
          {filtered ? <button type="button" className="adm-btn adm-btn-quiet" onClick={reset}>Clear</button> : null}
        </div>

        {error ? <ErrorState message={error} /> : null}

        {loading && !data ? <Skeleton variant="table" /> : total === 0 ? (
          <Empty title={filtered ? "No participants match these filters" : "No registrations yet"}>
            {filtered ? "Try widening the search or clearing a filter." : "Rows appear here as students register."}
          </Empty>
        ) : (
          <>
            <div className="adm-scroll">
              <table className="adm-table">
                <thead>
                  <tr>
                    <SortHeader label="Name" field="name" sort={sort} direction={direction} onSort={onSort} />
                    <SortHeader label="District" field="district" sort={sort} direction={direction} onSort={onSort} />
                    <SortHeader label="Category" field="category" sort={sort} direction={direction} onSort={onSort} />
                    <SortHeader label="Score" field="score" sort={sort} direction={direction} onSort={onSort} numeric />
                    <SortHeader label="Attempt date" field="attempt" sort={sort} direction={direction} onSort={onSort} />
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody style={loading ? { opacity: 0.55 } : undefined}>
                  {data?.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.district || "—"}</td>
                      <td style={{ textTransform: "capitalize" }}>{r.category || "—"}</td>
                      <td className="adm-num">{r.score === null ? "—" : r.score}</td>
                      <td>{dateOnly(r.attemptAt)}</td>
                      <td><span className={`adm-pill ${STATUS_PILL[r.status] ?? "adm-pill-mute"}`}>{r.status.replace(/_/g, " ")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="adm-pager">
              <span>{inr(first)}–{inr(last)} of {inr(total)}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button type="button" className="adm-btn adm-btn-quiet" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</button>
                <span>Page {inr(page)} of {inr(pages)}</span>
                <button type="button" className="adm-btn adm-btn-quiet" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>Next</button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
