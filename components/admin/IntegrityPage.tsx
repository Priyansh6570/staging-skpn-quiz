"use client";

import type { Integrity } from "@/lib/admin/queries";
import { Card, Empty, ErrorState, PageHead, Skeleton, inr, usePanel } from "@/components/admin/ui";

export default function IntegrityPage() {
  const { data, error, loading } = usePanel<Integrity>("/api/admin/integrity");

  return (
    <>
      <PageHead
        title="Integrity"
        lede="Surfaced for manual review at shortlisting. Nothing here is auto-blocked — a shared household phone is not fraud."
      />
      {error ? <ErrorState message={error} /> : null}

      <div className="adm-grid adm-g2">
        <Card title="Duplicate mobile numbers" sub="One number held by more than one account">
          {loading ? <Skeleton variant="table" /> : !data ? null : data.duplicateMobiles.length === 0 ? (
            <Empty title="No duplicates">Every registered number is held by exactly one account.</Empty>
          ) : (
            <div className="adm-scroll">
              <table className="adm-table">
                <thead><tr><th>Mobile</th><th className="adm-num">Accounts</th></tr></thead>
                <tbody>
                  {data.duplicateMobiles.map((d) => (
                    <tr key={d.mobile}>
                      <td>{d.mobile}</td>
                      <td className="adm-num"><span className="adm-pill adm-pill-warn">{inr(d.count)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Same name, same institution" sub="Possible duplicate entries, possible siblings">
          {loading ? <Skeleton variant="table" /> : !data ? null : data.nameInstitutionClusters.length === 0 ? (
            <Empty title="No clusters">No name repeats within a single institution.</Empty>
          ) : (
            <div className="adm-scroll">
              <table className="adm-table">
                <thead><tr><th>Name</th><th>Institution</th><th>District</th><th className="adm-num">Accounts</th></tr></thead>
                <tbody>
                  {data.nameInstitutionClusters.map((c) => (
                    <tr key={`${c.name}|${c.institution}|${c.district}`}>
                      <td>{c.name}</td>
                      <td>{c.institution}</td>
                      <td>{c.district || "—"}</td>
                      <td className="adm-num"><span className="adm-pill adm-pill-warn">{inr(c.count)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
