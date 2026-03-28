# Backlog Decomposition – SaaS Platform MVP

**Prepared by**: Keaton, Lead Architect  
**Date**: 2024  
**Total Estimated Effort**: ~35-40 days (with 2-3 concurrent dev teams)  
**MVP Timeline**: 6-8 weeks (accounting for 2 days per sprint)

---

## Executive Summary

This backlog is organized into **6 major Epics** containing **26 User Stories** to build a subscription-based SaaS platform with Stripe billing. Stories are prioritized by dependency and criticality:

- **P0 (Blocking)**: Must complete first; MVP cannot launch without these
- **P1 (Core MVP)**: Essential features for launch
- **P2 (Polish)**: Important but not blocking
- **P3 (Post-MVP)**: Nice-to-have, deferred

---

## Epic 1: Authentication & Account Management (P0)

### US-001: User Signup with Email Verification
- **Estimate**: 2 days
- **Priority**: P0 (blocking)
- **Team**: Backend + Frontend
- **Dependencies**: None
- **Description**: 
  - Users can register via email/password on signup page
  - Password strength validation (min 12 chars, uppercase, number, special char)
  - Confirmation email sent with verification link (expires in 24h)
  - Email verified → user auto-enrolled in Free plan
  - Duplicate email prevention
- **Acceptance Criteria**:
  - ✓ Signup form validates input
  - ✓ Confirmation email sent within 1 second
  - ✓ Email link verified (clicked within 24h)
  - ✓ User can login after verification
  - ✓ Unverified account cannot access dashboard

### US-002: User Login with Session Management
- **Estimate**: 1 day
- **Priority**: P0 (blocking)
- **Team**: Backend + Frontend
- **Dependencies**: US-001
- **Description**:
  - Users login with email/password
  - Generate JWT token (15-min expiry) + refresh token (30-day httpOnly cookie)
  - "Remember Me" checkbox extends refresh token to 90 days
  - Rate limiting: 10 login attempts per IP per minute
  - Failed login logs IP + timestamp (abuse detection)
- **Acceptance Criteria**:
  - ✓ Valid credentials issue JWT + refresh cookie
  - ✓ Invalid credentials return 401 with generic error
  - ✓ Rate limiting blocks after 10 attempts
  - ✓ Refresh token rotates on use
  - ✓ Token expiry redirects to login

### US-003: Logout & Session Termination
- **Estimate**: 0.5 days
- **Priority**: P0 (blocking)
- **Team**: Backend + Frontend
- **Dependencies**: US-002
- **Description**:
  - Logout clears JWT + refresh cookie
  - Invalidates session in database (for revocation checks)
  - Redirects to login page
- **Acceptance Criteria**:
  - ✓ Refresh token unset
  - ✓ Session marked invalid
  - ✓ Cannot use old tokens

### US-004: Password Reset Flow
- **Estimate**: 1.5 days
- **Priority**: P1 (core MVP)
- **Team**: Backend + Frontend
- **Dependencies**: US-001
- **Description**:
  - User enters email on "Forgot Password" page
  - Reset link sent (expires in 1 hour)
  - User sets new password via link
  - Old sessions invalidated (forced re-login)
- **Acceptance Criteria**:
  - ✓ Reset email sent
  - ✓ Link expires after 1 hour
  - ✓ Password updated on confirmation
  - ✓ All active sessions invalidated

### US-005: Profile Management (View & Edit)
- **Estimate**: 1 day
- **Priority**: P1 (core MVP)
- **Team**: Backend + Frontend
- **Dependencies**: US-002
- **Description**:
  - User profile page shows: name, email, profile picture, created date
  - Can edit name and email
  - Email change requires re-verification
  - Profile picture upload to S3 (max 5MB, auto-resize to 500x500px)
- **Acceptance Criteria**:
  - ✓ Profile page displays current data
  - ✓ Name/email editable
  - ✓ Picture uploads to S3
  - ✓ Email change triggers verification

### US-006: Two-Factor Authentication (TOTP Setup)
- **Estimate**: 2 days
- **Priority**: P2 (polish)
- **Team**: Backend + Frontend
- **Dependencies**: US-002
- **Description**:
  - Optional TOTP setup in account settings (Google Authenticator, Authy)
  - QR code generated for enrollment
  - Backup codes printed (6 codes, single-use)
  - 2FA prompted on login if enabled
  - Allow disable anytime
- **Acceptance Criteria**:
  - ✓ QR code generates correctly
  - ✓ Backup codes stored (hashed)
  - ✓ 2FA required on next login
  - ✓ Backup code invalidates on use

---

## Epic 2: Subscription Plans & Pricing (P1)

### US-010: Subscription Plan Data Model & APIs
- **Estimate**: 1 day
- **Priority**: P0 (blocking)
- **Team**: Backend
- **Dependencies**: None
- **Description**:
  - Create Plan model: (name, tier, price_monthly, price_annual, max_members, features[])
  - Seed database with 3 plans: Free, Pro ($9.99/mo, $99.99/yr), Enterprise (contact sales)
  - GET /api/plans (list all plans)
  - GET /api/plans/{id} (fetch plan details)
  - All plans return annual discount info (20% off for annual)
- **Acceptance Criteria**:
  - ✓ Plans table seeded correctly
  - ✓ APIs return correct pricing
  - ✓ Annual discount applied correctly

### US-011: Plan Comparison Page (Frontend)
- **Estimate**: 1 day
- **Priority**: P1 (core MVP)
- **Team**: Frontend
- **Dependencies**: US-010
- **Description**:
  - Display 3-column comparison: Free | Pro | Enterprise
  - Show features (team size, analytics, support level)
  - Highlight current plan
  - "Upgrade" button only on non-current plans
  - Responsive design (mobile-friendly)
- **Acceptance Criteria**:
  - ✓ All 3 plans displayed
  - ✓ Features correctly shown
  - ✓ Current plan highlighted
  - ✓ Mobile responsive

### US-012: User Subscription Management (Data Model & APIs)
- **Estimate**: 1 day
- **Priority**: P0 (blocking)
- **Team**: Backend
- **Dependencies**: US-001, US-010
- **Description**:
  - Create UserSubscription model: (user_id, plan_id, billing_interval, status, renewal_date, stripe_subscription_id, created_at)
  - On signup, auto-create subscription: Free plan, monthly, active
  - GET /api/me/subscription (fetch current subscription)
  - GET /api/me/billing-history (list invoices)
- **Acceptance Criteria**:
  - ✓ Subscription created on signup
  - ✓ Free plan auto-assigned
  - ✓ APIs return correct data

---

## Epic 3: Billing & Stripe Integration (P0)

### US-020: Stripe Setup & Webhook Listener
- **Estimate**: 1.5 days
- **Priority**: P0 (blocking)
- **Team**: Backend
- **Dependencies**: US-012
- **Description**:
  - Initialize Stripe API (keys in .env)
  - Create webhook endpoint: POST /api/webhooks/stripe
  - Verify webhook signatures
  - Log all webhook events (for audit)
  - Handle events: invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted
- **Acceptance Criteria**:
  - ✓ Webhook listener operational
  - ✓ Signatures verified
  - ✓ Events logged
  - ✓ Webhook retry-able (idempotent)

### US-021: Upgrade Subscription Flow (Backend)
- **Estimate**: 2 days
- **Priority**: P0 (blocking)
- **Team**: Backend
- **Dependencies**: US-012, US-020
- **Description**:
  - POST /api/me/subscription/upgrade (plan_id, billing_interval)
  - Create Stripe Checkout Session
  - Return session.url for client redirect
  - On webhook (checkout.session.completed): create/update Stripe subscription
  - Update UserSubscription record
  - Send confirmation email
- **Acceptance Criteria**:
  - ✓ Checkout session created
  - ✓ Stripe subscription synced
  - ✓ UserSubscription updated
  - ✓ Email confirmation sent

### US-022: Upgrade Subscription Flow (Frontend)
- **Estimate**: 1 day
- **Priority**: P1 (core MVP)
- **Team**: Frontend
- **Dependencies**: US-011, US-021
- **Description**:
  - "Upgrade" button on plan comparison page
  - Modal: confirm tier + billing interval selection
  - Review pricing (show annual discount if selected)
  - "Continue to Payment" → redirect to Stripe Checkout
  - After redirect back: show confirmation
  - "Back to Dashboard" link
- **Acceptance Criteria**:
  - ✓ Modal opens with plan options
  - ✓ Redirect to Stripe Checkout works
  - ✓ Confirmation displays on return
  - ✓ Billing history updates

### US-023: Downgrade Subscription Flow
- **Estimate**: 1.5 days
- **Priority**: P1 (core MVP)
- **Team**: Backend + Frontend
- **Dependencies**: US-021
- **Description**:
  - POST /api/me/subscription/downgrade (plan_id, billing_interval)
  - If mid-cycle: calculate pro-rata credit
  - Update Stripe subscription
  - Update UserSubscription
  - Send confirmation email with credit applied (if any)
  - If downgrade reduces member limit: warn user (prompt to remove members first)
- **Acceptance Criteria**:
  - ✓ Downgrade processed
  - ✓ Pro-rata credit calculated
  - ✓ Stripe updated
  - ✓ Warning shown if members exceed new limit

### US-024: Payment Retry Logic (Auto-Retry)
- **Estimate**: 1 day
- **Priority**: P1 (core MVP)
- **Team**: Backend
- **Dependencies**: US-020, US-021
- **Description**:
  - On invoice.payment_failed webhook: log failure
  - Stripe auto-retries 3 times over 7 days (Stripe default)
  - On final failure (after 3 retries): send email, mark subscription at_risk
  - Store failed payment attempt in database for support team review
  - If payment eventually succeeds: send "Payment Recovered" email
- **Acceptance Criteria**:
  - ✓ Failed payment logged
  - ✓ Email sent on final failure
  - ✓ Subscription marked at_risk
  - ✓ Success email sent on recovery

### US-025: Subscription Cancellation
- **Estimate**: 1 day
- **Priority**: P1 (core MVP)
- **Team**: Backend + Frontend
- **Dependencies**: US-021
- **Description**:
  - POST /api/me/subscription/cancel
  - Set end_date to end of current billing period
  - Send Stripe cancel request (respects prorations)
  - Update UserSubscription status → "cancelled"
  - Send cancellation confirmation email
  - User retains access until end_date
  - Show "Days Remaining" on dashboard
- **Acceptance Criteria**:
  - ✓ Cancellation processed
  - ✓ Access remains until end_date
  - ✓ Stripe subscription cancelled
  - ✓ Confirmation email sent

### US-026: Billing History & Invoice Download
- **Estimate**: 1.5 days
- **Priority**: P1 (core MVP)
- **Team**: Backend + Frontend
- **Dependencies**: US-020, US-025
- **Description**:
  - Backend: GET /api/me/invoices (paginated list)
  - Fetch invoices from Stripe API (cached daily)
  - Store invoice metadata in database (for offline access)
  - Frontend: Display invoice table (date, amount, plan, status)
  - Download button → PDF generation (via Stripe invoice PDF or server-side generation)
  - Filter by status (paid, pending, failed)
- **Acceptance Criteria**:
  - ✓ Invoices listed with correct data
  - ✓ PDF download works
  - ✓ Pagination works
  - ✓ Caching reduces Stripe API calls

---

## Epic 4: Team Management (P1)

### US-030: Team Data Model & Ownership
- **Estimate**: 1 day
- **Priority**: P0 (blocking)
- **Team**: Backend
- **Dependencies**: US-001, US-012
- **Description**:
  - Create Team model: (name, owner_id, created_at)
  - Create TeamMember model: (team_id, user_id, role, joined_at) [role: owner, admin, member]
  - On signup: create team (auto-named "Company Team" or from signup form), auto-add user as owner
  - GET /api/me/team → fetch team + members list
  - GET /api/teams/{id}/members → list all members (with roles)
- **Acceptance Criteria**:
  - ✓ Team created on signup
  - ✓ User is owner
  - ✓ APIs return correct data

### US-031: Invite Team Members Flow (Backend)
- **Estimate**: 1.5 days
- **Priority**: P1 (core MVP)
- **Team**: Backend
- **Dependencies**: US-030, US-001
- **Description**:
  - POST /api/me/team/invite (email, role)
  - Create TeamInvite record: (team_id, email, token, expires_at)
  - Send invite email with token link (expires in 7 days)
  - Prevent duplicate invites (1 active invite per email per team)
  - POST /api/invites/{token}/accept: user created/login → added to team
  - Handle case: invitee already has account (auto-join on accept)
  - POST /api/me/team/invite/{id}/revoke: owner/admin can revoke pending invite
- **Acceptance Criteria**:
  - ✓ Invite email sent
  - ✓ Token link works
  - ✓ Invitee can accept
  - ✓ Duplicate invites prevented
  - ✓ Expired invites rejected

### US-032: Invite Team Members Flow (Frontend)
- **Estimate**: 1 day
- **Priority**: P1 (core MVP)
- **Team**: Frontend
- **Dependencies**: US-031
- **Description**:
  - Team tab on dashboard
  - "Invite Member" button → modal
  - Email input + role dropdown (Member / Admin)
  - Submit → call API
  - Show success toast
  - List pending invites + revoke button
- **Acceptance Criteria**:
  - ✓ Modal opens
  - ✓ Invite sent
  - ✓ Pending invites listed
  - ✓ Revoke works

### US-033: Remove Team Members
- **Estimate**: 0.5 days
- **Priority**: P1 (core MVP)
- **Team**: Backend + Frontend
- **Dependencies**: US-030
- **Description**:
  - DELETE /api/me/team/members/{user_id} (only owner/admin)
  - Remove TeamMember record
  - Send removal notification email
  - Frontend: "Remove" button in member list (with confirmation)
- **Acceptance Criteria**:
  - ✓ Member removed
  - ✓ Notification sent
  - ✓ User loses team access immediately

### US-034: Member Role Management
- **Estimate**: 1 day
- **Priority**: P2 (polish)
- **Team**: Backend + Frontend
- **Dependencies**: US-030, US-031
- **Description**:
  - PUT /api/me/team/members/{user_id} (role: admin/member) — owner only
  - Update role in TeamMember record
  - Restrict: at least 1 owner must remain
  - Send role change email
  - Frontend: Edit role dropdown (owner only)
- **Acceptance Criteria**:
  - ✓ Role updated
  - ✓ Can't demote last owner
  - ✓ Email sent
  - ✓ Permissions enforced

### US-035: Member Limit Enforcement (Hard Block)
- **Estimate**: 1 day
- **Priority**: P1 (core MVP)
- **Team**: Backend + Frontend
- **Dependencies**: US-030, US-031, US-012
- **Description**:
  - On invite accept: check member count vs. plan limit
  - If exceeded: reject with "Plan Limit Exceeded" error
  - Frontend: show "X/Y members" on invite modal, disable if full
  - Show upgrade prompt in error
  - Batch rejection of invites if limit exceeded before accept
- **Acceptance Criteria**:
  - ✓ Invite blocked if limit exceeded
  - ✓ Upgrade prompt shown
  - ✓ Dashboard shows usage
  - ✓ Can't circumvent via direct API call

---

## Epic 5: Dashboard & Analytics (P1)

### US-040: Dashboard Overview Card
- **Estimate**: 1 day
- **Priority**: P1 (core MVP)
- **Team**: Backend + Frontend
- **Dependencies**: US-012, US-030
- **Description**:
  - GET /api/me/dashboard → aggregated dashboard data
  - Display current plan, member count, renewal date, next billing amount
  - Show days until renewal
  - Color-code: green (healthy), yellow (near limit), red (exceeded)
  - Frontend: render card with live data
- **Acceptance Criteria**:
  - ✓ API returns all required data
  - ✓ Card displays correctly
  - ✓ Data updates on refresh

### US-041: Usage Analytics Chart
- **Estimate**: 1.5 days
- **Priority**: P2 (polish)
- **Team**: Backend + Frontend
- **Dependencies**: US-030
- **Description**:
  - Track team activity: logins, actions (invite sent, member added, plan changed)
  - Store events in database (Event model: type, team_id, user_id, created_at)
  - GET /api/me/team/analytics?days=30 → aggregated daily counts
  - Frontend: line chart (30-day activity)
  - Show: logins, invites sent, members added
- **Acceptance Criteria**:
  - ✓ Events logged
  - ✓ API returns aggregated data
  - ✓ Chart renders (use Chart.js or similar)
  - ✓ Accurate data for 30 days

### US-042: Upcoming Billing Calendar
- **Estimate**: 1 day
- **Priority**: P2 (polish)
- **Team**: Frontend
- **Dependencies**: US-012, US-026
- **Description**:
  - Show calendar with renewal date highlighted
  - Tooltip: renewal date + estimated amount
  - Show payment history (small icons for paid invoices)
  - Link to billing history page
- **Acceptance Criteria**:
  - ✓ Calendar displays correctly
  - ✓ Renewal date highlighted
  - ✓ Tooltip shows amount

### US-043: Dashboard Quick Actions
- **Estimate**: 0.5 days
- **Priority**: P1 (core MVP)
- **Team**: Frontend
- **Dependencies**: US-022, US-032
- **Description**:
  - Button row: Upgrade | Invite Member | Manage Billing
  - Routes to respective pages
  - Show contextual state (e.g., disable Upgrade if already Pro)
- **Acceptance Criteria**:
  - ✓ Buttons route correctly
  - ✓ States accurate

---

## Epic 6: Support & Help (P2)

### US-050: FAQ Page (Static Content)
- **Estimate**: 0.5 days
- **Priority**: P2 (polish)
- **Team**: Frontend
- **Dependencies**: None
- **Description**:
  - Static FAQ page linked from dashboard footer
  - Topics: billing, team management, cancellation, account security
  - Search functionality
  - Accordion UI (expand/collapse answers)
- **Acceptance Criteria**:
  - ✓ Page loads
  - ✓ Search works
  - ✓ Accordion functional

### US-051: Contact Support Form
- **Estimate**: 1 day
- **Priority**: P2 (polish)
- **Team**: Backend + Frontend
- **Dependencies**: US-001
- **Description**:
  - POST /api/support/contact (email, subject, message)
  - Validate email, min 10 chars for message
  - Send email to support@company.com
  - Return ticket ID
  - Frontend: contact form modal on dashboard
  - Success: "We'll respond within 24 hours"
- **Acceptance Criteria**:
  - ✓ Email sent to support
  - ✓ Validation works
  - ✓ Ticket ID returned
  - ✓ Modal functional

### US-052: Status Page (Integration)
- **Estimate**: 1 day
- **Priority**: P3 (post-MVP)
- **Team**: Backend + Frontend
- **Dependencies**: None
- **Description**:
  - Integrate with Statuspage.io or similar service
  - Fetch real-time status API
  - Display status widget on dashboard footer
  - Show uptime percentage
  - Link to full status page
- **Acceptance Criteria**:
  - ✓ Status widget displays
  - ✓ Real-time data
  - ✓ Link to status page works

---

## Epic 7: Security & Infrastructure (P0)

### US-060: HTTPS & TLS Configuration
- **Estimate**: 0.5 days
- **Priority**: P0 (blocking)
- **Team**: DevOps/Backend
- **Dependencies**: None
- **Description**:
  - All endpoints enforce HTTPS
  - TLS certificate (Let's Encrypt or AWS ACM)
  - Redirect HTTP → HTTPS
  - HSTS header set (max-age: 31536000)
- **Acceptance Criteria**:
  - ✓ HTTPS works
  - ✓ HTTP redirects
  - ✓ HSTS header present

### US-061: Rate Limiting & DDoS Protection
- **Estimate**: 1 day
- **Priority**: P0 (blocking)
- **Team**: Backend + DevOps
- **Dependencies**: US-002
- **Description**:
  - Implement rate limiting on auth endpoints: 10 req/min per IP
  - Implement rate limiting on API: 100 req/min per user
  - Use Redis for distributed rate limiting
  - Return 429 (Too Many Requests) when exceeded
  - CloudFlare or similar for DDoS protection
- **Acceptance Criteria**:
  - ✓ Rate limiting enforced
  - ✓ 429 returned on limit
  - ✓ DDoS protection active

### US-062: CORS Configuration
- **Estimate**: 0.5 days
- **Priority**: P0 (blocking)
- **Team**: Backend
- **Dependencies**: None
- **Description**:
  - Configure CORS: Allow frontend origin only
  - Set allowed methods: GET, POST, PUT, DELETE
  - Set allowed headers: Content-Type, Authorization
  - Credentials: include (for cookies)
  - Preflight caching: 3600 seconds
- **Acceptance Criteria**:
  - ✓ CORS configured
  - ✓ Frontend can call API
  - ✓ Unauthorized origins blocked

### US-063: Secrets Management
- **Estimate**: 0.5 days
- **Priority**: P0 (blocking)
- **Team**: DevOps/Backend
- **Dependencies**: None
- **Description**:
  - Store secrets in .env (local) / AWS Secrets Manager (production)
  - Secrets: DB password, JWT secret, Stripe API key, email password
  - Never commit secrets
  - Rotate secrets quarterly
- **Acceptance Criteria**:
  - ✓ .env in .gitignore
  - ✓ Secrets loaded from env vars
  - ✓ No hardcoded secrets

### US-064: Database Backups & Recovery
- **Estimate**: 1 day
- **Priority**: P1 (core MVP)
- **Team**: DevOps
- **Dependencies**: None
- **Description**:
  - Automated daily backups (AWS RDS automated backups or equivalent)
  - 30-day retention
  - Test restore procedure
  - Document recovery process
- **Acceptance Criteria**:
  - ✓ Backups running daily
  - ✓ Retention policy set
  - ✓ Restore test passed

---

## Epic 8: Testing & Documentation (P1)

### US-070: Authentication Unit & Integration Tests
- **Estimate**: 2 days
- **Priority**: P1 (core MVP)
- **Team**: QA/Backend
- **Dependencies**: US-001 through US-006
- **Description**:
  - Unit tests: password hashing, token generation
  - Integration tests: signup flow, login flow, password reset
  - Edge cases: duplicate email, expired token, invalid credentials
  - Target: >90% code coverage for auth module
- **Acceptance Criteria**:
  - ✓ Tests pass
  - ✓ >90% coverage
  - ✓ Edge cases covered

### US-071: Subscription & Billing Tests
- **Estimate**: 2 days
- **Priority**: P1 (core MVP)
- **Team**: QA/Backend
- **Dependencies**: US-020 through US-026
- **Description**:
  - Unit tests: pro-rata calculation, plan selection
  - Integration tests: upgrade, downgrade, cancellation flows
  - Mock Stripe webhooks
  - Test payment retry logic
  - Target: >85% coverage for billing module
- **Acceptance Criteria**:
  - ✓ Tests pass
  - ✓ >85% coverage
  - ✓ Stripe mocking works

### US-072: Frontend UI Tests (Cypress/Playwright)
- **Estimate**: 2 days
- **Priority**: P2 (polish)
- **Team**: QA/Frontend
- **Dependencies**: US-022, US-032, US-040
- **Description**:
  - E2E tests: signup → upgrade → invite member → cancel
  - Responsive tests (mobile/tablet)
  - Accessibility tests (WCAG 2.1 AA)
  - Load tests: dashboard loads in <2s
- **Acceptance Criteria**:
  - ✓ Critical flows tested
  - ✓ Mobile responsive
  - ✓ Accessibility compliant

### US-073: API Documentation (OpenAPI/Swagger)
- **Estimate**: 1 day
- **Priority**: P2 (polish)
- **Team**: Backend
- **Dependencies**: All API stories
- **Description**:
  - Document all endpoints in OpenAPI 3.0
  - Include request/response examples
  - Generate Swagger UI
  - Host on /api/docs
- **Acceptance Criteria**:
  - ✓ All endpoints documented
  - ✓ Examples provided
  - ✓ Swagger UI works

### US-074: Admin Runbook & Troubleshooting Guide
- **Estimate**: 1 day
- **Priority**: P2 (polish)
- **Team**: DevOps/Support
- **Dependencies**: All infrastructure stories
- **Description**:
  - Document: deployment steps, database recovery, Stripe webhook troubleshooting
  - Common issues & resolution
  - On-call escalation procedures
- **Acceptance Criteria**:
  - ✓ Runbook complete
  - ✓ Recovery procedure tested

---

## Dependency Graph & Implementation Phases

### Phase 1: Foundation (Days 1-6) — Critical Path
**Goal**: Enable signup, login, and basic subscription management

**Stories**:
1. US-001 (Signup) — 2 days
2. US-002 (Login) — 1 day
3. US-010 (Plans Data Model) — 1 day
4. US-012 (Subscription Model) — 1 day
5. US-030 (Team Model) — 1 day

**Blockers resolved**: Basic auth + subscription infrastructure ready  
**Parallel work**: US-003, US-004, US-060, US-062

---

### Phase 2: Stripe & Billing (Days 7-13)
**Goal**: Payment processing, webhooks, and subscription upgrades

**Stories** (in order):
1. US-020 (Stripe webhook listener) — 1.5 days
2. US-021 (Upgrade backend) — 2 days
3. US-023 (Downgrade) — 1.5 days
4. US-024 (Payment retry) — 1 day
5. US-025 (Cancellation) — 1 day
6. US-026 (Billing history) — 1.5 days

**Blockers resolved**: Complete billing pipeline, payment processing working  
**Parallel work**: US-022 (frontend), US-061, US-063, US-064

---

### Phase 3: Team Management (Days 14-18)
**Goal**: Multi-user teams with invites and role management

**Stories** (in order):
1. US-031 (Invite backend) — 1.5 days
2. US-033 (Remove members) — 0.5 days
3. US-035 (Member limit enforcement) — 1 day
4. US-032 (Invite frontend) — 1 day
5. US-034 (Role management) — 1 day

**Blockers resolved**: Full team management, member limits enforced  
**Parallel work**: None (all dependent on Phase 1)

---

### Phase 4: Dashboard & Analytics (Days 19-23)
**Goal**: User-facing dashboard with team insights

**Stories** (in order):
1. US-040 (Overview card) — 1 day
2. US-041 (Usage analytics) — 1.5 days
3. US-043 (Quick actions) — 0.5 days
4. US-042 (Billing calendar) — 1 day
5. US-011 (Plan comparison page) — 1 day

**Blockers resolved**: Complete dashboard MVP  
**Parallel work**: US-050, US-051

---

### Phase 5: Polish & Support (Days 24-28)
**Goal**: Security hardening, testing, documentation

**Stories**:
1. US-070 (Auth tests) — 2 days
2. US-071 (Billing tests) — 2 days
3. US-073 (API docs) — 1 day
4. US-052 (Status page) — 1 day
5. US-074 (Admin runbook) — 1 day

**Blockers resolved**: >90% test coverage, production-ready documentation

---

### Phase 6: Optional Polish (Days 29-35)
**Stories**:
1. US-006 (2FA) — 2 days
2. US-072 (Frontend E2E tests) — 2 days
3. More test coverage / edge cases

---

## Implementation Order (Strict Sequence)

**Critical Path** (must follow strict order):

```
1. US-001 (Signup)
   ↓
2. US-002 (Login)
   ↓
3. US-010 (Plans model)
   ↓
4. US-012 (Subscription model) + US-030 (Team model)
   ↓
5. US-020 (Stripe webhooks)
   ↓
6. US-021 (Upgrade) → US-023 (Downgrade)
   ↓
7. US-031 (Invite members) → US-035 (Member limit)
   ↓
8. US-040 (Dashboard) → US-041 (Analytics)
   ↓
9. US-070 (Auth tests) → US-071 (Billing tests)
   ↓
10. Deploy to staging → production
```

**Can run in parallel** (no dependencies):
- US-003, US-004, US-050, US-051, US-060, US-061, US-062, US-063, US-064
- US-022, US-032, US-042, US-043 (once their API dependencies are done)

---

## Team Structure Recommendation

**Suggested 2-Team Split** (6-week timeline):

**Backend Team**:
- US-001, US-002, US-003, US-004, US-010, US-012, US-020, US-021, US-023, US-024, US-025, US-026, US-030, US-031, US-033, US-035, US-040, US-060, US-061, US-062, US-063, US-064, US-070, US-071, US-073, US-074

**Frontend Team**:
- US-005, US-011, US-022, US-032, US-034, US-040 (endpoint), US-041 (chart), US-042, US-043, US-050, US-051, US-052, US-072

**DevOps/Infra** (0.5 FTE embedded with backend):
- US-060, US-061, US-063, US-064

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Stripe API outages delay payment processing | Queue payments, retry on recovery (US-024) |
| Race condition in member limit enforcement | Use database transactions, enforce at DB level (US-035) |
| Email delivery failures (signup, password reset) | Implement email queue, retry, fallback notification |
| Webhook idempotency issues (duplicate charges) | Use idempotency keys, check invoice already exists (US-020) |
| 2FA implementation complexity | Start with US-006 only if time permits; not blocking MVP |
| Dashboard performance with large teams | Implement caching, pagination (US-040, US-041) |

---

## Success Criteria for MVP Launch

- [ ] >30% signup-to-first-payment conversion
- [ ] <5% monthly churn rate
- [ ] >98% payment success rate
- [ ] <200ms p95 API response time
- [ ] <2s p95 dashboard load time
- [ ] 99.5% uptime SLA
- [ ] >90% test coverage (auth + billing)
- [ ] All acceptance criteria met for P0 stories

---

## Post-MVP Roadmap (Deferred)

1. **Usage-based billing**: Overage charges for extra members
2. **Webhook notifications**: Events sent to customer (invoice, payment failed)
3. **Admin dashboard**: Platform operators view revenue, support tickets
4. **SSO/SAML**: Enterprise login integration
5. **API for partners**: Third-party integration endpoints
6. **Advanced audit logging**: SOC 2 compliance
7. **Custom branding**: Teams customize login page

---

**Prepared by**: Keaton, Lead Architect  
**Last Updated**: 2024  
**Version**: 1.0
