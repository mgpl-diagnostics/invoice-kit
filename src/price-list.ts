import { PROFILES, TEMPLATES, type TemplateId } from "@mgpl-diagnostics/report-kit";
import type { ItemCategory } from "./types";

export interface PriceEntry {
  name: string;
  category: ItemCategory;
  /** rupees */
  rate: number;
  taxPercent?: number;
  hsn?: string;
}

/*
 * ⚠ SAMPLE PRICES — placeholders for the demo. Replace every rate (and any GST / HSN) with the
 * lab's real price list before billing patients.
 *
 * Test codes are the report-template ids, so a report's tests can be billed directly
 * (see itemsForTests). Pathology tests are generally GST-exempt; consumables/medicines may not be.
 */
const TEST_RATES: Record<TemplateId, number> = {
  cbc: 300, hb: 80, esr: 80, "blood-group": 100, mp: 150, "bt-ct": 100, "pt-inr": 350,
  "blood-sugar": 60, hba1c: 450, lft: 600, rft: 450, kft: 700, electrolytes: 400, lipid: 550,
  "iron-profile": 900, biochemistry: 150,
  thyroid: 500, "vitamin-d": 1200, "vitamin-b12": 900, psa: 700,
  dengue: 900, "hiv-hbsag-vdrl": 450, widal: 150, typhidot: 400, "malaria-antigen": 300, "crp-aso": 500, "ra-factor": 300,
  urine: 100, upt: 100, stool: 150, semen: 300,
};

const PROFILE_RATES: Record<keyof typeof PROFILES, number> = {
  "fever-profile": 1500,
  "diabetes-profile": 1800,
  "liver-kidney-profile": 1100,
  "anemia-profile": 1800,
  "antenatal-profile": 1600,
  "pre-operative-profile": 1700,
  "full-body-checkup": 3500,
};

export const PRICE_LIST: Record<string, PriceEntry> = {
  ...Object.fromEntries(
    (Object.keys(TEST_RATES) as TemplateId[]).map((id) => [id, { name: TEMPLATES[id].name, category: "test" as const, rate: TEST_RATES[id] }]),
  ),
  ...Object.fromEntries(
    Object.entries(PROFILE_RATES).map(([id, rate]) => [id, { name: PROFILES[id].name, category: "profile" as const, rate }]),
  ),
  // Services
  "home-collection": { name: "Home Sample Collection", category: "service", rate: 100 },
  "urgent-report": { name: "Urgent Report (same day)", category: "service", rate: 100 },
  "report-copy": { name: "Duplicate Report Copy", category: "service", rate: 50 },
  // Consumables (sample GST / HSN — verify before use)
  "syringe-5ml": { name: "Disposable Syringe 5 ml", category: "consumable", rate: 10, taxPercent: 12, hsn: "9018" },
  "vacutainer-edta": { name: "Vacutainer Tube (EDTA)", category: "consumable", rate: 15, taxPercent: 12, hsn: "3822" },
  "urine-container": { name: "Sterile Urine Container", category: "consumable", rate: 20, taxPercent: 12, hsn: "3923" },
  // Medicines (sample)
  "ors-sachet": { name: "ORS Sachet 21 g", category: "medicine", rate: 22, taxPercent: 5, hsn: "3004" },
  "paracetamol-500": { name: "Paracetamol 500 mg (strip of 10)", category: "medicine", rate: 18, taxPercent: 12, hsn: "3004" },
};
