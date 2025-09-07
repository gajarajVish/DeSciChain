"""
Escrow Smart Contract for DeSciFi
Production-ready contract for managing payment escrow in model purchases
"""

from pyteal import *

def approval_program():
    """Main approval program for Escrow contract with real fund management"""
    
    # Global state keys
    escrow_count_key = Bytes("escrow_count")
    
    # Helper function to get escrow-specific keys
    def escrow_key(escrow_id: Expr, suffix: bytes) -> Expr:
        return Concat(Bytes(suffix), Itob(escrow_id))
    
    # Escrow status constants
    STATUS_PENDING = Int(0)
    STATUS_RELEASED = Int(1)
    STATUS_REFUNDED = Int(2)
    
    # Initialize application
    on_creation = Seq([
        App.globalPut(escrow_count_key, Int(0)),
        Return(Int(1))
    ])
    
    # Create escrow method
    create_escrow = Seq([
        # Validate inputs
        Assert(Txn.application_args.length() == Int(4)),  # method + 3 params
        Assert(Global.group_size() == Int(2)),  # Payment + App call
        Assert(Gtxn[0].type_enum() == TxnType.Payment),  # First txn is payment
        Assert(Gtxn[1].type_enum() == TxnType.ApplicationCall),  # Second is app call
        
        # Validate payment is to this contract
        Assert(Gtxn[0].receiver() == Global.current_application_address()),
        Assert(Gtxn[0].amount() > Int(0)),
        
        # Validate payment amount matches the specified price
        Assert(Gtxn[0].amount() == Btoi(Txn.application_args[3])),  # Price argument
        
        # Increment escrow count
        App.globalPut(escrow_count_key, App.globalGet(escrow_count_key) + Int(1)),
        
        # Store escrow data using the new escrow ID
        App.globalPut(
            escrow_key(App.globalGet(escrow_count_key), b"model_"), 
            Btoi(Txn.application_args[1])
        ),
        App.globalPut(
            escrow_key(App.globalGet(escrow_count_key), b"buyer_"), 
            Gtxn[0].sender()
        ),
        App.globalPut(
            escrow_key(App.globalGet(escrow_count_key), b"publisher_"), 
            Txn.application_args[2]
        ),
        App.globalPut(
            escrow_key(App.globalGet(escrow_count_key), b"amount_"), 
            Gtxn[0].amount()
        ),
        App.globalPut(
            escrow_key(App.globalGet(escrow_count_key), b"status_"), 
            STATUS_PENDING
        ),
        App.globalPut(
            escrow_key(App.globalGet(escrow_count_key), b"created_"), 
            Itob(Global.latest_timestamp())
        ),
        
        # Log escrow creation
        Log(Concat(
            Bytes("ESCROW_CREATED:"),
            Itob(App.globalGet(escrow_count_key)),
            Bytes(":"),
            Txn.application_args[1],
            Bytes(":"),
            Gtxn[0].sender(),
            Bytes(":"),
            Itob(Gtxn[0].amount())
        )),
        
        Return(Int(1))
    ])
    
    # Release payment method
    release_payment = Seq([
        # Validate inputs
        Assert(Txn.application_args.length() == Int(2)),
        Assert(Btoi(Txn.application_args[1]) > Int(0)),
        Assert(Btoi(Txn.application_args[1]) <= App.globalGet(escrow_count_key)),
        
        # Validate escrow state and permissions
        Assert(App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"status_")) == STATUS_PENDING),
        Assert(Txn.sender() == App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"publisher_"))),
        Assert(App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"amount_")) > Int(0)),
        
        # Update status first (prevent reentrancy)
        App.globalPut(
            escrow_key(Btoi(Txn.application_args[1]), b"status_"), 
            STATUS_RELEASED
        ),
        App.globalPut(
            escrow_key(Btoi(Txn.application_args[1]), b"released_"), 
            Itob(Global.latest_timestamp())
        ),
        
        # Send payment to publisher
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"publisher_")),
            TxnField.amount: App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"amount_")) - Int(1000),
            TxnField.fee: Int(0)
        }),
        InnerTxnBuilder.Submit(),
        
        # Log payment release
        Log(Concat(
            Bytes("PAYMENT_RELEASED:"),
            Txn.application_args[1],
            Bytes(":"),
            App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"publisher_")),
            Bytes(":"),
            Itob(App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"amount_")))
        )),
        
        Return(Int(1))
    ])
    
    # Refund payment method
    refund_payment = Seq([
        # Validate inputs
        Assert(Txn.application_args.length() == Int(2)),
        Assert(Btoi(Txn.application_args[1]) > Int(0)),
        Assert(Btoi(Txn.application_args[1]) <= App.globalGet(escrow_count_key)),
        
        # Validate escrow state
        Assert(App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"status_")) == STATUS_PENDING),
        Assert(App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"amount_")) > Int(0)),
        
        # Validate permissions (buyer can refund, or anyone after 7 days)
        Assert(
            Or(
                Txn.sender() == App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"buyer_")),
                Global.latest_timestamp() > Btoi(App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"created_"))) + Int(604800)
            )
        ),
        
        # Update status first (prevent reentrancy)
        App.globalPut(
            escrow_key(Btoi(Txn.application_args[1]), b"status_"), 
            STATUS_REFUNDED
        ),
        App.globalPut(
            escrow_key(Btoi(Txn.application_args[1]), b"refunded_"), 
            Itob(Global.latest_timestamp())
        ),
        
        # Send refund to buyer
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"buyer_")),
            TxnField.amount: App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"amount_")) - Int(1000),
            TxnField.fee: Int(0)
        }),
        InnerTxnBuilder.Submit(),
        
        # Log refund
        Log(Concat(
            Bytes("PAYMENT_REFUNDED:"),
            Txn.application_args[1],
            Bytes(":"),
            App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"buyer_")),
            Bytes(":"),
            Itob(App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"amount_")))
        )),
        
        Return(Int(1))
    ])
    
    # Get escrow status method
    get_escrow_status = Seq([
        # Validate inputs
        Assert(Txn.application_args.length() == Int(2)),
        Assert(Btoi(Txn.application_args[1]) > Int(0)),
        Assert(Btoi(Txn.application_args[1]) <= App.globalGet(escrow_count_key)),
        
        # Return data via structured logs
        Log(Concat(Bytes("ESCROW_STATUS:"), Txn.application_args[1])),
        Log(Concat(Bytes("MODEL_ID:"), Itob(App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"model_"))))),
        Log(Concat(Bytes("BUYER:"), App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"buyer_")))),
        Log(Concat(Bytes("PUBLISHER:"), App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"publisher_")))),
        Log(Concat(Bytes("AMOUNT:"), Itob(App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"amount_"))))),
        Log(Concat(Bytes("STATUS:"), Itob(App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"status_"))))),
        Log(Concat(Bytes("CREATED:"), App.globalGet(escrow_key(Btoi(Txn.application_args[1]), b"created_")))),
        
        Return(Int(1))
    ])
    
    # Get escrow count method
    get_escrow_count = Seq([
        Log(Concat(Bytes("ESCROW_COUNT:"), Itob(App.globalGet(escrow_count_key)))),
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
            Txn.application_args[0] == Bytes("create_escrow")
        ), create_escrow],
        
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args.length() >= Int(1),
            Txn.application_args[0] == Bytes("release_payment")
        ), release_payment],
        
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args.length() >= Int(1),
            Txn.application_args[0] == Bytes("refund_payment")
        ), refund_payment],
        
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args.length() >= Int(1),
            Txn.application_args[0] == Bytes("get_escrow_status")
        ), get_escrow_status],
        
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args.length() >= Int(1),
            Txn.application_args[0] == Bytes("get_escrow_count")
        ), get_escrow_count],
        
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
    "name": "Escrow",
    "description": "Smart contract for managing payment escrow in model purchases",
    "methods": [
        {
            "name": "create_escrow",
            "args": [
                {"type": "uint64", "name": "model_id", "desc": "Model ID being purchased"},
                {"type": "address", "name": "publisher", "desc": "Publisher address"},
                {"type": "uint64", "name": "price", "desc": "Price in microAlgos"}
            ],
            "returns": {"type": "void", "desc": "Escrow created with payment"}
        },
        {
            "name": "release_payment",
            "args": [
                {"type": "uint64", "name": "escrow_id", "desc": "Escrow ID to release"}
            ],
            "returns": {"type": "void", "desc": "Payment released to publisher"}
        },
        {
            "name": "refund_payment",
            "args": [
                {"type": "uint64", "name": "escrow_id", "desc": "Escrow ID to refund"}
            ],
            "returns": {"type": "void", "desc": "Payment refunded to buyer"}
        },
        {
            "name": "get_escrow_status",
            "args": [
                {"type": "uint64", "name": "escrow_id", "desc": "Escrow ID to check"}
            ],
            "returns": {"type": "void", "desc": "Escrow details returned via logs"}
        },
        {
            "name": "get_escrow_count",
            "args": [],
            "returns": {"type": "void", "desc": "Total number of escrows returned via logs"}
        }
    ]
}

if __name__ == "__main__":
    import json
    
    # Compile the contracts
    with open("escrow_approval.teal", "w") as f:
        f.write(compileTeal(approval_program(), Mode.Application, version=8))
    
    with open("escrow_clear.teal", "w") as f:
        f.write(compileTeal(clear_state_program(), Mode.Application, version=8))
    
    # Write ABI specification
    with open("escrow.json", "w") as f:
        json.dump(ABI_SPEC, f, indent=2)
    
    print("✅ Escrow contracts compiled successfully!")
    print("   - escrow_approval.teal")
    print("   - escrow_clear.teal") 
    print("   - escrow.json (ABI spec)")