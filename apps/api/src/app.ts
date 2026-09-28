import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import { apiRouter } from './routes';
import { errorHandler } from './middlewares/errorHandler';

export const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps, local tools, or configured origins
      if (!origin || config.corsOrigin.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Dev permissive
      }
    },
    credentials: true,
  })
);

// General Rate Limiter (500 requests per 15 minutes)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

// Parse JSON bodies with adequate size for batch sync & base64 images
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads directory
app.use('/uploads', express.static(config.uploadDir));

// Mount Primary API Router (both /api/v1 and /api for compatibility)
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    business: 'Trending Studio — Gifts & Frames',
    location: 'Karaikudi - 630001',
    phone: '+91-79040-64446',
    status: 'ONLINE',
    docs: '/api/v1/health',
  });
});

// Central Error Handler
app.use(errorHandler);
