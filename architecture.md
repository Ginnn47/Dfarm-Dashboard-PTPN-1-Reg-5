# DFARM Dashboard — System Architecture

> Version: 0.1
> Status: Draft — Architecture Foundation
> Frontend: Nuxt + Vue + TypeScript
> UI: Nuxt UI + Tailwind CSS
> Visualization: Apache ECharts
> Table: TanStack Table
> Data Fetching: TanStack Query
> State: Pinia
> Utilities: VueUse
> Prototype Backend: Django
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

The prototype backend uses Django.

Django is an implementation choice, not the architectural contract.

Current prototype:

```text
Nuxt
  |
  | REST API
  v
Django
  |
  v
Google Sheets API
```

The architecture must remain portable to another backend framework if the company later requires it.

For example:

```text
Current:
Nuxt -> Django -> Google Sheets API

Possible production:
Nuxt -> Laravel -> Google Sheets API
```

The frontend must depend on the API contract rather than Django-specific implementation details.

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
- sheet name/range when required
- expected schema
- semantic mapping
- validation configuration
- refresh configuration

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
Django ingestion service
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

Never expose:

- Google service credentials
- private keys
- access tokens
- backend secrets

to browser code.

---

# 25. Security Boundaries

Security responsibilities:

```text
Frontend:
- display authorized UI
- send authenticated requests
- never store server secrets

Backend:
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

The exact production backend, authentication mechanism, deployment topology, and reverse-proxy configuration are not assumed by this document and must be confirmed before final integration.

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

# 28. Backend Replacement Principle

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

Only backend implementation details should need substantial rewriting
if Django is later replaced by Laravel or another company-mandated framework.

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

## Phase 5 — Django API

- project structure
- API endpoints
- canonical models
- service layer

## Phase 6 — Google Sheets Integration

- credentials
- source configuration
- ingestion
- raw data retrieval

## Phase 7 — Validation & Semantic Mapping

- schema detection
- required columns
- data type validation
- mapping
- validation states

## Phase 8 — Authentication & Roles

- Admin
- Evaluator
- authorization

## Phase 9 — Portal Integration

- authentication/SSO alignment
- reverse proxy
- deployment
- domain/path integration
- production testing

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
- [ ] Backend prototype is defined.
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
                 BACKEND SERVICE
                     Django*
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

The architecture is intentionally designed so that
Django is replaceable while the data contract,
API contract, frontend structure, and business requirements remain stable.
