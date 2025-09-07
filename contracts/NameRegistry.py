"""
DeSci Name Registry Smart Contract - Global State Version
Enables human-readable names like smith.desci and quantlab.desci for Algorand addresses
"""

from pyteal import *
import json

def approval_program():
    """Main approval program for NameRegistry contract"""
    
    method = Txn.application_args[0]
    name_arg = Txn.application_args[1]
    
    # Helper function to create keys for global state
    def name_key(name: Expr, suffix: str) -> Expr:
        return Concat(Bytes(suffix), name)
    
    # Register name: ["register", name, cid, price]
    register_name = Seq(
        Assert(Txn.application_args.length() == Int(4)),
        Assert(And(Len(name_arg) > Int(0), Len(name_arg) <= Int(64))),
        Assert(Len(Txn.application_args[2]) > Int(0)),  # CID not empty
        
        # Check name doesn't exist (if key doesn't exist, globalGet returns 0)
        Assert(App.globalGet(name_key(name_arg, "owner_")) == Int(0)),
        
        # Store owner, CID, and price
        App.globalPut(name_key(name_arg, "owner_"), Txn.sender()),
        App.globalPut(name_key(name_arg, "cid_"), Txn.application_args[2]),
        App.globalPut(name_key(name_arg, "price_"), Btoi(Txn.application_args[3])),
        App.globalPut(name_key(name_arg, "ts_"), Global.latest_timestamp()),
        
        Log(Concat(Bytes("REGISTERED:"), name_arg, Bytes(":"), Txn.sender())),
        Return(Int(1))
    )
    
    # Resolve name: ["resolve", name]
    resolve_name = Seq(
        Assert(Txn.application_args.length() == Int(2)),
        Assert(And(Len(name_arg) > Int(0), Len(name_arg) <= Int(64))),
        
        # Check name exists  
        Assert(App.globalGet(name_key(name_arg, "owner_")) != Int(0)),
        
        # Log all components
        Log(Concat(Bytes("OWNER:"), App.globalGet(name_key(name_arg, "owner_")))),
        Log(Concat(Bytes("CID:"), App.globalGet(name_key(name_arg, "cid_")))),
        Log(Concat(Bytes("PRICE:"), Itob(App.globalGet(name_key(name_arg, "price_"))))),
        Log(Concat(Bytes("TIMESTAMP:"), Itob(App.globalGet(name_key(name_arg, "ts_"))))),
        
        Return(Int(1))
    )
    
    # Update name: ["update", name, new_cid, new_price]
    update_name = Seq(
        Assert(Txn.application_args.length() == Int(4)),
        Assert(And(Len(name_arg) > Int(0), Len(name_arg) <= Int(64))),
        
        # Check name exists and caller is owner
        Assert(App.globalGet(name_key(name_arg, "owner_")) != Int(0)),
        Assert(App.globalGet(name_key(name_arg, "owner_")) == Txn.sender()),
        
        # Update CID and price
        App.globalPut(name_key(name_arg, "cid_"), Txn.application_args[2]),
        App.globalPut(name_key(name_arg, "price_"), Btoi(Txn.application_args[3])),
        App.globalPut(name_key(name_arg, "ts_"), Global.latest_timestamp()),
        
        Log(Concat(Bytes("UPDATED:"), name_arg)),
        Return(Int(1))
    )
    
    # Transfer name: ["transfer", name, new_owner]
    transfer_name = Seq(
        Assert(Txn.application_args.length() == Int(3)),
        Assert(And(Len(name_arg) > Int(0), Len(name_arg) <= Int(64))),
        Assert(Len(Txn.application_args[2]) == Int(32)),  # Valid address
        
        # Check name exists and caller is owner
        Assert(App.globalGet(name_key(name_arg, "owner_")) != Int(0)),
        Assert(App.globalGet(name_key(name_arg, "owner_")) == Txn.sender()),
        
        # Transfer ownership
        App.globalPut(name_key(name_arg, "owner_"), Txn.application_args[2]),
        App.globalPut(name_key(name_arg, "ts_"), Global.latest_timestamp()),
        
        Log(Concat(Bytes("TRANSFERRED:"), name_arg, Bytes(":"), Txn.application_args[2])),
        Return(Int(1))
    )
    
    # Delete name: ["delete", name]
    delete_name = Seq(
        Assert(Txn.application_args.length() == Int(2)),
        Assert(And(Len(name_arg) > Int(0), Len(name_arg) <= Int(64))),
        
        # Check name exists and caller is owner
        Assert(App.globalGet(name_key(name_arg, "owner_")) != Int(0)),
        Assert(App.globalGet(name_key(name_arg, "owner_")) == Txn.sender()),
        
        # Delete all associated data
        App.globalDel(name_key(name_arg, "owner_")),
        App.globalDel(name_key(name_arg, "cid_")),
        App.globalDel(name_key(name_arg, "price_")),
        App.globalDel(name_key(name_arg, "ts_")),
        
        Log(Concat(Bytes("DELETED:"), name_arg)),
        Return(Int(1))
    )
    
    # Check if name exists: ["exists", name]
    name_exists = Seq(
        Assert(Txn.application_args.length() == Int(2)),
        Assert(And(Len(name_arg) > Int(0), Len(name_arg) <= Int(64))),
        
        Log(Concat(
            Bytes("EXISTS:"),
            name_arg,
            Bytes(":"),
            If(App.globalGet(name_key(name_arg, "owner_")) != Int(0), Bytes("1"), Bytes("0"))
        )),
        
        Return(Int(1))
    )
    
    # Main program
    program = Cond(
        # Application creation
        [Txn.application_id() == Int(0), Return(Int(1))],
        
        # Method routing for NoOp calls
        [And(Txn.on_completion() == OnComplete.NoOp, method == Bytes("register")), register_name],
        [And(Txn.on_completion() == OnComplete.NoOp, method == Bytes("resolve")), resolve_name],
        [And(Txn.on_completion() == OnComplete.NoOp, method == Bytes("update")), update_name],
        [And(Txn.on_completion() == OnComplete.NoOp, method == Bytes("transfer")), transfer_name],
        [And(Txn.on_completion() == OnComplete.NoOp, method == Bytes("delete")), delete_name],
        [And(Txn.on_completion() == OnComplete.NoOp, method == Bytes("exists")), name_exists],
        
        # Admin operations
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Txn.sender() == Global.creator_address())],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Txn.sender() == Global.creator_address())],
        
        # Other operations
        [Txn.on_completion() == OnComplete.OptIn, Return(Int(1))],
        [Txn.on_completion() == OnComplete.CloseOut, Return(Int(1))],
        
        # Default: reject
        [Int(1), Return(Int(0))]
    )
    
    return program

def clear_state_program():
    return Return(Int(1))

# ABI specification
ABI_SPEC = {
    "name": "NameRegistry",
    "description": "DeSci Name Registry for human-readable names on Algorand",
    "methods": [
        {
            "name": "register",
            "args": [
                {"type": "string", "name": "name", "desc": "The name to register (e.g., smith.desci)"},
                {"type": "string", "name": "cid", "desc": "IPFS CID for the associated content"},
                {"type": "string", "name": "price", "desc": "Price in microAlgos as string"}
            ],
            "returns": {"type": "void", "desc": "Name registered successfully"}
        },
        {
            "name": "resolve",
            "args": [
                {"type": "string", "name": "name", "desc": "The name to resolve"}
            ],
            "returns": {"type": "void", "desc": "Name data returned via logs"}
        },
        {
            "name": "update",
            "args": [
                {"type": "string", "name": "name", "desc": "The name to update"},
                {"type": "string", "name": "cid", "desc": "New IPFS CID"},
                {"type": "string", "name": "price", "desc": "New price in microAlgos as string"}
            ],
            "returns": {"type": "void", "desc": "Name updated successfully"}
        },
        {
            "name": "transfer",
            "args": [
                {"type": "string", "name": "name", "desc": "The name to transfer"},
                {"type": "address", "name": "new_owner", "desc": "New owner address"}
            ],
            "returns": {"type": "void", "desc": "Name transferred successfully"}
        },
        {
            "name": "delete",
            "args": [
                {"type": "string", "name": "name", "desc": "The name to delete"}
            ],
            "returns": {"type": "void", "desc": "Name deleted successfully"}
        },
        {
            "name": "exists",
            "args": [
                {"type": "string", "name": "name", "desc": "The name to check"}
            ],
            "returns": {"type": "void", "desc": "Existence status returned via logs"}
        }
    ]
}

if __name__ == "__main__":
    with open("name_registry_approval.teal", "w") as f:
        f.write(compileTeal(approval_program(), Mode.Application, version=8))
    
    with open("name_registry_clear.teal", "w") as f:
        f.write(compileTeal(clear_state_program(), Mode.Application, version=8))
    
    with open("name_registry.json", "w") as f:
        json.dump(ABI_SPEC, f, indent=2)
    
    print("✅ NameRegistry contracts compiled successfully!")
    print("   - name_registry_approval.teal")
    print("   - name_registry_clear.teal")
    print("   - name_registry.json (ABI spec)")