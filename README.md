# Payment API

NestJS + Prisma backend for payment-related services.

## Project setup

```bash
pnpm install
```

## Run

```bash
# development
pnpm run start:dev

# debug
pnpm run start:debug

# production
pnpm run build
pnpm run start:prod
```

## Quality

```bash
pnpm run lint
pnpm run format
```

## Tests

```bash
pnpm run test
pnpm run test:watch
pnpm run test:cov
pnpm run test:e2e
```

## Prisma

```bash
pnpm exec prisma generate
pnpm exec prisma migrate dev --name <change-name>
pnpm exec prisma migrate status
```

## Auth module

Base path uses global prefix from `src/main.ts`:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

### Register

Request body:

```json
{
  "email": "user@example.com",
  "username": "zakaria",
  "password": "password123",
  "name": "Zakaria"
}
```

Behavior:

- `email` is normalized with `trim().toLowerCase()`.
- `username` is normalized with `trim().toLowerCase()`.
- `name` is normalized with `trim()`, and empty value is stored as `null`.
- `password` is hashed using `bcrypt`.
- Duplicate email/username returns `409 Conflict`.

Successful response:

```json
{
  "id": "cuid",
  "email": "user@example.com",
  "username": "zakaria",
  "name": "Zakaria",
  "role": "USER",
  "createdAt": "2026-05-31T00:00:00.000Z"
}
```

### Login

Request body:

```json
{
  "username": "zakaria",
  "password": "password123"
}
```

Behavior:

- Username lookup is case-insensitive because stored and input values are normalized to lowercase.
- Password comparison remains case-sensitive.
- Failed login attempts are counted.
- Account is temporarily locked when failed attempts reach `AUTH_MAX_FAILED_LOGIN`.
- On successful login:
- Existing active sessions and refresh tokens for the same user are revoked.
- A new session and refresh token are created.
- `userAgent` and `ipAddress` are stored into session metadata.

Successful response:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque-token>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "cuid",
    "email": "user@example.com",
    "username": "zakaria",
    "name": "Zakaria",
    "role": "USER"
  }
}
```

### Refresh token

Request body:

```json
{
  "refreshToken": "<opaque-token>"
}
```

Behavior:

- Refresh token is hashed (`sha256`) before DB lookup.
- Only active, non-revoked, non-expired token + session are accepted.
- If refresh token reuse is detected, active tokens/sessions for that user are revoked.
- On success, refresh token is rotated:
- Current token is revoked and marked used.
- New refresh token is issued.
- Inactive users (`isActive = false`) cannot refresh and receive `403 Forbidden`.

Successful response:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<new-opaque-token>",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

### Access token expiry unit

- `expiresIn` in API responses is in seconds.
- `JWT_ACCESS_EXPIRES_IN` is read as positive integer seconds when numeric.
- Example: `900` means 15 minutes.

### Required environment variables

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`

### Optional auth environment variables

- `AUTH_MAX_FAILED_LOGIN` default `5`
- `AUTH_LOCK_MINUTES` default `15`
- `JWT_ACCESS_EXPIRES_IN` default `900`
- `REFRESH_TOKEN_EXPIRES_DAYS` default `7`

Validation rules:

- Optional numeric variables use defaults if missing/empty.
- If provided, numeric variables must be positive integers.
- Invalid values fail startup with configuration error.
