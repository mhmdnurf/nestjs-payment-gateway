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

---

## API Reference

Base path: `api/v1` (set globally in `src/main.ts`)

---

## Auth module

### Register

`POST /api/v1/auth/register`

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
- A wallet is automatically created for the user.
- A verification email is sent after successful registration.
- Duplicate email/username returns `409 Conflict`.
- Rate-limited to 5 requests / 60s.

Successful response:

```json
{
  "id": "cuid",
  "email": "user@example.com",
  "username": "zakaria",
  "name": "Zakaria",
  "role": "USER",
  "isActive": false,
  "emailVerifiedAt": null,
  "createdAt": "2026-05-31T00:00:00.000Z"
}
```

---

### Verify email

`POST /api/v1/auth/verify-email`

Request body:

```json
{
  "token": "<token-from-email>"
}
```

Behavior:

- Token is hashed (`sha256`) before DB lookup.
- Token expires in 15 minutes.
- Marks the user as `isActive = true` on success.

Successful response:

```json
{
  "message": "Email verified successfully"
}
```

---

### Resend verification email

`POST /api/v1/auth/resend-verification`

Request body:

```json
{
  "email": "user@example.com"
}
```

Behavior:

- Returns a generic message regardless of whether the account exists (prevents user enumeration).
- Previous unused tokens are invalidated before issuing a new one.
- Rate-limited to 5 requests / 60s.

Successful response:

```json
{
  "message": "If the account exists and is not yet verified, a verification email has been sent."
}
```

---

### Login

`POST /api/v1/auth/login`

Request body:

```json
{
  "username": "zakaria",
  "password": "password123"
}
```

Behavior:

- Username lookup is case-insensitive (stored and input are both normalized to lowercase).
- Password comparison is case-sensitive.
- User must have verified their email (`isActive = true`) before logging in.
- Failed login attempts are counted; account is temporarily locked when attempts reach `AUTH_MAX_FAILED_LOGIN`.
- On successful login, a new session and refresh token are created; `userAgent` and `ipAddress` are stored.
- Rate-limited to 5 requests / 60s.

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

---

### Refresh token

`POST /api/v1/auth/refresh`

Request body:

```json
{
  "refreshToken": "<opaque-token>"
}
```

Behavior:

- Refresh token is hashed (`sha256`) before DB lookup.
- Only active, non-revoked, non-expired token + session are accepted.
- If refresh token reuse is detected, the entire session is revoked.
- On success, the current token is revoked and a new one is issued (token rotation).
- Inactive users (`isActive = false`) receive `403 Forbidden`.
- Rate-limited to 10 requests / 60s.

Successful response:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<new-opaque-token>",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

---

### Logout

`POST /api/v1/auth/logout`

Request body:

```json
{
  "refreshToken": "<opaque-token>"
}
```

Behavior:

- Revokes the session associated with the provided refresh token.
- If the token is not found, returns success silently.

Successful response:

```json
{
  "message": "Logged out successfully"
}
```

---

### Logout all sessions

`POST /api/v1/auth/logout-all`

Request body:

```json
{
  "refreshToken": "<opaque-token>"
}
```

Behavior:

- Revokes all active sessions for the user associated with the provided token.

Successful response:

```json
{
  "message": "Logged out from all sessions successfully"
}
```

---

### Forgot password

`POST /api/v1/auth/forgot-password`

Request body:

```json
{
  "email": "user@example.com"
}
```

Behavior:

- Returns a generic message regardless of whether the account exists (prevents user enumeration).
- Sends a password reset email with a token that expires in 15 minutes.
- Rate-limited to 5 requests / 60s.

Successful response:

```json
{
  "message": "If the account exists, a password reset link has been sent"
}
```

---

### Reset password

`POST /api/v1/auth/reset-password`

Request body:

```json
{
  "token": "<token-from-email>",
  "newPassword": "newpassword123"
}
```

Behavior:

- `newPassword` must be at least 8 characters.
- Token is hashed (`sha256`) before DB lookup; expires in 15 minutes.
- All active sessions for the user are revoked on success.

Successful response:

```json
{
  "message": "Password has been reset successfully"
}
```

---

### Change password

`POST /api/v1/auth/change-password` — **requires JWT**

Headers:

```
Authorization: Bearer <accessToken>
```

Request body:

```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

Behavior:

- `newPassword` must be at least 8 characters and different from `currentPassword`.
- All sessions except the current one are revoked on success.

Successful response:

```json
{
  "message": "password changed successfully"
}
```

---

### List sessions

`GET /api/v1/auth/sessions` — **requires JWT**

Headers:

```
Authorization: Bearer <accessToken>
```

Successful response:

```json
{
  "sessions": [
    {
      "id": "cuid",
      "userAgent": "Mozilla/5.0 ...",
      "ipAddress": "127.0.0.1",
      "lastSeenAt": "2026-05-31T00:00:00.000Z",
      "expiresAt": "2026-06-07T00:00:00.000Z",
      "isCurrent": true
    }
  ]
}
```

---

### Revoke session

`DELETE /api/v1/auth/sessions/:sessionId` — **requires JWT**

Headers:

```
Authorization: Bearer <accessToken>
```

Behavior:

- Revokes any session belonging to the authenticated user.
- Revoking the current session logs the user out immediately.

Successful response:

```json
{
  "message": "Session revoked successfully"
}
```

---

## Users module

### Get current user

`GET /api/v1/users/me` — **requires JWT**

Headers:

```
Authorization: Bearer <accessToken>
```

Successful response:

```json
{
  "id": "cuid",
  "email": "user@example.com",
  "username": "zakaria",
  "name": "Zakaria",
  "role": "USER",
  "isActive": true,
  "emailVerifiedAt": "2026-05-31T00:00:00.000Z",
  "createdAt": "2026-05-31T00:00:00.000Z"
}
```

---

### Update current user

`PATCH /api/v1/users/me` — **requires JWT**

Headers:

```
Authorization: Bearer <accessToken>
```

Request body (all fields optional):

```json
{
  "name": "New Name",
  "username": "new_username"
}
```

Validation rules:

- `name`: 2–50 characters.
- `username`: 3–30 characters, lowercase letters, numbers, and underscores only.

Successful response: same shape as `GET /api/v1/users/me`.

---

## Wallets module

### Get wallet

`GET /api/v1/wallets/me` — **requires JWT**

Headers:

```
Authorization: Bearer <accessToken>
```

Successful response:

```json
{
  "id": "cuid",
  "balance": "10000.00",
  "currency": "IDR",
  "createdAt": "2026-05-31T00:00:00.000Z",
  "updatedAt": "2026-05-31T00:00:00.000Z"
}
```

---

### Top up wallet

`POST /api/v1/wallets/top-up` — **requires JWT**

Headers:

```
Authorization: Bearer <accessToken>
```

Request body:

```json
{
  "amount": 50000,
  "description": "Initial top-up"
}
```

Validation rules:

- `amount`: minimum `0.01`.
- `description`: optional, max 255 characters.

Successful response:

```json
{
  "walletId": "cuid",
  "balance": "60000.00",
  "currency": "IDR",
  "transactionId": "cuid",
  "transactionType": "TOP_UP",
  "amount": "50000.00",
  "balanceAfter": "60000.00",
  "description": "Initial top-up",
  "reference": "TOP_UP-1748649600000-<walletId>",
  "createdAt": "2026-05-31T00:00:00.000Z"
}
```

---

### Transfer

`POST /api/v1/wallets/transfer` — **requires JWT**

Headers:

```
Authorization: Bearer <accessToken>
```

Request body:

```json
{
  "recipientUsername": "another_user",
  "amount": 10000,
  "description": "Payment for services"
}
```

Validation rules:

- `recipientUsername`: lowercase letters, numbers, and underscores only.
- `amount`: minimum `0.01`, max 2 decimal places.
- `description`: optional, max 255 characters.

Behavior:

- Cannot transfer to your own wallet.
- Sender and recipient wallets must share the same `currency`.
- Returns `400 Bad Request` if sender has insufficient balance.
- Both `TRANSFER_OUT` (sender) and `TRANSFER_IN` (recipient) transactions are recorded with the same `reference`.

Successful response:

```json
{
  "reference": "TRF-1748649600000-<senderWalletId>",
  "senderWalletId": "cuid",
  "senderBalance": "40000.00",
  "recipientWalletId": "cuid",
  "recipientUsername": "another_user",
  "recipientBalance": "60000.00",
  "amount": "10000.00",
  "description": "Payment for services",
  "transferOutTransactionId": "cuid",
  "transferInTransactionId": "cuid",
  "createdAt": "2026-05-31T00:00:00.000Z"
}
```

---

### List wallet transactions

`GET /api/v1/wallets/me/transactions` — **requires JWT**

Headers:

```
Authorization: Bearer <accessToken>
```

Query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer ≥ 1 | `1` | Page number |
| `limit` | integer 1–100 | `10` | Items per page |
| `type` | enum | — | Filter by type: `TOP_UP`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADJUSTMENT` |

Example: `GET /api/v1/wallets/me/transactions?page=1&limit=10&type=TOP_UP`

Successful response:

```json
{
  "items": [
    {
      "id": "cuid",
      "type": "TOP_UP",
      "amount": "50000.00",
      "balanceAfter": "60000.00",
      "description": "Initial top-up",
      "reference": "TOP_UP-1748649600000-<walletId>",
      "createdAt": "2026-05-31T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

## Auth environment variables

### Required

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`

### Optional

| Variable | Default | Description |
|---|---|---|
| `AUTH_MAX_FAILED_LOGIN` | `5` | Failed attempts before account lock |
| `AUTH_LOCK_MINUTES` | `15` | Lock duration in minutes |
| `JWT_ACCESS_EXPIRES_IN` | `900` | Access token TTL in seconds |
| `REFRESH_TOKEN_EXPIRES_DAYS` | `7` | Refresh token TTL in days |
| `MAIL_HOST` | — | SMTP host |
| `MAIL_PORT` | — | SMTP port |
| `MAIL_USER` | — | SMTP username |
| `MAIL_PASS` | — | SMTP password |
| `MAIL_FROM` | — | Sender address |
| `FRONTEND_URL` | — | Used to build email links |
| `APP_NAME` | `Yourapp.com` | Shown in email footer |
| `APP_DOMAIN` | — | Used for support email in footer |

### Notes

- `expiresIn` in API responses is in seconds.
- `JWT_ACCESS_EXPIRES_IN` must be a positive integer when provided.
- Invalid numeric env values cause a startup error.
