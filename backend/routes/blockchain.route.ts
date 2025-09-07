/**
 * Blockchain Routes for DeSciFi
 * Handles blockchain status and transaction monitoring
 */

import { Router, Request, Response } from 'express';
import { BlockchainService } from '../services/blockchain.service';

const router = Router();

// Initialize blockchain service
const blockchainService = new BlockchainService({
  algodToken: process.env.ALGOD_TOKEN || '',
  algodServer: process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
  indexerToken: process.env.INDEXER_TOKEN || '',
  indexerServer: process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud',
  modelRegistryAppId: parseInt(process.env.MODEL_REGISTRY_APP_ID || '0'),
  escrowAppId: parseInt(process.env.ESCROW_APP_ID || '0')
});

/**
 * GET /api/blockchain/status
 * Get blockchain status and health
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get blockchain status
    const status = await blockchainService.algodClient.status().do();
    
    res.json({
      success: true,
      status: {
        lastRound: status['last-round'],
        timeSinceLastRound: status['time-since-last-round'],
        catchupTime: status['catchup-time'],
        hasSyncedSinceStartup: status['has-synced-since-startup'],
        consensusVersion: status['consensus-version'],
        genesisId: status['genesis-id'],
        genesisHash: status['genesis-hash']
      }
    });

  } catch (error) {
    console.error('Error getting blockchain status:', error);
    res.status(500).json({ 
      error: 'Failed to get blockchain status',
      details: error.message 
    });
  }
});

/**
 * GET /api/blockchain/transaction/:txnId
 * Get transaction status
 */
router.get('/transaction/:txnId', async (req: Request, res: Response) => {
  try {
    const txnId = req.params.txnId;
    
    if (!txnId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const txnStatus = await blockchainService.checkTransactionStatus(txnId);
    
    res.json({
      success: true,
      transaction: {
        txnId,
        confirmed: txnStatus.confirmed,
        block: txnStatus.block,
        error: txnStatus.error
      }
    });

  } catch (error) {
    console.error('Error getting transaction status:', error);
    res.status(500).json({ 
      error: 'Failed to get transaction status',
      details: error.message 
    });
  }
});

/**
 * GET /api/blockchain/account/:address
 * Get account information
 */
router.get('/account/:address', async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    
    if (!address) {
      return res.status(400).json({ error: 'Account address is required' });
    }

    const balance = await blockchainService.getAccountBalance(address);
    
    res.json({
      success: true,
      account: {
        address,
        balance,
        balanceAlgo: balance / 1000000 // Convert microAlgos to Algos
      }
    });

  } catch (error) {
    console.error('Error getting account information:', error);
    res.status(500).json({ 
      error: 'Failed to get account information',
      details: error.message 
    });
  }
});

/**
 * POST /api/blockchain/wait-confirmation
 * Wait for transaction confirmation
 */
router.post('/wait-confirmation', async (req: Request, res: Response) => {
  try {
    const { txnId, timeout } = req.body;
    
    if (!txnId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const timeoutMs = timeout || 10000; // Default 10 seconds
    const txnStatus = await blockchainService.waitForConfirmation(txnId, timeoutMs);
    
    res.json({
      success: true,
      transaction: {
        txnId,
        confirmed: txnStatus.confirmed,
        block: txnStatus.block,
        error: txnStatus.error
      }
    });

  } catch (error) {
    console.error('Error waiting for confirmation:', error);
    res.status(500).json({ 
      error: 'Failed to wait for confirmation',
      details: error.message 
    });
  }
});

/**
 * GET /api/blockchain/health
 * Check blockchain service health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Test blockchain connection
    const status = await blockchainService.algodClient.status().do();
    
    res.json({
      success: true,
      health: {
        blockchain: 'healthy',
        lastRound: status['last-round'],
        uptime: process.uptime()
      }
    });

  } catch (error) {
    console.error('Blockchain health check failed:', error);
    res.status(503).json({ 
      success: false,
      health: {
        blockchain: 'unhealthy',
        error: error.message
      }
    });
  }
});

/**
 * GET /api/blockchain/contracts
 * Get deployed contract information
 */
router.get('/contracts', async (req: Request, res: Response) => {
  try {
    const contracts = {
      modelRegistry: {
        appId: process.env.MODEL_REGISTRY_APP_ID || '0',
        name: 'ModelRegistry',
        description: 'Manages model registration and metadata'
      },
      escrow: {
        appId: process.env.ESCROW_APP_ID || '0',
        name: 'Escrow',
        description: 'Manages payment escrow for model purchases'
      }
    };
    
    res.json({
      success: true,
      contracts
    });

  } catch (error) {
    console.error('Error getting contract information:', error);
    res.status(500).json({ 
      error: 'Failed to get contract information',
      details: error.message 
    });
  }
});

/**
 * GET /api/blockchain/network
 * Get network information
 */
router.get('/network', async (req: Request, res: Response) => {
  try {
    const status = await blockchainService.algodClient.status().do();
    
    res.json({
      success: true,
      network: {
        name: 'Algorand TestNet',
        consensusVersion: status['consensus-version'],
        genesisId: status['genesis-id'],
        genesisHash: status['genesis-hash'],
        lastRound: status['last-round'],
        timeSinceLastRound: status['time-since-last-round']
      }
    });

  } catch (error) {
    console.error('Error getting network information:', error);
    res.status(500).json({ 
      error: 'Failed to get network information',
      details: error.message 
    });
  }
});

export default router;
