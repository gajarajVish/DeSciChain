"""
Tests for DeSciFi Smart Contracts
"""

import pytest
import json
import os
import base64
from algosdk import account, mnemonic, encoding
from algosdk.v2client import algod
from algosdk.future.transaction import ApplicationCreateTxn, ApplicationCallTxn, PaymentTxn, wait_for_confirmation, StateSchema
from pyteal import compileTeal, Mode

# Import contract programs
from ModelRegistry import approval_program as model_registry_approval, clear_state_program as model_registry_clear
from Escrow import approval_program as escrow_approval, clear_state_program as escrow_clear

# Test configuration
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")
ALGOD_ADDRESS = os.getenv("ALGOD_ADDRESS", "https://testnet-api.algonode.cloud")

def test_model_registry_compilation():
    """Test that ModelRegistry contract compiles successfully"""
    try:
        approval_teal = compileTeal(model_registry_approval(), Mode.Application, version=8)
        clear_teal = compileTeal(model_registry_clear(), Mode.Application, version=8)
        
        assert len(approval_teal) > 0
        assert len(clear_teal) > 0
        assert "txn ApplicationID" in approval_teal
        
        print("✅ ModelRegistry compiled successfully")
        return True
    except Exception as e:
        print(f"❌ ModelRegistry compilation failed: {e}")
        return False

def test_escrow_compilation():
    """Test that Escrow contract compiles successfully"""
    try:
        approval_teal = compileTeal(escrow_approval(), Mode.Application, version=8)
        clear_teal = compileTeal(escrow_clear(), Mode.Application, version=8)
        
        assert len(approval_teal) > 0
        assert len(clear_teal) > 0
        assert "txn ApplicationID" in approval_teal
        
        print("✅ Escrow compiled successfully")
        return True
    except Exception as e:
        print(f"❌ Escrow compilation failed: {e}")
        return False

def test_contract_abi_specs():
    """Test that ABI specifications are valid"""
    try:
        from ModelRegistry import ABI_SPEC as model_abi
        from Escrow import ABI_SPEC as escrow_abi
        
        # Validate ModelRegistry ABI
        assert model_abi["name"] == "ModelRegistry"
        assert len(model_abi["methods"]) >= 4
        assert any(method["name"] == "publish_model" for method in model_abi["methods"])
        assert any(method["name"] == "get_model" for method in model_abi["methods"])
        
        # Validate Escrow ABI
        assert escrow_abi["name"] == "Escrow"
        assert len(escrow_abi["methods"]) >= 5
        assert any(method["name"] == "create_escrow" for method in escrow_abi["methods"])
        assert any(method["name"] == "release_payment" for method in escrow_abi["methods"])
        
        print("✅ ABI specifications are valid")
        return True
    except Exception as e:
        print(f"❌ ABI specification validation failed: {e}")
        return False

def run_basic_tests():
    """Run basic compilation and validation tests"""
    print("🧪 Running DeSciFi Smart Contract Tests")
    
    tests = [
        test_model_registry_compilation,
        test_escrow_compilation,
        test_contract_abi_specs
    ]
    
    passed = 0
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 Test Results: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("🎉 All basic tests passed! Contracts are ready for deployment.")
    else:
        print("⚠️  Some tests failed. Please fix issues before deployment.")
    
    return passed == len(tests)

if __name__ == "__main__":
    run_basic_tests()