import express from 'express';
import helmet from 'helmet';
import { query } from './db.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { householdsRouter } from './routes/households.js';
import { residentsRouter } from './routes/residents.js';
import { masterlistsRouter } from './routes/masterlists.js';
import { usersRouter } from './routes/users.js';

export const app = express();

// Security headers
app.use(helmet());

// JSON request body parser
app.use(express.json());

// Health check endpoint (verifies database connectivity)
app.get('/api/health', async (req, res, next) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

// Authentication routes
app.use('/api/auth', authRouter);

// Household routes
app.use('/api/households', householdsRouter);

// Resident routes
app.use('/api/residents', residentsRouter);

// Masterlist routes
app.use('/api/masterlists', masterlistsRouter);

// User administration routes
app.use('/api/users', usersRouter);





// 404 handler for unhandled routes
app.use((req, res, next) => {
  next(new AppError(404, 'not_found', 'Route not found.'));
});

// Central error handler
app.use(errorHandler);

