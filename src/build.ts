import type { Patient } from "@mgpl-diagnostics/report-kit";
import { PRICE_LIST, type PriceEntry } from "./price-list";
import type { Invoice, InvoiceItem, Payment } from "./types";

/** A line given by price-list code (with optional overrides) or written out in full. */
export type ItemInput = string | (Partial<InvoiceItem> & { code: string }) | InvoiceItem;

export interface BuildInvoiceInput {
  invoiceNo: string;
  date?: Date | string;
  patient: Patient;
  items: ItemInput[];
  discount?: Invoice["discount"];
  payments?: Payment[];
  notes?: string[];
  roundOff?: boolean;
  title?: string;
  /** Use a different price list (defaults to PRICE_LIST) */
  priceList?: Record<string, PriceEntry>;
}

/**
 *   buildInvoice({
 *     invoiceNo: "INV-2026-0042", patient,
 *     items: ["cbc", "lft", { code: "home-collection" }, { code: "syringe-5ml", qty: 2 }],
 *     discount: { percent: 10, reason: "Senior citizen" },
 *     payments: [{ mode: "UPI", amount: 500, reference: "UTR 4521…" }],
 *   })
 */
export function buildInvoice(input: BuildInvoiceInput): Invoice {
  const list = input.priceList ?? PRICE_LIST;
  const items = input.items.map((it): InvoiceItem => {
    if (typeof it === "string") it = { code: it };
    if ("name" in it && "rate" in it && "category" in it && it.name && it.rate != null && it.category) return it as InvoiceItem;
    const code = (it as { code: string }).code;
    const entry = list[code];
    if (!entry) throw new Error(`Unknown price-list code "${code}"`);
    return { ...entry, ...it, code } as InvoiceItem;
  });
  return {
    invoiceNo: input.invoiceNo,
    date: input.date,
    patient: input.patient,
    items,
    discount: input.discount,
    payments: input.payments,
    notes: input.notes,
    roundOff: input.roundOff,
    title: input.title,
  };
}

/** Bill the tests on a report: template / profile ids → invoice lines. */
export const itemsForTests = (ids: string[]): ItemInput[] => ids.map((code) => ({ code }));
