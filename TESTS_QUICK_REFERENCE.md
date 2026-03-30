# Quick Test Reference

## Setup (One-time)

```bash
# Install missing test dependency
cd packages/api
npm install --save-dev supertest @types/supertest
cd ../..
```

## Running Tests

### Smoke Tests (Fast - Run First)
```bash
# Start servers first
npm run dev

# In another terminal:
npx playwright test tests/e2e/smoke.spec.ts
```

### Full E2E Suite
```bash
# Requires: Frontend (3000) + Backend (3001) running
npx playwright test

# With UI mode for debugging:
npx playwright test --ui

# Single browser only:
npx playwright test --project=chromium
```

### API Integration Tests
```bash
# Requires: Backend (3001) running
cd packages/api
npm test -- src/__tests__/auth.test.ts
npm test -- src/__tests__/plans.test.ts

# Or run all:
npm test
```

### Frontend Unit Tests
```bash
# No servers required
npm run test:unit

# Or with vitest directly:
npx vitest packages/web/src/__tests__/api.test.ts
```

## Test Files Location

```
tests/
├── e2e/
│   ├── helpers/
│   │   └── test-data.ts        # Test utilities
│   ├── auth.spec.ts            # Auth flows (17 tests)
│   ├── smoke.spec.ts           # Health checks (7 tests)
│   └── plans.spec.ts           # Plans/subscriptions (13 tests)
│
packages/api/src/
└── __tests__/
    ├── auth.test.ts            # Auth API (15 tests)
    └── plans.test.ts           # Plans API (9 tests)

packages/web/src/
└── __tests__/
    └── api.test.ts             # API service (23 tests)
```

## Debugging Tests

### Playwright (E2E)
```bash
# Debug mode (step through):
npx playwright test --debug tests/e2e/auth.spec.ts

# Headed mode (watch browser):
npx playwright test --headed tests/e2e/smoke.spec.ts

# Show trace:
npx playwright show-trace trace.zip
```

### Jest (API)
```bash
# Run with verbose output:
cd packages/api
npm test -- --verbose

# Run specific test:
npm test -- -t "should return 201"
```

### Vitest (Unit)
```bash
# Watch mode:
npx vitest --watch

# UI mode:
npx vitest --ui
```

## Common Issues

### "ECONNREFUSED localhost:3000"
**Cause**: Frontend not running  
**Fix**: Run `npm run dev` first

### "ECONNREFUSED localhost:3001"
**Cause**: Backend not running  
**Fix**: Check that API server started (check logs)

### "Cannot find module 'supertest'"
**Cause**: Dependency not installed  
**Fix**: `cd packages/api && npm install --save-dev supertest @types/supertest`

### "User not found" in login tests
**Cause**: Test user doesn't exist in database  
**Fix**: Create verified test user or update test to use existing user

### Flaky E2E tests
**Cause**: Timing issues, network delays  
**Fix**: 
- Increase timeouts in test
- Add explicit waits
- Check test isolation (cleanup between tests)

## Test Coverage

```bash
# E2E coverage (via Playwright):
npx playwright test --reporter=html
# Open: playwright-report/index.html

# API coverage (via Jest):
cd packages/api
npm test -- --coverage
# Open: coverage/index.html

# Unit coverage (via Vitest):
npx vitest --coverage
# Open: coverage/index.html
```

## CI/CD Integration

### Recommended Pipeline
```yaml
# .github/workflows/test.yml (example)
test:
  - name: Install dependencies
    run: npm install
  
  - name: Install test dependencies
    run: cd packages/api && npm install --save-dev supertest @types/supertest
  
  - name: Run unit tests
    run: npm run test:unit
  
  - name: Start servers
    run: npm run dev &
    
  - name: Wait for servers
    run: sleep 10
  
  - name: Run smoke tests
    run: npx playwright test tests/e2e/smoke.spec.ts
  
  - name: Run API tests
    run: cd packages/api && npm test
  
  - name: Run full E2E suite
    run: npx playwright test
```

## Performance

| Test Suite | Tests | Duration | Requires |
|------------|-------|----------|----------|
| Smoke      | 7     | ~30s     | Both servers |
| Auth E2E   | 17    | ~2m      | Both servers |
| Plans E2E  | 13    | ~1m      | Both servers |
| API Tests  | 24    | ~30s     | Backend only |
| Unit Tests | 23    | ~5s      | None |
| **Total**  | **84**| **~4m**  | - |

## Test User Credentials

### For Local Development
Create these users in your dev database:

```sql
-- Verified user for login tests
INSERT INTO users (email, password, verified) VALUES
('verified-test@fenster-test.com', '$2a$12$...', true);

-- Unverified user for verification tests
INSERT INTO users (email, password, verified) VALUES
('unverified-test@fenster-test.com', '$2a$12$...', false);
```

Password: `SecureTest123!@#`

### Dynamic Test Users
Tests create unique users with timestamp:
- `test-user-1735673123456@fenster-test.com`
- These are safe to create/delete per test
