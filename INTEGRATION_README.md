# DeSciChain - Integrated ML Models Marketplace

A fully functional, integrated ML Models Marketplace built on Algorand blockchain with IPFS storage, encryption, and watermarking. This application combines the existing crypto marketplace UI with your backend services to create a working ML model trading platform.

## 🎯 What's Been Built

### **Complete Integration**
- ✅ **Adapted UI**: Transformed crypto marketplace into ML models marketplace
- ✅ **Functional Frontend**: React-based UI with wallet integration
- ✅ **Backend Integration**: Connected to your Algorand/IPFS backend
- ✅ **Smart Contracts**: PyTeal contracts for model registry and escrow
- ✅ **End-to-End Workflows**: Publish → Purchase → Download flow
- ✅ **Production Ready**: Error handling, loading states, responsive design

### **Key Features**
- 🔗 **Pera Wallet Integration**: Connect Algorand wallets
- 📦 **Model Publishing**: Upload, encrypt, watermark, and register models
- 💰 **Secure Payments**: Escrow-based payment system
- 🔐 **IP Protection**: Watermarking and encryption
- 📱 **Responsive Design**: Works on desktop and mobile
- 🌙 **Dark/Light Mode**: Theme switching
- ⚡ **Real-time Updates**: Live transaction status

## 🚀 Quick Start

### **1. Run Setup Script**
```bash
./setup.sh
```

### **2. Configure Environment**
Edit the generated `.env` files with your credentials:

**Backend (.env):**
```env
ALGOD_TOKEN=your_algorand_token
CREATOR_MNEMONIC="your mnemonic phrase"
DATABASE_URL=postgresql://user:pass@localhost:5432/desci_chain
```

**Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ALGOD_TOKEN=your_algorand_token
```

### **3. Deploy Smart Contracts**
```bash
export ALGOD_TOKEN="your_token"
export CREATOR_MNEMONIC="your mnemonic phrase"
./deploy-contracts.sh
```

### **4. Start the Application**
```bash
./start-app.sh
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

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
│   ├── routes/               # API routes
│   ├── database/             # Database schema
│   └── index.ts              # Main server file
├── frontend/                  # Frontend (React/JavaScript)
│   ├── js/                   # JavaScript components
│   ├── styles/               # CSS styles
│   ├── img/                  # Images and assets
│   ├── index.html            # Main HTML file
│   └── server.js             # Frontend server
├── setup.sh                  # Setup script
├── deploy-contracts.sh       # Contract deployment
└── start-app.sh              # Application startup
```

## 🔧 How It Works

### **1. Model Publishing Flow**
1. User connects Pera Wallet
2. Uploads ML model file (.pkl, .h5, .pt, etc.)
3. Fills in model metadata (name, description, framework, etc.)
4. Sets license terms
5. System watermarks and encrypts the model
6. Uploads to IPFS
7. Registers on Algorand blockchain
8. Model appears in marketplace

### **2. Model Purchase Flow**
1. User browses marketplace
2. Selects model to purchase
3. Confirms payment in wallet
4. Payment goes to escrow contract
5. Publisher receives notification
6. Publisher releases encryption key
7. Buyer can download and decrypt model

### **3. Model Download Flow**
1. User goes to "My Purchases"
2. Enters decryption key
3. System verifies purchase on blockchain
4. Downloads encrypted model from IPFS
5. Decrypts model with provided key
6. Verifies watermark for authenticity

## 🛠️ Technical Details

### **Frontend Architecture**
- **Vanilla React**: No build step required
- **Component-based**: Modular, reusable components
- **State Management**: React Context for global state
- **API Integration**: Axios for backend communication
- **Wallet Integration**: Pera Wallet Connect
- **Responsive Design**: Mobile-first approach

### **Backend Services**
- **Blockchain Service**: Algorand integration
- **IPFS Service**: Decentralized file storage
- **Encryption Service**: AES-256-GCM encryption
- **Watermark Service**: Model watermarking
- **Escrow Service**: Payment management

### **Smart Contracts**
- **ModelRegistry**: Stores model metadata on-chain
- **Escrow**: Manages payment escrow
- **PyTeal**: Algorand's smart contract language

## 🎨 UI Components

### **Main Components**
- **Header**: Navigation and wallet connection
- **Hero**: Landing section with call-to-action
- **ModelMarketplace**: Browse and search models
- **ModelPublisher**: Publish new models
- **ModelDownloader**: Download purchased models
- **MyModels**: View published models

### **Features**
- **Dark/Light Mode**: Theme switching
- **Responsive Design**: Works on all devices
- **Loading States**: User feedback during operations
- **Error Handling**: Graceful error management
- **Modal Dialogs**: Purchase confirmation, etc.

## 🔒 Security Features

### **Model Protection**
- **Watermarking**: Ownership verification
- **Encryption**: AES-256-GCM encryption
- **IPFS Storage**: Decentralized, immutable storage
- **Blockchain Verification**: On-chain purchase records

### **Payment Security**
- **Escrow System**: Funds held until delivery
- **Smart Contracts**: Automated payment processing
- **Wallet Integration**: Secure transaction signing

## 📊 API Endpoints

### **Models API**
- `POST /api/models/publish` - Publish new model
- `GET /api/models` - List all models
- `GET /api/models/:id` - Get model details
- `POST /api/models/purchase` - Purchase model
- `GET /api/models/download` - Download model

### **Blockchain API**
- `GET /api/blockchain/status` - Blockchain status
- `GET /api/blockchain/transaction/:id` - Transaction status
- `GET /api/blockchain/account/:address` - Account info

## 🚀 Deployment

### **Development**
```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm start
```

### **Production**
```bash
# Build and start backend
cd backend && npm run build && npm start

# Serve frontend
cd frontend && npm start
```

## 🧪 Testing

### **Contract Tests**
```bash
cd contracts
python test_contracts.py
```

### **Backend Tests**
```bash
cd backend
npm test
```

### **Integration Tests**
```bash
cd backend
npm run test:integration
```

## 🔧 Configuration

### **Environment Variables**
- `ALGOD_TOKEN`: Algorand API token
- `CREATOR_MNEMONIC`: Wallet mnemonic for deployment
- `DATABASE_URL`: PostgreSQL connection string
- `IPFS_HOST`: IPFS node host
- `JWT_SECRET`: JWT signing secret

### **Smart Contract Configuration**
- `MODEL_REGISTRY_APP_ID`: Deployed contract ID
- `ESCROW_APP_ID`: Deployed contract ID

## 🐛 Troubleshooting

### **Common Issues**

1. **Wallet Connection Failed**
   - Ensure Pera Wallet is installed
   - Check network connection
   - Verify wallet is on TestNet

2. **Contract Deployment Failed**
   - Check ALGOD_TOKEN and CREATOR_MNEMONIC
   - Ensure sufficient ALGO balance
   - Verify TestNet connectivity

3. **Model Upload Failed**
   - Check IPFS node is running
   - Verify file size limits
   - Check backend logs

4. **Payment Failed**
   - Ensure sufficient ALGO balance
   - Check transaction status
   - Verify escrow contract

### **Debug Mode**
Set `NODE_ENV=development` for detailed logging.

## 📈 Performance

### **Optimizations**
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Compressed assets
- **Caching**: API response caching
- **Bundle Splitting**: Smaller initial load

### **Monitoring**
- **Error Tracking**: Console error logging
- **Performance Metrics**: Load time tracking
- **User Analytics**: Usage statistics

## 🔮 Future Enhancements

### **Planned Features**
- [ ] Model versioning system
- [ ] Advanced search and filtering
- [ ] Model reviews and ratings
- [ ] Reputation system
- [ ] Mobile app
- [ ] Multi-chain support

### **Technical Improvements**
- [ ] GraphQL API
- [ ] Real-time notifications
- [ ] Advanced caching
- [ ] CDN integration
- [ ] Microservices architecture

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: See README.md
- **Issues**: GitHub Issues
- **Discord**: DeSciChain Community

---

**🎉 Your DeSciChain ML Models Marketplace is now fully integrated and ready to use!**

The application combines the best of both worlds:
- **Beautiful UI** from the crypto marketplace
- **Robust Backend** with Algorand and IPFS
- **Complete Functionality** for ML model trading

Start by running `./setup.sh` and follow the quick start guide above!
