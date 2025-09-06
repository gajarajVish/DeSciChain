"""
Escrow Smart Contract for DeSciChain
Manages payment escrow for model purchases
"""

from pyteal import *

def approval_program():
    """Main approval program for Escrow contract"""
    
    # Global state keys
    escrow_model_id_key = Bytes("escrow_model_id")
    escrow_buyer_key = Bytes("escrow_buyer")
    escrow_price_key = Bytes("escrow_price")
    escrow_status_key = Bytes("escrow_status")
    escrow_publisher_key = Bytes("escrow_publisher")
    
    # Status constants
    PENDING = Int(0)
    COMPLETED = Int(1)
    REFUNDED = Int(2)
    
    # Application creation
    on_creation = Seq([
        # Initialize escrow state
        App.globalPut(escrow_status_key, PENDING),
        Return(Int(1))
    ])
    
    # Create escrow function
    def create_escrow():
        model_id = ScratchVar(TealType.uint64)
        buyer = ScratchVar(TealType.bytes)
        price = ScratchVar(TealType.uint64)
        
        return Seq([
            # Get parameters
            model_id.store(Btoi(Txn.application_args[1])),
            buyer.store(Txn.accounts[1]),  # Buyer account
            price.store(Btoi(Txn.application_args[2])),
            
            # Store escrow data
            App.globalPut(escrow_model_id_key, model_id.load()),
            App.globalPut(escrow_buyer_key, buyer.load()),
            App.globalPut(escrow_price_key, price.load()),
            App.globalPut(escrow_publisher_key, Txn.sender()),
            App.globalPut(escrow_status_key, PENDING),
            
            Return(Int(1))
        ])
    
    # Release payment function
    def release_payment():
        return Seq([
            # Check if escrow is pending
            Assert(App.globalGet(escrow_status_key) == PENDING),
            
            # Verify caller is publisher
            Assert(Txn.sender() == App.globalGet(escrow_publisher_key)),
            
            # Update status
            App.globalPut(escrow_status_key, COMPLETED),
            
            # Send payment to publisher
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.Payment,
                TxnField.sender: Global.current_application_address(),
                TxnField.receiver: App.globalGet(escrow_publisher_key),
                TxnField.amount: App.globalGet(escrow_price_key),
                TxnField.fee: Int(0)
            }),
            InnerTxnBuilder.Submit(),
            
            Return(Int(1))
        ])
    
    # Refund function
    def refund():
        return Seq([
            # Check if escrow is pending
            Assert(App.globalGet(escrow_status_key) == PENDING),
            
            # Verify caller is buyer
            Assert(Txn.sender() == App.globalGet(escrow_buyer_key)),
            
            # Update status
            App.globalPut(escrow_status_key, REFUNDED),
            
            # Send payment back to buyer
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.Payment,
                TxnField.sender: Global.current_application_address(),
                TxnField.receiver: App.globalGet(escrow_buyer_key),
                TxnField.amount: App.globalGet(escrow_price_key),
                TxnField.fee: Int(0)
            }),
            InnerTxnBuilder.Submit(),
            
            Return(Int(1))
        ])
    
    # Get escrow status function
    def get_escrow_status():
        model_id = ScratchVar(TealType.uint64)
        buyer = ScratchVar(TealType.bytes)
        price = ScratchVar(TealType.uint64)
        status = ScratchVar(TealType.uint64)
        publisher = ScratchVar(TealType.bytes)
        
        return Seq([
            model_id.store(App.globalGet(escrow_model_id_key)),
            buyer.store(App.globalGet(escrow_buyer_key)),
            price.store(App.globalGet(escrow_price_key)),
            status.store(App.globalGet(escrow_status_key)),
            publisher.store(App.globalGet(escrow_publisher_key)),
            
            # Log escrow data
            Log(Concat(Bytes("ModelID:"), Itob(model_id.load()))),
            Log(Concat(Bytes("Buyer:"), buyer.load())),
            Log(Concat(Bytes("Price:"), Itob(price.load()))),
            Log(Concat(Bytes("Status:"), Itob(status.load()))),
            Log(Concat(Bytes("Publisher:"), publisher.load())),
            
            Return(Int(1))
        ])
    
    # Main program logic
    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.NoOp, 
         Cond(
             [Txn.application_args[0] == Bytes("create"), create_escrow()],
             [Txn.application_args[0] == Bytes("release"), release_payment()],
             [Txn.application_args[0] == Bytes("refund"), refund()],
             [Txn.application_args[0] == Bytes("status"), get_escrow_status()],
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
    with open("escrow_approval.teal", "w") as f:
        f.write(compileTeal(approval_program(), Mode.Application, version=6))
    
    with open("escrow_clear.teal", "w") as f:
        f.write(compileTeal(clear_state_program(), Mode.Application, version=6))
    
    print("Escrow contracts compiled successfully!")
