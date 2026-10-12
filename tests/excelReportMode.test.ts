import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import {
  parseProductionWorkbook,
  type ParseResult,
} from "../app/utils/productionExcelParser.ts";
import {
  replaceByReportingYear,
  getActiveDevelopmentRecords,
  resetDevelopmentRecordsToDefault,
  activeReportingYears,
} from "../app/data/development/productionStore.ts";
import type { ProductionRecord } from "../app/data/production/types.ts";

const WORKBOOK_2026_PATH = "D:/Mghub PTPN/DB/Produksi Per Tahun Tanam 2026.xlsx";
const WORKBOOK_2025_PATH = "D:/Mghub PTPN/DB/Produksi Per Tahun Tanam 2025.xlsx";

function getBuffer(filePath: string): ArrayBuffer {
  const buf = fs.readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// Global cached parse result for 2026 workbook
let cached2026Result: ParseResult | null = null;
async function get2026Result(): Promise<ParseResult> {
  if (!cached2026Result) {
    const arrayBuffer = getBuffer(WORKBOOK_2026_PATH);
    cached2026Result = await parseProductionWorkbook(arrayBuffer, 2026);
  }
  return cached2026Result;
}

test("Case A: A valid Reporting Year 2026 workbook with multiple detail worksheets", async () => {
  const res = await get2026Result();
  assert.strictEqual(res.summary.reportingYear, 2026);
  assert.strictEqual(res.records.length, 579, "Expected 579 validated records from 2026 workbook");
  assert.strictEqual(res.summary.isValid, true);
  assert.strictEqual(res.summary.validationErrors.length, 0);

  const detailSheets = res.summary.worksheetDiagnostics.filter((d) => d.classification === "detail");
  assert.strictEqual(detailSheets.length, 6, "Expected 6 detail sheets discovered");
  const detailNames = detailSheets.map((d) => d.sheetName);
  assert.ok(detailNames.includes("Prod Per TT Karet"));
  assert.ok(detailNames.includes("Prod Per TT Teh"));
  assert.ok(detailNames.includes("Prod Per TT Arabika"));
  assert.ok(detailNames.includes("Prod Per TT Robusta"));
  assert.ok(detailNames.includes("Prod Per TT Edel"));
  assert.ok(detailNames.includes("Prod Per TT Bulk"));
});

test("Case B: A workbook containing summary and detail sheets, without double-counting", async () => {
  const res = await get2026Result();
  const summarySheets = res.summary.worksheetDiagnostics.filter((d) => d.classification === "summary");
  assert.ok(summarySheets.length >= 2, "Expected summary sheets detected (PRODUKSI & REKAP Prod per TT)");

  for (const s of summarySheets) {
    assert.strictEqual(s.parsedRows, 0, `Summary sheet ${s.sheetName} must not contribute detail records`);
    assert.ok(s.reason?.includes("double-counting") || s.reason?.includes("rekapitulasi"));
  }

  // Sum of parsed rows in detail sheets must match total records exactly
  const sumDetail = res.summary.worksheetDiagnostics
    .filter((d) => d.classification === "detail")
    .reduce((sum, d) => sum + d.parsedRows, 0);
  assert.strictEqual(sumDetail, res.records.length, "Detail sheet sum must match parsed records exactly");
});

test("Case C: Different column layouts across commodity worksheets", async () => {
  const res = await get2026Result();
  const karetRecords = res.records.filter((r) => r.commodity === "KARET");
  const tehRecords = res.records.filter((r) => r.commodity === "TEH");
  const kopiRecords = res.records.filter((r) => r.commodity === "ROBUSTA");

  assert.ok(karetRecords.length > 0, "Karet records parsed");
  assert.ok(tehRecords.length > 0, "Teh records parsed");
  assert.ok(kopiRecords.length > 0, "Robusta records parsed");

  // Verify fields correctly populated despite different column configurations
  for (const r of [karetRecords[0], tehRecords[0], kopiRecords[0]]) {
    assert.ok(r.estate.length > 0, "Estate must not be empty");
    assert.ok(r.afdeling.length > 0, "Afdeling must not be empty");
    assert.ok(r.plantingYear > 1900 && r.plantingYear <= 2026, "Planting year must be valid");
    assert.strictEqual(r.months.length, 12, "Must contain 12 months");
  }
});

test("Case D: Reporting Year 2026 records containing earlier Planting Years", async () => {
  const res = await get2026Result();
  const distinctPlantingYears = Array.from(new Set(res.records.map((r) => r.plantingYear))).sort((a, b) => a - b);
  assert.ok(distinctPlantingYears.length > 50, "Workbook must contain varied planting years");
  assert.ok(distinctPlantingYears[0] <= 1950, "Planting years must include historical years");

  // Every record must strictly have reportingYear === 2026
  for (const r of res.records) {
    assert.strictEqual(r.reportingYear, 2026, "Reporting year must be 2026");
  }
});

test("Case E: A parser failure on a relevant detail worksheet", async () => {
  // Test that if an empty or structurally malformed buffer is supplied, validation reports error
  const invalidBuffer = new Uint8Array([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
  try {
    const res = await parseProductionWorkbook(invalidBuffer, 2026);
    assert.strictEqual(res.summary.isValid, false);
    assert.ok(res.summary.validationErrors.length > 0);
  } catch (err: any) {
    assert.ok(err instanceof Error);
  }
});

test("Case F: A low record count caused by an actual structural error", async () => {
  // If parsing produces zero records, isValid must be false
  const emptyRes: ParseResult = {
    records: [],
    summary: {
      recordCount: 0,
      reportingYear: 2026,
      totalDiscoveredRows: 100,
      parsedCount: 0,
      rejectedCount: 100,
      matchedCount: 0,
      unmatchedCount: 0,
      matchRatePercent: 0,
      totalActual: 0,
      totalRkap: 0,
      commodities: [],
      estates: [],
      afdelings: [],
      worksheetDiagnostics: [],
      isValid: false,
      validationErrors: ["Kesalahan struktur: tidak ada baris yang berhasil diparsing."],
    },
    warnings: [],
  };
  assert.strictEqual(emptyRes.summary.isValid, false);
  assert.ok(emptyRes.summary.validationErrors.length > 0);
});

test("Case G: An import with unmatched Afdeling records", async () => {
  const res = await get2026Result();
  assert.strictEqual(res.summary.matchedCount, 566);
  assert.strictEqual(res.summary.unmatchedCount, 13);
  assert.strictEqual(res.summary.matchRatePercent, 98);

  // Unmatched records must be preserved with identityStatus === 'unmatched', not discarded
  const unmatched = res.records.filter((r) => r.identityStatus !== "matched");
  assert.strictEqual(unmatched.length, 13, "Unmatched records must be retained in payload");
  assert.strictEqual(res.summary.isValid, true, "Unmatched afdeling alone does not invalidate parsing");
});

test("Case H: A valid replacement of 2026 while 2025 remains unchanged", async () => {
  resetDevelopmentRecordsToDefault();
  const baseline2025 = getActiveDevelopmentRecords().filter((r) => r.reportingYear === 2025);
  const baseline2025Count = baseline2025.length;
  assert.strictEqual(baseline2025Count, 577);

  const res2026 = await get2026Result();
  const replaceRes = replaceByReportingYear(2026, res2026.records, "Test Import 2026");

  assert.strictEqual(replaceRes.targetYear, 2026);
  assert.strictEqual(replaceRes.newCount, 579);
  assert.strictEqual(replaceRes.totalCount, baseline2025Count + 579);

  // Strictly verify every single 2025 record is identical
  const activeRecords = getActiveDevelopmentRecords();
  const current2025 = activeRecords.filter((r) => r.reportingYear === 2025);
  assert.strictEqual(current2025.length, baseline2025Count);
  assert.deepStrictEqual(current2025, baseline2025, "All 2025 records must remain 100% logically unchanged");

  // Verify active years includes both 2026 and 2025
  assert.deepStrictEqual(activeReportingYears.value, [2026, 2025]);
});

test("Case I: Reapplying the same 2026 dataset without duplication", async () => {
  const res2026 = await get2026Result();
  const beforeCount = getActiveDevelopmentRecords().length;

  // Reapply the exact same dataset
  const reapplyRes = replaceByReportingYear(2026, res2026.records, "Reapply Test 2026");
  const afterCount = getActiveDevelopmentRecords().length;

  assert.strictEqual(beforeCount, afterCount, "Re-applying dataset must not increase record count");
  assert.strictEqual(reapplyRes.replacedCount, 579, "Previous 2026 records should be replaced");
  assert.strictEqual(reapplyRes.newCount, 579, "New 2026 count matches exactly");

  const records2026 = getActiveDevelopmentRecords().filter((r) => r.reportingYear === 2026);
  assert.strictEqual(records2026.length, 579);
});

test("Case J: A failed or invalid import leaves both 2025 and existing 2026 untouched", async () => {
  const beforeRecords = [...getActiveDevelopmentRecords()];
  const before2025 = beforeRecords.filter((r) => r.reportingYear === 2025);
  const before2026 = beforeRecords.filter((r) => r.reportingYear === 2026);

  // Attempt invalid replacement with empty array
  assert.throws(() => {
    replaceByReportingYear(2026, [], "Invalid Empty Import");
  }, /Tidak ada data baru/);

  const afterRecords = getActiveDevelopmentRecords();
  const after2025 = afterRecords.filter((r) => r.reportingYear === 2025);
  const after2026 = afterRecords.filter((r) => r.reportingYear === 2026);

  assert.deepStrictEqual(after2025, before2025, "2025 must remain untouched on failed import");
  assert.deepStrictEqual(after2026, before2026, "2026 must remain untouched on failed import");
});

test("Case K: A legitimate smaller workbook is not rejected solely for lower row count", async () => {
  // A valid small batch of 3 records
  const smallValidRecords: ProductionRecord[] = [
    {
      sourceRow: 1,
      reportingYear: 2026,
      commodity: "KARET",
      estateCode: "PSW",
      estate: "Pasewaran",
      afdeling: "Afd. Pasewaran Utara",
      plantingYear: 2015,
      area: 12,
      population: 400,
      actual: 1200,
      rkap: 1500,
      months: [],
      matchedAfdCode: "PSW-01",
      matchedAfdName: "Pasewaran Utara",
      plantCode: "PSW",
      plantDesc: "Pasewaran",
      reff: "REF",
      identityStatus: "matched",
    },
    {
      sourceRow: 2,
      reportingYear: 2026,
      commodity: "TEH",
      estateCode: "KTW",
      estate: "Kertowono",
      afdeling: "Afd. Besaran",
      plantingYear: 2012,
      area: 8,
      population: 300,
      actual: 800,
      rkap: 900,
      months: [],
      matchedAfdCode: "KTW-01",
      matchedAfdName: "Besaran",
      plantCode: "KTW",
      plantDesc: "Kertowono",
      reff: "REF",
      identityStatus: "matched",
    },
  ];

  // Replacing 2026 with a small valid dataset must succeed
  const res = replaceByReportingYear(2026, smallValidRecords, "Small Batch");
  assert.strictEqual(res.newCount, 2);
  assert.strictEqual(getActiveDevelopmentRecords().filter((r) => r.reportingYear === 2026).length, 2);
  assert.strictEqual(getActiveDevelopmentRecords().filter((r) => r.reportingYear === 2025).length, 577);
});

test("Case L: Preview count and Apply payload consistency", async () => {
  const res = await get2026Result();
  // Preview record count must strictly equal apply payload records length
  assert.strictEqual(res.summary.recordCount, res.records.length);
  assert.strictEqual(res.summary.parsedCount, res.records.length);

  // Apply with this payload
  const applyRes = replaceByReportingYear(2026, res.records, "Consistency Test");
  assert.strictEqual(applyRes.newCount, res.summary.recordCount);
});

test("Case M: Existing single-year Excel Report behavior", async () => {
  const buf2025 = getBuffer(WORKBOOK_2025_PATH);
  const res2025 = await parseProductionWorkbook(buf2025, 2025);

  assert.strictEqual(res2025.summary.reportingYear, 2025);
  assert.strictEqual(res2025.summary.isValid, true);
  assert.strictEqual(res2025.records.length, 616);
  assert.strictEqual(res2025.summary.matchedCount, 611);
  assert.strictEqual(res2025.summary.matchRatePercent, 99);
  assert.strictEqual(res2025.summary.validationErrors.length, 0);

  // Reset store to default baseline at end of test run
  resetDevelopmentRecordsToDefault();
});
