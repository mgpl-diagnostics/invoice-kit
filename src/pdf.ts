// Node.js PDF export for invoices — no browser involved. Import only on the server.
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { barcodeSvg, MGPL_LAB, qrSvg, type LabProfile, type ReportVariant } from "@mgpl-diagnostics/report-kit";
import { assetsDir, loadImage, registerFonts, svgToPng } from "@mgpl-diagnostics/report-kit/pdf";
import { join } from "node:path";
import { computeInvoice } from "./calc";
import { InvoicePdf } from "./InvoicePdf";
import { invoiceQr } from "./model";
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
  const lab = opts.lab ?? MGPL_LAB;
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
  const qr = invoiceQr(opts.invoice, computeInvoice(opts.invoice), lab);
  const images = { logo, email, phone, signature, barcode: bar ? svgToPng(bar) : undefined, qr: svgToPng(qrSvg(qr.value), 800) };
  const doc = createElement(InvoicePdf, { invoice: opts.invoice, variant: opts.variant, lab, images });
  return renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
}
