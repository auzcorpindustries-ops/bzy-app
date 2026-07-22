import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import logger from './config/logger.js';

// ── Routes ──
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import servicesRoutes from './routes/services.js';
import bookingsRoutes from './routes/bookings.js';
import customersRoutes from './routes/customers.js';
import paymentWebhookRoutes from './routes/paymentWebhooks.js';
import paymentsRoutes from './routes/payments.js';
import aiAgentRoutes from './routes/aiAgent.js';
import pushRoutes from './routes/push.js';
import clientRoutes from './routes/client.js';

const app = express();

// ── Middleware ──
app.use(cors({ origin: config.corsOrigin }));

// CRITICAL: Stripe and Square webhooks need the RAW body for signature verification.
// Register webhook routes BEFORE express.json() so they get raw bodies.
// The webhook routes use express.raw() internally.
app.use('/api/payments', paymentWebhookRoutes);

// JSON parsing for all other routes
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request log
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ── Health check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bzy-backend', timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use('/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/ai-agent', aiAgentRoutes);
app.use('/api/push', pushRoutes);
app.use('/client', clientRoutes);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Endpoint not found', status: 404 });
});

// ── Error handler ──
app.use((err, req, res, _next) => {
  logger.error(err.stack || err.message);
  const status = err.status || 500;
  const code = err.code || 'internal_error';
  const message = status === 500 ? 'Something went wrong' : err.message;
  res.status(status).json({ error: code, message, status });
});

export default app;
