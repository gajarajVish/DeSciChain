# DeSciChain - Decentralized ML Models Marketplace

A blockchain-based marketplace for machine learning models, built on Algorand and IPFS, enabling researchers to monetize their ML models while ensuring intellectual property protection through watermarking and encryption.

## 🚀 Features

### Core Functionality
- **Model Publishing**: Upload, encrypt, and watermark ML models
- **Secure Transactions**: Algorand blockchain-based payments
- **IPFS Storage**: Decentralized file storage
- **Watermarking**: Ownership verification and protection
- **Escrow System**: Secure payment processing
- **Wallet Integration**: Pera Wallet support

### Technical Features
- **Smart Contracts**: PyTeal-based Algorand contracts
- **Encryption**: AES-256-GCM model protection
- **Watermarking**: Multiple watermarking strategies
- **API**: RESTful backend with TypeScript
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL with comprehensive schema

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Blockchain    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Algorand)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   IPFS Storage  │
                       │   (Decentralized)│
                       └─────────────────┘
```

## 📁 Project Structure

```
DeSciChain/
├── contracts/                 # Smart Contracts (PyTeal)
│   ├── ModelRegistry.py      # Model registration contract
│   ├── Escrow.py             # Payment escrow contract
│   ├── deployContracts.py    # Deployment script
│   └── test_contracts.py     # Contract tests
├── backend/                   # Backend API (Node.js/TypeScript)
│   ├── services/             # Business logic services
│   │   ├── blockchain.service.ts
│   │   ├── ipfs.service.ts
│   │   ├── encryption.service.ts
│   │   ├── watermark.service.ts
│   │   └── escrow.service.ts
│   ├── routes/               # API routes
│   │   ├── models.route.ts
│   │   └── blockchain.route.ts
│   ├── database/             # Database schema
│   │   └── schema.sql
│   └── package.json
├── frontend/                  # Frontend (React/TypeScript)
│   ├── components/           # React components
│   │   ├── WalletConnect.tsx
│   │   ├── ModelMarketplace.tsx
│   │   ├── ModelPublisher.tsx
│   │   ├── PurchaseFlow.tsx
│   │   └── ModelDownloader.tsx
│   ├── App.tsx              # Main app component
│   ├── App.css              # Styles
│   └── package.json
└── README.md
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+
- Python 3.8+
- PostgreSQL 13+
- IPFS node
- Algorand TestNet account

### 1. Clone Repository

```bash
git clone https://github.com/your-org/DeSciChain.git
cd DeSciChain
```

### 2. Backend Setup

```bash
cd backend
npm install

# Install Python dependencies for contracts
cd ../contracts
pip install -r requirements.txt

# Deploy smart contracts
python deployContracts.py

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm start
```

### 4. IPFS Setup

```bash
# Install IPFS
npm install -g ipfs

# Initialize IPFS node
ipfs init

# Start IPFS daemon
ipfs daemon
```

## 🔧 Configuration

### Environment Variables

Create `.env` file in the backend directory:

```env
# Algorand Configuration
ALGOD_TOKEN=your-algod-token
ALGOD_SERVER=https://testnet-api.algonode.cloud
MODEL_REGISTRY_APP_ID=your-app-id
ESCROW_APP_ID=your-app-id

# IPFS Configuration
IPFS_HOST=localhost
IPFS_PORT=5001

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/desci_chain

# JWT Secret
JWT_SECRET=your-jwt-secret
```

## 🚀 Usage

### 1. Connect Wallet

1. Install Pera Wallet browser extension
2. Create or import an Algorand wallet
3. Connect to TestNet
4. Click "Connect Wallet" in the app

### 2. Publish Model

1. Navigate to "Publish" page
2. Upload your ML model file
3. Fill in model metadata
4. Set license terms
5. Click "Publish Model"

### 3. Purchase Model

1. Browse models in "Marketplace"
2. Click "Purchase" on desired model
3. Confirm transaction in wallet
4. Wait for payment confirmation
5. Download model with decryption key

### 4. Download Model

1. Go to "My Purchases"
2. Enter decryption key
3. Click "Download Model"
4. Decrypt model file

## 🔒 Security Features

### Encryption
- AES-256-GCM encryption for model files
- PBKDF2 key derivation
- Secure key generation and storage

### Watermarking
- Multiple watermarking strategies
- Steganographic embedding
- Ownership verification

### Blockchain Security
- Algorand Pure Proof of Stake
- Smart contract-based escrow
- Immutable transaction records

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

### Contract Tests

```bash
cd contracts
python test_contracts.py
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 📊 API Documentation

### Models API

- `POST /api/models/publish` - Publish new model
- `GET /api/models` - List all models
- `GET /api/models/:id` - Get model details
- `POST /api/models/purchase` - Purchase model
- `GET /api/models/download` - Download model

### Blockchain API

- `GET /api/blockchain/status` - Blockchain status
- `GET /api/blockchain/transaction/:id` - Transaction status
- `GET /api/blockchain/account/:address` - Account info

## 🚀 Deployment

### Production Deployment

1. **Deploy Smart Contracts**
   ```bash
   cd contracts
   python deployContracts.py
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   npm run build
   npm start
   ```

3. **Deploy Frontend**
   ```bash
   cd frontend
   npm run build
   # Deploy dist/ folder to your hosting service
   ```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Algorand Foundation for blockchain infrastructure
- IPFS for decentralized storage
- Pera Wallet for wallet integration
- React and TypeScript communities

## 📞 Support

- Documentation: [docs.desci-chain.com](https://docs.desci-chain.com)
- Issues: [GitHub Issues](https://github.com/your-org/DeSciChain/issues)
- Discord: [DeSciChain Community](https://discord.gg/desci-chain)

## 🔮 Roadmap

- [ ] MainNet deployment
- [ ] Advanced watermarking techniques
- [ ] Model versioning system
- [ ] Reputation system
- [ ] Mobile app
- [ ] API rate limiting
- [ ] Advanced analytics
- [ ] Multi-chain support

---

**Built with ❤️ by the DeSciChain Team**