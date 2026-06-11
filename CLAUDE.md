# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev
pnpm install
pnpm run start:dev          # watch mode
pnpm run start:debug        # debug + watch mode
pnpm run build && pnpm run start:prod

# Quality
pnpm run lint               # ESLint with auto-fix
pnpm run format             # Prettier

# Tests
pnpm run test               # all unit tests
pnpm run test:watch         # watch mode
pnpm run test:cov           # with coverage
pnpm run test:e2e           # E2E tests (test/jest-e2e.json)

# Run a single test file
pnpm run test -- --testPathPattern=auth.service

# Prisma
pnpm exec prisma generate
pnpm exec prisma migrate dev --name <change-name>
pnpm exec prisma migrate status
```

## Architecture

**Global setup** ([src/main.ts](src/main.ts)):
- Global prefix: `api/v1`
- `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- Validation errors return a structured `{ errors: { field: string[] } }` body
- Port from `PORT` env, fallback `3000`
- Rate limiting via `ThrottlerModule` (30 req / 60s global); sensitive endpoints override with `@Throttle`

**Module structure**:
- `PrismaModule` / `PrismaService` — singleton Prisma client using `@prisma/adapter-pg` (native PG adapter, not the default binary)
- `AuthModule` — full auth lifecycle (register → email verify → login → refresh → logout)
- `UsersModule` — `GET/PATCH /api/v1/users/me`
- `WalletsModule` — wallet balance, top-up, transfers, transaction history
- `MailModule` — wraps `@nestjs-modules/mailer` for transactional emails (verification, password reset)

**Generated Prisma client** is output to `src/generated/prisma` (not `node_modules`). Import from `src/generated/prisma/client` (server) or `src/generated/prisma/browser` (for `Prisma.Decimal`).

## Auth flow

Users must verify email before logging in (`isActive` stays `false` until `emailVerifiedAt` is set).

Token architecture:
- **Access token**: short-lived JWT signed with `JWT_ACCESS_SECRET`; payload contains `{ sub, username, role, sessionId }`
- **Refresh token**: opaque random bytes stored as `sha256` hash in DB, linked to a `Session`
- Token rotation: each refresh revokes the old token and issues a new one; reuse detection revokes the entire session
- `JwtAccessGuard` (`src/auth/guards/jwt-access.guard.ts`) — manual guard, sets `req.user`; no Passport dependency

## Database models (prisma/schema.prisma)

| Model | Key fields |
|---|---|
| `User` | `isActive`, `emailVerifiedAt`, `failedLoginAttempts`, `lockedUntil` |
| `Session` | one per login; holds `userAgent`, `ipAddress`, `revokedAt` |
| `RefreshToken` | `tokenHash` (sha256), `revokedAt`, `replacedByTokenId` |
| `EmailVerificationToken` | `tokenHash`, `usedAt`, 15 min expiry |
| `PasswordResetToken` | `tokenHash`, `usedAt`, 15 min expiry |
| `Wallet` | one per user (auto-created on register), `balance` as `Decimal(18,2)`, `currency` defaults `IDR` |
| `WalletTransaction` | types: `TOP_UP`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADJUSTMENT` |

All monetary amounts are `Prisma.Decimal` — never use JS `number` for balance arithmetic.

Wallet is created inside the same `$transaction` as user creation during registration.

## Coding conventions

- Controllers are thin — delegate all logic to services
- DTOs live in `<module>/dto/` and are used for both request and response shapes
- Authenticated endpoints use `@UseGuards(JwtAccessGuard)` and read `req.user.sub` / `req.user.sessionId`
- `PrismaService` is provided globally via `PrismaModule` (exported); do not re-provide it in feature modules
- All sensitive token values are hashed (`sha256` via `createHash('sha256')`) before DB storage; raw values are only ever in memory or sent to the client
- Password reset and email verification both revoke all existing sessions as a side effect
- Unit tests live alongside source as `*.spec.ts`; mock `PrismaService`, `JwtService`, `MailService` in unit tests

## Environment variables

Required:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET`

Optional (with defaults):
- `AUTH_MAX_FAILED_LOGIN` (default `5`)
- `AUTH_LOCK_MINUTES` (default `15`)
- `JWT_ACCESS_EXPIRES_IN` (default `900` seconds)
- `REFRESH_TOKEN_EXPIRES_DAYS` (default `7`)
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`
- `FRONTEND_URL` — used to build email links
- `APP_NAME`, `APP_DOMAIN` — used in email footer

All optional numeric env vars must be positive integers if provided; invalid values throw at startup.

## API endpoints summary

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/change-password` (JWT), `GET /auth/sessions` (JWT), `DELETE /auth/sessions/:id` (JWT) |
| Users | `GET /users/me` (JWT), `PATCH /users/me` (JWT) |
| Wallets | `GET /wallets/me` (JWT), `POST /wallets/top-up` (JWT), `GET /wallets/me/transactions` (JWT), `POST /wallets/transfer` (JWT) |
