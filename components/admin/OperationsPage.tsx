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
  sms: "M4 5h16v11H8l-4 3z",
  wallet: "M3 7h15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 12h2",
};

/** Credits, not rupees: inr() would put a currency reading on a count of messages. */
const credits = (n: number | null) => (n === null ? "-" : new Intl.NumberFormat("en-IN").format(n));

export default function OperationsPage() {
  const { data, error, loading } = usePanel<Operations>("/api/admin/operations");

  // Compared against the server's own generatedAt rather than the browser clock, which keeps this
  // pure and also avoids a wrong verdict when a workstation's time is off.
  const sweeperStale = !!data && (
    !data.sweeper.lastRunAt
    || Date.parse(data.generatedAt) - Date.parse(data.sweeper.lastRunAt) > 3_600_000
  );

  const sms = data?.sms;
  const undelivered = sms ? sms.failedToday + sms.pendingToday + sms.sendFailuresToday : 0;

  // The poller writes checkedAt every run, so a stale value means the cron entry is gone — which
  // matters as much as the number itself, because the number stops being true the moment it stops
  // being refreshed.
  const balanceStale = !!data && (
    !data.sms.balance.checkedAt
    || Date.parse(data.generatedAt) - Date.parse(data.sms.balance.checkedAt) > 3_600_000
  );

  return (
    <>
      <PageHead title="Operations" lede="Health of the quiz engine, the sign-in path and SMS delivery." />
      {error ? <ErrorState message={error} /> : null}

      <div className="adm-grid adm-g4" style={{ marginBottom: 14 }}>
        <Stat label="Attempts past expiry" value={data?.stuckInProgress ?? 0} icon={ICONS.stuck} loading={loading} />
        <Stat label="Sign-ins this hour" value={data?.signIn.success ?? 0} icon={ICONS.key} loading={loading} />
        <Stat label="Unknown numbers this hour" value={data?.signIn.unknownMobile ?? 0} icon={ICONS.shield} loading={loading} />
        <Stat label="Sweeper runs, 24h" value={data?.sweeper.runsLast24h ?? 0} icon={ICONS.sweep} loading={loading} />
      </div>

      <div className="adm-grid adm-g4" style={{ marginBottom: 14 }}>
        <Stat label="Codes sent today" value={sms?.sentToday ?? 0} icon={ICONS.sms} loading={loading} />
        <Stat label="Undelivered today" value={undelivered} icon={ICONS.shield} loading={loading} />
        <Stat label="Credits remaining" value={sms?.balance.credits ?? 0} icon={ICONS.wallet} loading={loading} />
        <Stat label="Daily send cap used" value={sms?.circuit.used ?? 0} icon={ICONS.key} loading={loading} />
      </div>

      {!loading && sms && sms.circuit.open ? (
        <div className="adm-alert adm-alert-bad" style={{ marginBottom: 14 }} role="alert">
          {`The daily send circuit breaker is open: ${inr(sms.circuit.used)} of ${inr(sms.circuit.cap)} used.`}
          {" "}No codes are being sent until 00:00 UTC. Registration and sign-in are dead for anyone
          who does not already hold a code; issue codes by hand until it clears.
        </div>
      ) : null}

      {!loading && sms && !sms.circuit.open && sms.circuit.used > sms.circuit.cap * 0.8 ? (
        <div className="adm-alert adm-alert-warn" style={{ marginBottom: 14 }}>
          {`${inr(sms.circuit.used)} of the ${inr(sms.circuit.cap)} daily send cap is used.`}
          {" "}At the cap all sending stops until 00:00 UTC.
        </div>
      ) : null}

      {!loading && sms && sms.balance.belowThreshold ? (
        <div className="adm-alert adm-alert-bad" style={{ marginBottom: 14 }} role="alert">
          {`MSG91 credits are low: ${credits(sms.balance.credits)} remaining.`}
          {" "}An exhausted balance does not report itself: the send API answers &ldquo;success&rdquo; either way, so codes
          simply stop arriving. Top up before it reaches zero.
        </div>
      ) : null}

      {!loading && data && balanceStale ? (
        <div className="adm-alert adm-alert-warn" style={{ marginBottom: 14 }}>
          The MSG91 balance has not been checked in the last hour
          {data.sms.balance.checkedAt ? `, last checked ${dateTime(data.sms.balance.checkedAt)}.` : " and has never been checked."}
          {" "}It needs a cron entry running <code>npm run balance</code>.
        </div>
      ) : null}

      {!loading && sms && !balanceStale && !sms.balance.ok ? (
        <div className="adm-alert adm-alert-warn" style={{ marginBottom: 14 }}>
          The last balance check did not succeed{sms.balance.detail ? `: ${sms.balance.detail}` : "."}
          {" "}The same credentials and endpoint are what the send path uses.
        </div>
      ) : null}

      {!loading && data && data.stuckInProgress > 0 ? (
        <div className="adm-alert adm-alert-bad" style={{ marginBottom: 14 }} role="alert">
          {inr(data.stuckInProgress)} attempt(s) are past their expiry and still open. Oldest expired {dateTime(data.oldestStuckAt)}.
          Under the one-attempt rule each one is a student locked out until the sweeper closes it.
        </div>
      ) : null}

      {!loading && data && sweeperStale ? (
        <div className="adm-alert adm-alert-warn" style={{ marginBottom: 14 }}>
          The auto-submit sweeper has not reported in the last hour
          {data.sweeper.lastRunAt ? `, last run ${dateTime(data.sweeper.lastRunAt)}.` : " and has never reported."}
          {" "}It needs a cron entry running <code>npm run sweep</code>.
        </div>
      ) : null}

      <div className="adm-grid adm-g2" style={{ marginBottom: 14 }}>
        <Card title="SMS delivery today" sub="From MSG91's delivery reports, not from the send call">
          {loading ? <Skeleton rows={5} /> : !sms ? null : (
            <table className="adm-table">
              <tbody>
                <tr><td>Accepted by MSG91</td><td className="adm-num">{inr(sms.sentToday)}</td></tr>
                <tr><td>Confirmed delivered</td><td className="adm-num">{inr(sms.deliveredToday)}</td></tr>
                <tr><td>Reported failed or unrecognised</td><td className="adm-num">{inr(sms.failedToday)}</td></tr>
                <tr><td>Awaiting a report</td><td className="adm-num">{inr(sms.pendingToday)}</td></tr>
                <tr><td>Refused at send</td><td className="adm-num">{inr(sms.sendFailuresToday)}</td></tr>
              </tbody>
            </table>
          )}
          {!loading && sms && sms.sentToday > 0 && sms.deliveredToday === 0 ? (
            <div className="adm-alert adm-alert-warn" style={{ marginTop: 10 }}>
              Nothing has been confirmed delivered today. Either the delivery webhook is not
              configured in MSG91&rsquo;s dashboard, or no message is reaching a handset.
            </div>
          ) : null}
        </Card>

        <Card title="Provider" sub="MSG91 credit balance and the daily send cap">
          {loading ? <Skeleton rows={4} /> : !sms ? null : (
            <table className="adm-table">
              <tbody>
                <tr><td>Credits remaining</td><td className="adm-num">{credits(sms.balance.credits)}</td></tr>
                <tr><td>Last checked</td><td className="adm-num">{dateTime(sms.balance.checkedAt)}</td></tr>
                <tr>
                  <td>Daily send cap</td>
                  <td className="adm-num">{inr(sms.circuit.used)} / {inr(sms.circuit.cap)}</td>
                </tr>
                <tr>
                  <td>Circuit breaker</td>
                  <td className="adm-num">
                    <span className={sms.circuit.open ? "adm-pill adm-pill-bad" : "adm-pill adm-pill-mute"}>
                      {sms.circuit.open ? "Open, not sending" : "Closed, sending"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </Card>
      </div>

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
