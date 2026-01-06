import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './config/logger.js';
import { errorHandler } from './common/middleware/error-handler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { propertiesRouter } from './modules/properties/properties.routes.js';
import { peopleRouter } from './modules/people/people.routes.js';
import { leadsRouter } from './modules/leads/leads.routes.js';
import { visitsRouter } from './modules/visits/visits.routes.js';
import { contractsRouter } from './modules/contracts/contracts.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { featuresRouter } from './modules/features/features.routes.js';
import { whatsappRouter } from './modules/whatsapp/whatsapp.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { portalsRouter } from './modules/portals/portals.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/people', peopleRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/visits', visitsRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/features', featuresRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/portals', portalsRouter);
app.use('/api/payments', paymentsRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
});

export default app;
