"""
Deploy Contracts Script for DeSciChain
Deploys ModelRegistry and Escrow contracts to Algorand TestNet
"""

import json
import os
import base64
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.future.transaction import ApplicationCreateTxn, wait_for_confirmation, StateSchema
from algosdk.encoding import decode_address
from pyteal import compileTeal, Mode

# Import contract programs
from ModelRegistry import approval_program as model_registry_approval, clear_state_program as model_registry_clear
from Escrow import approval_program as escrow_approval, clear_state_program as escrow_clear

# Configuration
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")
ALGOD_ADDRESS = os.getenv("ALGOD_ADDRESS", "https://testnet-api.algonode.cloud")
CREATOR_MNEMONIC = os.getenv("CREATOR_MNEMONIC", "")

def get_algod_client():
    """Initialize Algorand client"""
    return algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

def get_creator_account():
    """Get creator account from mnemonic"""
    if not CREATOR_MNEMONIC:
        raise ValueError("CREATOR_MNEMONIC environment variable not set")
    
    private_key = mnemonic.to_private_key(CREATOR_MNEMONIC)
    address = account.address_from_private_key(private_key)
    return address, private_key

def compile_contract(approval_program, clear_program):
    """Compile PyTeal contracts to TEAL"""
    approval_teal = compileTeal(approval_program(), Mode.Application, version=8)
    clear_teal = compileTeal(clear_program(), Mode.Application, version=8)
    return approval_teal, clear_teal

def deploy_contract(client, creator_address, creator_private_key, approval_teal, clear_teal, app_args=None):
    """Deploy a smart contract"""
    
    # Compile TEAL to bytecode
    approval_result = client.compile(approval_teal)
    clear_result = client.compile(clear_teal)
    
    # Get suggested parameters
    params = client.suggested_params()
    
    # Create application transaction
    txn = ApplicationCreateTxn(
        sender=creator_address,
        sp=params,
        on_complete=0,  # NoOp
        approval_program=base64.b64decode(approval_result['result']),
        clear_program=base64.b64decode(clear_result['result']),
        global_schema=StateSchema(num_uints=50, num_byte_slices=50),
        local_schema=StateSchema(num_uints=0, num_byte_slices=0),
        app_args=app_args or []
    )
    
    # Sign and send transaction
    signed_txn = txn.sign(creator_private_key)
    tx_id = client.send_transaction(signed_txn)
    
    # Wait for confirmation
    result = wait_for_confirmation(client, tx_id, 4)
    
    return result['application-index'], tx_id

def main():
    """Main deployment function"""
    try:
        # Initialize client and account
        client = get_algod_client()
        creator_address, creator_private_key = get_creator_account()
        
        print(f"Deploying contracts from creator: {creator_address}")
        
        # Compile contracts
        print("Compiling ModelRegistry contract...")
        model_registry_approval_teal, model_registry_clear_teal = compile_contract(
            model_registry_approval, model_registry_clear
        )
        
        print("Compiling Escrow contract...")
        escrow_approval_teal, escrow_clear_teal = compile_contract(
            escrow_approval, escrow_clear
        )
        
        # Deploy ModelRegistry
        print("Deploying ModelRegistry contract...")
        model_registry_app_id, model_registry_tx_id = deploy_contract(
            client, creator_address, creator_private_key,
            model_registry_approval_teal, model_registry_clear_teal
        )
        
        # Deploy Escrow
        print("Deploying Escrow contract...")
        escrow_app_id, escrow_tx_id = deploy_contract(
            client, creator_address, creator_private_key,
            escrow_approval_teal, escrow_clear_teal
        )
        
        # Save deployment info
        deployment_info = {
            "network": "testnet",
            "creator_address": creator_address,
            "contracts": {
                "model_registry": {
                    "app_id": model_registry_app_id,
                    "tx_id": model_registry_tx_id
                },
                "escrow": {
                    "app_id": escrow_app_id,
                    "tx_id": escrow_tx_id
                }
            },
            "deployment_timestamp": client.status().get("time", "unknown")
        }
        
        with open("deployment_info.json", "w") as f:
            json.dump(deployment_info, f, indent=2)
        
        print("\n=== Deployment Successful ===")
        print(f"ModelRegistry App ID: {model_registry_app_id}")
        print(f"ModelRegistry TX ID: {model_registry_tx_id}")
        print(f"Escrow App ID: {escrow_app_id}")
        print(f"Escrow TX ID: {escrow_tx_id}")
        print(f"Deployment info saved to: deployment_info.json")
        
        return deployment_info
        
    except Exception as e:
        print(f"Deployment failed: {str(e)}")
        raise

if __name__ == "__main__":
    main()
