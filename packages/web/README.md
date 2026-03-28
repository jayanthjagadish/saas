# Fenster Frontend

React-based frontend for Fenster SaaS subscription management platform.

## Tech Stack

- **React 18** - UI framework
- **Vite** - Lightning-fast build tool & dev server
- **TypeScript** - Type-safe code
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Query (@tanstack/react-query)** - Server state management
- **Axios** - HTTP client with JWT interceptors
- **Stripe** - Payment processing

## Project Structure

```
src/
├── components/        # Reusable React components
│   └── Layout.tsx     # App shell: header, nav, footer
├── pages/             # Page components (routing)
│   ├── index.tsx      # Home page
│   ├── dashboard.tsx  # User dashboard
│   └── auth/
│       ├── login.tsx  # Login page
│       └── signup.tsx # Registration page
├── services/          # API & business logic
│   └── api.ts         # Axios instance with JWT refresh flow
├── hooks/             # Custom React hooks (placeholder)
├── types/             # TypeScript interfaces
│   └── api.ts         # API response types (shared with backend)
├── styles/            # Global & component styles
│   └── (TailwindCSS)
├── App.tsx            # Main app component with routing
└── main.tsx           # Entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd packages/web
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `VITE_API_BASE_URL` - Backend API URL (default: http://localhost:3001/api)
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key

### Development

```bash
npm run dev
```

Server runs at `http://localhost:3000` with hot-reload enabled.

### Build

```bash
npm run build
```

Optimized production build in `dist/`.

### Lint

```bash
npm run lint
```

## API Integration

### Authentication Flow

1. **Login/Register**: User submits email/password → server returns JWT access token
2. **Token Storage**: Access token stored in `localStorage`
3. **Requests**: Axios interceptor attaches `Authorization: Bearer <token>` header
4. **Refresh**: If 401 response, interceptor calls `/auth/refresh` endpoint
5. **Refresh Token**: Server returns new access token (refresh token via httpOnly cookie)
6. **Retry**: Original request retried with new token

### API Service (`src/services/api.ts`)

Singleton service wrapping Axios with:
- Base URL configuration
- JWT token injection & refresh logic
- Error handling
- Type-safe endpoints

Usage:
```typescript
import apiService from '@/services/api';

const result = await apiService.login({ email, password });
if (result.success) {
  console.log('User:', result.data);
}
```

## Component Architecture

### Layout Component
App shell providing:
- Header with navigation (login/signup or logout)
- Main content area
- Footer

### Page Components
- **HomePage**: Marketing page, signup CTA
- **LoginPage**: Email/password form, error handling
- **SignupPage**: Registration form with validation
- **DashboardPage**: User account & subscription management (protected route)

### Styling

Using TailwindCSS utility classes directly in JSX. Common utilities:
- `bg-primary-600` - Primary brand color
- `text-gray-900` - Dark text
- `rounded-lg` - Rounded corners
- `shadow-sm` - Subtle shadows
- `px-4 py-2` - Padding
- `flex gap-4` - Flexbox with gap

No component library — all UI is custom-built using Tailwind for maximum control.

## State Management

### Server State (React Query)
- User profile: `useQuery(['currentUser'], ...)`
- Subscriptions: `useQuery(['subscription'], ...)`
- Payments: `useQuery(['payments'], ...)`

Example:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['currentUser'],
  queryFn: () => apiService.getCurrentUser(),
});
```

### Client State (React Hooks)
- Form inputs: `useState`
- Loading: `useState`
- Errors: `useState`

No Redux/Zustand — keep it minimal.

## Authentication

Routes requiring auth:
- `/dashboard`
- `/subscriptions/*`
- `/account/*`

Unauthenticated routes redirect to `/auth/login`.

Check authentication with:
```typescript
apiService.isAuthenticated()
```

## Security Considerations

- ✅ JWT access tokens in `localStorage` (vulnerable to XSS, acceptable for SaaS)
- ✅ Refresh tokens in httpOnly cookies (secure, server-set)
- ✅ CORS credentials included (`withCredentials: true`)
- ✅ No sensitive data in frontend state
- ✅ Stripe Elements used (no raw card data)
- ❌ No hardcoded secrets in code
- ❌ No sensitive logs in console in production

## Accessibility

- Semantic HTML (`<button>`, `<form>`, `<nav>`)
- ARIA labels on form inputs
- Focus management on modals
- Color contrast ratios >4.5:1
- Goal: WCAG 2.1 AA compliance

## Performance

- Vite for <100ms dev refresh
- Code splitting per route
- React Query caching (5min stale time default)
- Lazy loading images & components (future)
- No external fonts (system stack)

## Testing

Tests will live in `src/**/*.test.tsx`. Run with:
```bash
npm run test
```

(Not set up yet — coming in next phase)

## Deployment

Frontend deployed to Vercel/Netlify (TBD):
1. `npm run build` generates `dist/`
2. Deploy `dist/` to CDN
3. Set environment variables in hosting platform
4. No server required (static + API)

## Common Tasks

### Add a new page
1. Create file in `src/pages/feature.tsx`
2. Import in `App.tsx`
3. Add route: `<Route path="/feature" element={<FeaturePage />} />`

### Add a new component
1. Create file in `src/components/MyComponent.tsx`
2. Export as default
3. Import where needed

### Update API integration
1. Modify `src/services/api.ts`
2. Update types in `src/types/api.ts` if response shape changes
3. Use in components with `useQuery` or direct `await` calls

### Style a component
1. Use TailwindCSS classes inline
2. For complex layouts, group styles with comments
3. No CSS files needed (Tailwind handles all styling)

## Troubleshooting

### CORS errors
- Check backend CORS config
- Ensure `VITE_API_BASE_URL` matches backend origin
- Verify `withCredentials: true` for cookie-based auth

### 401 Unauthorized
- Token expired or invalid
- Check browser `localStorage` for `accessToken`
- Check Network tab for refresh response
- Clear storage and re-login

### Vite build errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npx tsc --noEmit`
- Ensure all imports are correct

## Next Steps

- [ ] Add Stripe payment collection flow
- [ ] Implement pricing page with plan selector
- [ ] Add subscription management UI (upgrade/downgrade/cancel)
- [ ] Payment history & invoices
- [ ] User account settings
- [ ] Email verification
- [ ] Password reset flow
- [ ] Unit & integration tests
- [ ] E2E tests with Cypress

---

**Questions?** Check backend README at `../api/README.md` or team docs at `.squad/decisions.md`.

