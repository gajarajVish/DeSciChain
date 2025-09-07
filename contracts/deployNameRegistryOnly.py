"""
Deploy Only Name Registry Contract
Simplified deployment script for testing the name registry
"""

import json
import os
import base64
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.future.transaction import ApplicationCreateTxn, wait_for_confirmation, StateSchema
from pyteal import compileTeal, Mode

# Import name registry contract
from NameRegistry import approval_program as name_registry_approval, clear_state_program as name_registry_clear

# Configuration
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")
ALGOD_ADDRESS = os.getenv("ALGOD_ADDRESS", "https://testnet-api.algonode.cloud")
CREATOR_MNEMONIC = os.getenv("CREATOR_MNEMONIC", "")

def get_algod_client():
    return algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

def get_creator_account():
    if not CREATOR_MNEMONIC:
        raise ValueError("CREATOR_MNEMONIC environment variable not set")
    
    private_key = mnemonic.to_private_key(CREATOR_MNEMONIC)
    address = account.address_from_private_key(private_key)
    return address, private_key

def compile_contract(approval_program, clear_program):
    approval_teal = compileTeal(approval_program(), Mode.Application, version=8)
    clear_teal = compileTeal(clear_program(), Mode.Application, version=8)
    return approval_teal, clear_teal

def deploy_contract(client, creator_address, creator_private_key, approval_teal, clear_teal):
    # Compile TEAL to bytecode
    approval_result = client.compile(approval_teal)
    clear_result = client.compile(clear_teal)
    
    # Get suggested parameters
    params = client.suggested_params()
    
    # Create application transaction with minimal schema for name registry
    txn = ApplicationCreateTxn(
        sender=creator_address,
        sp=params,
        on_complete=0,  # NoOp
        approval_program=base64.b64decode(approval_result['result']),
        clear_program=base64.b64decode(clear_result['result']),
        global_schema=StateSchema(num_uints=8, num_byte_slices=8),  # Minimal schema
        local_schema=StateSchema(num_uints=0, num_byte_slices=0),
        app_args=[]
    )
    
    # Sign and send transaction
    signed_txn = txn.sign(creator_private_key)
    tx_id = client.send_transaction(signed_txn)
    
    # Wait for confirmation
    result = wait_for_confirmation(client, tx_id, 4)
    
    return result['application-index'], tx_id

def main():
    try:
        # Initialize client and account
        client = get_algod_client()
        creator_address, creator_private_key = get_creator_account()
        
        # Check account balance
        account_info = client.account_info(creator_address)
        balance_algos = account_info['amount'] / 1_000_000
        
        print(f"Deploying Name Registry from: {creator_address}")
        print(f"Account balance: {balance_algos:.3f} ALGO")
        
        # Compile contract
        print("Compiling NameRegistry contract...")
        approval_teal, clear_teal = compile_contract(name_registry_approval, name_registry_clear)
        
        # Deploy NameRegistry
        print("Deploying NameRegistry contract...")
        app_id, tx_id = deploy_contract(
            client, creator_address, creator_private_key,
            approval_teal, clear_teal
        )
        
        # Save deployment info
        deployment_info = {
            "network": "testnet",
            "creator_address": creator_address,
            "contracts": {
                "name_registry": {
                    "app_id": app_id,
                    "tx_id": tx_id
                }
            },
            "deployment_timestamp": client.status().get("time", "unknown")
        }
        
        with open("name_registry_deployment.json", "w") as f:
            json.dump(deployment_info, f, indent=2)
        
        print("\n=== Name Registry Deployment Successful ===")
        print(f"App ID: {app_id}")
        print(f"TX ID: {tx_id}")
        print(f"Deployment info saved to: name_registry_deployment.json")
        
        return deployment_info
        
    except Exception as e:
        print(f"Deployment failed: {str(e)}")
        raise

if __name__ == "__main__":
    main()