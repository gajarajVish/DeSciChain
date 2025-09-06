/**
 * Simple Express server to serve the frontend
 * and proxy API requests to the backend
 */

const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Serve static files
app.use(express.static(path.join(__dirname)));

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Backend service unavailable' });
    }
}));

// Serve index.html for all routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 DeSciChain Frontend running on port ${PORT}`);
    console.log(`📡 Proxying API requests to: ${BACKEND_URL}`);
    console.log(`🌐 Open http://localhost:${PORT} to view the application`);
});

module.exports = app;
