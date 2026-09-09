# DocOps AI

A working invoice-review MVP built for Abdul Gani's AI engineering portfolio. Upload a document, extract text, review structured fields, match the complete invoice against a purchase order, then approve or reject it. Approved, currently valid invoices export to CSV.

## Implemented

- English neural OCR using Tesseract.js, with model and worker assets served from this application. No paid AI key or external inference service is required.
- PDF.js text extraction with per-page OCR fallback for scanned PDFs; image OCR; plain-text import.
- Original files in R2; extracted fields, source text, decisions and audit records in D1.
- Label-based field extraction and pipe/tab/multiple-space-separated line items. Missing or unrecognized data requires manual correction; no invented confidence scores.
- Invoice/PO/vendor/currency/item quantity/unit price checks; line arithmetic and totals; duplicate invoice detection.
- Server-side approval validation, optimistic revision checks, transactional review audit, and a database uniqueness constraint preventing two complete invoices being approved against one PO.
- Source-text evidence with line numbers and highlights, original document access, correction form, rejection reasons and reopening.
- Explicitly loaded fictional demo documents; no sample records are silently mixed into real uploads.
- Responsive workspace, filtering and approved-only CSV export with spreadsheet formula neutralization.

## Architecture

Browser → PDF text extraction or Tesseract OCR → document API → deterministic field parser → D1 metadata + R2 original → matching engine → human review → approved CSV.

This first hosted version uses TypeScript/React and Cloudflare-compatible route handlers rather than a separate Python server. `lib/documents.ts` contains the testable domain logic. `lib/read-file.ts` owns browser-only extraction; route handlers are in `app/api`; schema and migrations are in `db` and `drizzle`.

## Run and validate

Requires Node 22.13+ and the dependencies in package-lock.json.

- `npm ci`: install dependencies.
- `npm run dev`: local development using the starter's configured runtime.
- `npm run db:generate`: generate a new migration after schema changes.
- `npm run build`: build the Worker and client.
- `node --experimental-strip-types --test tests/matching.test.mjs`: matching and export tests.
- `node tests/api.test.mjs`: in-process route-handler tests using an ephemeral SQLite database and a memory object-store adapter.

Deployment declares logical D1 `DB` and R2 `BUCKET` in `.openai/hosting.json`. Sites applies migrations and binds hosted storage. The application relies on the private Site's platform access gate; it is not a multi-tenant public application. Before changing that audience, add app-level per-user ownership and permissions to every route and object.

## Try the demo

1. Choose **Explore sample workspace**.
2. Open **INV-1042**: it bills 10 chairs against an order for 8; approval is blocked.
3. Open **INV-1043**: the invoice matches **PO-2026-042**; inspect the source, then approve.
4. Export approved invoices. The mismatched invoice is excluded.
5. Edit a field and save: the decision returns to review and the change appears in Activity.

## Verification and limits

Nine domain regression tests cover quantity overbilling, a valid match, missing items, duplicate invoices, arithmetic errors, missing POs, incomplete totals, repeated full-PO billing and CSV escaping. An English OCR smoke test on one synthetic printed image recovered its invoice number, vendor and total. These are functional tests, not a real-world accuracy benchmark.

Network restrictions prevented a workerd integration run. In-process API tests exercise the actual handlers with SQLite and an object-store adapter, not deployed Cloudflare services. The interface has not been browser-tested in this session. Broad OCR quality, deployment load and representative vendor-layout evaluation remain to be measured before claiming production readiness.

- Maximum upload: 10 MB; PDF limit: 5 pages; English printed text only.
- OCR and layout extraction can fail or merge columns. Manually verify/correct fields. No LLM semantic extraction, invoice classification, handwriting guarantee or multilingual model is included.
- Matching expects a complete one-to-one PO, with exact normalized descriptions. Partial shipments, credits, multiple tax lines, cross-currency matching and multi-invoice reconciliation are outside this version.
- Financial checks use decimal tolerances in JavaScript; migrate amounts to integer minor units before accounting-system integrations.
- Document listing is intentionally a small-workspace implementation. Add pagination, file lifecycle controls, quotas, monitoring and representative evaluation before a wider rollout.
- No fabricated F1, speed, cost-savings or accuracy claims are included.

## Next engineering phase

Build a vendor-disjoint labeled evaluation set; measure field exact match, line-item precision/recall, false approval rate and processing latency. Add a schema-constrained document model as an optional provider, retain source provenance, and compare it against this rules baseline. Keep human review mandatory until validated thresholds are established.

Third-party OCR/PDF licenses are retained under `public/` alongside locally served assets.
