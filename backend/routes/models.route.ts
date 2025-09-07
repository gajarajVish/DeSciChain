/**
 * Secure Models Routes for DeSciChain
 * Implements wallet-first flows with no server-side private key handling
 */

import { Router, Request, Response } from 'express';
import { body, validationResult, param } from 'express-validator';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { BlockchainService } from '../services/blockchain.service';
import { IPFSService } from '../services/ipfs.service';
import { EncryptionService } from '../services/encryption.service';
import { WatermarkService } from '../services/watermark.service';
import { DatabaseService } from '../services/database.service';

const router = Router();

// Initialize services
const blockchainService = new BlockchainService({
  algodToken: process.env.ALGOD_TOKEN || '',
  algodServer: process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
  indexerToken: process.env.INDEXER_TOKEN || '',
  indexerServer: process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud',
  modelRegistryAppId: parseInt(process.env.MODEL_REGISTRY_APP_ID || '0'),
  escrowAppId: parseInt(process.env.ESCROW_APP_ID || '0')
});

const ipfsService = new IPFSService({
  host: process.env.IPFS_HOST || 'localhost',
  port: parseInt(process.env.IPFS_PORT || '5001'),
  protocol: process.env.IPFS_PROTOCOL || 'http'
});

const encryptionService = new EncryptionService();
const watermarkService = new WatermarkService();
const databaseService = new DatabaseService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common ML model formats
    const allowedTypes = [
      'application/zip',
      'application/x-tar',
      'application/gzip',
      'application/octet-stream'
    ];
    
    const allowedExtensions = ['.zip', '.tar', '.gz', '.pkl', '.h5', '.pt', '.pth', '.onnx'];
    const hasValidExtension = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    if (allowedTypes.includes(file.mimetype) || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a valid ML model file.'));
    }
  }
});

/**
 * GET /api/models
 * Get all published models with metadata
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      framework, 
      modelType, 
      minPrice, 
      maxPrice, 
      tags, 
      publisher,
      limit = 20,
      offset = 0 
    } = req.query;

    const models = await databaseService.getModelsWithMetadata({
      framework: framework as string,
      modelType: modelType as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      publisher: publisher as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: models,
      total: models.length
    });
  } catch (error) {
    console.error('Failed to get models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve models'
    });
  }
});

/**
 * POST /api/models/prepare-publish
 * Step 1: Encrypt model and upload to IPFS, return unsigned transaction
 */
router.post('/prepare-publish', 
  upload.single('modelFile'),
  [
    body('name').isLength({ min: 1, max: 255 }).withMessage('Name is required'),
    body('description').isLength({ min: 1, max: 2000 }).withMessage('Description is required'),
    body('publisherAddress').isLength({ min: 58, max: 58 }).withMessage('Valid publisher address required'),
    body('framework').optional().isIn(['tensorflow', 'pytorch', 'scikit-learn', 'keras', 'other']),
    body('type').optional().isIn(['classification', 'regression', 'nlp', 'computer-vision', 'reinforcement-learning', 'other']),
    body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
    body('licenseTerms').isIn(['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'Custom']).withMessage('Valid license required'),
    body('tags').optional().isString()
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Model file is required'
        });
      }

      const {
        name,
        description,
        publisherAddress,
        framework = 'other',
        type = 'other',
        price,
        licenseTerms,
        tags = ''
      } = req.body;

      // Validate publisher address
      if (!blockchainService.isValidAddress(publisherAddress)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid publisher address'
        });
      }

      // Generate unique model ID
      const modelId = uuidv4();

      // Encrypt model with watermark
      const encryptionResult = await encryptionService.encryptModelSecure(
        req.file.buffer,
        {
          watermark: true,
          watermarkData: {
            publisherAddress,
            modelId,
            timestamp: Date.now()
          }
        }
      );

      // Upload encrypted model to IPFS
      const ipfsResult = await ipfsService.uploadFile(encryptionResult.encryptedData);

      // Store model data temporarily (pending blockchain confirmation)
      const pendingModel = {
        id: modelId,
        name,
        description,
        publisherAddress,
        framework,
        type,
        price: parseFloat(price),
        licenseTerms,
        tags: tags.split(',').map((tag: string) => tag.trim()).filter(Boolean),
        fileSize: req.file.size,
        cid: ipfsResult.cid,
        encryptionMetadata: encryptionResult.metadata,
        encryptionKeyHash: encryptionResult.keyHash,
        status: 'pending_blockchain'
      };

      await databaseService.storePendingModel(pendingModel);

      // Build unsigned transaction for wallet signing
      const unsignedTxn = await blockchainService.buildModelRegistrationTransaction(
        publisherAddress,
        ipfsResult.cid,
        JSON.stringify({ name, description, framework, type, tags: pendingModel.tags })
      );

      res.json({
        success: true,
        data: {
          modelId,
          cid: ipfsResult.cid,
          unsignedTransaction: Buffer.from(unsignedTxn.transaction.toByte()).toString('base64'),
          transactionDescription: unsignedTxn.description
        }
      });

    } catch (error) {
      console.error('Failed to prepare model publication:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to prepare model for publication'
      });
    }
  }
);

/**
 * POST /api/models/confirm-publish
 * Step 2: Submit signed transaction and confirm publication
 */
router.post('/confirm-publish',
  [
    body('modelId').isUUID().withMessage('Valid model ID required'),
    body('signedTransaction').isString().withMessage('Signed transaction required'),
    body('publisherAddress').isLength({ min: 58, max: 58 }).withMessage('Valid publisher address required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { modelId, signedTransaction, publisherAddress } = req.body;

      // Get pending model
      const pendingModel = await databaseService.getPendingModel(modelId);
      if (!pendingModel) {
        return res.status(404).json({
          success: false,
          error: 'Pending model not found'
        });
      }

      // Verify publisher address matches
      if (pendingModel.publisherAddress !== publisherAddress) {
        return res.status(403).json({
          success: false,
          error: 'Publisher address mismatch'
        });
      }

      // Submit signed transaction
      const signedTxnBytes = Buffer.from(signedTransaction, 'base64');
      const txnId = await blockchainService.submitSignedTransaction(signedTxnBytes);

      // Wait for confirmation
      const confirmation = await blockchainService.waitForConfirmation(txnId);

      if (!confirmation.confirmed) {
        return res.status(400).json({
          success: false,
          error: 'Transaction failed to confirm',
          details: confirmation.error
        });
      }

      // Extract blockchain model ID from logs
      const blockchainModelId = this.extractModelIdFromLogs(confirmation.logs || []);

      // Move from pending to published
      await databaseService.publishModel({
        ...pendingModel,
        algorandTxnId: txnId,
        blockchainModelId,
        status: 'published',
        publishedAt: new Date()
      });

      // Clean up pending model
      await databaseService.deletePendingModel(modelId);

      res.json({
        success: true,
        data: {
          modelId,
          txnId,
          blockchainModelId,
          block: confirmation.block
        }
      });

    } catch (error) {
      console.error('Failed to confirm model publication:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm model publication'
      });
    }
  }
);

/**
 * POST /api/models/prepare-purchase
 * Step 1: Prepare purchase transaction group for wallet signing
 */
router.post('/prepare-purchase',
  [
    body('modelId').isUUID().withMessage('Valid model ID required'),
    body('buyerAddress').isLength({ min: 58, max: 58 }).withMessage('Valid buyer address required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { modelId, buyerAddress } = req.body;

      // Get model information
      const model = await databaseService.getModelById(modelId);
      if (!model) {
        return res.status(404).json({
          success: false,
          error: 'Model not found'
        });
      }

      // Check if already purchased
      const existingPurchase = await databaseService.getPurchase(modelId, buyerAddress);
      if (existingPurchase && existingPurchase.status === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Model already purchased'
        });
      }

      // Convert price to microAlgos
      const priceInMicroAlgos = blockchainService.algoToMicroAlgos(model.price);

      // Build unsigned transaction group
      const unsignedTxnGroup = await blockchainService.buildModelPurchaseTransactions(
        buyerAddress,
        model.blockchainModelId,
        model.publisherAddress,
        priceInMicroAlgos
      );

      // Create pending purchase record
      const purchaseId = uuidv4();
      await databaseService.createPendingPurchase({
        id: purchaseId,
        modelId,
        buyerAddress,
        price: priceInMicroAlgos,
        status: 'pending_payment'
      });

      res.json({
        success: true,
        data: {
          purchaseId,
          unsignedTransactions: unsignedTxnGroup.transactions.map(txn => 
            Buffer.from(txn.toByte()).toString('base64')
          ),
          transactionDescriptions: unsignedTxnGroup.descriptions,
          priceAlgo: model.price,
          priceMicroAlgos: priceInMicroAlgos
        }
      });

    } catch (error) {
      console.error('Failed to prepare purchase:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to prepare purchase'
      });
    }
  }
);

/**
 * POST /api/models/confirm-purchase
 * Step 2: Submit signed purchase transactions and confirm purchase
 */
router.post('/confirm-purchase',
  [
    body('purchaseId').isUUID().withMessage('Valid purchase ID required'),
    body('signedTransactions').isArray().withMessage('Signed transactions required'),
    body('buyerAddress').isLength({ min: 58, max: 58 }).withMessage('Valid buyer address required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { purchaseId, signedTransactions, buyerAddress } = req.body;

      // Get pending purchase
      const pendingPurchase = await databaseService.getPendingPurchase(purchaseId);
      if (!pendingPurchase) {
        return res.status(404).json({
          success: false,
          error: 'Pending purchase not found'
        });
      }

      // Verify buyer address
      if (pendingPurchase.buyerAddress !== buyerAddress) {
        return res.status(403).json({
          success: false,
          error: 'Buyer address mismatch'
        });
      }

      // Submit signed transaction group
      const signedTxnBytes = signedTransactions.map((txn: string) => 
        Buffer.from(txn, 'base64')
      );
      const txnId = await blockchainService.submitSignedTransactionGroup(signedTxnBytes);

      // Wait for confirmation
      const confirmation = await blockchainService.waitForConfirmation(txnId);

      if (!confirmation.confirmed) {
        return res.status(400).json({
          success: false,
          error: 'Transaction failed to confirm',
          details: confirmation.error
        });
      }

      // Extract escrow ID from logs
      const escrowId = this.extractEscrowIdFromLogs(confirmation.logs || []);

      // Update purchase status
      await databaseService.confirmPurchase(purchaseId, {
        txnId,
        escrowId,
        status: 'completed',
        completedAt: new Date()
      });

      // Generate access key for buyer
      await this.generateModelAccessKey(pendingPurchase.modelId, buyerAddress);

      res.json({
        success: true,
        data: {
          purchaseId,
          txnId,
          escrowId,
          block: confirmation.block
        }
      });

    } catch (error) {
      console.error('Failed to confirm purchase:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm purchase'
      });
    }
  }
);

/**
 * POST /api/models/download
 * Download and decrypt purchased model
 */
router.post('/download',
  [
    body('modelId').isUUID().withMessage('Valid model ID required'),
    body('buyerAddress').isLength({ min: 58, max: 58 }).withMessage('Valid buyer address required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { modelId, buyerAddress } = req.body;

      // Verify purchase
      const purchase = await databaseService.getPurchase(modelId, buyerAddress);
      if (!purchase || purchase.status !== 'completed') {
        return res.status(403).json({
          success: false,
          error: 'Model not purchased or purchase not completed'
        });
      }

      // Get model and access key
      const model = await databaseService.getModelById(modelId);
      const accessKey = await databaseService.getModelAccessKey(modelId, buyerAddress);

      if (!model || !accessKey) {
        return res.status(404).json({
          success: false,
          error: 'Model or access key not found'
        });
      }

      // Check download limits
      if (accessKey.downloadCount >= accessKey.maxDownloads) {
        return res.status(403).json({
          success: false,
          error: 'Download limit exceeded'
        });
      }

      // Download encrypted model from IPFS
      const encryptedModelData = await ipfsService.downloadFile(model.cid);

      // Decrypt model using access key
      const decryptedModel = await encryptionService.decryptModelSecure(
        encryptedModelData,
        accessKey.encryptedKey,
        model.encryptionMetadata
      );

      // Verify watermark
      const watermarkValid = await watermarkService.verifyWatermark(
        decryptedModel.data,
        {
          publisherAddress: model.publisherAddress,
          modelId,
          buyerAddress
        }
      );

      // Update download count
      await databaseService.incrementDownloadCount(accessKey.id);

      // Set response headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${model.name}.zip"`);
      res.setHeader('X-Model-Verified', decryptedModel.verified ? 'true' : 'false');
      res.setHeader('X-Watermark-Verified', watermarkValid ? 'true' : 'false');

      res.send(decryptedModel.data);

    } catch (error) {
      console.error('Failed to download model:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download model'
      });
    }
  }
);

/**
 * GET /api/models/:id
 * Get model details by ID
 */
router.get('/:id',
  [param('id').isUUID().withMessage('Valid model ID required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const model = await databaseService.getModelWithMetadata(id);

      if (!model) {
        return res.status(404).json({
          success: false,
          error: 'Model not found'
        });
      }

      res.json({
        success: true,
        data: model
      });

    } catch (error) {
      console.error('Failed to get model:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve model'
      });
    }
  }
);

// Helper methods
function extractModelIdFromLogs(logs: string[]): number {
  for (const log of logs) {
    if (log.startsWith('MODEL_PUBLISHED:')) {
      const match = log.match(/MODEL_PUBLISHED:(\d+):/);
      if (match) {
        return parseInt(match[1]);
      }
    }
  }
  return 0;
}

function extractEscrowIdFromLogs(logs: string[]): number {
  for (const log of logs) {
    if (log.startsWith('ESCROW_CREATED:')) {
      const match = log.match(/ESCROW_CREATED:(\d+):/);
      if (match) {
        return parseInt(match[1]);
      }
    }
  }
  return 0;
}

async function generateModelAccessKey(modelId: string, buyerAddress: string): Promise<void> {
  // This would generate an RSA-encrypted access key for the buyer
  // Implementation would depend on the specific encryption scheme
  const model = await databaseService.getModelById(modelId);
  if (model) {
    // Generate encrypted key for buyer
    const encryptedKey = await encryptionService.sealKeyForBuyer(
      model.encryptionKeyHash,
      buyerAddress
    );
    
    await databaseService.createModelAccessKey({
      modelId,
      buyerAddress,
      encryptedKey,
      keyHash: model.encryptionKeyHash
    });
  }
}

export default router;