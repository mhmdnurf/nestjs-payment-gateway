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
- Uses guarded balance debit and serializable transaction retry for write conflicts.
- Both `TRANSFER_OUT` (sender) and `TRANSFER_IN` (recipient) transactions are recorded with the same `reference`.

Successful response:

```json
{
  "reference": "TRF-20260611-A3F91C0D7B24E801",
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
      "description": "Xendit wallet top-up WTU-20260611-21D2901A94816C7A",
      "reference": "WTU-20260611-21D2901A94816C7A",
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

## Payments module

User wallet top-ups are created through the payments flow. Direct user wallet crediting is not exposed as a public wallet endpoint.

### Create wallet top-up invoice

`POST /api/v1/payments/wallet-top-ups` — **requires JWT**

Headers:

```
Authorization: Bearer <accessToken>
Content-Type: application/json
Idempotency-Key: <unique-client-generated-key>
```

`Idempotency-Key` is optional but recommended. Send the same key when retrying the same top-up request after a timeout or network error.

Request body:

```json
{
  "amount": 10000
}
```

Validation rules:

- `amount`: minimum `1000`, max 2 decimal places.

Behavior:

- Creates a local `WalletTopUp` record with `PENDING` status.
- Creates a Xendit invoice using the local top-up `reference` as Xendit `external_id`.
- Stores the Xendit invoice ID, invoice URL, and expiry time.
- Does not credit the wallet immediately. Wallet credit happens only after a paid Xendit webhook.
- If the same authenticated user sends the same `Idempotency-Key` again, the API returns the existing top-up instead of creating a duplicate invoice.
- Concurrent duplicate requests with the same `Idempotency-Key` are handled using the database unique constraint on `(userId, idempotencyKey)`.

Successful response:

```json
{
  "id": "cuid",
  "reference": "WTU-20260611-21D2901A94816C7A",
  "status": "PENDING",
  "amount": "10000",
  "currency": "IDR",
  "invoiceUrl": "https://checkout-staging.xendit.co/web/6a2ae1bf91a293a99d849ccb"
}
```

---

### Xendit invoice webhook

`POST /api/v1/payments/webhooks/xendit`

Headers:

```
Content-Type: application/json
x-callback-token: <XENDIT_WEBHOOK_TOKEN>
```

Example paid webhook body:

```json
{
  "id": "6a2ae1bf91a293a99d849ccb",
  "external_id": "WTU-20260611-21D2901A94816C7A",
  "status": "PAID",
  "amount": 10000,
  "paid_at": "2026-06-11T16:30:00.000Z"
}
```

Behavior:

- Verifies `x-callback-token` against `XENDIT_WEBHOOK_TOKEN`.
- Looks up `WalletTopUp` by `external_id`.
- Ignores extra Xendit fields that are not needed by the wallet-crediting flow.
- Validates the money-critical fields used by the service: `id`, `external_id`, `status`, `amount` or `paid_amount`, and `currency`.
- `PAID` or `SETTLED`: marks top-up as `PAID`, credits the wallet once, and creates a `TOP_UP` wallet transaction.
- Duplicate paid webhooks are accepted but do not credit the wallet again.
- `EXPIRED` and `FAILED`: update pending top-up status without changing wallet balance.
- Webhook success/failure is logged by `PaymentsController`.

Successful response:

```json
{
  "received": true,
  "credited": true,
  "status": "PAID"
}
```

Duplicate paid webhook response:

```json
{
  "received": true,
  "credited": false,
  "status": "PAID"
}
```

---

### List wallet top-ups

`GET /api/v1/payments/wallet-top-ups` — **requires JWT**

Headers:

```
Authorization: Bearer <accessToken>
```

Query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer ≥ 1 | `1` | Page number |
| `limit` | integer 1–100 | `10` | Items per page |
| `status` | enum | — | Filter by status: `PENDING`, `PAID`, `EXPIRED`, `FAILED` |

Example: `GET /api/v1/payments/wallet-top-ups?page=1&limit=10&status=PAID`

Successful response:

```json
{
  "items": [
    {
      "id": "cuid",
      "reference": "WTU-20260611-21D2901A94816C7A",
      "amount": "10000",
      "currency": "IDR",
      "status": "PAID",
      "invoiceUrl": "https://checkout-staging.xendit.co/web/6a2ae1bf91a293a99d849ccb",
      "paidAt": "2026-06-11T16:30:00.000Z",
      "expiredAt": "2026-06-12T16:26:40.462Z",
      "createdAt": "2026-06-11T16:26:39.406Z",
      "updatedAt": "2026-06-11T16:39:38.609Z"
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

### Get wallet top-up detail

`GET /api/v1/payments/wallet-top-ups/:id` — **requires JWT**

Headers:

```
Authorization: Bearer <accessToken>
```

Behavior:

- Returns only top-ups owned by the authenticated user.
- Returns `404 Not Found` if the top-up does not exist or belongs to another user.

Successful response:

```json
{
  "id": "cuid",
  "reference": "WTU-20260611-21D2901A94816C7A",
  "amount": "10000",
  "currency": "IDR",
  "status": "PAID",
  "invoiceUrl": "https://checkout-staging.xendit.co/web/6a2ae1bf91a293a99d849ccb",
  "paidAt": "2026-06-11T16:30:00.000Z",
  "expiredAt": "2026-06-12T16:26:40.462Z",
  "createdAt": "2026-06-11T16:26:39.406Z",
  "updatedAt": "2026-06-11T16:39:38.609Z"
}
```

---

## Xendit local testing

For real Xendit webhook testing on a local machine, expose the local Nest server with ngrok:

```bash
ngrok http 3000
```

Set the Xendit invoice paid webhook URL to:

```txt
https://<your-ngrok-domain>/api/v1/payments/webhooks/xendit
```

Testing flow:

1. Start the API with `pnpm run start:dev`.
2. Start ngrok and confirm it forwards to the same port as the API.
3. Configure the Xendit invoice webhook URL and callback token in the Xendit dashboard.
4. Create a top-up invoice with `POST /api/v1/payments/wallet-top-ups`.
5. Open the returned `invoiceUrl` and complete a test payment in the Xendit checkout page.
6. Check `GET /api/v1/payments/wallet-top-ups` and `GET /api/v1/wallets/me`.

Debugging tools:

- Nest logs appear in the terminal running `pnpm run start:dev`.
- ngrok request inspection is available at `http://127.0.0.1:4040`.
- A webhook that fails DTO/service validation returns a JSON error response visible in ngrok inspector.

Manual webhook simulation:

```bash
curl -X POST http://localhost:3000/api/v1/payments/webhooks/xendit \
  -H "Content-Type: application/json" \
  -H "x-callback-token: <XENDIT_WEBHOOK_TOKEN>" \
  -d '{
    "id": "manual-test-invoice-id",
    "external_id": "WTU-20260611-21D2901A94816C7A",
    "status": "PAID",
    "amount": 10000,
    "paid_amount": 10000,
    "currency": "IDR",
    "paid_at": "2026-06-11T16:30:00.000Z"
  }'
```

The `external_id` must match an existing local `WalletTopUp.reference`.

---

## Auth environment variables

### Required

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `XENDIT_SECRET_KEY`
- `XENDIT_WEBHOOK_TOKEN`

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
