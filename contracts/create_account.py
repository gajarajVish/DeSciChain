#!/usr/bin/env python3

from algosdk import account, mnemonic

# Generate a new standalone account
private_key, address = account.generate_account()
mnemonic_phrase = mnemonic.from_private_key(private_key)

print("=== New Algorand Testnet Account ===")
print(f"Address: {address}")
print(f"25-word mnemonic: {mnemonic_phrase}")
print("\n=== Next Steps ===")
print("1. Save this mnemonic securely!")
print("2. Go to https://testnet.algoexplorer.io/dispenser")
print("3. Paste your address and get testnet ALGO")
print(f"4. export CREATOR_MNEMONIC=\"{mnemonic_phrase}\"")