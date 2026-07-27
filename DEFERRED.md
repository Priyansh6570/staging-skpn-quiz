# Deferred

Work that is knowingly incomplete, with the threshold at which it stops being acceptable.

---

## Full participant export becomes a background job past 50,000 rows

`POST /api/admin/export/full` builds the workbook synchronously and returns it base64 in the
response body. At the current scale that is the right trade: no queue, no storage, no temporary file
on disk holding minors' addresses, and the password never has to outlive the request.

It does not survive growth. The whole participant set is held in memory as documents, again as row
arrays, again as a workbook object, and a fourth time as base64 — roughly 4× the row data at peak.
The route is capped at `SYNC_ROW_LIMIT = 50_000` rows (`lib/admin/export.ts`); past that the export
is truncated, `truncated: true` comes back in the response, the dashboard says so on the password
card, and the server logs a warning.

**At 50k rows this needs a background job.** Registrations are expected around 5 lakh, so this
threshold will be crossed during the competition, not after it.

What it should become:
- The admin requests an export; the route enqueues a job and returns immediately.
- A worker streams users in batches, writes the workbook to a temporary encrypted file, and records
  a one-time download token with a short expiry.
- The dashboard polls for completion and offers the download once.
- The temporary file is deleted on download or on expiry, whichever comes first.
- `adminAuditLog` gets a row when the job is requested and another when the file is collected.

Until then the counts export — which carries no personal data — is unaffected and has no limit
worth naming.

---

## Certificate PDF is raster, not vector

`/certificates` composites the name onto the certificate image on a canvas and places that bitmap in
an A4 landscape PDF. It is a working download and the Devanagari is correct, but AUDIT.md §10.4 asks
for a vector logo and an embedded font, which needs server-side PDF generation. Blocked on §14.5
(certificate wording and signature approval) in any case.

---

## Traffic counting shares the app's Mongo client

`proxy.ts` buffers page views in process and flushes in batches. Next's proxy documentation warns
against relying on shared modules or globals, so on a deployment where the proxy runs in a separate
context it will open its own connection pool. On a single Hostinger VPS that is one extra pool. On a
platform that runs the proxy at the edge it would not work at all and the counting would have to move
behind an internal route handler.

---

## Sorting participants by score or attempt date cannot use an index

`/admin/participants` pages before the `$lookup` when the sort key lives on the user document
(name, district, category, registration date), which keeps the slice indexed and cheap. Sorting by
**score** or **attempt date** cannot: the value is in `attempts`, so the pipeline joins every
matching user before it can sort, with `allowDiskUse` on to survive it.

At 5 lakh registrations an unfiltered sort by score is a full join. It is usable today and it will
not be at scale. The fix is to denormalise the latest attempt's score and submission date onto the
user document at submit time — the write path already touches that document to set `bestScore` — and
then index it.
