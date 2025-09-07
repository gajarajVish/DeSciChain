/**
 * Simple DeSciFi Backend Server
 * Minimal setup to get started
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'DeSciFi Backend API',
    version: '1.0.0',
    status: 'running',
    contracts: {
      modelRegistry: process.env.MODEL_REGISTRY_APP_ID,
      escrow: process.env.ESCROW_APP_ID
    }
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DeSciFi Backend running on port ${PORT}`);
  console.log(`📄 API docs available at http://localhost:${PORT}/`);
  console.log(`🔗 Model Registry Contract: ${process.env.MODEL_REGISTRY_APP_ID}`);
  console.log(`🔗 Escrow Contract: ${process.env.ESCROW_APP_ID}`);
});