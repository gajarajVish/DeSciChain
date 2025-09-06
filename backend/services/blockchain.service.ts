/**
 * Blockchain Service for DeSciChain
 * Handles Algorand blockchain interactions
 */

import { Algodv2, Indexer } from 'algosdk';
import { ApplicationClient } from '@algorandfoundation/algokit-utils';
import { ModelRegistryContract } from '../contracts/ModelRegistryContract';
import { EscrowContract } from '../contracts/EscrowContract';

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

export class BlockchainService {
  private algodClient: Algodv2;
  private indexerClient: Indexer;
  private modelRegistryClient: ApplicationClient;
  private escrowClient: ApplicationClient;
  private config: BlockchainConfig;

  constructor(config: BlockchainConfig) {
    this.config = config;
    this.algodClient = new Algodv2(config.algodToken, config.algodServer);
    this.indexerClient = new Indexer(config.indexerToken, config.indexerServer);
    
    // Initialize contract clients
    this.modelRegistryClient = new ApplicationClient(
      { resolveBy: 'id', id: config.modelRegistryAppId },
      this.algodClient
    );
    
    this.escrowClient = new ApplicationClient(
      { resolveBy: 'id', id: config.escrowAppId },
      this.algodClient
    );
  }

  /**
   * Register a model on the blockchain
   */
  async registerModel(
    cid: string,
    publisher: string,
    licenseTerms: string,
    publisherPrivateKey: Uint8Array
  ): Promise<ModelRegistration> {
    try {
      // Convert CID to integer (simplified - in production, use proper CID encoding)
      const cidInt = this.cidToInt(cid);
      
      // Call the publish function
      const result = await this.modelRegistryClient.call({
        method: 'publish',
        methodArgs: [cidInt, licenseTerms],
        sender: { signer: publisherPrivateKey }
      });

      const modelId = parseInt(result.return?.valueOf() as string);
      const txnId = result.txId;

      return {
        cid,
        publisher,
        licenseTerms,
        modelId,
        txnId
      };
    } catch (error) {
      throw new Error(`Failed to register model: ${error.message}`);
    }
  }

  /**
   * Get model information from blockchain
   */
  async getModel(modelId: number): Promise<ModelRegistration | null> {
    try {
      const result = await this.modelRegistryClient.call({
        method: 'get',
        methodArgs: [modelId]
      });

      // Parse the logs to extract model data
      const logs = result.logs || [];
      const modelData = this.parseModelLogs(logs);

      return modelData;
    } catch (error) {
      console.error(`Failed to get model ${modelId}:`, error);
      return null;
    }
  }

  /**
   * Create escrow for model purchase
   */
  async createEscrow(
    modelId: number,
    buyer: string,
    price: number,
    buyerPrivateKey: Uint8Array
  ): Promise<EscrowCreation> {
    try {
      const result = await this.escrowClient.call({
        method: 'create',
        methodArgs: [modelId, buyer, price],
        sender: { signer: buyerPrivateKey }
      });

      const txnId = result.txId;

      return {
        modelId,
        buyer,
        price,
        txnId
      };
    } catch (error) {
      throw new Error(`Failed to create escrow: ${error.message}`);
    }
  }

  /**
   * Release payment from escrow
   */
  async releasePayment(
    modelId: number,
    publisherPrivateKey: Uint8Array
  ): Promise<string> {
    try {
      const result = await this.escrowClient.call({
        method: 'release',
        methodArgs: [modelId],
        sender: { signer: publisherPrivateKey }
      });

      return result.txId;
    } catch (error) {
      throw new Error(`Failed to release payment: ${error.message}`);
    }
  }

  /**
   * Refund payment from escrow
   */
  async refundPayment(
    modelId: number,
    buyerPrivateKey: Uint8Array
  ): Promise<string> {
    try {
      const result = await this.escrowClient.call({
        method: 'refund',
        methodArgs: [modelId],
        sender: { signer: buyerPrivateKey }
      });

      return result.txId;
    } catch (error) {
      throw new Error(`Failed to refund payment: ${error.message}`);
    }
  }

  /**
   * Check transaction status
   */
  async checkTransactionStatus(txnId: string): Promise<TransactionStatus> {
    try {
      const txnInfo = await this.algodClient.pendingTransactionInformation(txnId).do();
      
      if (txnInfo['confirmed-round']) {
        return {
          confirmed: true,
          txnId,
          block: txnInfo['confirmed-round']
        };
      } else {
        return {
          confirmed: false,
          txnId
        };
      }
    } catch (error) {
      return {
        confirmed: false,
        txnId,
        error: error.message
      };
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(address: string): Promise<number> {
    try {
      const accountInfo = await this.algodClient.accountInformation(address).do();
      return accountInfo.amount;
    } catch (error) {
      throw new Error(`Failed to get account balance: ${error.message}`);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(txnId: string, timeout: number = 10000): Promise<TransactionStatus> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.checkTransactionStatus(txnId);
      if (status.confirmed) {
        return status;
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
   * Convert CID to integer (simplified implementation)
   */
  private cidToInt(cid: string): number {
    // In production, use proper CID encoding/decoding
    // This is a simplified version for demonstration
    let hash = 0;
    for (let i = 0; i < cid.length; i++) {
      const char = cid.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Parse model logs to extract model data
   */
  private parseModelLogs(logs: Uint8Array[]): ModelRegistration | null {
    try {
      const logStrings = logs.map(log => new TextDecoder().decode(log));
      
      let cid = '';
      let publisher = '';
      let licenseTerms = '';
      let modelId = 0;

      for (const log of logStrings) {
        if (log.startsWith('ModelID:')) {
          modelId = parseInt(log.split('ModelID:')[1]);
        } else if (log.startsWith('CID:')) {
          cid = log.split('CID:')[1];
        } else if (log.startsWith('Publisher:')) {
          publisher = log.split('Publisher:')[1];
        } else if (log.startsWith('License:')) {
          licenseTerms = log.split('License:')[1];
        }
      }

      if (modelId && cid && publisher && licenseTerms) {
        return {
          cid,
          publisher,
          licenseTerms,
          modelId
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to parse model logs:', error);
      return null;
    }
  }
}
