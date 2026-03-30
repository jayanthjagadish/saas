import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { initializeDatabase } from './config/database.js';
import requestLoggingMiddleware from './middleware/requestLogger.js';
import errorHandler from './middleware/errorHandler.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import subscriptionRoutes from './routes/subscriptions.js';
import paymentRoutes from './routes/payments.js';
import webhookRoutes from './routes/webhooks.js';
import plansRoutes from './routes/plans.js';
import teamsRoutes from './routes/teams.js';
import dashboardRoutes from './routes/dashboard.js';
import twoFactorRoutes from './routes/two-factor.js';
import analyticsRoutes from './routes/analytics.js';
import testHooksRoutes from './routes/test-hooks.js';
import { Plan } from './models/index.js';

const app = express();

// Webhook route MUST come before express.json() so the raw body is available for signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Middleware
app.use(
  cors({
    origin: config.app.webUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(requestLoggingMiddleware);

// Routes
app.use('/auth', authRoutes);
app.use('/auth', twoFactorRoutes);
app.use('/users', userRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/payments', paymentRoutes);
app.use('/plans', plansRoutes);
app.use('/teams', teamsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/analytics', analyticsRoutes);

// Test hooks (dev only)
if (config.app.nodeEnv !== 'production') {
  app.use('/test-hooks', testHooksRoutes);
  console.log('✅ Test hooks enabled (dev only)');
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

export async function startServer(): Promise<void> {
  try {
    await initializeDatabase();
    await seedDefaultPlans();
    app.listen(config.app.port, () => {
      console.log(`✅ Backend running at ${config.app.apiUrl}`);
      console.log(`Environment: ${config.app.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function seedDefaultPlans(): Promise<void> {
  const plans = [
    { name: 'Free', tier: 'free', price_monthly: 0, price_annual: 0, max_members: 3, features: ['3 team members', 'Basic features'] },
    { name: 'Pro', tier: 'pro', price_monthly: 29, price_annual: 290, max_members: 10, features: ['10 team members', 'Advanced features', 'Priority support'] },
    { name: 'Enterprise', tier: 'enterprise', price_monthly: 99, price_annual: 990, max_members: 100, features: ['Unlimited members', 'All features', 'Dedicated support'] },
  ];

  for (const plan of plans) {
    await Plan.findOrCreate({ where: { tier: plan.tier }, defaults: plan as any });
  }
  console.log('Default plans seeded.');
}

export default app;
