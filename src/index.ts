// MGPL Diagnostics — invoice kit. Browser + server safe.
// Node-only: "@mgpl-diagnostics/invoice-kit/pdf" (PDF) and "@mgpl-diagnostics/invoice-kit/server" (HTML string).
export { InvoiceDocument, type InvoiceDocumentProps } from "./InvoiceDocument";
export { invoiceCss } from "./styles";
export { buildInvoice, itemsForTests, type BuildInvoiceInput, type ItemInput } from "./build";
export { amountInWords, computeInvoice, CURRENCY, money, type ComputedLine, type InvoiceTotals } from "./calc";
export { PRICE_LIST, type PriceEntry } from "./price-list";
export { invoicePages, invoiceQr, CATEGORY_LABEL } from "./model";
export { INVOICE_SAMPLES, type InvoiceSample } from "./samples";
export * as INVOICE_LAYOUT from "./layout";
export * from "./types";
