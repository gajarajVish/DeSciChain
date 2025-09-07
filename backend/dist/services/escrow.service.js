"use strict";
/**
 * Escrow Service for DeSciFi
 * Manages escrow state and payment processing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowService = void 0;
class EscrowService {
    constructor(blockchainService, encryptionService) {
        this.escrowStates = new Map();
        this.blockchainService = blockchainService;
        this.encryptionService = encryptionService;
    }
    /**
     * Create a new escrow for model purchase
     */
    async createEscrow(modelId, buyer, publisher, price, buyerPrivateKey, encryptionKey) {
        try {
            // Create escrow on blockchain
            const result = await this.blockchainService.createEscrow(modelId, buyer, price, buyerPrivateKey);
            const escrowId = this.generateEscrowId(modelId, buyer);
            // Store escrow state
            const escrowState = {
                modelId,
                buyer,
                publisher,
                price,
                status: 'pending',
                txnId: result.txnId,
                createdAt: new Date(),
                encryptionKey,
                encryptionKeyHash: encryptionKey ? this.encryptionService.hashKey(encryptionKey) : undefined
            };
            this.escrowStates.set(escrowId, escrowState);
            return {
                escrowId,
                txnId: result.txnId,
                status: 'pending'
            };
        }
        catch (error) {
            throw new Error(`Failed to create escrow: ${error.message}`);
        }
    }
    /**
     * Release payment from escrow
     */
    async releasePayment(escrowId, publisherPrivateKey, encryptionKey) {
        try {
            const escrowState = this.escrowStates.get(escrowId);
            if (!escrowState) {
                return {
                    success: false,
                    error: 'Escrow not found'
                };
            }
            if (escrowState.status !== 'pending') {
                return {
                    success: false,
                    error: `Escrow is not pending (status: ${escrowState.status})`
                };
            }
            // Release payment on blockchain
            const txnId = await this.blockchainService.releasePayment(escrowState.modelId, publisherPrivateKey);
            // Update escrow state
            escrowState.status = 'completed';
            escrowState.completedAt = new Date();
            escrowState.encryptionKey = encryptionKey || escrowState.encryptionKey;
            if (escrowState.encryptionKey) {
                escrowState.encryptionKeyHash = this.encryptionService.hashKey(escrowState.encryptionKey);
            }
            this.escrowStates.set(escrowId, escrowState);
            return {
                success: true,
                txnId,
                encryptionKey: escrowState.encryptionKey
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Refund payment from escrow
     */
    async refundPayment(escrowId, buyerPrivateKey) {
        try {
            const escrowState = this.escrowStates.get(escrowId);
            if (!escrowState) {
                return {
                    success: false,
                    error: 'Escrow not found'
                };
            }
            if (escrowState.status !== 'pending') {
                return {
                    success: false,
                    error: `Escrow is not pending (status: ${escrowState.status})`
                };
            }
            // Refund payment on blockchain
            const txnId = await this.blockchainService.refundPayment(escrowState.modelId, buyerPrivateKey);
            // Update escrow state
            escrowState.status = 'refunded';
            escrowState.completedAt = new Date();
            this.escrowStates.set(escrowId, escrowState);
            return {
                success: true,
                txnId
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Get escrow state
     */
    getEscrowState(escrowId) {
        return this.escrowStates.get(escrowId) || null;
    }
    /**
     * Get escrow state by model ID and buyer
     */
    getEscrowByModelAndBuyer(modelId, buyer) {
        const escrowId = this.generateEscrowId(modelId, buyer);
        return this.escrowStates.get(escrowId) || null;
    }
    /**
     * List all escrows for a buyer
     */
    getEscrowsByBuyer(buyer) {
        return Array.from(this.escrowStates.values())
            .filter(escrow => escrow.buyer === buyer);
    }
    /**
     * List all escrows for a publisher
     */
    getEscrowsByPublisher(publisher) {
        return Array.from(this.escrowStates.values())
            .filter(escrow => escrow.publisher === publisher);
    }
    /**
     * Check if escrow is ready for release
     */
    async isEscrowReadyForRelease(escrowId) {
        const escrowState = this.escrowStates.get(escrowId);
        if (!escrowState || escrowState.status !== 'pending') {
            return false;
        }
        // Check if payment is confirmed on blockchain
        const txnStatus = await this.blockchainService.checkTransactionStatus(escrowState.txnId);
        return txnStatus.confirmed;
    }
    /**
     * Monitor escrow status and auto-release when ready
     */
    async monitorEscrow(escrowId, publisherPrivateKey) {
        const escrowState = this.escrowStates.get(escrowId);
        if (!escrowState) {
            throw new Error('Escrow not found');
        }
        if (escrowState.status !== 'pending') {
            return;
        }
        // Wait for payment confirmation
        const txnStatus = await this.blockchainService.waitForConfirmation(escrowState.txnId);
        if (txnStatus.confirmed) {
            // Auto-release payment
            await this.releasePayment(escrowId, publisherPrivateKey);
        }
        else {
            // Mark as failed
            escrowState.status = 'failed';
            this.escrowStates.set(escrowId, escrowState);
        }
    }
    /**
     * Verify encryption key for escrow
     */
    verifyEncryptionKey(escrowId, encryptionKey) {
        const escrowState = this.escrowStates.get(escrowId);
        if (!escrowState || !escrowState.encryptionKeyHash) {
            return false;
        }
        return this.encryptionService.verifyKey(encryptionKey, escrowState.encryptionKeyHash);
    }
    /**
     * Get encryption key for completed escrow
     */
    getEncryptionKey(escrowId) {
        const escrowState = this.escrowStates.get(escrowId);
        if (!escrowState || escrowState.status !== 'completed' || !escrowState.encryptionKey) {
            return null;
        }
        return escrowState.encryptionKey;
    }
    /**
     * Update escrow status based on blockchain state
     */
    async updateEscrowStatus(escrowId) {
        const escrowState = this.escrowStates.get(escrowId);
        if (!escrowState) {
            return;
        }
        if (escrowState.status !== 'pending') {
            return;
        }
        // Check transaction status
        const txnStatus = await this.blockchainService.checkTransactionStatus(escrowState.txnId);
        if (txnStatus.confirmed) {
            // Payment is confirmed, ready for release
            console.log(`Escrow ${escrowId} payment confirmed, ready for release`);
        }
        else if (txnStatus.error) {
            // Transaction failed
            escrowState.status = 'failed';
            this.escrowStates.set(escrowId, escrowState);
        }
    }
    /**
     * Clean up old escrows
     */
    cleanupOldEscrows(maxAgeHours = 24) {
        const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        for (const [escrowId, escrowState] of this.escrowStates.entries()) {
            if (escrowState.createdAt < cutoffTime && escrowState.status === 'pending') {
                escrowState.status = 'failed';
                this.escrowStates.set(escrowId, escrowState);
            }
        }
    }
    /**
     * Get escrow statistics
     */
    getEscrowStatistics() {
        const escrows = Array.from(this.escrowStates.values());
        return {
            total: escrows.length,
            pending: escrows.filter(e => e.status === 'pending').length,
            completed: escrows.filter(e => e.status === 'completed').length,
            refunded: escrows.filter(e => e.status === 'refunded').length,
            failed: escrows.filter(e => e.status === 'failed').length,
            totalValue: escrows.reduce((sum, e) => sum + e.price, 0)
        };
    }
    /**
     * Generate unique escrow ID
     */
    generateEscrowId(modelId, buyer) {
        const data = `${modelId}:${buyer}:${Date.now()}`;
        return require('crypto').createHash('sha256').update(data).digest('hex').substring(0, 16);
    }
    /**
     * Export escrow data for backup
     */
    exportEscrowData() {
        return Array.from(this.escrowStates.values());
    }
    /**
     * Import escrow data from backup
     */
    importEscrowData(escrowData) {
        for (const escrow of escrowData) {
            const escrowId = this.generateEscrowId(escrow.modelId, escrow.buyer);
            this.escrowStates.set(escrowId, escrow);
        }
    }
}
exports.EscrowService = EscrowService;
//# sourceMappingURL=escrow.service.js.map