---
name: "architecture-patterns"
description: "SOLID principles, Clean Architecture, design patterns, and 12-Factor App applied to the Fenster TypeScript SaaS stack."
domain: "architecture, design-patterns, backend, frontend"
confidence: "high"
source: "earned — Fenster lession3 project"
---

## Context

Architecture decisions compound over time. A codebase that ignores SOLID starts with copy-paste, evolves into 500-line God classes, and ends with no one willing to touch auth. These patterns are not academic — each one maps to a real failure mode observed in production SaaS codebases.

Apply these on every PR, not just greenfield work.

---

## Patterns

### 1. SOLID — Backend (Express + TypeScript)

#### S — Single Responsibility Principle
One class/module does one thing. One reason to change.

```typescript
// ❌ VIOLATION: Route handler doing too much
router.post('/login', async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email } }); // DB query in route
  const valid = await bcrypt.compare(req.body.password, user.password);  // crypto in route
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);       // token gen in route
  res.json({ token });
});

// ✅ CORRECT: Route delegates to service
router.post('/login', async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password);
  res.json(result);
});
// AuthService handles: validation, bcrypt, token generation
// Route handles: HTTP parsing and response formatting only
```

#### O — Open/Closed Principle
Open for extension, closed for modification.

```typescript
// ❌ VIOLATION: Adding PayPal requires modifying existing code
class PaymentService {
  async charge(provider: string, amount: number) {
    if (provider === 'stripe') { /* Stripe logic */ }
    else if (provider === 'paypal') { /* PayPal logic */ } // modifying class
  }
}

// ✅ CORRECT: Add providers without touching existing code
interface IPaymentProvider {
  charge(amount: number, customerId: string): Promise<PaymentResult>;
  refund(paymentId: string): Promise<void>;
}

class StripeProvider implements IPaymentProvider { /* ... */ }
class PayPalProvider implements IPaymentProvider { /* ... */ }

class PaymentService {
  constructor(private provider: IPaymentProvider) {}
  async charge(amount: number, customerId: string) {
    return this.provider.charge(amount, customerId); // never changes
  }
}
```

#### L — Liskov Substitution Principle
Subtypes must be substitutable for their base type without breaking callers.

```typescript
// ✅ CORRECT: MockStripeProvider is substitutable for StripeProvider in tests
class MockStripeProvider implements IPaymentProvider {
  async charge(amount: number, customerId: string): Promise<PaymentResult> {
    return { id: 'mock_pi_123', status: 'succeeded', amount }; // same shape
  }
  async refund(paymentId: string): Promise<void> {} // same contract
}
// Tests swap real Stripe for mock — callers don't know or care
```

#### I — Interface Segregation Principle
Clients shouldn't depend on methods they don't use.

```typescript
// ❌ VIOLATION: Fat interface forces unused methods
interface IUserService {
  login(email: string, password: string): Promise<AuthResult>;
  logout(token: string): Promise<void>;
  updateProfile(userId: string, data: ProfileUpdate): Promise<User>;
  deleteAccount(userId: string): Promise<void>;
  getInvoices(userId: string): Promise<Invoice[]>;  // billing mixed into user service
}

// ✅ CORRECT: Split by consumer need
interface IAuthService {
  login(email: string, password: string): Promise<AuthResult>;
  logout(token: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<string>;
}

interface IProfileService {
  updateProfile(userId: string, data: ProfileUpdate): Promise<User>;
  deleteAccount(userId: string): Promise<void>;
}
```

#### D — Dependency Inversion Principle
High-level modules shouldn't depend on low-level modules. Both should depend on abstractions.

```typescript
// ❌ VIOLATION: Service imports concrete implementation
import Stripe from 'stripe';
class SubscriptionService {
  private stripe = new Stripe(process.env.STRIPE_KEY); // coupled to Stripe SDK
}

// ✅ CORRECT: Inject via constructor
class SubscriptionService {
  constructor(
    private paymentProvider: IPaymentProvider,  // abstraction
    private subscriptionRepo: ISubscriptionRepository, // abstraction
    private logger: ILogger  // abstraction
  ) {}
}
// Real app: inject StripeProvider, SequelizeSubscriptionRepo, PinoLogger
// Tests: inject MockPaymentProvider, InMemorySubscriptionRepo, MockLogger
```

---

### 2. SOLID — Frontend (React + TypeScript)

#### S — Single Responsibility (Components)
```typescript
// ❌ VIOLATION: God component
function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  // fetches data, handles errors, renders plan cards, handles checkout...
}

// ✅ CORRECT: Split responsibilities
function SubscriptionPage() {          // routing + layout only
  return <SubscriptionContainer />;
}
function SubscriptionContainer() {    // data fetching
  const { plans, loading } = usePlans();
  return <PricingTable plans={plans} loading={loading} />;
}
function PricingTable({ plans, loading }) { // pure rendering
  if (loading) return <Skeleton />;
  return plans.map(plan => <PlanCard key={plan.id} plan={plan} />);
}
```

#### D — Dependency Inversion (Components depend on abstractions)
```typescript
// ❌ VIOLATION: Component imports API directly
import axios from 'axios';
function LoginForm() {
  const handleSubmit = () => axios.post('/api/auth/login', ...);
}

// ✅ CORRECT: Component uses injected service abstraction
import { useAuth } from '../hooks/useAuth';
function LoginForm() {
  const { login } = useAuth(); // depends on hook interface, not axios
  const handleSubmit = () => login(email, password);
}
```

---

### 3. Clean Architecture Layers

```
┌─────────────────────────────────────┐
│  Routes (HTTP Boundary)             │  ← Parse req, call service, format res
│  src/routes/*.ts                    │    Never: DB queries, business logic
├─────────────────────────────────────┤
│  Services (Application Layer)       │  ← Orchestrate use cases
│  src/services/*.ts                  │    Never: Model.findOne(), res.json()
├─────────────────────────────────────┤
│  Repositories (Data Access Layer)   │  ← DB queries only
│  src/repositories/*.ts              │    Returns domain objects, not Sequelize instances
├─────────────────────────────────────┤
│  Models (Data Schema Layer)         │  ← Sequelize definitions only
│  src/models/*.ts                    │    Never: business logic, validation rules
└─────────────────────────────────────┘
```

**Rule:** Dependencies only flow DOWN. Routes know about Services. Services know about Repositories. Repositories know about Models. Nothing flows up.

---

### 4. Repository Pattern

```typescript
// src/repositories/user.repository.ts
interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserDTO): Promise<User>;
  update(id: string, data: UpdateUserDTO): Promise<User>;
}

class SequelizeUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const record = await UserModel.findOne({ where: { email } });
    return record ? toDomainUser(record) : null; // map to plain domain object
  }
}

// In tests:
class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [];
  async findByEmail(email: string) {
    return this.users.find(u => u.email === email) ?? null;
  }
}
```

---

### 5. Twelve-Factor App Compliance

| Factor | Requirement | Implementation |
|--------|------------|----------------|
| III Config | All config from env vars | `.env` files, never hardcoded |
| IV Backing services | Treat DB/Stripe/email as attached resources | Connection strings in env, swappable |
| VI Processes | Stateless — no in-memory session state | JWT tokens, no server-side sessions |
| VII Port binding | App exports service via port | `app.listen(config.port)` |
| IX Disposability | Fast startup/shutdown | Graceful shutdown handlers |
| X Dev/prod parity | Keep environments as similar as possible | Same DB engine in dev/test/prod (MySQL) |
| XI Logs | Treat logs as event streams | Pino to stdout, never to files |
| XII Admin processes | Run admin tasks as one-off processes | Migration scripts, seed scripts |

---

### 6. Design Patterns — When to Use

| Pattern | Use When | Example in Fenster |
|---------|----------|--------------------|
| **Repository** | Abstracting data access | `UserRepository`, `SubscriptionRepository` |
| **Strategy** | Swappable algorithms/providers | `IPaymentProvider` (Stripe/PayPal/Mock) |
| **Factory** | Complex object creation | `createTestUser()`, `createSubscription()` |
| **Observer** | React to events without coupling | Stripe webhooks → subscription status update |
| **Decorator** | Add behaviour without modifying | Auth middleware, logging middleware, rate limiting |
| **Facade** | Simplify complex subsystems | `paymentService.subscribe()` hides Stripe + DB + email |

---

### 7. YAGNI / KISS / DRY

**YAGNI (You Aren't Gonna Need It):**
- Don't add `supports multiple currencies` until the PRD says so
- Don't add Redis caching until profiling proves the DB is the bottleneck
- Don't add plugin architecture until you have 3+ actual plugins to plug

**KISS (Keep It Simple, Stupid):**
- Prefer `if/else` over strategy pattern when there are only 2 conditions
- Prefer direct SQL query over ORM abstraction when query is complex and ORM fights you
- 50-line function that's readable > 5 classes that require a UML diagram to understand

**DRY (Don't Repeat Yourself):**
- Abstract to `packages/shared/` only when 3+ consumers use the same code
- Shared types: yes (prevents contract drift)
- Shared utilities: yes (date formatting, currency formatting)
- Shared business logic: careful — coupling increases with sharing

---

## Anti-Patterns

1. **God Class/Route**: Route handler >50 lines → extract service
2. **Service Locator**: `container.get('UserService')` → use constructor injection
3. **Anemic Domain Model**: Models with only getters/setters, zero logic → move business rules to services
4. **Shotgun Surgery**: One change requires edits in 10 files → consolidate responsibility
5. **Feature Envy**: Class uses another class's data more than its own → move the method
6. **Primitive Obsession**: `userId: string` everywhere → `UserId` value object or at least type alias
7. **Magic Numbers**: `if (status === 3)` → `if (status === SubscriptionStatus.PAST_DUE)`
8. **Speculative Generality**: Abstract base classes with one concrete implementation → wait for the second one
