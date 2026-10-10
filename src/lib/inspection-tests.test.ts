import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INSPECTION_TEST_BATTERY,
  TEST_IDS,
  TEST_RESULT_LABEL,
  blobResult,
  deriveTestMap,
  groupTests,
  hasSavedTests,
  hardwareBlob,
  isTestResult,
  normalizeTestResult,
  resolveInspectionTests,
  summarizeTests,
  tempResult,
  testsFromResolved,
  verdictConsistency,
  type TestSource,
} from "./inspection-tests.ts";
import { SAMPLE_REPORT } from "./used.ts";
import { SEED_REPORTS } from "./ops-seed.ts";

const clean: TestSource = {
  hardware: [
    ["CPU", "Ryzen 5 5600", "Matches listing"],
    ["GPU", "RTX 4060 8GB", "Serial matches"],
    ["RAM", "16 GB DDR4", "Stable 1 pass"],
    ["Storage", "1 TB NVMe", "SMART 94%"],
    ["Motherboard", "B550", "No VRM burn"],
    ["PSU", "Bronze 650W", "OK"],
  ],
  temps: { cpuIdle: 38, cpuLoad: 72, gpuIdle: 40, gpuLoad: 68 },
  issues: [],
};

describe("inspection test battery", () => {
  it("covers the full CHECKMYPC on-site checklist", () => {
    assert.equal(INSPECTION_TEST_BATTERY.length, 23);
    assert.deepEqual(
      [...new Set(TEST_IDS)].sort(),
      [...TEST_IDS].sort(),
      "test ids must be unique",
    );
    const groups = new Set(INSPECTION_TEST_BATTERY.map((t) => t.group));
    for (const g of ["CPU", "GPU", "Memory", "Storage", "Board", "Power", "Cooling", "Ports", "Network", "Physical"]) {
      assert.ok(groups.has(g), `missing group ${g}`);
    }
    for (const id of [
      "cpu-id",
      "cpu-temp",
      "cpu-stable",
      "gpu-id",
      "gpu-temp",
      "gpu-stable",
      "gpu-game",
      "ram-size",
      "ram-stable",
      "ssd-health",
      "hdd-health",
      "mb-visual",
      "mb-bios",
      "psu",
      "cooling",
      "fans",
      "noise",
      "usb",
      "display",
      "network",
      "wifi",
      "bluetooth",
      "physical",
    ]) {
      assert.ok(TEST_IDS.includes(id), `missing ${id}`);
    }
  });

  it("normalizes unknown results to N/A", () => {
    assert.equal(isTestResult("pass"), true);
    assert.equal(isTestResult("maybe"), false);
    assert.equal(normalizeTestResult("fail"), "fail");
    assert.equal(normalizeTestResult("nope"), "na");
    assert.equal(TEST_RESULT_LABEL.pass, "PASS");
    assert.equal(TEST_RESULT_LABEL.na, "N/A");
  });
});

describe("blob and temperature scoring", () => {
  it("scores hardware notes", () => {
    assert.equal(blobResult(""), "na");
    assert.equal(blobResult("   "), "na");
    assert.equal(blobResult("Matches listing"), "pass");
    assert.equal(blobResult("Unbranded 500W — underspec, replace"), "fail");
    assert.equal(blobResult("Front USB intermittent"), "warn");
    assert.equal(blobResult("GPU-Z mismatch — fake shroud"), "fail");
  });

  it("scores temperatures", () => {
    assert.equal(tempResult(0, 0), "na");
    assert.equal(tempResult(72, 38), "pass");
    assert.equal(tempResult(82, 40), "warn");
    assert.equal(tempResult(91, 48), "fail");
    assert.equal(tempResult(0, 81), "warn");
  });

  it("reads hardware rows by part name", () => {
    assert.match(hardwareBlob(clean, "psu"), /Bronze 650W/);
    assert.equal(hardwareBlob(clean, "case"), "");
  });
});

describe("deriveTestMap", () => {
  it("passes a clean build on identity, temps and PSU", () => {
    const map = deriveTestMap(clean);
    assert.equal(map["cpu-id"].result, "pass");
    assert.equal(map["gpu-id"].result, "pass");
    assert.equal(map["cpu-temp"].result, "pass");
    assert.equal(map["gpu-temp"].result, "pass");
    assert.equal(map.psu.result, "pass");
    assert.equal(map["hdd-health"].result, "na");
  });

  it("flags a fake GPU and unsafe PSU as FAIL", () => {
    const map = deriveTestMap({
      hardware: [
        ["CPU", "Listed as i7 (unverified)", "Could not confirm"],
        ["GPU", "GTX 1660 Super with 3070 shroud", "GPU-Z mismatch — fake"],
        ["PSU", "Unbranded 400W", "Unsafe — replace"],
        ["Storage", "500 GB used HDD", "SMART 71%"],
      ],
      temps: { cpuIdle: 48, cpuLoad: 88, gpuIdle: 52, gpuLoad: 84 },
      issues: ["GPU-Z read as a 1660 Super with a 3070 shroud. Do not buy."],
    });
    assert.equal(map["cpu-id"].result, "fail");
    assert.equal(map["gpu-id"].result, "fail");
    assert.equal(map["gpu-game"].result, "fail");
    assert.equal(map.psu.result, "fail");
    assert.equal(map["cpu-temp"].result, "warn");
    assert.equal(map["hdd-health"].result, "pass");
  });

  it("maps USB and dust issues onto the right tests", () => {
    const map = deriveTestMap({
      ...clean,
      hardware: [
        ...clean.hardware.filter(([k]) => k !== "PSU"),
        ["PSU", "Unbranded 500W", "Underspec — replace"],
      ],
      issues: ["Front USB-A port intermittent", "Dust on GPU fins (not packed)"],
    });
    assert.equal(map.usb.result, "warn");
    assert.equal(map.cooling.result, "warn");
    assert.equal(map.psu.result, "fail");
  });
});

describe("resolveInspectionTests", () => {
  it("always returns the full battery in catalog order", () => {
    const rows = resolveInspectionTests(SAMPLE_REPORT);
    assert.equal(rows.length, INSPECTION_TEST_BATTERY.length);
    assert.deepEqual(
      rows.map((r) => r.id),
      TEST_IDS,
    );
  });

  it("lets saved tests override derivation", () => {
    const rows = resolveInspectionTests({
      ...clean,
      tests: [{ id: "psu", result: "fail", note: "Tech overrode: rail sag" }],
    });
    const psu = rows.find((r) => r.id === "psu");
    assert.equal(psu?.result, "fail");
    assert.match(psu?.note ?? "", /rail sag/);
    const cpu = rows.find((r) => r.id === "cpu-id");
    assert.equal(cpu?.result, "pass");
  });

  it("ignores an empty tests array and derives instead", () => {
    assert.equal(hasSavedTests([]), false);
    assert.equal(hasSavedTests(undefined), false);
    const rows = resolveInspectionTests({ ...clean, tests: [] });
    assert.equal(rows.find((r) => r.id === "cpu-id")?.result, "pass");
  });

  it("round-trips resolved rows into saved tests", () => {
    const rows = resolveInspectionTests(clean);
    const saved = testsFromResolved(rows);
    assert.equal(saved.length, rows.length);
    assert.equal(saved[0].id, "cpu-id");
  });
});

describe("summaries and verdict consistency", () => {
  it("counts every result", () => {
    const s = summarizeTests([{ result: "pass" }, { result: "pass" }, { result: "fail" }, { result: "na" }, { result: "warn" }]);
    assert.equal(s.pass, 2);
    assert.equal(s.fail, 1);
    assert.equal(s.warn, 1);
    assert.equal(s.na, 1);
    assert.equal(s.scored, 4);
    assert.equal(s.total, 5);
  });

  it("rejects BUY with failures and DON'T BUY with a clean sheet", () => {
    assert.equal(verdictConsistency("BUY", [{ result: "fail" }]).ok, false);
    assert.equal(verdictConsistency("DONT", [{ result: "pass" }]).ok, false);
    assert.equal(verdictConsistency("NEGOTIATE", [{ result: "pass" }]).ok, false);
    assert.equal(verdictConsistency("BUY", [{ result: "pass" }]).ok, true);
    assert.equal(verdictConsistency("DONT", [{ result: "fail" }]).ok, true);
    assert.equal(verdictConsistency("NEGOTIATE", [{ result: "warn" }]).ok, true);
  });

  it("groups tests without dropping items", () => {
    const groups = groupTests(resolveInspectionTests(clean));
    assert.ok(groups.length >= 8);
    assert.equal(
      groups.reduce((n, g) => n + g.items.length, 0),
      INSPECTION_TEST_BATTERY.length,
    );
  });

  it("derives every seed report without throwing", () => {
    for (const report of [SAMPLE_REPORT, ...SEED_REPORTS]) {
      const rows = resolveInspectionTests(report);
      assert.equal(rows.length, 23);
      const s = summarizeTests(rows);
      assert.equal(s.total, 23);
    }
  });
});
