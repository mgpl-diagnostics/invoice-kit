// Writes examples/: self-contained HTML + A4 PDF for every sample invoice (header / non-header).
//   npm run examples
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReportVariant } from "@mgpl-diagnostics/report-kit";
import { INVOICE_SAMPLES } from "../src";
import { renderInvoicePdf } from "../src/pdf";
import { renderInvoiceHtml } from "../src/server";

async function main() {
  const out = join(process.cwd(), "examples");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const rows: string[] = [];
  for (const s of INVOICE_SAMPLES) {
    const cells: string[] = [];
    for (const v of ["header", "non-header"] as ReportVariant[]) {
      const name = `${s.id}-${v}`;
      writeFileSync(join(out, `${name}.html`), await renderInvoiceHtml({ invoice: s.invoice, variant: v }));
      writeFileSync(join(out, `${name}.pdf`), await renderInvoicePdf({ invoice: s.invoice, variant: v }));
      cells.push(`<td><a href="${name}.html">HTML</a> · <a href="${name}.pdf">PDF</a></td>`);
    }
    rows.push(`<tr><td><b>${s.invoice.invoiceNo}</b><br><small>${s.label}</small></td>${cells.join("")}</tr>`);
    console.log(`${s.id.padEnd(20)} html + pdf`);
  }
  writeFileSync(
    join(out, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MGPL Invoice Examples</title>
<style>body{font-family:system-ui,Segoe UI,sans-serif;margin:0;padding:24px 16px;background:#f5f6f8;color:#1c2230}h1{color:#14264A;font-size:22px}
table{border-collapse:collapse;background:#fff;width:100%;max-width:820px}th,td{padding:10px 12px;border-bottom:1px solid #e4e7ec;text-align:left;font-size:14px}
th{background:#14264A;color:#fff}small{color:#667085}a{color:#14264A}</style></head><body>
<h1>MGPL Invoice Examples</h1><table><thead><tr><th>Invoice</th><th>Header</th><th>Non-header</th></tr></thead><tbody>${rows.join("")}</tbody></table></body></html>`,
  );
  console.log("\nWrote examples/index.html");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
