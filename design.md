# DFARM Dashboard — Design System & UI Specification

> Version: 0.1
> Status: Draft — Frontend Foundation
> Framework: Nuxt + Vue + TypeScript
> UI: Nuxt UI + Tailwind CSS
> Visualization: Apache ECharts
> Table: TanStack Table
>
> This document defines the visual language, layout system, component behavior,
> interaction principles, and UI architecture for the DFARM Dashboard.
>
> The current Stitch-generated dashboard is the primary visual reference,
> but individual charts, metrics, labels, and visualizations are NOT considered
> final. They may change according to the actual business data, KPI definitions,
> and available Google Sheets structure.

---

# 1. Design Objective

DFARM is an enterprise-oriented agricultural data monitoring dashboard.

The interface is designed to help users quickly:

1. Understand the current regional operational condition.
2. Monitor production performance.
3. Monitor financial and investment indicators.
4. Identify problematic or invalid data sources.
5. Compare operational units.
6. Navigate between business domains.
7. Inspect data health and synchronization status.
8. Access detailed data without overwhelming the primary dashboard.

The dashboard should prioritize:

- clarity
- operational readability
- data transparency
- consistency
- fast scanning
- minimal cognitive load
- professional enterprise appearance

The interface should feel like an internal enterprise information system,
not a consumer-facing website.

---

# 2. Design Direction

## 2.1 Overall Visual Character

The visual direction should be:

- clean
- modern
- professional
- data-oriented
- lightweight
- calm
- structured
- operational

Avoid:

- excessive gradients
- excessive glassmorphism
- excessive shadows
- overly decorative illustrations
- excessive animation
- excessive rounded cards
- unnecessarily colorful dashboards

The UI should communicate that the system is used for
business monitoring and decision support.

---

# 3. Visual Reference

The current Stitch-generated dashboard establishes the following
visual direction:

- fixed left sidebar
- top application header
- large dashboard title
- filter/control area
- KPI cards
- data visualization cards
- source health/status panel
- operational data table
- compact secondary KPI cards
- light neutral page background
- white content cards
- blue as primary interaction color
- green as positive/status color
- yellow/orange as warning
- red as error/correction
- dark navy/charcoal for primary text

The screenshot is a visual reference rather than a strict pixel-perfect
implementation target.

The implementation may alter:

- chart type
- chart dimensions
- KPI count
- table columns
- metric names
- filter structure
- information density
- card arrangement

when real business requirements or data structures require it.

---

# 4. Application Layout

The application uses a desktop-first dashboard layout.

High-level structure:

```text
┌─────────────────────────────────────────────────────────────┐
│                        TOP HEADER                           │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│   SIDEBAR     │                MAIN CONTENT                 │
│               │                                             │
│   Overview    │   Page Header                               │
│   Produksi    │   Filters                                   │
│   Keuangan    │   KPI / Visualization / Table              │
│   Investasi   │                                             │
│               │                                             │
│   Data Source │                                             │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

## 4.1 Main Regions

The application consists of:

1. App Sidebar
2. App Header
3. Page Header
4. Filter Bar
5. KPI Section
6. Visualization Section
7. Data Monitoring Section
8. Data Table Section
9. Secondary Metrics Section

---

# 5. Sidebar

## 5.1 Purpose

The sidebar is the primary navigation mechanism.

It should remain visually stable across application pages.

## 5.2 Navigation Structure

Current information architecture:

```text
OVERVIEW

  Dashboard Utama


DATA MONITOR

  Produksi
  Keuangan
  Investasi On Farm
  Investasi Off Farm


DATA SOURCE

  Google Sheets
  Sync Status
  Validation
```

The exact menu structure may evolve as requirements become clearer.

## 5.3 Sidebar Visual Rules

Sidebar:

- fixed on desktop
- full viewport height
- white/light neutral background
- subtle right border
- moderate width
- compact but readable navigation
- active item clearly highlighted

Active navigation:

- primary blue background or blue accent
- white or high-contrast text
- icon remains visible
- subtle rounded corners

Inactive navigation:

- dark gray text
- muted icon
- transparent background

Hover:

- subtle neutral/blue background
- no aggressive animation

## 5.4 Sidebar Footer

The sidebar may contain a system status area.

Example:

```text
● Online • Synced
  Live Telemetry

                    ⚙
```

This area represents application/system connectivity,
not necessarily Google Sheets validation.

Do not mix:

- application connection
- data source validation
- Google Sheets synchronization

into a single status concept.

---

# 6. Application Header

The top header contains global context and utility actions.

Reference structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ Logo │ Search │ Current Unit / Region │ Quick Sync │ User   │
└──────────────────────────────────────────────────────────────┘
```

## 6.1 Header Elements

Possible elements:

### A. Global Search

Purpose:

- quick navigation
- search dashboard sections
- search operational units
- future command palette

Example:

```text
Quick jump / search
```

Do not implement global search as a generic full-database search
until the backend search requirements are defined.

### B. Current Context

Example:

```text
Kebun Renteng · Jember
```

This represents the currently selected organizational/unit context.

### C. Quick Sync

Example:

```text
↻ Quick Sync
```

Purpose:

- manually trigger data refresh

Behavior:

```text
Idle
  ↓
Syncing
  ↓
Success / Warning / Error
```

The UI must never imply successful synchronization
before the API confirms success.

### D. Notification

Reserved for:

- validation problems
- synchronization failures
- system warnings

### E. User Profile

Display:

- user name
- role
- organization/context

Potential roles:

```text
Admin
Evaluator
```

Role-based access control is a backend concern,
but the frontend should hide inaccessible navigation/actions.

---

# 7. Page Header

Every primary page should have a consistent page header.

Example:

```text
Dashboard Eksekutif Regional

[Google Sheets Connected] [PTPN 1 · Regional]
```

Structure:

```text
Title
Subtitle / context
Status indicators
Page actions
```

Possible actions:

```text
Ekspor Data
Muat Ulang
Filter
```

Do not overload the header with actions.

Primary action should be visually dominant.

---

# 8. Filter Area

The filter area sits below the page header.

Typical filters:

```text
Periode
Wilayah
Komoditas
Status
```

Example:

```text
┌─────────────┐ ┌──────────────┐ ┌─────────────┐
│ Periode     │ │ Wilayah      │ │ Komoditas   │
└─────────────┘ └──────────────┘ └─────────────┘
```

## 8.1 Filter Principles

Filters should:

- be clearly grouped
- use consistent sizing
- display current selections
- allow easy reset
- avoid taking excessive vertical space

## 8.2 Filter State

The interface should support:

```text
Default
Selected
Loading
Disabled
Error
Empty
```

## 8.3 Reset

Provide a clear reset mechanism when multiple filters
are active.

---

# 9. KPI Cards

KPI cards are used for high-priority metrics.

Example categories:

```text
Total Production
Revenue / Financial Realization
Investment CAPEX
Data Synchronization
```

However, the exact KPI list must be determined by the
actual available business data.

Do not hardcode the screenshot's metrics as permanent requirements.

---

# 10. KPI Card Structure

Recommended structure:

```text
┌─────────────────────────────┐
│ LABEL                  ICON │
│                             │
│ 118.740 Ton                 │
│ ↑ +4.2% vs target          │
│                             │
│ ────────────────            │
│ small contextual indicator  │
└─────────────────────────────┘
```

Hierarchy:

1. KPI label
2. Main value
3. Unit
4. Change/status
5. Supporting context
6. Optional micro-visualization

## 10.1 KPI Colors

Positive:

- green

Warning:

- amber/orange

Negative:

- red

Neutral:

- gray/blue

Primary metric:

- dark navy/charcoal

Avoid coloring the entire card based on status.
Prefer small accents, badges, indicators, or text.

---

# 11. Data Visualization System

Charts should communicate business information,
not simply decorate the dashboard.

The exact chart type should be selected according to
the data relationship.

Possible chart types:

```text
Line
Bar
Stacked Bar
Area
Donut
Scatter
Heatmap
Gauge
```

The current Stitch design uses a combination of
bar and line visualization, but this is not mandatory.

---

# 12. Visualization Card

Every visualization should normally be wrapped in a consistent card.

Structure:

```text
┌──────────────────────────────────────────────────┐
│ Title                                ⋮           │
│ Short description                               │
│                                                  │
│                  CHART                           │
│                                                  │
│                                                  │
│ Footer / summary                                 │
└──────────────────────────────────────────────────┘
```

Each chart should provide:

- title
- optional description
- legend when needed
- tooltip
- readable axes
- appropriate unit formatting
- empty state
- loading state
- error state

---

# 13. Production Trend Visualization

The Stitch reference shows:

```text
Trend Produksi vs Anggaran
```

with:

- monthly categories
- production values
- target/anggaran
- line/series comparison

The exact implementation may change.

Potential implementation:

```text
Bar:
Actual Production

Line:
Target / Budget
```

or:

```text
Line:
Actual Production

Line:
Target Production
```

The final chart type should depend on the actual data model.

Do not force the screenshot's exact chart if another visualization
communicates the business relationship better.

---

# 14. Data Source Status Panel

The dashboard should provide a visible summary of
data source health.

Example:

```text
Status Data Source

● Sheet_Renteng        100% Valid
● Sheet_Kalisat        100% Valid
● Sheet_Djati...       Process 92%
⚠ Sheet_Bangunan...    Check
```

This component is important because DFARM uses
Google Sheets as the source layer.

## 14.1 Status Categories

At minimum:

```text
Connected
Syncing
Valid
Warning
Invalid
Error
Unavailable
```

Status must be represented consistently.

---

# 15. Synchronization Status

Synchronization should expose enough information
for users to understand whether dashboard data is current.

Possible information:

```text
Last sync
Sync duration
Rows retrieved
Source status
Validation status
```

Example:

```text
Last sync: 10:42 WIB
Rows: 1,840
Validation: Valid
```

Avoid presenting fake "real-time" claims.

If the system uses polling every N minutes,
the UI should communicate the actual refresh model.

---

# 16. Operational Monitoring Table

The table is one of the primary components of the dashboard.

Reference:

```text
Monitoring Unit Kebun Jatim
```

Possible columns:

```text
Unit Kebun
Komoditas Utama
Realisasi
Capaian Target
Serapan Investasi
Status Validasi
Aksi
```

The exact columns may change according to the actual
canonical data model.

---

# 17. Table Design

Tables should prioritize:

- readability
- comparison
- scanning
- filtering
- sorting

Recommended features:

```text
Search
Sort
Filter
Pagination
Column visibility
Responsive behavior
Row actions
```

For advanced tables, use:

```text
TanStack Table
```

with Nuxt UI/Tailwind for presentation.

If future data volume requires enterprise-grade virtualization,
AG Grid may be evaluated.

---

# 18. Table Status

Status badges should use semantic colors.

Example:

```text
● Tervalidasi
● Review
● Koreksi
```

Suggested semantics:

```text
Green  → Valid / healthy
Blue   → Informational / processing
Amber  → Warning / review required
Red    → Error / correction required
Gray   → Unknown / unavailable
```

Do not use color as the only indicator.
Status text must remain visible.

---

# 19. Pagination

Pagination should appear when the dataset is larger than
the visible page size.

Example:

```text
Menampilkan 6 dari 16 unit

Sebelumnya   1  2  3   Berikutnya
```

The exact page size should be configurable.

Do not hardcode a page size based only on the Stitch screenshot.

---

# 20. Secondary KPI / Monitoring Cards

The lower section may contain additional operational metrics.

Examples from the reference:

```text
Curah Hujan
Kapasitas Pabrik
Replanting Kebun
```

These are examples, not mandatory requirements.

They should only appear if the corresponding data exists.

This section can evolve into:

```text
Environmental Indicators
Operational Capacity
Plantation Renewal
Maintenance
Weather
Other operational indicators
```

---

# 21. Color System

The primary visual language uses a light enterprise palette.

## 21.1 Primary

Primary action:

```text
Blue
```

Used for:

- primary buttons
- active navigation
- links
- selected states
- important interactive elements

## 21.2 Success

```text
Green
```

Used for:

- valid
- healthy
- successful synchronization
- positive KPI changes
- completed processes

## 21.3 Warning

```text
Amber / Orange
```

Used for:

- review
- incomplete validation
- degraded sync
- attention required

## 21.4 Error

```text
Red
```

Used for:

- invalid data
- failed synchronization
- correction required
- system errors

## 21.5 Neutral

Used for:

- secondary text
- borders
- backgrounds
- disabled states

Do not use too many accent colors simultaneously.

---

# 22. Typography

Typography should prioritize:

1. readability
2. hierarchy
3. compactness
4. professional appearance

Recommended hierarchy:

```text
Page title
    ↓
Section title
    ↓
Card title
    ↓
Metric value
    ↓
Body text
    ↓
Supporting metadata
```

Large KPI numbers should be visually dominant.

Supporting information should remain visually secondary.

Avoid excessive font-weight variation.

---

# 23. Spacing

Use a consistent spacing system based on Tailwind's spacing scale.

Prefer:

```text
4
8
12
16
20
24
32
```

Avoid arbitrary spacing values unless necessary.

Recommended card padding:

```text
16px – 24px
```

depending on card density.

---

# 24. Border Radius

Use moderate rounded corners.

Recommended:

```text
Small controls:
8px

Cards:
12px – 16px

Large containers:
16px
```

Avoid extremely rounded "pill everything" styling.

Pills should primarily be used for:

- status
- filters
- tags
- compact categorical indicators

---

# 25. Shadows

Use shadows sparingly.

Preferred hierarchy:

```text
Normal card:
subtle/no shadow

Floating dropdown:
medium shadow

Modal:
stronger shadow
```

The dashboard should rely more on:

- spacing
- borders
- background contrast

than heavy shadows.

---

# 26. Icons

Icons should communicate meaning and support scanning.

Use a consistent icon library.

Icons should:

- have consistent stroke weight
- use consistent sizing
- never replace important textual labels
- use semantic colors sparingly

Typical sizes:

```text
16px
18px
20px
24px
```

---

# 27. Responsive Behavior

The primary target is desktop because the dashboard
is an enterprise operational interface.

However, the application must remain usable on smaller screens.

## Desktop

```text
Sidebar + Main Content
```

## Tablet

```text
Collapsed Sidebar
Main Content
```

## Mobile

```text
Top Navigation / Drawer
Single-column content
Stacked KPI cards
Scrollable tables
```

Charts should resize rather than overflow the viewport.

Tables may become horizontally scrollable on small screens.

Do not force desktop tables into unreadable mobile layouts.

---

# 28. Loading States

Every data-dependent component must have a loading state.

Examples:

```text
KPI
→ skeleton

Chart
→ chart skeleton

Table
→ row skeleton

Data source
→ status skeleton
```

Avoid large full-page spinners whenever possible.

Prefer local loading indicators.

---

# 29. Empty States

When no data exists:

```text
No data available

The selected filters do not return any data.
Try changing the period or region.
```

Empty states must not look like errors.

---

# 30. Error States

Example:

```text
Unable to load production data

The data source could not be reached.
Please try again or check the data source status.

[Retry]
```

Errors should provide:

- what failed
- possible reason
- available action

Do not expose raw API errors to normal users.

---

# 31. Validation States

Because DFARM has data validation requirements,
validation status is a first-class UI concept.

Example:

```text
VALID
WARNING
INVALID
PROCESSING
ERROR
```

The dashboard should expose a summary,
while detailed validation belongs to the Data Source / Validation page.

---

# 32. Data Source Page

The Data Source section should eventually contain:

```text
Google Sheets
Sync Status
Validation
```

## Google Sheets

Shows:

- source name
- spreadsheet identifier (masked where appropriate)
- connected status
- sheet/range
- last sync
- schema status

## Sync Status

Shows:

- last successful sync
- current sync state
- sync history
- errors
- latency

## Validation

Shows:

- required columns
- detected headers
- data type validation
- missing values
- duplicate detection
- structural mismatch
- semantic mapping status

---

# 33. Admin vs Evaluator UI

The system has two primary roles:

```text
Admin
Evaluator
```

## Admin

Can access:

- source configuration
- semantic mapping
- validation details
- sync controls
- system configuration

## Evaluator

Can access:

- dashboards
- filters
- tables
- operational details
- limited data health information

Evaluator should not be able to:

- modify source configuration
- change semantic mapping
- change validation rules
- modify KPI definitions
- bypass validation

The frontend should reflect permissions,
but authorization must ultimately be enforced by the backend.

---

# 34. Interaction Principles

The dashboard should feel responsive but not animated excessively.

Use animation for:

- navigation transitions
- dropdowns
- modal appearance
- loading state
- subtle state changes

Avoid:

- large entrance animations
- continuous animation
- excessive chart animation
- distracting motion

Transitions should generally be short and subtle.

---

# 35. Dashboard Density

The dashboard is information-dense by nature.

However, information density must be controlled.

Priority order:

```text
1. Critical KPI
2. Current operational status
3. Trend
4. Data source health
5. Detailed table
6. Secondary indicators
```

Users should understand the overall situation
within a few seconds.

---

# 36. Dashboard Information Hierarchy

Recommended order:

```text
Page Header
    ↓
Global Filters
    ↓
Primary KPI
    ↓
Main Trend / Performance
    ↓
Data Source Health
    ↓
Operational Table
    ↓
Secondary Indicators
```

This hierarchy may be adjusted per business domain.

For example, the Production page may prioritize production trends,
while Finance may prioritize financial KPIs.

---

# 37. Domain-specific Dashboard Structure

The same visual system should be reused across:

```text
Produksi
Keuangan
Investasi On Farm
Investasi Off Farm
```

but each page can have domain-specific KPIs and charts.

Example:

```text
Produksi
→ production
→ target
→ yield
→ operational unit

Keuangan
→ realization
→ budget
→ variance
→ category

Investasi
→ CAPEX
→ realization
→ allocation
→ project/status
```

These are conceptual examples only.
Actual metrics must follow the final business data contract.

---

# 38. Component Architecture

Recommended frontend component organization:

```text
app/
│
├── components/
│   │
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
│       ├── EmptyState.vue
│       ├── ErrorState.vue
│       └── LoadingState.vue
│
├── layouts/
│   └── default.vue
│
├── pages/
│   ├── index.vue
│   ├── production/
│   ├── finance/
│   ├── investment/
│   └── data-source/
│
├── composables/
│
└── assets/
```

Components should be reusable.

Avoid putting page-specific business logic
inside generic UI components.

---

# 39. Data Visualization Architecture

Charts should not contain business calculations directly.

Preferred flow:

```text
API Data
   ↓
Composable / Query
   ↓
Transformation
   ↓
Chart-ready data
   ↓
ECharts component
```

Example:

```text
Django API
    ↓
useProductionData()
    ↓
productionTrendData
    ↓
ProductionTrendChart.vue
```

Do not make ECharts components responsible
for understanding raw Google Sheets structures.

---

# 40. API Independence

The frontend must communicate through API contracts.

Frontend components should NOT depend on:

- Django models
- Django serializers
- Google Sheets API
- Google Sheets credentials
- backend implementation details

The frontend only consumes the agreed API response.

Example:

```json
{
  "status": "success",
  "data": {
    "total_production": 125000,
    "achievement": 94.2,
    "monthly": []
  }
}
```

This allows the backend to change from:

```text
Django
```

to:

```text
Laravel
```

without requiring a frontend rewrite,
as long as the API contract remains compatible.

---

# 41. Mock Data Strategy

During UI development, use local mock data.

Example:

```text
mock/
├── dashboard.ts
├── production.ts
├── finance.ts
├── investment.ts
└── data-source.ts
```

Mock data must be clearly separated from production API data.

Do not embed large mock datasets directly inside Vue components.

---

# 42. Design vs Data Separation

The UI must remain functional even if:

- chart type changes
- KPI values change
- columns change
- source data changes
- API implementation changes

Therefore:

```text
UI Design
     ↓
Component
     ↓
Data Contract
     ↓
Business Data
```

not:

```text
UI
 ↓
hardcoded values
 ↓
business logic
```

---

# 43. Current Stitch Reference Mapping

The current Stitch screenshot can be mapped conceptually as:

```text
LEFT
│
├── PTPN Identity
├── Overview
├── Data Monitor
├── Data Source
└── System Status


TOP
│
├── Search
├── Organizational Context
├── Quick Sync
├── Notifications
└── User Profile


MAIN
│
├── Dashboard Header
├── Connection Status
├── Filters
├── KPI Cards
├── Main Trend Visualization
├── Data Source Status
├── Operational Monitoring Table
└── Secondary KPI Cards
```

This structure should be preserved unless
business requirements indicate otherwise.

---

# 44. Visual Flexibility Rule

The following elements are considered flexible:

- chart type
- chart placement
- number of charts
- KPI count
- table columns
- filter arrangement
- secondary metric arrangement
- exact card dimensions

The following elements should remain stable:

- overall navigation model
- visual hierarchy
- design language
- semantic color system
- component consistency
- accessibility
- responsive behavior
- loading/error/empty states
- role-aware UI
- separation between UI and business logic

---

# 45. Accessibility

The interface should follow accessible UI practices.

Requirements:

- sufficient color contrast
- keyboard navigable controls
- visible focus state
- semantic labels
- icon buttons with accessible labels
- status not represented only by color
- table headers clearly associated with columns
- form inputs with labels

Do not rely exclusively on color to communicate:

```text
success
warning
error
```

---

# 46. Performance Principles

Dashboard performance is important because
the application may display multiple charts and large tables.

Prefer:

- lazy loading where appropriate
- component-level loading
- chart data transformation outside render-heavy components
- table virtualization when necessary
- API pagination
- caching
- controlled refresh intervals

Avoid:

- loading all datasets at application startup
- rendering unnecessary charts
- continuously polling without reason
- huge reactive objects
- unnecessary watchers

---

# 47. Future Integration with Existing Portal

The dashboard is designed to eventually integrate
with the existing PTPN portal.

The frontend should therefore avoid assumptions
that require a standalone application.

Possible final architecture:

```text
Existing Portal
      │
      ├── Existing Modules
      │
      └── DFARM Dashboard
               │
               ▼
           Backend API
               │
               ▼
        Google Sheets API
```

The exact production integration mechanism
will be decided after the portal deployment,
authentication, reverse proxy, and backend constraints
are confirmed.

---

# 48. Technology Rules

Frontend:

```text
Nuxt
Vue
TypeScript
Tailwind CSS
Nuxt UI
```

Visualization:

```text
Apache ECharts
```

Table:

```text
TanStack Table
```

Data fetching:

```text
TanStack Query
```

State:

```text
Pinia
```

Utilities:

```text
VueUse
```

Backend:

```text
Django prototype
```

Data source:

```text
Google Sheets API
```

The backend implementation may later change
if the company requires another backend technology.

---

# 49. Implementation Rules for Codex

When implementing this design:

1. Inspect the existing project before modifying files.
2. Preserve existing Nuxt configuration unless a change is required.
3. Do not introduce another UI framework.
4. Use Nuxt UI components where appropriate.
5. Use Tailwind for layout and visual adjustments.
6. Keep components modular.
7. Do not hardcode production business data.
8. Use mock data during the UI development phase.
9. Keep chart components independent from API implementation.
10. Keep table components independent from backend implementation.
11. Do not implement Google Sheets credentials in the frontend.
12. Do not implement backend business logic in Vue components.
13. Follow this design document as the visual source of truth.
14. If the screenshot and this document conflict, prioritize this document.
15. If actual business requirements conflict with the visual reference,
    prioritize the business requirements.
16. Do not rewrite unrelated existing files.
17. Prefer incremental implementation over large rewrites.

---

# 50. Planned Frontend Foundation Scope

M2.2.1 is a documentation and architecture-validation milestone. It does
not implement visual components, application shell, mock data, or routes.

After M2.2.1, implement the following scope incrementally according to the
roadmap in `architecture.md` and the milestone limits in `AGENTS.md`:

```text
1. Application shell
2. Sidebar
3. Header
4. Dashboard page structure
5. Navigation
6. Filter area
7. KPI card components
8. Generic chart card
9. Data source status card
10. Generic data table
11. Loading / empty / error states
12. Responsive behavior
```

Use mock data.

Do NOT implement yet:

```text
Google Sheets API
Django API
Authentication
Database
Production credentials
Real synchronization
Real validation engine
Semantic mapping engine
```

Those belong to later milestones.

---

# 51. Definition of Done — Frontend Foundation

This definition of done applies to the future frontend-foundation work, not
to M2.2.1. Each item must be delivered only in its assigned milestone.

This milestone is complete when:

- [ ] Nuxt application runs successfully.
- [ ] Nuxt UI is configured.
- [ ] Tailwind styling works.
- [ ] Sidebar is implemented.
- [ ] Header is implemented.
- [ ] Navigation routes work.
- [ ] Dashboard shell matches the design direction.
- [ ] KPI components are reusable.
- [ ] Chart container is reusable.
- [ ] Table component is reusable.
- [ ] Data source status component is reusable.
- [ ] Loading state exists.
- [ ] Empty state exists.
- [ ] Error state exists.
- [ ] Responsive behavior works.
- [ ] No production API dependency exists yet.
- [ ] No hardcoded business logic exists in visual components.

---

# 52. Design Principle Summary

DFARM should follow one central principle:

> Make complex operational data easy to understand without hiding
> the underlying data condition.

Therefore the interface should always balance:

```text
Business clarity
       +
Data transparency
       +
Visual simplicity
       +
Operational usefulness
```

The dashboard should not merely look attractive.

It should help the user answer:

1. What is happening?
2. Is performance good or bad?
3. Where is the problem?
4. Is the underlying data trustworthy?
5. What should I inspect next?

---

# 53. Current Design Status

```text
Design System        → Draft
Application Shell    → Planned
Dashboard Layout     → Planned
Production Dashboard → Planned
Finance Dashboard    → Planned
Investment Dashboard → Planned
Data Source UI       → Planned
Validation UI        → Planned
Responsive UI        → Planned
API Integration      → Future
Google Sheets        → Future
```

The Stitch screenshot is currently treated as
the primary visual reference for the first implementation,
not as a permanent restriction on the final dashboard.
