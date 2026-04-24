# NestJS Payment API - AI Agent Guide

This file is the primary instruction source for coding agents in this repository. Keep it concise, factual, and aligned with the current codebase.

## Scope And References

- Use this file for day-to-day execution rules.
- Link to project docs for details instead of duplicating long instructions:
  - [README.md](README.md)
  - [prisma/schema.prisma](prisma/schema.prisma)
  - [prisma.config.ts](prisma.config.ts)

## Verified Commands

```bash
# Install
pnpm install

# Dev / run
pnpm run start:dev
pnpm run start:debug
pnpm run build && pnpm run start:prod

# Quality
pnpm run lint
pnpm run format

# Tests
pnpm run test
pnpm run test:watch
pnpm run test:cov
pnpm run test:e2e

# Prisma
pnpm exec prisma generate
pnpm exec prisma migrate dev --name <change-name>
pnpm exec prisma migrate status
```

## Current Architecture Snapshot

- Root module: `src/app.module.ts` imports `AuthModule`.
- Existing feature module: `src/auth/` (controller + service + module).
- Prisma schema defines `User`, `RefreshToken`, and `Session` models.
- Prisma client output is generated to `src/generated/prisma`.

When adding a new domain module, follow the existing `src/<feature>/` style used by `src/auth/` unless the project structure is intentionally changed.

## Coding Conventions For Agents

- Keep controllers thin; place business logic in services.
- Use constructor injection for dependencies.
- Prefer DTO classes for request/response contracts.
- Add or update tests with each behavior change.
- For async workflows, handle rejected promises explicitly (lint treats floating promises as warnings, but treat them as correctness issues).

## Database And Environment Notes

- `DATABASE_URL` is required for Prisma operations.
- Port is read from `process.env.PORT` with `3000` as fallback.
- If schema changes, run migration + generate before running related tests.

## Testing Expectations

- Unit tests live next to source as `*.spec.ts`.
- E2E tests use `test/jest-e2e.json` and run with `pnpm run test:e2e`.
- Prefer focused tests for:
  - service-layer logic
  - error paths
  - auth/session/token flows when implemented

## Known Project Pitfalls

- `package.json` uses `"type": "module"`; avoid changing module-system settings unless required.
- `start:prod` runs `dist/main`, so build must exist first.
- Prisma migrations directory may be empty in early-stage setups; create the first migration when introducing DB-backed features.

## Available Agent Skills

- [.copilot/skills/scaffold-nestjs-module.md](.copilot/skills/scaffold-nestjs-module.md)
  - Scaffolds a NestJS module with controller/service/tests.
- [.copilot/skills/test-payment-scenarios.md](.copilot/skills/test-payment-scenarios.md)
  - Generates payment-focused test scenarios.
- [.copilot/skills/register-module.md](.copilot/skills/register-module.md)
  - Helps register a module in a parent module.

Use these skills as accelerators, then verify generated output against current folder structure and naming conventions.
