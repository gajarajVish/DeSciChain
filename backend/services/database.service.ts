/**
 * Database Service for DeSciChain
 * Handles all database operations with PostgreSQL
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface ModelFilters {
  framework?: string;
  modelType?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  publisher?: string;
  limit: number;
  offset: number;
}

export interface PendingModel {
  id: string;
  name: string;
  description: string;
  publisherAddress: string;
  framework: string;
  type: string;
  price: number;
  licenseTerms: string;
  tags: string[];
  fileSize: number;
  cid: string;
  encryptionMetadata: any;
  encryptionKeyHash: string;
  status: string;
}

export interface PublishedModel extends PendingModel {
  algorandTxnId: string;
  blockchainModelId: number;
  publishedAt: Date;
}

export interface ModelPurchase {
  id: string;
  modelId: string;
  buyerAddress: string;
  price: number;
  status: string;
  txnId?: string;
  escrowId?: number;
  createdAt?: Date;
  completedAt?: Date;
}

export interface ModelAccessKey {
  id: string;
  modelId: string;
  buyerAddress: string;
  encryptedKey: string;
  keyHash: string;
  keyType: string;
  downloadCount: number;
  maxDownloads: number;
  accessGrantedAt: Date;
  accessExpiresAt?: Date;
}

export class DatabaseService {
  private pool: Pool;

  constructor(config?: DatabaseConfig) {
    const dbConfig = config || {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'descichain',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    };

    this.pool = new Pool({
      ...dbConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Get database client from pool
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Execute query with automatic connection management
   */
  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Get all models with metadata and statistics
   */
  async getModelsWithMetadata(filters: ModelFilters): Promise<any[]> {
    let query = `
      SELECT 
        pm.id,
        pm.publisher_address,
        pm.model_cid,
        pm.blockchain_model_id,
        pm.price_algo,
        pm.file_size,
        pm.created_at,
        mm.name,
        mm.description,
        mm.framework,
        mm.model_type,
        mm.tags,
        mm.performance_metrics,
        COUNT(DISTINCT mp.id) as purchase_count,
        COUNT(DISTINCT md.id) as download_count,
        AVG(mr.rating) as average_rating,
        COUNT(DISTINCT mr.id) as review_count
      FROM published_models pm
      LEFT JOIN model_metadata mm ON pm.id = mm.model_id
      LEFT JOIN model_purchases mp ON pm.id = mp.model_id AND mp.status = 'completed'
      LEFT JOIN model_downloads md ON pm.id = md.model_id
      LEFT JOIN model_reviews mr ON pm.id = mr.model_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (filters.framework) {
      paramCount++;
      query += ` AND mm.framework = $${paramCount}`;
      params.push(filters.framework);
    }

    if (filters.modelType) {
      paramCount++;
      query += ` AND mm.model_type = $${paramCount}`;
      params.push(filters.modelType);
    }

    if (filters.minPrice !== undefined) {
      paramCount++;
      query += ` AND pm.price_algo >= $${paramCount}`;
      params.push(filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      paramCount++;
      query += ` AND pm.price_algo <= $${paramCount}`;
      params.push(filters.maxPrice);
    }

    if (filters.publisher) {
      paramCount++;
      query += ` AND pm.publisher_address = $${paramCount}`;
      params.push(filters.publisher);
    }

    if (filters.tags && filters.tags.length > 0) {
      paramCount++;
      query += ` AND mm.tags && $${paramCount}`;
      params.push(filters.tags);
    }

    query += `
      GROUP BY pm.id, pm.publisher_address, pm.model_cid, pm.blockchain_model_id, 
               pm.price_algo, pm.file_size, pm.created_at, mm.name, mm.description, 
               mm.framework, mm.model_type, mm.tags, mm.performance_metrics
      ORDER BY pm.created_at DESC
    `;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(filters.limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(filters.offset);

    const result = await this.query(query, params);
    return result.rows;
  }

  /**
   * Store pending model (before blockchain confirmation)
   */
  async storePendingModel(model: PendingModel): Promise<void> {
    const query = `
      INSERT INTO pending_models (
        id, name, description, publisher_address, framework, model_type,
        price, license_terms, tags, file_size, cid, encryption_metadata,
        encryption_key_hash, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
    `;

    await this.query(query, [
      model.id,
      model.name,
      model.description,
      model.publisherAddress,
      model.framework,
      model.type,
      model.price,
      model.licenseTerms,
      model.tags,
      model.fileSize,
      model.cid,
      JSON.stringify(model.encryptionMetadata),
      model.encryptionKeyHash,
      model.status
    ]);
  }

  /**
   * Get pending model by ID
   */
  async getPendingModel(modelId: string): Promise<PendingModel | null> {
    const query = `
      SELECT * FROM pending_models WHERE id = $1
    `;

    const result = await this.query(query, [modelId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      publisherAddress: row.publisher_address,
      framework: row.framework,
      type: row.model_type,
      price: parseFloat(row.price),
      licenseTerms: row.license_terms,
      tags: row.tags || [],
      fileSize: row.file_size,
      cid: row.cid,
      encryptionMetadata: JSON.parse(row.encryption_metadata || '{}'),
      encryptionKeyHash: row.encryption_key_hash,
      status: row.status
    };
  }

  /**
   * Publish model (move from pending to published)
   */
  async publishModel(model: PublishedModel): Promise<void> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');

      // Insert into published_models
      const publishQuery = `
        INSERT INTO published_models (
          id, lab_id, model_cid, algorand_txn_id, blockchain_model_id,
          encryption_key_hash, encryption_metadata, license_terms,
          publisher_address, file_size, price_algo, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      await client.query(publishQuery, [
        model.id,
        model.publisherAddress, // Using publisher as lab_id for now
        model.cid,
        model.algorandTxnId,
        model.blockchainModelId,
        model.encryptionKeyHash,
        JSON.stringify(model.encryptionMetadata),
        JSON.stringify({ type: model.licenseTerms }),
        model.publisherAddress,
        model.fileSize,
        model.price,
        model.publishedAt
      ]);

      // Insert model metadata
      const metadataQuery = `
        INSERT INTO model_metadata (
          model_id, name, description, framework, model_type, tags, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await client.query(metadataQuery, [
        model.id,
        model.name,
        model.description,
        model.framework,
        model.type,
        model.tags,
        model.publishedAt
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete pending model
   */
  async deletePendingModel(modelId: string): Promise<void> {
    const query = `DELETE FROM pending_models WHERE id = $1`;
    await this.query(query, [modelId]);
  }

  /**
   * Get model by ID
   */
  async getModelById(modelId: string): Promise<any | null> {
    const query = `
      SELECT 
        pm.*,
        mm.name,
        mm.description,
        mm.framework,
        mm.model_type,
        mm.tags
      FROM published_models pm
      LEFT JOIN model_metadata mm ON pm.id = mm.model_id
      WHERE pm.id = $1
    `;

    const result = await this.query(query, [modelId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      publisherAddress: row.publisher_address,
      framework: row.framework,
      type: row.model_type,
      price: parseFloat(row.price_algo),
      cid: row.model_cid,
      blockchainModelId: row.blockchain_model_id,
      encryptionMetadata: JSON.parse(row.encryption_metadata || '{}'),
      encryptionKeyHash: row.encryption_key_hash,
      fileSize: row.file_size,
      tags: row.tags || []
    };
  }

  /**
   * Get model with full metadata and statistics
   */
  async getModelWithMetadata(modelId: string): Promise<any | null> {
    const query = `
      SELECT 
        pm.*,
        mm.name,
        mm.description,
        mm.framework,
        mm.model_type,
        mm.tags,
        mm.performance_metrics,
        COUNT(DISTINCT mp.id) as purchase_count,
        COUNT(DISTINCT md.id) as download_count,
        AVG(mr.rating) as average_rating,
        COUNT(DISTINCT mr.id) as review_count
      FROM published_models pm
      LEFT JOIN model_metadata mm ON pm.id = mm.model_id
      LEFT JOIN model_purchases mp ON pm.id = mp.model_id AND mp.status = 'completed'
      LEFT JOIN model_downloads md ON pm.id = md.model_id
      LEFT JOIN model_reviews mr ON pm.id = mr.model_id
      WHERE pm.id = $1
      GROUP BY pm.id, mm.id
    `;

    const result = await this.query(query, [modelId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Create pending purchase
   */
  async createPendingPurchase(purchase: Partial<ModelPurchase>): Promise<void> {
    const query = `
      INSERT INTO pending_purchases (
        id, model_id, buyer_address, price, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `;

    await this.query(query, [
      purchase.id,
      purchase.modelId,
      purchase.buyerAddress,
      purchase.price,
      purchase.status
    ]);
  }

  /**
   * Get pending purchase
   */
  async getPendingPurchase(purchaseId: string): Promise<ModelPurchase | null> {
    const query = `SELECT * FROM pending_purchases WHERE id = $1`;
    const result = await this.query(query, [purchaseId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      modelId: row.model_id,
      buyerAddress: row.buyer_address,
      price: row.price,
      status: row.status,
      createdAt: row.created_at
    };
  }

  /**
   * Confirm purchase (move to completed)
   */
  async confirmPurchase(purchaseId: string, updates: Partial<ModelPurchase>): Promise<void> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');

      // Get pending purchase
      const pendingResult = await client.query(
        'SELECT * FROM pending_purchases WHERE id = $1',
        [purchaseId]
      );

      if (pendingResult.rows.length === 0) {
        throw new Error('Pending purchase not found');
      }

      const pending = pendingResult.rows[0];

      // Insert into model_purchases
      const insertQuery = `
        INSERT INTO model_purchases (
          id, buyer_wallet, model_id, escrow_id, escrow_txn_id, 
          price, status, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await client.query(insertQuery, [
        pending.id,
        pending.buyer_address,
        pending.model_id,
        updates.escrowId?.toString(),
        updates.txnId,
        pending.price,
        updates.status,
        pending.created_at,
        updates.completedAt
      ]);

      // Delete pending purchase
      await client.query('DELETE FROM pending_purchases WHERE id = $1', [purchaseId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get purchase by model and buyer
   */
  async getPurchase(modelId: string, buyerAddress: string): Promise<ModelPurchase | null> {
    const query = `
      SELECT * FROM model_purchases 
      WHERE model_id = $1 AND buyer_wallet = $2
    `;

    const result = await this.query(query, [modelId, buyerAddress]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      modelId: row.model_id,
      buyerAddress: row.buyer_wallet,
      price: row.price,
      status: row.status,
      txnId: row.escrow_txn_id,
      escrowId: parseInt(row.escrow_id),
      createdAt: row.created_at,
      completedAt: row.completed_at
    };
  }

  /**
   * Create model access key
   */
  async createModelAccessKey(accessKey: Partial<ModelAccessKey>): Promise<void> {
    const query = `
      INSERT INTO model_access_keys (
        id, model_id, buyer_address, encrypted_key, key_hash, 
        key_type, download_count, max_downloads, access_granted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `;

    await this.query(query, [
      uuidv4(),
      accessKey.modelId,
      accessKey.buyerAddress,
      accessKey.encryptedKey,
      accessKey.keyHash,
      accessKey.keyType || 'AES-256-GCM',
      0, // initial download count
      accessKey.maxDownloads || 10
    ]);
  }

  /**
   * Get model access key
   */
  async getModelAccessKey(modelId: string, buyerAddress: string): Promise<ModelAccessKey | null> {
    const query = `
      SELECT * FROM model_access_keys 
      WHERE model_id = $1 AND buyer_address = $2
    `;

    const result = await this.query(query, [modelId, buyerAddress]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      modelId: row.model_id,
      buyerAddress: row.buyer_address,
      encryptedKey: row.encrypted_key,
      keyHash: row.key_hash,
      keyType: row.key_type,
      downloadCount: row.download_count,
      maxDownloads: row.max_downloads,
      accessGrantedAt: row.access_granted_at,
      accessExpiresAt: row.access_expires_at
    };
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(accessKeyId: string): Promise<void> {
    const query = `
      UPDATE model_access_keys 
      SET download_count = download_count + 1 
      WHERE id = $1
    `;

    await this.query(query, [accessKeyId]);
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

export default DatabaseService;
