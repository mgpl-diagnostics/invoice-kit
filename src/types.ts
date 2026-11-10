import type { Patient } from "@mgpl-diagnostics/report-kit";

export type ItemCategory = "test" | "profile" | "medicine" | "consumable" | "service" | "other";

/** One billed line. Money is in rupees (decimals allowed); maths is done in paise. */
export interface InvoiceItem {
  /** Price-list code, e.g. "cbc", "home-collection" */
  code?: string;
  name: string;
  category: ItemCategory;
  /** Default 1 */
  qty?: number;
  /** Unit price, rupees */
  rate: number;
  /** Line discount as a percentage of qty × rate … */
  discountPercent?: number;
  /** … or as a flat amount (rupees). Percent wins if both are set. */
  discountAmount?: number;
  /** GST %, e.g. 12 for consumables. Lab tests are usually exempt (0). */
  taxPercent?: number;
  /** HSN / SAC code, printed under the item */
  hsn?: string;
  /** Small note under the item, e.g. batch / expiry for medicines */
  note?: string;
}

export interface Payment {
  /** "Cash" | "UPI" | "Card" | "Online" | "Cheque" | … */
  mode: string;
  /** always positive; a refund is `kind: "refund"`, not a negative amount */
  amount: number;
  /** money received (default) or money given back */
  kind?: "payment" | "refund";
  date?: Date | string;
  /** Transaction / UTR / cheque number */
  reference?: string;
}

export interface Invoice {
  invoiceNo: string;
  /** Defaults to today */
  date?: Date | string;
  patient: Patient;
  items: InvoiceItem[];
  /** Bill-level discount, applied before tax and shared across the lines in proportion */
  discount?: { percent?: number; amount?: number; reason?: string };
  payments?: Payment[];
  /** Printed under the payment details */
  notes?: string[];
  /** Round the grand total to the nearest rupee (default true) */
  roundOff?: boolean;
  /** Heading, default "INVOICE" */
  title?: string;
  /** a cancelled invoice prints CANCELLED and never asks for payment */
  cancelled?: boolean;
}

export type PaymentStatus = "PAID" | "PARTIALLY PAID" | "DUE" | "REFUNDED" | "CANCELLED";
