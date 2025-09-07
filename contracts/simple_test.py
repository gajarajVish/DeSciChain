from pyteal import *

def simple_approval():
    return Cond(
        [Txn.application_id() == Int(0), Return(Int(1))],
        [Txn.on_completion() == OnComplete.NoOp, Return(Int(1))],
        [Int(1), Return(Int(0))]
    )

if __name__ == "__main__":
    teal = compileTeal(simple_approval(), Mode.Application, version=8)
    print("Simple contract compiled successfully!")
    print(f"Length: {len(teal)}")
