// Node.js PDF export for invoices — no browser involved. Import only on the server.
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { barcodeSvg, defaultLab, qrSvg, type LabProfile, type ReportVariant } from "@mgpl-diagnostics/report-kit";
import { INV_PAYQR } from "./layout";
import { assetsDir, loadImage, registerFonts, svgToPng } from "@mgpl-diagnostics/report-kit";
import { join } from "node:path";
import { computeInvoice } from "./calc";
import { InvoicePdf } from "./InvoicePdf";
import { invoicePayQr, invoiceQr } from "./model";
import type { Invoice } from "./types";

export { InvoicePdf } from "./InvoicePdf";

export interface RenderInvoicePdfOptions {
  invoice: Invoice;
  variant: ReportVariant;
  lab?: LabProfile;
  /** Folder that "/report-assets/…" paths resolve against. Default: report-kit's bundled assets */
  publicDir?: string;
}

/** Renders an invoice to an A4 PDF (Buffer). */
export async function renderInvoicePdf(opts: RenderInvoicePdfOptions): Promise<Buffer> {
  const lab = opts.lab ?? defaultLab();
  const publicDir = opts.publicDir ?? assetsDir();
  registerFonts(join(publicDir, "report-fonts"));
  const header = opts.variant === "header";
  const [logo, email, phone, signature] = await Promise.all([
    loadImage(lab.logoSrc, publicDir),
    loadImage(lab.icons.emailSrc, publicDir),
    loadImage(lab.icons.phoneSrc, publicDir),
    loadImage(header ? lab.signatory.signatureHeaderSrc : lab.signatory.signatureNonHeaderSrc, publicDir),
  ]);
  const bar = barcodeSvg(opts.invoice.invoiceNo, "code128");
  const totals = computeInvoice(opts.invoice);
  const qr = invoiceQr(opts.invoice, totals, lab);
  const pay = invoicePayQr(opts.invoice, totals, lab);
  const mark = pay && lab.markSrc ? await loadImage(lab.markSrc, publicDir) : undefined;
  const images = {
    logo, email, phone, signature, barcode: bar ? svgToPng(bar) : undefined, qr: svgToPng(qrSvg(qr.value), 800),
    ...(pay ? { payQr: svgToPng(qrSvg(pay.value, "#000", { ecc: "H", hole: INV_PAYQR.hole }), 1200), ...(mark ? { mark } : {}) } : {}),
  };
  const doc = createElement(InvoicePdf, { invoice: opts.invoice, variant: opts.variant, lab, images });
  return renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
}
