# AGENTS.md — @mgpl-diagnostics/invoice-kit

Instructions for AI coding agents and developers. Read
[report-kit's AGENTS.md](https://github.com/mgpl-diagnostics/report-kit/blob/main/AGENTS.md) too:
the same rendering rules apply.

## What this is

The **backend** library (Node.js ≥ 20) for patient invoices. Each invoice is rendered twice, identically:
- **HTML:** `src/InvoiceDocument.tsx`, a pure React component;
- **PDF:** `src/InvoicePdf.tsx`, react-pdf.

It also owns **`createMgplApi()`**, the single HTTP handler for reports *and* invoices (report-kit's
routes plus `/invoice`, `/price-list`, `/invoice-samples`), and the Fastify plugin that wraps it.

The letterhead layer, fonts, assets, barcode, QR, HTTP helpers and `defaultLab()` (real signatures from
env files) come from `@mgpl-diagnostics/report-kit`, which is a peer dependency. There is no browser code
here; frontends use `@mgpl-diagnostics/client`.

## Map

```
src/
  index.ts        package entry (everything except the Fastify plugin)
  fastify.ts      "/fastify" entry: mgplFastify → createMgplApi
  api.ts          createMgplApi, createInvoiceRoutes, invoiceFromRequest (validation), invoiceTotalsJson
  types.ts        Invoice, InvoiceItem, Payment, ItemCategory, PaymentStatus
  calc.ts         computeInvoice (integer paise), money(), amountInWords() (Indian lakh/crore)
  price-list.ts   PRICE_LIST — SAMPLE prices; codes = report-kit template/profile ids + services/consumables/medicines
  build.ts        buildInvoice (codes → lines, overrides), itemsForTests
  layout.ts       geometry (inches/pt), shared by both renderers
  model.ts        display logic: grouped rows, dynamic columns, totals lines, cards, QR, pagination
  styles.ts       CSS (report-kit sidebarCss + invoice parts)
  InvoiceDocument.tsx / InvoicePdf.tsx
  pdf.ts          renderInvoicePdf
  server.ts       renderInvoiceHtml
  samples.ts      INVOICE_SAMPLES (fictional)
scripts/          smoke-test.tsx, api-test.ts (HTTP + client + Fastify + node:http), generate-examples.tsx
dist/             build output — git-ignored; built by `prepare` and in CI
```

## Money rules

- All arithmetic in `calc.ts` uses **integer paise**. Do not add float maths elsewhere. Format with `money()`.
- Order of operations:
  1. line gross = qty × rate;
  2. line discount (percent wins over amount);
  3. bill discount, shared in proportion with the largest-remainder rule so the shares add up exactly;
  4. GST on what remains;
  5. round-off to the rupee (unless `roundOff: false`).
- The Amount column shows `qty × rate − line discount`. Bill discount, GST and round-off appear only in the totals.
- Status: `PAID` if paid ≥ total, `PARTIALLY PAID` if 0 < paid < total, otherwise `DUE`; `excess` = refund.
- Currency is written `Rs.`, because the Manrope font has no `₹` glyph.

## Rendering rules (react-pdf)

- Every fixed-height row needs `lineHeight: 1` on its texts. Text taller than its box is **silently
  dropped**. The info cards once lost all their values this way; the smoke test now checks that every
  value is present in the PDF text.
- Card rows must fit: `5 × INV_CARDS.lineH + 2 × pad ≤ INV_CARDS.h` (checked by smoke).
- Column widths come from `invoiceColumns()`. Discount and GST columns appear only when used; the
  description column takes the remaining width.
- Pagination (`invoicePages`) keeps group headings with their first item and keeps the totals
  block whole on the last page.

## Commands

```bash
npm run typecheck && npm run smoke   # required before committing
npm run test:api                     # required when api.ts or the HTTP contract changes
npm run build                        # dist/ (git-ignored)
npm run examples                     # inspect PDFs visually
```

## Contract with the client

`InvoiceRequest` / `invoiceTotalsJson()` are mirrored in `@mgpl-diagnostics/client` (`InvoiceInput`,
`InvoiceTotals`). report-studio's `contract-check.ts` fails its typecheck if they drift; change both repos together.

## Privacy and licence

Never commit real patient or billing data, or real signatures. Samples use fictional names.
The code is "All rights reserved" (see LICENSE).
