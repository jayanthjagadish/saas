# Fenster API Contract
> **This is the source of truth for all API routes.**  
> Frontend agents (Senthil) and Tester agents (Baskar) MUST read this before building UI calls or tests.  
> Backend agent (Karthi) MUST update this file when adding/changing routes.

## Base URL
- API Server: `http://localhost:3001`
- Frontend accesses via Vite proxy: `/api/*` → `http://localhost:3001/*` (strips `/api` prefix)
- Frontend calls: `axios.post('/api/auth/login')` → hits backend at `POST /auth/login`

## Standard Response Format
All endpoints return:
- Success: `{ success: true, data: T }`
- Error: `{ success: false, error: 'ERROR_CODE', message: 'human readable' }`
- **Exception:** Auth signup returns `{ success: true, data: { user_id, email, message } }` (not wrapped in `data`)
- **Exception:** `POST /subscriptions` returns `{ subscription_id, client_secret }` (no `success` wrapper)
- **Exception:** Some older endpoints return `{ error: 'CODE' }` without `success: false` — see per-route notes

## Authentication
- Access token: Bearer token in `Authorization: Bearer <token>` header
- Refresh token: httpOnly cookie `refresh_token` (set on login, rotated on refresh)
- Protected routes require valid access token; "Cookie" means only the refresh cookie is needed

## Password Requirements
Signup: ≥12 chars, 1 uppercase, 1 number, 1 special character.  
Reset: ≥8 chars, 1 uppercase, 1 number.

---

## Routes

### Auth — `/auth`
| Method | Path | Auth | Request Body | Response `data` | Error Codes |
|--------|------|------|-------------|-----------------|-------------|
| POST | /auth/signup | No | `{ email, password, company_name? }` | `{ user_id, email, message }` | `INVALID_INPUT`, `WEAK_PASSWORD`, `EMAIL_EXISTS`, `INTERNAL_ERROR` |
| POST | /auth/login | No | `{ email, password, remember?: boolean }` | `{ accessToken, userId, email }` | `INVALID_INPUT`, `UNVERIFIED`, `INVALID_CREDENTIALS`, `INTERNAL_ERROR` |
| POST | /auth/logout | Yes + Cookie | — | `{ message }` (top-level, not in `data`) | `MISSING_TOKEN`, `INVALID_REFRESH_TOKEN`, `SESSION_REVOKED`, `LOGOUT_FAILED` |
| POST | /auth/refresh | Cookie | — | `{ accessToken }` | `MISSING_TOKEN`, `INVALID_REFRESH_TOKEN`, `INVALID_REFRESH` |
| POST | /auth/verify-email | No | `{ token }` or `?token=<token>` | `{ user_id }` (top-level, not in `data`) | `MISSING_TOKEN`, `INVALID_TOKEN`, `EXPIRED_TOKEN`, `INTERNAL_ERROR` |
| POST | /auth/forgot-password | No | `{ email }` | `{ message }` (top-level, not in `data`) | `VALIDATION_ERROR`, `INTERNAL_ERROR` |
| POST | /auth/reset-password | No | `{ token, password }` | `{ message }` (top-level, not in `data`) | `VALIDATION_ERROR`, `EXPIRED_TOKEN`, `INVALID_TOKEN`, `INTERNAL_ERROR` |

### Auth — 2FA (mounted on `/auth`)
| Method | Path | Auth | Request Body | Response `data` | Error Codes |
|--------|------|------|-------------|-----------------|-------------|
| POST | /auth/2fa/setup | Yes | — | `{ qrCodeUrl, secret, manualEntryKey }` | `USER_NOT_FOUND`, `INTERNAL_ERROR` |
| POST | /auth/2fa/verify | Yes | `{ token }` | `{ enabled: true }` | `TOKEN_REQUIRED`, `SETUP_REQUIRED`, `INVALID_TOKEN`, `INTERNAL_ERROR` |
| POST | /auth/2fa/disable | Yes | `{ token }` | `{ enabled: false }` | `TOKEN_REQUIRED`, `SETUP_REQUIRED`, `INVALID_TOKEN`, `INTERNAL_ERROR` |

---

### Users — `/users`
| Method | Path | Auth | Request Body | Response `data` | Error Codes |
|--------|------|------|-------------|-----------------|-------------|
| GET | /users/me | Yes | — | `{ id, email, name, avatarUrl, verified, createdAt }` | `UNAUTHORIZED`, `USER_NOT_FOUND`, `FETCH_FAILED` |
| PUT | /users/me | Yes | `{ name?: string, email?: string }` | `{ id, email, name, avatarUrl, verified, createdAt }` | `UNAUTHORIZED`, `VALIDATION_ERROR`, `NO_FIELDS_PROVIDED`, `USER_NOT_FOUND`, `EMAIL_TAKEN`, `UPDATE_FAILED` |
| POST | /users/me/avatar | Yes | — | _(always 501)_ | `AVATAR_UPLOAD_NOT_CONFIGURED` |
| POST | /users/send-verification | Yes | — | `{ message }` | `UNAUTHORIZED`, `USER_NOT_FOUND`, `ALREADY_VERIFIED`, `SEND_FAILED` |

**Notes:**
- `PUT /users/me` with an email change also triggers a verification email and sets `verified: false`.

---

### Subscriptions — `/subscriptions`
| Method | Path | Auth | Request Body | Response `data` | Error Codes |
|--------|------|------|-------------|-----------------|-------------|
| GET | /subscriptions/me | Yes | — | subscription object (see shape below) or `null` | `UNAUTHORIZED`, `FETCH_FAILED` |
| GET | /subscriptions/status | Yes | — | subscription object + `{ memberCount, memberLimit }` | `UNAUTHORIZED`, `FETCH_FAILED` |
| POST | /subscriptions | Yes | `{ plan_id, payment_method_id }` | `{ subscription_id, client_secret }` _(no success wrapper)_ | `UNAUTHORIZED`, `USER_NOT_FOUND`, `PLAN_NOT_FOUND`, `SUBSCRIPTION_CREATION_FAILED` |
| POST | /subscriptions/me/cancel | Yes | — | `{ message, end_date, days_remaining }` _(top-level)_ | `UNAUTHORIZED`, `NO_ACTIVE_SUBSCRIPTION`, `INVALID_SUBSCRIPTION`, `CANCELLATION_FAILED` |
| POST | /subscriptions/me/reactivate | Yes | — | `{ message }` _(top-level)_ | `UNAUTHORIZED`, `NO_PENDING_CANCELLATION`, `INVALID_SUBSCRIPTION`, `REACTIVATION_FAILED` |
| POST | /subscriptions/cancel | Yes | — | `{ accessUntil: ISO, message }` | `UNAUTHORIZED`, `NO_ACTIVE_SUBSCRIPTION`, `INVALID_SUBSCRIPTION`, `CANCELLATION_FAILED` |
| POST | /subscriptions/reactivate | Yes | — | _(none; success: true)_ | `UNAUTHORIZED`, `NO_PENDING_CANCELLATION`, `INVALID_SUBSCRIPTION`, `PERIOD_ENDED`, `REACTIVATION_FAILED` |
| GET | /subscriptions/invoices | Yes | — | `{ invoices[], hasMore }` | `UNAUTHORIZED`, `USER_NOT_FOUND`, `INVOICE_FETCH_FAILED` |
| GET | /subscriptions/invoices/:invoiceId/download | Yes | — | `{ pdfUrl }` | `UNAUTHORIZED`, `INVOICE_NOT_FOUND`, `PDF_NOT_AVAILABLE`, `INVOICE_FETCH_FAILED` |
| GET | /subscriptions/calendar | Yes | — | `{ events[], nextBillingDate, billingInterval }` | `UNAUTHORIZED`, `CALENDAR_FETCH_FAILED` |
| POST | /subscriptions/retry-payment | Yes | — | `{ invoiceId, status }` | `UNAUTHORIZED`, `USER_NOT_FOUND`, `NO_PAST_DUE_SUBSCRIPTION`, `NO_STRIPE_SUBSCRIPTION`, `NO_STRIPE_CUSTOMER`, `NO_OPEN_INVOICE`, `PAYMENT_FAILED`, `RETRY_FAILED` |
| POST | /subscriptions/downgrade | Yes | `{ planId, billingInterval: 'monthly'\|'annual' }` | `{ planName, newPrice, effectiveDate, creditApplied }` | `UNAUTHORIZED`, `INVALID_INPUT`, `PLAN_NOT_FOUND`, `NO_ACTIVE_SUBSCRIPTION`, `MEMBER_LIMIT_EXCEEDED`, `DOWNGRADE_FAILED` |

**Subscription object shape** (returned by `/me` and `/status`):
```json
{
  "id": "uuid",
  "status": "active | cancellation_pending | past_due | unpaid | pending | canceled",
  "planId": "uuid",
  "plan_name": "Pro",
  "price_display": "$29.00/month",
  "current_period_end": 1712000000,
  "currentPeriodStart": "2024-04-01T00:00:00.000Z",
  "currentPeriodEnd": "2024-05-01T00:00:00.000Z",
  "pricePerMonth": 29,
  "cancelAtPeriodEnd": false,
  "plan": { "id": "uuid", "name": "Pro", "tier": "pro", "price_monthly": 29 }
}
```

**Calendar event shape:**
```json
{
  "date": "2024-05-01",
  "type": "renewal | cancellation | trial_end | invoice_due",
  "label": "Subscription renewal — Pro $29.00/mo",
  "amount": 29,
  "currency": "usd"
}
```

**Cancel routes — which to use:**
- `POST /subscriptions/cancel` (US-025 v2) → preferred; returns `{ accessUntil }` with ISO date
- `POST /subscriptions/me/cancel` (legacy) → returns `{ end_date, days_remaining }`
- Both set `cancelAtPeriodEnd = true`; access continues until period end

---

### Payments — `/payments`
| Method | Path | Auth | Request Body | Response `data` | Error Codes |
|--------|------|------|-------------|-----------------|-------------|
| GET | /payments/me | Yes | — | `[{ id, amount, currency, status, description, stripePaymentIntentId, date, invoice_url }]` | `UNAUTHORIZED`, `FETCH_FAILED` |

**Note:** `invoice_url` is always `null` (future enhancement). Use `/subscriptions/invoices` for PDF links.

---

### Plans — `/plans`
| Method | Path | Auth | Request Body | Response | Error Codes |
|--------|------|------|-------------|---------|-------------|
| GET | /plans | No | — | `{ plans[], annual_discount_percent: 20 }` _(no success wrapper)_ | — |
| GET | /plans/:id | No | — | `{ plan, annual_discount_percent: 20 }` _(no success wrapper)_ | `PLAN_NOT_FOUND` |

**Plan object shape:**
```json
{
  "id": "uuid",
  "name": "Pro",
  "tier": "free | pro | enterprise",
  "price_monthly": 29,
  "price_annual": 290,
  "max_members": 10,
  "features": ["10 team members", "Advanced features", "Priority support"]
}
```

---

### Teams — `/teams`
| Method | Path | Auth | Request Body | Response `data` | Error Codes |
|--------|------|------|-------------|-----------------|-------------|
| GET | /teams/me | Yes | — | `{ id, name, ownerId, memberCount, members[] }` or `null` | `UNAUTHORIZED`, `FETCH_FAILED` |
| POST | /teams/me/invites | Yes | `{ email }` | `{ id, email, expiresAt, token }` | `UNAUTHORIZED`, `EMAIL_REQUIRED`, `TEAM_NOT_FOUND`, `INSUFFICIENT_ROLE`, `INVITE_ALREADY_PENDING`, `ALREADY_A_MEMBER`, `INVITE_FAILED` |
| GET | /teams/me/invites | Yes | — | `[{ id, email, status, expiresAt, createdAt }]` | `UNAUTHORIZED`, `FETCH_FAILED` |
| POST | /teams/invites/:token/accept | Yes | — | `{ joined: true, teamId }` or `{ alreadyMember: true }` | `UNAUTHORIZED`, `INVITE_NOT_FOUND`, `INVITE_EXPIRED`, `USER_NOT_FOUND`, `EMAIL_MISMATCH`, `SEAT_LIMIT_REACHED`, `ACCEPT_FAILED` |
| POST | /teams/invites/:token/decline | Yes | — | `{ declined: true }` | `INVITE_NOT_FOUND`, `DECLINE_FAILED` |
| DELETE | /teams/me/members/:memberId | Yes | — | `{ removed: true }` | `UNAUTHORIZED`, `TEAM_NOT_FOUND`, `INSUFFICIENT_ROLE`, `MEMBER_NOT_FOUND`, `CANNOT_REMOVE_OWNER`, `REMOVE_FAILED` |
| GET | /teams/:teamId/members | Yes | — | `[{ id, userId, email, name, role, joinedAt }]` | `UNAUTHORIZED`, `TEAM_NOT_FOUND`, `NOT_A_MEMBER`, `FETCH_FAILED` |
| PATCH | /teams/:teamId/members/:userId/role | Yes | `{ role: 'admin'\|'member' }` | `{ userId, teamId, role }` | `UNAUTHORIZED`, `INVALID_ROLE`, `CANNOT_ASSIGN_OWNER_ROLE`, `TEAM_NOT_FOUND`, `INSUFFICIENT_ROLE`, `MEMBER_NOT_FOUND`, `CANNOT_CHANGE_OWNER_ROLE`, `UPDATE_FAILED` |
| DELETE | /teams/:teamId/members/:userId | Yes | — | `{ removed: true }` | `UNAUTHORIZED`, `TEAM_NOT_FOUND`, `INSUFFICIENT_ROLE`, `MEMBER_NOT_FOUND`, `CANNOT_REMOVE_OWNER`, `REMOVE_FAILED` |

**Team member object shape:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "role": "owner | admin | member",
  "joinedAt": "2024-04-01T00:00:00.000Z",
  "user": { "id": "uuid", "name": "Alice", "email": "alice@example.com" }
}
```

**Seat enforcement:** `POST /teams/me/invites` runs `enforceSeats` middleware — will reject with `SEAT_LIMIT_REACHED` if the plan's `max_members` is already reached.

---

### Dashboard — `/dashboard`
| Method | Path | Auth | Request Body | Response `data` | Error Codes |
|--------|------|------|-------------|-----------------|-------------|
| GET | /dashboard/me/dashboard | Yes | — | `{ user, subscription, team }` | `UNAUTHORIZED`, `USER_NOT_FOUND`, `FETCH_FAILED` |

**Dashboard response shape:**
```json
{
  "user": { "name": "Alice", "email": "alice@example.com", "createdAt": "2024-01-01T..." },
  "subscription": {
    "status": "active",
    "planName": "Pro",
    "tier": "pro",
    "priceMonthly": 29,
    "currentPeriodEnd": "2024-05-01T...",
    "daysUntilRenewal": 14,
    "cancelAtPeriodEnd": false
  },
  "team": { "name": "Acme Team", "memberCount": 3, "memberLimit": 10 }
}
```

---

### Analytics — `/analytics`
| Method | Path | Auth | Request Body | Response `data` | Error Codes |
|--------|------|------|-------------|-----------------|-------------|
| GET | /analytics/usage | Yes | — | `{ memberCount, memberLimit, planName, billingInterval, monthlyActiveMembers, teamAgeInDays, invoiceCount, storageUsedMb, apiCallsThisMonth }` | `UNAUTHORIZED`, `TEAM_NOT_FOUND`, `FETCH_FAILED` |
| GET | /analytics/members/growth | Yes | — | `{ months: [{ month: 'Jan', count: 3 }] }` (last 6 months) | `UNAUTHORIZED`, `TEAM_NOT_FOUND`, `FETCH_FAILED` |

**Note:** `storageUsedMb` and `apiCallsThisMonth` are always `0` (not yet implemented).

---

### Webhooks — `/webhooks`
| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|-------------|---------|-------|
| POST | /webhooks/stripe | Stripe signature header | Raw JSON body | `{ received: true }` | Production Stripe events; requires `stripe-signature` header |
| POST | /webhooks | None | `{ type, ...event }` | `{ received: true }` | **Dev/test only** — returns 404 in production |

**Note:** `/webhooks` is mounted before `express.json()` to preserve raw body for signature verification.

---

### Health
| Method | Path | Auth | Response |
|--------|------|------|---------|
| GET | /health | No | `{ status: 'ok', timestamp: '...' }` |

---

## ⚠️ Known Gotchas

- `/auth/register` does **NOT** exist — use `/auth/signup`
- `/auth/refresh` returns `{ success: true, data: { accessToken } }` (not `{ access_token }`)
- Dashboard route is `/dashboard/me/dashboard` (not `/dashboard` or `/dashboard/me`)
- **Two cancel routes exist:** prefer `/subscriptions/cancel` (US-025 v2); legacy `/subscriptions/me/cancel` also works
- `/plans` response has **no** `success` wrapper — returns `{ plans, annual_discount_percent }` directly
- `POST /subscriptions` response has **no** `success` wrapper — returns `{ subscription_id, client_secret }` directly
- `/auth/verify-email` response returns `{ success: true, user_id }` at top level (not inside `data`)
- `/auth/logout` and `/auth/forgot-password` responses return `{ success: true, message }` at top level (not inside `data`)
- `SEAT_LIMIT_REACHED` error from `/teams/invites/:token/accept` includes `{ current, limit, plan }` inside `data`
- `/payments/me` `invoice_url` is always `null` — use `/subscriptions/invoices/:id/download` for PDFs
- Invite tokens expire in 7 days; accepted user's email must match `invitedEmail` exactly
- `DELETE /teams/me/members/:memberId` uses **TeamMember row ID** (not userId); `DELETE /teams/:teamId/members/:userId` uses **userId**

---

## Pipeline Rule
**Contract-first:** Karthi writes/updates this file. Senthil reads it before any `api.ts` changes. Baskar reads it before writing any test. If a route doesn't appear here, it doesn't exist.
