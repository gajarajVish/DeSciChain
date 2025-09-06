/**
 * Blockchain Service
 * Handles Algorand blockchain interactions
 */

class BlockchainService {
    constructor() {
        this.algodClient = null;
        this.indexerClient = null;
        this.wallet = null;
    }

    async initialize() {
        try {
            // Initialize Algorand clients
            this.algodClient = new window.algosdk.Algodv2(
                process.env.ALGOD_TOKEN || '',
                process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud'
            );
            
            this.indexerClient = new window.algosdk.Indexer(
                process.env.INDEXER_TOKEN || '',
                process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud'
            );

            return true;
        } catch (error) {
            console.error('Failed to initialize blockchain service:', error);
            return false;
        }
    }

    async connectWallet() {
        try {
            // Check if Pera Wallet is available
            if (typeof window.PeraWalletConnect === 'undefined') {
                throw new Error('Pera Wallet not installed. Please install it from the Chrome Web Store.');
            }

            this.wallet = new window.PeraWalletConnect({
                chainId: 416002, // TestNet
                shouldShowSignTxnToast: true
            });

            const accounts = await this.wallet.connect();
            
            if (accounts.length > 0) {
                return {
                    connected: true,
                    address: accounts[0],
                    accounts: accounts
                };
            } else {
                throw new Error('No accounts found');
            }
        } catch (error) {
            console.error('Wallet connection failed:', error);
            throw error;
        }
    }

    async disconnectWallet() {
        if (this.wallet) {
            await this.wallet.disconnect();
            this.wallet = null;
        }
    }

    async getAccountBalance(address) {
        try {
            const accountInfo = await this.algodClient.accountInformation(address).do();
            return {
                balance: accountInfo.amount,
                balanceAlgo: accountInfo.amount / 1000000 // Convert microAlgos to Algos
            };
        } catch (error) {
            console.error('Failed to get account balance:', error);
            throw error;
        }
    }

    async getTransactionStatus(txnId) {
        try {
            const txnInfo = await this.algodClient.pendingTransactionInformation(txnId).do();
            
            return {
                confirmed: !!txnInfo['confirmed-round'],
                block: txnInfo['confirmed-round'],
                txnId: txnId
            };
        } catch (error) {
            console.error('Failed to get transaction status:', error);
            return {
                confirmed: false,
                txnId: txnId,
                error: error.message
            };
        }
    }

    async waitForConfirmation(txnId, timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const status = await this.getTransactionStatus(txnId);
            if (status.confirmed) {
                return status;
            }
            
            // Wait 1 second before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return {
            confirmed: false,
            txnId: txnId,
            error: 'Transaction confirmation timeout'
        };
    }

    async signTransaction(transaction) {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }

        try {
            const signedTxn = await this.wallet.signTransaction([transaction]);
            return signedTxn[0];
        } catch (error) {
            console.error('Failed to sign transaction:', error);
            throw error;
        }
    }

    async sendTransaction(signedTransaction) {
        try {
            const txnId = await this.algodClient.sendRawTransaction(signedTransaction).do();
            return txnId;
        } catch (error) {
            console.error('Failed to send transaction:', error);
            throw error;
        }
    }

    async createPaymentTransaction(from, to, amount, note = '') {
        try {
            const params = await this.algodClient.getTransactionParams().do();
            
            const transaction = window.algosdk.makePaymentTxnWithSuggestedParams(
                from,
                to,
                amount,
                undefined,
                note,
                params
            );

            return transaction;
        } catch (error) {
            console.error('Failed to create payment transaction:', error);
            throw error;
        }
    }

    async createAssetTransferTransaction(from, to, assetId, amount) {
        try {
            const params = await this.algodClient.getTransactionParams().do();
            
            const transaction = window.algosdk.makeAssetTransferTxnWithSuggestedParams(
                from,
                to,
                undefined,
                undefined,
                amount,
                note,
                assetId,
                params
            );

            return transaction;
        } catch (error) {
            console.error('Failed to create asset transfer transaction:', error);
            throw error;
        }
    }

    async getAccountAssets(address) {
        try {
            const accountInfo = await this.algodClient.accountInformation(address).do();
            return accountInfo.assets || [];
        } catch (error) {
            console.error('Failed to get account assets:', error);
            throw error;
        }
    }

    async getAssetInfo(assetId) {
        try {
            const assetInfo = await this.algodClient.getAssetByID(assetId).do();
            return assetInfo;
        } catch (error) {
            console.error('Failed to get asset info:', error);
            throw error;
        }
    }

    // Utility methods
    formatAlgoAmount(microAlgos) {
        return microAlgos / 1000000;
    }

    formatMicroAlgoAmount(algos) {
        return Math.round(algos * 1000000);
    }

    isValidAddress(address) {
        try {
            return window.algosdk.isValidAddress(address);
        } catch (error) {
            return false;
        }
    }
}

// Export singleton instance
window.blockchainService = new BlockchainService();
