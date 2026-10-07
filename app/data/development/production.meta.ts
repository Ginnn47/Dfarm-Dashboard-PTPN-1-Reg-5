/** Development-only provenance for the canonical production fixture. */
export const productionFixtureMeta = {
  label: 'Development Data',
  workbook: 'Produksi Per Tahun Tanam 2025.xlsx',
  sheet: 'Prod Per TT Karet, Teh, Arabika, Robusta',
  status: 'Local Development Fixture (Afdeling Level)',
  recordCount: 577,
  reportingYear: 2025,
  unit: 'Not specified in the selected sheet',
  sourceFields: {
    rkap: 'Commodity sheets block: Komoditas, Kode Kebun, Kebun/Afdeling, Tahun Tanam, Luas, Populasi, Jan-Dec, Jumlah, Protas',
    actual: 'Commodity sheets block: Komoditas, Kode Kebun, Kebun/Afdeling, Tahun Tanam, Luas, Populasi, Jan-Dec, Jumlah, Protas',
  },
  normalization: [
    'Extracted detailed rows with numeric planting years and authentic Afdeling labels from commodity sheets.',
    'Verified exact 100.0% matching totals with the master rekap: Total Realisasi = 16,589,375 and Total RKAP = 18,945,436.',
    'Excluded headings, JUMLAH subtotal/total rows, blank estate codes or names, blank planting years, and rows where both RKAP and actual total are zero.',
    'Kept monthly actual and RKAP values in chronological order. No source workbook is parsed in the browser.',
    'Afdeling is now directly bound to each block record, enabling authentic afdeling-level filtering, search, and detail tables.',
    'Area and population are positional attributes on each planting-year record; they are not summed across months.',
    'Productivity shown in the dashboard is a weighted value: total actual divided by total area in the filtered context.',
  ],
  cautions: [
    'The 2025 reporting context comes from the supplied workbook filename; it is not a row-level source field.',
    'The selected sheet does not state a unit of measure. Visualizations intentionally do not label production values as kg or ton.',
    'The fixture is for component development only and is not a live production data source or API contract.',
  ],
} as const