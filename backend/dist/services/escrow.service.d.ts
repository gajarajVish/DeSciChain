/**
 * Escrow Service for DeSciChain
 * Manages escrow state and payment processing
 */
import { BlockchainService } from './blockchain.service';
import { EncryptionService } from './encryption.service';
export interface EscrowState {
    modelId: number;
    buyer: string;
    publisher: string;
    price: number;
    status: 'pending' | 'completed' | 'refunded' | 'failed';
    txnId: string;
    createdAt: Date;
    completedAt?: Date;
    encryptionKey?: string;
    encryptionKeyHash?: string;
}
export interface EscrowCreationResult {
    escrowId: string;
    txnId: string;
    status: 'pending';
}
export interface EscrowReleaseResult {
    success: boolean;
    txnId?: string;
    encryptionKey?: string;
    error?: string;
}
export interface EscrowRefundResult {
    success: boolean;
    txnId?: string;
    error?: string;
}
export declare class EscrowService {
    private blockchainService;
    private encryptionService;
    private escrowStates;
    constructor(blockchainService: BlockchainService, encryptionService: EncryptionService);
    /**
     * Create a new escrow for model purchase
     */
    createEscrow(modelId: number, buyer: string, publisher: string, price: number, buyerPrivateKey: Uint8Array, encryptionKey?: string): Promise<EscrowCreationResult>;
    /**
     * Release payment from escrow
     */
    releasePayment(escrowId: string, publisherPrivateKey: Uint8Array, encryptionKey?: string): Promise<EscrowReleaseResult>;
    /**
     * Refund payment from escrow
     */
    refundPayment(escrowId: string, buyerPrivateKey: Uint8Array): Promise<EscrowRefundResult>;
    /**
     * Get escrow state
     */
    getEscrowState(escrowId: string): EscrowState | null;
    /**
     * Get escrow state by model ID and buyer
     */
    getEscrowByModelAndBuyer(modelId: number, buyer: string): EscrowState | null;
    /**
     * List all escrows for a buyer
     */
    getEscrowsByBuyer(buyer: string): EscrowState[];
    /**
     * List all escrows for a publisher
     */
    getEscrowsByPublisher(publisher: string): EscrowState[];
    /**
     * Check if escrow is ready for release
     */
    isEscrowReadyForRelease(escrowId: string): Promise<boolean>;
    /**
     * Monitor escrow status and auto-release when ready
     */
    monitorEscrow(escrowId: string, publisherPrivateKey: Uint8Array): Promise<void>;
    /**
     * Verify encryption key for escrow
     */
    verifyEncryptionKey(escrowId: string, encryptionKey: string): boolean;
    /**
     * Get encryption key for completed escrow
     */
    getEncryptionKey(escrowId: string): string | null;
    /**
     * Update escrow status based on blockchain state
     */
    updateEscrowStatus(escrowId: string): Promise<void>;
    /**
     * Clean up old escrows
     */
    cleanupOldEscrows(maxAgeHours?: number): void;
    /**
     * Get escrow statistics
     */
    getEscrowStatistics(): {
        total: number;
        pending: number;
        completed: number;
        refunded: number;
        failed: number;
        totalValue: number;
    };
    /**
     * Generate unique escrow ID
     */
    private generateEscrowId;
    /**
     * Export escrow data for backup
     */
    exportEscrowData(): EscrowState[];
    /**
     * Import escrow data from backup
     */
    importEscrowData(escrowData: EscrowState[]): void;
}
//# sourceMappingURL=escrow.service.d.ts.map