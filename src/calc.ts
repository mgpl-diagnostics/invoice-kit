// Invoice arithmetic. Everything is done in integer paise so totals never drift by a paisa.
import type { Invoice, InvoiceItem, PaymentStatus } from "./types";

const P = (rupees: number) => Math.round(rupees * 100);
const R = (paise: number) => paise / 100;

export interface ComputedLine {
  item: InvoiceItem;
  index: number;
  qty: number;
  /** qty × rate */
  gross: number;
  lineDiscount: number;
  /** share of the bill-level discount */
  billDiscount: number;
  /** gross − discounts */
  taxable: number;
  tax: number;
  /** taxable + tax */
  amount: number;
}

export interface InvoiceTotals {
  lines: ComputedLine[];
  /** Σ qty × rate */
  subtotal: number;
  lineDiscount: number;
  billDiscount: number;
  taxable: number;
  tax: number;
  /** tax grouped by rate, e.g. [{ rate: 12, taxable: 100, tax: 12 }] */
  taxByRate: { rate: number; taxable: number; tax: number }[];
  roundOff: number;
  total: number;
  paid: number;
  /** total − paid, never negative */
  due: number;
  /** paid − total when overpaid (refund / change) */
  excess: number;
  status: PaymentStatus;
  hasTax: boolean;
  hasDiscount: boolean;
}

export function computeInvoice(inv: Invoice): InvoiceTotals {
  // 1. line gross and line discount
  const base = inv.items.map((item, index) => {
    const qty = item.qty ?? 1;
    const gross = Math.round(qty * P(item.rate));
    const disc =
      item.discountPercent != null ? Math.round((gross * item.discountPercent) / 100) : Math.min(gross, P(item.discountAmount ?? 0));
    return { item, index, qty, gross, lineDiscount: disc, afterLine: gross - disc };
  });

  // 2. bill discount, shared in proportion to each line's value (largest-remainder so it adds up exactly)
  const pool = base.reduce((a, l) => a + l.afterLine, 0);
  const wanted = inv.discount?.percent != null ? Math.round((pool * inv.discount.percent) / 100) : P(inv.discount?.amount ?? 0);
  const billTotal = Math.min(pool, Math.max(0, wanted));
  const shares = base.map((l) => (pool ? (billTotal * l.afterLine) / pool : 0));
  const floors = shares.map(Math.floor);
  let left = billTotal - floors.reduce((a, b) => a + b, 0);
  shares
    .map((s, i) => ({ i, frac: s - Math.floor(s) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => {
      if (left > 0) {
        floors[i]++;
        left--;
      }
    });

  // 3. tax on what is left
  const lines = base.map((l, i) => {
    const taxable = l.afterLine - floors[i];
    const tax = Math.round((taxable * (l.item.taxPercent ?? 0)) / 100);
    return { ...l, billDiscount: floors[i], taxable, tax, amount: taxable + tax };
  });

  const sum = (f: (l: (typeof lines)[number]) => number) => lines.reduce((a, l) => a + f(l), 0);
  const exact = sum((l) => l.amount);
  const total = inv.roundOff === false ? exact : Math.round(exact / 100) * 100;
  const paid = (inv.payments ?? []).reduce((a, p) => a + P(p.amount), 0);

  const byRate = new Map<number, { taxable: number; tax: number }>();
  for (const l of lines) {
    const rate = l.item.taxPercent ?? 0;
    if (!rate) continue;
    const e = byRate.get(rate) ?? { taxable: 0, tax: 0 };
    e.taxable += l.taxable;
    e.tax += l.tax;
    byRate.set(rate, e);
  }

  const status: PaymentStatus = paid >= total ? "PAID" : paid > 0 ? "PARTIALLY PAID" : "DUE";
  return {
    lines: lines.map((l) => ({
      item: l.item,
      index: l.index,
      qty: l.qty,
      gross: R(l.gross),
      lineDiscount: R(l.lineDiscount),
      billDiscount: R(l.billDiscount),
      taxable: R(l.taxable),
      tax: R(l.tax),
      amount: R(l.amount),
    })),
    subtotal: R(sum((l) => l.gross)),
    lineDiscount: R(sum((l) => l.lineDiscount)),
    billDiscount: R(billTotal),
    taxable: R(sum((l) => l.taxable)),
    tax: R(sum((l) => l.tax)),
    taxByRate: [...byRate.entries()].sort((a, b) => a[0] - b[0]).map(([rate, e]) => ({ rate, taxable: R(e.taxable), tax: R(e.tax) })),
    roundOff: R(total - exact),
    total: R(total),
    paid: R(paid),
    due: R(Math.max(0, total - paid)),
    excess: R(Math.max(0, paid - total)),
    status,
    hasTax: lines.some((l) => (l.item.taxPercent ?? 0) > 0),
    hasDiscount: sum((l) => l.lineDiscount) > 0 || billTotal > 0,
  };
}

/* --------------------------------------------------------------- formatting */

const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** 123456.5 → "1,23,456.50" (Indian digit grouping) */
export const money = (n: number) => inr.format(n);
export const CURRENCY = "Rs.";

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function upTo99(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}
function upTo999(n: number) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? upTo99(r) : ""].filter(Boolean).join(" ");
}

/** Indian numbering: 123456.78 → "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Seventy Eight Paise Only" */
export function amountInWords(amount: number): string {
  const paise = Math.round(Math.abs(amount) * 100);
  let r = Math.floor(paise / 100);
  const p = paise % 100;
  if (r === 0 && p === 0) return "Rupees Zero Only";
  const parts: string[] = [];
  const crore = Math.floor(r / 1e7);
  r %= 1e7;
  const lakh = Math.floor(r / 1e5);
  r %= 1e5;
  const thousand = Math.floor(r / 1000);
  r %= 1000;
  if (crore) parts.push(`${crore >= 100 ? upTo999(crore) : upTo99(crore)} Crore`);
  if (lakh) parts.push(`${upTo99(lakh)} Lakh`);
  if (thousand) parts.push(`${upTo99(thousand)} Thousand`);
  if (r) parts.push(upTo999(r));
  const rupees = parts.length ? `Rupees ${parts.join(" ")}` : "Rupees Zero";
  return `${rupees}${p ? ` and ${upTo99(p)} Paise` : ""} Only`;
}
