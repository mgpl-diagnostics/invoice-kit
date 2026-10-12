import type { Patient } from "@mgpl-diagnostics/report-kit";
import { TEMPLATES } from "@mgpl-diagnostics/report-kit";
import { buildInvoice } from "./build";
import type { Invoice } from "./types";

/** Demo invoices (fictional patients, sample prices) covering the main billing cases. */
export interface InvoiceSample {
  id: string;
  label: string;
  invoice: Invoice;
}

const kavita: Patient = { title: "Mrs", name: "Kavita Sharma", age: 32, sex: "Female", patientId: "MGPL1025", sampleId: "S2610120398", phone: "+91-98260 12345", refDoctor: "Self" };
const ramesh: Patient = { title: "Mr", name: "Ramesh Kumar Verma", age: 67, sex: "Male", patientId: "MGPL1024", sampleId: "S2610121024", phone: "+91-94252 67890", refDoctor: "A. K. Sharma" };
const aryan: Patient = { title: "Master", name: "Aryan Patel", age: 9, sex: "Male", patientId: "MGPL1031", sampleId: "S2610121031", refDoctor: "P. Nair" };

export const INVOICE_SAMPLES: InvoiceSample[] = [
  {
    id: "paid",
    label: "Paid in cash",
    invoice: buildInvoice({
      invoiceNo: "MGPL/2026-27/0398",
      date: "12-10-2026",
      patient: kavita,
      items: ["cbc", "blood-sugar", "urine"],
      payments: [{ mode: "Cash", amount: 460, date: "12-10-2026" }],
    }),
  },
  {
    id: "partial-discount",
    label: "Package + home collection, 10% discount, part paid (UPI)",
    invoice: buildInvoice({
      invoiceNo: "MGPL/2026-27/0399",
      date: "12-10-2026",
      patient: ramesh,
      items: ["full-body-checkup", "home-collection", { code: "urgent-report", discountPercent: 100, note: "Waived" }],
      discount: { percent: 10, reason: "Senior citizen" },
      payments: [{ mode: "UPI", amount: 2000, reference: "UTR 428615903317", date: "12-10-2026" }],
    }),
  },
  {
    id: "due-gst",
    label: "Tests + consumables & medicines with GST, unpaid",
    invoice: buildInvoice({
      invoiceNo: "MGPL/2026-27/0400",
      date: "12-10-2026",
      patient: aryan,
      items: [
        "dengue",
        "widal",
        "malaria-antigen",
        { code: "syringe-5ml", qty: 2 },
        { code: "vacutainer-edta", qty: 2 },
        { code: "ors-sachet", qty: 4, note: "Batch ORS2410 • Exp 08/2027" },
        { code: "paracetamol-500", qty: 1, note: "Batch PC5521 • Exp 03/2028" },
      ],
      notes: ["Collect reports after 6:00 PM."],
    }),
  },
  {
    id: "multipage-split",
    label: "Long bill (all tests), split payment Cash + Card",
    invoice: buildInvoice({
      invoiceNo: "MGPL/2026-27/0401",
      date: "12-10-2026",
      patient: ramesh,
      items: [...Object.keys(TEMPLATES), "home-collection", { code: "syringe-5ml", qty: 3 }],
      discount: { amount: 1000, reason: "Camp offer" },
      payments: [
        { mode: "Cash", amount: 5000, date: "12-10-2026" },
        { mode: "Card", amount: 6000, reference: "Auth 771204", date: "12-10-2026" },
      ],
    }),
  },
  {
    id: "overpaid",
    label: "Overpaid (refund due)",
    invoice: buildInvoice({
      invoiceNo: "MGPL/2026-27/0402",
      date: "12-10-2026",
      patient: kavita,
      items: ["thyroid", "vitamin-d"],
      payments: [{ mode: "Cash", amount: 2000, date: "12-10-2026" }],
    }),
  },
];
