"""
Working DeSci Name Registry - Using proper PyTeal patterns
"""

from pyteal import *

def approval_program():
    # Method argument checks
    method_register = Txn.application_args[0] == Bytes("register")
    method_resolve = Txn.application_args[0] == Bytes("resolve")
    method_update = Txn.application_args[0] == Bytes("update")
    method_transfer = Txn.application_args[0] == Bytes("transfer")
    method_delete = Txn.application_args[0] == Bytes("delete")
    
    # Scratch variables
    name_key = ScratchVar(TealType.bytes)
    box_length = ScratchVar()
    
    # Register method
    handle_register = Seq(
        Assert(Txn.application_args.length() == Int(4)),
        name_key.store(Txn.application_args[1]),
        Assert(Len(name_key.load()) > Int(0)),
        Assert(Len(name_key.load()) <= Int(64)),
        
        # Check name doesn't exist
        box_length.store(App.box_length(name_key.load())),
        Assert(Not(box_length.load().hasValue())),
        
        # Create box with: owner(32) + price(8) + cid
        App.box_put(
            name_key.load(),
            Concat(
                Txn.sender(),  # 32 bytes owner
                Itob(Btoi(Txn.application_args[3])),  # 8 bytes price
                Txn.application_args[2]  # CID
            )
        ),
        
        Log(Concat(Bytes("REGISTERED:"), name_key.load())),
        Return(Int(1))
    )
    
    # Resolve method
    handle_resolve = Seq(
        Assert(Txn.application_args.length() == Int(2)),
        name_key.store(Txn.application_args[1]),
        
        # Check name exists
        box_length.store(App.box_length(name_key.load())),
        Assert(box_length.load().hasValue()),
        
        # Extract and log components
        Log(Concat(Bytes("OWNER:"), App.box_extract(name_key.load(), Int(0), Int(32)))),
        Log(Concat(Bytes("PRICE:"), App.box_extract(name_key.load(), Int(32), Int(8)))),
        Log(Concat(Bytes("CID:"), App.box_extract(name_key.load(), Int(40), box_length.load().value() - Int(40)))),
        
        Return(Int(1))
    )
    
    # Update method
    handle_update = Seq(
        Assert(Txn.application_args.length() == Int(4)),
        name_key.store(Txn.application_args[1]),
        
        # Check name exists
        box_length.store(App.box_length(name_key.load())),
        Assert(box_length.load().hasValue()),
        
        # Check ownership
        Assert(App.box_extract(name_key.load(), Int(0), Int(32)) == Txn.sender()),
        
        # Update box with same owner but new price/CID
        App.box_put(
            name_key.load(),
            Concat(
                Txn.sender(),  # Keep same owner
                Itob(Btoi(Txn.application_args[3])),  # New price
                Txn.application_args[2]  # New CID
            )
        ),
        
        Log(Concat(Bytes("UPDATED:"), name_key.load())),
        Return(Int(1))
    )
    
    # Delete method
    handle_delete = Seq(
        Assert(Txn.application_args.length() == Int(2)),
        name_key.store(Txn.application_args[1]),
        
        # Check name exists
        box_length.store(App.box_length(name_key.load())),
        Assert(box_length.load().hasValue()),
        
        # Check ownership
        Assert(App.box_extract(name_key.load(), Int(0), Int(32)) == Txn.sender()),
        
        # Delete box
        App.box_delete(name_key.load()),
        
        Log(Concat(Bytes("DELETED:"), name_key.load())),
        Return(Int(1))
    )
    
    # Main program
    program = Cond(
        # App creation
        [Txn.application_id() == Int(0), Return(Int(1))],
        
        # NoOp methods
        [And(Txn.on_completion() == OnComplete.NoOp, method_register), handle_register],
        [And(Txn.on_completion() == OnComplete.NoOp, method_resolve), handle_resolve], 
        [And(Txn.on_completion() == OnComplete.NoOp, method_update), handle_update],
        [And(Txn.on_completion() == OnComplete.NoOp, method_delete), handle_delete],
        
        # Admin operations
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Txn.sender() == Global.creator_address())],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Txn.sender() == Global.creator_address())],
        
        # Other operations
        [Txn.on_completion() == OnComplete.OptIn, Return(Int(1))],
        [Txn.on_completion() == OnComplete.CloseOut, Return(Int(1))],
        
        # Default reject
        [Int(1), Return(Int(0))]
    )
    
    return program

def clear_state_program():
    return Return(Int(1))

# ABI spec
ABI_SPEC = {
    "name": "NameRegistry", 
    "description": "DeSci Name Registry for human-readable names on Algorand",
    "methods": [
        {
            "name": "register",
            "args": [
                {"type": "string", "name": "name", "desc": "Name to register"},
                {"type": "string", "name": "cid", "desc": "IPFS CID"}, 
                {"type": "string", "name": "price", "desc": "Price in microAlgos"}
            ],
            "returns": {"type": "void"}
        },
        {
            "name": "resolve", 
            "args": [{"type": "string", "name": "name", "desc": "Name to resolve"}],
            "returns": {"type": "void", "desc": "Data returned via logs"}
        },
        {
            "name": "update",
            "args": [
                {"type": "string", "name": "name", "desc": "Name to update"},
                {"type": "string", "name": "cid", "desc": "New IPFS CID"},
                {"type": "string", "name": "price", "desc": "New price"}
            ], 
            "returns": {"type": "void"}
        },
        {
            "name": "delete",
            "args": [{"type": "string", "name": "name", "desc": "Name to delete"}],
            "returns": {"type": "void"}
        }
    ]
}

if __name__ == "__main__":
    import json
    
    with open("name_registry_approval.teal", "w") as f:
        f.write(compileTeal(approval_program(), Mode.Application, version=8))
    
    with open("name_registry_clear.teal", "w") as f:
        f.write(compileTeal(clear_state_program(), Mode.Application, version=8))
        
    with open("name_registry.json", "w") as f:
        json.dump(ABI_SPEC, f, indent=2)
    
    print("✅ NameRegistry contracts compiled successfully!")
    print("   - name_registry_approval.teal")
    print("   - name_registry_clear.teal")
    print("   - name_registry.json")