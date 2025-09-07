/**
 * Simple test server for DeSciFi integration testing
 * Provides mock API endpoints for frontend testing
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3001;

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pkl', '.h5', '.pt', '.pth', '.onnx', '.joblib', '.model'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only ML model files are allowed.'));
    }
  }
});

// Encryption utilities
const encryptFile = (filePath, password) => {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);

  const input = fs.createReadStream(filePath);
  const encryptedPath = filePath + '.encrypted';
  const output = fs.createWriteStream(encryptedPath);

  return new Promise((resolve, reject) => {
    input.pipe(cipher).pipe(output);
    output.on('finish', () => {
      // Create hash for blockchain verification
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(encryptedPath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => {
        const fileHash = hash.digest('hex');
        resolve({ encryptedPath, fileHash });
      });
    });
    output.on('error', reject);
  });
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock data
const mockModels = [
  {
    id: '1',
    name: "GPT-4 Fine-tuned for Scientific Research",
    description: "Advanced language model specifically trained on scientific literature and research papers for enhanced academic writing and analysis.",
    priceAlgo: 1,
    rating: 4.9,
    downloads: 1247,
    category: "NLP",
    framework: "PyTorch",
    version: "1.0.0",
    tags: ["nlp", "research", "fine-tuned"],
    license: "MIT",
    fileSize: 2048000000,
    author: "Dr. Sarah Chen",
    authorAddress: "ALGO123456789ABCDEF...",
    authorName: "sarahchen.desci",
    ipfsHash: "QmExample1Hash",
    watermarkHash: "WMHash1",
    filePath: "/Users/vg/Downloads/dummy_model.pth",
    createdAt: new Date(),
    accuracy: 95.2
  },
  {
    id: '2',
    name: "Computer Vision Model for Medical Imaging",
    description: "State-of-the-art CNN for medical image analysis with 98.5% accuracy in detecting anomalies in X-rays and MRI scans.",
    priceAlgo: 1,
    rating: 4.8,
    downloads: 892,
    category: "Computer Vision",
    framework: "TensorFlow",
    version: "2.1.0",
    tags: ["computer-vision", "medical", "cnn"],
    license: "Apache 2.0",
    fileSize: 1536000000,
    author: "MedAI Labs",
    authorAddress: "ALGO456789ABCDEF123...",
    authorName: "medailabs.desci",
    ipfsHash: "QmExample2Hash",
    watermarkHash: "WMHash2",
    filePath: "/Users/vg/Downloads/dummy_model.pth",
    createdAt: new Date(),
    accuracy: 98.5
  },
  {
    id: '3',
    name: "Predictive Analytics for Financial Markets",
    description: "Machine learning model for stock price prediction using advanced time series analysis and sentiment data integration.",
    priceAlgo: 1,
    rating: 4.7,
    downloads: 654,
    category: "Data Analytics",
    framework: "Scikit-learn",
    version: "1.3.2",
    tags: ["finance", "prediction", "time-series"],
    license: "BSD-3-Clause",
    fileSize: 512000000,
    author: "QuantLab Research",
    authorAddress: "ALGO789ABCDEF123456...",
    authorName: "quantlab.desci",
    ipfsHash: "QmExample3Hash",
    watermarkHash: "WMHash3",
    filePath: "/Users/vg/Downloads/dummy_model.pth",
    createdAt: new Date(),
    accuracy: 87.3
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'DeSciFi Test Backend is running'
  });
});

// Get all models
app.get('/api/models', async (req, res) => {
  console.log('📊 GET /api/models - Fetching all models');
  
  // Resolve author names for all models
  const modelsWithResolvedNames = await Promise.all(
    mockModels.map(async (model) => {
      const resolvedAuthorName = await resolveAddressToName(model.creator || model.authorAddress || model.author);
      return {
        ...model,
        authorDisplayName: resolvedAuthorName,
        // Keep original for reference
        originalAuthor: model.creator || model.authorAddress || model.author
      };
    })
  );
  
  res.json(modelsWithResolvedNames);
});

// Get specific model
app.get('/api/models/:id', (req, res) => {
  const model = mockModels.find(m => m.id === req.params.id);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }
  console.log(`📊 GET /api/models/${req.params.id} - Fetching model: ${model.name}`);
  res.json(model);
});

// Prepare model publishing (pre-validation)
app.post('/api/models/prepare-publish', upload.single('modelFile'), (req, res) => {
  console.log('🔍 POST /api/models/prepare-publish - Preparing model publication');
  console.log('Request body:', req.body);
  console.log('Request body type:', typeof req.body);
  console.log('Request body keys:', Object.keys(req.body || {}));
  
  const { name, description, price, publisherAddress, licenseTerms, framework, type, tags } = req.body;
  
  console.log('Extracted fields:', { name, description, price, publisherAddress, licenseTerms, framework, type, tags });
  console.log('Uploaded file:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');
  
  // Basic validation
  if (!name || !description || !price || !publisherAddress || !licenseTerms) {
    console.log('❌ Validation failed - missing required fields');
    return res.status(400).json({ 
      error: 'Validation failed',
      details: `Missing required fields. Received: name=${name}, description=${description}, price=${price}, publisherAddress=${publisherAddress}, licenseTerms=${licenseTerms}`
    });
  }
  
  if (!req.file) {
    console.log('❌ Validation failed - no file uploaded');
    return res.status(400).json({ 
      error: 'Validation failed',
      details: 'Model file is required'
    });
  }
  
  // Return preparation success
  res.json({
    success: true,
    message: 'Model preparation validated successfully',
    uploadEndpoint: '/api/models/publish'
  });
});

// Publish model with file upload and encryption
app.post('/api/models/publish', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 POST /api/models/publish - Publishing new model with encryption');
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    if (!req.file) {
      return res.status(400).json({ error: 'No model file uploaded' });
    }

    const { name, description, framework, accuracy, price, category, creator, encrypt } = req.body;

    if (!name || !description || !price || !creator) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const modelId = `model_${Date.now()}`;
    let encryptedHash = null;
    let finalFilePath = req.file.path;

    // Always encrypt files for security (this is our value proposition)
    console.log('🔒 Encrypting model file for security...');
    const password = crypto.randomBytes(32).toString('hex'); // Generate secure encryption key
    const { encryptedPath, fileHash } = await encryptFile(req.file.path, password);
    
    // Store encryption key securely with metadata
    const encryptionData = {
      password: password,
      algorithm: 'aes-256-gcm',
      originalFilename: req.file.originalname,
      encryptedAt: new Date().toISOString(),
      modelId: modelId,
      creator: creator
    };

    // Save encryption info to secure key file
    fs.writeJsonSync(encryptedPath + '.key', encryptionData);
    
    // Remove original unencrypted file for security
    fs.unlinkSync(req.file.path);
    
    finalFilePath = encryptedPath;
    encryptedHash = fileHash;
    console.log('✅ Model file encrypted and secured successfully');
    console.log('🔐 Encryption hash:', fileHash.substring(0, 16) + '...');

    // Create new model entry
    const newModel = {
      id: modelId,
      name,
      description,
      framework: framework || 'Unknown',
      accuracy: accuracy || 'N/A',
      priceAlgo: parseFloat(price),
      category: category || 'Other',
      creator,
      filePath: finalFilePath,
      encryptedHash,
      encrypted: true, // All models are now encrypted by default
      fileSize: req.file.size,
      originalFilename: req.file.originalname,
      createdAt: new Date(),
      downloads: 0,
      rating: 0
    };

    // Add to mock models array (in real app, this would go to database)
    mockModels.push(newModel);
    
    // Record the model as published by this user
    const currentPublished = userPublishedModels.get(creator) || [];
    currentPublished.push(modelId);
    userPublishedModels.set(creator, currentPublished);

    console.log('✅ Model published successfully:', {
      modelId,
      name,
      encrypted: true,
      encryptedHash,
      security: 'AES-256-GCM encryption applied'
    });

    res.json({
      success: true,
      modelId,
      encryptedHash,
      message: 'Model uploaded and encrypted successfully'
    });

  } catch (error) {
    console.error('❌ Error publishing model:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Failed to publish model: ' + error.message 
    });
  }
});

// Purchase model
app.post('/api/models/purchase', (req, res) => {
  console.log('💳 POST /api/models/purchase - Processing purchase');
  console.log('Request body:', req.body);
  
  const { modelId, buyerAddress } = req.body;
  
  if (!modelId || !buyerAddress) {
    return res.status(400).json({ error: 'Missing modelId or buyerAddress' });
  }
  
  // Simulate purchase processing
  setTimeout(() => {
    // Record the purchase
    const currentPurchases = userPurchases.get(buyerAddress) || [];
    if (!currentPurchases.includes(modelId)) {
      currentPurchases.push(modelId);
      userPurchases.set(buyerAddress, currentPurchases);
    }
    
    const result = {
      success: true,
      transactionId: `purchase_${Date.now()}`,
      modelId,
      buyerAddress
    };
    console.log('✅ Purchase successful and recorded:', result);
    res.json(result);
  }, 1500);
});

// Download model
app.post('/api/models/download', (req, res) => {
  console.log('⬇️ POST /api/models/download - Processing download');
  console.log('Request body:', req.body);
  
  const { modelId, buyerAddress } = req.body;
  
  if (!modelId || !buyerAddress) {
    return res.status(400).json({ error: 'Missing modelId or buyerAddress' });
  }
  
  // Check if user has purchased this model
  const userPurchasedModels = userPurchases.get(buyerAddress) || [];
  if (!userPurchasedModels.includes(modelId)) {
    return res.status(403).json({ error: 'Model not purchased or access denied' });
  }
  
  // Find the model
  const model = mockModels.find(m => m.id === modelId);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }
  
  // Check if file exists
  const filePath = model.filePath || '/Users/vg/Downloads/dummy_model.pth';
  
  if (fs.existsSync(filePath)) {
    console.log(`✅ Serving file: ${filePath}`);
    const fileName = path.basename(filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.download(filePath, fileName);
  } else {
    console.log('⚠️ File not found, serving dummy data');
    // Fallback to mock data if file doesn't exist
    const mockData = Buffer.from(`Dummy model file for ${model.name}\nFramework: ${model.framework}\nCreated: ${model.createdAt}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${model.name.replace(/\s+/g, '_')}.pth"`);
    res.send(mockData);
  }
});

// Blockchain status
app.get('/api/blockchain/status', (req, res) => {
  console.log('⛓️ GET /api/blockchain/status - Checking blockchain status');
  res.json({
    status: 'connected',
    network: 'testnet',
    lastBlock: 12345678,
    nodeHealth: 'healthy'
  });
});

// Account info
app.get('/api/blockchain/account/:address', (req, res) => {
  console.log(`⛓️ GET /api/blockchain/account/${req.params.address} - Fetching account info`);
  res.json({
    address: req.params.address,
    balance: 1000.5,
    transactions: 42
  });
});

// Transaction status
app.get('/api/blockchain/transaction/:id', (req, res) => {
  console.log(`⛓️ GET /api/blockchain/transaction/${req.params.id} - Fetching transaction status`);
  res.json({
    id: req.params.id,
    status: 'confirmed',
    confirmations: 6,
    timestamp: new Date().toISOString()
  });
});

// In-memory storage for user purchases and published models
let userPurchases = new Map(); // address -> [model_ids]
let userPublishedModels = new Map(); // address -> [model_ids]
let addressToNameMap = new Map(); // address -> human_readable_name

// Initialize with some demo data
userPurchases.set('I5LZ6P7NODDC3V275WU2RSAHN6OT4PBC2WDDMBYU6Q35JBUXA4FQSVLX4I', ['1', '2']);
userPublishedModels.set('I5LZ6P7NODDC3V275WU2RSAHN6OT4PBC2WDDMBYU6Q35JBUXA4FQSVLX4I', []);
addressToNameMap.set('I5LZ6P7NODDC3V275WU2RSAHN6OT4PBC2WDDMBYU6Q35JBUXA4FQSVLX4I', 'vishvag.desci');

// Function to resolve address to human-readable name
const resolveAddressToName = async (address) => {
  // Check local cache first
  if (addressToNameMap.has(address)) {
    return addressToNameMap.get(address);
  }
  
  // Set up common address mappings
  const commonMappings = {
    'I5LZ6P7NODDC3V275WU2RSAHN6OT4PBC2WDDMBYU6Q35JBUXA4FQSVLX4I': 'vishvag.desci',
    'TESTDEMOWALLET123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890': 'testdemo.desci',
    'ALGO123456789ABCDEF...': 'sarahchen.desci',
    'ALGO456789ABCDEF123...': 'medailabs.desci', 
    'ALGO789ABCDEF123456...': 'quantlab.desci'
  };
  
  // Check if we have a predefined mapping
  if (commonMappings[address]) {
    const name = commonMappings[address];
    addressToNameMap.set(address, name);
    return name;
  }
  
  // Try to resolve from name registry API
  try {
    const response = await fetch('http://localhost:3002/api/names/marketplace');
    const data = await response.json();
    
    if (data.success) {
      // Look for a name with this address as owner
      for (const nameEntry of data.names) {
        if (nameEntry.owner === address) {
          addressToNameMap.set(address, nameEntry.name);
          return nameEntry.name;
        }
      }
    }
  } catch (error) {
    console.log('Could not resolve address to name:', error.message);
  }
  
  // Fallback: create a properly shortened version of the address
  if (address && address.length > 16) {
    const shortAddress = address.substring(0, 8) + '...' + address.substring(address.length - 8);
    return shortAddress;
  }
  
  return address || 'Unknown';
};

// User purchases
app.get('/api/models/purchases/:address', (req, res) => {
  console.log(`👤 GET /api/models/purchases/${req.params.address} - Fetching user purchases`);
  const address = req.params.address;
  const purchasedModelIds = userPurchases.get(address) || [];
  const purchasedModels = mockModels.filter(model => purchasedModelIds.includes(model.id));
  res.json(purchasedModels);
});

// User models
app.get('/api/models/user/:address', (req, res) => {
  console.log(`👤 GET /api/models/user/${req.params.address} - Fetching user's published models`);
  const address = req.params.address;
  const publishedModelIds = userPublishedModels.get(address) || [];
  const publishedModels = mockModels.filter(model => publishedModelIds.includes(model.id));
  
  // Also include any models where the creator address matches
  const authorModels = mockModels.filter(model => model.creator === address || model.authorAddress === address);
  
  // Combine and deduplicate
  const allUserModels = [...new Set([...publishedModels, ...authorModels])];
  res.json(allUserModels);
});

// Get human-readable name for address
app.get('/api/names/resolve-address/:address', async (req, res) => {
  console.log(`🏷️ GET /api/names/resolve-address/${req.params.address} - Resolving address to name`);
  const address = req.params.address;
  
  try {
    const humanName = await resolveAddressToName(address);
    res.json({
      success: true,
      address: address,
      name: humanName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resolve address to name'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 DeSciFi Test Backend Server started');
  console.log(`📊 Server running on: http://localhost:${PORT}`);
  console.log(`💊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET    /health');
  console.log('  GET    /api/models');
  console.log('  GET    /api/models/:id');
  console.log('  POST   /api/models/publish');
  console.log('  POST   /api/models/purchase');
  console.log('  POST   /api/models/download');
  console.log('  GET    /api/blockchain/status');
  console.log('  GET    /api/blockchain/account/:address');
  console.log('  GET    /api/blockchain/transaction/:id');
  console.log('');
  console.log('🎯 Frontend should be running on: http://localhost:3000');
  console.log('');
});

module.exports = app;