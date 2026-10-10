import { TEST_RESULTS, TEST_RESULT_LABEL, groupTests, type ResolvedInspectionTest, type TestResult } from "@/lib/inspection-tests";
import { cn } from "@/lib/utils";

export function TestBatteryEditor({
  tests,
  onChange,
}: {
  tests: ResolvedInspectionTest[];
  onChange: (next: ResolvedInspectionTest[]) => void;
}) {
  const groups = groupTests(tests);

  function patch(id: string, patch: Partial<ResolvedInspectionTest>) {
    onChange(tests.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.group}>
          <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{g.group}</p>
          <ul className="space-y-3">
            {g.items.map((item) => (
              <li key={item.id} className="rounded-xl bg-surface-2/60 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted">{item.hint}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {TEST_RESULTS.map((result) => (
                      <button
                        key={result}
                        type="button"
                        onClick={() => patch(item.id, { result })}
                        className={cn(
                          "min-h-9 rounded-full px-3 text-xs font-semibold",
                          item.result === result ? toneClass(result) : "bg-surface text-muted shadow-[var(--shadow-border)]",
                        )}
                      >
                        {TEST_RESULT_LABEL[result]}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  value={item.note}
                  onChange={(e) => patch(item.id, { note: e.target.value })}
                  placeholder="Note (optional)"
                  className="mt-2 h-10 w-full rounded-md bg-bg px-3 text-xs text-fg shadow-[var(--shadow-border)] outline-none"
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function toneClass(result: TestResult) {
  if (result === "pass") return "bg-ok text-primary-fg";
  if (result === "fail") return "bg-danger text-primary-fg";
  if (result === "warn") return "bg-warn text-navy";
  return "bg-navy text-on-navy";
}

export function TestSummaryPills({
  pass,
  warn,
  fail,
  na,
}: {
  pass: number;
  warn: number;
  fail: number;
  na: number;
}) {
  const pills = [
    { k: "PASS", n: pass, className: "bg-ok/15 text-ok" },
    { k: "WARN", n: warn, className: "bg-warn/15 text-warn" },
    { k: "FAIL", n: fail, className: "bg-danger/15 text-danger" },
    { k: "N/A", n: na, className: "bg-surface-2 text-muted" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((p) => (
        <span key={p.k} className={cn("rounded-full px-3 py-1 text-xs font-semibold", p.className)}>
          {p.k} {p.n}
        </span>
      ))}
    </div>
  );
}
