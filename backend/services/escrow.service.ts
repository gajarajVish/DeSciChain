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

export class EscrowService {
  private blockchainService: BlockchainService;
  private encryptionService: EncryptionService;
  private escrowStates: Map<string, EscrowState> = new Map();

  constructor(blockchainService: BlockchainService, encryptionService: EncryptionService) {
    this.blockchainService = blockchainService;
    this.encryptionService = encryptionService;
  }

  /**
   * Create a new escrow for model purchase
   */
  async createEscrow(
    modelId: number,
    buyer: string,
    publisher: string,
    price: number,
    buyerPrivateKey: Uint8Array,
    encryptionKey?: string
  ): Promise<EscrowCreationResult> {
    try {
      // Create escrow on blockchain
      const result = await this.blockchainService.createEscrow(
        modelId,
        buyer,
        price,
        buyerPrivateKey
      );

      const escrowId = this.generateEscrowId(modelId, buyer);
      
      // Store escrow state
      const escrowState: EscrowState = {
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
    } catch (error) {
      throw new Error(`Failed to create escrow: ${error.message}`);
    }
  }

  /**
   * Release payment from escrow
   */
  async releasePayment(
    escrowId: string,
    publisherPrivateKey: Uint8Array,
    encryptionKey?: string
  ): Promise<EscrowReleaseResult> {
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
      const txnId = await this.blockchainService.releasePayment(
        escrowState.modelId,
        publisherPrivateKey
      );

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
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refund payment from escrow
   */
  async refundPayment(
    escrowId: string,
    buyerPrivateKey: Uint8Array
  ): Promise<EscrowRefundResult> {
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
      const txnId = await this.blockchainService.refundPayment(
        escrowState.modelId,
        buyerPrivateKey
      );

      // Update escrow state
      escrowState.status = 'refunded';
      escrowState.completedAt = new Date();

      this.escrowStates.set(escrowId, escrowState);

      return {
        success: true,
        txnId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get escrow state
   */
  getEscrowState(escrowId: string): EscrowState | null {
    return this.escrowStates.get(escrowId) || null;
  }

  /**
   * Get escrow state by model ID and buyer
   */
  getEscrowByModelAndBuyer(modelId: number, buyer: string): EscrowState | null {
    const escrowId = this.generateEscrowId(modelId, buyer);
    return this.escrowStates.get(escrowId) || null;
  }

  /**
   * List all escrows for a buyer
   */
  getEscrowsByBuyer(buyer: string): EscrowState[] {
    return Array.from(this.escrowStates.values())
      .filter(escrow => escrow.buyer === buyer);
  }

  /**
   * List all escrows for a publisher
   */
  getEscrowsByPublisher(publisher: string): EscrowState[] {
    return Array.from(this.escrowStates.values())
      .filter(escrow => escrow.publisher === publisher);
  }

  /**
   * Check if escrow is ready for release
   */
  async isEscrowReadyForRelease(escrowId: string): Promise<boolean> {
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
  async monitorEscrow(escrowId: string, publisherPrivateKey: Uint8Array): Promise<void> {
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
    } else {
      // Mark as failed
      escrowState.status = 'failed';
      this.escrowStates.set(escrowId, escrowState);
    }
  }

  /**
   * Verify encryption key for escrow
   */
  verifyEncryptionKey(escrowId: string, encryptionKey: string): boolean {
    const escrowState = this.escrowStates.get(escrowId);
    if (!escrowState || !escrowState.encryptionKeyHash) {
      return false;
    }

    return this.encryptionService.verifyKey(encryptionKey, escrowState.encryptionKeyHash);
  }

  /**
   * Get encryption key for completed escrow
   */
  getEncryptionKey(escrowId: string): string | null {
    const escrowState = this.escrowStates.get(escrowId);
    if (!escrowState || escrowState.status !== 'completed' || !escrowState.encryptionKey) {
      return null;
    }

    return escrowState.encryptionKey;
  }

  /**
   * Update escrow status based on blockchain state
   */
  async updateEscrowStatus(escrowId: string): Promise<void> {
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
    } else if (txnStatus.error) {
      // Transaction failed
      escrowState.status = 'failed';
      this.escrowStates.set(escrowId, escrowState);
    }
  }

  /**
   * Clean up old escrows
   */
  cleanupOldEscrows(maxAgeHours: number = 24): void {
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
  getEscrowStatistics(): {
    total: number;
    pending: number;
    completed: number;
    refunded: number;
    failed: number;
    totalValue: number;
  } {
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
  private generateEscrowId(modelId: number, buyer: string): string {
    const data = `${modelId}:${buyer}:${Date.now()}`;
    return require('crypto').createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Export escrow data for backup
   */
  exportEscrowData(): EscrowState[] {
    return Array.from(this.escrowStates.values());
  }

  /**
   * Import escrow data from backup
   */
  importEscrowData(escrowData: EscrowState[]): void {
    for (const escrow of escrowData) {
      const escrowId = this.generateEscrowId(escrow.modelId, escrow.buyer);
      this.escrowStates.set(escrowId, escrow);
    }
  }
}
