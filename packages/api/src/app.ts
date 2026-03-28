import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { initializeDatabase } from './config/database.js';
import requestLoggingMiddleware from './middleware/requestLogger.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import subscriptionRoutes from './routes/subscriptions.js';
import paymentRoutes from './routes/payments.js';
import webhookRoutes from './routes/webhooks.js';
import plansRoutes from './routes/plans.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: config.app.webUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLoggingMiddleware);

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/payments', paymentRoutes);
app.use('/webhooks', webhookRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

export async function startServer(): Promise<void> {
  try {
    await initializeDatabase();
    app.listen(config.app.port, () => {
      console.log(`✅ Backend running at ${config.app.apiUrl}`);
      console.log(`Environment: ${config.app.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

export default app;
