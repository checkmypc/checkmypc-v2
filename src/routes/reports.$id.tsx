import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { ReportPdfButton } from "@/components/admin/report-pdf-button";
import { TestSummaryPills } from "@/components/admin/test-battery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { groupTests, resolveInspectionTests, summarizeTests, TEST_RESULT_LABEL } from "@/lib/inspection-tests";
import { useOps } from "@/lib/ops";
import { reportById } from "@/lib/used";
import { cn, dh } from "@/lib/utils";

export const Route = createFileRoute("/reports/$id")({ component: ReportPage });

function ReportPage() {
  const { id } = Route.useParams();
  useOps((s) => s.reports);
  const r = reportById(id);
  if (!r || r.published === false) throw notFound();
  const tone = r.verdict === "BUY" ? "ok" : r.verdict === "DONT" ? "danger" : "warn";
  const tests = resolveInspectionTests(r);
  const groups = groupTests(tests);
  const summary = summarizeTests(tests);
  return (
    <main>
      <PageHero
        eyebrow="Verified inspection"
        title={r.title || "Inspection report"}
        description={`${r.city} · ${r.date} · Tech ${r.technician}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={tone}>{r.verdict}</Badge>
          <span className="text-sm text-muted">
            Asking {dh(r.asking)} · Fair {dh(r.fairValue)} · Offer {dh(r.suggestOffer)}
          </span>
          <ReportPdfButton report={r} variant="secondary" size="sm" label="Download PDF" />
        </div>
      </PageHero>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 lg:grid-cols-2">
        <Card className="rounded-2xl p-5">
          <h2 className="mb-3 font-display font-semibold">Hardware</h2>
          <table className="w-full text-sm">
            <tbody>
              {r.hardware.map(([k, v, n]) => (
                <tr key={k} className="border-b border-border last:border-0">
                  <th className="py-2 pe-3 text-start text-muted">{k}</th>
                  <td className="py-2 ltr-isolate">{v}</td>
                  <td className="py-2 text-end text-xs text-muted">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="space-y-4">
          <Card className="rounded-2xl p-5">
            <h2 className="mb-3 font-display font-semibold">Temperatures</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-surface-2 p-3">CPU idle {r.temps.cpuIdle}°</div>
              <div className="rounded-lg bg-surface-2 p-3">CPU load {r.temps.cpuLoad}°</div>
              <div className="rounded-lg bg-surface-2 p-3">GPU idle {r.temps.gpuIdle}°</div>
              <div className="rounded-lg bg-surface-2 p-3">GPU load {r.temps.gpuLoad}°</div>
            </div>
          </Card>
          <Card className="rounded-2xl p-5">
            <h2 className="mb-3 font-display font-semibold">Issues</h2>
            <ul className="list-disc ps-4 text-sm text-muted">
              {r.issues.filter(Boolean).map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </Card>
          <Button asChild>
            <Link to="/inspection">Book the same check</Link>
          </Button>
        </div>
        <Card className="rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display font-semibold">Full test battery</h2>
            <TestSummaryPills {...summary} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((g) => (
              <div key={g.group}>
                <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{g.group}</p>
                <ul className="space-y-1.5">
                  {g.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <span>{item.label}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          item.result === "pass" && "bg-ok/15 text-ok",
                          item.result === "fail" && "bg-danger/15 text-danger",
                          item.result === "warn" && "bg-warn/15 text-warn",
                          item.result === "na" && "bg-surface-2 text-muted",
                        )}
                      >
                        {TEST_RESULT_LABEL[item.result]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
