# Squad Backlog

> Decomposed from `PRD.md` on 2026-03-30  
> Owner: Jayanth (Lead)

---

## P0 — Blocking (Must work before anything else)

### [EPIC-1] Authentication Core
**Owner:** Karthi (Backend)  
**Priority:** P0  
**Status:** in-progress  
**Dependencies:** None  
**Notes:** Partially working; Karthi actively fixing signup/login bugs

**Acceptance Criteria:**
- [x] User can sign up with email/password
- [ ] User can verify email (email verification flow)
- [x] User can login with correct credentials
- [x] Passwords are securely stored (bcrypt, 12 rounds)
- [x] JWT tokens (15min access + 30day refresh in httpOnly cookie)
- [ ] Logout clears session properly
- [ ] JWT tokens refresh without re-login

---

### [EPIC-2] Plans Display
**Owner:** Senthil (Frontend)  
**Priority:** P0  
**Status:** done  
**Dependencies:** None  
**Notes:** Free/Pro/Enterprise displayed and working

**Acceptance Criteria:**
- [x] User can view all three plans and prices
- [x] Plan comparison page shows features per tier
- [x] Pricing shows monthly and annual options (20% discount)

---

## P1 — Core MVP (Required for working product)

### [EPIC-3] Stripe Billing Integration
**Owner:** Karthi (Backend) + Senthil (Frontend)  
**Reviewer:** Jayanth (mandatory sign-off)  
**Priority:** P1  
**Status:** not-started  
**Dependencies:** [EPIC-1] Auth Core, [EPIC-2] Plans Display

**Acceptance Criteria:**
- [ ] Stripe processes payment via Stripe Elements (PCI compliant)
- [ ] Webhook receives and verifies `invoice.payment_succeeded`
- [ ] Webhook receives and verifies `customer.subscription.updated`
- [ ] Subscription status persists across sessions
- [ ] User receives order confirmation email
- [ ] Idempotent handling of duplicate webhook events
- [ ] Graceful degradation if Stripe API down

**Backend Tasks (Karthi):**
- [ ] Create Stripe customer on signup
- [ ] Implement `POST /subscriptions/me` (create subscription)
- [ ] Implement `PATCH /subscriptions/me` (upgrade/downgrade)
- [ ] Implement Stripe webhook handler with signature verification
- [ ] Audit logging for all subscription changes

**Frontend Tasks (Senthil):**
- [ ] Integrate Stripe Elements for payment collection
- [ ] Checkout page with plan selection + payment form
- [ ] Handle payment success/failure UI states
- [ ] Show subscription confirmation

---

### [EPIC-4] Dashboard
**Owner:** Senthil (Frontend)  
**Priority:** P1  
**Status:** not-started  
**Dependencies:** [EPIC-1] Auth Core

**Acceptance Criteria:**
- [ ] Dashboard displays current plan name
- [ ] Dashboard displays member count vs plan limit
- [ ] Dashboard displays renewal date and next billing amount
- [ ] Usage chart shows 30-day activity
- [ ] Quick action buttons work (upgrade, invite, manage billing)

---

### [EPIC-5] Password Reset Flow
**Owner:** Karthi (Backend) + Senthil (Frontend)  
**Priority:** P1  
**Status:** not-started  
**Dependencies:** [EPIC-1] Auth Core  
**Notes:** Design already approved in decisions.md (#8)

**Acceptance Criteria:**
- [ ] User can request password reset via email
- [ ] Token is 256-bit crypto random, 1-hour expiry
- [ ] No user enumeration (always return 200 OK)
- [ ] User can reset password with valid token
- [ ] All refresh tokens revoked on password reset
- [ ] Token is one-time use only

---

### [EPIC-6] Subscription Cancellation
**Owner:** Karthi (Backend) + Senthil (Frontend)  
**Priority:** P1  
**Status:** not-started  
**Dependencies:** [EPIC-3] Stripe Billing  
**Notes:** Design already approved in decisions.md (#9)

**Acceptance Criteria:**
- [ ] User can cancel subscription from dashboard
- [ ] Cancellation uses `cancel_at_period_end: true`
- [ ] Status shows 'cancellation_pending' with days remaining
- [ ] User can reactivate before period end
- [ ] Email notification sent on cancellation

---

## P2 — Full MVP (Required before launch)

### [EPIC-7] Team Management
**Owner:** Karthi (Backend) + Senthil (Frontend)  
**Priority:** P2  
**Status:** not-started  
**Dependencies:** [EPIC-1] Auth Core, [EPIC-4] Dashboard

**Acceptance Criteria:**
- [ ] User (Owner) can invite team members via email
- [ ] Invite email contains signup/join link
- [ ] Invited users can accept and join team
- [ ] Admin can remove members
- [ ] Dashboard shows member count vs. plan limit
- [ ] Hard block if member limit exceeded without upgrade

---

### [EPIC-8] Billing History
**Owner:** Karthi (Backend) + Senthil (Frontend)  
**Priority:** P2  
**Status:** not-started  
**Dependencies:** [EPIC-3] Stripe Billing

**Acceptance Criteria:**
- [ ] Billing history page displays all invoices
- [ ] User can download invoices as PDF
- [ ] Shows payment date, amount, status for each invoice

---

### [EPIC-9] Profile Management
**Owner:** Senthil (Frontend) + Karthi (Backend)  
**Priority:** P2  
**Status:** not-started  
**Dependencies:** [EPIC-1] Auth Core

**Acceptance Criteria:**
- [ ] User can edit name
- [ ] User can change email (with verification)
- [ ] User can upload/change profile picture

---

### [EPIC-10] Two-Factor Authentication (Optional MVP)
**Owner:** Karthi (Backend)  
**Priority:** P2  
**Status:** not-started  
**Dependencies:** [EPIC-1] Auth Core, [EPIC-9] Profile Management

**Acceptance Criteria:**
- [ ] User can enable TOTP 2FA from profile settings
- [ ] QR code displayed for authenticator app setup
- [ ] Login requires TOTP code when 2FA enabled
- [ ] Recovery codes generated on 2FA setup

---

### [EPIC-11] Payment Retry Logic
**Owner:** Karthi (Backend)  
**Priority:** P2  
**Status:** not-started  
**Dependencies:** [EPIC-3] Stripe Billing

**Acceptance Criteria:**
- [ ] Failed payments trigger retry sequence (3 attempts over 7 days)
- [ ] User notified of failed payment via email
- [ ] Subscription suspended after all retries fail

---

### [EPIC-12] E2E Test Coverage
**Owner:** Baskar (Automation Tester)  
**Priority:** P2  
**Status:** in-progress  
**Dependencies:** All feature EPICs

**Acceptance Criteria:**
- [x] Auth flow tests (22 tests passing)
- [ ] Stripe checkout flow E2E tests
- [ ] Dashboard feature tests
- [ ] Team management tests
- [ ] Subscription cancellation/reactivation tests

---

## Recommended Build Order

```
Phase 1 (Current): [EPIC-1] Auth Core completion
                   └── Karthi fixing bugs now

Phase 2 (Next):    [EPIC-5] Password Reset
                   [EPIC-4] Dashboard (basic)
                   └── Parallel: Karthi + Senthil

Phase 3:           [EPIC-3] Stripe Billing ⚠️ HIGH STAKES
                   └── Jayanth reviews all payment flows
                   └── Baskar adds Stripe test card E2E

Phase 4:           [EPIC-6] Subscription Cancellation
                   [EPIC-8] Billing History
                   └── Depends on working Stripe

Phase 5:           [EPIC-7] Team Management
                   [EPIC-9] Profile Management
                   └── Feature polish

Phase 6:           [EPIC-10] 2FA (optional)
                   [EPIC-11] Payment Retry
                   └── Hardening before launch
```

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stripe webhook signature verification missing | HIGH | Karthi must implement before any payment testing |
| Email verification not implemented | MEDIUM | Users can't confirm accounts; affects activation rate |
| No rate limiting on auth endpoints | MEDIUM | Security risk; add before public launch |
| Payment idempotency not tested | HIGH | Could cause duplicate charges; Baskar must test |
| Database seed missing Plans | RESOLVED | Fixed per decisions.md #16 |

---

## Out of Scope (per PRD)

- Usage-based billing
- Custom branding for teams
- SAML/SSO login
- Advanced audit logging
- API for third-party integrations
- Mobile app
