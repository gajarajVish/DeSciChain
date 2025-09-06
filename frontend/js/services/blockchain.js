/**
 * Blockchain Service
 * Handles Algorand blockchain interactions with real wallets
 */

class BlockchainService {
    constructor() {
        this.algodClient = null;
        this.indexerClient = null;
        this.peraWallet = null;
        this.deflyWallet = null;
        this.connectedWallet = null;
        this.activeAddress = null;
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

            // Initialize wallets
            await this.initializeWallets();

            return true;
        } catch (error) {
            console.error('Failed to initialize blockchain service:', error);
            throw error;
        }
    }

    async initializeWallets() {
        // Initialize Pera Wallet
        if (typeof window.PeraWalletConnect !== 'undefined') {
            this.peraWallet = new window.PeraWalletConnect({
                chainId: 416002, // TestNet
                shouldShowSignTxnToast: true
            });
        }

        // Initialize Defly Wallet
        if (typeof window.DeflyWalletConnect !== 'undefined') {
            this.deflyWallet = new window.DeflyWalletConnect({
                appId: Date.now() // Unique app ID
            });
        }
    }

    async connectWallet(walletType = 'pera') {
        try {
            let accounts = [];
            let wallet = null;

            switch (walletType) {
                case 'pera':
                    if (!this.peraWallet) {
                        throw new Error('Pera Wallet not available. Please install Pera Wallet extension.');
                    }
                    accounts = await this.peraWallet.connect();
                    this.connectedWallet = 'pera';
                    break;

                case 'defly':
                    if (!this.deflyWallet) {
                        throw new Error('Defly Wallet not available. Please install Defly Wallet.');
                    }
                    const deflyAccounts = await this.deflyWallet.connect();
                    accounts = deflyAccounts.accounts || [];
                    this.connectedWallet = 'defly';
                    break;

                default:
                    throw new Error(`Unsupported wallet type: ${walletType}`);
            }

            if (accounts.length > 0) {
                this.activeAddress = accounts[0];

                return {
                    connected: true,
                    address: accounts[0],
                    accounts: accounts,
                    wallet: walletType
                };
            } else {
                throw new Error('No accounts found in wallet');
            }
        } catch (error) {
            console.error('Wallet connection failed:', error);
            throw error;
        }
    }

    async disconnectWallet() {
        try {
            switch (this.connectedWallet) {
                case 'pera':
                    if (this.peraWallet) {
                        await this.peraWallet.disconnect();
                    }
                    break;
                case 'defly':
                    if (this.deflyWallet) {
                        await this.deflyWallet.disconnect();
                    }
                    break;
            }

            this.connectedWallet = null;
            this.activeAddress = null;
        } catch (error) {
            console.error('Wallet disconnection failed:', error);
        }
    }

    async signTransaction(transaction, walletType = null) {
        const wallet = walletType || this.connectedWallet;

        try {
            switch (wallet) {
                case 'pera':
                    if (!this.peraWallet) throw new Error('Pera Wallet not connected');
                    const peraSigned = await this.peraWallet.signTransaction([transaction]);
                    return peraSigned[0];

                case 'defly':
                    if (!this.deflyWallet) throw new Error('Defly Wallet not connected');
                    const deflySigned = await this.deflyWallet.signTransaction(transaction);
                    return deflySigned;

                default:
                    throw new Error(`Unsupported wallet for signing: ${wallet}`);
            }
        } catch (error) {
            console.error('Transaction signing failed:', error);
            throw error;
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
