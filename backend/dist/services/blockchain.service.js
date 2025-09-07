"use strict";
/**
 * Secure Blockchain Service for DeSciChain
 * Builds unsigned transactions for wallet signing - NO private keys handled server-side
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainService = void 0;
const algosdk_1 = require("algosdk");
class BlockchainService {
    constructor(config) {
        this.config = config;
        this.algodClient = new algosdk_1.Algodv2(config.algodToken, config.algodServer);
        this.indexerClient = new algosdk_1.Indexer(config.indexerToken, config.indexerServer);
    }
    /**
     * Build unsigned transaction for model registration
     * Returns transaction for wallet to sign
     */
    async buildModelRegistrationTransaction(publisherAddress, cid, licenseTerms) {
        try {
            const params = await this.algodClient.getTransactionParams().do();
            const transaction = (0, algosdk_1.makeApplicationCallTxnFromObject)({
                from: publisherAddress,
                suggestedParams: params,
                appIndex: this.config.modelRegistryAppId,
                onComplete: algosdk_1.OnApplicationComplete.NoOpOC,
                appArgs: [
                    new TextEncoder().encode('publish_model'),
                    new TextEncoder().encode(cid),
                    new TextEncoder().encode(publisherAddress),
                    new TextEncoder().encode(licenseTerms)
                ]
            });
            return {
                transaction,
                description: `Register ML model with CID: ${cid}`
            };
        }
        catch (error) {
            throw new Error(`Failed to build model registration transaction: ${error.message}`);
        }
    }
    /**
     * Build unsigned transaction group for model purchase
     * Returns payment + escrow creation transactions for wallet to sign
     */
    async buildModelPurchaseTransactions(buyerAddress, modelId, publisherAddress, priceInMicroAlgos) {
        try {
            const params = await this.algodClient.getTransactionParams().do();
            const escrowAppAddress = (0, algosdk_1.getApplicationAddress)(this.config.escrowAppId);
            // Payment transaction to escrow contract
            const paymentTxn = (0, algosdk_1.makePaymentTxnWithSuggestedParams)(buyerAddress, escrowAppAddress, priceInMicroAlgos, undefined, new TextEncoder().encode(`Purchase model ${modelId}`), params);
            // Escrow creation application call
            const escrowTxn = (0, algosdk_1.makeApplicationCallTxnFromObject)({
                from: buyerAddress,
                suggestedParams: params,
                appIndex: this.config.escrowAppId,
                onComplete: algosdk_1.OnApplicationComplete.NoOpOC,
                appArgs: [
                    new TextEncoder().encode('create_escrow'),
                    (0, algosdk_1.encodeUint64)(modelId),
                    new TextEncoder().encode(publisherAddress),
                    (0, algosdk_1.encodeUint64)(priceInMicroAlgos)
                ]
            });
            // Group transactions
            const transactions = [paymentTxn, escrowTxn];
            (0, algosdk_1.assignGroupID)(transactions);
            return {
                transactions,
                descriptions: [
                    `Payment of ${priceInMicroAlgos / 1000000} ALGO for model ${modelId}`,
                    `Create escrow for model ${modelId} purchase`
                ]
            };
        }
        catch (error) {
            throw new Error(`Failed to build purchase transactions: ${error.message}`);
        }
    }
    /**
     * Build unsigned transaction for payment release
     */
    async buildPaymentReleaseTransaction(publisherAddress, escrowId) {
        try {
            const params = await this.algodClient.getTransactionParams().do();
            const transaction = (0, algosdk_1.makeApplicationCallTxnFromObject)({
                from: publisherAddress,
                suggestedParams: params,
                appIndex: this.config.escrowAppId,
                onComplete: algosdk_1.OnApplicationComplete.NoOpOC,
                appArgs: [
                    new TextEncoder().encode('release_payment'),
                    (0, algosdk_1.encodeUint64)(escrowId)
                ]
            });
            return {
                transaction,
                description: `Release payment for escrow ${escrowId}`
            };
        }
        catch (error) {
            throw new Error(`Failed to build payment release transaction: ${error.message}`);
        }
    }
    /**
     * Build unsigned transaction for payment refund
     */
    async buildPaymentRefundTransaction(buyerAddress, escrowId) {
        try {
            const params = await this.algodClient.getTransactionParams().do();
            const transaction = (0, algosdk_1.makeApplicationCallTxnFromObject)({
                from: buyerAddress,
                suggestedParams: params,
                appIndex: this.config.escrowAppId,
                onComplete: algosdk_1.OnApplicationComplete.NoOpOC,
                appArgs: [
                    new TextEncoder().encode('refund_payment'),
                    (0, algosdk_1.encodeUint64)(escrowId)
                ]
            });
            return {
                transaction,
                description: `Refund payment for escrow ${escrowId}`
            };
        }
        catch (error) {
            throw new Error(`Failed to build payment refund transaction: ${error.message}`);
        }
    }
    /**
     * Submit signed transaction to the network
     */
    async submitSignedTransaction(signedTransaction) {
        try {
            const result = await this.algodClient.sendRawTransaction(signedTransaction).do();
            return result.txId;
        }
        catch (error) {
            throw new Error(`Failed to submit transaction: ${error.message}`);
        }
    }
    /**
     * Submit signed transaction group to the network
     */
    async submitSignedTransactionGroup(signedTransactions) {
        try {
            const result = await this.algodClient.sendRawTransaction(signedTransactions).do();
            return result.txId;
        }
        catch (error) {
            throw new Error(`Failed to submit transaction group: ${error.message}`);
        }
    }
    /**
     * Get model information by calling the smart contract
     */
    async getModel(modelId, callerAddress) {
        try {
            const params = await this.algodClient.getTransactionParams().do();
            const transaction = (0, algosdk_1.makeApplicationCallTxnFromObject)({
                from: callerAddress,
                suggestedParams: params,
                appIndex: this.config.modelRegistryAppId,
                onComplete: algosdk_1.OnApplicationComplete.NoOpOC,
                appArgs: [
                    new TextEncoder().encode('get_model'),
                    (0, algosdk_1.encodeUint64)(modelId)
                ]
            });
            // This would need to be signed and submitted, then logs parsed
            // For now, we'll use the indexer to get historical data
            return this.getModelFromIndexer(modelId);
        }
        catch (error) {
            console.error(`Failed to get model ${modelId}:`, error);
            return null;
        }
    }
    /**
     * Get model information from indexer (read-only)
     */
    async getModelFromIndexer(modelId) {
        try {
            // Query indexer for application transactions
            const txnQuery = await this.indexerClient
                .searchForTransactions()
                .applicationID(this.config.modelRegistryAppId)
                .txType('appl')
                .limit(1000)
                .do();
            // Find the transaction that published this model
            for (const txn of txnQuery.transactions) {
                if (txn.logs) {
                    const modelData = this.parseModelLogs(txn.logs);
                    if (modelData && modelData.id === modelId) {
                        return modelData;
                    }
                }
            }
            return null;
        }
        catch (error) {
            console.error(`Failed to get model from indexer:`, error);
            return null;
        }
    }
    /**
     * Get escrow status by calling the smart contract
     */
    async getEscrowStatus(escrowId, callerAddress) {
        try {
            const params = await this.algodClient.getTransactionParams().do();
            const transaction = (0, algosdk_1.makeApplicationCallTxnFromObject)({
                from: callerAddress,
                suggestedParams: params,
                appIndex: this.config.escrowAppId,
                onComplete: algosdk_1.OnApplicationComplete.NoOpOC,
                appArgs: [
                    new TextEncoder().encode('get_escrow_status'),
                    (0, algosdk_1.encodeUint64)(escrowId)
                ]
            });
            // This would need to be signed and submitted, then logs parsed
            // For now, we'll return a placeholder
            return { escrowId, status: 'pending' };
        }
        catch (error) {
            console.error(`Failed to get escrow status:`, error);
            return null;
        }
    }
    /**
     * Wait for transaction confirmation with detailed status
     */
    async waitForConfirmation(txnId, timeout = 20000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                const txnInfo = await this.algodClient.pendingTransactionInformation(txnId).do();
                if (txnInfo['confirmed-round']) {
                    return {
                        confirmed: true,
                        txnId,
                        block: txnInfo['confirmed-round'],
                        logs: this.decodeLogs(txnInfo.logs || [])
                    };
                }
            }
            catch (error) {
                // Transaction might not be found yet, continue waiting
            }
            // Wait 1 second before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return {
            confirmed: false,
            txnId,
            error: 'Transaction confirmation timeout'
        };
    }
    /**
     * Check if transaction is confirmed (quick check)
     */
    async isTransactionConfirmed(txnId) {
        try {
            const txnInfo = await this.algodClient.pendingTransactionInformation(txnId).do();
            return !!txnInfo['confirmed-round'];
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get account balance
     */
    async getAccountBalance(address) {
        try {
            const accountInfo = await this.algodClient.accountInformation(address).do();
            return {
                balance: accountInfo.amount,
                minBalance: accountInfo['min-balance']
            };
        }
        catch (error) {
            throw new Error(`Failed to get account balance: ${error.message}`);
        }
    }
    /**
     * Get network status
     */
    async getNetworkStatus() {
        try {
            return await this.algodClient.status().do();
        }
        catch (error) {
            throw new Error(`Failed to get network status: ${error.message}`);
        }
    }
    /**
     * Get suggested transaction parameters
     */
    async getSuggestedParams() {
        try {
            return await this.algodClient.getTransactionParams().do();
        }
        catch (error) {
            throw new Error(`Failed to get suggested params: ${error.message}`);
        }
    }
    /**
     * Decode logs from base64
     */
    decodeLogs(logs) {
        return logs.map(log => {
            try {
                return new TextDecoder().decode(Buffer.from(log, 'base64'));
            }
            catch (error) {
                return log;
            }
        });
    }
    /**
     * Parse model logs to extract model data
     */
    parseModelLogs(logs) {
        try {
            const decodedLogs = this.decodeLogs(logs);
            let id = 0;
            let cid = '';
            let publisher = '';
            let licenseTerms = '';
            let timestamp = 0;
            for (const log of decodedLogs) {
                if (log.startsWith('MODEL_PUBLISHED:')) {
                    const parts = log.split(':');
                    if (parts.length >= 2) {
                        id = parseInt(parts[1]);
                    }
                }
                else if (log.startsWith('CID:')) {
                    cid = log.substring(4);
                }
                else if (log.startsWith('PUBLISHER:')) {
                    publisher = log.substring(10);
                }
                else if (log.startsWith('LICENSE:')) {
                    licenseTerms = log.substring(8);
                }
                else if (log.startsWith('TIMESTAMP:')) {
                    timestamp = parseInt(log.substring(10));
                }
            }
            if (id && cid && publisher && licenseTerms) {
                return { id, cid, publisher, licenseTerms, timestamp };
            }
            return null;
        }
        catch (error) {
            console.error('Failed to parse model logs:', error);
            return null;
        }
    }
    /**
     * Validate Algorand address
     */
    isValidAddress(address) {
        try {
            // Basic validation - in production use algosdk.isValidAddress
            return address.length === 58 && /^[A-Z2-7]+$/.test(address);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get application address for a given app ID
     */
    getApplicationAddress(appId) {
        return (0, algosdk_1.getApplicationAddress)(appId);
    }
    /**
     * Convert ALGO to microAlgos
     */
    algoToMicroAlgos(algo) {
        return Math.round(algo * 1000000);
    }
    /**
     * Convert microAlgos to ALGO
     */
    microAlgosToAlgo(microAlgos) {
        return microAlgos / 1000000;
    }
}
exports.BlockchainService = BlockchainService;
exports.default = BlockchainService;
//# sourceMappingURL=blockchain.service.js.map