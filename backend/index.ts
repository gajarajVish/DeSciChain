/**
 * DeSciFi Backend Server
 * Main entry point for the API server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { createConnection } from 'typeorm';

// Import routes
import modelsRouter from './routes/models.route';
import blockchainRouter from './routes/blockchain.route';
import nameRegistryRouter from './routes/nameRegistry.route';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Enhanced logging middleware
app.use(morgan((tokens, req, res) => {
  return [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms',
    tokens['user-agent'](req, res)
  ].join(' ');
}));

// Request monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    // Log slow requests
    if (duration > 5000) {
      console.warn('Slow request detected:', logData);
    }

    // Log errors
    if (res.statusCode >= 400) {
      console.error('Request error:', logData);
    }
  });

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/models', modelsRouter);
app.use('/api/blockchain', blockchainRouter);
app.use('/api/names', nameRegistryRouter);

// Enhanced error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  // Handle different types of errors
  let statusCode = err.status || 500;
  let errorMessage = err.message || 'Internal Server Error';
  let errorType = 'InternalError';

  // Wallet-related errors
  if (err.message?.includes('wallet') || err.message?.includes('Wallet')) {
    statusCode = 400;
    errorType = 'WalletError';
  }

  // Blockchain-related errors
  if (err.message?.includes('blockchain') || err.message?.includes('transaction') || err.message?.includes('Algorand')) {
    statusCode = 400;
    errorType = 'BlockchainError';
  }

  // Encryption-related errors
  if (err.message?.includes('encryption') || err.message?.includes('decryption') || err.message?.includes('crypto')) {
    statusCode = 400;
    errorType = 'EncryptionError';
  }

  // IPFS-related errors
  if (err.message?.includes('IPFS') || err.message?.includes('upload') || err.message?.includes('download')) {
    statusCode = 400;
    errorType = 'StorageError';
  }

  // Validation errors
  if (err.message?.includes('validation') || err.message?.includes('required') || err.message?.includes('invalid')) {
    statusCode = 400;
    errorType = 'ValidationError';
  }

  res.status(statusCode).json({
    error: {
      type: errorType,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.details
      })
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DeSciFi Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
