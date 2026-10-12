import test from "node:test";
import assert from "node:assert";
import {
  DEFAULT_KPIS,
  DEFAULT_PRODUCTION_KPIS,
  COMPONENT_IMPACT_DESCRIPTIONS,
  ALL_DASHBOARD_COMPONENTS,
  KPI_STORAGE_KEY,
  LEGACY_KPI_STORAGE_KEY,
  getSupportedDisplayUnits,
  useKpiManagement,
} from "../app/composables/useKpiManagement.ts";

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
  };
}

test("KPI Management Test 1: Exactly 8 canonical KPIs defined for Production", () => {
  assert.strictEqual(DEFAULT_PRODUCTION_KPIS.length, 8);
  assert.strictEqual(DEFAULT_KPIS.length, 8);
  const codes = DEFAULT_PRODUCTION_KPIS.map((k) => k.code);
  assert.ok(codes.includes("PROD_ACTUAL"));
  assert.ok(codes.includes("PROD_RKAP"));
  assert.ok(codes.includes("PROD_ACHV"));
  assert.ok(codes.includes("PROD_VAR"));
  assert.ok(codes.includes("PROD_PROT"));
  assert.ok(codes.includes("PROD_MONTHLY"));
  assert.ok(codes.includes("PROD_ESTATE"));
  assert.ok(codes.includes("PROD_PEAK"));
});

test("KPI Management Test 2: Dashboard impact descriptions are defined for all components", () => {
  assert.strictEqual(ALL_DASHBOARD_COMPONENTS.length, 6);
  assert.ok(ALL_DASHBOARD_COMPONENTS.includes("Metric Card"));
  assert.ok(ALL_DASHBOARD_COMPONENTS.includes("Production Data Stream"));
  assert.ok(ALL_DASHBOARD_COMPONENTS.includes("Tren Produksi"));
  assert.ok(ALL_DASHBOARD_COMPONENTS.includes("Kontribusi Produksi per Kebun"));
  assert.ok(ALL_DASHBOARD_COMPONENTS.includes("Realisasi vs RKAP"));
  assert.ok(ALL_DASHBOARD_COMPONENTS.includes("Sorotan Analisis"));

  for (const comp of ALL_DASHBOARD_COMPONENTS) {
    const desc = COMPONENT_IMPACT_DESCRIPTIONS[comp];
    assert.ok(desc && desc.length > 10, `Component ${comp} must have a descriptive impact text`);
  }
});

test("KPI Management Test 3: Validation rules reject invalid names, codes, or empty units", () => {
  const mockStorage = createMockStorage();
  (globalThis as any).window = { localStorage: mockStorage };

  const { updateKpi, resetAllToDefaults, setDomain } = useKpiManagement();
  setDomain("production");
  resetAllToDefaults();

  // Test empty name
  const resEmptyName = updateKpi("total-actual", { name: "   " });
  assert.strictEqual(resEmptyName.success, false);
  assert.ok(resEmptyName.error?.includes("Nama KPI tidak boleh kosong"));

  // Test invalid code format
  const resInvalidCode = updateKpi("total-actual", { code: "invalid code!" });
  assert.strictEqual(resInvalidCode.success, false);
  assert.ok(resInvalidCode.error?.includes("Kode KPI harus 3-20 karakter"));

  // Test empty unit
  const resEmptyUnit = updateKpi("total-actual", { unit: "" });
  assert.strictEqual(resEmptyUnit.success, false);
  assert.ok(resEmptyUnit.error?.includes("Satuan tampilan tidak boleh kosong"));

  // Test invalid order
  const resInvalidOrder = updateKpi("total-actual", { order: -5 });
  assert.strictEqual(resInvalidOrder.success, false);
  assert.ok(resInvalidOrder.error?.includes("Urutan"));
});

test("KPI Management Test 4: Calculation policy, sourceField, and components are developer-controlled (immutable)", () => {
  const mockStorage = createMockStorage();
  (globalThis as any).window = { localStorage: mockStorage };

  const { updateKpi, kpiList, resetAllToDefaults, setDomain } = useKpiManagement();
  setDomain("production");
  resetAllToDefaults();

  const originalSource = kpiList.value.find((k) => k.id === "total-actual")?.sourceField;
  const originalPolicy = kpiList.value.find((k) => k.id === "total-actual")?.calculationPolicy;

  // Attempt to overwrite immutable properties
  const res = updateKpi("total-actual", {
    name: "Total Produksi Modifikasi",
    displayAlias: "Prod Netto",
    sourceField: "hacked_source",
    calculationPolicy: "hacked_policy",
    domainId: "finance",
    baseUnit: "Ton",
    numeratorComponent: "hacked_num",
  } as any);

  assert.strictEqual(res.success, true);
  const updated = kpiList.value.find((k) => k.id === "total-actual");
  assert.strictEqual(updated?.name, "Total Produksi Modifikasi");
  assert.strictEqual(updated?.displayAlias, "Prod Netto");
  assert.strictEqual(updated?.sourceField, originalSource, "sourceField must remain immutable");
  assert.strictEqual(updated?.calculationPolicy, originalPolicy, "calculationPolicy must remain immutable");
  assert.strictEqual(updated?.domainId, "production", "domainId must remain immutable");
  assert.strictEqual(updated?.baseUnit, "Kg", "baseUnit must remain immutable");
});

test("KPI Management Test 5: Visibility toggle and domain-isolated local persistence", () => {
  const mockStorage = createMockStorage();
  (globalThis as any).window = { localStorage: mockStorage };

  const { toggleVisibility, kpiList, resetAllToDefaults, setDomain } = useKpiManagement();
  setDomain("production");
  resetAllToDefaults();

  const item = kpiList.value.find((k) => k.id === "total-rkap")!;
  const initialVis = item.visible;

  toggleVisibility("total-rkap");
  assert.strictEqual(item.visible, !initialVis);

  // Check saved in mock storage under v2 key
  const raw = mockStorage.getItem(KPI_STORAGE_KEY);
  assert.ok(raw !== null);
  const parsed = JSON.parse(raw!);
  const persistedList = Array.isArray(parsed) ? parsed : parsed.production;
  const persistedItem = persistedList.find((k: any) => k.id === "total-rkap");
  assert.strictEqual(persistedItem.visible, !initialVis);
});

test("KPI Management Test 6: Multi-domain isolation and unconfigured domain handling", () => {
  const mockStorage = createMockStorage();
  (globalThis as any).window = { localStorage: mockStorage };

  const {
    domains,
    selectedDomainId,
    setDomain,
    currentDomainKpis,
    updateKpi,
    resetAllToDefaults,
  } = useKpiManagement();

  resetAllToDefaults();

  // Verify all 4 canonical domains are present
  assert.strictEqual(domains.length, 4);
  const domainIds = domains.map((d) => d.id);
  assert.ok(domainIds.includes("production"));
  assert.ok(domainIds.includes("finance"));
  assert.ok(domainIds.includes("investment-on-farm"));
  assert.ok(domainIds.includes("investment-off-farm"));

  // Check initial Production domain has 8 KPIs
  setDomain("production");
  assert.strictEqual(selectedDomainId.value, "production");
  assert.strictEqual(currentDomainKpis.value.length, 8);

  // Switch to Finance domain
  setDomain("finance");
  assert.strictEqual(selectedDomainId.value, "finance");
  // Finance is intentionally empty to prevent fabricating fake calculations
  assert.strictEqual(currentDomainKpis.value.length, 0);

  // Switch to Investment On Farm
  setDomain("investment-on-farm");
  assert.strictEqual(currentDomainKpis.value.length, 0);

  // Switch to Investment Off Farm
  setDomain("investment-off-farm");
  assert.strictEqual(currentDomainKpis.value.length, 0);

  // Modifying Production must not leak to Finance
  setDomain("production");
  const updateRes = updateKpi("total-actual", { name: "Produksi Sawit Inti" });
  assert.strictEqual(updateRes.success, true);

  setDomain("finance");
  assert.strictEqual(currentDomainKpis.value.length, 0);
});

test("KPI Management Test 7: Semantic aggregation policy enforcement (Snapshot & Ratio)", () => {
  const mockStorage = createMockStorage();
  (globalThis as any).window = { localStorage: mockStorage };

  const { updateKpi, kpiList, resetAllToDefaults, setDomain } = useKpiManagement();
  setDomain("production");
  resetAllToDefaults();

  // Rule 1: Snapshot indicator CANNOT use periodAggregation = 'sum'
  const resSnapshotInvalid = updateKpi("total-actual", {
    semanticType: "snapshot",
    periodAggregation: "sum",
  });
  assert.strictEqual(resSnapshotInvalid.success, false);
  assert.ok(resSnapshotInvalid.error?.includes("Snapshot"));
  assert.ok(resSnapshotInvalid.error?.includes("Sum"));

  // Valid snapshot configuration (e.g. latest or average) must succeed
  const resSnapshotValid = updateKpi("total-actual", {
    semanticType: "snapshot",
    periodAggregation: "latest",
    categoryAggregation: "sum",
  });
  assert.strictEqual(resSnapshotValid.success, true);
  const updatedSnapshot = kpiList.value.find((k) => k.id === "total-actual");
  assert.strictEqual(updatedSnapshot?.semanticType, "snapshot");
  assert.strictEqual(updatedSnapshot?.periodAggregation, "latest");

  // Rule 2: Ratio indicator CANNOT use periodAggregation = 'sum'
  const resRatioInvalidPeriod = updateKpi("achievement", {
    semanticType: "ratio",
    periodAggregation: "sum",
  });
  assert.strictEqual(resRatioInvalidPeriod.success, false);
  assert.ok(resRatioInvalidPeriod.error?.includes("Rasio"));

  // Rule 3: Ratio indicator CANNOT use categoryAggregation = 'sum'
  const resRatioInvalidCategory = updateKpi("achievement", {
    semanticType: "ratio",
    categoryAggregation: "sum",
  });
  assert.strictEqual(resRatioInvalidCategory.success, false);
  assert.ok(resRatioInvalidCategory.error?.includes("Rasio"));

  // Valid ratio configuration (recalculate) must succeed
  const resRatioValid = updateKpi("achievement", {
    semanticType: "ratio",
    categoryAggregation: "recalculate",
    periodAggregation: "recalculate",
  });
  assert.strictEqual(resRatioValid.success, true);
});

test("KPI Management Test 8: Unit compatibility, supported display units, and conversion factor scaling", () => {
  const mockStorage = createMockStorage();
  (globalThis as any).window = { localStorage: mockStorage };

  const { updateKpi, kpiList, resetAllToDefaults, setDomain } = useKpiManagement();
  setDomain("production");
  resetAllToDefaults();

  // getSupportedDisplayUnits check
  const kgUnits = getSupportedDisplayUnits("Kg");
  assert.strictEqual(kgUnits.length, 2);
  assert.deepStrictEqual(kgUnits.map((u) => u.unit), ["Kg", "Ton"]);
  const tonConversion = kgUnits.find((u) => u.unit === "Ton");
  assert.strictEqual(tonConversion?.factor, 1000);

  // Incompatible unit conversion: Kg cannot be converted to %
  const resIncompatible = updateKpi("total-actual", { unit: "%" });
  assert.strictEqual(resIncompatible.success, false);
  assert.ok(resIncompatible.error?.includes("tidak kompatibel"));

  // Incompatible unit conversion: % cannot be converted to Kg
  const resIncompatiblePercent = updateKpi("achievement", { unit: "Kg" });
  assert.strictEqual(resIncompatiblePercent.success, false);
  assert.ok(resIncompatiblePercent.error?.includes("tidak kompatibel"));

  // Compatible conversion: Kg to Ton must update conversionFactor to 1000
  const resValidConvert = updateKpi("total-actual", { unit: "Ton" });
  assert.strictEqual(resValidConvert.success, true);
  const updatedActual = kpiList.value.find((k) => k.id === "total-actual");
  assert.strictEqual(updatedActual?.unit, "Ton");
  assert.strictEqual(updatedActual?.conversionFactor, 1000);
});

test("KPI Management Test 9: Storage initialization and legacy v1 fallback migration", () => {
  const legacyV1Data = [
    {
      id: "total-actual",
      name: "Total Panen Kelapa Sawit (Legacy)",
      unit: "Kg",
      visible: true,
      order: 1,
    },
  ];

  const mockStorage = createMockStorage({
    [LEGACY_KPI_STORAGE_KEY]: JSON.stringify(legacyV1Data),
  });
  (globalThis as any).window = { localStorage: mockStorage };

  const { initFromStorage, currentDomainKpis, setDomain } = useKpiManagement();
  setDomain("production");
  initFromStorage(true);

  const migrated = currentDomainKpis.value.find((k) => k.id === "total-actual");
  assert.ok(migrated !== undefined);
  assert.strictEqual(migrated?.name, "Total Panen Kelapa Sawit (Legacy)");
  assert.strictEqual(migrated?.domainId, "production");
  assert.strictEqual(migrated?.code, "PROD_ACTUAL");
});
