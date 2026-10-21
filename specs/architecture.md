# architecture.md — System Architecture

> Defines module structure, dependency rules, and architectural decisions.
> Claude reads this to understand what is allowed and forbidden.

## Layering Model

API Layer        — Routes, request validation, response mapping
Service Layer    — Business logic, orchestration
Repository Layer — Data access, queries
Database Layer   — Persistence

Rule: Dependencies flow downward only. No layer may import from a layer above it.

## Module Map

[Module name]: [Responsibility]

## Forbidden Imports

[Module A] must not import from [Module B].

## External Dependencies

[Dependency]: [Version] — [Why it is used]

## Testing (CR-032)

- Test runner: Vitest (`npm test`, `npm run test:watch`). Config: `vitest.config.mts` (Node environment, `@/*` alias mirrors tsconfig, `TZ=UTC` to match the production container).
- Tests live next to the code they test: `lib/*.test.ts` (pure functions) and `app/api/**/route.test.ts` (route handlers called directly with `NextRequest`).
- Mocking boundaries: tests never touch a real database, S3, SMTP or Sentry. Route tests mock `@/lib/prisma`, `@/lib/auth` (`getSession`), `@/lib/storage`, `@/lib/email` and `@sentry/nextjs` with `vi.mock`; `lib/storage.ts` tests mock `@aws-sdk/client-s3`.
- What the automated tests do not cover (real SQL/cascade, S3, SMTP, UI) is covered by the manual checklist in `docs/SMOKE-TEST.md`.
- Tests are not run in the Docker build or in Coolify; they run locally before push.

## Architectural Decisions

See sessions/DECISIONS.md for the full log.
