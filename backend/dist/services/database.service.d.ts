/**
 * Database Service for DeSciFi
 * Handles all database operations with PostgreSQL
 */
import { PoolClient } from 'pg';
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
export declare class DatabaseService {
    private pool;
    constructor(config?: DatabaseConfig);
    /**
     * Get database client from pool
     */
    getClient(): Promise<PoolClient>;
    /**
     * Execute query with automatic connection management
     */
    query(text: string, params?: any[]): Promise<any>;
    /**
     * Get all models with metadata and statistics
     */
    getModelsWithMetadata(filters: ModelFilters): Promise<any[]>;
    /**
     * Store pending model (before blockchain confirmation)
     */
    storePendingModel(model: PendingModel): Promise<void>;
    /**
     * Get pending model by ID
     */
    getPendingModel(modelId: string): Promise<PendingModel | null>;
    /**
     * Publish model (move from pending to published)
     */
    publishModel(model: PublishedModel): Promise<void>;
    /**
     * Delete pending model
     */
    deletePendingModel(modelId: string): Promise<void>;
    /**
     * Get model by ID
     */
    getModelById(modelId: string): Promise<any | null>;
    /**
     * Get model with full metadata and statistics
     */
    getModelWithMetadata(modelId: string): Promise<any | null>;
    /**
     * Create pending purchase
     */
    createPendingPurchase(purchase: Partial<ModelPurchase>): Promise<void>;
    /**
     * Get pending purchase
     */
    getPendingPurchase(purchaseId: string): Promise<ModelPurchase | null>;
    /**
     * Confirm purchase (move to completed)
     */
    confirmPurchase(purchaseId: string, updates: Partial<ModelPurchase>): Promise<void>;
    /**
     * Get purchase by model and buyer
     */
    getPurchase(modelId: string, buyerAddress: string): Promise<ModelPurchase | null>;
    /**
     * Create model access key
     */
    createModelAccessKey(accessKey: Partial<ModelAccessKey>): Promise<void>;
    /**
     * Get model access key
     */
    getModelAccessKey(modelId: string, buyerAddress: string): Promise<ModelAccessKey | null>;
    /**
     * Increment download count
     */
    incrementDownloadCount(accessKeyId: string): Promise<void>;
    /**
     * Close database connection pool
     */
    close(): Promise<void>;
}
export default DatabaseService;
//# sourceMappingURL=database.service.d.ts.map