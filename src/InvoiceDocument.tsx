import { barcodeSvg, formatDate, MGPL_LAB, qrSvg, SbLetterhead, type LabProfile, type ReportVariant } from "@mgpl-diagnostics/report-kit";
import { CURRENCY, money, type InvoiceTotals } from "./calc";
import { INV_CARDS, INV_COLORS, INV_PAY_COLS as PC } from "./layout";
import {
  cellText,
  invoiceCard,
  invoiceColumns,
  invoicePages,
  invoiceQr,
  noteLines,
  patientCard,
  rowHeight,
  STATUS_COLOR,
  subLine,
  totalLines,
  wordsOf,
  type CardField,
  type InvColumn,
  type InvRow,
} from "./model";
import { invoiceCss } from "./styles";
import type { Invoice } from "./types";

export interface InvoiceDocumentProps {
  invoice: Invoice;
  /** "header" prints the letterhead; "non-header" leaves it to pre-printed paper. */
  variant: ReportVariant;
  lab?: LabProfile;
  includeStyles?: boolean;
  /** URL folder with the report-kit fonts (default "/report-fonts") */
  fontBase?: string;
}

const inch = (n: number) => `${n}in`;
const Svg = ({ className, svg }: { className: string; svg: string }) => <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />;

/** A4 patient invoice (HTML). Pure component — works in Server/Client Components and renderToStaticMarkup. */
export function InvoiceDocument({ invoice, variant, lab = MGPL_LAB, includeStyles = true, fontBase }: InvoiceDocumentProps) {
  const { pages, totals } = invoicePages(invoice, lab);
  const cols = invoiceColumns(totals);
  const bar = barcodeSvg(invoice.invoiceNo, "code128");
  const qr = invoiceQr(invoice, totals, lab);
  const qrMarkup = qrSvg(qr.value);
  const signature = variant === "header" ? lab.signatory.signatureHeaderSrc : lab.signatory.signatureNonHeaderSrc;

  return (
    <div className="sb-doc">
      {includeStyles && <style dangerouslySetInnerHTML={{ __html: invoiceCss(fontBase) }} />}
      {pages.map((page, n) => (
        <div key={n} className="sb-page">
          {variant === "header" && <SbLetterhead lab={lab} />}

          <div className="iv-title">
            <div>
              <h1>{invoice.title ?? "INVOICE"}</h1>
              <small>
                {[lab.gstin && `GSTIN: ${lab.gstin}`, lab.registrationNo && `Reg. No: ${lab.registrationNo}`].filter(Boolean).join("   •   ") ||
                  "Laboratory bill / cash memo"}
                {page.continued ? "   (continued)" : ""}
              </small>
            </div>
            <span className="iv-status" style={{ background: STATUS_COLOR[totals.status] }}>
              {totals.status}
            </span>
          </div>

          <Card x="patient" fields={patientCard(invoice)} />
          <Card x="invoice" fields={invoiceCard(invoice, totals)} />
          {bar && <Svg className="iv-barcode" svg={bar.replace("<svg ", '<svg preserveAspectRatio="none" ')} />}
          <Svg className="iv-qr" svg={qrMarkup} />
          <div className="iv-qr-label">{qr.label}</div>

          <div className="iv-body">
            <div className="iv-row iv-th">
              {cols.map((c) => (
                <div key={c.key} className={`iv-cell ${c.align}`} style={{ width: inch(c.w) }}>
                  {c.header}
                </div>
              ))}
            </div>
            {page.rows.map((r, k) => (
              <RowView key={k} row={r} cols={cols} />
            ))}
            {page.totals && <Totals invoice={invoice} totals={totals} lab={lab} />}
          </div>

          <img className="sb-abs iv-signimg" src={signature} alt="Signature" />
          <div className="iv-signname">
            <b>For {lab.name}</b>
            <span>Authorised Signatory</span>
          </div>
          <div className="iv-legal">
            <span>This is a computer-generated invoice. {formatDate(invoice.date)}</span>
            <span>
              Page {n + 1} of {pages.length}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ x, fields }: { x: "patient" | "invoice"; fields: CardField[] }) {
  return (
    <div className="iv-card" style={{ left: inch(INV_CARDS[x].x), width: inch(INV_CARDS[x].w) }}>
      {fields.map((f) => (
        <div key={f.label} className="iv-field">
          <span>{f.label}</span>
          <b className={f.strong ? "strong" : undefined}>{f.value}</b>
        </div>
      ))}
    </div>
  );
}

function RowView({ row, cols }: { row: InvRow; cols: InvColumn[] }) {
  if (row.kind === "group") return <div className="iv-group">{row.label}</div>;
  const sub = subLine(row.line);
  return (
    <div className="iv-row" style={{ height: `${rowHeight(row)}pt` }}>
      {cols.map((c) => (
        <div key={c.key} className={`iv-cell ${c.align}`} style={{ width: inch(c.w) }}>
          <span className={c.key === "disc" ? "iv-disc" : undefined} style={c.key === "desc" || c.key === "amount" ? { fontWeight: c.key === "amount" ? 700 : 600 } : undefined}>
            {cellText(c, row)}
          </span>
          {c.key === "desc" && sub && <span className="iv-sub">{sub}</span>}
        </div>
      ))}
    </div>
  );
}

function Totals({ invoice, totals, lab }: { invoice: Invoice; totals: InvoiceTotals; lab: LabProfile }) {
  const pays = invoice.payments ?? [];
  const notes = noteLines(invoice, lab);
  return (
    <div className="iv-totals">
      <div className="iv-left">
        <div className="iv-words">
          <span>Amount in words</span>
          <b>{wordsOf(totals)}</b>
        </div>
        <div className="iv-pays">
          <div className="iv-row iv-ph">
            <div className="iv-cell left" style={{ width: inch(PC.date) }}>Date</div>
            <div className="iv-cell left" style={{ width: inch(PC.mode) }}>Mode</div>
            <div className="iv-cell left" style={{ width: inch(PC.ref) }}>Reference</div>
            <div className="iv-cell right" style={{ width: inch(PC.amount) }}>Amount ({CURRENCY})</div>
          </div>
          {pays.length ? (
            pays.map((p, k) => (
              <div key={k} className="iv-row">
                <div className="iv-cell left" style={{ width: inch(PC.date) }}>{formatDate(p.date ?? invoice.date)}</div>
                <div className="iv-cell left" style={{ width: inch(PC.mode) }}>{p.mode}</div>
                <div className="iv-cell left" style={{ width: inch(PC.ref) }}>{p.reference ?? "-"}</div>
                <div className="iv-cell right" style={{ width: inch(PC.amount), fontWeight: 700 }}>{money(p.amount)}</div>
              </div>
            ))
          ) : (
            <div className="iv-row">
              <div className="iv-cell left" style={{ width: inch(PC.date + PC.mode + PC.ref + PC.amount), color: INV_COLORS.muted }}>No payment received yet</div>
            </div>
          )}
        </div>
        {notes.length > 0 && (
          <div className="iv-notes">
            <h4>Notes &amp; terms</h4>
            {notes.map((n, k) => (
              <p key={k}>• {n}</p>
            ))}
          </div>
        )}
      </div>
      <div className="iv-right">
        {totalLines(invoice, totals).map((l) => (
          <div key={l.label} className={`iv-tl${l.kind ? " " + l.kind : ""}`} style={l.kind === "due" ? { color: totals.due > 0 || totals.excess > 0 ? INV_COLORS.due : INV_COLORS.paid } : undefined}>
            <span>{l.label}</span>
            <span>{l.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

