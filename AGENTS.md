# AGENTS.md — @mgpl-diagnostics/invoice-kit

Instructions for AI coding agents and developers. Read
[report-kit's AGENTS.md](https://github.com/mgpl-diagnostics/report-kit/blob/main/AGENTS.md) too:
the same rendering rules apply.

## What this is

Patient invoices rendered twice, identically:
- **HTML:** `src/InvoiceDocument.tsx`, a pure React component;
- **PDF:** `src/InvoicePdf.tsx`, react-pdf, Node only.

The letterhead layer (`SbLetterhead` / `SbLetterheadPdf`), fonts, assets, barcode and QR come from
`@mgpl-diagnostics/report-kit`, which is a peer dependency.

## Map

```
src/
  types.ts        Invoice, InvoiceItem, Payment, ItemCategory, PaymentStatus
  calc.ts         computeInvoice (integer paise), money(), amountInWords() (Indian lakh/crore)
  price-list.ts   PRICE_LIST — SAMPLE prices, codes = report-kit template/profile ids + services/consumables/medicines
  build.ts        buildInvoice (codes → lines, overrides), itemsForTests
  layout.ts       geometry (inches/pt), shared by both renderers
  model.ts        display logic: grouped rows, dynamic columns, totals lines, cards, QR, pagination
  styles.ts       CSS (report-kit sidebarCss + invoice parts)
  InvoiceDocument.tsx / InvoicePdf.tsx
  pdf.ts          Node: renderInvoicePdf
  server.ts       Node: renderInvoiceHtml (self-contained)
  samples.ts      INVOICE_SAMPLES (fictional) — paid, discount+partial, GST unpaid, multi-page split, overpaid
scripts/          smoke-test.tsx, generate-examples.tsx
dist/             built output — COMMITTED
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
npm run build                        # then commit dist/
npm run examples                     # inspect PDFs visually
```

## Privacy

Never commit real patient or billing data. Samples use fictional names.
