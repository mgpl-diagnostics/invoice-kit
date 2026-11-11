/**
 * Invoice geometry (inches from the A4 page's top-left; font sizes in pt). The letterhead
 * (sidebar, header, footer) comes from @mgpl-diagnostics/report-kit, so an invoice printed with the
 * "non-header" variant lands inside the same pre-printed paper as the reports.
 */
import { SIDEBAR_LAYOUT } from "@mgpl-diagnostics/report-kit";

const { SB_CONTENT, SB_BODY, SB_SIGN, SB_LEGAL, SB_COLORS, SB_FONT, SB_PAGE } = SIDEBAR_LAYOUT;

export const INV_PAGE = SB_PAGE;
export const INV_FONT = SB_FONT;
export const INV_X = SB_CONTENT.x;
export const INV_W = SB_CONTENT.w;
export const INV_RIGHT = SB_CONTENT.x + SB_CONTENT.w;

export const INV_COLORS = {
  ...SB_COLORS,
  card: "#F6F8FB",
  paid: "#12B76A",
  partial: "#F79009",
  due: "#D92D20",
};

/** Title row: "INVOICE" + status pill */
export const INV_TITLE = { y: 1.56, h: 0.36, size: 16, subSize: 7.5 };
/** Two info cards + codes */
export const INV_CARDS = {
  y: 2.0,
  /** must hold 5 rows × lineH + 2 × pad — react-pdf silently drops text that overflows a fixed height */
  h: 1.04,
  patient: { x: INV_X, w: 2.95 },
  invoice: { x: INV_X + 3.05, w: 2.35 },
  pad: 0.1,
  labelSize: 6.5,
  valueSize: 8.6,
  lineH: 0.165,
  /** label column; "INVOICE NO" / "SAMPLE ID" at 6.5pt bold fit in 0.66in */
  labelW: 0.66,
  /** space between label and value, pt */
  gap: 6,
  /** smallest size a long value shrinks to (the barcode repeats the invoice number) */
  minValueSize: 6.5,
  barcode: { w: 1.45, h: 0.32 },
  qr: { s: 0.56, labelSize: 6 },
};
/**
 * Width of a card's value column, in pt: the card minus padding, the label column and the gap.
 */
export function cardValueWidth(cardW: number): number {
  return (cardW - 2 * INV_CARDS.pad - INV_CARDS.labelW) * 72 - INV_CARDS.gap;
}

/**
 * Font size (pt) at which `text` fits `widthPt` on one line: the card value size, or smaller for long
 * values (an invoice number like "MGPL/ARG01/2026-27/000001", a long patient name), never below
 * minValueSize. Widths are conservative per-character estimates (em) for the bold sans of the cards, so
 * the PDF and the HTML preview pick the same size without measuring fonts, and the text never paints
 * past its card.
 */
export function fitValueSize(text: string, widthPt: number, strong = false): number {
  const em = [...text].reduce((w, ch) => w + charEm(ch), 0) * (strong ? 1.06 : 1);
  if (em <= 0) return INV_CARDS.valueSize;
  return Math.max(INV_CARDS.minValueSize, Math.min(INV_CARDS.valueSize, Math.floor((widthPt / em) * 10) / 10));
}

function charEm(ch: string): number {
  if (/[0-9]/.test(ch)) return 0.6;
  if (/[MWmw@]/.test(ch)) return 0.92;
  if (/[A-Z]/.test(ch)) return 0.72;
  if (/[il.,:;'|!]/.test(ch)) return 0.3;
  if (/[a-z]/.test(ch)) return 0.58;
  if (/\s/.test(ch)) return 0.28;
  if (/[\/\-()]/.test(ch)) return 0.38;
  return 0.65;
}

/** Items + totals area */
export const INV_BODY = { top: 3.14, bottom: SB_BODY.bottom };
export const INV_SIGN = SB_SIGN;
export const INV_LEGAL = SB_LEGAL;

/** Row heights (pt) — both renderers use exactly these. */
export const INV_ROWS = {
  fontSize: 8.6,
  tableHeader: 18,
  group: 17,
  item: 18,
  /** extra when an item has a code / HSN / note line */
  itemSub: 8.5,
  totalsGap: 12,
  totalsRow: 15,
  grand: 24,
  wordsBox: 40,
  payHeader: 14,
  payRow: 14,
  noteTitle: 14,
  noteLine: 10,
  blockGap: 8,
};

/**
 * "Scan to pay" UPI QR on the last page, in the signature band left of the signatory (below the body, so
 * it never changes the page breaks), when money is due and the lab has a UPI ID: error correction H with
 * the lab's mark in a blank centre. Inches; caption rows in pt, beside the code.
 */
export const INV_PAYQR = {
  x: SB_CONTENT.x, y: 9.62, s: 0.9, hole: 0.26,
  text: { x: SB_CONTENT.x + 1.0, w: 2.1, labelRow: 12, labelSize: 9, idRow: 11, idSize: 7, noteRow: 10, noteSize: 6.5 },
};

/** Totals panel on the right, notes/payments panel on the left */
export const INV_TOTALS = { rightW: 2.75, gap: 0.25 };
export const INV_CELL_PAD = 0.06;

/** Payment table columns (inches, sum = left totals panel width 3.97) */
export const INV_PAY_COLS = { date: 1.0, mode: 0.8, ref: 1.17, amount: 1.0 };
