"use strict";
/**
 * DeSciChain Backend Server
 * Main entry point for the API server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = require("dotenv");
// Import routes
const models_route_1 = __importDefault(require("./routes/models.route"));
const blockchain_route_1 = __importDefault(require("./routes/blockchain.route"));
const nameRegistry_route_1 = __importDefault(require("./routes/nameRegistry.route"));
// Load environment variables
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Compression middleware
app.use((0, compression_1.default)());
// Enhanced logging middleware
app.use((0, morgan_1.default)((tokens, req, res) => {
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
app.use('/api/models', models_route_1.default);
app.use('/api/blockchain', blockchain_route_1.default);
app.use('/api/names', nameRegistry_route_1.default);
// Enhanced error handling middleware
app.use((err, req, res, next) => {
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
    console.log(`🚀 DeSciChain Backend Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map