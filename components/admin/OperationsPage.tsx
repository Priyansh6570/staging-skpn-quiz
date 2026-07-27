"use client";

import type { Operations } from "@/lib/admin/queries";
import {
  Card, Empty, ErrorState, PageHead, Skeleton, Stat, dateTime, inr, usePanel,
} from "@/components/admin/ui";

const ICONS = {
  stuck: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  key: "M15 7a4 4 0 1 1-3.5 5.9L8 16.4 6 18l-2-2 1.6-1.6L9.1 10.5A4 4 0 0 1 15 7z",
  shield: "M12 3l7.5 3v5.6c0 4.4-3 8.4-7.5 9.4-4.5-1-7.5-5-7.5-9.4V6z",
  sweep: "M4 20l6-6M14 4l6 6-7 7-6-6z",
};

export default function OperationsPage() {
  const { data, error, loading } = usePanel<Operations>("/api/admin/operations");

  // Compared against the server's own generatedAt rather than the browser clock, which keeps this
  // pure and also avoids a wrong verdict when a workstation's time is off.
  const sweeperStale = !!data && (
    !data.sweeper.lastRunAt
    || Date.parse(data.generatedAt) - Date.parse(data.sweeper.lastRunAt) > 3_600_000
  );

  return (
    <>
      <PageHead title="Operations" lede="Health of the quiz engine and the sign-in path over the last hour." />
      {error ? <ErrorState message={error} /> : null}

      <div className="adm-grid adm-g4" style={{ marginBottom: 14 }}>
        <Stat label="Attempts past expiry" value={data?.stuckInProgress ?? 0} icon={ICONS.stuck} loading={loading} />
        <Stat label="Sign-ins this hour" value={data?.signIn.success ?? 0} icon={ICONS.key} loading={loading} />
        <Stat label="Unknown numbers this hour" value={data?.signIn.unknownMobile ?? 0} icon={ICONS.shield} loading={loading} />
        <Stat label="Sweeper runs, 24h" value={data?.sweeper.runsLast24h ?? 0} icon={ICONS.sweep} loading={loading} />
      </div>

      {!loading && data && data.stuckInProgress > 0 ? (
        <div className="adm-alert adm-alert-bad" style={{ marginBottom: 14 }} role="alert">
          {inr(data.stuckInProgress)} attempt(s) are past their expiry and still open. Oldest expired {dateTime(data.oldestStuckAt)}.
          Under the one-attempt rule each one is a student locked out until the sweeper closes it.
        </div>
      ) : null}

      {!loading && data && sweeperStale ? (
        <div className="adm-alert adm-alert-warn" style={{ marginBottom: 14 }}>
          The auto-submit sweeper has not reported in the last hour
          {data.sweeper.lastRunAt ? ` — last run ${dateTime(data.sweeper.lastRunAt)}.` : " and has never reported."}
          {" "}It needs a cron entry running <code>npm run sweep</code>.
        </div>
      ) : null}

      <div className="adm-grid adm-g2">
        <Card title="Sign-in outcomes" sub="Last hour, from authEvents">
          {loading ? <Skeleton rows={4} /> : !data ? null : (
            <table className="adm-table">
              <tbody>
                <tr><td>Successful sign-ins</td><td className="adm-num">{inr(data.signIn.success)}</td></tr>
                <tr><td>Unknown mobile number</td><td className="adm-num">{inr(data.signIn.unknownMobile)}</td></tr>
                <tr><td>Malformed number</td><td className="adm-num">{inr(data.signIn.malformed)}</td></tr>
                <tr><td>Rate limited</td><td className="adm-num">{inr(data.signIn.rateLimited)}</td></tr>
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Sign-in anomalies by source" sub="Addresses with the most rejected attempts, last 24 hours">
          {loading ? <Skeleton variant="table" /> : !data ? null : data.topSignInIps.length === 0 ? (
            <Empty title="Nothing unusual">No rejected sign-in attempts in the last day.</Empty>
          ) : (
            <div className="adm-scroll" style={{ maxHeight: 260 }}>
              <table className="adm-table">
                <thead><tr><th>Source address</th><th className="adm-num">Rejected attempts</th></tr></thead>
                <tbody>
                  {data.topSignInIps.map((r) => (
                    <tr key={r.ip}>
                      <td>{r.ip}</td>
                      <td className="adm-num">
                        <span className={r.attempts > 50 ? "adm-pill adm-pill-bad" : "adm-pill adm-pill-mute"}>{inr(r.attempts)}</span>
                      </td>
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
