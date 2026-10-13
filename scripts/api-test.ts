// End-to-end test of the client/backend split:
//   1. createMgplApi() called directly with Fetch Requests (every route + error cases)
//   2. @mgpl-diagnostics/client SDK against that handler
//   3. the Fastify plugin (app.inject), incl. that the app's own JSON routes still work
//   4. a real node:http server via toNodeHandler + the client over the network
//   npm run test:api
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import Fastify from "fastify";
import { createMgplClient, MgplApiError } from "@mgpl-diagnostics/client";
import { toNodeHandler } from "@mgpl-diagnostics/report-kit";
import { createMgplApi } from "../src";
import { mgplFastify } from "../src/fastify";

const problems: string[] = [];
let passed = 0;
const check = (name: string, ok: unknown, detail = "") => {
  if (ok) passed++;
  else problems.push(`${name}${detail ? `: ${detail}` : ""}`);
};
const BASE = "/api/mgpl";
const ORIGIN = "http://lab.test";
const api = createMgplApi({ basePath: BASE, samples: true, cors: "*" });
const call = (path: string, init?: RequestInit) => api(new Request(ORIGIN + BASE + path, init));
const post = (path: string, body: unknown) => call(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const isPdf = async (r: Response) => new TextDecoder().decode((await r.clone().arrayBuffer()).slice(0, 5)) === "%PDF-";

const patient = { title: "Mr", name: "Api Test", age: 40, sex: "Male", patientId: "MGPL9001" };
const invoice = {
  invoiceNo: "API/0001",
  patient,
  items: ["cbc", { code: "syringe-5ml", qty: 2 }, { name: "Custom", category: "other", rate: 99.5 }],
  discount: { percent: 10 },
  payments: [{ mode: "UPI", amount: 100, reference: "UTR1" }],
};

async function direct() {
  // reads
  let r = await call("/health");
  check("GET /health", r.status === 200 && (await r.json()).ok === true);
  r = await call("/templates");
  const cat = await r.json();
  check("GET /templates", r.status === 200 && cat.templates.length >= 31 && cat.profiles.length >= 7 && cat.templates.find((t: { id: string }) => t.id === "cbc")?.fields.length > 10);
  r = await call("/samples");
  check("GET /samples", r.status === 200 && (await r.json()).length >= 39);
  r = await call("/price-list");
  check("GET /price-list", r.status === 200 && (await r.json()).some((p: { code: string }) => p.code === "home-collection"));
  r = await call("/invoice-samples");
  check("GET /invoice-samples", r.status === 200 && (await r.json()).length >= 5);

  // reports
  r = await post("/report", { patient, tests: [{ template: "kft", results: { urea: "52", creatinine: "1.6" } }], format: "pdf" });
  check("POST /report pdf", r.status === 200 && r.headers.get("content-type") === "application/pdf" && (await isPdf(r)));
  r = await post("/report", { patient, profile: { id: "liver-kidney-profile", results: { lft: { bilTotal: "0.8" } } }, design: "classic", variant: "non-header", format: "pdf" });
  check("POST /report profile classic", r.status === 200 && (await isPdf(r)));
  r = await post("/report", { sample: "cbc", format: "html" });
  const html = await r.text();
  check("POST /report html", r.status === 200 && html.includes("<!doctype html>") && html.includes("Haemoglobin"));
  // every asset the HTML references must be served by the backend
  const assetUrls = [...new Set([...html.matchAll(/(?:src="|url\(")([^"]+\/assets\/[^"]+)"/g)].map((m) => m[1]))];
  check("HTML references backend assets", assetUrls.length >= 5, `${assetUrls.length} urls`);
  for (const u of assetUrls) {
    const a = await api(new Request(u));
    check(`asset ${u.split("/assets/")[1]}`, a.status === 200 && (a.headers.get("cache-control") ?? "").includes("immutable"));
  }
  r = await post("/report", { patient, tests: [{ template: "cbc", results: { hb: "10" } }], format: "pdf", download: true, fileName: "x y.pdf" });
  check("download disposition", (r.headers.get("content-disposition") ?? "").startsWith('attachment; filename="x_y.pdf"'));

  // letterhead
  r = await call("/letterhead?format=pdf");
  check("GET /letterhead pdf", r.status === 200 && (await isPdf(r)));
  r = await call("/letterhead?format=html");
  check("GET /letterhead html", r.status === 200 && (await r.text()).includes("sb-side"));

  // invoices
  r = await post("/invoice", { invoice, format: "json" });
  const t = await r.json();
  // 300 + 2×10×1.12 GST + 99.50 → 10% bill discount before tax → check the server maths shape
  check("POST /invoice json", r.status === 200 && t.status === "PARTIALLY PAID" && t.paid === 100 && t.lines.length === 3 && t.amountInWords.startsWith("Rupees"));
  check("invoice discount shares add up", Math.round(t.lines.reduce((a: number, l: { billDiscount: number }) => a + l.billDiscount, 0) * 100) === Math.round(t.billDiscount * 100));
  r = await post("/invoice", { invoice, format: "pdf" });
  check("POST /invoice pdf", r.status === 200 && (await isPdf(r)));
  r = await post("/invoice", { sample: "due-gst", format: "html", variant: "non-header" });
  const ih = await r.text();
  check("POST /invoice html", r.status === 200 && ih.includes("INVOICE") && !ih.includes('class="sb-side"'));

  // errors
  const expectStatus = async (name: string, res: Promise<Response>, status: number) => {
    const x = await res;
    const body = await x.json().catch(() => ({}));
    check(name, x.status === status && typeof body.error === "string", `got ${x.status}`);
  };
  await expectStatus("bad JSON → 400", call("/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{oops" }), 400);
  await expectStatus("missing patient → 400", post("/report", { tests: [] }), 400);
  await expectStatus("unknown template → 400", post("/report", { patient, tests: [{ template: "nope", results: {} }] }), 400);
  await expectStatus("unknown price code → 400", post("/invoice", { invoice: { ...invoice, items: ["no-such-code"] } }), 400);
  await expectStatus("negative rate → 400", post("/invoice", { invoice: { ...invoice, items: [{ name: "x", category: "other", rate: -5 }] } }), 400);
  await expectStatus("GET /report → 405", call("/report"), 405);
  await expectStatus("unknown route → 404", call("/nope"), 404);
  await expectStatus("path traversal → 404", call("/assets/report-fonts/..%2F..%2Fpackage.json"), 404);
  await expectStatus("body too large → 413", post("/report", { patient, pad: "x".repeat(1_100_000) }), 413);
  const noSamples = createMgplApi({ basePath: BASE });
  r = await noSamples(new Request(ORIGIN + BASE + "/report", { method: "POST", body: JSON.stringify({ sample: "cbc" }) }));
  check("samples disabled by default → 400", r.status === 400);

  // CORS
  r = await call("/report", { method: "OPTIONS" });
  check("OPTIONS preflight", r.status === 204 && r.headers.get("access-control-allow-origin") === "*" && (r.headers.get("access-control-allow-methods") ?? "").includes("POST"));
  r = await call("/templates");
  check("CORS on responses", r.headers.get("access-control-allow-origin") === "*");
  console.log(`direct handler: ${passed} checks`);
}

async function viaClient(label: string, client: ReturnType<typeof createMgplClient>) {
  const before = passed;
  const cat = await client.reports.templates();
  check(`${label}: templates`, cat.templates.length >= 31);
  const pdf = await client.reports.pdf({ patient, tests: [{ template: "cbc", results: { hb: "10.8" } }] });
  check(`${label}: report pdf`, pdf.type === "application/pdf" && pdf.size > 10_000);
  const html = await client.reports.html({ sample: "lipid", variant: "non-header" });
  check(`${label}: report html`, html.includes("Lipid"));
  const totals = await client.invoices.totals(invoice as never);
  check(`${label}: invoice totals`, totals.total > 0 && totals.status === "PARTIALLY PAID");
  const ipdf = await client.invoices.pdf({ invoice: invoice as never });
  check(`${label}: invoice pdf`, ipdf.size > 10_000);
  const prices = await client.invoices.priceList();
  check(`${label}: price list`, prices.length > 30);
  try {
    await client.reports.pdf({ tests: [] });
    check(`${label}: error surfaces`, false, "no error thrown");
  } catch (e) {
    check(`${label}: error surfaces as MgplApiError`, e instanceof MgplApiError && e.status === 400 && /patient/.test(e.message));
  }
  console.log(`${label}: ${passed - before} checks`);
}

async function fastify() {
  const before = passed;
  const app = Fastify();
  // the app's own JSON route must keep normal JSON parsing (plugin is encapsulated)
  app.post("/echo", async (req) => ({ got: (req.body as { a: number }).a }));
  await app.register(mgplFastify, { prefix: BASE, samples: true });
  await app.ready();
  let r = await app.inject({ method: "GET", url: `${BASE}/templates` });
  check("fastify GET /templates", r.statusCode === 200 && JSON.parse(r.body).templates.length >= 31);
  r = await app.inject({ method: "POST", url: `${BASE}/report`, payload: { patient, tests: [{ template: "cbc", results: { hb: "9" } }] } });
  check("fastify POST /report pdf", r.statusCode === 200 && r.headers["content-type"] === "application/pdf" && r.rawPayload.subarray(0, 5).toString() === "%PDF-");
  r = await app.inject({ method: "POST", url: `${BASE}/invoice`, payload: { invoice, format: "json" } });
  check("fastify POST /invoice json", r.statusCode === 200 && JSON.parse(r.body).lines.length === 3);
  r = await app.inject({ method: "GET", url: `${BASE}/assets/report-fonts/manrope-400.woff` });
  check("fastify asset", r.statusCode === 200 && r.headers["content-type"] === "font/woff");
  r = await app.inject({ method: "POST", url: `${BASE}/report`, payload: { tests: [] } });
  check("fastify 400", r.statusCode === 400);
  r = await app.inject({ method: "POST", url: "/echo", payload: { a: 7 } });
  check("fastify app routes unaffected", r.statusCode === 200 && JSON.parse(r.body).got === 7);
  await app.close();
  console.log(`fastify plugin: ${passed - before} checks`);
}

async function nodeHttp() {
  const server = createServer(toNodeHandler(api));
  await new Promise<void>((res) => server.listen(0, "127.0.0.1", res));
  const { port } = server.address() as AddressInfo;
  try {
    await viaClient("node:http + client over network", createMgplClient({ baseUrl: `http://127.0.0.1:${port}${BASE}` }));
  } finally {
    server.close();
  }
}

async function main() {
  const t0 = Date.now();
  await direct();
  await viaClient("client → handler", createMgplClient({ baseUrl: ORIGIN + BASE, fetch: (input, init) => api(new Request(input, init)) }));
  await fastify();
  await nodeHttp();
  console.log(`\n${passed} checks passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log("  - " + p);
    process.exit(1);
  }
  console.log("All API checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
