"use strict";
/**
 * Models Routes for DeSciChain
 * Handles model publishing, purchasing, and downloading
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const blockchain_service_1 = require("../services/blockchain.service");
const ipfs_service_1 = require("../services/ipfs.service");
const encryption_service_1 = require("../services/encryption.service");
const watermark_service_1 = require("../services/watermark.service");
const escrow_service_1 = require("../services/escrow.service");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
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
const escrowService = new escrow_service_1.EscrowService(blockchainService, encryptionService);
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});
/**
 * POST /api/models/publish
 * Publish a new model
 */
router.post('/publish', upload.single('model'), async (req, res) => {
    try {
        const { labId, licenseTerms, ownerInfo, customData, publisherPrivateKey } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'No model file provided' });
        }
        if (!labId || !licenseTerms || !ownerInfo || !publisherPrivateKey) {
            return res.status(400).json({
                error: 'Missing required fields: labId, licenseTerms, ownerInfo, publisherPrivateKey'
            });
        }
        // Generate encryption key
        const encryptionKey = encryptionService.generateKey();
        // Add watermark to model
        const watermarkResult = await watermarkService.addWatermark(req.file.buffer, ownerInfo, customData);
        // Encrypt watermarked model
        const encryptionResult = await encryptionService.encryptModel(watermarkResult.watermarkedData, encryptionKey);
        // Upload encrypted model to IPFS
        const ipfsResult = await ipfsService.uploadFile(encryptionResult.encryptedData);
        // Register model on blockchain
        const publisherPrivateKeyBuffer = Buffer.from(publisherPrivateKey, 'hex');
        const blockchainResult = await blockchainService.registerModel(ipfsResult.cid, req.body.publisherAddress || 'unknown', licenseTerms, new Uint8Array(publisherPrivateKeyBuffer));
        // Store model in database (you'll need to implement this)
        const modelId = (0, uuid_1.v4)();
        const modelData = {
            id: modelId,
            labId,
            modelCid: ipfsResult.cid,
            algorandTxnId: blockchainResult.txnId,
            encryptionKeyHash: encryptionService.hashKey(encryptionKey),
            licenseTerms: JSON.parse(licenseTerms),
            watermark: watermarkResult.watermark,
            watermarkPosition: watermarkResult.position,
            createdAt: new Date()
        };
        // TODO: Save to database
        // await saveModelToDatabase(modelData);
        res.json({
            success: true,
            modelId,
            cid: ipfsResult.cid,
            txnId: blockchainResult.txnId,
            blockchainModelId: blockchainResult.modelId,
            watermark: watermarkResult.watermark,
            encryptionKey // In production, this should be stored securely
        });
    }
    catch (error) {
        console.error('Error publishing model:', error);
        res.status(500).json({
            error: 'Failed to publish model',
            details: error.message
        });
    }
});
/**
 * POST /api/models/purchase
 * Purchase a model
 */
router.post('/purchase', async (req, res) => {
    try {
        const { modelId, buyerAddress, buyerPrivateKey, price } = req.body;
        if (!modelId || !buyerAddress || !buyerPrivateKey || !price) {
            return res.status(400).json({
                error: 'Missing required fields: modelId, buyerAddress, buyerPrivateKey, price'
            });
        }
        // Get model info from blockchain
        const modelInfo = await blockchainService.getModel(parseInt(modelId));
        if (!modelInfo) {
            return res.status(404).json({ error: 'Model not found' });
        }
        // Create escrow
        const buyerPrivateKeyBuffer = Buffer.from(buyerPrivateKey, 'hex');
        const escrowResult = await escrowService.createEscrow(parseInt(modelId), buyerAddress, modelInfo.publisher, parseInt(price), new Uint8Array(buyerPrivateKeyBuffer));
        res.json({
            success: true,
            escrowId: escrowResult.escrowId,
            txnId: escrowResult.txnId,
            status: escrowResult.status
        });
    }
    catch (error) {
        console.error('Error purchasing model:', error);
        res.status(500).json({
            error: 'Failed to purchase model',
            details: error.message
        });
    }
});
/**
 * GET /api/models/download
 * Download a purchased model
 */
router.get('/download', async (req, res) => {
    try {
        const { escrowId, encryptionKey } = req.query;
        if (!escrowId || !encryptionKey) {
            return res.status(400).json({
                error: 'Missing required parameters: escrowId, encryptionKey'
            });
        }
        // Get escrow state
        const escrowState = escrowService.getEscrowState(escrowId);
        if (!escrowState) {
            return res.status(404).json({ error: 'Escrow not found' });
        }
        if (escrowState.status !== 'completed') {
            return res.status(400).json({
                error: `Escrow is not completed (status: ${escrowState.status})`
            });
        }
        // Verify encryption key
        if (!escrowService.verifyEncryptionKey(escrowId, encryptionKey)) {
            return res.status(401).json({ error: 'Invalid encryption key' });
        }
        // Get model info from blockchain
        const modelInfo = await blockchainService.getModel(escrowState.modelId);
        if (!modelInfo) {
            return res.status(404).json({ error: 'Model not found on blockchain' });
        }
        // Download encrypted model from IPFS
        const ipfsResult = await ipfsService.downloadFile(modelInfo.cid);
        // Decrypt model
        const decryptionResult = await encryptionService.decryptModel(ipfsResult.data, encryptionKey);
        if (!decryptionResult.success) {
            return res.status(500).json({ error: 'Failed to decrypt model' });
        }
        // Verify watermark
        const watermarkVerification = await watermarkService.verifyWatermark(decryptionResult.decryptedData, escrowState.publisher, undefined // We don't have the expected watermark, so let it auto-detect
        );
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="model_${escrowState.modelId}.bin"`);
        res.setHeader('X-Watermark-Verified', watermarkVerification.isValid.toString());
        res.setHeader('X-Watermark-Confidence', watermarkVerification.confidence.toString());
        res.send(decryptionResult.decryptedData);
    }
    catch (error) {
        console.error('Error downloading model:', error);
        res.status(500).json({
            error: 'Failed to download model',
            details: error.message
        });
    }
});
/**
 * POST /api/models/watermark
 * Add watermark to a model
 */
router.post('/watermark', upload.single('model'), async (req, res) => {
    try {
        const { ownerInfo, customData } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'No model file provided' });
        }
        if (!ownerInfo) {
            return res.status(400).json({ error: 'Missing required field: ownerInfo' });
        }
        // Add watermark
        const watermarkResult = await watermarkService.addWatermark(req.file.buffer, ownerInfo, customData);
        res.json({
            success: true,
            watermarkedData: watermarkResult.watermarkedData.toString('base64'),
            watermark: watermarkResult.watermark,
            position: watermarkResult.position,
            algorithm: watermarkResult.algorithm
        });
    }
    catch (error) {
        console.error('Error adding watermark:', error);
        res.status(500).json({
            error: 'Failed to add watermark',
            details: error.message
        });
    }
});
/**
 * GET /api/models/:id
 * Get model information
 */
router.get('/:id', async (req, res) => {
    try {
        const modelId = parseInt(req.params.id);
        if (isNaN(modelId)) {
            return res.status(400).json({ error: 'Invalid model ID' });
        }
        // Get model info from blockchain
        const modelInfo = await blockchainService.getModel(modelId);
        if (!modelInfo) {
            return res.status(404).json({ error: 'Model not found' });
        }
        res.json({
            success: true,
            modelId,
            cid: modelInfo.cid,
            publisher: modelInfo.publisher,
            licenseTerms: modelInfo.licenseTerms
        });
    }
    catch (error) {
        console.error('Error getting model info:', error);
        res.status(500).json({
            error: 'Failed to get model information',
            details: error.message
        });
    }
});
/**
 * GET /api/models
 * List all models
 */
router.get('/', async (req, res) => {
    try {
        // This would typically query your database
        // For now, return a placeholder response
        res.json({
            success: true,
            models: [],
            message: 'Model listing not implemented yet'
        });
    }
    catch (error) {
        console.error('Error listing models:', error);
        res.status(500).json({
            error: 'Failed to list models',
            details: error.message
        });
    }
});
/**
 * POST /api/models/escrow/release
 * Release payment from escrow
 */
router.post('/escrow/release', async (req, res) => {
    try {
        const { escrowId, publisherPrivateKey, encryptionKey } = req.body;
        if (!escrowId || !publisherPrivateKey) {
            return res.status(400).json({
                error: 'Missing required fields: escrowId, publisherPrivateKey'
            });
        }
        const publisherPrivateKeyBuffer = Buffer.from(publisherPrivateKey, 'hex');
        const result = await escrowService.releasePayment(escrowId, new Uint8Array(publisherPrivateKeyBuffer), encryptionKey);
        if (!result.success) {
            return res.status(400).json({
                error: result.error || 'Failed to release payment'
            });
        }
        res.json({
            success: true,
            txnId: result.txnId,
            encryptionKey: result.encryptionKey
        });
    }
    catch (error) {
        console.error('Error releasing payment:', error);
        res.status(500).json({
            error: 'Failed to release payment',
            details: error.message
        });
    }
});
/**
 * POST /api/models/escrow/refund
 * Refund payment from escrow
 */
router.post('/escrow/refund', async (req, res) => {
    try {
        const { escrowId, buyerPrivateKey } = req.body;
        if (!escrowId || !buyerPrivateKey) {
            return res.status(400).json({
                error: 'Missing required fields: escrowId, buyerPrivateKey'
            });
        }
        const buyerPrivateKeyBuffer = Buffer.from(buyerPrivateKey, 'hex');
        const result = await escrowService.refundPayment(escrowId, new Uint8Array(buyerPrivateKeyBuffer));
        if (!result.success) {
            return res.status(400).json({
                error: result.error || 'Failed to refund payment'
            });
        }
        res.json({
            success: true,
            txnId: result.txnId
        });
    }
    catch (error) {
        console.error('Error refunding payment:', error);
        res.status(500).json({
            error: 'Failed to refund payment',
            details: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=models.route.js.map