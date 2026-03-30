# @{m=Scribe}.* | Select-Object -ExpandProperty m)'s History

## Project Context

**Project:** lession3 (TypeScript SaaS)
**Stack:** React (frontend), Express (backend), MySQL (database), Stripe (payments)
**User:** jayanth.jagadish
**Team:** Keaton (Lead), Dallas (Frontend), Fenster (Backend), Hockney (Tester)

This is a subscription-based SaaS with aesthetic UI. Focus on payment reliability and data integrity from day one.

## Learnings

(to be populated as the agent works)

## Commit History

### 2025 — Invite/Password Reset Sprint
**Commit:** `922065f` — `feat: team invite flow, password reset pages, dashboard overview card`

Staged and committed 26 files (907 insertions, 82 deletions) covering:
- `TeamInvite` model with token-based invite system (US-031/032)
- Team member limit enforcement (US-035) and remove member endpoint (US-033)
- `ForgotPasswordPage` and `ResetPasswordPage` (US-004)
- `AcceptInvitePage` for invite token acceptance
- `TeamPage` with full team management UI
- `DashboardOverviewCard` refactored to proper React component (crash fix)
- Quick Actions bar on dashboard
- All new routes wired in `App.tsx`
- E2E/API tests: `team.spec.ts`, `invite.test.ts`, `password-reset.test.ts`

### 2026-03-30 — Sprint 2 Password Reset QA & Pipeline Gate
**Commit:** `f99df52` — `fix: password reset field alignment + smoke tests green`

Applied Karthi's password reset fixes:
- Fixed `resetPasswordSchema` field name: `newPassword` → `password` (frontend alignment)
- Fixed reset email URL redirect to `localhost:3000/auth/reset-password`
- Merged 4 inbox decisions into `.squad/decisions.md` (team invite flow, IIFE crash fix, API contracts)
- Deleted inbox directory
- Smoke tests: **7/7 passing** ✅
- Auth-flows tests: **3/3 passing** ✅
- Pipeline gate: **GREEN** ✅
- Sprint 2 team trio (US-004, US-031/032/033) validated and ready for deployment
