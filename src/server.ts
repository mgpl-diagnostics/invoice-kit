// Server-side helper: an invoice as a complete HTML document string. With `inline: true` (default)
// fonts and images are embedded, so the file works anywhere (email, archive, backend).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { MGPL_LAB, type LabProfile, type ReportVariant } from "@mgpl-diagnostics/report-kit";
import { assetsDir, inlineLab } from "@mgpl-diagnostics/report-kit/server";
import { InvoiceDocument } from "./InvoiceDocument";
import type { Invoice } from "./types";

const FONT_BASE = "__MGPL_FONTS__";

export async function renderInvoiceHtml(opts: { invoice: Invoice; variant: ReportVariant; lab?: LabProfile; inline?: boolean; fontBase?: string }): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const inline = opts.inline !== false;
  const lab = inline ? inlineLab(opts.lab ?? MGPL_LAB) : opts.lab ?? MGPL_LAB;
  let body = renderToStaticMarkup(createElement(InvoiceDocument, { invoice: opts.invoice, variant: opts.variant, lab, fontBase: inline ? FONT_BASE : opts.fontBase }));
  if (inline)
    body = body.replace(new RegExp(`${FONT_BASE}/([\w.-]+\.woff)`, "g"), (_, f: string) =>
      `data:font/woff;base64,${readFileSync(join(assetsDir(), "report-fonts", f)).toString("base64")}`,
    );
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Invoice ${opts.invoice.invoiceNo}</title><style>html,body{margin:0;background:#e8eaee}body{padding:24px 0}@media print{body{padding:0;background:#fff}}</style></head><body>${body}</body></html>`;
}
