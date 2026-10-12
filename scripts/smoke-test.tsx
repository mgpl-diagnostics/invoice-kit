// Invoice smoke test:  npm run smoke
//  1. arithmetic — hand-checked totals, discounts, GST, round-off, paid/due/status, amount in words
//  2. rendering  — every sample × header/non-header as HTML and Node PDF, same page count
//  3. fit        — every printed text fits its column (real Manrope metrics); every glyph exists
import { join } from "node:path";
import * as fontkit from "fontkit";
import { renderToStaticMarkup } from "react-dom/server";
import { MGPL_LAB, type ReportVariant } from "@mgpl-diagnostics/report-kit";
import { assetsDir } from "@mgpl-diagnostics/report-kit/pdf";
import { amountInWords, buildInvoice, computeInvoice, INVOICE_LAYOUT, INVOICE_SAMPLES, InvoiceDocument, invoicePages, type Invoice } from "../src";
import { renderInvoicePdf } from "../src/pdf";
import { cellText, invoiceCard, invoiceColumns, invoiceQr, invoiceRows, noteLines, patientCard, subLine, totalLines, wordsOf } from "../src/model";

const problems: string[] = [];
const warn = (m: string) => problems.push(m);
const eq = (what: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) warn(`${what}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
};
const patient = { name: "Test", age: 30, sex: "Male" };

/* ------------------------------------------------------------- 1. arithmetic */
{
  // 2 × 150 + 1 × 99.99, 10% bill discount, no tax: 399.99 − 40.00 = 359.99 → rounds to 360
  const inv = buildInvoice({
    invoiceNo: "T1", patient,
    items: [{ name: "A", category: "test", rate: 150, qty: 2 }, { name: "B", category: "test", rate: 99.99 }],
    discount: { percent: 10 },
    payments: [{ mode: "Cash", amount: 100 }],
  });
  const t = computeInvoice(inv);
  eq("T1 subtotal", t.subtotal, 399.99);
  eq("T1 bill discount", t.billDiscount, 40);
  eq("T1 round off", t.roundOff, 0.01);
  eq("T1 total", t.total, 360);
  eq("T1 due", t.due, 260);
  eq("T1 status", t.status, "PARTIALLY PAID");
  eq("T1 discount shares add up", Math.round(t.lines.reduce((a, l) => a + l.billDiscount, 0) * 100), 4000);
}
{
  // GST after discount: 100 @12% with 10% line discount → 90 + 10.80 = 100.80 → 101; plus untaxed 50
  const inv = buildInvoice({
    invoiceNo: "T2", patient, roundOff: true,
    items: [{ name: "Syringe", category: "consumable", rate: 100, taxPercent: 12, discountPercent: 10 }, { name: "Test", category: "test", rate: 50 }],
    payments: [{ mode: "UPI", amount: 200 }],
  });
  const t = computeInvoice(inv);
  eq("T2 tax", t.tax, 10.8);
  eq("T2 taxable", t.taxable, 140);
  eq("T2 total", t.total, 151);
  eq("T2 excess", t.excess, 49);
  eq("T2 status", t.status, "PAID");
  eq("T2 tax by rate", t.taxByRate, [{ rate: 12, taxable: 90, tax: 10.8 }]);
}
{
  const t = computeInvoice(buildInvoice({ invoiceNo: "T3", patient, items: [{ name: "x", category: "test", rate: 10.5 }], roundOff: false }));
  eq("T3 no round-off", [t.total, t.roundOff, t.status], [10.5, 0, "DUE"]);
}
for (const [n, w] of [
  [0, "Rupees Zero Only"],
  [15, "Rupees Fifteen Only"],
  [100, "Rupees One Hundred Only"],
  [1001, "Rupees One Thousand One Only"],
  [100000, "Rupees One Lakh Only"],
  [123456.78, "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Seventy Eight Paise Only"],
  [12345678, "Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only"],
] as const)
  eq(`words ${n}`, amountInWords(n), w);

/* ---------------------------------------------------------- 3. fit + glyphs */
const fontDir = join(assetsDir(), "report-fonts");
const mr = { 400: fontkit.openSync(join(fontDir, "manrope-400.woff")) as fontkit.Font, 600: fontkit.openSync(join(fontDir, "manrope-600.woff")) as fontkit.Font, 700: fontkit.openSync(join(fontDir, "manrope-700.woff")) as fontkit.Font, 800: fontkit.openSync(join(fontDir, "manrope-800.woff")) as fontkit.Font };
const width = (f: fontkit.Font, s: string, size: number, ls = 0) => ((f.layout(s).advanceWidth / f.unitsPerEm) * size + ls * s.length) / 72;
const { INV_CELL_PAD, INV_CARDS, INV_TOTALS, INV_ROWS } = INVOICE_LAYOUT;
const pad = 2 * INV_CELL_PAD;

function checkInvoice(id: string, inv: Invoice) {
  const t = computeInvoice(inv);
  const cols = invoiceColumns(t);
  const texts: string[] = [];
  for (const c of cols) {
    texts.push(c.header);
    if (width(mr[700], c.header.toUpperCase(), 7, 0.4) > c.w - pad + 0.005) warn(`${id}: header "${c.header}" too wide`);
  }
  for (const r of invoiceRows(t)) {
    if (r.kind === "group") continue;
    for (const c of cols) {
      const s = cellText(c, r);
      texts.push(s);
      const f = c.key === "amount" ? mr[700] : c.key === "desc" ? mr[600] : mr[400];
      if (width(f, s, INV_ROWS.fontSize) > c.w - pad + 0.005) warn(`${id}: "${s}" does not fit column ${c.key}`);
    }
    const sub = subLine(r.line);
    if (sub) {
      texts.push(sub);
      if (width(mr[400], sub, 6.6) > cols[1].w - pad) warn(`${id}: sub-line "${sub}" too wide`);
    }
  }
  for (const [card, fields] of [["patient", patientCard(inv)], ["invoice", invoiceCard(inv, t)]] as const) {
    // react-pdf drops text that overflows a fixed-height box, so the rows must fit the card
    const need = fields.length * INV_CARDS.lineH + 2 * INV_CARDS.pad;
    if (need > INV_CARDS.h + 1e-9) warn(`${id}: ${card} card needs ${need.toFixed(3)}in, has ${INV_CARDS.h}in`);
    for (const f of fields) {
      texts.push(f.label, f.value);
      const room = INV_CARDS[card].w - 2 * INV_CARDS.pad - 0.78 - 6 / 72;
      if (width(mr[f.strong ? 800 : 600], f.value, INV_CARDS.valueSize) > room) warn(`${id}: ${card} card "${f.value}" too wide`);
    }
  }
  for (const l of totalLines(inv, t)) {
    texts.push(l.label, l.value);
    const sz = l.kind === "grand" ? 10 : INV_ROWS.fontSize;
    if (width(mr[800], l.label + "  " + l.value, sz) > INV_TOTALS.rightW - pad) warn(`${id}: totals "${l.label} ${l.value}" too wide`);
  }
  for (const n of noteLines(inv, MGPL_LAB)) {
    texts.push(n);
    if (width(mr[400], "• " + n, 7) > INV_TOTALS.rightW + 1.2) warn(`${id}: note "${n}" too wide`);
  }
  // amount in words: 2 lines of the words box
  const words = wordsOf(t);
  texts.push(words, invoiceQr(inv, t, MGPL_LAB).label);
  if (width(mr[700], words, INV_ROWS.fontSize) > 2 * (INVOICE_LAYOUT.INV_W - INV_TOTALS.rightW - INV_TOTALS.gap - 0.2)) warn(`${id}: amount in words needs > 2 lines`);
  for (const ch of new Set(texts.join(" ")))
    if (ch.codePointAt(0)! >= 32 && !mr[400].hasGlyphForCodePoint(ch.codePointAt(0)!)) warn(`${id}: glyph "${ch}" missing from Manrope`);
}

/** All text in a PDF (Mozilla pdf.js), whitespace removed — used to prove values were really drawn. */
async function pdfText(buf: Buffer): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(buf), disableFontFace: true, verbosity: 0 });
  const doc = await task.promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const c = await (await doc.getPage(p)).getTextContent();
    out += c.items.map((i) => ("str" in i ? i.str : "")).join("");
  }
  await task.destroy();
  if (out.trim().length < 50) throw new Error("PDF text extraction returned almost nothing");
  return out.replace(/\s+/g, "");
}
const squash = (s: string) => s.replace(/\s+/g, "");

/* ------------------------------------------------------------- 2. rendering */
async function main() {
  const t0 = Date.now();
  const variants: ReportVariant[] = ["header", "non-header"];
  let ok = 0;
  for (const s of INVOICE_SAMPLES) {
    checkInvoice(s.id, s.invoice);
    const pages = invoicePages(s.invoice, MGPL_LAB).pages.length;
    for (const v of variants) {
      const tag = `${s.id}/${v}`;
      try {
        const html = renderToStaticMarkup(<InvoiceDocument invoice={s.invoice} variant={v} />);
        const htmlPages = html.split('class="sb-page"').length - 1;
        if (htmlPages !== pages) warn(`${tag}: HTML ${htmlPages} pages, layout ${pages}`);
        if (!html.includes(s.invoice.invoiceNo)) warn(`${tag}: invoice number missing`);
        const hasLetterhead = html.includes('class="sb-side"');
        if ((v === "header") !== hasLetterhead) warn(`${tag}: letterhead ${hasLetterhead ? "printed" : "missing"}`);
        const pdf = await renderInvoicePdf({ invoice: s.invoice, variant: v });
        const pdfPages = (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;
        if (pdfPages !== pages) warn(`${tag}: PDF ${pdfPages} pages, layout ${pages}`);
        // every value must really be drawn in the PDF (react-pdf silently drops overflowing text)
        const text = await pdfText(pdf);
        const t = computeInvoice(s.invoice);
        const expect = [
          s.invoice.invoiceNo, s.invoice.patient.name, ...patientCard(s.invoice).map((f) => f.value), ...invoiceCard(s.invoice, t).map((f) => f.value),
          ...s.invoice.items.map((it) => it.name), ...totalLines(s.invoice, t).map((l) => l.value), wordsOf(t),
          ...(s.invoice.payments ?? []).map((p) => p.reference ?? p.mode),
        ];
        for (const v of expect) if (!text.includes(squash(v))) warn(`${tag}: PDF is missing "${v}"`);
        ok++;
        console.log(`ok   ${tag.padEnd(34)} ${pages} page(s)  ${(pdf.length / 1024).toFixed(0)} KB`);
      } catch (e) {
        warn(`${tag}: threw ${(e as Error).stack}`);
      }
    }
  }
  console.log(`\n${ok}/${INVOICE_SAMPLES.length * 2} invoice renders passed in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log("  - " + p);
    process.exit(1);
  }
  console.log("All checks passed.");
}

main();
