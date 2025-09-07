"""
Simple DeSci Name Registry - for testing compilation
"""

from pyteal import *

def approval_program():
    # Simple register operation
    register_name = Seq(
        Assert(Txn.application_args.length() == Int(4)),
        App.box_put(
            Txn.application_args[1], 
            Concat(
                Txn.sender(), 
                Itob(Btoi(Txn.application_args[3])), 
                Txn.application_args[2]
            )
        ),
        Log(Concat(Bytes("REGISTERED:"), Txn.application_args[1])),
        Return(Int(1))
    )
    
    # Simple resolve operation  
    resolve_name = Seq(
        Assert(Txn.application_args.length() == Int(2)),
        Assert(App.box_length(Txn.application_args[1]).hasValue()),
        Log(Concat(Bytes("OWNER:"), App.box_extract(Txn.application_args[1], Int(0), Int(32)))),
        Log(Concat(Bytes("PRICE:"), App.box_extract(Txn.application_args[1], Int(32), Int(8)))),
        Log(Concat(Bytes("CID:"), App.box_extract(Txn.application_args[1], Int(40), App.box_length(Txn.application_args[1]).value() - Int(40)))),
        Return(Int(1))
    )
    
    # Main program
    program = Cond(
        [Txn.application_id() == Int(0), Return(Int(1))],
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args[0] == Bytes("register")
        ), register_name],
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args[0] == Bytes("resolve")
        ), resolve_name],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Txn.sender() == Global.creator_address())],
        [Int(1), Return(Int(0))]
    )
    
    return program

def clear_state_program():
    return Return(Int(1))

if __name__ == "__main__":
    with open("name_registry_simple_approval.teal", "w") as f:
        f.write(compileTeal(approval_program(), Mode.Application, version=8))
    
    with open("name_registry_simple_clear.teal", "w") as f:
        f.write(compileTeal(clear_state_program(), Mode.Application, version=8))
    
    print("✅ Simple NameRegistry compiled successfully!")