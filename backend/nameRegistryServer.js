/**
 * Standalone Name Registry Server
 * Simple Express.js server for testing the Name Registry API
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const algosdk = require('algosdk');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Load deployment info and demo data
const loadDeploymentInfo = () => {
  try {
    const deploymentPath = path.join(__dirname, '../contracts/deployment_info.json');
    const data = fs.readFileSync(deploymentPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Could not load deployment_info.json:', error.message);
    return null;
  }
};

const loadDemoData = () => {
  try {
    const demoPath = path.join(__dirname, '../contracts/demo_data.json');
    const data = fs.readFileSync(demoPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Could not load demo_data.json:', error.message);
    return { registered_names: [] };
  }
};

// Initialize data
const deploymentInfo = loadDeploymentInfo();
const demoData = loadDemoData();
const nameRegistryAppId = deploymentInfo ? deploymentInfo.contracts.name_registry.app_id : null;

console.log('📋 Loaded deployment info:', deploymentInfo ? 'success' : 'failed');
console.log('📋 Loaded demo data:', demoData.registered_names.length, 'names');
console.log('🏷️ Name Registry App ID:', nameRegistryAppId);

// Initialize Algorand client
const algodToken = process.env.ALGOD_TOKEN || '';
const algodServer = process.env.ALGOD_ADDRESS || 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk.Algodv2(algodToken, algodServer, '');

/**
 * GET /api/names/marketplace
 * Get marketplace listing of all registered names
 */
app.get('/api/names/marketplace', async (req, res) => {
  try {
    const marketplace = demoData.registered_names.map(item => ({
      name: item.name,
      price_algo: item.price_algo,
      description: item.description,
      cid: item.cid,
      tx_id: item.tx_id
    }));

    res.json({
      success: true,
      names: marketplace,
      total: marketplace.length,
      app_id: nameRegistryAppId
    });

  } catch (error) {
    console.error('Marketplace error:', error);
    res.status(500).json({
      error: 'Failed to get marketplace data',
      details: error.message
    });
  }
});

/**
 * GET /api/names/:name/resolve
 * Resolve a name to get owner, CID, and price (mock implementation)
 */
app.get('/api/names/:name/resolve', async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({ error: 'Name parameter required' });
    }

    // Find in demo data
    const found = demoData.registered_names.find(item => item.name.toLowerCase() === name.toLowerCase());
    
    if (found) {
      res.json({
        success: true,
        name: found.name,
        owner: 'UZCPSQ7OFDEGTRCMTP2V2G7MKFMZMZ5PUAQS2BSGRLAUQNS337GZC7TYMU', // Demo owner
        price_algo: found.price_algo,
        price_microalgos: found.price_algo * 1_000_000,
        cid: found.cid,
        description: found.description,
        timestamp: Math.floor(Date.now() / 1000)
      });
    } else {
      res.status(404).json({
        error: 'Name not found',
        name: name
      });
    }

  } catch (error) {
    console.error('Resolve name error:', error);
    res.status(500).json({
      error: 'Failed to resolve name',
      details: error.message
    });
  }
});

/**
 * GET /api/names/:name/exists
 * Check if a name exists
 */
app.get('/api/names/:name/exists', async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({ error: 'Name parameter required' });
    }

    const exists = demoData.registered_names.some(item => 
      item.name.toLowerCase() === name.toLowerCase()
    );
    
    res.json({
      success: true,
      name: name,
      exists: exists
    });

  } catch (error) {
    console.error('Name exists error:', error);
    res.status(500).json({
      error: 'Failed to check name existence',
      details: error.message
    });
  }
});

/**
 * POST /api/names/register
 * Register a new name (mock implementation - would need real wallet integration)
 */
app.post('/api/names/register', async (req, res) => {
  try {
    const { name, cid, price, senderMnemonic } = req.body;

    // Validate inputs
    if (!name || !cid || price === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: name, cid, price'
      });
    }

    // Check if name already exists
    const exists = demoData.registered_names.some(item => 
      item.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      return res.status(400).json({
        error: 'Name already registered'
      });
    }

    // Mock registration (in real implementation, this would call the smart contract)
    const mockTxId = 'MOCK' + Math.random().toString(36).substring(2).toUpperCase();
    
    res.json({
      success: true,
      txId: mockTxId,
      name: name,
      price: price,
      price_algo: price / 1_000_000,
      round: Math.floor(Math.random() * 1000000),
      message: 'Mock registration - would call smart contract in production'
    });

  } catch (error) {
    console.error('Register name error:', error);
    res.status(500).json({
      error: 'Failed to register name',
      details: error.message
    });
  }
});

/**
 * GET /api/names/info
 * Get information about the Name Registry contract
 */
app.get('/api/names/info', async (req, res) => {
  try {
    if (!deploymentInfo) {
      return res.status(500).json({
        error: 'Deployment information not available'
      });
    }

    res.json({
      success: true,
      contract: {
        app_id: nameRegistryAppId,
        network: deploymentInfo.network,
        creator: deploymentInfo.creator_address,
        deployment_timestamp: deploymentInfo.deployment_timestamp
      },
      endpoints: {
        register: 'POST /api/names/register',
        resolve: 'GET /api/names/:name/resolve',
        exists: 'GET /api/names/:name/exists',
        marketplace: 'GET /api/names/marketplace'
      }
    });
  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({
      error: 'Failed to get registry info',
      details: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Name Registry API',
    timestamp: new Date().toISOString(),
    app_id: nameRegistryAppId
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'DeSci Name Registry API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      marketplace: 'GET /api/names/marketplace',
      resolve: 'GET /api/names/:name/resolve',
      exists: 'GET /api/names/:name/exists',
      register: 'POST /api/names/register',
      info: 'GET /api/names/info'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
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
  console.log(`🚀 Name Registry Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api/names`);
  console.log(`🏷️ Name Registry App ID: ${nameRegistryAppId}`);
  console.log(`📱 Demo names loaded: ${demoData.registered_names.length}`);
});

module.exports = app;