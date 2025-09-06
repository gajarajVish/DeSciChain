/**
 * Blockchain Service for DeSciChain
 * Handles Algorand blockchain interactions
 */
export interface BlockchainConfig {
    algodToken: string;
    algodServer: string;
    indexerToken: string;
    indexerServer: string;
    modelRegistryAppId: number;
    escrowAppId: number;
}
export interface ModelRegistration {
    cid: string;
    publisher: string;
    licenseTerms: string;
    modelId?: number;
    txnId?: string;
}
export interface EscrowCreation {
    modelId: number;
    buyer: string;
    price: number;
    txnId?: string;
}
export interface TransactionStatus {
    confirmed: boolean;
    txnId: string;
    block?: number;
    error?: string;
}
export declare class BlockchainService {
    private algodClient;
    private indexerClient;
    private modelRegistryClient;
    private escrowClient;
    private config;
    constructor(config: BlockchainConfig);
    /**
     * Register a model on the blockchain
     */
    registerModel(cid: string, publisher: string, licenseTerms: string, publisherPrivateKey: Uint8Array): Promise<ModelRegistration>;
    /**
     * Get model information from blockchain
     */
    getModel(modelId: number): Promise<ModelRegistration | null>;
    /**
     * Create escrow for model purchase
     */
    createEscrow(modelId: number, buyer: string, price: number, buyerPrivateKey: Uint8Array): Promise<EscrowCreation>;
    /**
     * Release payment from escrow
     */
    releasePayment(modelId: number, publisherPrivateKey: Uint8Array): Promise<string>;
    /**
     * Refund payment from escrow
     */
    refundPayment(modelId: number, buyerPrivateKey: Uint8Array): Promise<string>;
    /**
     * Check transaction status
     */
    checkTransactionStatus(txnId: string): Promise<TransactionStatus>;
    /**
     * Get account balance
     */
    getAccountBalance(address: string): Promise<number>;
    /**
     * Wait for transaction confirmation
     */
    waitForConfirmation(txnId: string, timeout?: number): Promise<TransactionStatus>;
    /**
     * Convert CID to integer (simplified implementation)
     */
    private cidToInt;
    /**
     * Parse model logs to extract model data
     */
    private parseModelLogs;
}
//# sourceMappingURL=blockchain.service.d.ts.map