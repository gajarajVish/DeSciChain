#!/bin/bash

# DeSciFi Setup Script
# Sets up the complete ML Models Marketplace application

set -e

echo "🚀 Setting up DeSciFi ML Models Marketplace..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install Python 3.8+ from https://python.org/"
        exit 1
    fi
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL is not installed. You'll need to install it for the database."
    fi
    
    print_success "Requirements check completed"
}

# Install backend dependencies
setup_backend() {
    print_status "Setting up backend..."
    
    cd backend
    
    # Install Node.js dependencies
    print_status "Installing backend dependencies..."
    npm install
    
    # Install Python dependencies for contracts
    print_status "Installing Python dependencies for smart contracts..."
    cd ../contracts
    pip3 install -r requirements.txt
    
    cd ..
    print_success "Backend setup completed"
}

# Install frontend dependencies
setup_frontend() {
    print_status "Setting up frontend..."
    
    cd frontend
    npm install
    cd ..
    
    print_success "Frontend setup completed"
}

# Create environment files
setup_environment() {
    print_status "Setting up environment configuration..."
    
    # Backend .env
    if [ ! -f backend/.env ]; then
        cat > backend/.env << EOF
# Algorand Configuration
ALGOD_TOKEN=
ALGOD_SERVER=https://testnet-api.algonode.cloud
INDEXER_TOKEN=
INDEXER_SERVER=https://testnet-idx.algonode.cloud

# Smart Contract App IDs (set after deployment)
MODEL_REGISTRY_APP_ID=0
ESCROW_APP_ID=0

# IPFS Configuration
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/desci_chain
DB_HOST=localhost
DB_PORT=5432
DB_NAME=desci_chain
DB_USER=username
DB_PASSWORD=password

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads

# Encryption Configuration
ENCRYPTION_ALGORITHM=aes-256-gcm
ENCRYPTION_KEY_LENGTH=32
ENCRYPTION_IV_LENGTH=16
ENCRYPTION_SALT_LENGTH=32
ENCRYPTION_ITERATIONS=100000

# Watermark Configuration
WATERMARK_ALGORITHM=sha256
WATERMARK_STRENGTH=1
WATERMARK_POSITION=end
WATERMARK_ENCODING=hex
EOF
        print_success "Created backend/.env file"
    else
        print_warning "backend/.env already exists, skipping..."
    fi
    
    # Frontend .env
    if [ ! -f frontend/.env ]; then
        cat > frontend/.env << EOF
# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ALGOD_TOKEN=
REACT_APP_ALGOD_SERVER=https://testnet-api.algonode.cloud
REACT_APP_INDEXER_TOKEN=
REACT_APP_INDEXER_SERVER=https://testnet-idx.algonode.cloud
REACT_APP_MODEL_REGISTRY_APP_ID=0
REACT_APP_ESCROW_APP_ID=0
EOF
        print_success "Created frontend/.env file"
    else
        print_warning "frontend/.env already exists, skipping..."
    fi
}

# Deploy smart contracts
deploy_contracts() {
    print_status "Deploying smart contracts..."
    
    cd contracts
    
    # Check if Algorand credentials are set
    if [ -z "$ALGOD_TOKEN" ] || [ -z "$CREATOR_MNEMONIC" ]; then
        print_warning "Algorand credentials not set. Please set ALGOD_TOKEN and CREATOR_MNEMONIC environment variables."
        print_warning "Skipping contract deployment..."
        cd ..
        return
    fi
    
    # Deploy contracts
    python3 deployContracts.py
    
    if [ $? -eq 0 ]; then
        print_success "Smart contracts deployed successfully"
        
        # Update .env with deployed app IDs
        if [ -f deployment_info.json ]; then
            MODEL_REGISTRY_APP_ID=$(python3 -c "import json; data=json.load(open('deployment_info.json')); print(data['contracts']['model_registry']['app_id'])")
            ESCROW_APP_ID=$(python3 -c "import json; data=json.load(open('deployment_info.json')); print(data['contracts']['escrow']['app_id'])")
            
            # Update backend .env
            sed -i.bak "s/MODEL_REGISTRY_APP_ID=0/MODEL_REGISTRY_APP_ID=$MODEL_REGISTRY_APP_ID/" ../backend/.env
            sed -i.bak "s/ESCROW_APP_ID=0/ESCROW_APP_ID=$ESCROW_APP_ID/" ../backend/.env
            
            # Update frontend .env
            sed -i.bak "s/REACT_APP_MODEL_REGISTRY_APP_ID=0/REACT_APP_MODEL_REGISTRY_APP_ID=$MODEL_REGISTRY_APP_ID/" ../frontend/.env
            sed -i.bak "s/REACT_APP_ESCROW_APP_ID=0/REACT_APP_ESCROW_APP_ID=$ESCROW_APP_ID/" ../frontend/.env
            
            print_success "Updated .env files with deployed contract IDs"
        fi
    else
        print_error "Contract deployment failed"
    fi
    
    cd ..
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -q; then
        print_warning "PostgreSQL is not running. Please start PostgreSQL and run the database setup manually."
        print_warning "You can run: psql -f backend/database/schema.sql"
        return
    fi
    
    # Create database if it doesn't exist
    createdb desci_chain 2>/dev/null || print_warning "Database 'desci_chain' might already exist"
    
    # Run schema
    psql -d desci_chain -f backend/database/schema.sql
    
    print_success "Database setup completed"
}

# Create startup scripts
create_startup_scripts() {
    print_status "Creating startup scripts..."
    
    # Backend start script
    cat > start-backend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting DeSciFi Backend..."
cd backend
npm run dev
EOF
    chmod +x start-backend.sh
    
    # Frontend start script
    cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "🌐 Starting DeSciFi Frontend..."
cd frontend
npm start
EOF
    chmod +x start-frontend.sh
    
    # Full application start script
    cat > start-app.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting DeSciFi ML Models Marketplace..."

# Start backend in background
echo "Starting backend..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "✅ Application started!"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
EOF
    chmod +x start-app.sh
    
    print_success "Startup scripts created"
}

# Main setup function
main() {
    echo "🎯 DeSciFi ML Models Marketplace Setup"
    echo "========================================"
    echo ""
    
    check_requirements
    setup_backend
    setup_frontend
    setup_environment
    setup_database
    create_startup_scripts
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Configure your environment variables in backend/.env and frontend/.env"
    echo "2. Set up Algorand TestNet credentials (ALGOD_TOKEN, CREATOR_MNEMONIC)"
    echo "3. Deploy smart contracts: ./deploy-contracts.sh"
    echo "4. Start the application: ./start-app.sh"
    echo ""
    echo "For more information, see README.md"
}

# Run main function
main "$@"
