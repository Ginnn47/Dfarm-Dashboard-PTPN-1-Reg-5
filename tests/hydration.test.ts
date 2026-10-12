import test from "node:test";
import assert from "node:assert";
import {
  initDevelopmentStore,
  getActiveDevelopmentRecords,
  resetDevelopmentRecordsToDefault,
  replaceByReportingYear,
  useDevelopmentStore,
  STORAGE_KEY,
  preset2026ProductionRecords,
} from "../app/data/development/productionStore.ts";
import { developmentProductionRecords } from "../app/data/development/fixtures/production2025.ts";
import { getDataSource } from "../app/data/sources/index.ts";

// Helper to construct a mock localStorage
function createMockStorage(initialData: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initialData));
  return {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    _getRaw(key: string): string | null {
      return store.get(key) || null;
    },
  };
}

test("Hydration Test 1: SSR boundary safety (no window)", () => {
  const originalWindow = (globalThis as any).window;
  delete (globalThis as any).window;

  try {
    const result = initDevelopmentStore(true);
    assert.strictEqual(result, false, "initDevelopmentStore must return false and exit safely on SSR");
  } finally {
    if (originalWindow !== undefined) {
      (globalThis as any).window = originalWindow;
    }
  }
});

test("Hydration Test 2: Fresh browser state with no persisted snapshot", () => {
  const mockStorage = createMockStorage();
  (globalThis as any).window = { localStorage: mockStorage };

  resetDevelopmentRecordsToDefault();
  assert.strictEqual(mockStorage.getItem(STORAGE_KEY), null);

  const result = initDevelopmentStore(true);
  assert.strictEqual(result, true);

  const records = getActiveDevelopmentRecords();
  assert.strictEqual(records.length, 577, "Baseline 2025 records must be preserved");
  assert.strictEqual(records.every((r) => r.reportingYear === 2025), true);

  const store = useDevelopmentStore();
  assert.strictEqual(store.isCustomDataActive.value, false);
  assert.strictEqual(store.isHydrated.value, true);
});

test("Hydration Test 3: Startup restoration of 2026 imported data without visiting data-source", () => {
  const mockStorage = createMockStorage();
  (globalThis as any).window = { localStorage: mockStorage };

  resetDevelopmentRecordsToDefault();

  // Simulate previously imported 2026 records saved in storage
  const sample2026 = preset2026ProductionRecords.slice(0, 10);
  const combined = [...developmentProductionRecords, ...sample2026];
  mockStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      description: "Data 2026 Diimpor (Test Snapshot)",
      records: combined,
    })
  );

  const hydrated = initDevelopmentStore(true);
  assert.strictEqual(hydrated, true);

  const active = getActiveDevelopmentRecords();
  assert.strictEqual(active.length, 587, "Must restore both 2025 (577) and 2026 (10) records");
  assert.strictEqual(active.filter((r) => r.reportingYear === 2025).length, 577);
  assert.strictEqual(active.filter((r) => r.reportingYear === 2026).length, 10);

  const store = useDevelopmentStore();
  assert.strictEqual(store.isCustomDataActive.value, true);
  assert.strictEqual(store.isHydrated.value, true);
  assert.ok(store.activeYearsLabel.value.includes("2026"));
  assert.ok(store.activeYearsLabel.value.includes("2025"));
});

test("Hydration Test 4: Repeated initialization is idempotent and prevents duplicate records", () => {
  const mockStorage = createMockStorage();
  (globalThis as any).window = { localStorage: mockStorage };

  const sample2026 = preset2026ProductionRecords.slice(0, 5);
  const combined = [...developmentProductionRecords, ...sample2026];
  mockStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      description: "Snapshot Idempotency",
      records: combined,
    })
  );

  // First call (force = true to re-arm)
  initDevelopmentStore(true);
  const countAfterFirst = getActiveDevelopmentRecords().length;
  assert.strictEqual(countAfterFirst, 582);

  // Subsequent calls without force (simulating multiple route/component mounts)
  initDevelopmentStore(false);
  initDevelopmentStore(false);
  initDevelopmentStore(false);

  const countAfterRepeated = getActiveDevelopmentRecords().length;
  assert.strictEqual(countAfterRepeated, 582, "Record count must remain unchanged after repeated initialization");
});

test("Hydration Test 5: Malformed JSON in storage is handled safely without crashing or destroying data", () => {
  const mockStorage = createMockStorage();
  (globalThis as any).window = { localStorage: mockStorage };

  // Reset to clean state first
  resetDevelopmentRecordsToDefault();

  // Then inject corrupted data into storage
  const malformedString = '{"description": "Corrupted", "records": [BROKEN_JSON_HERE';
  mockStorage.setItem(STORAGE_KEY, malformedString);

  // Should catch SyntaxError and safely fallback to baseline without throwing
  assert.doesNotThrow(() => {
    initDevelopmentStore(true);
  });

  const records = getActiveDevelopmentRecords();
  assert.strictEqual(records.length, 577, "Should safely fall back to 2025 baseline");
  assert.strictEqual(
    mockStorage._getRaw(STORAGE_KEY),
    malformedString,
    "Must NOT delete or overwrite the original stored value on parse error"
  );
});

test("Hydration Test 6: Inaccessible or restricted localStorage (SecurityError / Incognito)", () => {
  (globalThis as any).window = {
    get localStorage() {
      throw new Error("SecurityError: Access to localStorage is denied");
    },
  };

  assert.doesNotThrow(() => {
    resetDevelopmentRecordsToDefault();
  });

  assert.doesNotThrow(() => {
    initDevelopmentStore(true);
  });

  const records = getActiveDevelopmentRecords();
  assert.strictEqual(records.length, 577, "Should safely preserve baseline records when storage throws");
});

test("Hydration Test 7: Round-trip replacement, persistence, and cold rehydration", () => {
  const mockStorage = createMockStorage();
  (globalThis as any).window = { localStorage: mockStorage };

  resetDevelopmentRecordsToDefault();

  // Import full 2026 preset (577 rows)
  const replaceRes = replaceByReportingYear(2026, preset2026ProductionRecords, "Import 2026 Full");
  assert.strictEqual(replaceRes.totalCount, 1154);

  // Verify stored JSON matches
  const storedRaw = mockStorage.getItem(STORAGE_KEY);
  assert.ok(storedRaw !== null);
  const parsedStorage = JSON.parse(storedRaw!);
  assert.strictEqual(parsedStorage.records.length, 1154);

  // Simulate a cold reload by resetting in-memory records then rehydrating from storage
  resetDevelopmentRecordsToDefault();
  mockStorage.setItem(STORAGE_KEY, storedRaw!);

  const rehydrated = initDevelopmentStore(true);
  assert.strictEqual(rehydrated, true);

  const restored = getActiveDevelopmentRecords();
  assert.strictEqual(restored.length, 1154, "Must faithfully restore 1154 combined records");
  assert.strictEqual(restored.filter((r) => r.reportingYear === 2025).length, 577);
  assert.strictEqual(restored.filter((r) => r.reportingYear === 2026).length, 577);
});

test("Hydration Test 8: Source abstraction and Google Sheets isolation", () => {
  const mockStorage = createMockStorage();
  (globalThis as any).window = { localStorage: mockStorage };

  initDevelopmentStore(true);

  // Google Sheets source must strictly remain disconnected and empty
  const gsSource = getDataSource("google-sheets");
  assert.strictEqual(gsSource.getStatus(), "not-connected");
  assert.deepStrictEqual(gsSource.getRecords(), []);

  // Development source must return the active hydrated records
  const devSource = getDataSource("development");
  assert.strictEqual(devSource.getStatus(), "available");
  assert.strictEqual(devSource.getRecords().length, getActiveDevelopmentRecords().length);
});