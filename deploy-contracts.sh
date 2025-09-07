#!/bin/bash

# DeSciFi Smart Contracts Deployment Script
# Deploys ModelRegistry and Escrow contracts to Algorand TestNet

set -e

echo "🚀 Deploying DeSciFi Smart Contracts..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if required environment variables are set
check_environment() {
    print_status "Checking environment variables..."
    
    if [ -z "$ALGOD_TOKEN" ]; then
        print_error "ALGOD_TOKEN environment variable is not set"
        print_error "Please set it with: export ALGOD_TOKEN=your_token_here"
        exit 1
    fi
    
    if [ -z "$CREATOR_MNEMONIC" ]; then
        print_error "CREATOR_MNEMONIC environment variable is not set"
        print_error "Please set it with: export CREATOR_MNEMONIC='your mnemonic phrase here'"
        exit 1
    fi
    
    print_success "Environment variables are set"
}

# Deploy contracts
deploy_contracts() {
    print_status "Deploying smart contracts to Algorand TestNet..."
    
    cd contracts
    
    # Run deployment script
    python3 deployContracts.py
    
    if [ $? -eq 0 ]; then
        print_success "Smart contracts deployed successfully!"
        
        # Display deployment information
        if [ -f deployment_info.json ]; then
            echo ""
            echo "📋 Deployment Information:"
            echo "========================="
            python3 -c "
import json
with open('deployment_info.json', 'r') as f:
    data = json.load(f)
    print(f\"Model Registry App ID: {data['contracts']['model_registry']['app_id']}\")
    print(f\"Escrow App ID: {data['contracts']['escrow']['app_id']}\")
    print(f\"Network: {data['network']}\")
    print(f\"Creator: {data['creator_address']}\")
"
            
            # Update .env files
            update_env_files
        fi
    else
        print_error "Contract deployment failed"
        exit 1
    fi
    
    cd ..
}

# Update environment files with deployed contract IDs
update_env_files() {
    print_status "Updating environment files..."
    
    # Get contract IDs from deployment info
    MODEL_REGISTRY_APP_ID=$(python3 -c "import json; data=json.load(open('deployment_info.json')); print(data['contracts']['model_registry']['app_id'])")
    ESCROW_APP_ID=$(python3 -c "import json; data=json.load(open('deployment_info.json')); print(data['contracts']['escrow']['app_id'])")
    
    # Update backend .env
    if [ -f "../backend/.env" ]; then
        sed -i.bak "s/MODEL_REGISTRY_APP_ID=.*/MODEL_REGISTRY_APP_ID=$MODEL_REGISTRY_APP_ID/" ../backend/.env
        sed -i.bak "s/ESCROW_APP_ID=.*/ESCROW_APP_ID=$ESCROW_APP_ID/" ../backend/.env
        print_success "Updated backend/.env"
    fi
    
    # Update frontend .env
    if [ -f "../frontend/.env" ]; then
        sed -i.bak "s/REACT_APP_MODEL_REGISTRY_APP_ID=.*/REACT_APP_MODEL_REGISTRY_APP_ID=$MODEL_REGISTRY_APP_ID/" ../frontend/.env
        sed -i.bak "s/REACT_APP_ESCROW_APP_ID=.*/REACT_APP_ESCROW_APP_ID=$ESCROW_APP_ID/" ../frontend/.env
        print_success "Updated frontend/.env"
    fi
    
    print_success "Environment files updated with contract IDs"
}

# Test contracts
test_contracts() {
    print_status "Testing deployed contracts..."
    
    cd contracts
    python3 test_contracts.py
    
    if [ $? -eq 0 ]; then
        print_success "Contract tests passed"
    else
        print_warning "Some contract tests failed, but deployment was successful"
    fi
    
    cd ..
}

# Main function
main() {
    echo "🎯 DeSciFi Smart Contracts Deployment"
    echo "======================================="
    echo ""
    
    check_environment
    deploy_contracts
    test_contracts
    
    echo ""
    echo "🎉 Contract deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start the backend: ./start-backend.sh"
    echo "2. Start the frontend: ./start-frontend.sh"
    echo "3. Or start both: ./start-app.sh"
    echo ""
    echo "Your contracts are now deployed and ready to use!"
}

# Run main function
main "$@"
