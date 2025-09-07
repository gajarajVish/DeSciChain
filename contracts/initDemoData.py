"""
Initialize Demo Data for Name Registry
Creates demo entries: smith.desci and quantlab.desci
"""

import json
import os
from algosdk import account, mnemonic, encoding
from algosdk.v2client import algod
from algosdk.future.transaction import ApplicationNoOpTxn, wait_for_confirmation

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

def load_deployment_info():
    """Load deployment info to get contract app IDs"""
    try:
        with open("deployment_info.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError("deployment_info.json not found. Please deploy contracts first.")

def register_name(client, app_id, creator_address, creator_private_key, name, cid, price_microalgos):
    """Register a name in the Name Registry"""
    
    # Get suggested parameters
    params = client.suggested_params()
    
    # Create application call transaction
    txn = ApplicationNoOpTxn(
        sender=creator_address,
        sp=params,
        index=app_id,
        app_args=[
            "register".encode(),
            name.encode(),
            cid.encode(),
            str(price_microalgos).encode()
        ]
    )
    
    # Sign and send transaction
    signed_txn = txn.sign(creator_private_key)
    tx_id = client.send_transaction(signed_txn)
    
    # Wait for confirmation
    result = wait_for_confirmation(client, tx_id, 4)
    
    return result, tx_id

def main():
    """Main function to initialize demo data"""
    try:
        # Initialize client and account
        client = get_algod_client()
        creator_address, creator_private_key = get_creator_account()
        
        print(f"Initializing demo data from creator: {creator_address}")
        
        # Load deployment info
        deployment_info = load_deployment_info()
        name_registry_app_id = deployment_info["contracts"]["name_registry"]["app_id"]
        
        print(f"Using NameRegistry App ID: {name_registry_app_id}")
        
        # Demo data to register
        demo_names = [
            {
                "name": "smith.desci",
                "cid": "QmExampleSmithModelHashABCDEFGHIJKLMNOPQRSTUVWXYZ123456789",
                "price": 2_000_000,  # 2 ALGO in microAlgos
                "description": "Dr. Smith's Neural Network Model for Protein Folding"
            },
            {
                "name": "quantlab.desci", 
                "cid": "QmQuantumLabCIDHashXYZABCDEFGHIJKLMNOPQRSTUVWXYZ987654321",
                "price": 8_000_000,  # 8 ALGO in microAlgos
                "description": "QuantumLab's Advanced ML Model for Drug Discovery"
            },
            {
                "name": "biotech.desci",
                "cid": "QmBiotechModelHashDEFGHIJKLMNOPQRSTUVWXYZ123456789ABCDEF",
                "price": 5_000_000,  # 5 ALGO in microAlgos  
                "description": "BioTech Institute's Genomics Analysis Model"
            }
        ]
        
        print(f"Registering {len(demo_names)} demo names...")
        
        registered_names = []
        
        for demo in demo_names:
            try:
                print(f"Registering {demo['name']}...")
                
                result, tx_id = register_name(
                    client, 
                    name_registry_app_id, 
                    creator_address, 
                    creator_private_key,
                    demo['name'],
                    demo['cid'],
                    demo['price']
                )
                
                registered_names.append({
                    "name": demo['name'],
                    "tx_id": tx_id,
                    "price_algo": demo['price'] / 1_000_000,
                    "description": demo['description'],
                    "cid": demo['cid']
                })
                
                print(f"✅ Registered {demo['name']} - TX ID: {tx_id}")
                
            except Exception as e:
                print(f"❌ Failed to register {demo['name']}: {str(e)}")
                continue
        
        # Save demo data info
        demo_data_info = {
            "network": "testnet",
            "name_registry_app_id": name_registry_app_id,
            "creator_address": creator_address,
            "registered_names": registered_names,
            "initialization_timestamp": client.status().get("time", "unknown")
        }
        
        with open("demo_data.json", "w") as f:
            json.dump(demo_data_info, f, indent=2)
        
        print("\n=== Demo Data Initialization Complete ===")
        print(f"Successfully registered {len(registered_names)} names:")
        for name_info in registered_names:
            print(f"  • {name_info['name']} - {name_info['price_algo']} ALGO")
        print(f"Demo data info saved to: demo_data.json")
        
        # Test resolution of one name
        if registered_names:
            test_name = registered_names[0]['name']
            print(f"\nTesting resolution of {test_name}...")
            
            try:
                # Create resolve transaction
                params = client.suggested_params()
                resolve_txn = ApplicationNoOpTxn(
                    sender=creator_address,
                    sp=params,
                    index=name_registry_app_id,
                    app_args=[
                        "resolve".encode(),
                        test_name.encode()
                    ]
                )
                
                signed_resolve_txn = resolve_txn.sign(creator_private_key)
                resolve_tx_id = client.send_transaction(signed_resolve_txn)
                resolve_result = wait_for_confirmation(client, resolve_tx_id, 4)
                
                print(f"✅ Resolve test successful - TX ID: {resolve_tx_id}")
                
                # Print logs if available
                if 'logs' in resolve_result:
                    print("Resolution logs:")
                    for log in resolve_result['logs']:
                        print(f"  {encoding.base64.b64decode(log).decode()}")
                        
            except Exception as e:
                print(f"❌ Resolve test failed: {str(e)}")
        
        return demo_data_info
        
    except Exception as e:
        print(f"Demo data initialization failed: {str(e)}")
        raise

if __name__ == "__main__":
    main()