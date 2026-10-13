// Invoice routes + createMgplApi(): ONE backend handler for reports AND invoices.
import {
  apiBaseUrl,
  createReportApi,
  DEFAULT_BASE_PATH,
  HttpError,
  htmlResponse,
  json,
  labWithAssetUrls,
  defaultLab,
  pdfResponse,
  readJson,
  withCors,
  type ApiHandler,
  type ApiOptions,
  type ReportVariant,
} from "@mgpl-diagnostics/report-kit";
import { buildInvoice, type BuildInvoiceInput } from "./build";
import { amountInWords, computeInvoice } from "./calc";
import { renderInvoicePdf } from "./pdf";
import { PRICE_LIST } from "./price-list";
import { INVOICE_SAMPLES } from "./samples";
import { renderInvoiceHtml } from "./server";
import type { Invoice } from "./types";

export const INVOICE_ROUTES = { invoice: "/invoice", priceList: "/price-list", invoiceSamples: "/invoice-samples" } as const;

/** POST /invoice body */
export interface InvoiceRequest {
  /** Same shape as buildInvoice(): items may be price-list codes, code + overrides, or full items */
  invoice?: BuildInvoiceInput;
  /** demo id (only when the server enables samples) */
  sample?: string;
  variant?: ReportVariant;
  /** default "pdf"; "json" returns the calculation */
  format?: "pdf" | "html" | "json";
  fileName?: string;
  download?: boolean;
}

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);

/** Validates and builds an Invoice from a request (HttpError 400 on bad input). */
export function invoiceFromRequest(body: InvoiceRequest, opts: Pick<ApiOptions, "samples"> = {}): Invoice {
  try {
    if (body.sample) {
      if (!opts.samples) throw new Error("samples are disabled on this server");
      const s = INVOICE_SAMPLES.find((x) => x.id === body.sample);
      if (!s) throw new Error(`unknown sample "${body.sample}"`);
      return s.invoice;
    }
    const inv = body.invoice;
    if (!inv) throw new Error("send invoice or sample");
    if (!inv.invoiceNo || typeof inv.invoiceNo !== "string") throw new Error("invoice.invoiceNo is required");
    if (!inv.patient?.name || inv.patient.age == null || !inv.patient.sex) throw new Error("invoice.patient needs name, age and sex");
    if (!Array.isArray(inv.items) || !inv.items.length) throw new Error("invoice.items must be a non-empty array");
    if (inv.items.length > 500) throw new Error("too many items");
    const built = buildInvoice(inv);
    for (const [k, it] of built.items.entries()) {
      if (!num(it.rate) || it.rate < 0) throw new Error(`items[${k}].rate must be a number >= 0`);
      if (it.qty != null && (!num(it.qty) || it.qty <= 0)) throw new Error(`items[${k}].qty must be > 0`);
      if (it.taxPercent != null && (!num(it.taxPercent) || it.taxPercent < 0 || it.taxPercent > 100)) throw new Error(`items[${k}].taxPercent must be 0-100`);
    }
    for (const [k, p] of (built.payments ?? []).entries()) if (!num(p.amount) || p.amount < 0) throw new Error(`payments[${k}].amount must be a number >= 0`);
    return built;
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
}

/** The server's calculation as JSON (what POST /invoice returns with format "json"). */
export function invoiceTotalsJson(inv: Invoice) {
  const t = computeInvoice(inv);
  return {
    ...t,
    lines: t.lines.map((l) => ({
      index: l.index,
      name: l.item.name,
      qty: l.qty,
      gross: l.gross,
      lineDiscount: l.lineDiscount,
      billDiscount: l.billDiscount,
      taxable: l.taxable,
      tax: l.tax,
      amount: l.amount,
    })),
    amountInWords: amountInWords(t.total),
  };
}

/** Invoice routes only. Returns null for paths it doesn't own (so it can be combined). */
export function createInvoiceRoutes(opts: ApiOptions = {}) {
  const base = (opts.basePath ?? DEFAULT_BASE_PATH).replace(/\/$/, "");
  const lab = opts.lab ?? defaultLab();
  const max = opts.maxBodyBytes ?? 1_000_000;
  return async (req: Request): Promise<Response | null> => {
    let path = new URL(req.url).pathname;
    if (path.startsWith(base)) path = path.slice(base.length) || "/";
    const get = req.method === "GET" || req.method === "HEAD";
    if (path === INVOICE_ROUTES.priceList && get) return json(Object.entries(PRICE_LIST).map(([code, e]) => ({ code, ...e })));
    if (path === INVOICE_ROUTES.invoiceSamples && get) {
      if (!opts.samples) throw new HttpError(404, "samples are disabled on this server");
      return json(INVOICE_SAMPLES.map((s) => ({ id: s.id, label: s.label, invoiceNo: s.invoice.invoiceNo })));
    }
    if (path !== INVOICE_ROUTES.invoice) return null;
    if (req.method !== "POST") throw new HttpError(405, "Use POST");
    const body = await readJson<InvoiceRequest>(req, max);
    const invoice = invoiceFromRequest(body, opts);
    const variant: ReportVariant = body.variant === "non-header" ? "non-header" : "header";
    if (body.format === "json") return json(invoiceTotalsJson(invoice));
    if (body.format === "html") {
      const assetBase = apiBaseUrl(req, opts) + "/assets";
      return htmlResponse(await renderInvoiceHtml({ invoice, variant, lab: labWithAssetUrls(lab, assetBase), inline: false, fontBase: `${assetBase}/report-fonts` }));
    }
    return pdfResponse(await renderInvoicePdf({ invoice, variant, lab }), body.fileName ?? `${invoice.invoiceNo}.pdf`, !!body.download);
  };
}

/**
 * ONE backend for reports + invoices (all report-kit routes plus /invoice, /price-list).
 *
 *   // Next.js  app/api/mgpl/[...path]/route.ts
 *   const api = createMgplApi();
 *   export { api as GET, api as POST, api as OPTIONS };  export const runtime = "nodejs";
 *
 *   // Fastify   app.register(mgplFastify, { prefix: "/api/mgpl" })      (from "@mgpl-diagnostics/invoice-kit/fastify")
 *   // Express   app.use("/api/mgpl", toNodeHandler(createMgplApi()))
 */
export function createMgplApi(opts: ApiOptions = {}): ApiHandler {
  const reports = createReportApi(opts);
  const invoices = createInvoiceRoutes(opts);
  return async (req) => {
    if (req.method === "OPTIONS") return reports(req);
    try {
      const res = await invoices(req);
      if (res) return withCors(res, opts.cors);
    } catch (e) {
      if (e instanceof HttpError) return withCors(json({ error: e.message }, e.status), opts.cors);
      console.error("[@mgpl-diagnostics/invoice-kit]", e);
      return withCors(json({ error: "Internal error" }, 500), opts.cors);
    }
    return reports(req);
  };
}
