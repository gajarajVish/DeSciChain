"use strict";
/**
 * Simple DeSciChain Backend Server
 * Minimal setup to get started
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Basic health check
app.get('/', (req, res) => {
    res.json({
        message: 'DeSciChain Backend API',
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
    console.log(`🚀 DeSciChain Backend running on port ${PORT}`);
    console.log(`📄 API docs available at http://localhost:${PORT}/`);
    console.log(`🔗 Model Registry Contract: ${process.env.MODEL_REGISTRY_APP_ID}`);
    console.log(`🔗 Escrow Contract: ${process.env.ESCROW_APP_ID}`);
});
//# sourceMappingURL=simple-server.js.map