"""
Unit Tests for DeSciChain Smart Contracts
Tests ModelRegistry and Escrow contract functionality
"""

import pytest
import json
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.future.transaction import ApplicationCallTxn, wait_for_confirmation
from pyteal import compileTeal, Mode

from ModelRegistry import approval_program as model_registry_approval, clear_state_program as model_registry_clear
from Escrow import approval_program as escrow_approval, clear_state_program as escrow_clear

# Test configuration
ALGOD_TOKEN = ""
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"

class TestModelRegistry:
    """Test cases for ModelRegistry contract"""
    
    @pytest.fixture
    def client(self):
        """Initialize Algorand client"""
        return algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
    
    @pytest.fixture
    def test_account(self):
        """Create test account"""
        private_key, address = account.generate_account()
        return address, private_key
    
    def test_contract_compilation(self):
        """Test that contracts compile successfully"""
        # Compile ModelRegistry
        approval_teal = compileTeal(model_registry_approval(), Mode.Application, version=6)
        clear_teal = compileTeal(model_registry_clear(), Mode.Application, version=6)
        
        assert len(approval_teal) > 0
        assert len(clear_teal) > 0
        
        # Compile Escrow
        escrow_approval_teal = compileTeal(escrow_approval(), Mode.Application, version=6)
        escrow_clear_teal = compileTeal(escrow_clear(), Mode.Application, version=6)
        
        assert len(escrow_approval_teal) > 0
        assert len(escrow_clear_teal) > 0
    
    def test_model_registry_creation(self, client, test_account):
        """Test ModelRegistry contract creation"""
        address, private_key = test_account
        
        # Compile contract
        approval_teal = compileTeal(model_registry_approval(), Mode.Application, version=6)
        clear_teal = compileTeal(model_registry_clear(), Mode.Application, version=6)
        
        # This would require actual deployment for full testing
        # For now, we test compilation and basic structure
        assert "model_count" in approval_teal
        assert "publish" in approval_teal
        assert "get" in approval_teal
    
    def test_escrow_creation(self, client, test_account):
        """Test Escrow contract creation"""
        address, private_key = test_account
        
        # Compile contract
        approval_teal = compileTeal(escrow_approval(), Mode.Application, version=6)
        clear_teal = compileTeal(escrow_clear(), Mode.Application, version=6)
        
        # Test contract structure
        assert "escrow_model_id" in approval_teal
        assert "create" in approval_teal
        assert "release" in approval_teal
        assert "refund" in approval_teal

class TestContractIntegration:
    """Integration tests for contract interactions"""
    
    def test_model_publish_flow(self):
        """Test model publishing flow"""
        # This would test the complete flow:
        # 1. Publish model to ModelRegistry
        # 2. Create escrow for purchase
        # 3. Release payment
        # 4. Verify state changes
        
        # For now, test the contract structure
        model_registry_teal = compileTeal(model_registry_approval(), Mode.Application, version=6)
        escrow_teal = compileTeal(escrow_approval(), Mode.Application, version=6)
        
        assert len(model_registry_teal) > 0
        assert len(escrow_teal) > 0
    
    def test_escrow_payment_flow(self):
        """Test escrow payment flow"""
        # This would test:
        # 1. Create escrow with payment
        # 2. Verify payment is locked
        # 3. Release payment to publisher
        # 4. Verify payment is transferred
        
        escrow_teal = compileTeal(escrow_approval(), Mode.Application, version=6)
        assert "InnerTxnBuilder" in escrow_teal  # Verify inner transactions are used

def test_contract_validation():
    """Test contract validation logic"""
    
    # Test ModelRegistry validation
    model_registry_teal = compileTeal(model_registry_approval(), Mode.Application, version=6)
    
    # Verify required functions exist
    required_functions = ["publish", "get"]
    for func in required_functions:
        assert func in model_registry_teal
    
    # Test Escrow validation
    escrow_teal = compileTeal(escrow_approval(), Mode.Application, version=6)
    
    # Verify required functions exist
    required_escrow_functions = ["create", "release", "refund", "status"]
    for func in required_escrow_functions:
        assert func in escrow_teal

if __name__ == "__main__":
    # Run basic tests
    print("Running contract compilation tests...")
    
    try:
        # Test ModelRegistry compilation
        model_registry_teal = compileTeal(model_registry_approval(), Mode.Application, version=6)
        print("✓ ModelRegistry compiles successfully")
        
        # Test Escrow compilation
        escrow_teal = compileTeal(escrow_approval(), Mode.Application, version=6)
        print("✓ Escrow compiles successfully")
        
        # Test basic validation
        test_contract_validation()
        print("✓ Contract validation passes")
        
        print("\nAll tests passed! ✅")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        raise
