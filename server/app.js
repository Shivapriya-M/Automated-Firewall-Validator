import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { sanitize } from './middleware/sanitize.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/authRoutes.js';
import ruleRoutes from './routes/ruleRoutes.js';
import validationRoutes from './routes/validationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL.split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '100kb' }));
app.use(sanitize);

if (env.NODE_ENV === 'development') {
  app.use((req, _res, next) => { console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`); next(); });
}

app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'unavailable', database: connected ? 'connected' : 'disconnected', time: new Date().toISOString() });
});
app.use('/api/auth', authRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api', validationRoutes);

app.use(notFound);
app.use(errorHandler);
export default app;
