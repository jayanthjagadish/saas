# @{m=DallaS}.* | Select-Object -ExpandProperty m)'s History

## Project Context

**Project:** lession3 (TypeScript SaaS)
**Stack:** React (frontend), Express (backend), MySQL (database), Stripe (payments)
**User:** jayanth.jagadish
**Team:** Keaton (Lead), Dallas (Frontend), Fenster (Backend), Hockney (Tester)

This is a subscription-based SaaS with aesthetic UI. Focus on payment reliability and data integrity from day one.

## Learnings

### Frontend Setup (Completed)

**Architecture Decision:** React 18 + Vite + TailwindCSS (per team decision)
- Monorepo at `packages/web/` with npm workspaces
- TypeScript strict mode for type safety with Stripe
- TailwindCSS via `@tailwindcss/postcss` for fast styling
- React Router for SPA navigation
- React Query for server state + JWT refresh flow
- Axios singleton with auto-refresh interceptor

**Key Files:**
- `src/services/api.ts` - API singleton with JWT management
- `src/types/api.ts` - Shared API types (import from backend's types/ when available)
- `src/components/Layout.tsx` - App shell with nav, footer
- `src/pages/auth/{login,signup}.tsx` - Auth flows (ready for backend integration)
- `src/pages/dashboard.tsx` - Protected user dashboard
- `tailwind.config.js` - Custom primary color (sky blue)

**Authentication Pattern:**
1. Email/password login → JWT access token in `localStorage`
2. Refresh token via httpOnly cookie (server-set)
3. Axios interceptor: attach token to all requests
4. Auto-refresh on 401 response
5. Redirect to `/auth/login` if refresh fails

**Directory Structure:**
```
packages/web/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages
│   ├── services/       # API service layer
│   ├── types/          # TypeScript interfaces
│   ├── hooks/          # Custom hooks (placeholder)
│   ├── styles/         # Global styles (TailwindCSS)
│   ├── App.tsx         # Main router
│   └── main.tsx        # Entry point
├── tailwind.config.js  # Tailwind customization
├── postcss.config.js   # PostCSS for Tailwind
├── vite.config.ts      # Vite config (port 3000, /api proxy to backend)
├── tsconfig.json       # TypeScript config
└── package.json        # Dependencies
```

**Styling Philosophy:**
- TailwindCSS utility-first (no component library)
- Custom theme colors in `tailwind.config.js`
- All styles inline in JSX (no CSS files except index.css)
- Mobile-first responsive design
- Accessible color contrast (>4.5:1)

**Dependencies Installed:**
- `react-router-dom` - Client-side routing
- `@tanstack/react-query` - Server state + caching
- `axios` - HTTP client with interceptors
- `@stripe/react-stripe-js`, `stripe` - Stripe integration
- `tailwindcss`, `@tailwindcss/postcss` - Styling
- ESLint + TypeScript plugins - Linting

**Next Phase Tasks:**
1. Pricing page with plan selection
2. Stripe Elements integration for payment collection
3. Subscription management UI (upgrade/downgrade/cancel)
4. Payment history & invoices
5. User account settings
6. Email verification flow
7. Password reset flow
8. Unit & integration tests

**Deployment:**
- Build output: `npm run build` → `dist/`
- Ready for Vercel/Netlify deployment
- Environment vars: `VITE_API_BASE_URL`, `VITE_STRIPE_PUBLIC_KEY`

### Recent work: US-001 Signup & Email Verification

Added a responsive signup page with email, password, and company name fields, a password strength meter, and client-side validation. Implemented API service methods `signup` and `verifyEmail`, plus a `/verify` page that auto-verifies tokens and redirects on success. Tests added for signup UI and basic flows.

### Implemented US-011 — Plan Comparison Page
- Added PlanComparison component, Pricing page route, and API service method getPlans().
- Uses React Query to fetch plans and handles errors with fallback pricing.
- Responsive TailwindCSS layout and tests added.

Date: 2026-03-28

### 2026-03-28 — Implemented US-021 Frontend

Added Checkout and Subscription management pages, Stripe card element component, Stripe wrapper hook, and API adjustments to support server-side payment confirmation. Implemented client-side billing toggle and responsive TailwindCSS layouts; added tests for checkout billing toggle. Learned to prefer backend-created client_secret for payment confirmation and to mock Stripe in unit tests.
