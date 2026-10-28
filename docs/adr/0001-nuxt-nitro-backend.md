# ADR-0001: Nuxt Nitro Backend Architecture

- Status: Approved architectural direction
- Date: 2026-10-27
- Scope: DFARM backend architecture and initial Production integration

## Decision

DFARM will use Nuxt Nitro as its backend architecture. The Nuxt frontend and
Nitro backend will remain in the same repository. Nitro server routes will
expose explicit API contracts, while server-side services will own source
access, ingestion, validation, semantic mapping, and business calculations.

The first backend integration targets the Production domain only and uses
Google Sheets as a read-only source. Finance, On-Farm, and Off-Farm remain
outside this initial integration scope.

## Context

The existing application is a Nuxt 4, Vue 3, and TypeScript application with
source abstractions, local-data workflows, canonical Production types, and a
planned Google Sheets adapter. The repository needs a backend boundary for the
future Production API without coupling the frontend directly to Google Sheets.

Nuxt Nitro provides a single-repository full-stack boundary that fits the
existing application while keeping server-only credentials and data logic away
from the browser.

## Alternatives Considered

### Django REST Framework

Django REST Framework was considered as a separate backend implementation.
It was not selected because it would introduce a second application boundary
and repository/runtime concern for a project already built on Nuxt. No Django
backend is required for the approved DFARM architecture.

### Direct browser-to-Google-Sheets access

Direct browser access was rejected because it would expose credentials or
require unsafe client-side authorization, couple UI code to source-specific
schemas, and bypass server-side validation, mapping, and business rules.

## Consequences

Positive consequences:

- one repository and application runtime for the initial full-stack boundary
- server-only access to Google credentials and source systems
- clear separation between route handlers and domain services
- frontend portability through explicit API contracts
- existing Excel import and local-data workflows can remain available

Trade-offs:

- Nitro hosting and server deployment constraints must be verified
- authentication and deployment identity still require operational decisions
- caching, refresh policy, and persistent storage are not resolved by this ADR
- server code must maintain a deliberate boundary so route handlers do not
  absorb ingestion or business logic

## Security Requirements

- Google credentials, access tokens, and private keys remain server-only.
- Secrets must not be placed in `runtimeConfig.public`, browser storage,
  frontend bundles, committed configuration, or Vue components.
- Google Sheets access is read-only for the initial Production integration.
- The approved server-side credential mechanism must comply with organization
  policy; this ADR does not authorize creation of service-account keys.
- Authentication and authorization remain backend responsibilities.
- Local authentication behavior must not be assumed to work in deployment
  without verification.

## Initial Scope

This decision enables the following future work, in order:

1. Production API contract and ADR review.
2. Minimal Nitro server foundation.
3. Google Sheets read-only ingestion.
4. Production schema validation and semantic mapping.
5. Production frontend API integration.
6. Quality assurance and Excel regression testing.

No API route, Nitro service, Google authentication, or source integration is
implemented by this ADR.

## Deferred Decisions

The following decisions remain open:

- hosting and deployment topology
- deployment identity and authentication/SSO mechanism
- cache policy and refresh interval
- monitoring and operational alerting
- whether persistent storage will ever be required
- detailed Production API response and error contract
- integration timing for Finance, On-Farm, and Off-Farm

## References

- `architecture.md`
- `AGENTS.md`
- `design.md`
