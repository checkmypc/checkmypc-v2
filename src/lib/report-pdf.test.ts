import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PDFDocument } from "pdf-lib";
import { SEED_REPORTS } from "./ops-seed.ts";
import {
  PDF_BRAND,
  PDF_DISCLAIMER,
  PDF_SLOGAN,
  RISK_LABEL,
  VERDICT_LABEL,
  buildInspectionPdfModel,
  downloadInspectionPdf,
  generateInspectionPdf,
  inspectionPdfFilename,
  isPdfBytes,
  pdfEndsWithEof,
  slugifyPdfPart,
  triggerPdfDownload,
  type DownloadHost,
} from "./report-pdf.ts";
import { SAMPLE_REPORT, type InspectionReport, type Verdict } from "./used.ts";

const NOW = new Date("2026-09-30T12:00:00.000Z");

function blankReport(): InspectionReport {
  return {
    id: "rep-blank",
    title: "",
    date: "2026-09-30",
    city: "Casablanca",
    technician: "",
    verdict: "NEGOTIATE",
    risk: "medium",
    asking: 0,
    fairValue: 0,
    suggestOffer: 0,
    hardware: [
      ["CPU", "", ""],
      ["GPU", "", ""],
    ],
    temps: { cpuIdle: 0, cpuLoad: 0, gpuIdle: 0, gpuLoad: 0 },
    issues: [""],
    published: false,
  };
}

function fakeHost() {
  const clicks: Array<{ href: string; download: string }> = [];
  const urls: string[] = [];
  const host: DownloadHost = {
    document: {
      createElement: () => {
        const el = {
          href: "",
          download: "",
          rel: "",
          click() {
            clicks.push({ href: el.href, download: el.download });
          },
        };
        return el;
      },
    },
    URL: {
      createObjectURL: (blob: Blob) => {
        assert.equal(blob.type, "application/pdf");
        const url = `blob:test-${urls.length}`;
        urls.push(url);
        return url;
      },
      revokeObjectURL: (url: string) => {
        const i = urls.indexOf(url);
        if (i >= 0) urls.splice(i, 1);
      },
    },
  };
  return { host, clicks };
}

describe("inspection PDF model", () => {
  it("stamps brand, slogan, disclaimer and fair-value math", () => {
    const model = buildInspectionPdfModel(SAMPLE_REPORT, { now: NOW });
    assert.equal(model.brand, PDF_BRAND);
    assert.equal(model.slogan, PDF_SLOGAN);
    assert.equal(model.disclaimer, PDF_DISCLAIMER);
    assert.equal(model.verdict, "NEGOTIATE");
    assert.equal(model.verdictLabel, VERDICT_LABEL.NEGOTIATE);
    assert.equal(model.risk, RISK_LABEL.medium);
    assert.equal(model.askingNumber, 6200);
    assert.equal(model.fairNumber, 5800);
    assert.equal(model.offerNumber, 5400);
    assert.match(model.asking, /DH/);
    assert.match(model.valueNote, /400 DH above/);
    assert.equal(model.tests.length, 23);
    assert.ok(model.hardware.some((h) => h.part === "GPU"));
    assert.ok(model.issues.some((i) => /PSU/i.test(i)));
    assert.equal(model.generatedAt, NOW.toISOString());
    assert.ok(model.keywords.includes("CHECKMYPC"));
    assert.ok(model.keywords.includes("NEGOTIATE"));
    assert.match(model.subject, /NEGOTIATE/);
    assert.match(model.footer, /Casablanca/);
  });

  it("labels every verdict", () => {
    assert.equal(VERDICT_LABEL.BUY, "BUY");
    assert.equal(VERDICT_LABEL.DONT, "DON'T BUY");
    assert.match(VERDICT_LABEL.NEGOTIATE, /CHECK FURTHER/);
  });

  it("notes when asking is under fair value", () => {
    const model = buildInspectionPdfModel(
      { ...SAMPLE_REPORT, asking: 2500, fairValue: 3000, suggestOffer: 2500, verdict: "BUY" },
      { now: NOW },
    );
    assert.match(model.valueNote, /under estimated fair value/);
  });

  it("notes when asking matches fair value", () => {
    const model = buildInspectionPdfModel(
      { ...SAMPLE_REPORT, asking: 3000, fairValue: 3000 },
      { now: NOW },
    );
    assert.match(model.valueNote, /matches/);
  });

  it("fills empty titles, technicians and issues", () => {
    const blank = blankReport();
    const model = buildInspectionPdfModel(blank, { now: NOW });
    assert.equal(model.title, "Inspection report");
    assert.equal(model.technician, "Unassigned");
    assert.deepEqual(model.issues, ["No issues recorded."]);
    assert.equal(model.tests.length, 23);
  });

  it("drops blank hardware rows", () => {
    const model = buildInspectionPdfModel({
      ...SAMPLE_REPORT,
      hardware: [
        ["CPU", "Ryzen 5 5600", "ok"],
        ["", "", ""],
      ],
    });
    assert.equal(model.hardware.length, 1);
  });
});

describe("filenames", () => {
  it("builds a stable CHECKMYPC filename from id and verdict", () => {
    assert.equal(inspectionPdfFilename(SAMPLE_REPORT), "CHECKMYPC-inspection-rep-4060-NEGOTIATE.pdf");
    assert.equal(inspectionPdfFilename({ id: "rep-office-rabat", verdict: "BUY", title: "x" }), "CHECKMYPC-inspection-rep-office-rabat-BUY.pdf");
    assert.equal(inspectionPdfFilename({ id: "rep-fake-3070", verdict: "DONT", title: "x" }), "CHECKMYPC-inspection-rep-fake-3070-DONT.pdf");
  });

  it("strips punctuation and unicode from ids", () => {
    assert.equal(slugifyPdfPart("Rep 4060!!"), "rep-4060");
    assert.equal(slugifyPdfPart("***"), "report");
    assert.equal(slugifyPdfPart("PC بـ4000 DH"), "pc-4000-dh");
  });
});

describe("PDF generation", () => {
  it("writes a valid multi-page PDF for the sample report", async () => {
    const bytes = await generateInspectionPdf(SAMPLE_REPORT, { now: NOW });
    assert.ok(isPdfBytes(bytes));
    assert.ok(pdfEndsWithEof(bytes));
    assert.ok(bytes.byteLength > 1500);

    const doc = await PDFDocument.load(bytes);
    assert.ok(doc.getPageCount() >= 1);
    assert.match(doc.getTitle() ?? "", /CHECKMYPC/);
    assert.equal(doc.getAuthor(), PDF_BRAND);
    assert.match(doc.getSubject() ?? "", /NEGOTIATE/);
    assert.equal(doc.getCreator(), PDF_BRAND);
    const keywords = doc.getKeywords() ?? "";
    assert.match(keywords, /inspection/i);
    assert.match(keywords, /rep-4060/);
  });

  it("generates a PDF for an empty draft", async () => {
    const bytes = await generateInspectionPdf(blankReport(), { now: NOW });
    assert.ok(isPdfBytes(bytes));
    const doc = await PDFDocument.load(bytes);
    assert.ok(doc.getPageCount() >= 1);
    assert.match(doc.getTitle() ?? "", /Inspection report/);
  });

  it("survives very long titles, notes and issue lists without throwing", async () => {
    const report: InspectionReport = {
      ...SAMPLE_REPORT,
      title: "Gaming tower ".repeat(40),
      hardware: Array.from({ length: 12 }, (_, i) => ["Part", "x".repeat(80), `note ${i} ${"long ".repeat(20)}`] as [string, string, string]),
      issues: Array.from({ length: 12 }, (_, i) => `Issue ${i}: ${"dust paste coil whine ".repeat(12)}`),
    };
    const bytes = await generateInspectionPdf(report, { now: NOW });
    const doc = await PDFDocument.load(bytes);
    assert.ok(doc.getPageCount() >= 2);
  });

  it("emits a valid PDF for every seed report and verdict", async () => {
    const seen = new Set<Verdict>();
    for (const report of SEED_REPORTS) {
      seen.add(report.verdict);
      const bytes = await generateInspectionPdf(report, { now: NOW });
      assert.ok(isPdfBytes(bytes), report.id);
      const doc = await PDFDocument.load(bytes);
      assert.ok(doc.getPageCount() >= 1, report.id);
      assert.match(doc.getTitle() ?? "", /CHECKMYPC/);
      assert.match(doc.getSubject() ?? "", report.verdict === "DONT" ? /DON'T BUY/ : new RegExp(report.verdict));
    }
    assert.deepEqual([...seen].sort(), ["BUY", "DONT", "NEGOTIATE"]);
  });

  it("rejects tiny buffers as PDF", () => {
    assert.equal(isPdfBytes(new Uint8Array([1, 2, 3])), false);
    assert.equal(isPdfBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])), true);
  });
});

describe("download helper", () => {
  it("clicks an anchor with the PDF filename", async () => {
    const { host, clicks } = fakeHost();
    const { filename, bytes } = await downloadInspectionPdf(SAMPLE_REPORT, host);
    assert.equal(filename, "CHECKMYPC-inspection-rep-4060-NEGOTIATE.pdf");
    assert.ok(isPdfBytes(bytes));
    assert.equal(clicks.length, 1);
    assert.equal(clicks[0].download, filename);
    assert.match(clicks[0].href, /^blob:/);
  });

  it("throws without a document host", () => {
    assert.throws(() => triggerPdfDownload(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), "x.pdf", {} as DownloadHost), /browser document/);
  });
});
