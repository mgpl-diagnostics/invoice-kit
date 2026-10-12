import { sidebarCss } from "@mgpl-diagnostics/report-kit";
import { INV_BODY, INV_CARDS as K, INV_CELL_PAD, INV_COLORS as C, INV_LEGAL, INV_RIGHT, INV_ROWS as R, INV_SIGN, INV_TITLE, INV_TOTALS, INV_W, INV_X } from "./layout";

const i = (n: number) => `${n}in`;

/** Invoice stylesheet: the report-kit Navy Sidebar CSS (fonts, page, letterhead) + invoice parts. */
export function invoiceCss(fontBase = "/report-fonts"): string {
  return (
    sidebarCss(fontBase) +
    `
/* ----- invoice ----- */
.iv-title { position:absolute; left:${i(INV_X)}; width:${i(INV_W)}; top:${i(INV_TITLE.y)}; height:${i(INV_TITLE.h)}; display:flex; align-items:center; justify-content:space-between; }
.iv-title h1 { font-size:${INV_TITLE.size}pt; font-weight:800; color:${C.navy}; letter-spacing:.08em; line-height:1; }
.iv-title small { display:block; font-size:${INV_TITLE.subSize}pt; color:${C.muted}; font-weight:500; letter-spacing:0; margin-top:3pt; }
.iv-status { color:#fff; font-weight:800; font-size:8pt; letter-spacing:.1em; padding:4pt 10pt; border-radius:999px; }
.iv-card { position:absolute; top:${i(K.y)}; height:${i(K.h)}; background:${C.card}; border-radius:8px; padding:${i(K.pad)}; }
.iv-field { display:flex; height:${i(K.lineH)}; align-items:center; gap:6pt; white-space:nowrap; }
.iv-field span { width:0.78in; flex:none; font-size:${K.labelSize}pt; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:${C.muted}; }
.iv-field b { font-size:${K.valueSize}pt; font-weight:600; overflow:hidden; text-overflow:ellipsis; }
.iv-field b.strong { font-weight:800; }
.iv-barcode { position:absolute; left:${i(INV_RIGHT - K.barcode.w)}; top:${i(K.y)}; width:${i(K.barcode.w)}; height:${i(K.barcode.h)}; }
.iv-qr { position:absolute; left:${i(INV_RIGHT - K.barcode.w / 2 - K.qr.s / 2)}; top:${i(K.y + K.barcode.h + 0.04)}; width:${i(K.qr.s)}; height:${i(K.qr.s)}; }
.iv-barcode svg, .iv-qr svg { display:block; width:100%; height:100%; }
.iv-qr-label { position:absolute; left:${i(INV_RIGHT - K.barcode.w - 0.1)}; width:${i(K.barcode.w + 0.1)}; top:${i(K.y + K.barcode.h + 0.06 + K.qr.s)}; text-align:center; font-size:${K.qr.labelSize}pt; color:${C.muted}; white-space:nowrap; }

.iv-body { position:absolute; left:${i(INV_X)}; width:${i(INV_W)}; top:${i(INV_BODY.top)}; }
.iv-row { display:flex; align-items:center; border-bottom:0.5pt solid ${C.line}; }
.iv-th { height:${R.tableHeader}pt; background:${C.navy}; color:#fff; font-size:7pt; font-weight:700; letter-spacing:.06em; text-transform:uppercase; border-bottom:none; border-radius:4px 4px 0 0; }
.iv-cell { flex:none; height:100%; display:flex; flex-direction:column; justify-content:center; padding:0 ${i(INV_CELL_PAD)}; white-space:nowrap; }
.iv-cell.left { align-items:flex-start; } .iv-cell.center { align-items:center; } .iv-cell.right { align-items:flex-end; }
.iv-group { height:${R.group}pt; display:flex; align-items:flex-end; padding:0 ${i(INV_CELL_PAD)} 2pt; font-weight:800; color:${C.navy}; font-size:7.5pt; letter-spacing:.06em; text-transform:uppercase; border-bottom:0.5pt solid ${C.line}; }
.iv-sub { font-size:6.6pt; color:${C.muted}; }
.iv-disc { color:${C.saffron}; }

.iv-totals { display:flex; justify-content:space-between; margin-top:${R.totalsGap}pt; }
.iv-left { width:${i(INV_W - INV_TOTALS.rightW - INV_TOTALS.gap)}; }
.iv-right { width:${i(INV_TOTALS.rightW)}; }
.iv-tl { height:${R.totalsRow}pt; display:flex; justify-content:space-between; align-items:center; padding:0 ${i(INV_CELL_PAD)}; white-space:nowrap; }
.iv-tl.muted { color:${C.muted}; }
.iv-tl.grand { height:${R.grand}pt; background:${C.navy}; color:#fff; font-weight:800; font-size:10pt; border-radius:4px; margin:2pt 0; height:${R.grand - 4}pt; }
.iv-tl.paid { color:${C.paid}; font-weight:700; }
.iv-tl.due { font-weight:800; }
.iv-words { height:${R.wordsBox}pt; background:${C.card}; border-radius:6px; padding:4pt ${i(INV_CELL_PAD + 0.02)}; overflow:hidden; }
.iv-words span { display:block; font-size:6.5pt; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:${C.muted}; }
.iv-words b { display:block; font-size:8.6pt; font-weight:700; line-height:1.3; }
.iv-pays { margin-top:${R.blockGap}pt; }
.iv-pays .iv-row { height:${R.payRow}pt; }
.iv-pays .iv-ph { height:${R.payHeader}pt; font-size:6.5pt; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:${C.muted}; border-bottom:0.8pt solid ${C.navy}; }
.iv-notes { margin-top:${R.blockGap}pt; }
.iv-notes h4 { height:${R.noteTitle}pt; display:flex; align-items:center; font-size:6.5pt; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:${C.muted}; }
.iv-notes p { height:${R.noteLine}pt; font-size:7pt; color:${C.ink}; white-space:nowrap; }

.iv-signimg { left:${i(INV_SIGN.centerX - INV_SIGN.sign.w / 2)}; top:${i(INV_SIGN.sign.y)}; width:${i(INV_SIGN.sign.w)}; height:${i(INV_SIGN.sign.h)}; }
.iv-signname { position:absolute; left:${i(INV_SIGN.centerX - 1.3)}; width:${i(2.6)}; top:${i(INV_SIGN.nameY)}; text-align:center; }
.iv-signname b { display:block; font-size:${INV_SIGN.nameSize}pt; font-weight:800; }
.iv-signname span { display:block; font-size:${INV_SIGN.roleSize}pt; color:${C.muted}; }
.iv-legal { position:absolute; left:${i(INV_X)}; width:${i(INV_W)}; top:${i(INV_LEGAL.y)}; display:flex; justify-content:space-between; font-size:${INV_LEGAL.size}pt; color:${C.muted}; border-top:0.5pt solid ${C.line}; padding-top:3pt; }
`
  );
}
