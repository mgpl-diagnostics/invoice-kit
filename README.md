# @mgpl-diagnostics/invoice-kit

Patient invoices / bills for **MGPL Diagnostics** on the same Navy Sidebar letterhead as the reports.
They render as React HTML and as a **pure Node.js A4 PDF**.

- **Line items:** lab tests, health packages, services (home collection…), consumables and medicines.
  Each line has qty, rate, discount (% or flat) and optional GST % / HSN / batch note.
- **Totals:**
  - bill discount (% or flat, with reason), shared across lines before tax;
  - GST per rate (columns appear only when something is taxed; pathology tests are usually exempt);
  - round-off, grand total and **amount in words** (Indian lakh/crore).
- **Payments:** split payments (Cash/UPI/Card/…), paid / balance due / refund, and a
  **PAID · PARTIALLY PAID · DUE** status.
- **Codes:** Code 128 barcode of the invoice number. When you set the lab's `upiId`, a **UPI "scan to pay" QR**; otherwise a verify QR.
- **Variants:** `header` (letterhead) / `non-header` (pre-printed paper), multi-page with *Page X of Y*.
- **Calculations** are done in integer paise, so totals never drift.

## Install

Requires [`@mgpl-diagnostics/report-kit`](https://github.com/mgpl-diagnostics/report-kit), which is a peer dependency.

```ini
# .npmrc
@mgpl-diagnostics:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm i @mgpl-diagnostics/invoice-kit @mgpl-diagnostics/report-kit react react-dom
# or from git:
npm i github:mgpl-diagnostics/report-kit#v1.0.0 github:mgpl-diagnostics/invoice-kit#v1.0.0 react react-dom
```

## Quick start

```ts
import { buildInvoice, computeInvoice } from "@mgpl-diagnostics/invoice-kit";

const invoice = buildInvoice({
  invoiceNo: "MGPL/2026-27/0399",
  date: new Date(),
  patient: { title: "Mr", name: "Ramesh Kumar Verma", age: 67, sex: "Male", patientId: "MGPL1024", phone: "+91-94252 67890" },
  items: [
    "cbc", "lft",                                  // price-list codes (= report template ids)
    "home-collection",
    { code: "syringe-5ml", qty: 2 },               // code + overrides
    { name: "Special stain", category: "test", rate: 450 },   // free-form line
  ],
  discount: { percent: 10, reason: "Senior citizen" },
  payments: [{ mode: "UPI", amount: 500, reference: "UTR 428615903317" }],
});

computeInvoice(invoice).total;   // grand total (rupees), also .due, .status, .taxByRate …
```

```tsx
// HTML (React / Next.js) — pure component
import { InvoiceDocument } from "@mgpl-diagnostics/invoice-kit";
<InvoiceDocument invoice={invoice} variant="header" />
```

```ts
// PDF (Node) and self-contained HTML (Node)
import { renderInvoicePdf } from "@mgpl-diagnostics/invoice-kit/pdf";
import { renderInvoiceHtml } from "@mgpl-diagnostics/invoice-kit/server";
const pdf = await renderInvoicePdf({ invoice, variant: "header" });   // Buffer, A4
const html = await renderInvoiceHtml({ invoice, variant: "header" }); // fonts + images inlined
```

The HTML preview uses the report-kit fonts and images, so run `npx mgpl-report-assets public` in your app.

## Price list

[`src/price-list.ts`](src/price-list.ts) maps codes to `{ name, category, rate, taxPercent?, hsn? }`.
Test codes are the report-kit template and profile ids, so `itemsForTests(["cbc","kft"])` bills a report's tests.

> ⚠ The rates in `PRICE_LIST` are **sample placeholders**. Replace them with the lab's real prices,
> or pass your own list: `buildInvoice({ …, priceList: myList })`. Have someone verify any GST %/HSN.

## Lab settings (in report-kit `MGPL_LAB`)

| Field | Effect |
|---|---|
| `upiId` | prints a UPI *scan to pay* QR for the balance due |
| `gstin`, `registrationNo` | printed under the INVOICE title |
| `invoiceTerms` | printed under the payments |

## Development

```bash
npm run typecheck
npm run build      # tsup → dist/ (commit it)
npm run smoke      # arithmetic checks + every sample as HTML & PDF (values verified in the PDF text)
npm run examples   # examples/index.html
```

See [AGENTS.md](AGENTS.md) for architecture and rules. The API is in [docs/api.md](docs/api.md).
