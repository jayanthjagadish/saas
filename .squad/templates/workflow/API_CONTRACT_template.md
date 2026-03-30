# API Contract — {{PROJECT_NAME}}

**Version:** 1.0.0
**Last Updated:** {{PROJECT_START_DATE}}
**Owner:** {{BACKEND_NAME}}
**Reviewed by:** {{LEAD_NAME}}

---

> **Instructions for {{BACKEND_NAME}}:**
> Fill in this file completely before {{FRONTEND_NAME}} or {{TESTER_NAME}} begins work on any feature.
> Every section marked `TODO` must be completed. Do not leave TODOs in a committed contract.
> Breaking changes (removed fields, renamed routes, changed response shapes) require a version bump and 24h notice.

---

## Overview

{{PROJECT_NAME}} API — base URL: `{{BASE_URL}}`

All endpoints return the standard response envelope:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

---

## Authentication

### `POST /api/v1/auth/register`
Register a new user account.

**Request:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)",
  "name": "string (required)"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "email": "string",
    "accessToken": "string (JWT, 15min expiry)"
  }
}
```

**Errors:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 409 | `EMAIL_ALREADY_EXISTS` | Email already registered |

---

### `POST /api/v1/auth/login`
Authenticate and receive tokens.

**Request:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "email": "string",
    "accessToken": "string (JWT, 15min expiry)"
  }
}
```

> Refresh token set as httpOnly cookie: `refreshToken` (30-day expiry).

**Errors:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing fields |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 429 | `RATE_LIMITED` | >5 attempts / 15min |

---

### `POST /api/v1/auth/logout`
Invalidate the current session.

**Request:** No body required. Sends `refreshToken` cookie automatically.

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

### `POST /api/v1/auth/refresh`
Exchange refresh token for a new access token.

**Request:** Sends `refreshToken` cookie automatically.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "string (JWT, 15min expiry)"
  }
}
```

**Errors:**

| Status | Code | When |
|---|---|---|
| 401 | `INVALID_REFRESH_TOKEN` | Token missing, expired, or revoked |

---

## Resources

> **TODO:** Add a section for each resource in your project.
> Copy the pattern below and fill it in.

### `GET /api/v1/{resource}`
List all {resource}s for the authenticated user.

**Headers:** `Authorization: Bearer {accessToken}`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [ { "TODO": "define item shape" } ],
    "total": "number",
    "page": "number",
    "pageSize": "number"
  }
}
```

---

### `POST /api/v1/{resource}`
Create a new {resource}.

**Headers:** `Authorization: Bearer {accessToken}`, `Idempotency-Key: {uuid}`

**Request:**
```json
{
  "TODO": "define required fields"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": { "TODO": "define created resource shape" }
}
```

**Errors:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 401 | `UNAUTHORIZED` | No valid access token |

---

### `GET /api/v1/{resource}/{id}`
Get a single {resource} by ID.

**Headers:** `Authorization: Bearer {accessToken}`

**Response 200:**
```json
{
  "success": true,
  "data": { "TODO": "define resource shape" }
}
```

**Errors:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | No valid access token |
| 404 | `NOT_FOUND` | Resource does not exist or does not belong to user |

---

### `PATCH /api/v1/{resource}/{id}`
Update a {resource}.

**Headers:** `Authorization: Bearer {accessToken}`, `Idempotency-Key: {uuid}`

**Request:**
```json
{
  "TODO": "define updatable fields (all optional for partial update)"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": { "TODO": "define updated resource shape" }
}
```

---

### `DELETE /api/v1/{resource}/{id}`
Delete a {resource}.

**Headers:** `Authorization: Bearer {accessToken}`

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Deleted successfully" }
}
```

---

## Webhooks

> **TODO:** Add webhook endpoints if your project uses them (e.g., Stripe, GitHub, Slack).

### `POST /api/v1/webhooks/{provider}`
Receive events from `{provider}`.

**Headers:** `{Provider-Signature-Header}: {signature}`

**Security:** Signature verified using provider's SDK before any processing. Unsigned webhooks return `400`.

**Idempotency:** Events are processed exactly once. Duplicate event IDs are ignored.

**Response 200:**
```json
{ "received": true }
```

**Errors:**

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_SIGNATURE` | Signature verification failed |

---

## Test Hooks *(dev/test environments only)*

These endpoints are **disabled in production** (return 404 unless `NODE_ENV=test`).

### `POST /api/test/seed-user`
Create a user in a known state for E2E tests.

**Headers:** `X-Test-Secret: {test secret from env}`

**Request:**
```json
{
  "email": "string",
  "password": "string",
  "role": "string (optional)"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": { "userId": "string", "email": "string" }
}
```

---

### `POST /api/test/reset-state`
Reset test-specific state between test runs.

**Headers:** `X-Test-Secret: {test secret from env}`

**Response 200:**
```json
{ "success": true, "data": { "message": "State reset" } }
```

---

### `GET /api/test/health`
Confirm backend is running and DB is reachable.

**Response 200:**
```json
{
  "success": true,
  "data": { "status": "ok", "db": "connected", "timestamp": "ISO 8601" }
}
```

---

## Standard Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/params/query failed validation |
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource or state conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Changelog

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | {{PROJECT_START_DATE}} | {{BACKEND_NAME}} | Initial contract |
