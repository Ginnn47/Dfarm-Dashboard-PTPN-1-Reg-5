# DFARM Dashboard — System Architecture

> Version: 0.1
> Status: Approved architectural direction; API and operational details pending
> Frontend: Nuxt + Vue + TypeScript
> UI: Nuxt UI + Tailwind CSS
> Visualization: Apache ECharts
> Table: TanStack Table
> Data Fetching: TanStack Query
> State: Pinia
> Utilities: VueUse
> Backend Architecture: Nuxt Nitro server
> Data Source: Google Sheets API

---

# 1. Purpose

This document defines the technical architecture of the DFARM Dashboard.

The architecture is designed to support:

- regional agricultural data monitoring
- multiple business domains
- Google Sheets as the initial source system
- validation and semantic mapping
- reusable dashboard components
- role-aware access
- future backend replacement if required
- eventual integration into the existing company portal

This document defines system boundaries and technical responsibilities.

It does not define pixel-level visual design. Visual rules belong to `design.md`.

## Initial Integration Scope

The first backend integration targets the Production domain only. It will use
Google Sheets as a read-only source and must preserve the existing Excel import
and local-data workflows. Finance, On-Farm, and Off-Farm remain outside this
initial integration and must not be forced into the Production data model.

No database is required merely to complete the initial local integration.

---

# 2. Core Architectural Principle

The system must separate:

1. Data source
2. Data ingestion
3. Validation
4. Semantic mapping
5. Canonical data
6. Business logic / KPI
7. API contract
8. Frontend presentation

The preferred flow is:

```text
Google Sheets
      |
      v
Google Sheets API
      |
      v
Backend Service
      |
      +-------------------+
      |                   |
      v                   v
Ingestion            Validation
      |                   |
      +---------+---------+
                |
                v
       Semantic Mapping
                |
                v
        Canonical Data
                |
                v
        Business Logic
          / KPI Layer
                |
                v
            REST API
                |
                v
        Nuxt / Vue Frontend
                |
                v
          DFARM Dashboard
```

The frontend must not directly access Google Sheets.

---

# 3. Current Technology Strategy

## 3.1 Frontend

Prototype frontend:

```text
Nuxt
Vue 3
TypeScript
Tailwind CSS
Nuxt UI
```

Supporting libraries:

```text
Apache ECharts
TanStack Table
TanStack Vue Query
Pinia
VueUse
```

The frontend is responsible for:

- page rendering
- navigation
- UI interaction
- filter state
- presentation
- chart rendering
- table rendering
- API consumption
- user-facing loading/error/empty states

The frontend is NOT responsible for:

- Google credentials
- Google Sheets ingestion
- schema validation rules
- semantic mapping logic
- core KPI calculations
- backend authorization decisions

---

# 4. Backend Strategy

Nuxt Nitro is the approved backend architecture for DFARM. The frontend and
backend live in the same Nuxt repository, while Nitro server routes expose the
explicit API contract consumed by the Vue frontend.

```text
Nuxt / Vue frontend
        |
        | REST API contract
        v
Nuxt Nitro server routes
        |
        v
Server-side services
        |
        v
Google Sheets API
```

Server-only operations, including Google credentials, source access,
validation, semantic mapping, and business calculations, must remain in the
Nitro server/service layer. Route handlers should remain thin and delegate to
appropriate server-side services.

The frontend depends on the API contract rather than Nitro implementation
details. Hosting, deployment identity, authentication, caching, and any
future persistence decision remain subject to later operational approval.

---

# 5. Data Source Architecture

The system uses separate Google Sheets documents for different business domains.

Example:

```text
Google Sheets
│
├── Production spreadsheet
├── Finance spreadsheet
├── Investment On Farm spreadsheet
└── Investment Off Farm spreadsheet
```

A business domain is NOT assumed to be a single spreadsheet containing many unrelated tabs.

Each source should have configuration such as:

- source identifier
- spreadsheet ID
- one or more sheet name/range entries when required
- expected schema
- semantic mapping
- validation configuration
- refresh configuration

For Production, a workbook may contain multiple detail tabs for different
commodities plus summary tabs. The backend configures the detail tabs as a
list of qualified source ranges, maps each tab independently, excludes known
summary tabs from canonical records, and deduplicates overlapping records
after combining all detail tabs for the same reporting year.

The application stores source configuration, not a permanent copy of the Google Sheets file.

---

# 6. Google Sheets Integration

The backend communicates with Google Sheets through the Google Sheets API.

Conceptual flow:

```text
Google Sheets
      |
      v
Google Sheets API
      |
      v
Nuxt Nitro ingestion service
      |
      v
raw source data
```

Credentials and service-account/OAuth details must remain on the backend.

They must never be exposed in:

- Vue components
- browser local storage
- frontend environment variables
- public JavaScript bundles

---

# 7. Ingestion Layer

The ingestion layer is responsible for retrieving source data.

Responsibilities:

- connect to configured spreadsheet
- access configured sheet/range
- retrieve header row
- retrieve data rows
- normalize basic source representation
- attach source metadata
- report connection errors

The ingestion layer must not decide business meaning by itself.

Example:

```text
Source header:
"Total Produksi"

Ingestion:
reads the field

Semantic mapping:
decides that it maps to:
"Produksi"
```

---

# 8. Structure Detection

The backend must detect the structure of incoming source data.

Structure detection can inspect:

- header presence
- required columns
- unexpected columns
- duplicate columns
- row availability
- basic data types
- expected source structure

Example canonical Production schema:

```text
Tahun
Bulan
Komoditas
Kebun
Produksi
Satuan
```

If the source contains:

```text
Tahun
Bulan
Komoditas
Kebun
Total Produksi
Satuan
```

the system may identify:

```text
Total Produksi
        |
        v
candidate semantic mapping
        |
        v
Produksi
```

The system should not silently change business meaning.

---

# 9. Semantic Mapping

Semantic mapping translates source-specific labels into canonical fields.

Example:

```text
Source:
"Total Produksi"

       ↓

Canonical:
"Produksi"
```

Possible aliases may include:

```text
Produksi
Total Produksi
Produksi Aktual
Actual Production
```

The mapping layer must distinguish:

- known mappings
- candidate mappings
- unmapped fields
- conflicting mappings

Admin confirmation may be required for ambiguous mappings.

The system must not use machine learning merely to "learn" the spreadsheet structure.

The intended mechanism is controlled:

```text
schema
+
aliases
+
validation
+
semantic mapping
```

---

# 10. Canonical Data Model

Business logic must operate on canonical fields rather than raw source labels.

Example Production canonical model:

```text
ProductionRecord

Tahun
Bulan
Komoditas
Kebun
Produksi
Satuan
```

Example Finance conceptual model:

```text
FinanceRecord

Tahun
Bulan
Kategori
Nilai
Satuan
```

Example Investment conceptual model:

```text
InvestmentRecord

Tahun
Bulan
JenisInvestasi
Kegiatan
NilaiInvestasi
Status
```

These are conceptual starting points and must be refined when actual source schemas are confirmed.

---

# 11. Validation Architecture

Validation is a system responsibility.

It must not be an optional frontend feature.

Validation categories include:

## 11.1 Connectivity

- API accessibility
- authentication
- spreadsheet availability
- sheet availability

## 11.2 Structure

- headers exist
- required fields exist
- unexpected fields detected
- duplicate headers detected

## 11.3 Data Type

Examples:

```text
Tahun -> integer/year
Produksi -> numeric
Nilai -> numeric
Bulan -> valid period
```

## 11.4 Integrity

Examples:

- duplicate records
- missing required values
- invalid periods
- invalid numeric values
- inconsistent units

## 11.5 Semantic Mapping

Check whether all required source fields have valid canonical mappings.

Validation must not have a frontend "disable validation" control.

---

# 12. Validation State Model

A source or dataset may have states such as:

```text
CONNECTED
SYNCING
VALID
WARNING
INVALID
ERROR
UNAVAILABLE
```

These states should be exposed through the API so that the frontend can display them consistently.

---

# 13. Business Logic and KPI Layer

Business logic belongs to the backend/service layer.

The frontend should not calculate authoritative business KPIs.

Preferred flow:

```text
Canonical Data
      |
      v
Business Logic
      |
      v
KPI Result
      |
      v
REST API
      |
      v
Frontend
```

Examples of KPI concepts:

```text
Total Production
Target Achievement
Financial Realization
Investment Realization
Data Validation Rate
```

The exact KPI definitions must be confirmed against real business requirements and available data.

Do not hardcode example KPI values from the Stitch mockup as production values.

---

# 14. API Contract

The frontend consumes stable REST endpoints.

Example:

```http
GET /api/dashboard/production
```

Example response:

```json
{
  "status": "success",
  "data": {
    "total_production": 125000,
    "achievement": 94.2,
    "monthly": [
      {
        "month": "January",
        "production": 10000
      }
    ]
  }
}
```

The response shape is illustrative.

The final API contract must be documented before production integration.

API contracts should be stable even if the backend implementation changes.

---

# 15. Frontend Data Flow

The frontend data flow should be:

```text
REST API
   |
   v
TanStack Vue Query
   |
   v
Composable / Data Adapter
   |
   +--------------------+
   |                    |
   v                    v
KPI Components      Chart/Table Data
   |                    |
   v                    v
Nuxt UI              ECharts / TanStack Table
```

UI components should not directly call Google APIs.

---

# 16. Frontend State Strategy

Use state according to responsibility.

## Local component state

Use Vue `ref`, `computed`, and component state for:

- local UI toggles
- dropdown state
- temporary form values
- local interaction state

## Pinia

Use Pinia for application-level client state when necessary.

Potential examples:

- current user context
- selected organizational context
- global UI preferences
- persistent dashboard filters if justified

Do not put all API data into Pinia by default.

## TanStack Query

Use TanStack Query for server/API state:

- fetched dashboard data
- cache
- loading
- error
- refetch
- stale state

---

# 17. Refresh Strategy

The initial MVP should use controlled refresh.

Possible mechanisms:

```text
Page load refresh
Manual refresh
Polling every N minutes
```

The initial target can use near-real-time polling, for example every 1–5 minutes, if required.

True push/webhook-based real-time synchronization is a future enhancement.

The UI must show the actual synchronization state.

---

# 18. Roles and Access Model

The initial system has two roles:

```text
Admin
Evaluator
```

## Admin

Can configure:

- Google Sheets source
- source mapping
- aliases
- limited schema configuration
- refresh settings
- validation details

Admin must NOT casually modify core business KPI definitions or bypass validation.

## Evaluator

Can:

- view dashboards
- use filters
- inspect data
- see limited data health information

Evaluator cannot:

- change source configuration
- change semantic mapping
- modify validation rules
- modify KPI definitions
- bypass validation

Authorization must be enforced by the backend.

---

# 19. Application Routing

The frontend information architecture is:

```text
/
│
├── production
├── finance
├── investment
│   ├── on-farm
│   └── off-farm
│
└── data-source
    ├── index
    ├── sync
    └── validation
```

Routes may be refined as the application grows.

---

# 20. Frontend Component Boundaries

Recommended structure:

```text
app/
├── components/
│   ├── layout/
│   │   ├── AppSidebar.vue
│   │   ├── AppHeader.vue
│   │   └── AppBreadcrumb.vue
│   │
│   ├── dashboard/
│   │   ├── KpiCard.vue
│   │   ├── ChartCard.vue
│   │   ├── FilterBar.vue
│   │   └── SectionHeader.vue
│   │
│   ├── data/
│   │   ├── DataSourceStatus.vue
│   │   ├── SyncStatus.vue
│   │   ├── ValidationStatus.vue
│   │   └── DataTable.vue
│   │
│   └── common/
│       ├── StatusBadge.vue
│       ├── LoadingState.vue
│       ├── EmptyState.vue
│       └── ErrorState.vue
│
├── composables/
├── layouts/
├── pages/
└── assets/
```

Generic components must not contain domain-specific business calculations.

---

# 21. Visualization Architecture

Visualization components receive already-prepared data.

Preferred:

```text
API
 ↓
data adapter
 ↓
chart-ready data
 ↓
ECharts
```

Avoid:

```text
ECharts component
 ↓
raw Google Sheet structure
 ↓
business calculations
```

The visualization layer is presentation-only.

---

# 22. Table Architecture

TanStack Table is the default advanced table layer.

Responsibilities:

- sorting
- filtering
- pagination
- row state
- column state

Nuxt UI/Tailwind provides presentation.

If actual data volume or enterprise requirements justify it,
AG Grid Vue can be evaluated later.

Do not introduce AG Grid prematurely.

---

# 23. Mock Data Architecture

UI development should use mock data before API integration.

Recommended:

```text
mock/
├── dashboard.ts
├── production.ts
├── finance.ts
├── investment.ts
└── data-source.ts
```

Mock data must be clearly separated from production API services.

The mock data should resemble the expected canonical API shape,
not raw Google Sheets rows.

---

# 24. Environment Configuration

Environment-specific values must use environment variables.

Examples:

```text
NUXT_PUBLIC_API_BASE
```

Backend-only secrets must never use public Nuxt runtime configuration.

Credentials must use an approved server-side mechanism and comply with
organization policy. This document does not authorize creation of service
account private keys or bypass of credential restrictions.

Never expose:

- Google service credentials
- private keys
- access tokens
- backend secrets

to browser code.

Selecting a remote source must never silently return Development fixtures when
the source is unavailable or invalid. Connection state, validation state, and
data freshness must remain distinct in the API and user-facing status model.

---

# 25. Security Boundaries

Security responsibilities:

```text
Frontend:
- display authorized UI
- send authenticated requests
- never store server secrets

Nuxt Nitro server:
- authentication
- authorization
- Google credentials
- source access
- validation enforcement
- business rules
```

Frontend role checks are for UX only.
Backend authorization is authoritative.

---

# 26. Error Handling

API errors should be normalized into user-facing states.

Frontend should distinguish:

```text
Loading
Success
Empty
Warning
Error
```

Raw stack traces and internal backend messages should not be shown to normal users.

---

# 27. Portal Integration Strategy

The final dashboard will eventually integrate with the existing company portal.

The existing portal technology has been observed as a Vue/Nuxt-based frontend environment with Nginx and related frontend libraries.

The Nuxt Nitro backend direction is approved. The authentication mechanism,
deployment topology, and reverse-proxy configuration must still be confirmed
before final integration.

Possible architecture:

```text
Existing Portal
       |
       +---- Existing Modules
       |
       +---- DFARM Dashboard
                 |
                 v
              API
                 |
                 v
             Backend
                 |
                 v
        Google Sheets API
```

The dashboard should therefore remain modular and API-driven.

---

# 28. API Contract Stability Principle

The following artifacts must remain framework-independent:

```text
Data Contract
Canonical Data Model
Validation Rules
Semantic Mapping
KPI Definitions
API Contract
Role Model
Dashboard Requirements
```

The API contract, canonical model, validation rules, and KPI definitions must
remain stable as Nitro server implementation details evolve.

---

# 29. Development Phases

## Phase 1 — Environment

- Node.js
- Nuxt
- Vue
- TypeScript
- dependencies

## Phase 2 — Frontend Foundation

### M2.1
Environment verification

### M2.2
UI design and design system

### M2.2.1
Architecture and coding-agent rules

### M2.3
Application shell

### M2.4
Routing

### M2.5
Reusable component architecture

## Phase 3 — Dashboard UI

- KPI components
- ECharts
- TanStack Table
- mock data
- responsive behavior

## Phase 4 — Data Layer

- TanStack Query
- API client
- loading/error handling
- refresh strategy

The existing Phases 1-4 above describe the established environment and
frontend foundation work. The following integration phases replace the former
Django-specific backend roadmap and are Production-first.

## Integration Phase 1 — Architecture & Documentation Alignment

- align architecture, agent instructions, and design references
- record the approved Nitro direction in an ADR

## Integration Phase 2 — Production API Contract & ADR Review

- approve the Production response contract
- record API errors, freshness, and validation states
- approve the architecture decision record

## Integration Phase 3 — Minimal Nuxt Nitro Backend Foundation

- establish server-only service boundaries
- add the minimal Production API route surface
- keep route handlers separate from ingestion and business logic

## Integration Phase 4 — Google Sheets Read-Only Ingestion

- configure the approved server-side credential mechanism
- retrieve the Production source without write access
- preserve explicit connection and source failure states

## Integration Phase 5 — Production Validation & Semantic Mapping

- validate source schema and required fields
- map source fields to the Production canonical model
- expose validation and freshness state through the API contract

## Integration Phase 6 — Production Frontend API Integration

- replace the Production fixture path only through the approved API contract
- preserve Excel import and local-data workflows
- keep Finance, On-Farm, and Off-Farm outside the initial integration scope

## Integration Phase 7 — Quality Assurance & Regression Testing

- test successful API reads and authentication failures
- test invalid data and source failures
- preserve Excel regression coverage

## Integration Phase 8 — Future Domains

- evaluate Finance, On-Farm, and Off-Farm separately after Production is stable

## Integration Phase 9 — Deployment & Operational Readiness

- confirm hosting and reverse-proxy topology
- confirm deployment identity and authentication
- confirm cache, refresh, monitoring, and production security requirements

---

# 30. Architecture Decision Rules

When a new feature is proposed:

1. Identify which layer owns the responsibility.
2. Do not place backend logic in frontend components.
3. Do not bypass the API contract.
4. Do not couple the frontend to Google Sheets.
5. Prefer reusable components.
6. Prefer canonical data over source-specific fields.
7. Prefer explicit configuration over silent guessing.
8. Keep production business rules out of visual components.
9. Avoid introducing a new library when an existing project dependency can solve the problem.
10. Reassess architecture before introducing major infrastructure.

---

# 31. Current Architecture Definition of Done

The architecture foundation is complete when:

- [ ] Frontend framework is defined.
- [ ] Nuxt Nitro backend architecture is defined.
- [ ] Data source architecture is defined.
- [ ] Data flow is defined.
- [ ] Validation responsibility is defined.
- [ ] Semantic mapping responsibility is defined.
- [ ] Canonical data concept is defined.
- [ ] API contract principle is defined.
- [ ] Role boundaries are defined.
- [ ] Frontend/backend boundaries are defined.
- [ ] Portal integration boundary is defined.
- [ ] Backend replacement principle is defined.
- [ ] Development phases are defined.
- [ ] Codex can use this document as the system architecture reference.

---

# 32. Final Architecture Summary

```text
                    GOOGLE SHEETS
               /        |         \
          PRODUKSI   KEUANGAN   INVESTASI
               \        |         /
                Google Sheets API
                        |
                        v
                 NUXT NITRO SERVER
                        |
          +-------------+-------------+
          |             |             |
      Ingestion     Validation    Mapping
          |             |             |
          +-------------+-------------+
                        |
                        v
                 CANONICAL DATA
                        |
                        v
                BUSINESS LOGIC / KPI
                        |
                        v
                    REST API
                        |
                        v
                 NUxt / Vue
                        |
          +-------------+-------------+
          |             |             |
       Nuxt UI       ECharts      Table
                     /             |
                  Charts       TanStack
                                  |
                        v
                  DFARM Dashboard
                        |
                        v
                Existing Portal*

* Prototype / integration assumptions must be
  confirmed before production deployment.
```

The architecture is intentionally designed so that server implementation
details remain behind the data and API contracts while the Nuxt repository
serves both frontend and backend responsibilities.

---

# 33. Phase 2.7 � Data Source Switching Architecture

In Phase 2.7, the dashboard transitioned from directly importing local fixtures to consuming a source-agnostic data layer:

`	ext
Dashboard Components (KPI Cards, Charts, Table, Stream)
                      ?
          useProductionDashboard Composable
                      ?
             useDataSource Composable
                      ?
        Active Production Data Source Adapter
         /                                 \
  developmentSource               googleSheetsSource (Phase 2.8)
  (Local Fixture - 577 rows)       (Placeholder: Not Connected)
`

Key Architectural Principles:
1. **Source-Agnostic UI**: No dashboard visual component directly references raw development fixture files. All interfaces and aggregates are defined in pp/data/production/types.ts.
2. **Centralized Configuration**: All source switching is concentrated on the /data-source page.
3. **No Silent Fallback**: When an unconfigured or remote source like google-sheets is active, the dashboard explicitly presents the not-connected state banner rather than secretly substituting development data.
4. **Phase 2.8 Readiness**: The Google Sheets adapter (pp/data/sources/googleSheetsSource.ts) provides a clean implementation entry point for Google Sheets API ingestion without modifying visual components.

---

# 34. Multi-Domain Data Source Management Framework

DFARM accommodates multiple independent business domains, each with dedicated spreadsheet documents and data configurations:

`	ext
               Data Source Hub (/data-source)
                             |
         +-------------------+-------------------+
         |                   |                   |
    [Produksi]          [Keuangan]         [Investasi]
         |                   |            /           \
  AREAL & POPULASI    DFARM_Keuangan    On-Farm     Off-Farm
   MASTERFIELD          2026.xlsx       CAPEX        CAPEX
  (577 baris, valid)  (Phase 3.0)     (Phase 3.1)  (Phase 3.1)
`

Core Architecture Rules:
1. **Isolated Domain Spreadsheets**: Production, Finance, On-Farm Investment, and Off-Farm Investment must never be combined into a single mega-sheet. Each domain maintains its own workbook ID, sheet name, cell range, and header row.
2. **Domain-Specific Active Source**: Each domain independently toggles between development (simulation fixture) and google-sheets (remote cloud spreadsheet) without affecting other domains.
3. **Canonical Field Requirements**: Each domain defines explicit semantic entity requirements (e.g. eportingYear, ctualRevenue, 	argetHectares, ssetCode).
4. **Concentrated Configuration Hub**: All domain-specific settings, connection tests, and sync frequencies are managed directly in /data-source with reactive isolation.
---

# 35. Implemented Investment On Farm Architecture (Two-Section UX & Downward Inline Drawer)

## 35.1 Overview and Component Ownership

The Investment On Farm domain monitors capital expenditure for plantation core crops (Tanaman Pokok 2026), consolidating SAP CO/PS actual ledger transactions (`ZESTHLE152`) against budget targets (`RKAP 2026`) with project mapping and reconciliation from `Rekap`.

The implementation resides at `app/pages/investment/on-farm/index.vue` and employs a **Two-Section Single-Page Architecture** adhering strictly to the user-mandated **"Section"** terminology:
- `Section 1`: Ringkasan Eksekutif (`OnFarmKpiCards.vue`, `OnFarmMonthlyLeadBarChart.vue` [Realisasi SAP dibandingkan Rencana Anggaran], `OnFarmScurveChart.vue` [Perkembangan Belanja Kumulatif], `OnFarmMonthlyAbsorptionChart.vue` [Serapan Anggaran per Bulan], `OnFarmEstateBarChart.vue` [Perbandingan Realisasi antar Kebun with 5 sorting modes], `OnFarmCommodityAnalyticsCard.vue` [Distribusi Belanja menurut Komoditas / Fase Tanam with Center-total Donut, ViewLevelToggle switch, and interactive inline expandable drawer]).
- `Section 2`: Eksplorasi Proyek & Aktivitas (`OnFarmActivitySection.vue` [2-Line smooth horizontal scrollable Activity Chips with hidden scrollbar; Project WBS and Cost Element tables with downward inline drawer expansion], `OnFarmReconciliationBanner.vue`).
- Presentation Drawer: `OnFarmProjectDrawer.vue` (Downward inline expandable card embedded directly beneath the project table row with 4-card metric grid matching `OnFarmCommodityAnalyticsCard.vue`, Tab 1: Struktur WBS & Aktivitas, and Tab 2: Embedded searchable & paginated Jurnal Transaksi).
- Section Navigation Controller: `OnFarmLayerNavigation.vue` (Pill-shaped segmented toggle switch with `AiSearchLinesIcon` [General Summary] and `ZoomInAreaIcon` [Detail Section], animated sliding light-blue active pill, and keyboard navigation; Layer 3 retired from main navigation).

## 35.2 State Ownership and Lifecycle

1. **Global Filter State** (managed in `useOnFarmData.ts`):
   - `selectedPeriod`: Active reporting cut-off month (defaults to detected active period 9).
   - `isManualCutoff`: Boolean flag indicating manual override vs automatic SAP cut-off detection.
   - `selectedEstate`, `selectedCommodity`, `selectedPhase`, `selectedAfdeling`: Scoped filter dimensions applied to both SAP actuals and RKAP budget plans.
   - `selectedProject`: When non-null, focuses transactions and activity breakdowns on a specific Project Definition.
   - State is reactive and 100% preserved during layer navigation and drawer interactions.
2. **Section Navigation State** (managed in `app/pages/investment/on-farm/index.vue`):
   - `activeSection`: Reactive ref (`'1' | '2'`), switching views via `v-show` to maintain DOM cache and ECharts instances. `activeLayer` is retained as an alias for backwards compatibility.
3. **Drawer Presentation State** (managed in `app/pages/investment/on-farm/index.vue`):
   - `isDrawerOpen`: Boolean visibility flag.
   - `drawerProjectCode`: Selected Project Definition string passed to `OnFarmProjectDrawer.vue`.
   - Opening/closing the drawer has zero side-effects on global store or KPI calculations.

## 35.3 Data Flow and Honest State Policy

```text
[Workbook: LM 19 Biaya Investasi Tanpok 2026 (1).xlsx]
         │
         ├── RKAP 2026     ──► parseBudgetPlans()     ──► store.budgetPlans
         ├── ZESTHLE152    ──► parseSapTransactions() ──► store.transactions (authoritative actuals)
         └── Rekap         ──► parseProjectMappings() ──► store.projectMappings & reconciliation
                                                                │
                                                    useOnFarmData()
                                                                │
                     ┌──────────────────────────────────────────┴─────────────────────────────────────────┐
                     ▼                                                                                    ▼
            Section 1: Executive Summary                                                 Section 2: Exploration
            - kpiSummary (YTD/Annual)                                                    - activityBreakdown (chips & filters)
            - monthlyTrend (1–12 & S-Curve)                                              - projectWbsSummary
            - commodityBreakdown                                                         - costElementBreakdown
            - estateBreakdown                                                                     │
                                                                                                  ▼ (user clicks project)
                                                                                         OnFarmProjectDrawer
                                                                                         ├── Tab 1: Ringkasan Proyek
                                                                                         │   - Authoritative SAP Actual
                                                                                         │   - Honest RKAP State (1:1 vs Shared vs Unmapped)
                                                                                         │   - WBS Structure & Cost Elements
                                                                                         └── Tab 2: Jurnal Transaksi
                                                                                             - Real-time search & pagination
                                                                                             - Signed SAP costs & negative reversals
```

### Business Rule Enforcement
1. **Authoritative Actuals**: SAP `ZESTHLE152` is the sole source of actual costs (`Rp 15.399.596.073`). Rekap values are never added to SAP actuals.
2. **Reconciliation Warning**: Rekap discrepancy (`+Rp 162.643.874` in rubber commodity) is displayed transparently without modifying SAP actuals.
3. **Negative Reversals**: Negative SAP values are strictly preserved as signed numbers.
4. **Honest Budget Association in Drawer**:
   - Direct 1-to-1 association is shown only when a project matches an explicit budget line.
   - Multi-project SINUSA codes display consolidated program-level notes without artificial splits.
   - Unmapped projects state that they are not mapped to SINUSA while remaining 100% accounted for in total actuals.

---

# 36. Reusable Google Sheets Integration Architecture

Following the production implementation in Phase 3.3, this section establishes the formal architectural framework for integrating Google Sheets across current and future DFARM business domains (Production, Finance, Investment On-Farm, Investment Off-Farm, and prospective analytics modules).

The architecture distinguishes shared ingestion infrastructure from domain-isolated business logic.

## 36.1 Shared Infrastructure Layer

To prevent redundant API code, duplicated authentication workflows, and divergent failure behavior across domains, all Google Sheets integrations reuse shared, server-side ingestion infrastructure:

1. **Authentication & Token Provider (`server/utils/googleSheetsAccessToken.ts`)**:
   - Centralizes Google OAuth access token acquisition using Application Default Credentials (ADC) and local Google Cloud CLI credentials via `google-auth-library`.
   - Supports static bearer token compatibility override (`NUXT_GOOGLE_SHEETS_ACCESS_TOKEN`) for deployment flexibility.
   - Enforces the minimum necessary authorization scope: read-only access (`https://www.googleapis.com/auth/spreadsheets.readonly`) for all dashboards where analytical reporting is read-only.
   - Strictly confines credentials, client secrets, and bearer tokens to the Nitro server execution context.
2. **Shared Google Sheets Reader (`server/utils/googleSheetsReader.ts`)**:
   - Retrieves cell range values from the official Google Sheets API v4 endpoint (`https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}`).
   - Implements automated, bounded exponential backoff retries (default 1 retry with 250ms backoff) for transient upstream network or HTTP 503/429 failures.
   - Applies strict request timeouts (default 10,000ms deadline) to prevent hung upstream calls from blocking server threads.
   - Requests raw values using `valueRenderOption=UNFORMATTED_VALUE` to ensure dates, numerical coordinates, and formula results are retrieved accurately without locale-based string formatting corruption.
3. **Common Observability & Diagnostic Error Normalization (`server/utils/productionApiError.ts`)**:
   - Maps raw upstream Google API responses into sanitized, structured error envelopes (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `UPSTREAM_TIMEOUT`, `BAD_GATEWAY`).
   - Strips internal response bodies, authorization headers, and raw URLs before diagnostic messages reach the client.
   - Strictly separates network/transport failures from semantic schema and mapping validation failures.

*Architectural Invariant: Do not duplicate authentication, raw fetch logic, retry loops, or token resolution in domain-specific dashboard files.*

## 36.2 Dashboard-Specific Business Logic Layer

While the transport and credential infrastructure is shared, business logic remains strictly isolated within each domain:

- **Independent Workbook & Sheet Configurations**: Each dashboard defines its own required workbooks, sheet names, and A1 cell ranges. Production's multi-year rubber/tea/coffee configuration model must not be imposed onto single-year project ledgers or financial balance sheets.
- **Dedicated Domain Mappers**: Each domain implements a separate semantic mapper (e.g. `server/utils/productionMapper.ts` for Production). The Production mapper must never serve as a universal mapper for unrelated domains.
- **Dedicated Canonical Data Contracts**: Each domain specifies and validates its own canonical types and schema rules (e.g. `ProductionRecord`, `InvestmentOnFarmRecord`).
- **Domain KPI & Aggregation Semantics**: Metric aggregations, ratio formulas (e.g. Weighted Productivity, S-Curve absorption, HKD Sadap), and temporal groupings belong to their respective domain calculation layer.
- **Domain-Specific Test Suites**: Every domain maintains its own mapper unit tests, API contract integration tests, and schema edge-case tests against authentic domain fixtures.

*Architectural Invariant: Low-level utility helpers (such as safe cell extraction or numeric parsing) may only be extracted into shared modules when their behavior is demonstrably domain-agnostic and independently tested.*

## 36.3 Server Configuration Model

Google Sheets configuration is managed exclusively on the Nitro server:

```text
Server Runtime Configuration (`nuxt.config.ts` -> private `runtimeConfig`)
  ├── Shared Google Sheets Config:
  │     ├── `accessToken`: Server-injected bearer token fallback (optional)
  │
  ├── Production Domain Config (`googleSheets.*`) [Implemented Reference]:
  │     ├── `production2025SpreadsheetId`, `production2025SheetsJson`
  │     └── `production2026SpreadsheetId`, `production2026SheetsJson`
  │
  └── Future Domain Configs (Proposed Pattern, evaluated per milestone):
        ├── `financeSpreadsheetId`, `financeSheetsJson`
        └── `investmentOnFarmSpreadsheetId`, `investmentOnFarmSheetsJson`
```

Configuration Principles:
1. **Server-Side Only**: Spreadsheet IDs, sheet names, cell ranges, and credentials exist exclusively in private server configuration. They are never declared in `runtimeConfig.public` or client bundles.
2. **Pre-Flight Range Validation**: Sheet configurations must be validated on server boot or during the initial request before issuing upstream Google API calls. Missing IDs or malformed A1 range strings immediately yield descriptive `CONFIG_ERROR` responses without issuing invalid requests.
3. **Structural Independence**: Do not assume all domains share identical workbook structures, reporting year splits, or sheet counts. A domain may utilize a single spreadsheet with multiple tabs or multiple spreadsheets for historical comparison.
4. **No Premature Registry**: Do not introduce a dynamic generic configuration registry or generic multi-tenant API endpoint until multiple active dashboards have demonstrated identical runtime needs and the abstraction has been formally approved.

## 36.4 End-to-End Data Flow & Layer Responsibilities

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Nitro Server Layer                                                                   │
│                                                                                        │
│   Google Sheets API (Cloud)                                                            │
│          │                                                                             │
│          ▼ [Bearer Token via Shared googleSheetsAccessToken.ts (ADC / Server Token)]   │
│   Shared Google Sheets Reader (googleSheetsReader.ts: fetch, retry, timeout, raw vals)  │
│          │                                                                             │
│          ▼ [Raw values: unknown[][]]                                                   │
│   Domain-Specific Mapper (e.g., productionMapper.ts: header detection, row parsing)    │
│          │                                                                             │
│          ▼ [Candidate domain records]                                                  │
│   Domain Canonical Validation (schema enforcement, null distinction, deduplication)   │
│          │                                                                             │
│          ▼ [Canonical Envelope: { success: true, data: { records, validation, meta } }] │
│   Domain REST API Endpoint (e.g., /api/v1/dashboard/production.get.ts)                 │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ JSON over HTTP
┌────────────────────────────────────────▼───────────────────────────────────────────────┐
│ 2. Nuxt Client Layer                                                                   │
│                                                                                        │
│   Domain Source Adapter (e.g., googleSheetsSource.ts: transport, cache, status state)   │
│          │                                                                             │
│          ▼                                                                             │
│   Domain Composable / Store (e.g., useProductionDashboard.ts / Pinia Store)           │
│          │                                                                             │
│          ▼                                                                             │
│   Dashboard Presentation Layer (Filters, KPI Cards, ECharts Visuals, Data Tables)      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Component Boundary Definitions:
- **Reader (`googleSheetsReader.ts`)**: Pure data retrieval. It has zero awareness of business fields, headers, commodities, or KPI logic.
- **Mapper**: Translates domain-specific raw grid structures into strongly typed domain entities, handling year variations and column layout shifts.
- **Canonical Validation**: Verifies integrity, filters out non-data subtotal rows, and produces validation metadata (errors, warnings, record counts).
- **Frontend Adapter**: Manages client-side fetch state, reactivity, and domain status badges. Never performs credential retrieval or stores secrets.
- **UI Presentation**: Displays data truthfully. Must clearly differentiate source selection, connection verification, active loading, schema validation failure, empty data, and transport errors.

## 36.5 Source Isolation & Safety Invariants

Every Google Sheets integration must strictly uphold the following invariants:

1. **No Silent Fallback to Development**: If Google Sheets authentication fails, a range is missing, or schema validation rejects rows, the system MUST surface an honest error state. It must NEVER silently fall back to local Development fixtures or mock data.
2. **Development Fixture Independence**: Development data fixtures and Excel report upload modes remain isolated and functional regardless of Google Sheets network status or credentials.
3. **Isolation of Shared Changes**: Modifications to shared infrastructure (e.g. reader timeout or token provider) must never alter the output semantics of existing domain mappers or invalidate active API contracts.
4. **Stale Cache Prevention on Source Switch**: When switching active data sources (e.g. from `development` to `google-sheets`), stale records from the previous source must be cleared immediately (`records.value = []`) before initiating the new fetch.
5. **Zero Secret Exposure**: Credentials, access tokens, refresh tokens, and internal Google API errors must never appear in client bundles, DOM nodes, browser logs, or client-accessible state.
6. **Separation of Authentication vs Validation Errors**: Connection failures (invalid credentials, expired tokens, network unreachable) must be handled and presented distinctly from schema failures (missing column header, invalid data type).

## 36.6 Incremental Extension Strategy for Future Domains

When extending Google Sheets integration to subsequent dashboards (Finance, Investment On-Farm, Investment Off-Farm):

1. **Production Remains the Reference Implementation**: Use the Production implementation (`server/api/v1/dashboard/production.get.ts`, `server/utils/productionMapper.ts`, `server/utils/productionSourceConfig.ts`) as the reference pattern.
2. **Pilot Implementation**: Implement one new domain at a time (e.g., Finance as the first pilot for multi-domain expansion).
3. **Direct Reuse of Shared Modules**: Directly import `createGoogleSheetsAccessTokenProvider` and `readGoogleSheetsValues` into the new domain's server service.
4. **Build Domain-Specific Components**: Author a dedicated domain source config, mapper, canonical contract, Nitro endpoint (`/api/v1/dashboard/[domain].get.ts`), client adapter, and test suite.
5. **Justified Generalization Only**: Evaluate consolidating configurations into a generalized registry or dynamic endpoint only after two or more domains are fully operational and have proven identical structural patterns. Avoid speculative abstractions.
