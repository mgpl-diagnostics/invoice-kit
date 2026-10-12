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
  barcode: { w: 1.45, h: 0.32 },
  qr: { s: 0.56, labelSize: 6 },
};
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

/** Totals panel on the right, notes/payments panel on the left */
export const INV_TOTALS = { rightW: 2.75, gap: 0.25 };
export const INV_CELL_PAD = 0.06;

/** Payment table columns (inches, sum = left totals panel width 3.97) */
export const INV_PAY_COLS = { date: 1.0, mode: 0.8, ref: 1.17, amount: 1.0 };
