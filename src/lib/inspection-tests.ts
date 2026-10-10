export type TestResult = "pass" | "fail" | "warn" | "na";

export type InspectionTestResult = {
  id: string;
  result: TestResult;
  note?: string;
};

export type InspectionTestDef = {
  id: string;
  group: string;
  label: string;
  hint: string;
};

export type TestSource = {
  hardware: [string, string, string][];
  temps: { cpuIdle: number; cpuLoad: number; gpuIdle: number; gpuLoad: number };
  issues: string[];
  risk?: string;
  verdict?: string;
};

export type ResolvedInspectionTest = InspectionTestDef & {
  result: TestResult;
  note: string;
};

export const INSPECTION_TEST_BATTERY: InspectionTestDef[] = [
  { id: "cpu-id", group: "CPU", label: "CPU identity", hint: "Model matches the listing" },
  { id: "cpu-temp", group: "CPU", label: "CPU temperatures", hint: "Idle and load vs safe envelope" },
  { id: "cpu-stable", group: "CPU", label: "CPU stability", hint: "Stress test without crash or hard throttle" },
  { id: "gpu-id", group: "GPU", label: "GPU identity", hint: "GPU-Z / device ID vs advertised model" },
  { id: "gpu-temp", group: "GPU", label: "GPU temperatures", hint: "Idle and load" },
  { id: "gpu-stable", group: "GPU", label: "GPU stability", hint: "Artifacts, driver crash, power limit" },
  { id: "gpu-game", group: "GPU", label: "Gaming performance", hint: "Short bench / FPS snapshot" },
  { id: "ram-size", group: "Memory", label: "RAM size and speed", hint: "Capacity, channels, XMP/EXPO" },
  { id: "ram-stable", group: "Memory", label: "RAM stability", hint: "Memtest / memory diagnostic" },
  { id: "ssd-health", group: "Storage", label: "SSD / NVMe health", hint: "SMART %, spare, reallocated" },
  { id: "hdd-health", group: "Storage", label: "HDD health", hint: "SMART pending sectors — N/A if none" },
  { id: "mb-visual", group: "Board", label: "Motherboard condition", hint: "VRM, caps, burns, POST" },
  { id: "mb-bios", group: "Board", label: "BIOS", hint: "Version, settings, secure boot note" },
  { id: "psu", group: "Power", label: "PSU", hint: "Brand, rating, smell, coil, rails" },
  { id: "cooling", group: "Cooling", label: "Cooling system", hint: "Paste, pads, radiator, mount" },
  { id: "fans", group: "Cooling", label: "Fans", hint: "Spin, rattle, dust, curve" },
  { id: "noise", group: "Cooling", label: "Noise", hint: "Coil whine, bearing, pump" },
  { id: "usb", group: "Ports", label: "USB ports", hint: "Front and rear enumeration" },
  { id: "display", group: "Ports", label: "Display outputs", hint: "HDMI / DisplayPort detected" },
  { id: "network", group: "Network", label: "Ethernet", hint: "Link and MAC present" },
  { id: "wifi", group: "Network", label: "Wi-Fi", hint: "Adapter present and associates" },
  { id: "bluetooth", group: "Network", label: "Bluetooth", hint: "Radio present" },
  { id: "physical", group: "Physical", label: "Physical condition", hint: "Screws, dents, missing parts, smell" },
];

export const TEST_IDS = INSPECTION_TEST_BATTERY.map((t) => t.id);

export const TEST_RESULT_LABEL: Record<TestResult, string> = {
  pass: "PASS",
  fail: "FAIL",
  warn: "WARN",
  na: "N/A",
};

export const TEST_RESULTS: TestResult[] = ["pass", "warn", "fail", "na"];

const FAIL_WORDS = [
  "fake",
  "mismatch",
  "unverified",
  "underspec",
  "replace",
  "unsafe",
  "burn",
  "dead",
  "fail",
  "dont buy",
  "don't buy",
  "not genuine",
  "sticker",
  "shroud",
];

const WARN_WORDS = [
  "negotiate",
  "dust",
  "intermittent",
  "no-name",
  "unbranded",
  "wear",
  "cosmetic",
  "missing",
  "loud",
  "hot",
  "coil",
  "old paste",
  "undersized",
];

export function isTestResult(value: unknown): value is TestResult {
  return value === "pass" || value === "fail" || value === "warn" || value === "na";
}

export function normalizeTestResult(value: unknown): TestResult {
  return isTestResult(value) ? value : "na";
}

export function hardwareBlob(source: TestSource, part: string): string {
  const needle = part.toLowerCase();
  return source.hardware
    .filter(([k]) => k.toLowerCase().includes(needle))
    .map(([, v, n]) => `${v} ${n}`)
    .join(" ")
    .trim();
}

export function issuesBlob(source: TestSource): string {
  return source.issues.filter(Boolean).join(" ").trim();
}

export function blobResult(blob: string): TestResult {
  const text = blob.toLowerCase();
  if (!text.trim()) return "na";
  if (FAIL_WORDS.some((w) => text.includes(w))) return "fail";
  if (WARN_WORDS.some((w) => text.includes(w))) return "warn";
  return "pass";
}

export function tempResult(load: number, idle: number): TestResult {
  if (!(load > 0) && !(idle > 0)) return "na";
  const peak = Math.max(load || 0, idle || 0);
  if (peak >= 90) return "fail";
  if (peak >= 80) return "warn";
  return "pass";
}

function worse(a: TestResult, b: TestResult): TestResult {
  const rank: Record<TestResult, number> = { fail: 3, warn: 2, pass: 1, na: 0 };
  return rank[a] >= rank[b] ? a : b;
}

function pickNote(...parts: Array<string | undefined>): string {
  return parts.map((p) => (p ?? "").trim()).filter(Boolean).join(" — ");
}

export function deriveTestMap(source: TestSource): Record<string, InspectionTestResult> {
  const issues = issuesBlob(source);
  const issuesLow = issues.toLowerCase();
  const cpu = hardwareBlob(source, "cpu");
  const gpu = hardwareBlob(source, "gpu");
  const ram = hardwareBlob(source, "ram");
  const storage = hardwareBlob(source, "storage");
  const board = hardwareBlob(source, "motherboard") || hardwareBlob(source, "board");
  const psu = hardwareBlob(source, "psu");
  const cooler = hardwareBlob(source, "cool");

  const cpuTemp = tempResult(source.temps.cpuLoad, source.temps.cpuIdle);
  const gpuTemp = tempResult(source.temps.gpuLoad, source.temps.gpuIdle);
  const storageLow = storage.toLowerCase();
  const hasHdd = /hdd|mechanical|2 tb|2tb|1 tb hdd|hard disk/.test(`${storageLow} ${issuesLow}`);

  const map: Record<string, InspectionTestResult> = {
    "cpu-id": { id: "cpu-id", result: blobResult(cpu), note: cpu },
    "cpu-temp": {
      id: "cpu-temp",
      result: cpuTemp,
      note: cpuTemp === "na" ? "" : `Idle ${source.temps.cpuIdle}C / load ${source.temps.cpuLoad}C`,
    },
    "cpu-stable": {
      id: "cpu-stable",
      result: worse(blobResult(cpu), /cpu|stability|throttle/.test(issuesLow) ? blobResult(issues) : "na"),
      note: cpu,
    },
    "gpu-id": { id: "gpu-id", result: blobResult(gpu), note: gpu },
    "gpu-temp": {
      id: "gpu-temp",
      result: gpuTemp,
      note: gpuTemp === "na" ? "" : `Idle ${source.temps.gpuIdle}C / load ${source.temps.gpuLoad}C`,
    },
    "gpu-stable": {
      id: "gpu-stable",
      result: worse(blobResult(gpu), /gpu|artifact|driver/.test(issuesLow) ? blobResult(issues) : "na"),
      note: gpu,
    },
    "gpu-game": {
      id: "gpu-game",
      result: blobResult(gpu) === "fail" ? "fail" : gpuTemp === "na" && !gpu ? "na" : blobResult(gpu),
      note: gpu,
    },
    "ram-size": { id: "ram-size", result: blobResult(ram), note: ram },
    "ram-stable": {
      id: "ram-stable",
      result: blobResult(ram),
      note: ram,
    },
    "ssd-health": { id: "ssd-health", result: blobResult(storage), note: storage },
    "hdd-health": {
      id: "hdd-health",
      result: hasHdd ? blobResult(storage) : "na",
      note: hasHdd ? storage : "No HDD in this build",
    },
    "mb-visual": { id: "mb-visual", result: blobResult(board), note: board },
    "mb-bios": {
      id: "mb-bios",
      result: /bios/.test(issuesLow) ? blobResult(issues) : blobResult(board) === "na" ? "na" : "pass",
      note: board,
    },
    psu: { id: "psu", result: blobResult(psu), note: psu },
    cooling: {
      id: "cooling",
      result: worse(blobResult(cooler), /dust|paste|thermal|cooling/.test(issuesLow) ? blobResult(issues) : blobResult(cooler)),
      note: pickNote(cooler, /dust|paste|thermal|cooling/.test(issuesLow) ? issues : ""),
    },
    fans: {
      id: "fans",
      result: /fan/.test(issuesLow) ? blobResult(issues) : blobResult(cooler) === "fail" ? "warn" : cooler || issues ? "pass" : "na",
      note: cooler,
    },
    noise: {
      id: "noise",
      result: /noise|coil|whine|loud/.test(issuesLow) ? blobResult(issues) : "na",
      note: /noise|coil|whine|loud/.test(issuesLow) ? issues : "",
    },
    usb: {
      id: "usb",
      result: /usb/.test(issuesLow) ? blobResult(issues) : "na",
      note: /usb/.test(issuesLow) ? issues : "",
    },
    display: {
      id: "display",
      result: /hdmi|displayport|display output|no image/.test(issuesLow) ? blobResult(issues) : "na",
      note: "",
    },
    network: {
      id: "network",
      result: /ethernet|network|lan/.test(issuesLow) ? blobResult(issues) : "na",
      note: "",
    },
    wifi: {
      id: "wifi",
      result: /wi-?fi/.test(issuesLow) ? blobResult(issues) : "na",
      note: /wi-?fi/.test(issuesLow) ? issues : "",
    },
    bluetooth: {
      id: "bluetooth",
      result: /bluetooth/.test(issuesLow) ? blobResult(issues) : "na",
      note: "",
    },
    physical: {
      id: "physical",
      result: /cosmetic|dent|screw|missing|smell|physical/.test(issuesLow) ? blobResult(issues) : "pass",
      note: /cosmetic|dent|screw|missing|smell|physical/.test(issuesLow) ? issues : "",
    },
  };

  return map;
}

export function hasSavedTests(tests: InspectionTestResult[] | undefined): boolean {
  return Array.isArray(tests) && tests.length > 0;
}

export function resolveInspectionTests(
  source: TestSource & { tests?: InspectionTestResult[] },
): ResolvedInspectionTest[] {
  const derived = deriveTestMap(source);
  const saved = new Map((source.tests ?? []).map((t) => [t.id, t]));
  const useSaved = hasSavedTests(source.tests);
  return INSPECTION_TEST_BATTERY.map((def) => {
    const row = useSaved ? saved.get(def.id) : undefined;
    const fallback = derived[def.id];
    return {
      ...def,
      result: row ? normalizeTestResult(row.result) : (fallback?.result ?? "na"),
      note: (row?.note ?? fallback?.note ?? "").trim(),
    };
  });
}

export function testsFromResolved(rows: ResolvedInspectionTest[]): InspectionTestResult[] {
  return rows.map((r) => ({ id: r.id, result: r.result, note: r.note || undefined }));
}

export type TestSummary = {
  pass: number;
  fail: number;
  warn: number;
  na: number;
  scored: number;
  total: number;
};

export function summarizeTests(tests: Array<{ result: TestResult }>): TestSummary {
  const counts: TestSummary = { pass: 0, fail: 0, warn: 0, na: 0, scored: 0, total: tests.length };
  for (const t of tests) counts[t.result] += 1;
  counts.scored = counts.pass + counts.fail + counts.warn;
  return counts;
}

export function verdictConsistency(
  verdict: string,
  tests: Array<{ result: TestResult }>,
): { ok: boolean; detail: string } {
  const summary = summarizeTests(tests);
  if (verdict === "BUY" && summary.fail > 0) {
    return { ok: false, detail: "BUY with failing tests — review before sending the PDF." };
  }
  if (verdict === "DONT" && summary.fail === 0 && summary.warn === 0) {
    return { ok: false, detail: "DON'T BUY with no FAIL/WARN tests — add the evidence." };
  }
  if (verdict === "NEGOTIATE" && summary.fail === 0 && summary.warn === 0 && summary.pass > 0) {
    return { ok: false, detail: "NEGOTIATE with a clean battery — confirm the price gap is the only issue." };
  }
  return { ok: true, detail: "Verdict matches the test battery." };
}

export function groupTests(tests: ResolvedInspectionTest[]): Array<{ group: string; items: ResolvedInspectionTest[] }> {
  const order: string[] = [];
  const buckets = new Map<string, ResolvedInspectionTest[]>();
  for (const t of tests) {
    if (!buckets.has(t.group)) {
      buckets.set(t.group, []);
      order.push(t.group);
    }
    buckets.get(t.group)!.push(t);
  }
  return order.map((group) => ({ group, items: buckets.get(group) ?? [] }));
}
