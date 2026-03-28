# @{m=FenSter}.* | Select-Object -ExpandProperty m)'s History

## Project Context

**Project:** lession3 (TypeScript SaaS)
**Stack:** React (frontend), Express (backend), MySQL (database), Stripe (payments)
**User:** jayanth.jagadish
**Team:** Keaton (Lead), Dallas (Frontend), Fenster (Backend), Hockney (Tester)

This is a subscription-based SaaS with aesthetic UI. Focus on payment reliability and data integrity from day one.

## Learnings

### Backend Scaffolding Complete (Sprint 1)
**Date:** 2026-03-28

**Architecture Decisions:**

### Implemented US-001: User Signup with Email Verification (2026-03-28)
- Added email verification fields to User model and migration
- Implemented signup and verify-email endpoints
- Mocked email delivery by writing verification emails to dev-emails/
- Auto-enroll users into Free subscription locally

**Architecture Decisions:**
1. **Monorepo Structure:** Backend at `packages/api/` with TypeScript, Express, Sequelize
2. **Models & Relationships:**
   - User: email-based auth + Stripe customer ID
   - Subscription: tracks Stripe subscription state locally (Stripe is source of truth)
   - Payment: audit trail for all transactions
3. **Auth Flow:** JWT access token (15min, Bearer) + refresh token (30day, httpOnly cookie)
4. **Stripe Integration:** Event-driven via webhooks (verified with HMAC), no sync polling
5. **Error Handling:** Centralized `AppError` class with code + message
6. **Logging:** Pino for structured logs (DEBUG in dev, INFO in prod)

**Key Files:**
- `packages/api/src/config/index.ts` - Config loader (env vars)
- `packages/api/src/models/*.ts` - Sequelize models with relationships
- `packages/api/src/middleware/auth.ts` - JWT verification
- `packages/api/src/services/stripe.ts` - Webhook handler skeleton
- `packages/api/src/app.ts` - Express app setup

**Team Coordination:**
- Keaton: Review Stripe integration before webhook deployment
- Dallas: Implement frontend JWT refresh flow to use `/auth/refresh`
- Hockney: Test auth flows, Stripe webhook scenarios

**Constraints Honored:**
- No unilateral schema changes (waiting for Keaton approval)
- Stripe integration is reviewable (separate service layer)
- Secrets NOT committed (.env.example only)
- Database migrations reversible (Sequelize supports rollback)
