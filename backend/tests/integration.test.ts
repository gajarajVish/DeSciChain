/**
 * Integration Tests for DeSciFi
 * Tests the complete publish -> purchase -> download flow
 */

import request from 'supertest';
import app from '../index';
import { BlockchainService } from '../services/blockchain.service';
import { IPFSService } from '../services/ipfs.service';
import { EncryptionService } from '../services/encryption.service';
import { WatermarkService } from '../services/watermark.service';
import { EscrowService } from '../services/escrow.service';

describe('DeSciFi Integration Tests', () => {
  let blockchainService: BlockchainService;
  let ipfsService: IPFSService;
  let encryptionService: EncryptionService;
  let watermarkService: WatermarkService;
  let escrowService: EscrowService;

  beforeAll(async () => {
    // Initialize services
    blockchainService = new BlockchainService({
      algodToken: process.env.ALGOD_TOKEN || '',
      algodServer: process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
      indexerToken: process.env.INDEXER_TOKEN || '',
      indexerServer: process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud',
      modelRegistryAppId: parseInt(process.env.MODEL_REGISTRY_APP_ID || '0'),
      escrowAppId: parseInt(process.env.ESCROW_APP_ID || '0')
    });

    ipfsService = new IPFSService({
      host: process.env.IPFS_HOST || 'localhost',
      port: parseInt(process.env.IPFS_PORT || '5001'),
      protocol: process.env.IPFS_PROTOCOL || 'http'
    });

    encryptionService = new EncryptionService();
    watermarkService = new WatermarkService();
    escrowService = new EscrowService(blockchainService, encryptionService);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });

  describe('Model Publishing Flow', () => {
    it('should publish a model successfully', async () => {
      const modelData = Buffer.from('test model data');
      const formData = new FormData();
      formData.append('model', new Blob([modelData]), 'test_model.pkl');
      formData.append('labId', 'test-lab');
      formData.append('licenseTerms', JSON.stringify({
        type: 'MIT',
        commercialUse: true,
        modification: true,
        distribution: true,
        attribution: true
      }));
      formData.append('ownerInfo', 'test-owner');
      formData.append('publisherAddress', 'test-publisher');
      formData.append('publisherPrivateKey', 'test-private-key');

      const response = await request(app)
        .post('/api/models/publish')
        .send(formData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.modelId).toBeDefined();
      expect(response.body.cid).toBeDefined();
      expect(response.body.txnId).toBeDefined();
    });
  });

  describe('Model Purchase Flow', () => {
    it('should create purchase escrow', async () => {
      const purchaseData = {
        modelId: '1',
        buyerAddress: 'test-buyer',
        buyerPrivateKey: 'test-buyer-key',
        price: 1000000 // 1 ALGO in microAlgos
      };

      const response = await request(app)
        .post('/api/models/purchase')
        .send(purchaseData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.escrowId).toBeDefined();
      expect(response.body.txnId).toBeDefined();
    });
  });

  describe('Model Download Flow', () => {
    it('should download model with valid escrow', async () => {
      const response = await request(app)
        .get('/api/models/download')
        .query({
          escrowId: 'test-escrow-id',
          encryptionKey: 'test-encryption-key'
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('Blockchain Status', () => {
    it('should return blockchain status', async () => {
      const response = await request(app)
        .get('/api/blockchain/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
      expect(response.body.status.lastRound).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid model ID', async () => {
      const response = await request(app)
        .get('/api/models/invalid-id')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/models/publish')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    it('should test encryption service', async () => {
      const testData = Buffer.from('test data');
      const key = encryptionService.generateKey();
      
      const encrypted = await encryptionService.encryptData(testData, key);
      const decrypted = await encryptionService.decryptData(encrypted.encryptedData, key);
      
      expect(decrypted.success).toBe(true);
      expect(decrypted.decryptedData.toString()).toBe('test data');
    });

    it('should test watermark service', async () => {
      const testData = Buffer.from('test model data');
      const ownerInfo = 'test-owner';
      
      const watermarked = await watermarkService.addWatermark(testData, ownerInfo);
      const verification = await watermarkService.verifyWatermark(
        watermarked.watermarkedData,
        ownerInfo
      );
      
      expect(verification.isValid).toBe(true);
      expect(verification.confidence).toBeGreaterThan(0.8);
    });

    it('should test IPFS service', async () => {
      const testData = Buffer.from('test file content');
      
      const uploadResult = await ipfsService.uploadFile(testData);
      const downloadResult = await ipfsService.downloadFile(uploadResult.cid);
      
      expect(uploadResult.cid).toBeDefined();
      expect(downloadResult.data.toString()).toBe('test file content');
    });
  });
});
