# API reference: @mgpl-diagnostics/invoice-kit (v2)

Backend only (Node.js ≥ 20); peer dependency `@mgpl-diagnostics/report-kit` ^2.
Entry points: `@mgpl-diagnostics/invoice-kit` and `@mgpl-diagnostics/invoice-kit/fastify`.

## HTTP API: reports and invoices in one handler

```ts
createMgplApi(opts?: ApiOptions): (req: Request) => Promise<Response>   // ApiOptions from report-kit
createInvoiceRoutes(opts?): (req: Request) => Promise<Response | null>  // invoice routes only (null = not mine)

// Fastify
import { mgplFastify } from "@mgpl-diagnostics/invoice-kit/fastify";
await app.register(mgplFastify, { prefix: "/api/mgpl" });
```

| Route | Notes |
|---|---|
| `POST /invoice` | body `InvoiceRequest` → PDF (default), HTML (`format: "html"`) or the calculation (`format: "json"`) |
| `GET /price-list` | `[{ code, name, category, rate, taxPercent?, hsn? }]` |
| `GET /invoice-samples` | `[{ id, label, invoiceNo }]` (only with `samples: true`) |
| all report-kit routes | `/health`, `/templates`, `/samples`, `/report`, `/letterhead`, `/assets/*` |

```ts
interface InvoiceRequest {
  invoice?: BuildInvoiceInput;   // items may be codes, code + overrides, or full items
  sample?: string;
  variant?: "header" | "non-header";
  format?: "pdf" | "html" | "json";
  fileName?: string; download?: boolean;
}
```

Validation (400): `invoiceNo`, `patient.name/age/sex`, non-empty `items` (≤ 500), known price codes,
`rate ≥ 0`, `qty > 0`, `taxPercent` 0–100, `payments[].amount ≥ 0`.
`invoiceFromRequest(body, opts)` and `invoiceTotalsJson(invoice)` are exported for custom routes.

## Billing

```ts
buildInvoice(input: BuildInvoiceInput): Invoice
interface BuildInvoiceInput {
  invoiceNo: string; date?: Date | string; patient: Patient;
  items: ItemInput[];   // "cbc" | { code: "cbc", qty?, rate?, discountPercent?, … } | InvoiceItem
  discount?: { percent?: number; amount?: number; reason?: string };
  payments?: Payment[]; notes?: string[]; roundOff?: boolean; title?: string;
  priceList?: Record<string, PriceEntry>;
}
itemsForTests(ids: string[]): ItemInput[]

interface InvoiceItem {
  code?: string; name: string; category: "test" | "profile" | "medicine" | "consumable" | "service" | "other";
  qty?: number; rate: number; discountPercent?: number; discountAmount?: number;
  taxPercent?: number; hsn?: string; note?: string;
}
interface Payment { mode: string; amount: number; date?: Date | string; reference?: string }

computeInvoice(inv): InvoiceTotals
// { lines, subtotal, lineDiscount, billDiscount, taxable, tax, taxByRate, roundOff, total,
//   paid, due, excess, status: "PAID" | "PARTIALLY PAID" | "DUE", hasTax, hasDiscount }
money(n)            // "1,23,456.50"
amountInWords(n)    // "Rupees One Lakh … Only"
CURRENCY            // "Rs."
PRICE_LIST, INVOICE_SAMPLES, CATEGORY_LABEL, INVOICE_LAYOUT
```

## Rendering

```ts
renderInvoicePdf({ invoice, variant, lab?, publicDir? }): Promise<Buffer>
renderInvoiceHtml({ invoice, variant, lab?, inline? = true, fontBase? }): Promise<string>
<InvoiceDocument invoice variant lab? includeStyles? fontBase? />    // React, rendered on the server
InvoicePdf                                                           // react-pdf <Document>
invoicePages(inv, lab), invoiceQr(inv, totals, lab)                  // shared page split / QR value
```
