// @mgpl-diagnostics/invoice-kit — BACKEND ONLY (Node.js ≥ 20). Browsers use @mgpl-diagnostics/client.

// HTTP API (reports + invoices in one handler)
export { createMgplApi, createInvoiceRoutes, invoiceFromRequest, invoiceTotalsJson, INVOICE_ROUTES, type InvoiceRequest } from "./api";

// Billing
export { buildInvoice, itemsForTests, type BuildInvoiceInput, type ItemInput } from "./build";
export { amountInWords, computeInvoice, CURRENCY, money, type ComputedLine, type InvoiceTotals } from "./calc";
export { PRICE_LIST, type PriceEntry } from "./price-list";
export * from "./types";

// Rendering
export { renderInvoicePdf, InvoicePdf, type RenderInvoicePdfOptions } from "./pdf";
export { renderInvoiceHtml } from "./server";
export { InvoiceDocument, type InvoiceDocumentProps } from "./InvoiceDocument";
export { invoiceCss } from "./styles";
export { invoicePages, invoiceQr, CATEGORY_LABEL } from "./model";
export * as INVOICE_LAYOUT from "./layout";

// Demo data
export { INVOICE_SAMPLES, type InvoiceSample } from "./samples";
