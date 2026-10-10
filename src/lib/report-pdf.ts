import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import {
  groupTests,
  resolveInspectionTests,
  summarizeTests,
  TEST_RESULT_LABEL,
  type ResolvedInspectionTest,
  type TestResult,
} from "./inspection-tests.ts";
import type { InspectionReport, Verdict } from "./used.ts";
import { dh } from "./utils.ts";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 42;

const C = {
  navy: rgb(0.039, 0.094, 0.137),
  primary: rgb(0.027, 0.545, 0.82),
  ok: rgb(0.039, 0.561, 0.384),
  warn: rgb(0.718, 0.475, 0.031),
  danger: rgb(0.761, 0.231, 0.231),
  fg: rgb(0.051, 0.133, 0.208),
  muted: rgb(0.353, 0.439, 0.518),
  line: rgb(0.831, 0.878, 0.922),
  surface: rgb(0.922, 0.949, 0.973),
  white: rgb(1, 1, 1),
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  BUY: "BUY",
  NEGOTIATE: "NEGOTIATE / CHECK FURTHER",
  DONT: "DON'T BUY",
};

export const RISK_LABEL: Record<InspectionReport["risk"], string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export const PDF_DISCLAIMER =
  "This report documents the machine at the time of inspection only. CHECKMYPC does not purchase the PC, guarantee future failures, or cover hidden defects that the listed tests cannot detect. The inspection fee is not a hardware warranty. Verify the seller independently before paying.";

export const PDF_SLOGAN = "CHECK BEFORE YOU BUY.";
export const PDF_BRAND = "CHECKMYPC.MA";

export type InspectionPdfModel = {
  brand: string;
  slogan: string;
  title: string;
  reportId: string;
  date: string;
  city: string;
  technician: string;
  verdict: Verdict;
  verdictLabel: string;
  risk: string;
  asking: string;
  fairValue: string;
  suggestOffer: string;
  askingNumber: number;
  fairNumber: number;
  offerNumber: number;
  valueNote: string;
  hardware: { part: string; found: string; note: string }[];
  tests: ResolvedInspectionTest[];
  testGroups: Array<{ group: string; items: ResolvedInspectionTest[] }>;
  summary: ReturnType<typeof summarizeTests>;
  temps: { label: string; value: string; celsius: number }[];
  issues: string[];
  disclaimer: string;
  footer: string;
  generatedAt: string;
  keywords: string[];
  subject: string;
};

export type PdfModelOptions = {
  now?: Date;
};

function moneyDelta(asking: number, fair: number): string {
  const delta = Math.round((asking || 0) - (fair || 0));
  if (delta > 0) return `Asking is ${dh(delta)} above estimated fair value.`;
  if (delta < 0) return `Asking is ${dh(Math.abs(delta))} under estimated fair value.`;
  return "Asking matches estimated fair value.";
}

export function buildInspectionPdfModel(report: InspectionReport, options: PdfModelOptions = {}): InspectionPdfModel {
  const tests = resolveInspectionTests(report);
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const issues = report.issues.map((i) => i.trim()).filter(Boolean);
  return {
    brand: PDF_BRAND,
    slogan: PDF_SLOGAN,
    title: report.title.trim() || "Inspection report",
    reportId: report.id,
    date: report.date || generatedAt.slice(0, 10),
    city: report.city || "—",
    technician: report.technician.trim() || "Unassigned",
    verdict: report.verdict,
    verdictLabel: VERDICT_LABEL[report.verdict],
    risk: RISK_LABEL[report.risk],
    asking: dh(report.asking),
    fairValue: dh(report.fairValue),
    suggestOffer: dh(report.suggestOffer),
    askingNumber: report.asking || 0,
    fairNumber: report.fairValue || 0,
    offerNumber: report.suggestOffer || 0,
    valueNote: moneyDelta(report.asking, report.fairValue),
    hardware: report.hardware
      .filter((row) => row.some((c) => String(c).trim()))
      .map(([part, found, note]) => ({
        part: part.trim() || "Part",
        found: found.trim() || "—",
        note: note.trim() || "—",
      })),
    tests,
    testGroups: groupTests(tests),
    summary: summarizeTests(tests),
    temps: [
      { label: "CPU idle", value: `${report.temps.cpuIdle} C`, celsius: report.temps.cpuIdle },
      { label: "CPU load", value: `${report.temps.cpuLoad} C`, celsius: report.temps.cpuLoad },
      { label: "GPU idle", value: `${report.temps.gpuIdle} C`, celsius: report.temps.gpuIdle },
      { label: "GPU load", value: `${report.temps.gpuLoad} C`, celsius: report.temps.gpuLoad },
    ],
    issues: issues.length ? issues : ["No issues recorded."],
    disclaimer: PDF_DISCLAIMER,
    footer: `${PDF_BRAND}  ·  ${PDF_SLOGAN}  ·  Casablanca · Rabat · Agadir`,
    generatedAt,
    keywords: ["CHECKMYPC", "inspection", report.verdict, report.city, report.id, report.risk],
    subject: `${VERDICT_LABEL[report.verdict]} · ${report.city} · ${report.date}`,
  };
}

export function slugifyPdfPart(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "report";
}

export function inspectionPdfFilename(report: Pick<InspectionReport, "id" | "verdict" | "title">): string {
  const id = slugifyPdfPart(report.id);
  return `CHECKMYPC-inspection-${id}-${report.verdict}.pdf`;
}

function pdfSafe(text: string): string {
  return String(text ?? "")
    .replace(/[–—]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/×/g, "x")
    .replace(/°/g, "C")
    .replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, "?");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const safe = pdfSafe(text);
  if (!safe) return [""];
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word;
      } else {
        let chunk = "";
        for (const ch of word) {
          const attempt = chunk + ch;
          if (font.widthOfTextAtSize(attempt, size) <= maxWidth) chunk = attempt;
          else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        line = chunk;
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function verdictColor(verdict: Verdict): RGB {
  if (verdict === "BUY") return C.ok;
  if (verdict === "DONT") return C.danger;
  return C.warn;
}

function resultColor(result: TestResult): RGB {
  if (result === "pass") return C.ok;
  if (result === "fail") return C.danger;
  if (result === "warn") return C.warn;
  return C.muted;
}

type Cursor = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  model: InspectionPdfModel;
};

function addPage(c: Cursor, header = true) {
  c.page = c.doc.addPage(A4);
  c.pageIndex += 1;
  c.y = c.height - (header ? 28 : MARGIN);
  if (header) drawRunningHeader(c);
}

function ensure(c: Cursor, need: number) {
  if (c.y - need < 56) {
    addPage(c);
  }
}

function drawRunningHeader(c: Cursor) {
  const { page, width, height, bold, font, model } = c;
  page.drawRectangle({ x: 0, y: height - 26, width, height: 26, color: C.navy });
  page.drawText(pdfSafe(`${model.brand}  ·  Inspection report  ·  ${model.reportId}`), {
    x: MARGIN,
    y: height - 17,
    size: 8,
    font: bold,
    color: C.white,
  });
  page.drawText(pdfSafe(model.verdictLabel), {
    x: width - MARGIN - bold.widthOfTextAtSize(pdfSafe(model.verdictLabel), 8),
    y: height - 17,
    size: 8,
    font: font,
    color: C.primary,
  });
  c.y = height - 40;
}

function drawFooter(c: Cursor) {
  const { page, width, font, model, pageIndex, doc } = c;
  page.drawRectangle({ x: 0, y: 0, width, height: 32, color: C.navy });
  page.drawText(pdfSafe(model.footer), {
    x: MARGIN,
    y: 13,
    size: 7,
    font,
    color: C.white,
  });
  const pages = doc.getPageCount();
  const label = `${pageIndex} / ${pages}`;
  page.drawText(label, {
    x: width - MARGIN - font.widthOfTextAtSize(label, 7),
    y: 13,
    size: 7,
    font,
    color: C.white,
  });
}

function sectionTitle(c: Cursor, title: string) {
  ensure(c, 28);
  c.page.drawText(pdfSafe(title.toUpperCase()), {
    x: MARGIN,
    y: c.y,
    size: 9,
    font: c.bold,
    color: C.primary,
  });
  c.y -= 6;
  c.page.drawLine({
    start: { x: MARGIN, y: c.y },
    end: { x: c.width - MARGIN, y: c.y },
    thickness: 0.8,
    color: C.line,
  });
  c.y -= 14;
}

function drawKvGrid(c: Cursor, rows: Array<[string, string]>) {
  const col = (c.width - MARGIN * 2) / 2;
  for (let i = 0; i < rows.length; i += 2) {
    ensure(c, 28);
    const left = rows[i];
    const right = rows[i + 1];
    const draw = (pair: [string, string] | undefined, x: number) => {
      if (!pair) return;
      c.page.drawText(pdfSafe(pair[0]), { x, y: c.y, size: 7, font: c.font, color: C.muted });
      c.page.drawText(pdfSafe(pair[1]), { x, y: c.y - 12, size: 10, font: c.bold, color: C.fg });
    };
    draw(left, MARGIN);
    draw(right, MARGIN + col);
    c.y -= 28;
  }
}

async function paintPdf(model: InspectionPdfModel): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${PDF_BRAND} inspection · ${model.title}`);
  doc.setAuthor(PDF_BRAND);
  doc.setSubject(model.subject);
  doc.setKeywords(model.keywords);
  doc.setProducer(`${PDF_BRAND} PDF generator`);
  doc.setCreator(PDF_BRAND);
  doc.setCreationDate(new Date(model.generatedAt));
  doc.setModificationDate(new Date(model.generatedAt));

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage(A4);
  const [width, height] = A4;
  const c: Cursor = { doc, page, font, bold, y: height - 28, width, height, pageIndex: 1, model };

  c.page.drawRectangle({ x: 0, y: height - 92, width, height: 92, color: C.navy });
  c.page.drawRectangle({ x: 0, y: height - 96, width, height: 4, color: C.primary });
  c.page.drawText(PDF_BRAND, { x: MARGIN, y: height - 36, size: 16, font: bold, color: C.white });
  c.page.drawText("VERIFIED INSPECTION REPORT", {
    x: MARGIN,
    y: height - 54,
    size: 9,
    font,
    color: C.primary,
  });
  const titleLines = wrap(model.title, bold, 14, width - MARGIN * 2 - 160);
  titleLines.forEach((line, i) => {
    c.page.drawText(line, { x: MARGIN, y: height - 74 - i * 14, size: 13, font: bold, color: C.white });
  });

  const badge = pdfSafe(model.verdictLabel);
  const badgeWidth = Math.max(118, bold.widthOfTextAtSize(badge, 9) + 20);
  const badgeX = width - MARGIN - badgeWidth;
  c.page.drawRectangle({
    x: badgeX,
    y: height - 58,
    width: badgeWidth,
    height: 22,
    color: verdictColor(model.verdict),
  });
  c.page.drawText(badge, {
    x: badgeX + (badgeWidth - bold.widthOfTextAtSize(badge, 9)) / 2,
    y: height - 51,
    size: 9,
    font: bold,
    color: C.white,
  });
  c.y = height - 112;

  drawKvGrid(c, [
    ["Report ID", model.reportId],
    ["Date", model.date],
    ["City", model.city],
    ["Technician", model.technician],
    ["Risk", model.risk],
    ["Tests scored", `${model.summary.scored} / ${model.summary.total}`],
  ]);

  sectionTitle(c, "Fair value");
  drawKvGrid(c, [
    ["Asking", model.asking],
    ["Fair value", model.fairValue],
    ["Suggested offer", model.suggestOffer],
    ["Note", model.valueNote],
  ]);

  sectionTitle(c, "Hardware verification");
  const tableWidth = width - MARGIN * 2;
  const cols = [90, 220, tableWidth - 310];
  const drawRow = (cells: string[], header: boolean) => {
    const wrapped = cells.map((cell, i) => wrap(cell, header ? bold : font, 8, cols[i] - 8));
    const rowH = Math.max(16, ...wrapped.map((w) => w.length * 11)) + 6;
    ensure(c, rowH);
    if (header) {
      c.page.drawRectangle({ x: MARGIN, y: c.y - rowH + 8, width: tableWidth, height: rowH, color: C.surface });
    }
    let x = MARGIN + 4;
    wrapped.forEach((lines, i) => {
      lines.forEach((line, li) => {
        c.page.drawText(line, {
          x,
          y: c.y - 4 - li * 11,
          size: 8,
          font: header ? bold : font,
          color: header ? C.navy : C.fg,
        });
      });
      x += cols[i];
    });
    c.y -= rowH;
    c.page.drawLine({
      start: { x: MARGIN, y: c.y + 6 },
      end: { x: width - MARGIN, y: c.y + 6 },
      thickness: 0.4,
      color: C.line,
    });
  };
  drawRow(["Part", "Found", "Note"], true);
  (model.hardware.length ? model.hardware : [{ part: "—", found: "No hardware recorded", note: "" }]).forEach((h) =>
    drawRow([h.part, h.found, h.note], false),
  );

  sectionTitle(c, "Full test battery");
  c.page.drawText(
    pdfSafe(`PASS ${model.summary.pass}   WARN ${model.summary.warn}   FAIL ${model.summary.fail}   N/A ${model.summary.na}`),
    { x: MARGIN, y: c.y, size: 8, font, color: C.muted },
  );
  c.y -= 14;

  for (const group of model.testGroups) {
    ensure(c, 20);
    c.page.drawText(pdfSafe(group.group), { x: MARGIN, y: c.y, size: 9, font: bold, color: C.navy });
    c.y -= 14;
    for (const item of group.items) {
      const noteLines = item.note ? wrap(item.note, font, 7, tableWidth - 130) : [];
      const h = 14 + noteLines.length * 9;
      ensure(c, h);
      c.page.drawText(pdfSafe(item.label), { x: MARGIN, y: c.y, size: 8, font, color: C.fg });
      const res = TEST_RESULT_LABEL[item.result];
      c.page.drawText(res, {
        x: width - MARGIN - bold.widthOfTextAtSize(res, 8),
        y: c.y,
        size: 8,
        font: bold,
        color: resultColor(item.result),
      });
      c.y -= 12;
      noteLines.forEach((line) => {
        c.page.drawText(line, { x: MARGIN, y: c.y, size: 7, font, color: C.muted });
        c.y -= 9;
      });
      c.y -= 2;
    }
    c.y -= 4;
  }

  sectionTitle(c, "Temperatures");
  const boxW = (tableWidth - 12) / 4;
  ensure(c, 44);
  model.temps.forEach((t, i) => {
    const x = MARGIN + i * (boxW + 4);
    c.page.drawRectangle({ x, y: c.y - 28, width: boxW, height: 36, color: C.surface });
    c.page.drawText(pdfSafe(t.label), { x: x + 8, y: c.y - 4, size: 7, font, color: C.muted });
    c.page.drawText(pdfSafe(t.value), { x: x + 8, y: c.y - 20, size: 11, font: bold, color: C.fg });
  });
  c.y -= 48;

  sectionTitle(c, "Issues detected");
  for (const issue of model.issues) {
    const lines = wrap(`• ${issue}`, font, 9, tableWidth);
    ensure(c, lines.length * 12);
    lines.forEach((line) => {
      c.page.drawText(line, { x: MARGIN, y: c.y, size: 9, font, color: C.fg });
      c.y -= 12;
    });
  }

  sectionTitle(c, "Liability");
  const disc = wrap(model.disclaimer, font, 8, tableWidth);
  for (const line of disc) {
    ensure(c, 12);
    c.page.drawText(line, { x: MARGIN, y: c.y, size: 8, font, color: C.muted });
    c.y -= 11;
  }

  for (let i = 0; i < doc.getPageCount(); i += 1) {
    c.page = doc.getPages()[i];
    c.pageIndex = i + 1;
    if (i > 0) {
      /* running header already drawn on extra pages */
    }
    drawFooter(c);
  }

  const saved = await doc.save({ useObjectStreams: false });
  return Uint8Array.from(saved);
}

export async function generateInspectionPdf(report: InspectionReport, options: PdfModelOptions = {}): Promise<Uint8Array> {
  const model = buildInspectionPdfModel(report, options);
  return paintPdf(model);
}

export function isPdfBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  const head = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]);
  return head.startsWith("%PDF-");
}

export function pdfEndsWithEof(bytes: Uint8Array): boolean {
  const tail = bytes.slice(Math.max(0, bytes.length - 32));
  const text = Array.from(tail, (b) => String.fromCharCode(b)).join("");
  return text.includes("%%EOF");
}

export type DownloadHost = {
  document: {
    createElement: (tag: string) => {
      href: string;
      download: string;
      rel?: string;
      click: () => void;
      style?: { display?: string };
    };
    body?: { appendChild: (el: unknown) => void; removeChild: (el: unknown) => void };
  };
  URL: { createObjectURL: (blob: Blob) => string; revokeObjectURL: (url: string) => void };
};

export function triggerPdfDownload(bytes: Uint8Array, filename: string, host: DownloadHost = globalThis as unknown as DownloadHost) {
  if (!host?.document) throw new Error("PDF download requires a browser document");
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = host.URL.createObjectURL(blob);
  const a = host.document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  host.URL.revokeObjectURL(url);
}

export async function downloadInspectionPdf(report: InspectionReport, host?: DownloadHost) {
  const bytes = await generateInspectionPdf(report);
  const filename = inspectionPdfFilename(report);
  triggerPdfDownload(bytes, filename, host ?? (globalThis as unknown as DownloadHost));
  return { bytes, filename };
}
