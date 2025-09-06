"""
ModelRegistry Smart Contract for DeSciChain
Manages model registration and metadata on Algorand blockchain
"""

from pyteal import *

def approval_program():
    """Main approval program for ModelRegistry contract"""
    
    # Global state keys
    model_count_key = Bytes("model_count")
    model_cid_key = Bytes("model_cid")
    model_publisher_key = Bytes("model_publisher")
    model_license_key = Bytes("model_license")
    
    # Application creation
    on_creation = Seq([
        App.globalPut(model_count_key, Int(0)),
        Return(Int(1))
    ])
    
    # Publish model function
    def publish_model():
        model_count = ScratchVar(TealType.uint64)
        model_id = ScratchVar(TealType.uint64)
        
        return Seq([
            # Get current model count
            model_count.store(App.globalGet(model_count_key)),
            
            # Calculate new model ID
            model_id.store(model_count.load() + Int(1)),
            
            # Increment model count
            App.globalPut(model_count_key, model_id.load()),
            
            # Store model data - using application arguments correctly
            App.globalPut(Concat(model_cid_key, Itob(model_id.load())), Txn.application_args[1]),
            App.globalPut(Concat(model_publisher_key, Itob(model_id.load())), Txn.sender()),
            App.globalPut(Concat(model_license_key, Itob(model_id.load())), Txn.application_args[2]),
            
            # Return success
            Return(Int(1))
        ])
    
    # Get model function
    def get_model():
        model_id = ScratchVar(TealType.uint64)
        cid = ScratchVar(TealType.bytes)
        publisher = ScratchVar(TealType.bytes)
        license_var = ScratchVar(TealType.bytes)
        
        return Seq([
            model_id.store(Btoi(Txn.application_args[1])),
            
            # Get model data
            cid.store(App.globalGet(Concat(model_cid_key, Itob(model_id.load())))),
            publisher.store(App.globalGet(Concat(model_publisher_key, Itob(model_id.load())))),
            license_var.store(App.globalGet(Concat(model_license_key, Itob(model_id.load())))),
            
            # Return data as log
            Log(Concat(Bytes("ModelID:"), Itob(model_id.load()))),
            Log(Concat(Bytes("CID:"), cid.load())),
            Log(Concat(Bytes("Publisher:"), publisher.load())),
            Log(Concat(Bytes("License:"), license_var.load())),
            
            Return(Int(1))
        ])
    
    # Main program logic
    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.NoOp, 
         Cond(
             [Txn.application_args[0] == Bytes("publish"), publish_model()],
             [Txn.application_args[0] == Bytes("get"), get_model()],
             [Int(1), Return(Int(0))]
         )],
        [Txn.on_completion() == OnComplete.OptIn, Return(Int(1))],
        [Txn.on_completion() == OnComplete.CloseOut, Return(Int(1))],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Int(0))],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Int(0))],
        [Int(1), Return(Int(0))]
    )
    
    return program

def clear_state_program():
    """Clear state program"""
    return Return(Int(1))

if __name__ == "__main__":
    # Compile the contract
    with open("model_registry_approval.teal", "w") as f:
        f.write(compileTeal(approval_program(), Mode.Application, version=6))
    
    with open("model_registry_clear.teal", "w") as f:
        f.write(compileTeal(clear_state_program(), Mode.Application, version=6))
    
    print("ModelRegistry contracts compiled successfully!")
