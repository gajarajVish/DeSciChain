"""
ModelRegistry Smart Contract for DeSciChain
Production-ready contract for managing ML model registration on Algorand
"""

from pyteal import *

def approval_program():
    """Main approval program for ModelRegistry contract"""
    
    # Global state keys
    model_count_key = Bytes("model_count")
    
    # Helper function to get model key
    def model_key(model_id: Expr, suffix: bytes) -> Expr:
        return Concat(Bytes(suffix), Itob(model_id))
    
    # Initialize application
    on_creation = Seq([
        App.globalPut(model_count_key, Int(0)),
        Return(Int(1))
    ])
    
    # Publish model method
    publish_model = Seq([
        # Validate input arguments
        Assert(Txn.application_args.length() == Int(4)),  # method + 3 params
        Assert(Len(Txn.application_args[1]) > Int(0)),    # CID not empty
        Assert(Len(Txn.application_args[3]) > Int(0)),    # License terms not empty
        
        # Get current count and increment
        App.globalPut(model_count_key, App.globalGet(model_count_key) + Int(1)),
        
        # Store model data using the new model ID
        App.globalPut(
            model_key(App.globalGet(model_count_key), b"cid_"), 
            Txn.application_args[1]
        ),
        App.globalPut(
            model_key(App.globalGet(model_count_key), b"pub_"), 
            Txn.application_args[2]
        ),
        App.globalPut(
            model_key(App.globalGet(model_count_key), b"lic_"), 
            Txn.application_args[3]
        ),
        App.globalPut(
            model_key(App.globalGet(model_count_key), b"ts_"), 
            Itob(Global.latest_timestamp())
        ),
        
        # Log the publication event
        Log(Concat(
            Bytes("MODEL_PUBLISHED:"),
            Itob(App.globalGet(model_count_key)),
            Bytes(":"),
            Txn.application_args[1],
            Bytes(":"),
            Txn.application_args[2]
        )),
        
        Return(Int(1))
    ])
    
    # Get model method
    get_model = Seq([
        # Validate input
        Assert(Txn.application_args.length() == Int(2)),
        Assert(Btoi(Txn.application_args[1]) > Int(0)),
        Assert(Btoi(Txn.application_args[1]) <= App.globalGet(model_count_key)),
        
        # Return data via structured logs
        Log(Concat(Bytes("MODEL_DATA:"), Txn.application_args[1])),
        Log(Concat(Bytes("CID:"), App.globalGet(model_key(Btoi(Txn.application_args[1]), b"cid_")))),
        Log(Concat(Bytes("PUBLISHER:"), App.globalGet(model_key(Btoi(Txn.application_args[1]), b"pub_")))),
        Log(Concat(Bytes("LICENSE:"), App.globalGet(model_key(Btoi(Txn.application_args[1]), b"lic_")))),
        Log(Concat(Bytes("TIMESTAMP:"), App.globalGet(model_key(Btoi(Txn.application_args[1]), b"ts_")))),
        
        Return(Int(1))
    ])
    
    # Get model count method
    get_model_count = Seq([
        Log(Concat(Bytes("MODEL_COUNT:"), Itob(App.globalGet(model_count_key)))),
        Return(Int(1))
    ])
    
    # Check if model exists
    model_exists = Seq([
        Assert(Txn.application_args.length() == Int(2)),
        Assert(Btoi(Txn.application_args[1]) > Int(0)),
        Log(Concat(
            Bytes("MODEL_EXISTS:"),
            If(
                And(
                    Btoi(Txn.application_args[1]) <= App.globalGet(model_count_key),
                    Len(App.globalGet(model_key(Btoi(Txn.application_args[1]), b"cid_"))) > Int(0)
                ),
                Bytes("1"),  # Exists
                Bytes("0")   # Does not exist
            )
        )),
        Return(Int(1))
    ])
    
    # Main program logic
    program = Cond(
        # Application creation
        [Txn.application_id() == Int(0), on_creation],
        
        # Method calls
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args.length() >= Int(1),
            Txn.application_args[0] == Bytes("publish_model")
        ), publish_model],
        
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args.length() >= Int(1),
            Txn.application_args[0] == Bytes("get_model")
        ), get_model],
        
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args.length() >= Int(1),
            Txn.application_args[0] == Bytes("get_model_count")
        ), get_model_count],
        
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args.length() >= Int(1),
            Txn.application_args[0] == Bytes("model_exists")
        ), model_exists],
        
        # Other transaction types
        [Txn.on_completion() == OnComplete.OptIn, Return(Int(1))],
        [Txn.on_completion() == OnComplete.CloseOut, Return(Int(1))],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Int(0))],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Int(0))],
        
        # Default: reject
        [Int(1), Return(Int(0))]
    )
    
    return program

def clear_state_program():
    """Clear state program"""
    return Return(Int(1))

# ABI specification for client generation
ABI_SPEC = {
    "name": "ModelRegistry",
    "description": "Smart contract for registering ML models on Algorand",
    "methods": [
        {
            "name": "publish_model",
            "args": [
                {"type": "string", "name": "cid", "desc": "IPFS CID of the model"},
                {"type": "address", "name": "publisher", "desc": "Publisher address"},
                {"type": "string", "name": "license_terms", "desc": "License terms"}
            ],
            "returns": {"type": "void", "desc": "Model published successfully"}
        },
        {
            "name": "get_model",
            "args": [
                {"type": "uint64", "name": "model_id", "desc": "Model ID to retrieve"}
            ],
            "returns": {"type": "void", "desc": "Model data returned via logs"}
        },
        {
            "name": "get_model_count",
            "args": [],
            "returns": {"type": "void", "desc": "Total number of models returned via logs"}
        },
        {
            "name": "model_exists",
            "args": [
                {"type": "uint64", "name": "model_id", "desc": "Model ID to check"}
            ],
            "returns": {"type": "void", "desc": "Existence status returned via logs"}
        }
    ]
}

if __name__ == "__main__":
    import json
    
    # Compile the contracts
    with open("model_registry_approval.teal", "w") as f:
        f.write(compileTeal(approval_program(), Mode.Application, version=8))
    
    with open("model_registry_clear.teal", "w") as f:
        f.write(compileTeal(clear_state_program(), Mode.Application, version=8))
    
    # Write ABI specification
    with open("model_registry.json", "w") as f:
        json.dump(ABI_SPEC, f, indent=2)
    
    print("✅ ModelRegistry contracts compiled successfully!")
    print("   - model_registry_approval.teal")
    print("   - model_registry_clear.teal")
    print("   - model_registry.json (ABI spec)")