import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ReportPdfButton } from "@/components/admin/report-pdf-button";
import { VerdictBadge } from "@/components/admin/status-badge";
import { TestBatteryEditor, TestSummaryPills } from "@/components/admin/test-battery";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  resolveInspectionTests,
  summarizeTests,
  testsFromResolved,
  verdictConsistency,
  type ResolvedInspectionTest,
} from "@/lib/inspection-tests";
import { useOps } from "@/lib/ops";
import { buildInspectionPdfModel, inspectionPdfFilename } from "@/lib/report-pdf";
import type { InspectionReport } from "@/lib/used";
import { cn, dh } from "@/lib/utils";

export const Route = createFileRoute("/admin/reports")({ component: AdminPdfReports });

function AdminPdfReports() {
  const reports = useOps((s) => s.reports);
  const upsert = useOps((s) => s.upsertReport);
  const [sel, setSel] = useState<string | null>(reports[0]?.id ?? null);
  const current = reports.find((r) => r.id === sel) ?? reports[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">PDF generator</p>
          <h1 className="font-display text-3xl font-semibold">Inspection PDFs</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Full 23-point test battery, then a branded CHECKMYPC report the customer can keep.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/admin/used">Edit reports</Link>
        </Button>
      </div>
      {reports.length === 0 ? (
        <Card className="rounded-2xl p-6 text-sm text-muted">No inspection reports yet. Write one first.</Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
          <div className="space-y-2">
            {reports.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSel(r.id)}
                className={cn(
                  "w-full rounded-2xl bg-surface p-4 text-start shadow-[var(--shadow-border)]",
                  (sel ?? current?.id) === r.id && "shadow-[var(--shadow-border-hover)]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display font-semibold">{r.title || r.id}</p>
                    <p className="text-xs text-muted">
                      {r.city} · {r.date}
                    </p>
                  </div>
                  <VerdictBadge verdict={r.verdict} />
                </div>
              </button>
            ))}
          </div>
          {current && <PdfDesk key={current.id} report={current} onSave={upsert} />}
        </div>
      )}
    </div>
  );
}

function PdfDesk({ report, onSave }: { report: InspectionReport; onSave: (r: InspectionReport) => void }) {
  const [tests, setTests] = useState<ResolvedInspectionTest[]>(() => resolveInspectionTests(report));
  const live = useMemo(() => ({ ...report, tests: testsFromResolved(tests) }), [report, tests]);
  const model = useMemo(() => buildInspectionPdfModel(live), [live]);
  const summary = summarizeTests(tests);
  const consistency = verdictConsistency(report.verdict, tests);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-2xl p-0">
        <div className="bg-navy px-5 py-5 text-on-navy">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">CHECKMYPC.MA</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">{model.title}</h2>
          <p className="mt-1 text-xs text-on-navy-muted">
            {model.reportId} · {model.city} · {model.date} · Tech {model.technician}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                report.verdict === "BUY" && "bg-ok text-primary-fg",
                report.verdict === "DONT" && "bg-danger text-primary-fg",
                report.verdict === "NEGOTIATE" && "bg-warn text-primary-fg",
              )}
            >
              {model.verdictLabel}
            </span>
            <span className="text-xs text-on-navy-muted">{model.risk}</span>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <ValueCell label="Asking" value={dh(report.asking)} />
          <ValueCell label="Fair value" value={dh(report.fairValue)} />
          <ValueCell label="Suggested offer" value={dh(report.suggestOffer)} />
        </div>
        <p className="px-5 pb-4 text-xs text-muted">{model.valueNote}</p>
      </Card>

      <Card className="rounded-2xl p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold">Full test battery</h3>
            <p className="text-xs text-muted">23 checks — CPU to physical condition</p>
          </div>
          <TestSummaryPills {...summary} />
        </div>
        {!consistency.ok && (
          <p className="mb-3 rounded-lg bg-warn/10 px-3 py-2 text-xs text-warn">{consistency.detail}</p>
        )}
        <TestBatteryEditor tests={tests} onChange={setTests} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setTests(resolveInspectionTests({ ...report, tests: undefined }));
              toast.message("Filled from hardware, temps and issues");
            }}
          >
            Auto-fill from hardware
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onSave({ ...report, tests: testsFromResolved(tests) });
              toast.success("Test battery saved");
            }}
          >
            Save tests
          </Button>
          <ReportPdfButton report={live} variant="default" label="Download PDF" />
          {report.published && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/reports/$id" params={{ id: report.id }}>
                Public page
              </Link>
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">File: {inspectionPdfFilename(live)}</p>
      </Card>

      <Card className="rounded-2xl p-5">
        <h3 className="mb-3 font-display font-semibold">Hardware on the PDF</h3>
        <table className="w-full text-sm">
          <tbody>
            {model.hardware.map((h) => (
              <tr key={h.part} className="border-b border-border last:border-0">
                <th className="py-2 pe-3 text-start text-muted">{h.part}</th>
                <td className="py-2">{h.found}</td>
                <td className="py-2 text-end text-xs text-muted">{h.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="mt-4 list-disc ps-4 text-sm text-muted">
          {model.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ValueCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
