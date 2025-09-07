/**
 * Simple test server for DeSciChain integration testing
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
    priceAlgo: 250,
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
    ipfsHash: "QmExample1Hash",
    watermarkHash: "WMHash1",
    createdAt: new Date(),
    accuracy: 95.2
  },
  {
    id: '2',
    name: "Computer Vision Model for Medical Imaging",
    description: "State-of-the-art CNN for medical image analysis with 98.5% accuracy in detecting anomalies in X-rays and MRI scans.",
    priceAlgo: 180,
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
    ipfsHash: "QmExample2Hash",
    watermarkHash: "WMHash2",
    createdAt: new Date(),
    accuracy: 98.5
  },
  {
    id: '3',
    name: "Predictive Analytics for Financial Markets",
    description: "Machine learning model for stock price prediction using advanced time series analysis and sentiment data integration.",
    priceAlgo: 320,
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
    ipfsHash: "QmExample3Hash",
    watermarkHash: "WMHash3",
    createdAt: new Date(),
    accuracy: 87.3
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'DeSciChain Test Backend is running'
  });
});

// Get all models
app.get('/api/models', (req, res) => {
  console.log('📊 GET /api/models - Fetching all models');
  res.json(mockModels);
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
app.post('/api/models/prepare-publish', (req, res) => {
  console.log('🔍 POST /api/models/prepare-publish - Preparing model publication');
  console.log('Request body:', req.body);
  
  const { name, description, price } = req.body;
  
  // Basic validation
  if (!name || !description || !price) {
    return res.status(400).json({ 
      error: 'Missing required fields: name, description, price' 
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
  
  // Simulate purchase processing
  setTimeout(() => {
    const result = {
      success: true,
      transactionId: `purchase_${Date.now()}`
    };
    console.log('✅ Purchase successful:', result);
    res.json(result);
  }, 1500);
});

// Download model
app.post('/api/models/download', (req, res) => {
  console.log('⬇️ POST /api/models/download - Processing download');
  console.log('Request body:', req.body);
  
  // Simulate file download (return mock zip file)
  const mockZipData = Buffer.from('Mock model file data');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="model.zip"');
  res.send(mockZipData);
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

// User purchases
app.get('/api/models/purchases/:address', (req, res) => {
  console.log(`👤 GET /api/models/purchases/${req.params.address} - Fetching user purchases`);
  res.json([mockModels[0]]); // Return first model as purchased
});

// User models
app.get('/api/models/user/:address', (req, res) => {
  console.log(`👤 GET /api/models/user/${req.params.address} - Fetching user's published models`);
  res.json([mockModels[1]]); // Return second model as published by user
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 DeSciChain Test Backend Server started');
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