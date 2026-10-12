import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { formatDate, type LabProfile, type ReportVariant } from "@mgpl-diagnostics/report-kit";
import { SbLetterheadPdf, type SbPdfImages } from "@mgpl-diagnostics/report-kit/pdf";
import { CURRENCY, money, type InvoiceTotals } from "./calc";
import {
  INV_BODY,
  INV_CARDS as K,
  INV_CELL_PAD,
  INV_COLORS as C,
  INV_FONT,
  INV_LEGAL,
  INV_PAY_COLS as PC,
  INV_RIGHT,
  INV_ROWS as R,
  INV_SIGN,
  INV_TITLE,
  INV_TOTALS,
  INV_W,
  INV_X,
} from "./layout";
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
import type { Invoice } from "./types";

type Img = SbPdfImages["logo"];
export interface InvoicePdfImages {
  logo: Img;
  email: Img;
  phone: Img;
  signature: Img;
  barcode?: Img;
  qr: Img;
}

const i = (n: number) => `${n}in`;
const justify = (a: "left" | "center" | "right") => (a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center");

/** Patient invoice as a react-pdf Document — same geometry and page breaks as <InvoiceDocument/>. */
export function InvoicePdf({ invoice, variant, lab, images }: { invoice: Invoice; variant: ReportVariant; lab: LabProfile; images: InvoicePdfImages }) {
  const { pages, totals } = invoicePages(invoice, lab);
  const cols = invoiceColumns(totals);
  const qr = invoiceQr(invoice, totals, lab);
  const sub = [lab.gstin && `GSTIN: ${lab.gstin}`, lab.registrationNo && `Reg. No: ${lab.registrationNo}`].filter(Boolean).join("   •   ") || "Laboratory bill / cash memo";
  return (
    <Document title={`Invoice ${invoice.invoiceNo}`} author={lab.name} creator={lab.name} producer={lab.name}>
      {pages.map((page, n) => (
        <Page key={n} size="A4" style={{ fontFamily: INV_FONT, fontSize: R.fontSize, color: C.ink }}>
          {variant === "header" && <SbLetterheadPdf lab={lab} images={images} />}

          {/* title + status */}
          <View style={{ position: "absolute", left: i(INV_X), width: i(INV_W), top: i(INV_TITLE.y), height: i(INV_TITLE.h), flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: INV_TITLE.size, fontWeight: 800, color: C.navy, letterSpacing: 1.3, lineHeight: 1 }}>{invoice.title ?? "INVOICE"}</Text>
              <Text style={{ fontSize: INV_TITLE.subSize, color: C.muted, fontWeight: 500, marginTop: 3 }}>{`${sub}${page.continued ? "   (continued)" : ""}`}</Text>
            </View>
            <View style={{ backgroundColor: STATUS_COLOR[totals.status], borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 }}>
              <Text style={{ color: "#fff", fontWeight: 800, fontSize: 8, letterSpacing: 0.8 }}>{totals.status}</Text>
            </View>
          </View>

          <Card at={K.patient} fields={patientCard(invoice)} />
          <Card at={K.invoice} fields={invoiceCard(invoice, totals)} />
          {images.barcode && (
            <Image src={images.barcode} style={{ position: "absolute", left: i(INV_RIGHT - K.barcode.w), top: i(K.y), width: i(K.barcode.w), height: i(K.barcode.h), objectFit: "fill" }} />
          )}
          <Image src={images.qr} style={{ position: "absolute", left: i(INV_RIGHT - K.barcode.w / 2 - K.qr.s / 2), top: i(K.y + K.barcode.h + 0.04), width: i(K.qr.s), height: i(K.qr.s) }} />
          <Text
            style={{ position: "absolute", left: i(INV_RIGHT - K.barcode.w - 0.1), width: i(K.barcode.w + 0.1), top: i(K.y + K.barcode.h + 0.06 + K.qr.s), textAlign: "center", fontSize: K.qr.labelSize, color: C.muted }}
          >
            {qr.label}
          </Text>

          {/* items */}
          <View style={{ position: "absolute", left: i(INV_X), width: i(INV_W), top: i(INV_BODY.top) }}>
            <View style={{ height: R.tableHeader, flexDirection: "row", alignItems: "center", backgroundColor: C.navy, borderTopLeftRadius: 3, borderTopRightRadius: 3 }}>
              {cols.map((c) => (
                <Cell key={c.key} w={c.w} align={c.align}>
                  <Text style={{ color: "#fff", fontSize: 7, fontWeight: 700, letterSpacing: 0.4 }}>{c.header.toUpperCase()}</Text>
                </Cell>
              ))}
            </View>
            {page.rows.map((r, k) => (
              <RowView key={k} row={r} cols={cols} />
            ))}
            {page.totals && <Totals invoice={invoice} totals={totals} lab={lab} />}
          </View>

          {/* signature + legal */}
          <Image
            src={images.signature}
            style={{ position: "absolute", left: i(INV_SIGN.centerX - INV_SIGN.sign.w / 2), top: i(INV_SIGN.sign.y), width: i(INV_SIGN.sign.w), height: i(INV_SIGN.sign.h), objectFit: "contain" }}
          />
          <View style={{ position: "absolute", left: i(INV_SIGN.centerX - 1.3), width: i(2.6), top: i(INV_SIGN.nameY) }}>
            <Text style={{ textAlign: "center", fontSize: INV_SIGN.nameSize, fontWeight: 800 }}>{`For ${lab.name}`}</Text>
            <Text style={{ textAlign: "center", fontSize: INV_SIGN.roleSize, color: C.muted }}>Authorised Signatory</Text>
          </View>
          <View
            style={{
              position: "absolute",
              left: i(INV_X),
              width: i(INV_W),
              top: i(INV_LEGAL.y),
              flexDirection: "row",
              justifyContent: "space-between",
              borderTopWidth: 0.5,
              borderTopColor: C.line,
              paddingTop: 3,
              fontSize: INV_LEGAL.size,
              color: C.muted,
            }}
          >
            <Text>{`This is a computer-generated invoice. ${formatDate(invoice.date)}`}</Text>
            <Text>{`Page ${n + 1} of ${pages.length}`}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}

function Card({ at, fields }: { at: { x: number; w: number }; fields: CardField[] }) {
  return (
    <View style={{ position: "absolute", left: i(at.x), width: i(at.w), top: i(K.y), height: i(K.h), backgroundColor: C.card, borderRadius: 6, padding: i(K.pad) }}>
      {fields.map((f) => (
        <View key={f.label} style={{ height: i(K.lineH), flexDirection: "row", alignItems: "center" }}>
          {/* lineHeight 1 keeps each text inside its fixed-height row — react-pdf drops text that overflows */}
          <View style={{ width: 0.78 * 72 + 6 }}>
            <Text style={{ fontSize: K.labelSize, fontWeight: 700, letterSpacing: 0.35, color: C.muted, lineHeight: 1 }}>{f.label.toUpperCase()}</Text>
          </View>
          <View style={{ width: (at.w - 2 * K.pad - 0.78) * 72 - 6 }}>
            <Text style={{ fontSize: K.valueSize, fontWeight: f.strong ? 800 : 600, lineHeight: 1 }}>{f.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Cell({ w, align, children }: { w: number; align: "left" | "center" | "right"; children: React.ReactNode }) {
  return <View style={{ width: i(w), height: "100%", paddingHorizontal: i(INV_CELL_PAD), justifyContent: "center", alignItems: justify(align) }}>{children}</View>;
}

function RowView({ row, cols }: { row: InvRow; cols: InvColumn[] }) {
  if (row.kind === "group") {
    return (
      <View style={{ height: R.group, justifyContent: "flex-end", paddingHorizontal: i(INV_CELL_PAD), paddingBottom: 2, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
        <Text style={{ fontWeight: 800, color: C.navy, fontSize: 7.5, letterSpacing: 0.45 }}>{row.label.toUpperCase()}</Text>
      </View>
    );
  }
  const sub = subLine(row.line);
  return (
    <View style={{ height: rowHeight(row), flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: C.line }}>
      {cols.map((c) => (
        <Cell key={c.key} w={c.w} align={c.align}>
          <Text style={{ fontWeight: c.key === "amount" ? 700 : c.key === "desc" ? 600 : 400, color: c.key === "disc" ? C.saffron : undefined }}>{cellText(c, row)}</Text>
          {c.key === "desc" && sub ? <Text style={{ fontSize: 6.6, color: C.muted }}>{sub}</Text> : null}
        </Cell>
      ))}
    </View>
  );
}

function Totals({ invoice, totals, lab }: { invoice: Invoice; totals: InvoiceTotals; lab: LabProfile }) {
  const pays = invoice.payments ?? [];
  const notes = noteLines(invoice, lab);
  const label = { fontSize: 6.5, fontWeight: 700, letterSpacing: 0.33, color: C.muted } as const;
  const payRow = (cells: [string, number, "left" | "right", boolean?][], h: number, header = false) => (
    <View style={{ height: h, flexDirection: "row", alignItems: "center", borderBottomWidth: header ? 0.8 : 0.5, borderBottomColor: header ? C.navy : C.line }}>
      {cells.map(([t, w, a, bold], k) => (
        <Cell key={k} w={w} align={a}>
          <Text style={header ? label : { fontWeight: bold ? 700 : 400 }}>{header ? t.toUpperCase() : t}</Text>
        </Cell>
      ))}
    </View>
  );
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: R.totalsGap }}>
      <View style={{ width: i(INV_W - INV_TOTALS.rightW - INV_TOTALS.gap) }}>
        <View style={{ height: R.wordsBox, backgroundColor: C.card, borderRadius: 4, paddingVertical: 4, paddingHorizontal: i(INV_CELL_PAD + 0.02) }}>
          <Text style={label}>AMOUNT IN WORDS</Text>
          <Text style={{ fontWeight: 700, lineHeight: 1.3 }}>{wordsOf(totals)}</Text>
        </View>
        <View style={{ marginTop: R.blockGap }}>
          {payRow(
            [
              ["Date", PC.date, "left"],
              ["Mode", PC.mode, "left"],
              ["Reference", PC.ref, "left"],
              [`Amount (${CURRENCY})`, PC.amount, "right"],
            ],
            R.payHeader,
            true,
          )}
          {pays.length
            ? pays.map((p, k) => (
                <View key={k}>
                  {payRow(
                    [
                      [formatDate(p.date ?? invoice.date), PC.date, "left"],
                      [p.mode, PC.mode, "left"],
                      [p.reference ?? "-", PC.ref, "left"],
                      [money(p.amount), PC.amount, "right", true],
                    ],
                    R.payRow,
                  )}
                </View>
              ))
            : payRow([["No payment received yet", PC.date + PC.mode + PC.ref + PC.amount, "left"]], R.payRow)}
        </View>
        {notes.length > 0 && (
          <View style={{ marginTop: R.blockGap }}>
            <View style={{ height: R.noteTitle, justifyContent: "center" }}>
              <Text style={label}>NOTES &amp; TERMS</Text>
            </View>
            {notes.map((t, k) => (
              <View key={k} style={{ height: R.noteLine, justifyContent: "center" }}>
                <Text style={{ fontSize: 7 }}>{`• ${t}`}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={{ width: i(INV_TOTALS.rightW) }}>
        {totalLines(invoice, totals).map((l) => {
          const grand = l.kind === "grand";
          const color = l.kind === "muted" ? C.muted : l.kind === "paid" ? C.paid : l.kind === "due" ? (totals.due > 0 || totals.excess > 0 ? C.due : C.paid) : grand ? "#fff" : C.ink;
          return (
            <View
              key={l.label}
              style={{
                height: grand ? R.grand - 4 : R.totalsRow,
                marginVertical: grand ? 2 : 0,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: i(INV_CELL_PAD),
                backgroundColor: grand ? C.navy : undefined,
                borderRadius: grand ? 3 : 0,
              }}
            >
              <Text style={{ color, fontWeight: grand || l.kind === "due" ? 800 : l.kind === "paid" ? 700 : 400, fontSize: grand ? 10 : undefined }}>{l.label}</Text>
              <Text style={{ color, fontWeight: grand || l.kind === "due" ? 800 : l.kind === "paid" ? 700 : 400, fontSize: grand ? 10 : undefined }}>{l.value}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
