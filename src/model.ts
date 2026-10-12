// Display logic shared by the invoice HTML and PDF renderers (and the page layout).
import { formatDate, formatDoctor, fullName, type LabProfile } from "@mgpl-diagnostics/report-kit";
import { amountInWords, computeInvoice, CURRENCY, money, type ComputedLine, type InvoiceTotals } from "./calc";
import { INV_BODY, INV_COLORS, INV_ROWS as R, INV_TOTALS, INV_W } from "./layout";
import type { Invoice, ItemCategory, PaymentStatus } from "./types";

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  test: "Laboratory Tests",
  profile: "Health Packages / Profiles",
  service: "Services",
  consumable: "Consumables",
  medicine: "Medicines",
  other: "Other Charges",
};
const ORDER: ItemCategory[] = ["test", "profile", "service", "consumable", "medicine", "other"];

export type InvRow = { kind: "group"; label: string } | { kind: "item"; line: ComputedLine; no: number };

/** Items grouped by category (tests first), numbered in printed order. */
export function invoiceRows(t: InvoiceTotals): InvRow[] {
  const rows: InvRow[] = [];
  let no = 0;
  const groups = ORDER.map((c) => t.lines.filter((l) => l.item.category === c)).filter((g) => g.length);
  for (const g of groups) {
    if (groups.length > 1) rows.push({ kind: "group", label: CATEGORY_LABEL[g[0].item.category] });
    for (const line of g) rows.push({ kind: "item", line, no: ++no });
  }
  return rows;
}

export const subLine = (l: ComputedLine) =>
  [l.item.hsn && `HSN ${l.item.hsn}`, l.item.note].filter(Boolean).join("  •  ");

export function rowHeight(r: InvRow): number {
  if (r.kind === "group") return R.group;
  return R.item + (subLine(r.line) ? R.itemSub : 0);
}

/* ------------------------------------------------------------------ columns */
export interface InvColumn {
  key: "no" | "desc" | "qty" | "rate" | "disc" | "tax" | "amount";
  header: string;
  w: number;
  align: "left" | "center" | "right";
}

export function invoiceColumns(t: InvoiceTotals): InvColumn[] {
  const showDisc = t.lines.some((l) => l.lineDiscount > 0);
  const cols: InvColumn[] = [
    { key: "no", header: "#", w: 0.35, align: "center" },
    { key: "desc", header: "Description", w: 0, align: "left" },
    { key: "qty", header: "Qty", w: 0.45, align: "center" },
    { key: "rate", header: `Rate (${CURRENCY})`, w: 0.95, align: "right" },
  ];
  if (showDisc) cols.push({ key: "disc", header: "Discount", w: 0.8, align: "right" });
  if (t.hasTax) cols.push({ key: "tax", header: "GST", w: 0.55, align: "center" });
  cols.push({ key: "amount", header: `Amount (${CURRENCY})`, w: 1.15, align: "right" });
  cols[1].w = INV_W - cols.reduce((a, c) => a + c.w, 0);
  return cols;
}

export function cellText(c: InvColumn, r: Extract<InvRow, { kind: "item" }>): string {
  const l = r.line;
  switch (c.key) {
    case "no":
      return String(r.no);
    case "desc":
      return l.item.name;
    case "qty":
      return String(l.qty);
    case "rate":
      return money(l.item.rate);
    case "disc":
      return l.lineDiscount ? `- ${money(l.lineDiscount)}` : "";
    case "tax":
      return l.item.taxPercent ? `${l.item.taxPercent}%` : "-";
    case "amount":
      // qty × rate − line discount; bill discount and GST are shown in the totals
      return money(l.gross - l.lineDiscount);
  }
}

/* ------------------------------------------------------------------- totals */
export interface TotalLine {
  label: string;
  value: string;
  kind?: "grand" | "due" | "paid" | "muted";
}

export function totalLines(inv: Invoice, t: InvoiceTotals): TotalLine[] {
  const out: TotalLine[] = [{ label: "Subtotal", value: money(t.subtotal) }];
  if (t.lineDiscount) out.push({ label: "Item discounts", value: `- ${money(t.lineDiscount)}`, kind: "muted" });
  if (t.billDiscount) {
    const pct = inv.discount?.percent != null ? ` (${inv.discount.percent}%)` : "";
    out.push({ label: `Discount${pct}${inv.discount?.reason ? ` – ${inv.discount.reason}` : ""}`, value: `- ${money(t.billDiscount)}`, kind: "muted" });
  }
  if (t.hasTax) {
    out.push({ label: "Taxable value", value: money(t.taxable) });
    for (const g of t.taxByRate) out.push({ label: `GST @ ${g.rate}%`, value: money(g.tax), kind: "muted" });
  }
  if (t.roundOff) out.push({ label: "Round off", value: `${t.roundOff > 0 ? "+" : "-"} ${money(Math.abs(t.roundOff))}`, kind: "muted" });
  out.push({ label: "Grand Total", value: `${CURRENCY} ${money(t.total)}`, kind: "grand" });
  out.push({ label: "Amount Paid", value: money(t.paid), kind: "paid" });
  if (t.excess) out.push({ label: "Excess paid (refund)", value: money(t.excess), kind: "due" });
  else out.push({ label: "Balance Due", value: money(t.due), kind: "due" });
  return out;
}

export const STATUS_COLOR: Record<PaymentStatus, string> = {
  PAID: INV_COLORS.paid,
  "PARTIALLY PAID": INV_COLORS.partial,
  DUE: INV_COLORS.due,
};

/* -------------------------------------------------------------------- cards */
export interface CardField {
  label: string;
  value: string;
  strong?: boolean;
}

export function patientCard(inv: Invoice): CardField[] {
  const p = inv.patient;
  return [
    { label: "Patient", value: fullName(p), strong: true },
    { label: "Age / Sex", value: `${p.age} ${p.ageUnit ?? "Year(s)"} / ${p.sex}` },
    { label: "Patient ID", value: p.patientId ?? "-" },
    { label: "Phone", value: p.phone ?? "-" },
    { label: "Ref. Doctor", value: formatDoctor(p.refDoctor) },
  ];
}

export function invoiceCard(inv: Invoice, t: InvoiceTotals): CardField[] {
  const modes = [...new Set((inv.payments ?? []).map((p) => p.mode))].join(", ");
  return [
    { label: "Invoice No", value: inv.invoiceNo, strong: true },
    { label: "Date", value: formatDate(inv.date) },
    { label: "Sample ID", value: inv.patient.sampleId ?? "-" },
    { label: "Payment", value: modes || "-" },
    { label: "Status", value: t.status },
  ];
}

/** UPI "scan to pay" when the lab has a UPI ID and money is due, otherwise a verification summary. */
export function invoiceQr(inv: Invoice, t: InvoiceTotals, lab: LabProfile): { value: string; label: string } {
  if (lab.upiId && t.due > 0) {
    const q = new URLSearchParams({ pa: lab.upiId, pn: lab.name, am: t.due.toFixed(2), cu: "INR", tn: `Invoice ${inv.invoiceNo}` });
    return { value: `upi://pay?${q.toString()}`, label: `Scan to pay ${CURRENCY} ${money(t.due)}` };
  }
  return {
    value: [
      lab.name,
      `Invoice: ${inv.invoiceNo}`,
      `Date: ${formatDate(inv.date)}`,
      `Patient: ${fullName(inv.patient)}${inv.patient.patientId ? ` (${inv.patient.patientId})` : ""}`,
      `Total: ${CURRENCY} ${money(t.total)}`,
      `Paid: ${CURRENCY} ${money(t.paid)}`,
      `Due: ${CURRENCY} ${money(t.due)}`,
    ].join("\n"),
    label: "Scan to verify",
  };
}

/* -------------------------------------------------------------- notes block */
export function noteLines(inv: Invoice, lab: LabProfile): string[] {
  return [...(inv.notes ?? []), ...(lab.invoiceTerms ?? [])];
}

export const wordsOf = (t: InvoiceTotals) => amountInWords(t.total);

/** Height of the totals block (pt): the taller of the right panel and the left panel. */
export function totalsHeight(inv: Invoice, t: InvoiceTotals, lab: LabProfile): number {
  const right = totalLines(inv, t).reduce((a, l) => a + (l.kind === "grand" ? R.grand : R.totalsRow), 0);
  const pays = Math.max(1, inv.payments?.length ?? 0);
  const notes = noteLines(inv, lab);
  const left = R.wordsBox + R.blockGap + R.payHeader + pays * R.payRow + (notes.length ? R.blockGap + R.noteTitle + notes.length * R.noteLine : 0);
  return R.totalsGap + Math.max(right, left);
}

export const TOTALS_LEFT_W = INV_W - INV_TOTALS.rightW - INV_TOTALS.gap;

/* ------------------------------------------------------------------- pages */
export interface InvPage {
  rows: InvRow[];
  /** totals block printed on this page */
  totals: boolean;
  continued: boolean;
}

export const INV_CAPACITY = (INV_BODY.bottom - INV_BODY.top) * 72;

/** Splits items over A4 pages; the totals block always sits on the last page, whole. */
export function invoicePages(inv: Invoice, lab: LabProfile): { pages: InvPage[]; totals: InvoiceTotals } {
  const t = computeInvoice(inv);
  const rows = invoiceRows(t);
  const totalsH = totalsHeight(inv, t, lab);
  const pages: InvPage[] = [];
  let cur: InvRow[] = [];
  let used = R.tableHeader;
  const flush = (totals: boolean) => {
    pages.push({ rows: cur, totals, continued: pages.length > 0 });
    cur = [];
    used = R.tableHeader;
  };
  rows.forEach((r, i) => {
    const h = rowHeight(r);
    // keep a group heading with its first item
    const need = r.kind === "group" && rows[i + 1] ? h + rowHeight(rows[i + 1]) : h;
    if (cur.length && used + need > INV_CAPACITY) flush(false);
    cur.push(r);
    used += h;
  });
  if (used + totalsH > INV_CAPACITY && cur.length) {
    flush(false);
  }
  pages.push({ rows: cur, totals: true, continued: pages.length > 0 });
  return { pages, totals: t };
}
