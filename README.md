# Fenster — SaaS Platform

Fenster is a full-stack SaaS platform built with TypeScript, React, and Express. It provides a robust foundation for building scalable web applications with real-time authentication, database-driven features, and comprehensive testing coverage.

---

## Prerequisites

Before setting up Fenster, ensure you have the following installed:

- **Node.js** >= 18.x
- **npm** >= 9.x
- **MySQL** 8.x (running locally or accessible via network)
- **Git**

For E2E testing (optional):
- Playwright browsers will be installed via `npx playwright install`

---

## Environment Setup

Fenster requires environment configuration files in both the API and web packages.

### API Configuration (`packages/api/.env`)

Create a `.env` file in the `packages/api/` directory with the following variables:

```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fenster_dev
DB_USER=root
DB_PASSWORD=your_password_here
JWT_SECRET=your_jwt_secret_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key_here
CLIENT_URL=http://localhost:3000
```

**Notes:**
- `JWT_SECRET`: Generate a secure random string (e.g., using `openssl rand -base64 32`)
- `STRIPE_SECRET_KEY`: Use Stripe test keys (starting with `sk_test_`) for development
- `DB_*` values should match your MySQL setup

### Web Configuration (`packages/web/.env`)

Create a `.env` file in the `packages/web/` directory:

```bash
VITE_API_BASE_URL=/api
```

This configures the frontend to proxy API requests to `http://localhost:3001` via Vite's dev server.

---

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/jayanthjagadish/saas.git
cd saas
npm install
```

This command installs dependencies for the root workspace and all packages.

---

## Database Setup

1. **Create MySQL Database:**

   ```bash
   mysql -u root -p
   ```

   ```sql
   CREATE DATABASE fenster_dev;
   EXIT;
   ```

   Replace `fenster_dev` with your database name if using a different value in `.env`.

2. **Run Sequelize Sync:**

   The application automatically syncs the database schema on startup via `sequelize.sync()`. No manual migrations are required.

---

## Running the App

### Start Both Servers (Recommended)

Run both the API and web servers with a single command:

```bash
node start-servers.js
```

This starts:
- **Frontend** on `http://localhost:3000` (Vite dev server with HMR)
- **API** on `http://localhost:3001` (Express server)

### Run Servers Separately

**Terminal 1 — API Server:**
```bash
cd packages/api
npm run dev
```

**Terminal 2 — Web Server:**
```bash
cd packages/web
npm run dev
```

---

## Creating a Test User

To set up the default test user for E2E testing:

```bash
node create-test-user.js
```

This creates a user account with the following credentials:
- **Email:** `test@fenster-test.com`
- **Password:** `SecureTest123!@#`

The test user is automatically created in your local MySQL database.

---

## Running Tests

### Unit Tests

Run Jest unit tests:

```bash
npm test
```

Run only unit tests:
```bash
npm run test:unit
```

### API Tests

Run API-specific tests:
```bash
npm run test:api
```

### Integration Tests

Run Vitest integration tests:
```bash
npm run test:integration
```

### E2E Tests

Run Playwright end-to-end tests:

```bash
npx playwright test
```

**First Time Setup:**

Install Playwright browsers (one-time only):
```bash
npx playwright install
```

---

## Project Structure

```
fenster/
├── packages/
│   ├── api/                 # Express + TypeScript API server
│   │   ├── src/
│   │   │   ├── app.ts       # Express application entry point
│   │   │   ├── models/      # Sequelize database models
│   │   │   ├── routes/      # API route handlers
│   │   │   ├── middleware/  # Express middleware (auth, error handling)
│   │   │   └── utils/       # Helper functions
│   │   ├── .env             # Environment configuration (create this)
│   │   └── package.json
│   │
│   └── web/                 # React + Vite frontend application
│       ├── src/
│       │   ├── main.tsx      # React application entry point
│       │   ├── components/   # Reusable React components
│       │   ├── pages/        # Page components (routes)
│       │   ├── services/     # API client services
│       │   └── styles/       # CSS/Tailwind styles
│       ├── .env              # Environment configuration (create this)
│       └── package.json
│
├── tests/                   # Root-level test suite
│   ├── unit/                # Unit tests
│   ├── api/                 # API integration tests
│   └── e2e/                 # Playwright E2E tests
│
├── dev-emails/              # Local development email output (no real server)
├── start-servers.js         # Script to start both servers
├── create-test-user.js      # Script to create test user
├── jest.config.js           # Jest configuration
├── playwright.config.ts     # Playwright E2E test configuration
├── vitest.config.ts         # Vitest integration test configuration
├── package.json             # Root workspace package
└── README.md                # This file
```

---

## Key URLs

| Resource | URL |
|----------|-----|
| **Frontend** | http://localhost:3000 |
| **API Server** | http://localhost:3001 |
| **API Proxy** (from frontend) | `/api/*` routes to `http://localhost:3001/*` |

---

## Authentication

Fenster uses JWT-based authentication:

1. User logs in with email and password
2. Server returns a JWT token stored in `localStorage`
3. Token is sent with each API request in the `Authorization` header
4. Protected routes redirect to `/login` if token is missing or invalid

---

## Development Notes

- **Vite Proxy:** The frontend's Vite dev server proxies `/api/*` requests to the Express API, automatically stripping the `/api` prefix
- **Hot Module Replacement (HMR):** Both frontend and API support hot reloading during development
- **Email in Development:** Dev emails are written to the `dev-emails/` folder (no real SMTP server needed)
- **Database Sync:** Schema updates are handled automatically on app startup—no manual migrations required

---

## Troubleshooting

### Port Already in Use

If port 3000 or 3001 is already in use:

```bash
# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001 (macOS/Linux)
lsof -ti:3001 | xargs kill -9
```

On Windows:
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### MySQL Connection Error

Ensure MySQL is running and the credentials in `packages/api/.env` match your local setup:

```bash
# Test connection
mysql -u root -p -h localhost
```

### Test User Not Created

If `create-test-user.js` fails, ensure:
1. MySQL is running
2. Database exists (`fenster_dev`)
3. `.env` file is correctly configured in `packages/api/`

---

## Contributing

When adding new features:

1. Create feature branch: `git checkout -b feature/your-feature`
2. Write tests before implementation (TDD approach)
3. Run full test suite: `npm test && npm run test:integration && npx playwright test`
4. Commit with descriptive message
5. Push and create a pull request

---

## License

© 2024 Fenster. All rights reserved.
