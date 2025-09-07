# DeSciFi - Decentralized ML Models Marketplace
https://www.canva.com/design/DAGyRO3y_Js/SOR9WB3LRumuls-AN3XCEA/edit?utm_content=DAGyRO3y_Js&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton 
A production-ready, blockchain-based marketplace for machine learning models built on Algorand with IPFS storage, featuring advanced cryptography, multi-wallet support, and comprehensive model protection through watermarking and encryption.

<img width="1030" height="901" alt="image" src="https://github.com/user-attachments/assets/97f3b797-ced8-4e91-bc30-2d36fd83c516" />

<img width="933" height="735" alt="image" src="https://github.com/user-attachments/assets/ec2a0a1d-d40e-4511-8560-ee2260059563" />

<img width="933" height="983" alt="image" src="https://github.com/user-attachments/assets/93622990-0935-4b09-a842-6c73f865b297" />

Link to Video Demo:

https://www.loom.com/share/491d481ecff342e8b1806d478e45651d?sid=104974f8-3217-40c3-a865-0e57b3505ae4

## 🚀 Overview

DeSciFi enables researchers and data scientists to securely monetize their ML models while ensuring intellectual property protection. Built with modern web technologies and leveraging Algorand's blockchain infrastructure for transparent, secure transactions.

### **Key Features**

- **🔗 Multi-Wallet Support**: Pera, Defly, Exodus, and AlgoSigner integration
- **🔐 Advanced Security**: Multi-layer encryption (AES-256-GCM + RSA hybrid)
- **💧 Watermarking**: Ownership verification and IP protection
- **📦 IPFS Storage**: Decentralized file storage for model assets
- **💰 Escrow System**: Smart contract-based secure payments
- **🎨 Modern UI**: Responsive design with dark/light themes
- **⚡ Real-time Updates**: Live blockchain transaction monitoring

## 🏗️ Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Frontend          │    │   Backend           │    │   Blockchain        │
│   (Vanilla JS)      │◄──►│   (Node.js/TS)     │◄──►│   (Algorand)        │
│   - Multi-wallet    │    │   - API Routes      │    │   - Smart Contracts │
│   - Model UI        │    │   - Encryption      │    │   - Escrow System   │
│   - Theme System    │    │   - IPFS Client     │    │   - Model Registry  │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                      │                           │
                                      ▼                           ▼
                             ┌─────────────────────┐    ┌─────────────────────┐
                             │   PostgreSQL        │    │   IPFS Network      │
                             │   - Model Metadata  │    │   - Model Files     │
                             │   - Purchase History│    │   - Encrypted Data  │
                             │   - User Analytics  │    │   - Decentralized   │
                             └─────────────────────┘    └─────────────────────┘
```

## 📁 Project Structure

```
DeSciFi/
├── contracts/                      # Smart Contracts (PyTeal)
│   ├── ModelRegistry.py           # Model registration contract
│   ├── Escrow.py                  # Payment escrow contract
│   ├── NameRegistry.py            # Name resolution contract
│   ├── deployContracts.py         # Deployment automation
│   ├── test_contracts.py          # Contract unit tests
│   └── requirements.txt           # Python dependencies
├── backend/                        # Backend API (Node.js/TypeScript)
│   ├── services/                  # Business logic services
│   │   ├── blockchain.service.ts  # Algorand integration
│   │   ├── ipfs.service.ts        # IPFS file operations
│   │   ├── encryption.service.ts  # Multi-layer cryptography
│   │   ├── watermark.service.ts   # Model watermarking
│   │   ├── database.service.ts    # PostgreSQL operations
│   │   └── escrow.service.ts      # Escrow monitoring
│   ├── routes/                    # API endpoints
│   │   ├── models.route.ts        # Model CRUD operations
│   │   ├── blockchain.route.ts    # Blockchain status
│   │   └── nameRegistry.route.ts  # Name resolution
│   ├── database/                  # Database management
│   │   ├── schema.sql            # Complete database schema
│   │   └── migrate.js            # Migration script
│   ├── tests/                     # Test suites
│   │   └── integration.test.ts   # End-to-end tests
│   ├── index.ts                   # Main server entry
│   └── package.json              # Dependencies & scripts
├── frontend/                       # Frontend (Vanilla JavaScript)
│   ├── js/                        # Application logic
│   │   ├── app.js                # Main application class
│   │   ├── services/             # Frontend services
│   │   │   ├── api.js           # Backend API client
│   │   │   ├── blockchain.js    # Multi-wallet integration
│   │   │   └── nameRegistry.js  # Name resolution
│   │   ├── components/           # UI components
│   │   │   └── NameRegistry.js  # Name registry UI
│   │   └── utils/               # Utility functions
│   │       └── helpers.js       # Common helpers
│   ├── styles/                   # Stylesheets
│   │   ├── app.css              # Main application styles
│   │   ├── lightMode.css        # Light theme
│   │   └── darkMode.css         # Dark theme
│   ├── img/                      # Static assets
│   ├── index.html               # Main HTML file
│   ├── server.js                # Static file server
│   └── package.json             # Frontend dependencies
├── deploy-contracts.sh            # Contract deployment script
├── setup.sh                      # Initial project setup
├── INTEGRATION_README.md          # Detailed integration guide
└── README.md                     # This file
```

## 🛠️ Technology Stack

### **Blockchain & Crypto**
- **Algorand**: Layer-1 blockchain for fast, secure transactions
- **PyTeal**: Smart contract development framework
- **Multi-Wallet**: Pera, Defly, Exodus, AlgoSigner support
- **AES-256-GCM**: Symmetric encryption for model files
- **RSA Hybrid**: Public key encryption for key exchange
- **PBKDF2/scrypt/argon2**: Key derivation functions

### **Backend**
- **Node.js + TypeScript**: Server runtime and language
- **Express.js**: Web application framework
- **PostgreSQL**: Primary database with comprehensive schema
- **IPFS**: Decentralized file storage
- **Multer**: File upload handling
- **Helmet + CORS**: Security middleware

### **Frontend**
- **Vanilla JavaScript**: Modern ES6+ without framework dependencies
- **AlgoSDK**: Algorand JavaScript SDK
- **Font Awesome**: Icon library
- **Responsive CSS**: Mobile-first design
- **Theme System**: Dark/light mode support

### **Development & Deployment**
- **Jest**: Testing framework
- **ESLint + Prettier**: Code quality tools
- **Docker**: Containerization support
- **GitHub Actions**: CI/CD pipeline ready

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ and npm
- Python 3.8+ with pip
- PostgreSQL 13+
- IPFS node (optional, uses public gateway by default)
- Algorand TestNet account with ALGO

### **1. Initial Setup**
```bash
# Clone and setup
git clone <your-repo-url>
cd DeSciFi

# Run automated setup
chmod +x setup.sh
./setup.sh
```

### **2. Environment Configuration**

**Backend Environment (`backend/.env`):**
```env
# Algorand Configuration
ALGOD_TOKEN=your-algod-token
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_PORT=443
MODEL_REGISTRY_APP_ID=your-deployed-app-id
ESCROW_APP_ID=your-deployed-escrow-id

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/descichain

# Security
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key

# IPFS (optional)
IPFS_HOST=localhost
IPFS_PORT=5001
```

**Contracts Environment (`contracts/.env`):**
```env
# Deployment Account
CREATOR_MNEMONIC="your 25-word mnemonic phrase here"
ALGOD_TOKEN=your-algod-token
ALGOD_SERVER=https://testnet-api.algonode.cloud
NETWORK=testnet
```

### **3. Database Setup**
```bash
# Create database
createdb descichain

# Run migrations
cd backend
npm run migrate
```

### **4. Smart Contract Deployment**
```bash
# Deploy contracts to TestNet
cd contracts
python deployContracts.py

# Update backend .env with deployed app IDs
```

### **5. Start Services**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start

# Terminal 3: IPFS (optional)
ipfs daemon
```

### **6. Access Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/health

## 💡 Usage

### **Connect Wallet**
1. Click "Connect Wallet" in the header
2. Choose from Pera, Defly, Exodus, or AlgoSigner
3. Approve connection in your wallet

### **Publish Model**
1. Navigate to "Publish" tab
2. Upload your ML model file (.pkl, .pth, .h5, etc.)
3. Fill in model metadata (name, description, framework)
4. Set license terms and price
5. Sign the transaction to publish

### **Purchase Model**
1. Browse models in "Marketplace" tab
2. Click "Purchase" on desired model
3. Review model details and price
4. Sign payment transaction
5. Wait for escrow confirmation

### **Download Model**
1. Go to "My Models" tab to see purchases
2. Click "Download" on purchased model
3. Model is automatically decrypted
4. Save to your local machine

## 🔒 Security Features

### **Multi-Layer Encryption**
- **Watermarking**: Invisible ownership markers embedded in models
- **AES-256-GCM**: Industry-standard symmetric encryption
- **RSA Hybrid**: Secure key exchange using public-key cryptography
- **HMAC**: Data integrity verification
- **Secure Key Derivation**: PBKDF2, scrypt, and argon2 support

### **Blockchain Security**
- **Smart Contracts**: Immutable business logic on Algorand
- **Escrow System**: Funds locked until model delivery
- **Transaction Verification**: Cryptographic proof of payments
- **No Private Keys**: Client-side signing only

### **API Security**
- **Rate Limiting**: DDoS protection
- **CORS**: Cross-origin request security
- **Helmet**: Security headers
- **Input Validation**: Comprehensive request validation

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema with 8 main tables:

- **`published_models`**: Model registry with metadata and encryption info
- **`model_purchases`**: Purchase history and status tracking
- **`model_metadata`**: Extended model information and performance metrics
- **`escrow_states`**: Blockchain escrow state persistence
- **`model_access_keys`**: Encrypted key storage for purchased models
- **`labs`**: Research lab profiles and verification
- **`model_reviews`**: User ratings and feedback
- **`model_downloads`**: Analytics and usage tracking

## 🧪 Testing

### **Backend Tests**
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### **Smart Contract Tests**
```bash
cd contracts
python test_contracts.py   # PyTeal contract tests
```

### **Integration Tests**
```bash
cd backend
npm run test:integration   # End-to-end workflow tests
```

## 📚 API Documentation

### **Models API**
- `POST /api/models/prepare-publish` - Prepare model publishing transaction
- `POST /api/models/confirm-publish` - Confirm published model
- `GET /api/models` - List all published models
- `GET /api/models/:id` - Get model details
- `POST /api/models/prepare-purchase` - Prepare purchase transaction
- `POST /api/models/confirm-purchase` - Confirm model purchase
- `GET /api/models/download` - Download purchased model

### **Blockchain API**
- `GET /api/blockchain/status` - Network status
- `GET /api/blockchain/transaction/:id` - Transaction details
- `GET /api/blockchain/account/:address` - Account information

### **Name Registry API**
- `POST /api/name-registry/register` - Register name
- `GET /api/name-registry/resolve/:name` - Resolve name to address
- `GET /api/name-registry/reverse/:address` - Reverse lookup

## 🚀 Production Deployment

### **Docker Deployment**
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### **Manual Deployment**
1. **Deploy Smart Contracts to MainNet**
2. **Configure Production Environment**
3. **Setup PostgreSQL Database**
4. **Deploy Backend to Cloud Service**
5. **Build and Deploy Frontend**
6. **Configure HTTPS and Domain**

## 🔧 Configuration Options

### **Encryption Settings**
- Key derivation algorithms (PBKDF2, scrypt, argon2)
- Encryption modes (AES-256-GCM, ChaCha20-Poly1305)
- Watermark strategies (steganographic, metadata-based)

### **Blockchain Settings**
- Network selection (TestNet, MainNet)
- Transaction fees and timeouts
- Smart contract parameters

### **Storage Options**
- IPFS node configuration
- Local storage fallbacks
- CDN integration for assets

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### **Development Guidelines**
- Follow TypeScript/JavaScript best practices
- Write comprehensive tests
- Update documentation
- Ensure security best practices

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Algorand Foundation** for blockchain infrastructure
- **IPFS** for decentralized storage
- **ENS Domains** naming inspiration
- **Pera Wallet** and other wallet providers
- **Open source community** for tools and libraries


## 🗺️ Roadmap

### **Phase 1: Core Platform** ✅
- [x] Smart contract development
- [x] Multi-wallet integration
- [x] Basic marketplace functionality
- [x] Encryption and watermarking

### **Phase 2: Enhanced Features** 🚧
- [ ] Advanced analytics dashboard
- [ ] Model versioning system
- [ ] Reputation and rating system
- [ ] Mobile application

### **Phase 3: Ecosystem Growth** 📋
- [ ] MainNet deployment
- [ ] Multi-chain support
- [ ] API marketplace
- [ ] Enterprise features

### **Phase 4: Advanced Capabilities** 🔮
- [ ] AI-powered model recommendations
- [ ] Automated testing frameworks
- [ ] Federated learning support
- [ ] Research collaboration tools

---

*Empowering researchers to monetize their AI innovations through blockchain technology*
