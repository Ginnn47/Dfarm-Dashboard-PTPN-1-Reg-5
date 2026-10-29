# AGENTS.md — DFARM Dashboard Coding Rules

> Purpose: Instructions for AI coding agents working in the DFARM Dashboard repository.
> Primary agent: Codex / VSCode coding agent.
> This file complements `design.md` and `architecture.md`.

---

# 1. Mission

Build and maintain DFARM as a maintainable enterprise dashboard.

The agent must:

- understand the existing project before changing it
- follow `architecture.md` for system boundaries
- follow `design.md` for visual/UI rules
- make incremental changes
- preserve working functionality
- avoid unnecessary rewrites
- validate changes before reporting completion

The agent is an implementation assistant, not the owner of business requirements.

If a requirement is ambiguous, do not invent business rules.

---

# 2. Required Reading Order

Before making substantial changes, read:

1. `AGENTS.md`
2. `architecture.md`
3. `design.md`
4. relevant existing source files
5. `package.json`
6. `nuxt.config.ts`

For a UI task, also inspect the provided visual reference when available.

Do not begin by rewriting configuration files.

---

# 3. Technology Rules

The frontend stack is:

```text
Nuxt
Vue 3
TypeScript
Tailwind CSS
Nuxt UI
Apache ECharts
TanStack Table
TanStack Vue Query
Pinia
VueUse
```

Rules:

- Use Vue, not React.
- Use Nuxt, not Next.js.
- Use TypeScript.
- Use Nuxt UI for reusable UI primitives where appropriate.
- Use Tailwind for layout and styling.
- Use ECharts for dashboard visualization.
- Use TanStack Table for advanced table behavior.
- Use TanStack Query for server/API state.
- Use Pinia only for appropriate client/application state.
- Use VueUse when an existing utility solves the problem.
- Do not introduce another UI framework without explicit approval.

---

# 4. Architecture Rules

Always preserve these boundaries:

```text
Google Sheets
      ↓
Google Sheets API
      ↓
Backend
      ↓
Validation / Mapping / Business Logic
      ↓
REST API
      ↓
Nuxt
```

Never implement:

```text
Vue
  ↓
Google Sheets API
```

Never expose Google credentials in frontend code.

The frontend depends on API contracts, not Nitro server internals.

---

# 5. Backend Independence

Nuxt Nitro is the approved backend architecture for DFARM. Frontend and
backend code live in the same Nuxt repository, but the frontend must depend on
explicit API contracts rather than Nitro server implementation details.

Do not create frontend code that assumes:

- Nitro server route internals
- server-only service modules
- credential or runtime secret locations
- source-specific ingestion details

Server-only operations, including Google credentials, Google Sheets access,
validation, semantic mapping, and business calculations, belong in the Nitro
server/service layer.

---

# 6. Design Rules

`design.md` is the visual source of truth.

Use the Stitch screenshot as visual reference when provided.

Do not:

- copy the screenshot pixel-by-pixel
- hardcode screenshot values as real business data
- assume every chart in the screenshot is final
- introduce unrelated visual styles

Maintain:

- visual hierarchy
- spacing consistency
- semantic colors
- typography hierarchy
- responsive behavior
- consistent cards
- accessible status indicators

If the screenshot conflicts with an explicit business requirement,
follow the business requirement.

If `design.md` conflicts with an explicit architectural requirement,
follow the architecture and document the necessary design adjustment.

---

# 7. Component Rules

Prefer small, focused, reusable Vue components.

Good:

```text
KpiCard.vue
ChartCard.vue
StatusBadge.vue
DataSourceStatus.vue
```

Avoid:

```text
Dashboard.vue
  1500 lines
```

Do not put unrelated business logic inside presentational components.

A generic component should not know the details of Google Sheets.

---

# 8. Page vs Component Responsibility

Pages should compose features.

Components should render focused UI.

Composables/services should handle reusable logic.

Preferred:

```text
Page
 ↓
Feature component
 ↓
Composable / Query
 ↓
API client
```

Avoid:

```text
Page
 ↓
direct Google API
 ↓
business calculation
 ↓
chart
```

---

# 9. Data Rules

During UI development:

- use mock data
- keep mock data separate
- do not embed large mock datasets inside components
- shape mock data according to the expected API/canonical model

Do not use raw Google Sheets column names throughout the UI.

Source-specific labels belong to the ingestion/mapping layer.

---

# 10. Business Logic Rules

Do not invent KPI formulas.

Do not hardcode business definitions based only on the Stitch screenshot.

If a KPI formula is not documented:

1. identify the missing definition
2. use a clearly marked placeholder/mock
3. ask for clarification before implementing authoritative logic

Frontend should display KPI results from the API rather than becoming
the authoritative calculation engine.

---

# 11. Validation Rules

Validation is a backend/system responsibility.

Frontend may:

- display validation state
- filter by validation state
- provide UI for Admin configuration when explicitly requested

Frontend must not provide a fake "disable validation" mechanism.

Do not bypass validation merely to make mock data display as valid.

---

# 12. Role Rules

Roles:

```text
Admin
Evaluator
```

Frontend can hide inaccessible UI for usability.

Backend authorization remains authoritative.

Do not implement permission checks only in the frontend
for security-sensitive actions.

Evaluator must not gain UI actions for:

- source configuration
- semantic mapping
- validation rule changes
- KPI definition changes
- validation bypass

unless explicitly authorized.

---

# 13. API Rules

Do not invent or silently change API contracts.

If an endpoint is needed but not defined:

- document the proposed endpoint
- keep the implementation isolated
- clearly label it as provisional

Example:

```http
GET /api/dashboard/production
```

Do not scatter endpoint strings throughout components.

Prefer a centralized API/query layer.

---

# 14. State Management Rules

Use the simplest state mechanism that fits.

Use:

```text
ref/computed
```

for local component state.

Use:

```text
Pinia
```

for genuine application-level client state.

Use:

```text
TanStack Query
```

for server/API state.

Do not duplicate the same server dataset in multiple state systems without a clear reason.

---

# 15. Refresh Rules

Do not create uncontrolled polling.

Any automatic refresh must:

- have a defined interval
- stop/clean up correctly
- expose loading/sync state where appropriate
- avoid unnecessary network traffic

Do not claim "real-time" unless the actual system provides real-time behavior.

---

# 16. Error Handling

Every data-dependent feature should account for:

```text
Loading
Success
Empty
Warning
Error
```

Do not expose raw backend stack traces to users.

Provide actionable user-facing messages.

---

# 17. Responsive Rules

The dashboard is desktop-first but must remain usable on:

- desktop
- tablet
- mobile

Desktop:

- fixed/collapsible sidebar
- full dashboard layout

Tablet:

- reduced/collapsible navigation

Mobile:

- navigation drawer
- stacked content
- horizontally scrollable data tables where necessary

Do not destroy information hierarchy merely to make every desktop table fit into mobile width.

---

# 18. Accessibility Rules

Maintain:

- keyboard accessibility
- visible focus states
- semantic labels
- accessible icon buttons
- sufficient color contrast
- status text in addition to color
- meaningful table headers

Do not rely on color alone for status.

---

# 19. Dependency Rules

Before adding a dependency:

1. Check whether an existing dependency already solves the problem.
2. Check whether Nuxt UI, VueUse, TanStack, or native Vue/Nuxt functionality is sufficient.
3. Avoid duplicate libraries.
4. Add dependencies only when they provide clear value.

Do not install libraries merely because they are popular.

---

# 20. File Modification Rules

Before modifying a file:

- inspect its current content
- understand its role
- preserve unrelated functionality

Do not:

- overwrite the entire project
- regenerate configuration unnecessarily
- delete existing components without checking references
- modify unrelated files
- create duplicate components with similar responsibilities

Prefer minimal, targeted changes.

---

# 21. Configuration Rules

Before changing:

```text
package.json
nuxt.config.ts
tsconfig.json
tailwind configuration
```

inspect the existing configuration.

Do not replace configuration blindly.

If a configuration change is required:

1. explain why
2. make the smallest necessary change
3. validate the application afterward

---

# 22. Visual Implementation Rules

When implementing from Stitch:

1. Inspect the screenshot.
2. Identify major regions.
3. Map them to design.md.
4. Build reusable components.
5. Use real Nuxt UI components where possible.
6. Use Tailwind for custom spacing/layout.
7. Avoid arbitrary one-off CSS unless needed.
8. Compare the rendered result against the reference.
9. Fix visual discrepancies incrementally.

Do not chase pixel perfection before the component architecture is stable.

---

# 23. Current Milestone Rules

The project uses milestone-driven implementation.

Existing foundation milestones:

```text
M2.1 Environment
M2.2 UI Design
M2.2.1 Architecture Foundation
M2.3 Application Shell
M2.4 Routing
M2.5 Component Architecture

Production-first integration roadmap:

1. Architecture and documentation alignment
2. Production API contract and ADR approval
3. Minimal Nuxt Nitro backend foundation
4. Google Sheets read-only ingestion
5. Production schema validation and semantic mapping
6. Production frontend API integration
7. Quality assurance and regression testing
8. Future domain integrations, considered separately after Production is stable
9. Deployment and operational readiness
```

Do not silently implement future phases while completing an earlier milestone.

If the requested task belongs to a later phase, identify it instead of implementing it prematurely.

---

# 24. Current Architecture Milestone

For the architecture foundation milestone, verify that:

- `architecture.md` exists
- `AGENTS.md` exists
- `design.md` exists
- architecture boundaries are documented
- frontend/backend separation is documented
- Google Sheets is backend-only
- canonical data concept is documented
- validation responsibility is documented
- semantic mapping responsibility is documented
- API contract principle is documented
- role boundaries are documented
- Nuxt Nitro server boundaries are documented
- portal integration is documented

Do not build application features as part of this documentation milestone.

---

# 25. Current Application Shell Milestone

When instructed to implement M2.3, limit the scope to:

```text
AppSidebar
AppHeader
default layout
main content area
basic navigation shell
responsive shell
```

Do not implement:

```text
Google Sheets
Nuxt Nitro API
authentication
database
real synchronization
real validation
business KPI calculations
ECharts
advanced tables
```

unless explicitly requested as a separate task.

---

# 26. Verification Protocol

After every meaningful implementation:

1. Run the project.
2. Check the browser.
3. Check the browser console.
4. Check TypeScript errors.
5. Check route behavior.
6. Check responsive behavior when relevant.
7. Fix errors before reporting completion.

Preferred commands:

```bash
npm run dev
```

and, if available/configured:

```bash
npm run typecheck
npm run lint
npm run build
```

Do not claim a feature is complete if validation was not performed.

If a command is unavailable, report that instead of pretending it passed.

---

# 27. Completion Report

After completing a task, report:

```text
Implemented:
- ...

Modified:
- ...

Created:
- ...

Validation:
- ...

Known limitations:
- ...

Next milestone:
- ...
```

Keep the report concise.

---

# 28. When Requirements Are Ambiguous

Do not guess business-critical requirements.

Examples requiring clarification:

- KPI formula
- target definition
- financial aggregation
- source-to-canonical mapping
- role permission
- authentication behavior
- production synchronization frequency
- official API response contract

For visual details, use `design.md` and the Stitch reference
unless they conflict with business requirements.

---

# 29. Security Checklist

Never commit or expose:

```text
Google private keys
service account credentials
OAuth secrets
access tokens
production passwords
API secrets
```

Do not place them in:

```text
.vue files
public/
client-side runtime config
Git
mock data
screenshots
```

Use appropriate server-side environment configuration.

Use only an approved server-side credential mechanism and follow organization
policy. Do not create service-account private keys or bypass credential
restrictions without explicit approval.

---

# 30. Architecture Integrity Checklist

Before introducing a major change, ask:

- Does this belong in the frontend?
- Does this belong in the backend?
- Does this bypass the API boundary?
- Does this couple the UI to Google Sheets?
- Does this introduce business logic into presentation?
- Does this create a new source-specific dependency?
- Does this make future backend replacement harder?
- Does this violate the current milestone scope?

If yes, stop and reconsider the implementation.

---

# 31. Golden Rules

1. Read the docs before coding.
2. Inspect before modifying.
3. Build incrementally.
4. Keep frontend and backend separate.
5. Never expose Google credentials.
6. Do not invent business logic.
7. Do not hardcode production data.
8. Prefer reusable components.
9. Follow the design system.
10. Validate every meaningful change.
11. Do not silently expand milestone scope.
12. Keep the architecture replaceable.

---

# 32. Investment On Farm Planning and Implementation Rules

Investment On Farm is a separate domain dashboard. Its detailed planned
interaction and visual specification belongs in `design.md`; its data and
system boundaries belong in `architecture.md`.

Before substantial On Farm work, read all three project documents and inspect
the existing route, navigation, shared components, and data-layer boundaries.
This planning documentation does not authorize dashboard implementation.

Future implementation may reuse actual generic foundations where they fit:

- the application shell and navigation
- generic filter controls and filter-state patterns
- card, chart-wrapper, table, status, and visualization-state patterns

Do not treat a component as reusable solely from its filename. Production
charts, production tables, production composables, fixtures, and source
adapters remain isolated from On Farm business logic unless their implementation
has been deliberately generalized without changing Production behavior.

For On Farm data and KPIs:

- use only validated source-to-display mappings and documented formulas
- never invent fields, activity catalogues, RKAP-to-SAP mappings, or KPI rules
- keep authoritative validation, reconciliation, and calculations outside Vue
- distinguish reporting year from planting year
- distinguish Activity codes from Cost Element codes
- label mock/prototype data clearly; it is not authoritative company data

Preserve the existing verification protocol and completion report. A future
On Farm implementation must report its changed files, validation performed,
known data limitations, and remaining dependency on approved data mappings.

---

# 33. Reusable Google Sheets Integration Rules

When implementing, maintaining, or extending Google Sheets integrations across any DFARM dashboard (Production, Finance, Investment On-Farm, Investment Off-Farm, or new domain modules), agents must strictly enforce the following mandatory rules:

1. **Inspect Before Implementing**: Before implementing Google Sheets for a new dashboard, inspect the working Production implementation (`server/utils/googleSheetsAccessToken.ts`, `server/utils/googleSheetsReader.ts`, `server/utils/productionSourceConfig.ts`, `server/utils/productionMapper.ts`, `server/api/v1/dashboard/production.get.ts`) and reuse shared infrastructure where appropriate.
2. **Reuse Shared Ingestion Infrastructure**: Do not duplicate Google OAuth authentication, raw Google Sheets API fetch logic, timeout/retry handling, or upstream error sanitization inside individual dashboard modules without a documented technical necessity.
3. **Do Not Reuse Production Mapper for Unrelated Data**: The Production mapper (`productionMapper.ts`) is tailored exclusively to production commodity sheets. Do not force unrelated datasets (e.g. SAP financial ledgers, WBS investments, balance sheets) into the Production mapper.
4. **Domain-Specific Canonical Contracts**: Each dashboard domain must define and validate its own canonical data model and TypeScript contract.
5. **Strict Server-Side Isolation of Configuration & Secrets**: Keep all Spreadsheet IDs, sheet names, A1 ranges, credentials, ADC tokens, and private runtime configuration on the Nitro server. Never expose them to Vue components, client runtime config, or browser storage.
6. **Minimum Necessary Scope**: Enforce read-only authorization scope (`https://www.googleapis.com/auth/spreadsheets.readonly`) for all dashboards where analytical reporting is read-only.
7. **No Hardcoded Client Configuration**: Do not hardcode spreadsheet IDs, sheet names, or range boundaries in frontend components or composables.
8. **Preserve Development Source & Excel Import**: Development source fixtures and manual Excel report import workflows must remain completely independent and fully functional, regardless of Google Sheets network status or credentials.
9. **Never Silently Fall Back to Development**: When a Google Sheets request fails (due to authentication, timeout, or schema mismatch), the dashboard must display an honest error state. It must never silently fall back to Development data or mock fixtures.
10. **Test at the Appropriate Layer**: Provide dedicated tests for each layer:
    - Reader & token provider (server transport tests)
    - Mapper (unit tests against authentic multi-sheet / multi-year grid fixtures)
    - API contract (Nitro endpoint validation tests)
    - Source adapter & source switching (composable and store tests)
11. **Verify Against Raw Spreadsheet Values**: When creating or updating a mapper, verify mapping logic against representative raw unformatted spreadsheet values (including zero vs dash vs empty cell semantics).
12. **Isolate Pre-Existing Test Failures**: When running test suites, distinguish and report pre-existing test failures (e.g. missing external sample workbooks) separately from regressions introduced by current changes.
13. **Do Not Claim Unverified Live Integration**: Do not claim a live Google Sheets integration is functional unless an actual authenticated read has been verified against the target endpoint.
14. **No Speculative Abstractions**: Do not introduce a generic source registry, universal mapper, or dynamic multi-tenant endpoint merely for theoretical reuse. Abstract shared components only when two or more active dashboards demonstrate identical concrete requirements.
15. **Respect Repository Structure**: Always inspect existing directory structures, naming conventions, and file roles before adding, moving, or renaming modules.
