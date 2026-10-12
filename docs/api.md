# API reference — @mgpl-diagnostics/invoice-kit

## Main entry (browser + server)

```ts
buildInvoice(input: BuildInvoiceInput): Invoice
interface BuildInvoiceInput {
  invoiceNo: string; date?: Date | string; patient: Patient;
  items: ItemInput[];                      // "cbc" | { code: "cbc", qty?, rate?, discountPercent?, … } | InvoiceItem
  discount?: { percent?: number; amount?: number; reason?: string };
  payments?: Payment[]; notes?: string[]; roundOff?: boolean /* default true */; title?: string;
  priceList?: Record<string, PriceEntry>;  // default PRICE_LIST
}
itemsForTests(ids: string[]): ItemInput[]   // report template/profile ids → lines

interface InvoiceItem {
  code?: string; name: string; category: "test" | "profile" | "medicine" | "consumable" | "service" | "other";
  qty?: number; rate: number; discountPercent?: number; discountAmount?: number;
  taxPercent?: number; hsn?: string; note?: string;
}
interface Payment { mode: string; amount: number; date?: Date | string; reference?: string }

computeInvoice(inv: Invoice): InvoiceTotals
interface InvoiceTotals {
  lines: ComputedLine[]; subtotal; lineDiscount; billDiscount; taxable; tax;
  taxByRate: { rate; taxable; tax }[]; roundOff; total; paid; due; excess;
  status: "PAID" | "PARTIALLY PAID" | "DUE"; hasTax: boolean; hasDiscount: boolean;
}
money(n): string            // "1,23,456.50"
amountInWords(n): string    // "Rupees One Lakh … Only"
CURRENCY = "Rs."
PRICE_LIST, INVOICE_SAMPLES, CATEGORY_LABEL, INVOICE_LAYOUT
invoicePages(inv, lab)      // { pages, totals } — the shared page split
invoiceQr(inv, totals, lab) // { value, label } — UPI pay link if lab.upiId and money due
```

```tsx
<InvoiceDocument invoice variant="header" | "non-header" lab? includeStyles? fontBase? />
```

## `@mgpl-diagnostics/invoice-kit/pdf` (Node only)

```ts
renderInvoicePdf({ invoice, variant, lab?, publicDir? }): Promise<Buffer>
InvoicePdf   // the react-pdf <Document>
```

## `@mgpl-diagnostics/invoice-kit/server` (Node only)

```ts
renderInvoiceHtml({ invoice, variant, lab?, inline? /* default true */, fontBase? }): Promise<string>
```
