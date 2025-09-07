"use strict";
/**
 * Secure Models Routes for DeSciFi
 * Implements wallet-first flows with no server-side private key handling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const blockchain_service_1 = require("../services/blockchain.service");
const ipfs_service_1 = require("../services/ipfs.service");
const encryption_service_1 = require("../services/encryption.service");
const watermark_service_1 = require("../services/watermark.service");
const database_service_1 = require("../services/database.service");
const router = (0, express_1.Router)();
// Initialize services
const blockchainService = new blockchain_service_1.BlockchainService({
    algodToken: process.env.ALGOD_TOKEN || '',
    algodServer: process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
    indexerToken: process.env.INDEXER_TOKEN || '',
    indexerServer: process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud',
    modelRegistryAppId: parseInt(process.env.MODEL_REGISTRY_APP_ID || '0'),
    escrowAppId: parseInt(process.env.ESCROW_APP_ID || '0')
});
const ipfsService = new ipfs_service_1.IPFSService({
    host: process.env.IPFS_HOST || 'localhost',
    port: parseInt(process.env.IPFS_PORT || '5001'),
    protocol: process.env.IPFS_PROTOCOL || 'http'
});
const encryptionService = new encryption_service_1.EncryptionService();
const watermarkService = new watermark_service_1.WatermarkService();
const databaseService = new database_service_1.DatabaseService();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
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
        const hasValidExtension = allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext));
        if (allowedTypes.includes(file.mimetype) || hasValidExtension) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Please upload a valid ML model file.'));
        }
    }
});
/**
 * GET /api/models
 * Get all published models with metadata
 */
router.get('/', async (req, res) => {
    try {
        const { framework, modelType, minPrice, maxPrice, tags, publisher, limit = 20, offset = 0 } = req.query;
        const models = await databaseService.getModelsWithMetadata({
            framework: framework,
            modelType: modelType,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            tags: tags ? tags.split(',') : undefined,
            publisher: publisher,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        res.json({
            success: true,
            data: models,
            total: models.length
        });
    }
    catch (error) {
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
router.post('/prepare-publish', upload.single('modelFile'), [
    (0, express_validator_1.body)('name').isLength({ min: 1, max: 255 }).withMessage('Name is required'),
    (0, express_validator_1.body)('description').isLength({ min: 1, max: 2000 }).withMessage('Description is required'),
    (0, express_validator_1.body)('publisherAddress').isLength({ min: 58, max: 58 }).withMessage('Valid publisher address required'),
    (0, express_validator_1.body)('framework').optional().isIn(['tensorflow', 'pytorch', 'scikit-learn', 'keras', 'other']),
    (0, express_validator_1.body)('type').optional().isIn(['classification', 'regression', 'nlp', 'computer-vision', 'reinforcement-learning', 'other']),
    (0, express_validator_1.body)('price').isFloat({ min: 0 }).withMessage('Valid price required'),
    (0, express_validator_1.body)('licenseTerms').isIn(['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'Custom']).withMessage('Valid license required'),
    (0, express_validator_1.body)('tags').optional().isString()
], async (req, res) => {
    try {
        // Validate request
        const errors = (0, express_validator_1.validationResult)(req);
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
        const { name, description, publisherAddress, framework = 'other', type = 'other', price, licenseTerms, tags = '' } = req.body;
        // Validate publisher address
        if (!blockchainService.isValidAddress(publisherAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid publisher address'
            });
        }
        // Generate unique model ID
        const modelId = (0, uuid_1.v4)();
        // Encrypt model with watermark
        const encryptionResult = await encryptionService.encryptModelSecure(req.file.buffer, {
            watermark: true,
            watermarkData: {
                publisherAddress,
                modelId,
                timestamp: Date.now()
            }
        });
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
            tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
            fileSize: req.file.size,
            cid: ipfsResult.cid,
            encryptionMetadata: encryptionResult.metadata,
            encryptionKeyHash: encryptionResult.keyHash,
            status: 'pending_blockchain'
        };
        await databaseService.storePendingModel(pendingModel);
        // Build unsigned transaction for wallet signing
        const unsignedTxn = await blockchainService.buildModelRegistrationTransaction(publisherAddress, ipfsResult.cid, JSON.stringify({ name, description, framework, type, tags: pendingModel.tags }));
        res.json({
            success: true,
            data: {
                modelId,
                cid: ipfsResult.cid,
                unsignedTransaction: Buffer.from(unsignedTxn.transaction.toByte()).toString('base64'),
                transactionDescription: unsignedTxn.description
            }
        });
    }
    catch (error) {
        console.error('Failed to prepare model publication:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to prepare model for publication'
        });
    }
});
/**
 * POST /api/models/confirm-publish
 * Step 2: Submit signed transaction and confirm publication
 */
router.post('/confirm-publish', [
    (0, express_validator_1.body)('modelId').isUUID().withMessage('Valid model ID required'),
    (0, express_validator_1.body)('signedTransaction').isString().withMessage('Signed transaction required'),
    (0, express_validator_1.body)('publisherAddress').isLength({ min: 58, max: 58 }).withMessage('Valid publisher address required')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
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
    }
    catch (error) {
        console.error('Failed to confirm model publication:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to confirm model publication'
        });
    }
});
/**
 * POST /api/models/prepare-purchase
 * Step 1: Prepare purchase transaction group for wallet signing
 */
router.post('/prepare-purchase', [
    (0, express_validator_1.body)('modelId').isUUID().withMessage('Valid model ID required'),
    (0, express_validator_1.body)('buyerAddress').isLength({ min: 58, max: 58 }).withMessage('Valid buyer address required')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
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
        const unsignedTxnGroup = await blockchainService.buildModelPurchaseTransactions(buyerAddress, model.blockchainModelId, model.publisherAddress, priceInMicroAlgos);
        // Create pending purchase record
        const purchaseId = (0, uuid_1.v4)();
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
                unsignedTransactions: unsignedTxnGroup.transactions.map(txn => Buffer.from(txn.toByte()).toString('base64')),
                transactionDescriptions: unsignedTxnGroup.descriptions,
                priceAlgo: model.price,
                priceMicroAlgos: priceInMicroAlgos
            }
        });
    }
    catch (error) {
        console.error('Failed to prepare purchase:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to prepare purchase'
        });
    }
});
/**
 * POST /api/models/confirm-purchase
 * Step 2: Submit signed purchase transactions and confirm purchase
 */
router.post('/confirm-purchase', [
    (0, express_validator_1.body)('purchaseId').isUUID().withMessage('Valid purchase ID required'),
    (0, express_validator_1.body)('signedTransactions').isArray().withMessage('Signed transactions required'),
    (0, express_validator_1.body)('buyerAddress').isLength({ min: 58, max: 58 }).withMessage('Valid buyer address required')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
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
        const signedTxnBytes = signedTransactions.map((txn) => Buffer.from(txn, 'base64'));
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
    }
    catch (error) {
        console.error('Failed to confirm purchase:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to confirm purchase'
        });
    }
});
/**
 * POST /api/models/download
 * Download and decrypt purchased model
 */
router.post('/download', [
    (0, express_validator_1.body)('modelId').isUUID().withMessage('Valid model ID required'),
    (0, express_validator_1.body)('buyerAddress').isLength({ min: 58, max: 58 }).withMessage('Valid buyer address required')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
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
        const decryptedModel = await encryptionService.decryptModelSecure(encryptedModelData, accessKey.encryptedKey, model.encryptionMetadata);
        // Verify watermark
        const watermarkValid = await watermarkService.verifyWatermark(decryptedModel.data, {
            publisherAddress: model.publisherAddress,
            modelId,
            buyerAddress
        });
        // Update download count
        await databaseService.incrementDownloadCount(accessKey.id);
        // Set response headers
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${model.name}.zip"`);
        res.setHeader('X-Model-Verified', decryptedModel.verified ? 'true' : 'false');
        res.setHeader('X-Watermark-Verified', watermarkValid ? 'true' : 'false');
        res.send(decryptedModel.data);
    }
    catch (error) {
        console.error('Failed to download model:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download model'
        });
    }
});
/**
 * GET /api/models/:id
 * Get model details by ID
 */
router.get('/:id', [(0, express_validator_1.param)('id').isUUID().withMessage('Valid model ID required')], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
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
    }
    catch (error) {
        console.error('Failed to get model:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve model'
        });
    }
});
// Helper methods
function extractModelIdFromLogs(logs) {
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
function extractEscrowIdFromLogs(logs) {
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
async function generateModelAccessKey(modelId, buyerAddress) {
    // This would generate an RSA-encrypted access key for the buyer
    // Implementation would depend on the specific encryption scheme
    const model = await databaseService.getModelById(modelId);
    if (model) {
        // Generate encrypted key for buyer
        const encryptedKey = await encryptionService.sealKeyForBuyer(model.encryptionKeyHash, buyerAddress);
        await databaseService.createModelAccessKey({
            modelId,
            buyerAddress,
            encryptedKey,
            keyHash: model.encryptionKeyHash
        });
    }
}
exports.default = router;
//# sourceMappingURL=models.route.js.map