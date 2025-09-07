/**
 * Secure Blockchain Service for DeSciFi
 * Builds unsigned transactions for wallet signing - NO private keys handled server-side
 */
import { Transaction } from 'algosdk';
export interface BlockchainConfig {
    algodToken: string;
    algodServer: string;
    indexerToken: string;
    indexerServer: string;
    modelRegistryAppId: number;
    escrowAppId: number;
}
export interface UnsignedTransaction {
    transaction: Transaction;
    description: string;
}
export interface UnsignedTransactionGroup {
    transactions: Transaction[];
    descriptions: string[];
}
export interface TransactionStatus {
    confirmed: boolean;
    txnId: string;
    block?: number;
    logs?: string[];
    error?: string;
}
export interface ModelData {
    id: number;
    cid: string;
    publisher: string;
    licenseTerms: string;
    timestamp?: number;
}
export declare class BlockchainService {
    private algodClient;
    private indexerClient;
    private config;
    constructor(config: BlockchainConfig);
    /**
     * Build unsigned transaction for model registration
     * Returns transaction for wallet to sign
     */
    buildModelRegistrationTransaction(publisherAddress: string, cid: string, licenseTerms: string): Promise<UnsignedTransaction>;
    /**
     * Build unsigned transaction group for model purchase
     * Returns payment + escrow creation transactions for wallet to sign
     */
    buildModelPurchaseTransactions(buyerAddress: string, modelId: number, publisherAddress: string, priceInMicroAlgos: number): Promise<UnsignedTransactionGroup>;
    /**
     * Build unsigned transaction for payment release
     */
    buildPaymentReleaseTransaction(publisherAddress: string, escrowId: number): Promise<UnsignedTransaction>;
    /**
     * Build unsigned transaction for payment refund
     */
    buildPaymentRefundTransaction(buyerAddress: string, escrowId: number): Promise<UnsignedTransaction>;
    /**
     * Submit signed transaction to the network
     */
    submitSignedTransaction(signedTransaction: Uint8Array): Promise<string>;
    /**
     * Submit signed transaction group to the network
     */
    submitSignedTransactionGroup(signedTransactions: Uint8Array[]): Promise<string>;
    /**
     * Get model information by calling the smart contract
     */
    getModel(modelId: number, callerAddress: string): Promise<ModelData | null>;
    /**
     * Get model information from indexer (read-only)
     */
    getModelFromIndexer(modelId: number): Promise<ModelData | null>;
    /**
     * Get escrow status by calling the smart contract
     */
    getEscrowStatus(escrowId: number, callerAddress: string): Promise<any>;
    /**
     * Wait for transaction confirmation with detailed status
     */
    waitForConfirmation(txnId: string, timeout?: number): Promise<TransactionStatus>;
    /**
     * Check if transaction is confirmed (quick check)
     */
    isTransactionConfirmed(txnId: string): Promise<boolean>;
    /**
     * Get account balance
     */
    getAccountBalance(address: string): Promise<{
        balance: number;
        minBalance: number;
    }>;
    /**
     * Get network status
     */
    getNetworkStatus(): Promise<any>;
    /**
     * Get suggested transaction parameters
     */
    getSuggestedParams(): Promise<any>;
    /**
     * Decode logs from base64
     */
    private decodeLogs;
    /**
     * Parse model logs to extract model data
     */
    private parseModelLogs;
    /**
     * Validate Algorand address
     */
    isValidAddress(address: string): boolean;
    /**
     * Get application address for a given app ID
     */
    getApplicationAddress(appId: number): string;
    /**
     * Convert ALGO to microAlgos
     */
    algoToMicroAlgos(algo: number): number;
    /**
     * Convert microAlgos to ALGO
     */
    microAlgosToAlgo(microAlgos: number): number;
}
export default BlockchainService;
//# sourceMappingURL=blockchain.service.d.ts.map